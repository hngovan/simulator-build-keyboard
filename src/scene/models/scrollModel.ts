import * as THREE from 'three'

// Cuộn sách phép (dựng bằng code): 2 trục giấy cuộn, đầu núm gỗ + vòng đồng, tấm giấy da cong nhẹ ghi tên phép

/** Mặt giấy da vẽ canvas: nền ngà loang + tên phép */
function paperTexture(title: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 640
  const g = c.getContext('2d')!
  g.fillStyle = '#e9dfb4'
  g.fillRect(0, 0, c.width, c.height)
  // vết loang cho ra giấy cũ
  for (let i = 0; i < 40; i++) {
    const x = (i * 197) % c.width
    const y = (i * 131) % c.height
    const r = 30 + ((i * 37) % 70)
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(160,140,80,0.12)')
    grad.addColorStop(1, 'rgba(160,140,80,0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  g.textAlign = 'center'
  g.fillStyle = '#5a3d17'
  g.font = 'bold 54px Georgia, serif'
  const words = title.toUpperCase().split(' ')
  const lines = [words.slice(0, 1).join(' '), words.slice(1).join(' ')].filter(Boolean)
  lines.forEach((l, i) => g.fillText(l, c.width / 2, 250 + i * 70))
  g.strokeStyle = '#8a6a32'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(120, 420)
  g.lineTo(c.width - 120, 420)
  g.stroke()
  g.font = 'italic 30px Georgia, serif'
  g.fillText('✦ ✦ ✦', c.width / 2, 480)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Cuộn phép đứng dọc (đơn vị tuỳ ý, cao ≈ 1.3), mặt giấy hướng +z */
export function createScroll(title: string) {
  const group = new THREE.Group()
  const W = 0.8
  const H = 1.1
  const R = 0.06
  const paper = new THREE.MeshStandardMaterial({ color: '#efe4bd', roughness: 0.9 })
  const wood = new THREE.MeshStandardMaterial({ color: '#4a2f1d', roughness: 0.55 })
  const bronze = new THREE.MeshStandardMaterial({
    color: '#b57a2c',
    metalness: 0.8,
    roughness: 0.3,
  })

  // tấm giấy: cong nhẹ theo chiều ngang
  const sheet = new THREE.PlaneGeometry(W, H, 16, 1)
  const pos = sheet.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (W / 2)
    pos.setZ(i, -0.05 * x * x)
  }
  sheet.computeVertexNormals()
  const face = new THREE.Mesh(
    sheet,
    new THREE.MeshStandardMaterial({
      map: paperTexture(title),
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  )
  group.add(face)

  // 2 trục cuộn trên / dưới + núm 2 đầu
  for (const y of [H / 2, -H / 2]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W + 0.04, 24), paper)
    roll.rotation.z = Math.PI / 2
    roll.position.set(0, y, R * 0.6)
    group.add(roll)
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 + 0.02)
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.25, R * 1.25, 0.04, 20), bronze)
      ring.rotation.z = Math.PI / 2
      ring.position.set(x + sx * 0.02, y, R * 0.6)
      // núm gỗ loe ra ngoài
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.3, R * 0.6, 0.12, 20), wood)
      knob.rotation.z = (-sx * Math.PI) / 2
      knob.position.set(x + sx * 0.1, y, R * 0.6)
      const tip = new THREE.Mesh(new THREE.SphereGeometry(R * 0.55, 16, 12), bronze)
      tip.position.set(x + sx * 0.18, y, R * 0.6)
      group.add(ring, knob, tip)
    }
  }
  group.rotation.set(0.15, -0.35, 0.12)
  return group
}
