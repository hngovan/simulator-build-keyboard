import { create } from 'zustand'
import type * as THREE from 'three'

/**
 * Thông số hiệu năng (bật ở Cài đặt → Hiển thị, lưu theo máy, không theo lượt chơi).
 * Trình duyệt không cho đọc %CPU / %GPU cả máy, nên chỉ đo phần của tab game:
 * - FPS: số khung hình trình duyệt vẽ mỗi giây (requestAnimationFrame)
 * - CPU: % thời gian JS chạy trong các callback requestAnimationFrame (vòng vẽ R3F + hoạt cảnh); lệnh WebGL
 *   bị chặn chờ GPU cũng tính vào đây. Không dùng requestIdleCallback: trình duyệt vẽ liên tục thì gần như
 *   không có khoảng rảnh → báo bận ~100% sai
 * - GPU: % thời gian GPU vẽ cảnh 3D mỗi giây (EXT_disjoint_timer_query_webgl2, Chrome / Edge)
 * - RAM: heap JS đang dùng / giới hạn (performance.memory, chỉ Chrome / Edge)
 */
const KEY = 'sbk-ui-perf'

function readOn() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const usePerfHud = create(() => ({ on: readOn() }))

export function setPerfHud(on: boolean) {
  usePerfHud.setState({ on })
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // không lưu được thì chỉ bật trong phiên này
  }
}

export interface PerfSample {
  fps: number
  /** ms khung hình chậm nhất trong giây vừa qua */
  worstMs: number
  /** null = trình duyệt không đo được */
  cpu: number | null
  gpu: number | null
  ramMb: number | null
  ramPct: number | null
  /** số draw call / tam giác mỗi khung (mọi lượt vẽ: bóng, ContactShadows, cảnh chính; null = chưa có cảnh 3D) */
  calls: number | null
  tris: number | null
  /** tên GPU WebGL đang dùng (SwiftShader / llvmpipe = vẽ bằng CPU) */
  gpuName: string | null
}

export const usePerfSample = create<PerfSample>(() => ({
  fps: 0,
  worstMs: 0,
  cpu: null,
  gpu: null,
  ramMb: null,
  ramPct: null,
  calls: null,
  tris: null,
  gpuName: null,
}))

/** GPU đang bị giả lập bằng phần mềm (Chrome tắt tăng tốc phần cứng) */
export const softwareGpu = (name: string | null) =>
  !!name && /swiftshader|software|llvmpipe|basic render/i.test(name)

// ---- bộ đếm GPU: vá renderer.render để bọc mỗi lần vẽ bằng timer query ----

interface GpuProbe {
  ctx: WebGL2RenderingContext
  ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null
  pending: WebGLQuery[]
  /** ns GPU cộng dồn từ lần lấy mẫu trước */
  ns: number
  calls: number
  tris: number
  /** số lần vẽ cảnh chính (Scene + camera phối cảnh) = số khung 3D */
  frames: number
  name: string | null
}

let probe: GpuProbe | null = null

/** Gắn bộ đo vào renderer của Canvas, trả về hàm gỡ */
export function attachGpuProbe(gl: THREE.WebGLRenderer) {
  const ctx = gl.getContext() as WebGL2RenderingContext
  const isGl2 =
    typeof WebGL2RenderingContext !== 'undefined' && ctx instanceof WebGL2RenderingContext
  const ext = isGl2 ? ctx.getExtension('EXT_disjoint_timer_query_webgl2') : null
  const dbg = ctx.getExtension('WEBGL_debug_renderer_info')
  const name = dbg ? String(ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : null
  const p: GpuProbe = { ctx, ext, pending: [], ns: 0, calls: 0, tris: 0, frames: 0, name }
  probe = p
  const orig = gl.render
  let active = false
  gl.render = function (scene, camera) {
    // lồng nhau (render gọi trong render) thì không mở query mới
    if (!ext || active || p.pending.length > 60) {
      orig.call(this, scene, camera)
    } else {
      const q = ctx.createQuery()
      active = true
      ctx.beginQuery(ext.TIME_ELAPSED_EXT, q)
      try {
        orig.call(this, scene, camera)
      } finally {
        ctx.endQuery(ext.TIME_ELAPSED_EXT)
        active = false
        p.pending.push(q)
      }
    }
    // info tự reset đầu mỗi lần render → cộng sau mỗi lần
    p.calls += gl.info.render.calls
    p.tris += gl.info.render.triangles
    if ((scene as THREE.Scene).isScene && (camera as THREE.PerspectiveCamera).isPerspectiveCamera)
      p.frames++
  }
  return () => {
    gl.render = orig
    for (const q of p.pending) ctx.deleteQuery(q)
    if (probe === p) probe = null
  }
}

/** Lấy kết quả query đã xong (gọi mỗi khung hình) */
function pollGpu() {
  const p = probe
  if (!p?.ext) return
  const { ctx, ext } = p
  const disjoint = ctx.getParameter(ext.GPU_DISJOINT_EXT)
  while (p.pending.length) {
    const q = p.pending[0]
    if (!ctx.getQueryParameter(q, ctx.QUERY_RESULT_AVAILABLE)) break
    if (!disjoint) p.ns += ctx.getQueryParameter(q, ctx.QUERY_RESULT) as number
    ctx.deleteQuery(q)
    p.pending.shift()
  }
}

// ---- vòng lấy mẫu (chỉ chạy khi HUD bật) ----

interface MemInfo {
  usedJSHeapSize: number
  jsHeapSizeLimit: number
}

/** Bắt đầu đo, cập nhật `usePerfSample` mỗi giây; trả về hàm dừng */
export function startPerfSampling() {
  let frames = 0
  let worst = 0
  let last = performance.now()
  let since = last
  let busy = 0
  let raf = 0
  // bọc requestAnimationFrame (R3F gọi biến toàn cục mỗi khung) để cộng thời gian JS mỗi callback
  const rafOrig = window.requestAnimationFrame
  window.requestAnimationFrame = (cb) =>
    rafOrig.call(window, (t) => {
      const start = performance.now()
      try {
        cb(t)
      } finally {
        busy += performance.now() - start
      }
    })

  const tick = (now: number) => {
    frames++
    worst = Math.max(worst, now - last)
    last = now
    pollGpu()
    const span = now - since
    if (span >= 1000) {
      const mem = (performance as Performance & { memory?: MemInfo }).memory
      const p = probe
      usePerfSample.setState({
        fps: Math.round((frames * 1000) / span),
        worstMs: Math.round(worst),
        cpu: clampPct((busy / span) * 100),
        gpu: p?.ext ? clampPct((p.ns / 1e6 / span) * 100) : null,
        ramMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
        ramPct: mem ? clampPct((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100) : null,
        calls: p ? (p.frames ? Math.round(p.calls / p.frames) : 0) : null,
        tris: p ? (p.frames ? Math.round(p.tris / p.frames) : 0) : null,
        gpuName: p?.name ?? null,
      })
      if (p) p.ns = p.calls = p.tris = p.frames = 0
      frames = 0
      worst = 0
      busy = 0
      since = now
    }
    raf = rafOrig.call(window, tick)
  }
  raf = rafOrig.call(window, tick)
  return () => {
    cancelAnimationFrame(raf)
    window.requestAnimationFrame = rafOrig
  }
}

const clampPct = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
