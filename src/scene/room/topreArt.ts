import * as THREE from 'three'

// Hình in lót chuột: biển hiệu Topre "COLDTOP" (người dùng đưa ảnh mẫu, vẽ lại bằng canvas; logo thương hiệu thật,
// chỉ dùng cá nhân — xem docs/decisions/giay-phep.md). Tỉ lệ 90 × 40 như lót chuột

const NAVY = '#16306e'
const YELLOW = '#fbf3a0'
const GREEN = '#2e9a46'

function mascot(g: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const blob = (x: number, y: number, rx: number, ry: number, fill: string) => {
    g.fillStyle = fill
    g.beginPath()
    g.ellipse(cx + x * s, cy + y * s, rx * s, ry * s, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.lineWidth = 3 * s
  g.strokeStyle = '#1b1b1b'
  // thân áo xanh + tay giơ lên
  g.fillStyle = GREEN
  g.beginPath()
  g.moveTo(cx - 52 * s, cy + 40 * s)
  g.lineTo(cx + 52 * s, cy + 40 * s)
  g.lineTo(cx + 46 * s, cy + 125 * s)
  g.lineTo(cx - 46 * s, cy + 125 * s)
  g.closePath()
  g.fill()
  g.stroke()
  for (const sd of [-1, 1]) {
    g.beginPath()
    g.moveTo(cx + sd * 45 * s, cy + 50 * s)
    g.lineTo(cx + sd * 95 * s, cy - 10 * s)
    g.lineTo(cx + sd * 112 * s, cy + 5 * s)
    g.lineTo(cx + sd * 60 * s, cy + 80 * s)
    g.closePath()
    g.fill()
    g.stroke()
    // găng lông trắng
    blob(sd * 108, -10, 20, 18, '#fff')
  }
  // khoá kéo
  g.beginPath()
  g.moveTo(cx, cy + 45 * s)
  g.lineTo(cx, cy + 122 * s)
  g.stroke()
  // viền lông gấu áo + chân + ủng trắng
  blob(0, 125, 58, 12, '#fff')
  g.fillStyle = GREEN
  g.fillRect(cx - 40 * s, cy + 130 * s, 28 * s, 34 * s)
  g.fillRect(cx + 12 * s, cy + 130 * s, 28 * s, 34 * s)
  blob(-26, 168, 26, 12, '#fff')
  blob(26, 168, 26, 12, '#fff')
  // mũ trùm lông trắng xù quanh mặt
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    blob(Math.cos(a) * 62, -10 + Math.sin(a) * 58, 22, 22, '#fff')
  }
  blob(0, -10, 62, 58, '#fff')
  // mặt cam + mắt nhắm cười
  blob(0, -6, 46, 42, '#ea6a1f')
  g.strokeStyle = '#3a1a0a'
  g.lineWidth = 3 * s
  for (const sd of [-1, 1]) {
    g.beginPath()
    g.arc(cx + sd * 16 * s, cy - 14 * s, 7 * s, Math.PI * 1.1, Math.PI * 1.9)
    g.stroke()
  }
  g.beginPath()
  g.arc(cx, cy + 6 * s, 14 * s, 0.15 * Math.PI, 0.85 * Math.PI)
  g.stroke()
}

/** chữ to vừa khít bề ngang `width`: đo rồi co giãn ngang */
function fitText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  skew = 0,
) {
  const m = g.measureText(text).width
  g.save()
  g.translate(x, y)
  g.transform(width / m, 0, -skew, 1, 0, 0)
  g.fillText(text, 0, 0)
  g.restore()
}

/**
 * Bố cục theo ảnh mẫu: nền navy bo góc; trái là ô vàng tròn có vành navy, chú bé áo lông; giữa là dải trắng ngang
 * chứa COLDTOP (xanh lá) + Topre (navy, nghiêng, to); dải navy dưới có 東プレ株式会社 trắng
 */
export function topreTexture() {
  const W = 1024
  const H = 455
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#d8dbe0'
  g.fillRect(0, 0, W, H)
  // nền navy bo góc + viền xám mảnh như mép may
  g.fillStyle = NAVY
  g.beginPath()
  g.roundRect(6, 6, W - 12, H - 12, 34)
  g.fill()
  const m = 30
  // dải trắng giữa (chạy tới mép phải)
  const bandY0 = H * 0.27
  const bandY1 = H * 0.66
  g.fillStyle = '#fff'
  g.fillRect(W * 0.2, bandY0, W - m - W * 0.2, bandY1 - bandY0)
  // ô vàng: chữ nhật bo góc trái + nửa tròn phải, vành navy dày quanh
  const cx = W * 0.215
  const cy = H * 0.5
  const r = H * 0.36
  g.fillStyle = NAVY
  g.beginPath()
  g.arc(cx, cy, r + 26, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = YELLOW
  g.beginPath()
  g.moveTo(m + 20, cy - r)
  g.lineTo(cx, cy - r)
  g.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2)
  g.lineTo(m + 20, cy + r)
  g.quadraticCurveTo(m, cy + r, m, cy + r - 20)
  g.lineTo(m, cy - r + 20)
  g.quadraticCurveTo(m, cy - r, m + 20, cy - r)
  g.fill()
  mascot(g, cx - 18, cy - 38, 0.92)
  // COLDTOP
  g.fillStyle = GREEN
  g.font = '900 60px "Arial Black", Impact, sans-serif'
  g.textAlign = 'left'
  fitText(g, 'COLDTOP', W * 0.53, bandY0 + 58, W * 0.25)
  // Topre: navy, nghiêng, cao gần hết dải trắng
  g.fillStyle = NAVY
  g.font = 'italic 900 170px "Arial Black", Impact, sans-serif'
  fitText(g, 'Topre', W * 0.39, bandY1 - 8, W * 0.52, 0.18)
  // 東プレ株式会社 trên dải navy dưới
  g.fillStyle = '#fff'
  g.font = '900 54px "Yu Gothic", "Meiryo", "MS Gothic", sans-serif'
  fitText(g, '東プレ株式会社', W * 0.57, H * 0.86, W * 0.3)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
