import { signature, type PaintFn } from './CanvasPainting'

// Tranh graffiti "QMK" kiểu bàn phím (vẽ canvas, ký keeb): nền tường gạch tối, mỗi chữ là 1 keycap nghiêng
// (mặt bên sẫm + mặt trên sáng), chữ graffiti viền đen dày tô chuyển màu, vệt sơn chảy, vết sơn bắn, vương miện trên Q

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/** hình chữ nhật bo góc (đường dẫn) */
function rounded(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

/** 1 phím graffiti: keycap nghiêng + chữ */
function keycapLetter(
  g: CanvasRenderingContext2D,
  ch: string,
  cx: number,
  cy: number,
  size: number,
  rot: number,
  [c0, c1]: [string, string],
  cap: string,
) {
  g.save()
  g.translate(cx, cy)
  g.rotate(rot)
  const s = size
  // bóng đổ phun sơn
  g.fillStyle = 'rgba(0,0,0,0.45)'
  rounded(g, -s / 2 + 10, -s / 2 + 14, s, s, s * 0.16)
  g.fill()
  // mặt bên keycap (sẫm) + mặt trên (sáng, lệch lên)
  g.fillStyle = cap
  rounded(g, -s / 2, -s / 2, s, s, s * 0.16)
  g.fill()
  g.lineWidth = 7
  g.strokeStyle = '#111'
  g.stroke()
  const top = g.createLinearGradient(0, -s / 2, 0, s / 2)
  top.addColorStop(0, 'rgba(255,255,255,0.55)')
  top.addColorStop(1, 'rgba(255,255,255,0.08)')
  g.fillStyle = top
  rounded(g, -s / 2 + s * 0.1, -s / 2 + s * 0.06, s * 0.8, s * 0.74, s * 0.12)
  g.fill()
  g.lineWidth = 4
  g.stroke()
  // chữ graffiti: viền đen dày → viền trắng → tô chuyển màu
  g.font = `900 ${Math.round(s * 0.78)}px Impact, "Arial Black", sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  const ty = -s * 0.04
  g.lineWidth = s * 0.16
  g.strokeStyle = '#111'
  g.strokeText(ch, 0, ty)
  g.lineWidth = s * 0.07
  g.strokeStyle = '#fff'
  g.strokeText(ch, 0, ty)
  const fill = g.createLinearGradient(0, -s * 0.35, 0, s * 0.35)
  fill.addColorStop(0, c0)
  fill.addColorStop(1, c1)
  g.fillStyle = fill
  g.fillText(ch, 0, ty)
  // vệt sáng chéo trên chữ
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.lineWidth = s * 0.025
  g.beginPath()
  g.moveTo(-s * 0.22, -s * 0.22)
  g.lineTo(-s * 0.1, -s * 0.3)
  g.stroke()
  g.restore()
}

export const drawQmk: PaintFn = (g, W, H, sign) => {
  const r = rng(5)
  // tường gạch tối
  g.fillStyle = '#2a2a30'
  g.fillRect(0, 0, W, H)
  const bh = 34
  for (let row = 0; row * bh < H; row++) {
    const off = row % 2 ? 40 : 0
    for (let x = -off; x < W; x += 80) {
      const v = 38 + Math.floor(r() * 14)
      g.fillStyle = `rgb(${v},${v - 2},${v + 4})`
      g.fillRect(x + 2, row * bh + 2, 76, bh - 4)
    }
  }
  // quầng phun sơn sau chữ
  for (const [x, y, c] of [
    [W * 0.25, H * 0.5, 'rgba(255,60,170,0.55)'],
    [W * 0.52, H * 0.45, 'rgba(60,220,255,0.5)'],
    [W * 0.78, H * 0.52, 'rgba(255,210,40,0.5)'],
  ] as const) {
    const halo = g.createRadialGradient(x, y, 10, x, y, H * 0.5)
    halo.addColorStop(0, c)
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = halo
    g.fillRect(0, 0, W, H)
  }
  // vết sơn bắn
  for (let i = 0; i < 160; i++) {
    g.fillStyle = ['#ff3caa', '#3cdcff', '#ffd228', '#7dff6a', '#ffffff'][Math.floor(r() * 5)]
    g.globalAlpha = 0.5 + r() * 0.5
    g.beginPath()
    g.arc(r() * W, r() * H, 0.8 + r() * 3.5, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  const size = H * 0.5
  const letters: [string, number, number, number, [string, string], string][] = [
    ['Q', W * 0.23, H * 0.52, -0.14, ['#ff7ad0', '#c4127a'], '#5a1840'],
    ['M', W * 0.5, H * 0.46, 0.06, ['#8ff0ff', '#1188d8'], '#123a5c'],
    ['K', W * 0.77, H * 0.54, 0.16, ['#fff07a', '#f08a12'], '#5c3a10'],
  ]
  // vệt sơn chảy dưới mỗi phím
  for (const [, x, y, , [, c1]] of letters)
    for (let k = 0; k < 4; k++) {
      const dx = x + (r() - 0.5) * size * 0.8
      const y0 = y + size * 0.42
      const len = 20 + r() * 70
      g.strokeStyle = c1
      g.lineWidth = 4 + r() * 4
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(dx, y0)
      g.lineTo(dx, y0 + len)
      g.stroke()
      g.fillStyle = c1
      g.beginPath()
      g.arc(dx, y0 + len, g.lineWidth * 0.8, 0, Math.PI * 2)
      g.fill()
    }
  for (const [ch, x, y, rot, cols, cap] of letters) keycapLetter(g, ch, x, y, size, rot, cols, cap)
  // vương miện nhỏ trên Q
  g.save()
  g.translate(W * 0.2, H * 0.17)
  g.rotate(-0.25)
  g.fillStyle = '#ffd228'
  g.strokeStyle = '#111'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(-40, 20)
  g.lineTo(-44, -16)
  g.lineTo(-20, 4)
  g.lineTo(0, -26)
  g.lineTo(20, 4)
  g.lineTo(44, -16)
  g.lineTo(40, 20)
  g.closePath()
  g.fill()
  g.stroke()
  g.restore()
  // mũi tên phun sơn + chữ nhỏ "firmware"
  g.strokeStyle = '#7dff6a'
  g.lineWidth = 8
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(W * 0.62, H * 0.86)
  g.quadraticCurveTo(W * 0.72, H * 0.95, W * 0.86, H * 0.84)
  g.lineTo(W * 0.83, H * 0.8)
  g.moveTo(W * 0.86, H * 0.84)
  g.lineTo(W * 0.81, H * 0.87)
  g.stroke()
  g.font = `900 ${Math.round(H * 0.07)}px Impact, sans-serif`
  g.fillStyle = '#ffffff'
  g.textAlign = 'left'
  g.save()
  g.translate(W * 0.06, H * 0.92)
  g.rotate(-0.05)
  g.fillText('FIRMWARE GANG', 0, 0)
  g.restore()
  signature(g, W, H, sign, '#7dff6a')
}
