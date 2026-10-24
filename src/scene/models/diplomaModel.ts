import * as THREE from 'three'

// Khung ảnh để bàn có chân chống sau (assets/user-props/picture-frame.glb, người dùng cung cấp, chưa rõ giấy phép):
// mét, đáy ở y = 0, mặt trước +z, khổ dọc 18.9 × 24.6cm. Tấm giấy trắng sẵn có ("Unprinted frame insert")
// được ẩn đi, thay bằng tấm chứng chỉ vẽ canvas đặt đúng chỗ (dưới lớp kính)
export const DIPLOMA_URL = '/models/room/picture-frame.glb'
/** lòng khung (m): rộng, cao, tâm y, mặt giấy z (ngay trước tấm giấy gốc, sau lớp kính) */
const PAPER = { w: 0.166, h: 0.222, y: 0.123, z: -0.0045 }

/** Tấm giấy chứng chỉ khổ dọc vẽ bằng canvas: tên xưởng + bậc thợ */
function paperTexture(rank: string) {
  const c = document.createElement('canvas')
  c.width = 768
  c.height = 1024
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
  g.font = 'bold 50px Georgia, serif'
  g.fillText('CHỨNG CHỈ', c.width / 2, 200)
  g.fillText('THỢ PHÍM', c.width / 2, 262)
  g.font = 'italic 30px Georgia, serif'
  g.fillText('KeebOS Workshop chứng nhận', c.width / 2, 340)
  g.fillStyle = '#1f2a44'
  g.font = 'bold 92px Georgia, serif'
  g.fillText(rank.toUpperCase(), c.width / 2, 520)
  g.fillStyle = '#5a4520'
  g.font = '28px Georgia, serif'
  g.fillText('Đủ tay nghề lắp ráp, mod', c.width / 2, 620)
  g.fillText('và hàn bàn phím cơ', c.width / 2, 660)
  // con dấu đỏ
  g.fillStyle = '#b3261e'
  g.beginPath()
  g.arc(c.width / 2, c.height - 190, 70, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#f5f1e6'
  g.font = 'bold 32px Georgia, serif'
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
    o.castShadow = o.receiveShadow = true
  })
  group.add(frame)
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(PAPER.w, PAPER.h),
    new THREE.MeshStandardMaterial({ map: paperTexture(rank), roughness: 0.9 }),
  )
  paper.position.set(0, PAPER.y, PAPER.z)
  group.add(paper)
  return group
}
