import type { PaintFn } from './CanvasPainting'

// Tờ "300.000 đồng" đóng khung (tờ tiền meme, không có thật; vẽ cách điệu, không chân dung người thật):
// polymer cam vàng, hoa văn guilloche, số mệnh giá 2 góc, quốc huy cách điệu, tranh vịnh núi đá + thuyền buồm,
// dải cửa sổ trong suốt, số sê-ri. Canvas ngang ~2.1 : 1

export const drawBanknote: PaintFn = (g, W, H) => {
  // nền cam vàng chuyển tím nhạt
  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#f6c66b')
  bg.addColorStop(0.55, '#f0a35a')
  bg.addColorStop(1, '#d98aa8')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  // guilloche: các sóng sin lồng nhau
  g.lineWidth = 1
  for (let k = 0; k < 26; k++) {
    g.strokeStyle = `rgba(120,50,20,${0.08 + (k % 3) * 0.03})`
    g.beginPath()
    for (let x = 0; x <= W; x += 4) {
      const y =
        H * 0.5 + Math.sin(x / 38 + k * 0.5) * (H * 0.32) * Math.cos(k * 0.21) + (k - 13) * 4
      if (x === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  // khung viền trong
  g.strokeStyle = 'rgba(110,40,15,0.6)'
  g.lineWidth = 4
  g.strokeRect(14, 14, W - 28, H - 28)
  g.lineWidth = 1.5
  g.strokeRect(22, 22, W - 44, H - 44)

  // tranh giữa: vịnh núi đá vôi + thuyền buồm
  const vx = W * 0.36
  const vy = H * 0.26
  const vw = W * 0.4
  const vh = H * 0.5
  g.save()
  g.beginPath()
  g.ellipse(vx + vw / 2, vy + vh / 2, vw / 2, vh / 2, 0, 0, Math.PI * 2)
  g.clip()
  g.fillStyle = 'rgba(255,240,215,0.55)'
  g.fillRect(vx, vy, vw, vh)
  g.fillStyle = 'rgba(120,45,20,0.75)'
  for (const [x, w, h] of [
    [0.08, 0.16, 0.55],
    [0.22, 0.12, 0.75],
    [0.36, 0.18, 0.5],
    [0.58, 0.14, 0.68],
    [0.72, 0.2, 0.45],
  ]) {
    g.beginPath()
    g.moveTo(vx + vw * x, vy + vh * 0.72)
    g.quadraticCurveTo(
      vx + vw * (x + w * 0.1),
      vy + vh * (0.72 - h),
      vx + vw * (x + w / 2),
      vy + vh * (0.72 - h),
    )
    g.quadraticCurveTo(
      vx + vw * (x + w * 0.9),
      vy + vh * (0.72 - h),
      vx + vw * (x + w),
      vy + vh * 0.72,
    )
    g.fill()
  }
  // mặt nước gợn
  g.strokeStyle = 'rgba(120,45,20,0.5)'
  for (let i = 0; i < 6; i++) {
    g.beginPath()
    g.moveTo(vx, vy + vh * (0.76 + i * 0.04))
    for (let x = 0; x <= vw; x += 10)
      g.lineTo(vx + x, vy + vh * (0.76 + i * 0.04) + Math.sin(x / 9 + i) * 2)
    g.stroke()
  }
  // thuyền buồm
  g.fillStyle = 'rgba(150,40,20,0.9)'
  g.beginPath()
  g.moveTo(vx + vw * 0.42, vy + vh * 0.76)
  g.lineTo(vx + vw * 0.58, vy + vh * 0.76)
  g.lineTo(vx + vw * 0.55, vy + vh * 0.81)
  g.lineTo(vx + vw * 0.45, vy + vh * 0.81)
  g.fill()
  for (const [dx, h] of [
    [0.46, 0.3],
    [0.52, 0.36],
  ]) {
    g.beginPath()
    g.moveTo(vx + vw * dx, vy + vh * 0.75)
    g.lineTo(vx + vw * dx, vy + vh * (0.75 - h))
    g.lineTo(vx + vw * (dx + 0.06), vy + vh * 0.73)
    g.fill()
  }
  g.restore()

  // quốc huy cách điệu: vòng đỏ, sao vàng
  const ex = W * 0.17
  const ey = H * 0.42
  g.fillStyle = '#c8281e'
  g.beginPath()
  g.arc(ex, ey, H * 0.13, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#e8b030'
  g.lineWidth = 5
  g.stroke()
  g.fillStyle = '#ffd94a'
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? H * 0.035 : H * 0.085
    g.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr)
  }
  g.closePath()
  g.fill()

  // chữ
  g.fillStyle = '#5a1f0c'
  g.textAlign = 'center'
  g.font = `800 ${Math.round(H * 0.07)}px "Times New Roman", serif`
  g.fillText('NGÂN HÀNG NHÀ NƯỚC VIỆT NAM', W * 0.56, H * 0.17)
  g.font = `700 ${Math.round(H * 0.065)}px "Times New Roman", serif`
  g.fillText('BA TRĂM NGHÌN ĐỒNG', W * 0.56, H * 0.88)
  g.font = `900 ${Math.round(H * 0.15)}px "Arial Black", Impact, sans-serif`
  g.textAlign = 'right'
  g.fillText('300000', W - 34, H * 0.36)
  g.textAlign = 'left'
  g.font = `900 ${Math.round(H * 0.1)}px "Arial Black", Impact, sans-serif`
  g.fillText('300000', 34, H * 0.88)
  // số sê-ri đỏ
  g.fillStyle = '#b3201a'
  g.font = `700 ${Math.round(H * 0.06)}px "Courier New", monospace`
  g.fillText('KB 30000003', W * 0.06, H * 0.7)
  // dải cửa sổ trong suốt bên phải
  const sx = W * 0.82
  const glass = g.createLinearGradient(sx, 0, sx + W * 0.08, 0)
  glass.addColorStop(0, 'rgba(255,255,255,0.15)')
  glass.addColorStop(0.5, 'rgba(255,255,255,0.55)')
  glass.addColorStop(1, 'rgba(255,255,255,0.15)')
  g.fillStyle = glass
  g.fillRect(sx, H * 0.45, W * 0.08, H * 0.35)
  g.fillStyle = 'rgba(90,30,10,0.55)'
  g.font = `900 ${Math.round(H * 0.07)}px "Arial Black", sans-serif`
  g.textAlign = 'center'
  g.fillText('300', sx + W * 0.04, H * 0.66)
}
