import * as THREE from 'three'
import { RACK } from './roomLayout'
import { grainBoxGeometry } from '../materials'
import { LightSwitch } from './Wiring'

// Đồ hành lang dựng bằng code (theo ảnh mẫu người dùng): cửa gỗ 6 ô sơn xanh + nẹp + tay gạt + công tắc đèn,
// kệ sắt xanh 3 tầng để hàng giao tới. Đơn vị mét

/**
 * ảnh vân sồi lặp: UV `woodUV` tính theo đơn vị cảnh (1 ảnh ~0,42m = 22u), đồ ở đây dựng theo mét → lặp 22 / 0,42 lần
 * cho vân đúng cỡ thật
 */
const grain = (file: string, srgb = false) => {
  const t = new THREE.TextureLoader().load(`/textures/room/${file}`, (t) => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.setScalar(22 / 0.42)
  return t
}
/** cửa gỗ sơn: giữ màu sơn, vân sồi nổi dưới lớp sơn (normal map) — người dùng: "thêm vân gỗ" */
const OAK_RELIEF = grain('oak_veneer_01_nor_gl_1k.jpg')
/** độ nhám theo thớ gỗ: lớp sơn bóng / mờ theo vân */
const OAK_ROUGH = grain('oak_veneer_01_rough_1k.jpg')
const PAINT = new THREE.MeshStandardMaterial({
  color: '#2f6f7e',
  roughness: 0.55,
  normalMap: OAK_RELIEF,
  normalScale: new THREE.Vector2(1.2, 1.2),
  roughnessMap: OAK_ROUGH,
})
const PAINT_DARK = new THREE.MeshStandardMaterial({
  color: '#255966',
  roughness: 0.6,
  normalMap: OAK_RELIEF,
  normalScale: new THREE.Vector2(1.2, 1.2),
  roughnessMap: OAK_ROUGH,
})
const STEEL = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.3, metalness: 0.85 })
/**
 * kệ thép sơn xanh: texture `blue_metal_plate` (Poly Haven CC0, lặp 1 ảnh / 1m cho xước nhỏ vừa cột kệ) — xước lộ thép, gợn bề mặt; `arm` = AO / độ nhám /
 * kim loại theo kênh R / G / B (three đọc roughness kênh G, metalness kênh B). Ảnh gốc xanh navy cũ → nhân màu 1,4 thành thép xanh
 * xám bóng kim loại (2,2 thì bạc thành xanh nhạt loang lổ) (người dùng: "kệ thép chưa có cảm giác giống thép")
 */
const steel = (file: string, srgb = false) => {
  const t = grain(file, srgb)
  t.repeat.setScalar(22)
  return t
}
const STEEL_ARM = steel('blue_metal_plate_arm_1k.jpg')
const RACK_BLUE = new THREE.MeshStandardMaterial({
  map: steel('blue_metal_plate_diff_1k.jpg', true),
  normalMap: steel('blue_metal_plate_nor_gl_1k.jpg'),
  roughnessMap: STEEL_ARM,
  metalnessMap: STEEL_ARM,
  roughness: 1,
  metalness: 1,
  color: new THREE.Color().setRGB(1.4, 1.4, 1.4),
})
/** ván kệ: vân sồi mộc */
const BOARD = new THREE.MeshStandardMaterial({
  map: grain('oak_veneer_01_diff_1k.jpg', true),
  normalMap: OAK_RELIEF,
  color: '#e0bf96',
  roughness: 0.8,
})
/** khối hộp UV theo kích thước thật (vân gỗ / thép không bị kéo giãn), mỗi cỡ dựng 1 lần */
const woodBox = (() => {
  const cache = new Map<string, THREE.BufferGeometry>()
  return (w: number, h: number, d: number) => {
    const k = `${w},${h},${d}`
    if (!cache.has(k)) cache.set(k, grainBoxGeometry(w, h, d))
    return cache.get(k)!
  }
})()

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
        <mesh
          key={i}
          position={[px, py, 0.004]}
          material={PAINT_DARK}
          geometry={woodBox(pw, ph, 0.008)}
        />
      ))}
      {/* mặt ô nổi */}
      <mesh
        position-z={0.006}
        material={PAINT}
        castShadow
        geometry={woodBox(w - 2 * r - 0.012, h - 2 * r - 0.012, 0.012)}
      />
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
      <mesh
        position={[0, DOOR_H / 2, 0]}
        material={PAINT}
        castShadow
        receiveShadow
        geometry={woodBox(DOOR_W, DOOR_H, DOOR_T)}
      />
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
        <mesh
          key={i}
          position={[x, y, 0.02]}
          material={PAINT_DARK}
          castShadow
          geometry={woodBox(w, h, 0.03)}
        />
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
      {/* công tắc đèn trên tường bên tay nắm: cao 1,35m cho thoát mặt kệ sắt cạnh cửa (kệ cao 1,25m) */}
      <LightSwitch position={[DOOR_W / 2 + 0.22, 1.35, 0]} />
    </group>
  )
}

/** Kệ sắt xanh 3 tầng mặt ván (gốc = sàn dưới tâm kệ, mặt trước +z); trả về độ cao các tầng để đặt hàng */
export const RACK_TIERS = [0.08, 0.5, 0.92, RACK.h]

/** `tiers` = độ cao các tầng ván (tầng cuối = mặt trên, cao bằng cột) */
export function MetalRack({
  tiers = RACK_TIERS,
  ...props
}: { tiers?: number[] } & JSX.IntrinsicElements['group']) {
  const { w, d } = RACK
  const h = tiers[tiers.length - 1]
  return (
    <group {...props}>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[(sx * (w - 0.04)) / 2, h / 2, (sz * (d - 0.04)) / 2]}
            material={RACK_BLUE}
            castShadow
            geometry={woodBox(0.035, h, 0.035)}
          />
        )),
      )}
      {tiers.map((y) => (
        <group key={y} position-y={y}>
          <mesh
            position-y={-0.012}
            material={BOARD}
            castShadow
            receiveShadow
            geometry={woodBox(w - 0.02, 0.018, d - 0.02)}
          />
          {/* thanh đỡ trước / sau */}
          {[-1, 1].map((sz) => (
            <mesh
              key={sz}
              position={[0, -0.03, (sz * (d - 0.02)) / 2]}
              material={RACK_BLUE}
              geometry={woodBox(w, 0.04, 0.02)}
            />
          ))}
        </group>
      ))}
    </group>
  )
}
