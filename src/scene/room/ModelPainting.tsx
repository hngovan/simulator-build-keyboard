import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { PaintFn } from './CanvasPainting'

// Khung tranh model Poly Haven (CC0) treo tường, mặt tranh quay +z, lưng ở z = 0. Có `draw` thì thay tranh gốc bằng
// tranh vẽ canvas: UV vùng tranh trong file không phủ 0..1 nên đặt lại UV theo khung bao của mặt tranh.
// Đơn vị mét (cha nhân M)

const DIR = '/models/room'
export const FRAMES = {
  hanging01: `${DIR}/hanging_picture_frame_01.glb`,
  hanging02: `${DIR}/hanging_picture_frame_02.glb`,
  hanging03: `${DIR}/hanging_picture_frame_03.glb`,
  fancy01: `${DIR}/fancy_picture_frame_01.glb`,
  fancy02: `${DIR}/fancy_picture_frame_02.glb`,
}
Object.values(FRAMES).forEach((url) => useGLTF.preload(url))

/** mặt tranh trong file: material tên có "artwork" / "canvas" */
const isArt = (m: THREE.Mesh) => {
  const mat = m.material as THREE.Material
  return /artwork|canvas/.test(mat?.name ?? '')
}

function paint(draw: PaintFn, px: number, py: number) {
  const c = document.createElement('canvas')
  c.width = px
  c.height = py
  draw(c.getContext('2d')!, px, py, 'cursive')
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function ModelPainting({
  frame,
  draw,
  px = 400,
  py = 512,
  ...props
}: {
  frame: keyof typeof FRAMES
  draw?: PaintFn
  px?: number
  py?: number
} & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(FRAMES[frame])
  // chữ ký dùng font Caveat: chờ font tải xong mới vẽ (font dự phòng trước)
  const [font, setFont] = useState(0)
  useEffect(() => {
    if (!draw) return
    let alive = true
    new FontFace('KeebSign', 'url(/fonts/Caveat.ttf)')
      .load()
      .then((f) => {
        document.fonts.add(f)
        if (alive) setFont(1)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [draw])
  const tex = useMemo(
    () => draw && paint((g, w, h) => draw(g, w, h, font ? 'KeebSign' : 'cursive'), px, py),
    [draw, px, py, font],
  )
  useEffect(() => () => tex?.dispose(), [tex])
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = m.receiveShadow = true
      if (!tex || !isArt(m)) return
      // UV mới 0..1 theo khung bao x / y của mặt tranh (hệ của mesh)
      const g = m.geometry.clone()
      g.computeBoundingBox()
      const b = g.boundingBox!
      const pos = g.getAttribute('position')
      const uv = new Float32Array(pos.count * 2)
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) - b.min.x) / (b.max.x - b.min.x || 1)
        uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / (b.max.y - b.min.y || 1)
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
      m.geometry = g
      m.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 })
    })
    return copy
  }, [scene, tex])
  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
