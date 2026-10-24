import { useEffect, useMemo } from 'react'
import { CanvasTexture, DoubleSide, Path, SRGBColorSpace, Vector2 } from 'three'
import { Y } from '@/data/steps'
import type { Key, Point } from '@/types'
import { boardOutline, outlinePlane, outlineSlab, pointInPolygon } from './boardOutline'

interface PcbSurfaceProps {
  width: number
  depth: number
  /** viền PCB thật (Alice) */
  outline?: [number, number][]
  keys: Key[]
  screwHoles: Point[]
  type: string
  hover: boolean
}

const SCALE = 96

export function makePcbTexture(
  width: number,
  depth: number,
  keys: Key[],
  dark: boolean,
  screwHoles: Point[] = [],
) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * SCALE)
  canvas.height = Math.ceil(depth * SCALE)
  const g = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height
  const px = (x: number) => (x + width / 2) * SCALE
  const py = (z: number) => (z + depth / 2) * SCALE

  g.fillStyle = dark ? '#101b22' : '#176047'
  g.fillRect(0, 0, w, h)

  // Lưới solder mask và đường viền của PCB.
  g.strokeStyle = dark ? '#1c3038' : '#247056'
  g.lineWidth = 1
  for (let x = 0; x < w; x += SCALE / 2) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, h)
    g.stroke()
  }
  for (let y = 0; y < h; y += SCALE / 2) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(w, y)
    g.stroke()
  }
  g.strokeStyle = dark ? '#7c938f' : '#9ac3aa'
  g.lineWidth = 2
  g.strokeRect(11, 11, w - 22, h - 22)
  g.globalAlpha = 0.45
  g.strokeRect(18, 18, w - 36, h - 36)
  g.globalAlpha = 1

  // Các bus của ma trận chạy theo hàng, nhánh nối đến từng footprint.
  const rows = [...new Set(keys.map((key) => key.y))]
  rows.forEach((row, index) => {
    const rowKeys = keys.filter((key) => key.y === row)
    if (!rowKeys.length) return
    const busY = py(rowKeys[0].cz + 0.39)
    g.strokeStyle = dark ? '#517368' : '#80aa83'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(px(rowKeys[0].cx), busY)
    g.lineTo(w - 26 - index * 4, busY)
    g.stroke()
    rowKeys.forEach((key) => {
      const x = px(key.cx)
      const y = py(key.cz)
      g.beginPath()
      g.moveTo(x + 20, y + 27)
      g.lineTo(x + 20, busY)
      g.stroke()
    })
  })

  // Footprint switch, 2 pad kim loại, lỗ xuyên và nhãn vị trí.
  keys.forEach((key, index) => {
    const x = px(key.cx)
    const y = py(key.cz)
    g.save()
    g.translate(x, y)
    g.rotate(-key.rot)
    g.translate(-x, -y)
    g.strokeStyle = dark ? '#a5bab3' : '#b8d2b8'
    g.lineWidth = 1.5
    g.strokeRect(x - 34, y - 34, 68, 68)
    g.strokeStyle = dark ? '#58746f' : '#8bb68f'
    g.beginPath()
    g.moveTo(x - 9, y)
    g.lineTo(x + 9, y)
    g.moveTo(x, y - 9)
    g.lineTo(x, y + 9)
    g.stroke()
    for (const dx of [-20, 20]) {
      g.fillStyle = '#c59b59'
      g.beginPath()
      g.arc(x + dx, y + 27, 5, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = dark ? '#101b22' : '#176047'
      g.beginPath()
      g.arc(x + dx, y + 27, 2, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = dark ? '#94ada7' : '#afc9ae'
    g.font = '12px monospace'
    g.fillText(`SW${String(index + 1).padStart(2, '0')}`, x - 32, y - 39)
    g.restore()
  })

  // Vias dọc viền và ký hiệu mạch điều khiển.
  for (let x = 34; x < w - 30; x += 33) {
    for (const y of [31, h - 31]) {
      g.strokeStyle = '#b79c67'
      g.lineWidth = 2
      g.beginPath()
      g.arc(x, y, 3, 0, Math.PI * 2)
      g.stroke()
    }
  }
  // Vòng đồng quanh lỗ bắt vít stab xuyên PCB.
  screwHoles.forEach(({ x, z }) => {
    const cx = px(x)
    const cy = py(z)
    g.fillStyle = '#c59b59'
    g.beginPath()
    g.arc(cx, cy, 7, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = dark ? '#101b22' : '#176047'
    g.beginPath()
    g.arc(cx, cy, 4, 0, Math.PI * 2)
    g.fill()
  })
  g.fillStyle = dark ? '#b0c6c0' : '#c4dbc4'
  g.font = 'bold 14px monospace'
  g.fillText(dark ? 'HOTSWAP  |  PCB REV.01' : 'SOLDER  |  PCB REV.01', 30, h - 47)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** PCB có dấu mạch, footprint và silkscreen theo layout hiện tại. */
export function PcbSurface({
  width,
  depth,
  outline,
  keys,
  screwHoles,
  type,
  hover,
}: PcbSurfaceProps) {
  const dark = type === 'hotswap'
  const texture = useMemo(
    () => makePcbTexture(width, depth, keys, dark, screwHoles),
    [width, depth, keys, screwHoles, dark],
  )
  useEffect(() => () => texture.dispose(), [texture])
  // thân + 2 mặt PCB theo đường viền layout (Alice: 2 nửa xoay), texture phủ khung width × depth
  const { body, face } = useMemo(() => {
    const { shapes } = boardOutline(keys, width, depth, 0, outline)
    // Khoét các lỗ vít stab qua cả mặt trên, thân PCB và mặt dưới.
    for (const { x, z } of screwHoles) {
      const point = new Vector2(x, -z)
      const shape = shapes.find((candidate) =>
        pointInPolygon(point, candidate.getPoints()),
      )
      if (!shape) continue
      const hole = new Path()
      hole.absarc(x, -z, 0.085, 0, Math.PI * 2, false)
      shape.holes.push(hole)
    }
    return {
      body: outlineSlab(shapes, Y.pcbBot, Y.pcbTop),
      face: outlinePlane(shapes, width, depth),
    }
  }, [keys, width, depth, outline, screwHoles])

  return (
    <group>
      <mesh geometry={body} receiveShadow castShadow>
        <meshStandardMaterial color={dark ? '#182229' : '#174f3e'} roughness={0.65} />
      </mesh>
      {[Y.pcbTop + 0.001, Y.pcbBot - 0.001].map((y) => (
        <mesh key={y} geometry={face} position-y={y}>
          <meshStandardMaterial map={texture} roughness={0.68} metalness={0.08} side={DoubleSide} />
        </mesh>
      ))}
      {hover && (
        <mesh geometry={face} position-y={Y.pcbTop + 0.003}>
          <meshBasicMaterial color="#6ae6ad" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
