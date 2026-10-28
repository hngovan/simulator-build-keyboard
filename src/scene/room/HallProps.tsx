import * as THREE from 'three'
import { RACK } from './roomLayout'

// Đồ hành lang dựng bằng code (theo ảnh mẫu người dùng): cửa gỗ 6 ô sơn xanh + nẹp + tay gạt + công tắc đèn,
// kệ sắt xanh 3 tầng để hàng giao tới. Đơn vị mét

const PAINT = new THREE.MeshStandardMaterial({ color: '#2f6f7e', roughness: 0.55 })
const PAINT_DARK = new THREE.MeshStandardMaterial({ color: '#255966', roughness: 0.6 })
const STEEL = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.3, metalness: 0.85 })
const PLATE = new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.5 })
const RACK_BLUE = new THREE.MeshStandardMaterial({
  color: '#2b78b8',
  roughness: 0.5,
  metalness: 0.4,
})
const BOARD = new THREE.MeshStandardMaterial({ color: '#b48a5a', roughness: 0.8 })

const DOOR_W = 0.86
const DOOR_H = 2.04
const DOOR_T = 0.045

/** 1 ô panel nổi trên mặt cửa: khung viền + mặt ô lõm vào */
function Panel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const r = 0.018
  return (
    <group position={[x, y, DOOR_T / 2]}>
      {/* viền gờ quanh ô */}
      {(
        [
          [0, h / 2 - r / 2, w, r],
          [0, -h / 2 + r / 2, w, r],
          [-w / 2 + r / 2, 0, r, h - 2 * r],
          [w / 2 - r / 2, 0, r, h - 2 * r],
        ] as const
      ).map(([px, py, pw, ph], i) => (
        <mesh key={i} position={[px, py, 0.004]} material={PAINT_DARK}>
          <boxGeometry args={[pw, ph, 0.008]} />
        </mesh>
      ))}
      {/* mặt ô nổi */}
      <mesh position-z={0.006} material={PAINT} castShadow>
        <boxGeometry args={[w - 2 * r - 0.012, h - 2 * r - 0.012, 0.012]} />
      </mesh>
    </group>
  )
}

/**
 * Cửa chính: gốc = chân cửa giữa bề ngang, sát mặt tường, mặt trong quay +z. 6 ô (2 cột × 3 hàng: 2 ô nhỏ trên,
 * 4 ô dài dưới), nẹp khung quanh cửa, bản lề trái, tay gạt phải, công tắc đèn trên tường bên tay nắm
 */
export function PanelDoor(props: JSX.IntrinsicElements['group']) {
  const cw = 0.3
  const cols = [-0.18, 0.18]
  const rows = [
    { y: 1.68, h: 0.42 },
    { y: 1.1, h: 0.62 },
    { y: 0.42, h: 0.62 },
  ]
  return (
    <group {...props}>
      {/* cánh cửa */}
      <mesh position={[0, DOOR_H / 2, 0]} material={PAINT} castShadow receiveShadow>
        <boxGeometry args={[DOOR_W, DOOR_H, DOOR_T]} />
      </mesh>
      {cols.flatMap((x) =>
        rows.map((r) => <Panel key={`${x}:${r.y}`} x={x} y={r.y} w={cw} h={r.h} />),
      )}
      {/* nẹp khung cửa */}
      {(
        [
          [-DOOR_W / 2 - 0.04, DOOR_H / 2 + 0.02, 0.08, DOOR_H + 0.04],
          [DOOR_W / 2 + 0.04, DOOR_H / 2 + 0.02, 0.08, DOOR_H + 0.04],
          [0, DOOR_H + 0.06, DOOR_W + 0.16, 0.08],
        ] as const
      ).map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.02]} material={PAINT_DARK} castShadow>
          <boxGeometry args={[w, h, 0.03]} />
        </mesh>
      ))}
      {/* bản lề */}
      {[0.25, 1.75].map((y) => (
        <mesh key={y} position={[-DOOR_W / 2 + 0.01, y, DOOR_T / 2 + 0.004]} material={STEEL}>
          <boxGeometry args={[0.025, 0.09, 0.006]} />
        </mesh>
      ))}
      {/* tay gạt: đế dọc + cần ngang */}
      <group position={[DOOR_W / 2 - 0.08, 1.0, DOOR_T / 2]}>
        <mesh position-z={0.004} material={STEEL}>
          <boxGeometry args={[0.04, 0.2, 0.008]} />
        </mesh>
        <mesh position={[0, 0.03, 0.03]} rotation-x={Math.PI / 2} material={STEEL}>
          <cylinderGeometry args={[0.009, 0.009, 0.05, 10]} />
        </mesh>
        <mesh position={[-0.055, 0.03, 0.055]} rotation-z={Math.PI / 2} material={STEEL} castShadow>
          <cylinderGeometry args={[0.009, 0.009, 0.12, 10]} />
        </mesh>
      </group>
      {/* công tắc đèn trên tường bên tay nắm */}
      <group position={[DOOR_W / 2 + 0.22, 1.25, 0.004]}>
        <mesh material={PLATE}>
          <boxGeometry args={[0.08, 0.12, 0.008]} />
        </mesh>
        <mesh position-z={0.007} material={PLATE}>
          <boxGeometry args={[0.025, 0.045, 0.008]} />
        </mesh>
      </group>
    </group>
  )
}

/** Kệ sắt xanh 3 tầng mặt ván (gốc = sàn dưới tâm kệ, mặt trước +z); trả về độ cao các tầng để đặt hàng */
export const RACK_TIERS = [0.08, 0.5, 0.92, RACK.h]

export function MetalRack(props: JSX.IntrinsicElements['group']) {
  const { w, d, h } = RACK
  return (
    <group {...props}>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[(sx * (w - 0.04)) / 2, h / 2, (sz * (d - 0.04)) / 2]}
            material={RACK_BLUE}
            castShadow
          >
            <boxGeometry args={[0.035, h, 0.035]} />
          </mesh>
        )),
      )}
      {RACK_TIERS.map((y) => (
        <group key={y} position-y={y}>
          <mesh position-y={-0.012} material={BOARD} castShadow receiveShadow>
            <boxGeometry args={[w - 0.02, 0.018, d - 0.02]} />
          </mesh>
          {/* thanh đỡ trước / sau */}
          {[-1, 1].map((sz) => (
            <mesh key={sz} position={[0, -0.03, (sz * (d - 0.02)) / 2]} material={RACK_BLUE}>
              <boxGeometry args={[w, 0.04, 0.02]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
