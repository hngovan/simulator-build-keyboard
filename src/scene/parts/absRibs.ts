// Khung xương cá gia cố lòng case nhựa ABS dựng bằng code (1 / 2 mảnh): vỏ nhựa đúc mỏng nên trong lòng có gân đúc liền.
// Sàn: lưới gân thẳng: gân ngang đặt đúng khe giữa các hàng phím (≤ 5 hàng: 2 gân, 6 hàng: 3 gân; O-ring: 1 gân qua 2 trụ vách bên)
// + các gân dọc vách trước → vách sau (không gân đứng tựa vách; gân dọc vướng DTB bỏ nửa đó). Mỗi gân thẳng 1 chiều cao: không đi dưới linh kiện thì
// cao sát mặt dưới PCB, có (gân dọc chạy dưới socket) thì thấp dưới đáy socket hotswap. Chừa chỗ DTB + dây JST.
// Foam đáy case thấp hơn gân → khoét rãnh theo gân (Foam.tsx). Trụ tray case nhựa = trụ nhựa đúc liền + ren đồng cấy (Case.tsx)
import { CASE_MARGIN, DTB_MM, Y, caseFloorTop, stabHoles } from '@/data/steps'
import { isPlasticCase } from '@/data/parts'
import type { BatterySpot, BuildContext } from '@/types'
import { MM } from '../models/Switch'
import { ringPosts } from './ringPosts'

/** bề dày gân (u, ~1mm) */
export const RIB_T = 0.05
/** cao socket hotswap dưới mặt dưới PCB (u, khớp `socketGeo` BoardDetails.tsx) */
const SOCKET_H = 0.09
/** đỉnh gân sàn thấp (u): dưới socket / chân linh kiện, cách đáy socket hotswap 0,02u */
const RIB_TOP = Y.pcbBot - SOCKET_H - 0.02
/** đỉnh gân sàn cao (u): không đi dưới linh kiện, cách mặt dưới PCB 0,03u */
const RIB_TOP_TALL = Y.pcbBot - 0.03
/** cao gân thấp tính từ sàn case dựng bằng code thường (`Y.floorTop`; case nhựa sàn mỏng thì gân cao hơn theo sàn) */
export const RIB_H = RIB_TOP - Y.floorTop
/** chừa quanh vùng linh kiện dưới PCB khi khoét thấp gân (u) */
const PART_PAD = 0.04
/** khoảng cách các gân xiên dọc sống (u) */
const RIB_STEP = 1.25
/** gân đứng tựa vách: nhô vào lòng case (u) */
const WALL_RIB_D = 0.15
/** chừa quanh daughterboard + dây JST phía trước (u) */
const DTB_PAD = 0.15

/** đoạn gân sàn: từ (x0, z0) tới (x1, z1), cao `h` (thiếu = `RIB_H`) */
export interface RibSeg {
  x0: number
  z0: number
  x1: number
  z1: number
  h?: number
  /** gân cao (không đi dưới linh kiện) */
  tall?: boolean
}
/** gân đứng tựa vách: tâm chân gân (x, z), hướng vào lòng case (nx, nz), cao từ sàn tới y1 */
export interface WallRib {
  x: number
  z: number
  nx: number
  nz: number
  y1: number
}

/** case nhựa (ABS / PC) dựng bằng code có khung xương cá đúc liền sàn */
export const hasAbsRibs = (ctx: BuildContext) => isPlasticCase(ctx.caseDef)

