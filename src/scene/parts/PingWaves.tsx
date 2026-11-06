import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCtx } from '@/store'
import { keyBounds } from '@/data/ping'
import { CASE_MARGIN, CASE_WALL } from '@/data/steps'
import { usePingWaves, WAVE_MS, type PingWave } from '../common/pingWaves'

/** số cung sóng mỗi đợt (như icon wifi), bán kính cung trong / ngoài (u) */
const ARCS = 3
const R0 = 0.35
const R_STEP = 0.32
/** nửa góc mở của cung (rad) */
const SPREAD = 0.75
/** độ cao vẽ sóng (u, hệ board): ngang đỉnh keycap */
const WAVE_Y = 1.05
const COLOR = '#ffcf3f'

/** dải cung răng cưa (nhiễu): bán kính lệch ngẫu nhiên từng đoạn, nằm trong mặt XZ quanh trục +x */
function jaggedArc(r: number, width: number) {
  const seg = 18
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= seg; i++) {
    const a = -SPREAD + (2 * SPREAD * i) / seg
    const rr = r + (Math.random() - 0.5) * 0.09
    const c = Math.cos(a)
    const s = Math.sin(a)
    pos.push(
      c * (rr - width / 2),
      0,
      s * (rr - width / 2),
      c * (rr + width / 2),
      0,
      s * (rr + width / 2),
    )
    if (i) {
      const k = i * 2
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return g
}

/** 1 đợt sóng ở góc: các cung lần lượt loé lên từ trong ra ngoài rồi tắt, chập chờn như sóng nhiễu */
function Wave({ wave, x, z }: { wave: PingWave; x: number; z: number }) {
  const geos = useMemo(
    () => Array.from({ length: ARCS }, (_, i) => jaggedArc(R0 + i * R_STEP, 0.07)),
    [],
  )
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos])
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const group = useRef<THREE.Group>(null)
  const dx = wave.corner % 2 ? 1 : -1
  const dz = wave.corner >= 2 ? 1 : -1
  useFrame(() => {
    const age = (performance.now() - wave.at) / WAVE_MS
    mats.current.forEach((m, i) => {
      if (!m) return
      const t = Math.min(1, Math.max(0, age * 1.7 - i * 0.28))
      // nhiễu: chớp tắt ngẫu nhiên
      m.opacity =
        Math.sin(Math.PI * t) * (0.55 + Math.random() * 0.45) * (0.5 + wave.strength * 0.5)
    })
    // rung nhẹ quanh góc
    group.current?.position.set(
      x + (Math.random() - 0.5) * 0.03,
      WAVE_Y,
      z + (Math.random() - 0.5) * 0.03,
    )
  })
  return (
    <group ref={group} position={[x, WAVE_Y, z]} rotation-y={Math.atan2(-dz, dx)}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} renderOrder={20}>
          <meshBasicMaterial
            ref={(m) => {
              mats.current[i] = m
            }}
            color={COLOR}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Sóng âm vang góc case ở bước test (`pingKey`): vẽ ở góc ngoài vách case, hệ toạ độ board */
export function PingWaves() {
  const ctx = useCtx()
  const waves = usePingWaves((w) => w.waves)
  const b = useMemo(() => keyBounds(ctx.keys), [ctx.keys])
  if (!waves.length) return null
  const off = CASE_MARGIN + CASE_WALL * 0.6
  return (
    <>
      {waves.map((w) => (
        <Wave
          key={w.id}
          wave={w}
          x={w.corner % 2 ? b.x1 + off : b.x0 - off}
          z={w.corner >= 2 ? b.z1 + off : b.z0 - off}
        />
      ))}
    </>
  )
}
