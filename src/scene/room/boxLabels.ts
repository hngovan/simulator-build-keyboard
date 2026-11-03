import * as THREE from 'three'

// Nhãn dán thùng carton dùng chung: thùng đơn / thùng đã đóng gói (`CardBox` trong DoorParcels) + thùng đang đóng gói trên bàn (`PackBox`)

/** nhãn giao hàng trắng */
export const LABEL = new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.8 })

/** tên trên nhãn thùng: bỏ danh xưng (Anh / Chị / Bạn...), chỉ ghi tên */
export const shortName = (name: string) =>
  name.replace(/^(anh|chị|bạn|em|cô|chú|bác|ông|bà)\s+/iu, '')

/** tem "hàng dễ vỡ": ly vỡ đỏ + chữ DỄ VỠ trên nền trắng (vẽ canvas 1 lần) */
let fragileMat: THREE.MeshStandardMaterial | null = null
export function fragileSticker() {
  if (fragileMat) return fragileMat
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#f6f3ec'
  g.fillRect(0, 0, 128, 128)
  g.strokeStyle = '#d32f2f'
  g.lineWidth = 6
  g.strokeRect(5, 5, 118, 118)
  g.fillStyle = '#d32f2f'
  // ly rượu: miệng ly + chân + đế
  g.beginPath()
  g.moveTo(40, 16)
  g.lineTo(88, 16)
  g.quadraticCurveTo(88, 62, 64, 66)
  g.quadraticCurveTo(40, 62, 40, 16)
  g.fill()
  g.fillRect(61, 64, 6, 22)
  g.fillRect(48, 84, 32, 6)
  // vết nứt
  g.strokeStyle = '#f6f3ec'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(56, 16)
  g.lineTo(64, 30)
  g.lineTo(58, 40)
  g.lineTo(66, 52)
  g.stroke()
  g.fillStyle = '#d32f2f'
  g.font = '900 26px system-ui, sans-serif'
  g.textAlign = 'center'
  g.fillText('DỄ VỠ', 64, 116)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  fragileMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })
  return fragileMat
}
