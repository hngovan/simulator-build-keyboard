import { useEffect, useState } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Tranh treo tường vẽ bằng canvas (dùng chung cho các tranh tự vẽ) / tranh từ ảnh: khung + viền giấy + mặt tranh.
// Đơn vị mét; gốc = tâm tranh, mặt quay +z. Chữ ký viết tay dùng font Caveat (OFL, đã dùng cho chữ khắc bàn)

const SIGN_FONT = '/fonts/Caveat.ttf'
/** font chữ ký: vẽ ngay bằng font dự phòng, tải xong font viết tay thì vẽ lại */
const SIGN_FAMILY = 'KeebSign'

/** vẽ tranh lên canvas px × py; sign = tên font chữ ký */
export type PaintFn = (g: CanvasRenderingContext2D, px: number, py: number, sign: string) => void

function paint(draw: PaintFn, px: number, py: number, sign: string) {
  const c = document.createElement('canvas')
  c.width = px
  c.height = py
  draw(c.getContext('2d')!, px, py, sign)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** chữ ký viết tay góc phải dưới */
export function signature(
  g: CanvasRenderingContext2D,
  px: number,
  py: number,
  sign: string,
  color: string,
) {
  g.fillStyle = color
  g.font = `${Math.round(px * 0.11)}px ${sign}`
  g.textAlign = 'right'
  g.save()
  g.translate(px - px * 0.05, py - py * 0.04)
  g.rotate(-0.08)
  g.fillText('keeb', 0, 0)
  g.restore()
}

type FrameProps = {
  /** cỡ mặt tranh (m) */
  w: number
  h: number
  /** màu khung; metal = khung mạ (vàng / đồng) */
  frame?: string
  metal?: boolean
  /** bề rộng viền giấy (0 = tranh tràn khung) */
  mat?: number
} & JSX.IntrinsicElements['group']

/** khung + viền giấy + mặt tranh `tex` (dùng chung cho tranh vẽ canvas / tranh ảnh) */
function FramedArt({
  tex,
  w,
  h,
  frame = '#4a2f1d',
  metal = false,
  mat = 0.04,
  ...props
}: FrameProps & { tex: THREE.Texture }) {
  const fw = 0.035
  return (
    <group {...props}>
      {(
        [
          [0, h / 2 + mat + fw / 2, w + 2 * (mat + fw), fw],
          [0, -h / 2 - mat - fw / 2, w + 2 * (mat + fw), fw],
          [-w / 2 - mat - fw / 2, 0, fw, h + 2 * mat],
          [w / 2 + mat + fw / 2, 0, fw, h + 2 * mat],
        ] as const
      ).map(([x, y, fwid, fh], i) => (
        <mesh key={i} position={[x, y, 0.015]} castShadow>
          <boxGeometry args={[fwid, fh, 0.03]} />
          <meshStandardMaterial
            color={frame}
            roughness={metal ? 0.3 : 0.5}
            metalness={metal ? 0.8 : 0}
          />
        </mesh>
      ))}
      {mat > 0 && (
        <mesh position-z={0.006}>
          <planeGeometry args={[w + 2 * mat, h + 2 * mat]} />
          <meshStandardMaterial color="#efe8d8" roughness={0.9} />
        </mesh>
      )}
      <mesh position-z={0.008}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  )
}

export function CanvasPainting({
  draw,
  px,
  py,
  ...props
}: {
  draw: PaintFn
  /** cỡ canvas (px) */
  px: number
  py: number
} & FrameProps) {
  const [tex, setTex] = useState(() => paint(draw, px, py, 'cursive'))
  useEffect(() => {
    let alive = true
    new FontFace(SIGN_FAMILY, `url(${SIGN_FONT})`)
      .load()
      .then((f) => {
        if (!alive) return
        document.fonts.add(f)
        setTex(paint(draw, px, py, SIGN_FAMILY))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [draw, px, py])
  useEffect(() => () => tex.dispose(), [tex])
  return <FramedArt tex={tex} {...props} />
}

/** tranh in từ file ảnh (`public/textures/posters/`), khung như tranh vẽ canvas */
export function ImagePainting({ url, ...props }: { url: string } & FrameProps) {
  const tex = useTexture(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
  })
  return <FramedArt tex={tex} {...props} />
}
