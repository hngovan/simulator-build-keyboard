import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import polygonClipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping'
import { CASE_MARGIN, DTB_MM, TRAY_HOLE, Y, caseFloorTop, stabSpan } from '@/data/steps'
import { MM as MM_U } from '../models/Switch'
import { useCtx } from '@/store'
import { blockerGaps } from '@/data/layouts'
import type { Key, Point } from '@/types'
import { boardOutline } from './boardOutline'
import { ringPosts } from './ringPosts'
import { absRibs, batteryKeepout, ribSegBox, wallRibBox } from './absRibs'

/** foam Poron lấp kín khe PCB – plate (~3,3mm): mặt dưới plate tì sát mặt foam */
const FOAM_T = Y.plateBot - Y.pcbTop - 0.004
/** viền foam giữa 2 lỗ cạnh nhau (u) */
const WEB = 0.2
const COLOR = '#25262b'

/**
 * Tấm foam Poron đen giữa PCB và plate, kiểu tấm cắt sẵn theo layout: mỗi phím 1 lỗ vuông gần bằng phím,
 * phím dài (Shift, Enter, Backspace...) 1 lỗ dài liền; spacebar (kể cả split space) để liền tấm, chỉ khoét lỗ switch giữa
 * + 2 khe stab, lỗ tròn cho vít tray mount lọt xuống PCB; khe trống của layout (WKL chỗ phím Win, khe hàng...) cũng khoét: plate đa layout
 * (Duality) có lỗ ở đó, foam liền thì nhìn qua lỗ thấy ô đen thay vì PCB; plate dựng bằng code liền chỗ đó nên vẫn che kín.
 * Hình 2D trên mặt xz rồi đùn lên theo y (như plate)
 */
