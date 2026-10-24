import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CASE_COLORS } from '@/data/parts'

// Texture vẽ bằng canvas để không cần file ảnh
function canvasTexture(
  size: number,
  draw: (g: CanvasRenderingContext2D, size: number) => void,
  srgb = true,
) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Kim loại phần tạ / badge case CAD: tô khác màu case cho dễ nhận ra */
export const WEIGHT_METALS = {
  brass: { color: '#c9a24a', metalness: 1, roughness: 0.28 },
  steel: { color: '#d7dbe0', metalness: 1, roughness: 0.18 },
  copper: { color: '#c47a4f', metalness: 1, roughness: 0.26 },
  gold: { color: '#e3b341', metalness: 1, roughness: 0.22 },
} as const

// Vân gỗ thật (Poly Haven, CC0, `bun run fetch:room`): gỗ sồi / gỗ óc chó. Màu lấy từ ảnh, không nhân màu case
const TEX = '/textures/room'
export const WOOD_TEX: Record<string, { map: string; normalMap: string; roughnessMap: string }> = {
  oak: {
    map: `${TEX}/oak_veneer_01_diff_1k.jpg`,
    normalMap: `${TEX}/oak_veneer_01_nor_gl_1k.jpg`,
    roughnessMap: `${TEX}/oak_veneer_01_rough_1k.jpg`,
  },
  walnut: {
    map: `${TEX}/walnut_veneer_diff_1k.jpg`,
    normalMap: `${TEX}/walnut_veneer_nor_gl_1k.jpg`,
    roughnessMap: `${TEX}/walnut_veneer_rough_1k.jpg`,
  },
}
/** bộ vân gỗ theo màu case (màu khác gỗ thì dùng vân sồi) */
/** vân gỗ theo màu: gỗ hồng mộc mượn vân óc chó, còn lại mượn vân sồi (rồi nhân màu case) */
export const woodTexFor = (color: string) =>
  WOOD_TEX[color] ?? (color === 'rosewood' ? WOOD_TEX.walnut : WOOD_TEX.oak)

/** Chuẩn hoá texture vân gỗ: lặp, màu sRGB cho ảnh màu */
export function prepWood(maps: Record<string, THREE.Texture>) {
  for (const [k, t] of Object.entries(maps)) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    if (k === 'map') t.colorSpace = THREE.SRGBColorSpace
  }
  return maps
}

/** UV theo kích thước thật: thớ chạy dọc cạnh dài, không kéo giãn trên mặt hẹp. */
export function woodBoxGeometry(w: number, h: number, d: number, radius = 0) {
  const geo = radius ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d)
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  const uv = geo.getAttribute('uv')
  const tile = 22 // ~0.42 m cho mỗi ảnh 1K (1u = 19.05 mm)
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i))
    const ny = Math.abs(nor.getY(i))
    const nz = Math.abs(nor.getZ(i))
    if (ny >= nx && ny >= nz) uv.setXY(i, 0.5 + pos.getZ(i) / tile, 0.5 + pos.getX(i) / tile)
    else if (nz >= nx) uv.setXY(i, 0.5 + pos.getY(i) / tile, 0.5 + pos.getX(i) / tile)
    else uv.setXY(i, 0.5 + pos.getY(i) / tile, 0.5 + pos.getZ(i) / tile)
  }
  uv.needsUpdate = true
  return geo
}

/** Vật liệu gỗ thật: vân màu + vân nổi + độ nhám từ ảnh quét */
function WoodMaterial({
  color,
  emissive,
  side = THREE.FrontSide,
}: {
  color: string
  emissive: string
  side?: THREE.Side
}) {
  const maps = prepWood(useTexture(woodTexFor(color)))
  return (
    <meshStandardMaterial
      {...maps}
      color={WOOD_TEX[color] ? '#ffffff' : CASE_COLORS[color].hex}
      emissive={emissive}
      side={side}
    />
  )
}

let grain: THREE.CanvasTexture | undefined
const grainTexture = () =>
  (grain ??= canvasTexture(
    256,
    (g, s) => {
      const img = g.createImageData(s, s)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 110 + Math.random() * 145
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = 255
      }
      g.putImageData(img, 0, 0)
    },
    false,
  ))

// Vật liệu cho case theo chất liệu + màu
export function CaseMaterial({
  material,
  color,
  hover,
  doubleSide,
}: {
  material: string
  color: string
  hover?: boolean
  /** model case CAD (STL in 3D) có mặt lật chiều: vẽ cả 2 mặt cho khỏi thủng / trong suốt */
  doubleSide?: boolean
}) {
  const hex = CASE_COLORS[color].hex
  const side = doubleSide ? THREE.DoubleSide : THREE.FrontSide
  const emissive = hover ? '#554400' : '#000000'
  switch (material) {
    case 'anod':
      return (
        <meshStandardMaterial
          color={hex}
          emissive={emissive}
          side={side}
          metalness={0.75}
          roughness={0.32}
        />
      )
    case 'ecoat':
      return (
        <meshStandardMaterial
          color={hex}
          emissive={emissive}
          side={side}
          metalness={0.25}
          roughness={0.9}
          bumpMap={grainTexture()}
          bumpScale={1.2}
        />
      )
    case 'pc':
      return (
        <meshPhysicalMaterial
          color={hex}
          emissive={emissive}
          side={side}
          transmission={0.75}
          roughness={0.55}
          thickness={0.6}
          ior={1.58}
          transparent
          opacity={0.95}
        />
      )
    case 'acrylic':
    case 'mica':
      return (
        <meshPhysicalMaterial
          color={hex}
          emissive={emissive}
          side={side}
          transmission={0.95}
          roughness={0.06}
          thickness={0.4}
          ior={1.49}
          transparent
          opacity={color === 'smoke' ? 0.85 : 0.6}
        />
      )
    case 'wood':
      return <WoodMaterial color={color} emissive={emissive} side={side} />
    default:
      return <meshStandardMaterial color={hex} emissive={emissive} side={side} roughness={0.55} />
  }
}
