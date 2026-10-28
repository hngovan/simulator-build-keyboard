import { signature, type PaintFn } from './CanvasPainting'

// Tranh "Phượng hoàng tái sinh" (vẽ canvas, ký tên keeb): chim lửa dang cánh bay lên từ đống tro rực lửa,
// hào quang vàng sau lưng, tàn lửa bay lên trên nền trời đêm chuyển đỏ. Canvas dọc

/** số giả ngẫu nhiên cố định (tàn lửa không nhảy khi vẽ lại) */
function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/** 1 lông vũ cong: từ gốc (x0, y0) ra đầu (x1, y1), cong theo bend, rộng w */
function feather(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bend: number,
  w: number,
  fill: string | CanvasGradient,
) {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const nx = -(y1 - y0)
  const ny = x1 - x0
  const len = Math.hypot(nx, ny) || 1
  const cx = mx + (nx / len) * bend
  const cy = my + (ny / len) * bend
  g.beginPath()
  g.moveTo(x0 - (nx / len) * w, y0 - (ny / len) * w)
  g.quadraticCurveTo(cx - (nx / len) * w, cy - (ny / len) * w, x1, y1)
  g.quadraticCurveTo(
    cx + (nx / len) * w,
    cy + (ny / len) * w,
    x0 + (nx / len) * w,
    y0 + (ny / len) * w,
  )
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

/** ngọn lửa: hình giọt nước lộn ngược, đáy (x, y), cao h */
function flame(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  sway: number,
) {
  const grad = g.createLinearGradient(0, y, 0, y - h)
  grad.addColorStop(0, 'rgba(255,90,20,0.95)')
  grad.addColorStop(0.5, 'rgba(255,170,40,0.8)')
  grad.addColorStop(1, 'rgba(255,240,150,0)')
  g.beginPath()
  g.moveTo(x - w / 2, y)
  g.bezierCurveTo(x - w / 2, y - h * 0.5, x + sway - w * 0.2, y - h * 0.7, x + sway, y - h)
  g.bezierCurveTo(x + sway + w * 0.2, y - h * 0.7, x + w / 2, y - h * 0.5, x + w / 2, y)
  g.closePath()
  g.fillStyle = grad
  g.fill()
}

export const drawPhoenix: PaintFn = (g, W, H, sign) => {
  const r = rng(7)
  const cx = W / 2
  // trời đêm tím → đỏ cam ở chân tranh
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#140b26')
  sky.addColorStop(0.45, '#4a1530')
  sky.addColorStop(0.8, '#a8311c')
  sky.addColorStop(1, '#f06a1e')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  // sao nhỏ phía trên
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255,240,220,${0.3 + r() * 0.5})`
    g.fillRect(r() * W, r() * H * 0.35, 1.5, 1.5)
  }
  // hào quang vàng sau lưng chim
  const halo = g.createRadialGradient(cx, H * 0.4, 10, cx, H * 0.4, W * 0.55)
  halo.addColorStop(0, 'rgba(255,236,160,0.95)')
  halo.addColorStop(0.35, 'rgba(255,170,60,0.55)')
  halo.addColorStop(1, 'rgba(255,120,40,0)')
  g.fillStyle = halo
  g.fillRect(0, 0, W, H)

  // đống tro + lửa dưới đáy
  g.fillStyle = '#2a1410'
  g.beginPath()
  g.ellipse(cx, H * 0.97, W * 0.5, H * 0.07, 0, 0, Math.PI * 2)
  g.fill()
  for (let i = 0; i < 14; i++) {
    const x = W * 0.08 + (i / 13) * W * 0.84
    flame(g, x, H * 0.97, 40 + r() * 30, H * (0.12 + r() * 0.16), (r() - 0.5) * 24)
  }

  // chim: đuôi dài uốn xuống hoà vào lửa
  const by = H * 0.43
  for (let i = 0; i < 7; i++) {
    const t = i / 6
    const tail = g.createLinearGradient(cx, by, cx, H * 0.9)
    tail.addColorStop(0, '#ffcf4a')
    tail.addColorStop(0.5, '#f27a1a')
    tail.addColorStop(1, 'rgba(200,40,20,0.2)')
    feather(
      g,
      cx,
      by + 30,
      cx + (t - 0.5) * 150,
      H * (0.78 + Math.sin(t * Math.PI) * 0.1),
      (t - 0.5) * 70,
      7,
      tail,
    )
  }
  // 2 cánh dang rộng hất lên: các lớp lông từ vai toả ra
  for (const s of [-1, 1]) {
    const sx = cx + s * 14
    const sy = by - 8
    for (let i = 0; i < 11; i++) {
      const t = i / 10
      // góc từ chếch lên trên (đầu cánh) xuống ngang
      const a = -Math.PI / 2 + s * (0.35 + t * 1.25)
      const len = W * (0.46 - t * 0.17)
      const x1 = sx + Math.cos(a) * len
      const y1 = sy + Math.sin(a) * len
      const grad = g.createLinearGradient(sx, sy, x1, y1)
      grad.addColorStop(0, '#ffe07a')
      grad.addColorStop(0.45, '#ff9a2a')
      grad.addColorStop(1, '#d1301a')
      feather(g, sx, sy, x1, y1, s * (18 + t * 10), 9 - t * 3, grad)
    }
    // lớp lông phủ ngắn sáng ở gốc cánh
    for (let i = 0; i < 6; i++) {
      const t = i / 5
      const a = -Math.PI / 2 + s * (0.5 + t * 1.0)
      const len = W * 0.18
      feather(g, sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len, s * 8, 6, '#fff0a8')
    }
  }
  // thân + cổ + đầu
  const body = g.createLinearGradient(cx, by - 60, cx, by + 50)
  body.addColorStop(0, '#fff4c0')
  body.addColorStop(1, '#ff8a1f')
  g.fillStyle = body
  g.beginPath()
  g.ellipse(cx, by + 10, 20, 42, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.ellipse(cx, by - 42, 9, 22, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.arc(cx, by - 66, 12, 0, Math.PI * 2)
  g.fill()
  // mào 3 lông
  for (const [dx, h] of [
    [-7, 26],
    [0, 34],
    [7, 26],
  ])
    feather(g, cx + dx * 0.4, by - 74, cx + dx * 1.6, by - 74 - h, dx * 0.8, 3, '#ffcf4a')
  // mỏ + mắt
  g.fillStyle = '#e0a020'
  g.beginPath()
  g.moveTo(cx - 4, by - 64)
  g.lineTo(cx, by - 52)
  g.lineTo(cx + 4, by - 64)
  g.closePath()
  g.fill()
  g.fillStyle = '#3a1206'
  for (const s of [-1, 1]) {
    g.beginPath()
    g.arc(cx + s * 5, by - 69, 1.8, 0, Math.PI * 2)
    g.fill()
  }

  // tàn lửa bay lên
  for (let i = 0; i < 70; i++) {
    const x = r() * W
    const y = H * (0.35 + r() * 0.6)
    g.fillStyle = `rgba(255,${180 + Math.floor(r() * 70)},90,${0.4 + r() * 0.6})`
    g.beginPath()
    g.arc(x, y, 0.8 + r() * 2, 0, Math.PI * 2)
    g.fill()
  }
  signature(g, W, H, sign, '#ffe2a0')
}
