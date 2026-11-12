import * as THREE from 'three'
import { cheapGlass } from '../common/warmup'

// Khung ảnh để bàn có chân chống sau (assets/supplies/picture-frame.glb, người dùng cung cấp, chưa rõ giấy phép):
// mét, đáy ở y = 0, mặt trước +z, khổ dọc 18.9 × 24.6cm. Tấm giấy trắng sẵn có ("Unprinted frame insert")
// được ẩn đi, thay bằng tấm chứng chỉ vẽ canvas đặt trong lòng khung, ngay sau lớp kính
export const DIPLOMA_URL = '/models/room/picture-frame.glb'
/**
 * lòng khung (m, đo từ GLB): 4 thanh gỗ dày 18mm (z ±0.009) chừa lỗ 153 × 210mm, tâm y 0.123. Kính gốc của model to hơn lỗ (167 × 224mm)
 * và nằm trước mặt gỗ (z 0.010) → nhìn như tấm kính dán ngoài khung: co kính vừa lỗ, lùi vào trong lòng khung, giấy áp sát sau kính
 */
const OPENING = { w: 0.153, h: 0.21, y: 0.123 }
const GLASS = { w: 0.167, h: 0.224, z: 0.0065 }
/** giấy rộng hơn lỗ 1mm mỗi bên (lấp khe sát gỗ), ngay sau kính */
const PAPER = { w: OPENING.w + 0.002, h: OPENING.h + 0.002, y: OPENING.y, z: 0.005 }
/** font có đủ dấu tiếng Việt (Georgia thiếu ề / ắ... nên dấu bị tách rời) */
const SERIF = '"Times New Roman", "Noto Serif", Tinos, serif'

/** Tấm giấy chứng chỉ khổ dọc vẽ bằng canvas: tên xưởng + bậc thợ */
function paperTexture(rank: string) {
  const c = document.createElement('canvas')
  c.width = 768
  c.height = 1050
  const g = c.getContext('2d')!
  g.fillStyle = '#f5f1e6'
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = '#b08a3e'
  g.lineWidth = 10
  g.strokeRect(30, 30, c.width - 60, c.height - 60)
  g.lineWidth = 3
  g.strokeRect(52, 52, c.width - 104, c.height - 104)
  g.textAlign = 'center'
  g.fillStyle = '#5a4520'
  g.font = `bold 50px ${SERIF}`
  g.fillText('CHỨNG CHỈ', c.width / 2, 200)
  g.fillText('THỢ PHÍM', c.width / 2, 262)
  g.font = `italic 30px ${SERIF}`
  g.fillText('KeebOS Workshop chứng nhận', c.width / 2, 340)
  g.fillStyle = '#1f2a44'
  g.font = `bold 92px ${SERIF}`
  g.fillText(rank.toUpperCase(), c.width / 2, 520)
  g.fillStyle = '#5a4520'
  g.font = `28px ${SERIF}`
  g.fillText('Đủ tay nghề lắp ráp, mod', c.width / 2, 620)
  g.fillText('và hàn bàn phím cơ', c.width / 2, 660)
  // con dấu đỏ
  g.fillStyle = '#b3261e'
  g.beginPath()
  g.arc(c.width / 2, c.height - 190, 70, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#f5f1e6'
  g.font = `bold 32px ${SERIF}`
  g.fillText('SBK', c.width / 2, c.height - 180)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Khung chứng chỉ để bàn (mét, đáy y = 0, mặt trước +z) ghi bậc thợ `rank` */
export function createDiploma(source: THREE.Object3D, rank: string) {
  const group = new THREE.Group()
  const frame = source.clone(true)
  frame.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return
    if (/insert/i.test(o.name)) o.visible = false
    // kính: co vừa lỗ khung + lùi vào trong lòng khung (model gốc đặt kính to hơn lỗ, nằm trước mặt gỗ)
    if (/glazing/i.test(o.name)) {
      o.scale.set(OPENING.w / GLASS.w, OPENING.h / GLASS.h, 1)
      o.position.z = GLASS.z
    }
    o.castShadow = o.receiveShadow = true
  })
  // kính khung: trong suốt thường (transmission bắt vẽ lại cả cảnh mỗi khung)
  cheapGlass(frame)
  group.add(frame)
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(PAPER.w, PAPER.h),
    new THREE.MeshStandardMaterial({ map: paperTexture(rank), roughness: 0.9 }),
  )
  paper.position.set(0, PAPER.y, PAPER.z)
  group.add(paper)
  return group
}
