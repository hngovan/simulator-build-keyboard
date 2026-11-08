// Pin Li-Po (ảnh / khung 3D Shopii + nhãn in thông số dùng chung với bàn build `scene/parts/Battery.tsx`)
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { SUPPLIES } from '@/data/supplies'

/** nhãn trắng in thông số mặt trên pin (canvas), khối chữ dồn về phía đầu dây `side` */
const labelTex = new Map<string, THREE.CanvasTexture>()
export function batteryLabel(id: string, side: 1 | -1) {
  const key = `${id}:${side}`
  const hit = labelTex.get(key)
  if (hit) return hit
  const b = SUPPLIES[id]!.battery!
  const W = 512
  const H = Math.round((W * b.w) / b.l)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#eceeed'
  g.fillRect(0, 0, W, H)
  // vân bạc nhẹ của lớp nhôm dưới nhãn
  const grad = g.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, 'rgba(255,255,255,0.5)')
  grad.addColorStop(0.5, 'rgba(200,204,208,0.25)')
  grad.addColorStop(1, 'rgba(255,255,255,0.4)')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // khối chữ gần đầu dây (như ảnh pin thật), lật theo phía dây ra
  // cỡ chữ theo bề rộng khối thông số (~13,5u: dấu +/− + QR + 2 cột chữ + thùng rác), không tràn nhãn
  const u = Math.min(H / 9, (W * 0.8) / 13.5)
  // khối chữ dồn về phía đầu dây (như pin thật)
  const x0 = side > 0 ? W - u * 12.6 : u * 1.4
  g.fillStyle = '#222'
  // mã QR giả: lưới ô vuông ngẫu nhiên cố định theo dung lượng
  const q = u * 2.4
  const qx = x0
  const qy = (H - q) / 2
  let seed = b.mah
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++)
      if (rnd() > 0.5) g.fillRect(qx + (i * q) / 9, qy + (j * q) / 9, q / 9, q / 9)
  for (const [cx, cy] of [
    [0, 0],
    [6, 0],
    [0, 6],
  ]) {
    g.fillRect(qx + (cx * q) / 9, qy + (cy * q) / 9, (q * 3) / 9, (q * 3) / 9)
    g.fillStyle = '#eceeed'
    g.fillRect(qx + ((cx + 0.7) * q) / 9, qy + ((cy + 0.7) * q) / 9, (q * 1.6) / 9, (q * 1.6) / 9)
    g.fillStyle = '#222'
  }
  // + / − cạnh mã QR
  g.font = `bold ${u * 1.1}px Arial`
  g.textBaseline = 'middle'
  g.fillText('−', qx - u * 1, qy + q * 0.2)
  g.fillText('+', qx - u * 1, qy + q * 0.85)
  // thông số
  const code = `${b.t * 10}${b.w}${b.l}`
  const tx = qx + q + u * 0.6
  g.font = `bold ${u * 0.95}px Arial`
  g.fillText(code, tx, qy + u * 0.4)
  g.font = `${u * 0.85}px Arial`
  g.fillText(`${b.mah}mAh`, tx, qy + u * 1.35)
  g.fillText(`2026${String(b.mah).slice(0, 2)}853`, tx, qy + u * 2.2)
  const sx = tx + u * 4.6
  g.font = `bold ${u * 0.9}px Arial`
  g.fillText('3.7V', sx, qy + u * 0.4)
  g.font = `${u * 0.8}px Arial`
  g.fillText(`${((3.7 * b.mah) / 1000).toFixed(1)}Wh`, sx, qy + u * 1.35)
  // ký hiệu thùng rác gạch chéo (không vứt pin chung rác)
  const bx = sx + u * 3
  const by = qy - u * 0.2
  g.strokeStyle = '#222'
  g.lineWidth = Math.max(1.5, u * 0.12)
  g.strokeRect(bx, by + u * 0.4, u * 1.2, u * 1.4)
  g.beginPath()
  g.moveTo(bx - u * 0.2, by + u * 0.35)
  g.lineTo(bx + u * 1.4, by + u * 0.35)
  g.moveTo(bx - u * 0.3, by)
  g.lineTo(bx + u * 1.5, by + u * 2.1)
  g.moveTo(bx + u * 1.5, by)
  g.lineTo(bx - u * 0.3, by + u * 2.1)
  g.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  labelTex.set(key, tex)
  return tex
}

/**
 * Viên pin Li-Po bán lẻ cho Shopii (đơn vị cảnh thumbnail ~ cỡ 2): túi pin bọc Kapton vàng, nhãn trắng mặt trên, bó mạch bảo vệ ở
 * đầu dây, 2 dây đỏ / đen + đầu cắm JST PH trắng
 */
export function createBatteryPack(id: string) {
  const b = SUPPLIES[id]!.battery!
  const k = 2.4 / Math.max(b.l, b.w)
  const L = b.l * k
  const W = b.w * k
  const T = Math.max(b.t * k, 0.12)
  const pcm = 4 * k
  const rim = 1.5 * k
  const group = new THREE.Group()
  const kapton = new THREE.MeshPhysicalMaterial({
    color: '#e0a92a',
    roughness: 0.28,
    clearcoat: 0.6,
  })
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(L - pcm, T, W, 3, Math.min(T / 2 - 0.001, 0.05)),
    kapton,
  )
  body.position.set(-pcm / 2, 0, 0)
  group.add(body)
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(L - pcm - 2 * rim, W - 2 * rim),
    new THREE.MeshStandardMaterial({ map: batteryLabel(id, 1), roughness: 0.55 }),
  )
  label.rotation.x = -Math.PI / 2
  label.position.set(-pcm / 2, T / 2 + 0.002, 0)
  group.add(label)
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(pcm, T * 0.8, W * 0.92),
    new THREE.MeshPhysicalMaterial({ color: '#d39a1c', roughness: 0.3, clearcoat: 0.5 }),
  )
  tape.position.set(L / 2 - pcm / 2, -T * 0.1, 0)
  group.add(tape)
  // 2 dây đỏ / đen ra từ đầu pin, cong về phía trước rồi tới đầu cắm JST PH
  const plugAt = new THREE.Vector3(L / 2 + 0.55, -T * 0.2, W * 0.42)
  ;['#c62828', '#1b1b1b'].forEach((c, i) => {
    const dz = (i - 0.5) * 0.06
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(L / 2, 0, dz),
      new THREE.Vector3(L / 2 + 0.35, -T * 0.1, dz + 0.05),
      new THREE.Vector3(L / 2 + 0.55, -T * 0.2, W * 0.2 + dz),
      plugAt.clone().add(new THREE.Vector3(0, 0, dz - 0.12)),
    ])
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.025, 8),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }),
      ),
    )
  })
  const plug = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.1, 0.2),
    new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.6 }),
  )
  plug.position.copy(plugAt)
  group.add(plug)
  group.rotation.set(0.5, -0.5, 0)
  return group
}
