import { useMemo } from 'react'
import * as THREE from 'three'
import { Y, stabSpan } from '@/data/steps'
import type { Key } from '@/types'
import { boardOutline } from './boardOutline'

/** foam Poron dày ~2mm (u), nằm trên mặt PCB, dưới plate */
const FOAM_T = 0.1
/** viền foam giữa 2 lỗ cạnh nhau (u) */
const WEB = 0.2
const COLOR = '#25262b'

/**
 * Tấm foam Poron đen giữa PCB và plate, kiểu tấm cắt sẵn theo layout: mỗi phím 1 lỗ vuông gần bằng phím,
 * phím dài (Shift, Enter, Backspace...) 1 lỗ dài liền; spacebar để liền tấm, chỉ khoét lỗ switch giữa
 * + 2 khe stab. Hình 2D trên mặt xz rồi đùn lên theo y (như plate)
 */
function foamGeometry(keys: Key[], width: number, depth: number, outline?: [number, number][]) {
  const { shapes, shapeOf } = boardOutline(keys, width, depth, 0.03, outline)
  // trục y của hình = -z của cảnh (do xoay -90° quanh x)
  const rect = (shape: THREE.Shape, x: number, z: number, hx: number, hz: number, rot: number) => {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const pt = (dx: number, dz: number): [number, number] => [
      x + dx * c + dz * s,
      -(z - dx * s + dz * c),
    ]
    const hole = new THREE.Path()
    hole.moveTo(...pt(-hx, -hz))
    hole.lineTo(...pt(-hx, hz))
    hole.lineTo(...pt(hx, hz))
    hole.lineTo(...pt(hx, -hz))
    hole.closePath()
    shape.holes.push(hole)
  }
  for (const k of keys) {
    const shape = shapeOf(k)
    if (k.w < 4) {
      rect(shape, k.cx, k.cz, (k.w - WEB) / 2, (k.h - WEB) / 2, k.rot)
      continue
    }
    // spacebar: lỗ switch giữa + 2 khe stab hai bên
    rect(shape, k.cx, k.cz, (1 - WEB) / 2, (1 - WEB) / 2, k.rot)
    const s = stabSpan(k)
    for (const side of [-1, 1]) {
      const x = k.cx + side * s * Math.cos(k.rot)
      const z = k.cz - side * s * Math.sin(k.rot)
      rect(shape, x, z, 0.22, (1 - WEB) / 2, k.rot)
    }
  }
  return new THREE.ExtrudeGeometry(shapes, { depth: FOAM_T, bevelEnabled: false }).rotateX(
    -Math.PI / 2,
  )
}

/** Foam PCB: đã lót thì nằm trên mặt PCB; `ghost` = tấm chờ lót, lơ lửng mờ phía trên */
export function PcbFoam({
  keys,
  width,
  depth,
  outline,
  ghost = false,
}: {
  keys: Key[]
  width: number
  depth: number
  outline?: [number, number][]
  ghost?: boolean
}) {
  const geo = useMemo(
    () => foamGeometry(keys, width, depth, outline),
    [keys, width, depth, outline],
  )
  return (
    <mesh
      geometry={geo}
      position-y={ghost ? 1 : Y.pcbTop + 0.002}
      castShadow={!ghost}
      receiveShadow
    >
      <meshStandardMaterial
        color={COLOR}
        roughness={0.95}
        transparent={ghost}
        opacity={ghost ? 0.55 : 1}
      />
    </mesh>
  )
}