function foamGeometry(
  keys: Key[],
  width: number,
  depth: number,
  outline?: [number, number][],
  trayHoles: Point[] = [],
  /** case nhựa 2 mảnh: trụ / vấu nhựa sát vách lấn vào → khoét tròn bán kính r */
  bossHoles: (Point & { r: number })[] = [],
) {
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
    // spacebar (phím stab không nhãn: space dài, split space 2.25u / 2.75u 40%, space Alice / Planck) khoét kiểu spacebar,
    // phím dài có nhãn (Shift, Enter, Backspace...) 1 lỗ liền
    if (!(k.stab && !k.label.trim())) {
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
  // khe trống của layout (cùng chỗ khối chặn liền case `blockerGaps`), chừa viền như lỗ phím
  for (const g of blockerGaps(keys, width, depth, CASE_MARGIN + 0.05))
    if (g.w > WEB && g.d > WEB) rect(g.x, g.z, (g.w - WEB) / 2, (g.d - WEB) / 2, 0)
  // vít tray: lỗ tròn như lỗ plate (không thì foam che mất đầu ốc tì mặt PCB)
  for (const { x, z, r } of bossHoles)
    holes.push([
      ring(
        Array.from({ length: 24 }, (_, i): [number, number] => {
          const a = (i / 24) * Math.PI * 2
          return [x + Math.cos(a) * r, -(z + Math.sin(a) * r)]
        }),
      ),
    ])
  for (const { x, z } of trayHoles)
    holes.push([
      ring(
        Array.from({ length: 24 }, (_, i): [number, number] => {
          const a = (i / 24) * Math.PI * 2
          return [x + Math.cos(a) * TRAY_HOLE.plate, -(z + Math.sin(a) * TRAY_HOLE.plate)]
        }),
      ),
    ])
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
  trayHoles,
  bossHoles,
  ghost = false,
}: {
  keys: Key[]
  width: number
  depth: number
  outline?: [number, number][]
  /** lỗ vít tray mount */
  trayHoles?: Point[]
  /** case nhựa 2 mảnh: trụ / vấu nhựa sát vách */
  bossHoles?: (Point & { r: number })[]
  ghost?: boolean
}) {
  const geo = useMemo(
    () => foamGeometry(keys, width, depth, outline, trayHoles, bossHoles),
    [keys, width, depth, outline, trayHoles, bossHoles],
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

/** foam đáy case dày 2,5mm (u): mặt trên còn cách socket hotswap / chân hàn dưới PCB, không cấn */
export const CASE_FOAM_T = 2.5 * MM_U
/** khe chừa quanh trụ tray / DTB (u) */
const CASE_FOAM_GAP = 0.06

/**
 * Tấm foam Poron đen lót đáy case (case dựng bằng code): phủ lòng case theo viền board, khoét lỗ tròn quanh trụ tray mount,
 * ô chữ nhật quanh daughterboard (dư phía trước cho đầu cắm + dây JST), khe khối chặn liền case. `ghost` = tấm chờ lót lơ lửng mờ
 */
export function CaseFoam({ ghost = false, hover = false }: { ghost?: boolean; hover?: boolean }) {
  const ctx = useCtx()
  const geo = useMemo(() => {
    const { keys, width, depth, outline, dtb } = ctx
    const { shapes } = boardOutline(keys, width, depth, -CASE_MARGIN + 0.02, outline)
    const ring = (pts: [number, number][]): Ring => [...pts, pts[0]]
    const holes: Polygon[] = []
    const box = (x0: number, x1: number, z0: number, z1: number) =>
      holes.push([
        ring([
          [x0, -z0],
          [x1, -z0],
          [x1, -z1],
          [x0, -z1],
        ]),
      ])
    if (ctx.mount === 'tray')
      for (const { x, z } of ctx.screws.trayScrew)
        holes.push([
          ring(
            Array.from({ length: 20 }, (_, i): [number, number] => {
              const a = (i / 20) * Math.PI * 2
              const r = 0.1 + CASE_FOAM_GAP
              return [x + Math.cos(a) * r, -(z + Math.sin(a) * r)]
            }),
          ),
        ])
    if (dtb) {
      // DTB: mạch rộng w, sâu d (mm) quanh tâm; phía trước chừa chỗ đầu cắm JST + dây ra
      const hw = (DTB_MM.w / 2) * MM_U + CASE_FOAM_GAP
      const hd = (DTB_MM.d / 2) * MM_U
      box(dtb.x - hw, dtb.x + hw, dtb.z - hd - 0.15, dtb.z + hd + 0.35)
    }
    // hốc pin + dải dây pin: foam khoét trống (pin nằm thẳng trên sàn / trong hốc)
    if (ctx.battery)
      for (const [x0, x1, z0, z1] of batteryKeepout(ctx.battery))
        box(x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02)
    // trụ đỡ O-ring liền vách (case 1 mảnh): khoét chân trụ (khối chạm sàn)
    for (const p of ringPosts(ctx)) {
      const r = p.r + 0.02
      box(p.x - r, p.x + r, p.z - r, p.z + r)
    }
    // case nhựa: khung xương cá cao hơn foam → khoét rãnh theo gân sàn + gân đứng tựa vách
    const ribs = absRibs(ctx)
    for (const [x0, x1, z0, z1] of [...ribs.segs.map(ribSegBox), ...ribs.walls.map(wallRibBox)])
      box(x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02)
    for (const g of blockerGaps(keys, width, depth, CASE_MARGIN + 0.05))
      box(g.x - g.w / 2 - 0.02, g.x + g.w / 2 + 0.02, g.z - g.d / 2 - 0.02, g.z + g.d / 2 + 0.02)
    const plates = shapes.map((sh): Polygon => [
      ring(sh.getPoints(24).map((v): [number, number] => [v.x, v.y])),
    ])
    const cut = holes.length
      ? polygonClipping.difference(plates as MultiPolygon, ...holes)
      : (plates as MultiPolygon)
    const out = cut.map(([outer, ...inner]) => {
      const shape = new THREE.Shape(outer.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y)))
      for (const h of inner)
        shape.holes.push(new THREE.Path(h.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y))))
      return shape
    })
    return new THREE.ExtrudeGeometry(out, { depth: CASE_FOAM_T, bevelEnabled: false }).rotateX(
      -Math.PI / 2,
    )
  }, [ctx])
  useEffect(() => () => geo.dispose(), [geo])
  const floor = ctx.dtb?.floor ?? caseFloorTop(ctx.caseDef)
  return (
    <mesh
      geometry={geo}
      position-y={ghost ? floor + 0.9 : floor + 0.001}
      castShadow={!ghost}
      receiveShadow
    >
      <meshStandardMaterial
        color={COLOR}
        roughness={0.95}
        transparent={ghost}
        opacity={ghost ? (hover ? 0.8 : 0.55) : 1}
        emissive={hover ? '#3ddc84' : '#000000'}
        emissiveIntensity={hover ? 0.35 : 0}
      />
    </mesh>
  )
}
