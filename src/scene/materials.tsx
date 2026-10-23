import * as THREE from 'three'
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

let wood: THREE.CanvasTexture | undefined
const woodTexture = () =>
  (wood ??= canvasTexture(512, (g, s) => {
    for (let y = 0; y < s; y++) {
      const ring =
        Math.sin(y * 0.09 + Math.sin(y * 0.011) * 7 + Math.sin(y * 0.031) * 2) * 0.5 + 0.5
      const v = 0.72 + ring * 0.28
      g.fillStyle = `rgb(${(v * 255) | 0},${(v * 242) | 0},${(v * 228) | 0})`
      g.fillRect(0, y, s, 1)
    }
    // thớ gỗ nhỏ
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(60,35,15,${Math.random() * 0.08})`
      g.fillRect(Math.random() * s, Math.random() * s, 20 + Math.random() * 60, 1)
    }
  }))

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
}: {
  material: string
  color: string
  hover?: boolean
}) {
  const hex = CASE_COLORS[color].hex
  const emissive = hover ? '#554400' : '#000000'
  switch (material) {
    case 'anod':
      return (
        <meshStandardMaterial color={hex} emissive={emissive} metalness={0.75} roughness={0.32} />
      )
    case 'ecoat':
      return (
        <meshStandardMaterial
          color={hex}
          emissive={emissive}
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
          transmission={0.95}
          roughness={0.06}
          thickness={0.4}
          ior={1.49}
          transparent
          opacity={color === 'smoke' ? 0.85 : 0.6}
        />
      )
    case 'wood':
      return (
        <meshStandardMaterial color={hex} emissive={emissive} map={woodTexture()} roughness={0.7} />
      )
    default:
      return <meshStandardMaterial color={hex} emissive={emissive} roughness={0.55} />
  }
}