export function absRibs(ctx: BuildContext): { segs: RibSeg[]; walls: WallRib[]; floor: number } {
  if (!hasAbsRibs(ctx)) return { segs: [], walls: [], floor: Y.floorTop }
  const floor = caseFloorTop(ctx.caseDef)
  const hx = ctx.width / 2 + CASE_MARGIN
  const hz = ctx.depth / 2 + CASE_MARGIN
  const dtb = ctx.dtb
  const dw = (DTB_MM.w / 2) * MM + DTB_PAD
  const dd = (DTB_MM.d / 2) * MM + DTB_PAD
  // DTB sát vách sau: chừa từ vách tới trước DTB (dây JST ra phía trước)
  const inDtb = (x: number, z: number) =>
    !!dtb && Math.abs(x - dtb.x) < dw && z > dtb.z - dd - 0.3 && z < dtb.z + dd + 0.3
  /** cắt đoạn tại chỗ đầu tiên chạm vùng DTB (đi từ đầu (x0, z0)) */
  const clip = (s: RibSeg): RibSeg | null => {
    const n = 40
    let last = -1
    for (let i = 0; i <= n; i++) {
      const k = i / n
      if (inDtb(s.x0 + (s.x1 - s.x0) * k, s.z0 + (s.z1 - s.z0) * k)) break
      last = k
    }
    if (last < 0.05) return null
    return { ...s, x1: s.x0 + (s.x1 - s.x0) * last, z1: s.z0 + (s.z1 - s.z0) * last }
  }
  /** các khúc của đoạn nằm ngoài vùng DTB (lấy mẫu dọc đoạn) */
  const outside = (r: RibSeg): RibSeg[] => {
    const n = 80
    const out: RibSeg[] = []
    let start = -1
    for (let i = 0; i <= n; i++) {
      const k = i / n
      const ok = !inDtb(r.x0 + (r.x1 - r.x0) * k, r.z0 + (r.z1 - r.z0) * k)
      if (ok && start < 0) start = k
      if ((!ok || i === n) && start >= 0) {
        const end = ok ? k : (i - 1) / n
        if (end - start > 0.02)
          out.push({
            x0: r.x0 + (r.x1 - r.x0) * start,
            z0: r.z0 + (r.z1 - r.z0) * start,
            x1: r.x0 + (r.x1 - r.x0) * end,
            z1: r.z0 + (r.z1 - r.z0) * end,
          })
        start = -1
      }
    }
    return out
  }
  const raw: RibSeg[] = []
  // không còn gân đứng tựa vách (người dùng bỏ: trông như mấu lồi trên vách); giữ kiểu `WallRib` cho Case / Foam
  const walls: WallRib[] = []
  // trụ đỡ O-ring (O-ring mount): gân đi qua đúng tâm trụ — gân ngang qua 2 trụ vách trái / phải, gân dọc qua trụ vách trước / sau
  const posts = ringPosts(ctx)
  const sidePosts = posts.filter((p) => Math.abs(p.x) > hx - 0.01)
  const postXs = [
    ...new Set(posts.filter((p) => Math.abs(p.x) <= hx - 0.01).map((p) => +p.x.toFixed(4))),
  ]
  // vùng linh kiện dưới PCB (hệ board = hệ case với case dựng bằng code): socket hotswap, cọc giữa + chân switch, chân stab, jack JST
  const zones: [number, number, number, number][] = []
  for (const k of ctx.keys) {
    // socket Kailh (khớp HotswapSockets: tâm lệch (0,05; 0,1), 0,5 × 0,28) + cọc giữa / chân switch quanh tâm phím
    zones.push([k.cx + 0.05 - 0.25, k.cx + 0.05 + 0.25, k.cz + 0.1 - 0.14, k.cz + 0.1 + 0.14])
    zones.push([k.cx - 0.3, k.cx + 0.3, k.cz - 0.3, k.cz + 0.3])
  }
  for (const k of ctx.stabKeys)
    for (const h of stabHoles(k))
      zones.push([h.x - h.r - 0.03, h.x + h.r + 0.03, h.z - h.r - 0.03, h.z + h.r + 0.03])
  if (dtb) zones.push([dtb.jack.x - 0.3, dtb.jack.x + 0.3, dtb.jack.z - 0.3, dtb.jack.z + 0.3])
  const bat = ctx.battery
  if (bat) zones.push([bat.jack.x - 0.3, bat.jack.x + 0.3, bat.jack.z - 0.3, bat.jack.z + 0.3])
  /** gân thẳng (theo trục x hoặc z) có đi dưới vùng linh kiện nào không */
  const hits = (r: RibSeg) => {
    const half = RIB_T / 2 + PART_PAD
    const [x0, x1] = [Math.min(r.x0, r.x1) - half, Math.max(r.x0, r.x1) + half]
    const [z0, z1] = [Math.min(r.z0, r.z1) - half, Math.max(r.z0, r.z1) + half]
    return zones.some(([a0, a1, b0, b1]) => a0 < x1 && a1 > x0 && b0 < z1 && b1 > z0)
  }
  // gân ngang: đặt đúng khe giữa 2 hàng phím (không dưới socket / chân switch → cao trọn chiều dài); số gân theo số hàng phím
  // (≤ 5 hàng như 40% / 60%: 2 gân; 6 hàng như 75% / TKL / full: 3 gân), khe gần chỗ chia đều nhất (ngang ngửa thì ưu tiên khe
  // không vướng chân stab)
  const rows = [...new Set(ctx.keys.filter((k) => k.h === 1).map((k) => +k.cz.toFixed(3)))].sort(
    (p, q) => p - q,
  )
  const gaps = rows.slice(1).map((z, i) => (z + rows[i]) / 2)
  const count = Math.min(gaps.length, rows.length <= 5 ? 2 : 3)
  const freeGap = (z: number) => !hits({ x0: -hx, z0: z, x1: hx, z1: z })
  const rowZ: number[] = []
  for (let i = 0; i < count; i++) {
    const ideal = -hz + ((i + 1) * 2 * hz) / (count + 1)
    const pick = (list: number[]) =>
      list
        .filter((g) => !rowZ.includes(g))
        .sort((p, q) => Math.abs(p - ideal) - Math.abs(q - ideal))[0]
    // khe gần chỗ chia đều nhất; 2 khe gần ngang nhau (lệch < 0,3u) thì lấy khe không vướng chân stab (gân đó được cao)
    const best = pick(gaps)
    const free = pick(gaps.filter(freeGap))
    const g =
      free !== undefined &&
      best !== undefined &&
      Math.abs(Math.abs(free - ideal) - Math.abs(best - ideal)) < 0.3
        ? free
        : best
    if (g !== undefined) rowZ.push(g)
  }
  // O-ring: trụ vách trái / phải nằm trên 1 khe hàng phím (ringPosts) → gân ngang gần nhất dời về đúng z trụ
  if (sidePosts.length) {
    const pz = sidePosts[0].z
    const i = rowZ.reduce((m, z, j) => (Math.abs(z - pz) < Math.abs(rowZ[m] - pz) ? j : m), 0)
    if (rowZ.length) rowZ[i] = pz
    else rowZ.push(pz)
  }
  for (const z of rowZ) {
    // cắt bỏ đoạn qua vùng DTB (DTB nằm giữa thì còn 2 khúc 2 bên)
    raw.push(...outside({ x0: -hx, z0: z, x1: hx, z1: z }))
  }
  // gân dọc vách trước → vách sau: qua tâm trụ O-ring (nếu có), khoảng giữa rải thêm cho cách ~RIB_STEP
  const xs: number[] = []
  const anchors = [-hx, ...postXs.sort((p, q) => p - q), hx]
  for (let i = 0; i + 1 < anchors.length; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    const wallA = i === 0
    const wallB = i + 1 === anchors.length - 1
    if (wallA && wallB) {
      const n = Math.floor((b - a) / RIB_STEP)
      for (let j = 0; j < n; j++) xs.push(-((n - 1) * RIB_STEP) / 2 + j * RIB_STEP)
      continue
    }
    if (wallA || wallB) {
      // khoảng từ vách tới trụ: rải đều, gân sát vách nhất cách vách ~nửa bước
      const span = b - a
      const m = Math.max(0, Math.round((span - RIB_STEP / 2) / RIB_STEP))
      for (let j = 1; j <= m; j++)
        xs.push(wallA ? b - (j * (span - RIB_STEP / 2)) / m : a + (j * (span - RIB_STEP / 2)) / m)
    } else {
      const k = Math.max(0, Math.round((b - a) / RIB_STEP) - 1)
      for (let j = 1; j <= k; j++) xs.push(a + ((b - a) * j) / (k + 1))
    }
    if (!wallB) xs.push(b)
  }
  for (const x of xs)
    for (const s of [-1, 1]) {
      // từ giữa ra vách; nửa nào vướng DTB (bị cụt giữa chừng) thì bỏ hẳn, không để khúc cụt
      const c = clip({ x0: x, z0: 0, x1: x, z1: s * hz })
      if (c && Math.abs(Math.abs(c.z1) - hz) < 1e-3) raw.push(c)
    }
  // mỗi gân thẳng 1 chiều cao đều (không răng cưa): không đi dưới linh kiện nào thì cao sát PCB, có thì thấp dưới đáy socket
  // tính theo cả đường gân (2 nửa gân dọc, các khúc gân ngang bị DTB cắt): 1 khúc vướng thì cả đường thấp, không thành bậc chỗ nối
  // hốc pin: bỏ gân trong lòng hốc + dải dây pin từ cạnh pin tới jack PCB (gân 2 bên hốc còn nguyên)
  if (bat) {
    const keep = raw.flatMap((r) => outsideBoxes(r, batteryKeepout(bat)))
    raw.splice(0, raw.length, ...keep)
  }
  const line = (r: RibSeg) =>
    Math.abs(r.z1 - r.z0) < 1e-6 ? `z${r.z0.toFixed(4)}` : `x${r.x0.toFixed(4)}`
  const low = new Set(raw.filter(hits).map(line))
  const segs = raw.map((r) => {
    const tall = !low.has(line(r))
    return { ...r, tall, h: (tall ? RIB_TOP_TALL : RIB_TOP) - floor }
  })
  return { segs, walls, floor }
}

