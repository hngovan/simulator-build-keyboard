import { useMemo } from 'react'
import * as THREE from 'three'
import polygonClipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping'
import { Y, stabSpan } from '@/data/steps'
import type { Key } from '@/types'
import { boardOutline } from './boardOutline'

/** foam Poron lấp kín khe PCB – plate (~3,3mm): mặt dưới plate tì sát mặt foam */
const FOAM_T = Y.plateBot - Y.pcbTop - 0.004
/** viền foam giữa 2 lỗ cạnh nhau (u) */
const WEB = 0.2
const COLOR = '#25262b'

/**
 * Tấm foam Poron đen giữa PCB và plate, kiểu tấm cắt sẵn theo layout: mỗi phím 1 lỗ vuông gần bằng phím,
 * phím dài (Shift, Enter, Backspace...) 1 lỗ dài liền; spacebar để liền tấm, chỉ khoét lỗ switch giữa
 * + 2 khe stab. Hình 2D trên mặt xz rồi đùn lên theo y (như plate)
 */
function foamGeometry(keys: Key[], width: number, depth: number, outline?: [number, number][]) {
  const { shapes } = boardOutline(keys, width, depth, 0.03, outline)
  // trục y của hình = -z của cảnh (do xoay -90° quanh x)
  const ring = (pts: [number, number][]): Ring => [...pts, pts[0]]
  const holes: Polygon[] = []
  const rect = (x: number, z: number, hx: number, hz: number, rot: number) => {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const pt = (dx: number, dz: number): [number, number] => [
      x + dx * c + dz * s,
      -(z - dx * s + dz * c),
    ]
    holes.push([ring([pt(-hx, -hz), pt(hx, -hz), pt(hx, hz), pt(-hx, hz)])])
  }
  for (const k of keys) {
    if (k.w < 4) {
      rect(k.cx, k.cz, (k.w - WEB) / 2, (k.h - WEB) / 2, k.rot)
      continue
    }
    // spacebar: lỗ switch giữa + 2 khe stab hai bên
    rect(k.cx, k.cz, (1 - WEB) / 2, (1 - WEB) / 2, k.rot)
    const sp = stabSpan(k)
    for (const side of [-1, 1]) {
      const x = k.cx + side * sp * Math.cos(k.rot)
      const z = k.cz - side * sp * Math.sin(k.rot)
      rect(x, z, 0.22, (1 - WEB) / 2, k.rot)
    }
  }
  // viền tấm trừ đi các lỗ phím (polygon-clipping): lỗ nào lấn ra mép viền (góc Alice...) thành rãnh khoét vào mép,
  // không để lỗ chồng ra ngoài hình (tam giác hoá vỡ thành mảnh tam giác)
  const plates = shapes.map((sh): Polygon => [
    ring(sh.getPoints(24).map((v): [number, number] => [v.x, v.y])),
  ])
  const cut = polygonClipping.difference(plates as MultiPolygon, ...holes)
  const out = cut.map(([outer, ...inner]) => {
    const shape = new THREE.Shape(outer.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y)))
    for (const h of inner)
      shape.holes.push(new THREE.Path(h.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y))))
    return shape
  })
  return new THREE.ExtrudeGeometry(out, { depth: FOAM_T, bevelEnabled: false }).rotateX(
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
