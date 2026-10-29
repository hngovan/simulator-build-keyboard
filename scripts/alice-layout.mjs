// Sinh layout Alice từ PCB KiCad của Blossom (doughnut923/Blossom, MIT): mỗi footprint switch → 1 phím
// đúng tâm, góc xoay và cỡ phím; đường viền PCB lấy từ Edge.Cuts.
// Dùng: node scripts/alice-layout.mjs  → ghi src/data/aliceKeys.ts
//
// KiCad: mm, trục y hướng xuống (= phía trước, +z trong game), góc dương ngược kim đồng hồ trên màn hình
// (= rotation-y dương trong game). Toạ độ ghi ra theo tâm khung PCB, đơn vị u.
import fs from 'node:fs'

const U = 19.05
const pcb = fs.readFileSync('assets/keyboards/blossom/pcb/arisu.kicad_pcb', 'utf8')

// nhãn + KeyboardEvent.code + hàng (0 = hàng số … 4 = hàng space) theo mã linh kiện SW trên PCB
const LABELS = {
  SW1: ['Esc', 'Escape', 0],
  SW6: ['1', 'Digit1', 0],
  SW10: ['2', 'Digit2', 0],
  SW15: ['3', 'Digit3', 0],
  SW19: ['4', 'Digit4', 0],
  SW24: ['5', 'Digit5', 0],
  SW29: ['6', 'Digit6', 0],
  SW33: ['7', 'Digit7', 0],
  SW38: ['8', 'Digit8', 0],
  SW42: ['9', 'Digit9', 0],
  SW47: ['0', 'Digit0', 0],
  SW51: ['-', 'Minus', 0],
  SW55: ['=', 'Equal', 0],
  SW59: ['Bksp', 'Backspace', 0],
  SW63: ['Del', 'Delete', 0],
  SW64: ['Home', 'Home', 0],
  SW2: ['Tab', 'Tab', 1],
  SW7: ['Q', 'KeyQ', 1],
  SW11: ['W', 'KeyW', 1],
  SW16: ['E', 'KeyE', 1],
  SW20: ['R', 'KeyR', 1],
  SW25: ['T', 'KeyT', 1],
  SW30: ['Y', 'KeyY', 1],
  SW34: ['U', 'KeyU', 1],
  SW39: ['I', 'KeyI', 1],
  SW43: ['O', 'KeyO', 1],
  SW48: ['P', 'KeyP', 1],
  SW52: ['[', 'BracketLeft', 1],
  SW56: [']', 'BracketRight', 1],
  SW60: ['\\', 'Backslash', 1],
  SW65: ['PgUp', 'PageUp', 1],
  SW3: ['Caps', 'CapsLock', 2],
  SW8: ['A', 'KeyA', 2],
  SW12: ['S', 'KeyS', 2],
  SW17: ['D', 'KeyD', 2],
  SW21: ['F', 'KeyF', 2],
  SW26: ['G', 'KeyG', 2],
  SW31: ['H', 'KeyH', 2],
  SW35: ['J', 'KeyJ', 2],
  SW40: ['K', 'KeyK', 2],
  SW44: ['L', 'KeyL', 2],
  SW49: [';', 'Semicolon', 2],
  SW53: ["'", 'Quote', 2],
  SW57: ['Enter', 'Enter', 2],
  SW66: ['PgDn', 'PageDown', 2],
  SW4: ['Shift', 'ShiftLeft', 3],
  SW9: ['Z', 'KeyZ', 3],
  SW13: ['X', 'KeyX', 3],
  SW18: ['C', 'KeyC', 3],
  SW22: ['V', 'KeyV', 3],
  SW27: ['B', 'KeyB', 3],
  SW32: ['N', 'KeyN', 3],
  SW36: ['M', 'KeyM', 3],
  SW41: [',', 'Comma', 3],
  SW45: ['.', 'Period', 3],
  SW50: ['/', 'Slash', 3],
  SW54: ['Shift', 'ShiftRight', 3],
  SW61: ['↑', 'ArrowUp', 3],
  SW5: ['Ctrl', 'ControlLeft', 4],
  SW14: ['Alt', 'AltLeft', 4],
  SW23: ['', 'Space', 4],
  SW28: ['Fn', null, 4],
  SW37: ['', 'Space', 4],
  SW46: ['Alt', 'AltRight', 4],
  SW58: ['←', 'ArrowLeft', 4],
  SW62: ['↓', 'ArrowDown', 4],
  SW67: ['→', 'ArrowRight', 4],
}

