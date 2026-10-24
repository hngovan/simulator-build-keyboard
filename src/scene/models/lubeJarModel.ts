import * as THREE from 'three'
import { SUPPLIES } from '@/data/supplies'

export const LUBE_JAR_URL = '/models/lube/jar.glb'
const TOP = 0.135 / 0.11
const labels = new Map<string, THREE.CanvasTexture>()

function labelTexture(id: string) {
  const cached = labels.get(id)
  if (cached) return cached
  const supply = SUPPLIES[id]
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 384
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f5f2e9'
  ctx.fillRect(0, 0, 768, 384)
  const accent = ['#375a76', '#54734d', '#80553a', '#685286'][Object.keys(SUPPLIES).indexOf(id) % 4]
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, 768, 68)
  ctx.fillRect(0, 366, 768, 18)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px sans-serif'
  ctx.fillText('KEYBOARD LUBRICANT', 384, 46)
  ctx.fillStyle = '#232d35'
  const name = supply.name.replace('Krytox ', '').replace('Tribosys ', '')
  ctx.font = 'bold 70px sans-serif'
  ctx.fillText(name, 384, 196, 700)
  ctx.font = '34px sans-serif'
  const brand = supply.name.startsWith('Krytox')
    ? 'KRYTOX'
    : supply.name.startsWith('Tribosys')
      ? 'TRIBOSYS'
      : 'KEYBOARD CARE'
  ctx.fillText(brand, 384, 119)
  ctx.font = '28px sans-serif'
  ctx.fillText(id === 'gpl105' ? 'LUBRICATING OIL' : 'LUBRICATING GREASE', 384, 278)
  ctx.font = '24px sans-serif'
  ctx.fillText('SWITCHES · STABILIZERS', 384, 326)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  labels.set(id, texture)
  return texture
}

/** Same jar, grease, lid and printed label on the mod table and in Shopii. */
export function createLubeJar(source: THREE.Group, id: string) {
  const group = new THREE.Group()
  const jar = source.clone(true)
  jar.scale.setScalar(1 / 0.11)
  jar.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    if (/wick/i.test(object.name)) {
      object.visible = false
      return
    }
    object.castShadow = true
    const adjust = (original: THREE.Material) => {
      const mat = (original as THREE.MeshStandardMaterial).clone()
      if (/wax/i.test(object.name)) {
        mat.color.set(SUPPLIES[id].color)
        mat.roughness = 0.12
      } else {
        mat.transparent = true
        mat.opacity = 0.35
        mat.roughness = 0.05
        mat.depthWrite = false
      }
      return mat
    }
    object.material = Array.isArray(object.material)
      ? object.material.map(adjust)
      : adjust(object.material)
  })
  group.add(jar)
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.53, 0.53, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.5 }),
  )
  lid.position.y = TOP + 0.06
  lid.castShadow = true
  group.add(lid)
  const printed = new THREE.MeshStandardMaterial({
    map: labelTexture(id),
    roughness: 0.85,
    side: THREE.DoubleSide,
  })
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.506, 0.506, 0.6, 48, 1, true, -1.15, 2.3),
    printed,
  )
  label.position.y = 0.64
  group.add(label)
  const lidLabel = new THREE.Mesh(new THREE.CircleGeometry(0.45, 48), printed)
  lidLabel.rotation.x = -Math.PI / 2
  lidLabel.position.y = TOP + 0.121
  group.add(lidLabel)
  return group
}

/** Dầu (loãng, vd GPL 105) đựng lọ nhỏ giọt, mỡ đựng hũ */
export const isOil = (id: string) => (SUPPLIES[id]?.viscosity ?? 1) < 0.1

/**
 * Lọ dầu nhỏ giọt (dùng chung bàn lube + Shopii): thân nhựa trong thấy dầu bên trong, vòi nhỏ giọt,
 * nhãn in tên dầu quấn quanh thân. Gốc ở đáy lọ, cao ~0.85 đơn vị
 */
export function createOilBottle(id: string) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.64, 32),
    new THREE.MeshPhysicalMaterial({
      color: '#cfe0ee',
      transmission: 0.6,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
    }),
  )
  body.position.y = 0.32
  body.castShadow = true
  group.add(body)
  // dầu bên trong (màu theo loại dầu)
  const oil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.46, 32),
    new THREE.MeshStandardMaterial({ color: SUPPLIES[id].color, roughness: 0.1 }),
  )
  oil.position.y = 0.25
  group.add(oil)
  const nozzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.22, 24),
    new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.4 }),
  )
  nozzle.position.y = 0.75
  group.add(nozzle)
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.212, 0.222, 0.34, 32, 1, true, -1.2, 2.4),
    new THREE.MeshStandardMaterial({
      map: labelTexture(id),
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  )
  label.position.y = 0.3
  group.add(label)
  return group
}
