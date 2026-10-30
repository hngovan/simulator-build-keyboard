import * as THREE from 'three'
import type { SpoolLabel } from '@/data/supplies'

const RIM = 1.05
const HALF_WIDTH = 0.64
const AXLE_HEIGHT = 1.35
const WIRE_RADIUS = 0.03

function mesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
) {
  const part = new THREE.Mesh(geometry, material)
  part.position.set(...position)
  part.castShadow = part.receiveShadow = true
  group.add(part)
  return part
}

/** Hollow reel parts, revolved around Y; the bore stays open through both flanges. */
function annulus(inner: number, outer: number, halfHeight: number) {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(inner, -halfHeight),
      new THREE.Vector2(outer, -halfHeight),
      new THREE.Vector2(outer, halfHeight),
      new THREE.Vector2(inner, halfHeight),
      new THREE.Vector2(inner, -halfHeight),
    ],
    64,
  )
}

/** chữ uốn theo cung tròn, căn giữa tại góc `mid` (−π/2 = đỉnh) */
function arcText(ctx: CanvasRenderingContext2D, text: string, r: number, mid: number) {
  const chars = [...text]
  const widths = chars.map((ch) => ctx.measureText(ch).width)
  let a = mid - widths.reduce((sum, w) => sum + w, 0) / r / 2
  chars.forEach((ch, i) => {
    const step = widths[i] / r
    ctx.save()
    ctx.translate(256 + r * Math.cos(a + step / 2), 256 + r * Math.sin(a + step / 2))
    ctx.rotate(a + step / 2 + Math.PI / 2)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
    a += step
  })
}

function lines(ctx: CanvasRenderingContext2D, x: number, y: number, gap: number, rows: string[]) {
  rows.forEach((row, i) => ctx.fillText(row, x, y + i * gap))
}

function circle(ctx: CanvasRenderingContext2D, r: number, width: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.arc(256, 256, r, 0, Math.PI * 2)
  ctx.stroke()
}

/** nhãn dán mặt cuộn thiếc theo hãng (canvas 512², tâm = lỗ trục) + màu nhựa vành cuộn */
const LABELS: Record<
  SpoolLabel,
  { flange: string; draw: (ctx: CanvasRenderingContext2D) => void }
> = {
  sakura: {
    flange: '#2443b8',
    draw: (ctx) => {
      const blue = '#1f3aa6'
      ctx.fillStyle = '#f7f8fa'
      ctx.fillRect(0, 0, 512, 512)
      circle(ctx, 244, 24, blue)
      circle(ctx, 64, 30, blue)
      ctx.fillStyle = blue
      ctx.textAlign = 'center'
      ctx.font = 'italic bold 64px Georgia, serif'
      ctx.fillText('Sakura', 248, 128)
      ctx.font = '22px sans-serif'
      ctx.fillText('®', 356, 92)
      ctx.fillRect(84, 154, 344, 3)
      ctx.fillRect(84, 372, 344, 3)
      ctx.font = '30px sans-serif'
      lines(ctx, 128, 214, 40, ['ALLOY', '63/37', 'FLUX', '2%'])
      lines(ctx, 384, 214, 40, ['DIA', '0.8MM', 'WT', '100G'])
      ctx.font = '32px sans-serif'
      ctx.fillText('Made in Japan', 256, 420)
    },
  },
  asahi: {
    flange: '#e4e6e8',
    draw: (ctx) => {
      const red = '#d0281c'
      const ink = '#3a2a12'
      const bg = ctx.createRadialGradient(256, 256, 60, 256, 256, 256)
      bg.addColorStop(0, '#fbd23a')
      bg.addColorStop(1, '#f0a81c')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, 512, 512)
      circle(ctx, 250, 6, '#c98a12')
      circle(ctx, 58, 8, '#c98a12')
      ctx.textAlign = 'center'
      ctx.fillStyle = red
      ctx.font = 'bold 34px Arial, sans-serif'
      arcText(ctx, 'ROSIN ACTIVATED CORE WIRE', 212, -Math.PI / 2 - 0.35)
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText('松香型活化剂', 280, 128)
      ctx.fillStyle = ink
      ctx.font = 'bold 26px sans-serif'
      lines(ctx, 118, 190, 30, ['Alloy', '60/40', 'DIA', '0.6mm'])
      ctx.font = '22px sans-serif'
      ctx.fillText('WC60B0BF', 116, 324)
      lines(ctx, 398, 190, 30, ['Flux Code', 'CF-10', 'Lot No.', '33041a'])
      // logo: chấm đỏ + chữ xanh
      ctx.fillStyle = red
      ctx.beginPath()
      ctx.arc(150, 372, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText('S', 150, 380)
      ctx.fillStyle = '#1c4aa8'
      ctx.font = 'bold italic 48px Arial, sans-serif'
      ctx.fillText('ASAHI', 252, 390)
      ctx.fillStyle = red
      ctx.font = 'bold 18px sans-serif'
      ctx.fillText('SOLDER', 300, 410)
      ctx.fillStyle = ink
      ctx.font = 'bold 32px sans-serif'
      ctx.fillText('NET WT 250GM', 256, 448)
      ctx.font = '18px sans-serif'
      ctx.fillText('MADE IN CHINA', 256, 476)
    },
  },
  noname: {
    flange: '#9da1a4',
    draw: (ctx) => {
      // giấy in đen trắng, chữ dán lệch, vết bẩn
      ctx.fillStyle = '#ece9df'
      ctx.fillRect(0, 0, 512, 512)
      circle(ctx, 246, 4, '#2b2b2b')
      ctx.fillStyle = '#1e1e1e'
      ctx.textAlign = 'center'
      ctx.save()
      ctx.translate(256, 256)
      ctx.rotate(-0.06)
      ctx.font = 'bold 66px Impact, Arial Black, sans-serif'
      ctx.fillText('No name', 0, -120)
      ctx.font = 'bold 28px sans-serif'
      ctx.fillText('SOLDER WIRE', 0, -82)
      ctx.font = '26px sans-serif'
      ctx.fillText('Sn ?? / Pb ??', -150, 6)
      ctx.fillText('1.0mm', 150, 6)
      ctx.font = 'bold 30px sans-serif'
      ctx.fillText('HIGH QUALITY !!!', 0, 128)
      ctx.font = '20px sans-serif'
      ctx.fillText('NET WT: 50G', 0, 162)
      ctx.restore()
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#5a4a2a'
      for (const [x, y, r] of [
        [120, 400, 26],
        [400, 140, 18],
        [330, 430, 12],
      ]) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    },
  },
}