/** gân đứng: khung chân trên sàn (u) để khoét foam: [x0, x1, z0, z1] */
export const wallRibBox = (w: WallRib): [number, number, number, number] => {
  const cx = w.x + (w.nx * WALL_RIB_D) / 2
  const cz = w.z + (w.nz * WALL_RIB_D) / 2
  const hw = w.nx ? WALL_RIB_D / 2 : RIB_T / 2
  const hd = w.nz ? WALL_RIB_D / 2 : RIB_T / 2
  return [cx - hw, cx + hw, cz - hd, cz + hd]
}

/** gân sàn: khung chân trên sàn (u, gân thẳng theo trục) để khoét foam: [x0, x1, z0, z1] */
export const ribSegBox = (s: RibSeg): [number, number, number, number] => [
  Math.min(s.x0, s.x1) - RIB_T / 2,
  Math.max(s.x0, s.x1) + RIB_T / 2,
  Math.min(s.z0, s.z1) - RIB_T / 2,
  Math.max(s.z0, s.z1) + RIB_T / 2,
]

/** vùng trống cho pin (u, [x0, x1, z0, z1]): lòng hốc + dải dây từ cạnh pin ra jack trên PCB (dùng chung gân / foam đáy) */
export function batteryKeepout(b: BatterySpot): [number, number, number, number][] {
  const pad = RIB_T
  const edge = b.x + (b.side * b.w) / 2
  const tz = b.z - b.d / 4
  return [
    [b.x - b.w / 2 - pad, b.x + b.w / 2 + pad, b.z - b.d / 2 - pad, b.z + b.d / 2 + pad],
    [
      Math.min(edge, b.jack.x) - 0.25,
      Math.max(edge, b.jack.x) + 0.25,
      Math.min(tz, b.jack.z) - 0.25,
      Math.max(tz, b.jack.z) + 0.25,
    ],
  ]
}

/** các khúc của gân nằm ngoài mọi ô `boxes` (lấy mẫu dọc gân) */
function outsideBoxes(r: RibSeg, boxes: [number, number, number, number][]): RibSeg[] {
  const half = RIB_T / 2
  const inBox = (x: number, z: number) =>
    boxes.some(
      ([a0, a1, b0, b1]) => x > a0 - half && x < a1 + half && z > b0 - half && z < b1 + half,
    )
  const n = 120
  const out: RibSeg[] = []
  let start = -1
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const ok = !inBox(r.x0 + (r.x1 - r.x0) * k, r.z0 + (r.z1 - r.z0) * k)
    if (ok && start < 0) start = k
    if ((!ok || i === n) && start >= 0) {
      const end = ok ? k : (i - 1) / n
      if (end - start > 0.02)
        out.push({
          ...r,
          x0: r.x0 + (r.x1 - r.x0) * start,
          z0: r.z0 + (r.z1 - r.z0) * start,
          x1: r.x0 + (r.x1 - r.x0) * end,
          z1: r.z0 + (r.z1 - r.z0) * end,
        })
      start = -1
    }
  }
  return out
}
