import { CanvasPainting, type PaintFn } from './CanvasPainting'

// Tranh "Ếch ngồi đáy giếng" ký tên keeb (vẽ bằng canvas): nhìn từ trong lòng giếng đá, trên cao là khoảng trời tròn nhỏ,
// dưới đáy chú ếch xanh ngồi trên vũng nước ngước nhìn lên. Khung gỗ + viền giấy. Đơn vị mét; gốc = tâm tranh, mặt quay +z

const PW = 420
const PH = 540

const drawWell: PaintFn = (g, _px, _py, signFont) => {
  const cx = PW / 2
  // lòng giếng: tối dần ra mép
  const wall = g.createRadialGradient(cx, 150, 40, cx, 260, 380)
  wall.addColorStop(0, '#6d6457')
  wall.addColorStop(0.5, '#3c352d')
  wall.addColorStop(1, '#16130f')
  g.fillStyle = wall
  g.fillRect(0, 0, PW, PH)
  // các vòng đá xếp quanh miệng giếng (elip đồng tâm nhìn từ dưới lên)
  for (let i = 0; i < 9; i++) {
    const ry = 34 + i * 30
    const rx = 70 + i * 34
    const cy = 120 + i * 26
    const n = 10 + i * 3
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2 + i * 0.3
      const a1 = a0 + (Math.PI * 2) / n - 0.05
      g.beginPath()
      g.ellipse(cx, cy, rx, ry, 0, a0, a1)
      g.strokeStyle = `rgba(${150 - i * 10},${138 - i * 10},${118 - i * 10},${0.55 - i * 0.04})`
      g.lineWidth = 16 - i
      g.stroke()
    }
  }
  // khoảng trời tròn trên miệng giếng + mây + quầng sáng
  const sky = g.createLinearGradient(0, 70, 0, 170)
  sky.addColorStop(0, '#5fa8e6')
  sky.addColorStop(1, '#bfe2f6')
  g.save()
  g.beginPath()
  g.ellipse(cx, 120, 62, 30, 0, 0, Math.PI * 2)
  g.fillStyle = sky
  g.fill()
  g.clip()
  g.fillStyle = 'rgba(255,255,255,0.9)'
  for (const [x, y, r] of [
    [cx - 18, 118, 12],
    [cx - 4, 112, 15],
    [cx + 12, 119, 11],
  ])
    g.fill(
      new Path2D(`M ${x + r} ${y} A ${r} ${r} 0 1 0 ${x - r} ${y} A ${r} ${r} 0 1 0 ${x + r} ${y}`),
    )
  g.restore()
  // vệt sáng rọi từ miệng giếng xuống đáy
  const beam = g.createLinearGradient(0, 130, 0, 460)
  beam.addColorStop(0, 'rgba(255,245,210,0.35)')
  beam.addColorStop(1, 'rgba(255,245,210,0.05)')
  g.fillStyle = beam
  g.beginPath()
  g.moveTo(cx - 55, 135)
  g.lineTo(cx + 55, 135)
  g.lineTo(cx + 120, 470)
  g.lineTo(cx - 120, 470)
  g.closePath()
  g.fill()
  // đáy giếng: vũng nước + rêu
  g.fillStyle = '#2f3a30'
  g.beginPath()
  g.ellipse(cx, 470, 190, 58, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(150,200,220,0.35)'
  g.beginPath()
  g.ellipse(cx, 478, 120, 26, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(220,240,255,0.4)'
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(cx, 478, 80, 14, 0, 0, Math.PI * 2)
  g.stroke()
  // ếch ngồi giữa vũng, ngước lên trời
  const fy = 430
  g.fillStyle = '#3f8f3a'
  // 2 chân sau gập 2 bên
  for (const s of [-1, 1]) {
    g.beginPath()
    g.ellipse(cx + s * 46, fy + 32, 30, 18, s * 0.4, 0, Math.PI * 2)
    g.fill()
  }
  // thân
  g.beginPath()
  g.ellipse(cx, fy + 10, 50, 44, 0, 0, Math.PI * 2)
  g.fill()
  // bụng trắng ngà
  g.fillStyle = '#e8e2b8'
  g.beginPath()
  g.ellipse(cx, fy + 22, 30, 28, 0, 0, Math.PI * 2)
  g.fill()
  // 2 chân trước
  g.fillStyle = '#367d32'
  for (const s of [-1, 1]) {
    g.beginPath()
    g.ellipse(cx + s * 22, fy + 46, 9, 16, s * -0.2, 0, Math.PI * 2)
    g.fill()
  }
  // đầu + 2 mắt lồi, con ngươi nhìn lên
  g.fillStyle = '#4aa043'
  g.beginPath()
  g.ellipse(cx, fy - 26, 42, 26, 0, 0, Math.PI * 2)
  g.fill()
  for (const s of [-1, 1]) {
    g.fillStyle = '#4aa043'
    g.beginPath()
    g.arc(cx + s * 24, fy - 46, 15, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fbfbf2'
    g.beginPath()
    g.arc(cx + s * 24, fy - 47, 10, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#1b1b1b'
    g.beginPath()
    g.arc(cx + s * 23, fy - 51, 5, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(cx + s * 22, fy - 53, 1.6, 0, Math.PI * 2)
    g.fill()
  }
  // miệng cười
  g.strokeStyle = '#1f4d1c'
  g.lineWidth = 2.5
  g.beginPath()
  g.arc(cx, fy - 24, 20, 0.2 * Math.PI, 0.8 * Math.PI)
  g.stroke()
  // má hồng
  g.fillStyle = 'rgba(240,130,130,0.45)'
  for (const s of [-1, 1]) {
    g.beginPath()
    g.ellipse(cx + s * 30, fy - 18, 7, 4, 0, 0, Math.PI * 2)
    g.fill()
  }
  // chữ ký góc phải dưới
  g.fillStyle = '#f3e7c8'
  g.font = `48px ${signFont}`
  g.textAlign = 'right'
  g.save()
  g.translate(PW - 22, PH - 22)
  g.rotate(-0.08)
  g.fillText('keeb', 0, 0)
  g.restore()
}

export function FrogPainting(props: JSX.IntrinsicElements['group']) {
  return <CanvasPainting draw={drawWell} px={PW} py={PH} w={0.42} h={0.54} {...props} />
}