const labelTextures = new Map<SpoolLabel, THREE.CanvasTexture>()

function labelTexture(label: SpoolLabel) {
  const cached = labelTextures.get(label)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  LABELS[label].draw(canvas.getContext('2d')!)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  labelTextures.set(label, texture)
  return texture
}

/** Stand and axle share dimensions with the mounted reel, avoiding intersecting flanges. */
export function createSpoolHolder() {
  const group = new THREE.Group()
  const frame = new THREE.MeshStandardMaterial({
    color: '#343e48',
    metalness: 0.45,
    roughness: 0.4,
  })
  const steel = new THREE.MeshStandardMaterial({
    color: '#aab1b7',
    metalness: 0.85,
    roughness: 0.26,
  })
  mesh(group, new THREE.BoxGeometry(2.25, 0.12, 1.6), frame, [0, 0.06, 0])
  for (const side of [-1, 1]) {
    mesh(group, new THREE.BoxGeometry(0.16, AXLE_HEIGHT, 0.42), frame, [
      side * 0.87,
      0.12 + AXLE_HEIGHT / 2,
      0,
    ])
    const cap = mesh(group, new THREE.CylinderGeometry(0.16, 0.16, 0.08, 32), steel, [
      side * 1.02,
      AXLE_HEIGHT,
      0,
    ])
    cap.rotation.z = Math.PI / 2
  }
  const axle = mesh(group, new THREE.CylinderGeometry(0.105, 0.105, 2.12, 32), steel, [
    0,
    AXLE_HEIGHT,
    0,
  ])
  axle.rotation.z = Math.PI / 2
  return group
}

/** A continuous helical winding and connected loose end, upright or on its axle. */
export function createSolderSpool(color: string, mounted = false, label?: SpoolLabel) {
  const group = new THREE.Group()
  const reel = new THREE.Group()
  reel.position.y = mounted ? AXLE_HEIGHT : HALF_WIDTH + 0.045
  if (mounted) reel.rotation.z = -Math.PI / 2
  group.add(reel)
  const plastic = new THREE.MeshStandardMaterial({
    color: label ? LABELS[label].flange : '#d6d8d7',
    roughness: 0.54,
  })
  // thiếc màu chì: bớt bóng kim loại kẻo phản chiếu môi trường thành trắng
  const metal = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.45 })
  for (const side of [-1, 1])
    mesh(reel, annulus(0.17, RIM, 0.045), plastic, [0, side * HALF_WIDTH, 0])
  if (label) {
    // nhãn dán 2 mặt ngoài vành cuộn (uv RingGeometry phủ ô vuông canvas, lỗ trục ở tâm)
    const sticker = new THREE.MeshStandardMaterial({
      map: labelTexture(label),
      roughness: 0.62,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
    for (const side of [-1, 1]) {
      const face = mesh(reel, new THREE.RingGeometry(0.19, 0.99, 64), sticker, [
        0,
        side * (HALF_WIDTH + 0.046),
        0,
      ])
      face.rotation.x = -side * (Math.PI / 2)
    }
  }
  // lõi dưới các vòng thiếc cùng màu chì (kẽ giữa các vòng không lộ nhựa trắng)
  mesh(reel, annulus(0.17, 0.81, HALF_WIDTH), metal)

  const points: THREE.Vector3[] = []
  const turns = 18,
    samples = turns * 48
  for (let i = 0; i <= samples; i++) {
    const t = i / samples,
      angle = t * turns * Math.PI * 2
    const p = new THREE.Vector3(0.86 * Math.cos(angle), -0.55 + t * 1.1, 0.86 * Math.sin(angle))
    p.applyEuler(reel.rotation).add(reel.position)
    points.push(p)
  }
  // Continue tangentially from the final winding; no detached wire segment.
  if (mounted) {
    points.push(
      new THREE.Vector3(0.55, 0.49, 0.3),
      new THREE.Vector3(0.55, 0.32, 0.85),
      new THREE.Vector3(0.55, 0.07, 1.45),
      new THREE.Vector3(0.2, 0.07, 1.9),
      new THREE.Vector3(-0.15, 0.07, 2.35),
    )
    group.add(createSpoolHolder())
  } else {
    points.push(
      new THREE.Vector3(0.86, 1.2, 0.24),
      new THREE.Vector3(1.04, 1.08, 0.45),
      new THREE.Vector3(1.16, 0.75, 0.5),
    )
  }
  const winding = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  mesh(group, new THREE.TubeGeometry(winding, samples * 2, WIRE_RADIUS, 8, false), metal)
  return group
}