const sw = [
  ...pcb.matchAll(
    /\(module MX_Switch:SW_Cherry_MX_([\d.]+)u\S*[\s\S]*?\(at ([-\d.]+) ([-\d.]+)(?: ([-\d.]+))?\)[\s\S]*?\(fp_text reference (\S+)/g,
  ),
].map((m) => {
  let deg = +(m[4] ?? 0)
  if (deg > 180) deg -= 360
  // gốc footprint MX_Switch là góc trên trái phím, tâm switch (lỗ giữa Ø4) ở (w·U/2, U/2) trong hệ footprint
  // → xoay theo góc footprint (KiCad: y hướng xuống, góc dương ngược kim đồng hồ trên màn hình)
  const w = +m[1]
  const t = (deg * Math.PI) / 180
  const [px, py] = [(w * U) / 2, U / 2]
  return {
    ref: m[5],
    w,
    x: +m[2] + px * Math.cos(t) + py * Math.sin(t),
    y: +m[3] - px * Math.sin(t) + py * Math.cos(t),
    deg,
  }
})
if (sw.length !== 67) throw new Error(`Cần 67 switch, tìm được ${sw.length}`)

// đường viền PCB (Edge.Cuts) → đa giác theo thứ tự nối đầu mút
const segs = [
  ...pcb.matchAll(
    /\(gr_line \(start ([-\d.]+) ([-\d.]+)\) \(end ([-\d.]+) ([-\d.]+)\)[^)]*\(layer Edge\.Cuts\)/g,
  ),
].map((m) => [
  [+m[1], +m[2]],
  [+m[3], +m[4]],
])
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 3 // góc bo (gr_arc) nối các đoạn
const poly = [segs[0][0], segs[0][1]]
const left = segs.slice(1)
while (left.length) {
  const end = poly[poly.length - 1]
  const i = left.findIndex((s) => near(s[0], end) || near(s[1], end))
  if (i < 0) throw new Error('Edge.Cuts không khép kín')
  const [s] = left.splice(i, 1)
  const next = near(s[0], end) ? s[1] : s[0]
  if (left.length) poly.push(next)
}
const xs = poly.map((p) => p[0])
const ys = poly.map((p) => p[1])
const cx = (Math.min(...xs) + Math.max(...xs)) / 2
const cy = (Math.min(...ys) + Math.max(...ys)) / 2
const u = (v) => +(v / U).toFixed(4)

const keys = sw.map((s) => {
  const l = LABELS[s.ref]
  if (!l) throw new Error(`Thiếu nhãn cho ${s.ref}`)
  return {
    label: l[0],
    w: s.w,
    code: l[1],
    row: l[2],
    cx: u(s.x - cx),
    cz: u(s.y - cy),
    deg: s.deg,
  }
})
const outline = poly.map(([x, y]) => [u(x - cx), u(y - cy)])

fs.writeFileSync(
  'src/data/aliceKeys.ts',
  `// Sinh tự động bởi scripts/alice-layout.mjs từ PCB KiCad của Blossom (doughnut923/Blossom, MIT) — không sửa tay.
// Toạ độ theo tâm khung PCB (u, z dương = phía trước); deg: góc xoay switch (dương = ngược kim đồng hồ nhìn từ trên)

export const ALICE_KEYS: {
  label: string
  w: number
  code: string | null
  /** hàng: 0 = hàng số … 4 = hàng space */
  row: number
  cx: number
  cz: number
  deg: number
}[] = ${JSON.stringify(keys)}

/** Đường viền PCB (Edge.Cuts), [x, z] u theo tâm khung PCB */
export const ALICE_OUTLINE: [number, number][] = ${JSON.stringify(outline)}
`,
)
console.log(`✔ src/data/aliceKeys.ts: ${keys.length} phím, viền PCB ${outline.length} điểm`)
