import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import {
  buildKeyboardModel,
  caseSpec,
  type KeyboardSpec,
} from '@/features/apps/messenger/orderThumb'
import { CASES } from '@/data/parts'
import { useHover } from '../common/useHover'
import { useShelfView } from './shelfView'

/**
 * Viền hover chỉ ở mặt trước (như viền màn hình máy tính): khung chữ nhật vàng phẳng ôm mép trên của case,
 * nghiêng theo mặt case (`seat.tilt`), dày FRAME_W mét; không vẽ quanh đáy / cạnh sau / chân đỡ
 */
const FRAME_W = 0.004
const FRAME = new THREE.MeshBasicMaterial({
  color: '#ffd84a',
  toneMapped: false,
  side: THREE.DoubleSide,
})
import type { Key, Variant } from '@/types'

// Kệ chưng bàn phím trên kệ sách: chân đỡ hình chữ A có móc trước (in 3D, nhựa xám đen) + bàn phím dựng nghiêng.
// Đơn vị: mét (Room nhân M); mặt trước của chân đỡ quay ra +z (phía người chơi)

/**
 * Mặt cắt hông chân đỡ (u = lùi về sau, v = cao): đế nằm ngang, móc nhỏ ở trước giữ mép bàn phím,
 * cạnh trước dốc ~61° lên đỉnh (bàn phím tựa vào), cạnh sau đổ xuống đế; giữa khoét lỗ tam giác
 */
const OUTER: [number, number][] = [
  [0, 0],
  [0.095, 0],
  [0.095, 0.012],
  [0.084, 0.1],
  [0.072, 0.1],
  [0.024, 0.014],
  [0.012, 0.014],
  [0.012, 0.026],
  [0, 0.026],
]
const HOLE: [number, number][] = [
  [0.042, 0.022],
  [0.082, 0.022],
  [0.074, 0.08],
]
/** dày chân đỡ (m) */
const STAND_W = 0.012
/** góc nghiêng mặt tựa so với mặt kệ */
const LEAN = Math.atan2(0.1 - 0.014, 0.072 - 0.024)
/** góc trước dưới của đáy bàn phím đặt trong móc: lùi vào 2cm (mặt tựa ở 2.4cm), cao 1.4cm */
const SEAT: [number, number] = [0.02, 0.014]

const standMat = new THREE.MeshStandardMaterial({ color: '#33363c', roughness: 0.75 })

function standGeometry() {
  const shape = new THREE.Shape(OUTER.map(([u, v]) => new THREE.Vector2(u, v)))
  shape.holes.push(new THREE.Path(HOLE.map(([u, v]) => new THREE.Vector2(u, v)).reverse()))
  const g = new THREE.ExtrudeGeometry(shape, { depth: STAND_W, bevelEnabled: false })
  // mặt cắt nằm trong mặt XY, đùn theo z → xoay cho u hướng về sau (−z), bề dày theo x
  g.rotateY(Math.PI / 2)
  g.translate(-STAND_W / 2, 0, 0)
  return g
}

/** 1 chân đỡ (gốc = mép trước đế, giữa bề dày) */
export function KeyboardStand(props: JSX.IntrinsicElements['group']) {
  const geo = useMemo(() => standGeometry(), [])
  return (
    <group {...props}>
      <mesh geometry={geo} material={standMat} castShadow receiveShadow />
    </group>
  )
}

/** 1 bàn phím ráp sẵn dựng nghiêng trên 2 chân đỡ (gốc = giữa mép trước 2 chân đỡ, mặt kệ) */
export function DisplayKeyboard({
  caseId,
  color,
  keycapKit,
  keycapColor,
  accent,
  variant,
  capOf,
  ...props
}: {
  caseId: string
  color: string
  keycapKit: string
  keycapColor: string
  accent: string
  /** biến thể layout (vd hàng dưới WKL space 7u) */
  variant?: Variant
  /** phối màu riêng từng phím (hex) */
  capOf?: (k: Key) => string | undefined
} & JSX.IntrinsicElements['group']) {
  const [model, setModel] = useState<{
    obj: THREE.Object3D
    width: number
    shell: THREE.Group
    spec: KeyboardSpec
  } | null>(null)
  const { hover, bind } = useHover(true)
  const openView = useShelfView((s) => s.open)
  const [down, setDown] = useState<[number, number] | null>(null)
  // viền hover: mesh nằm trong model đã dựng, bật / tắt qua ref
  const shellRef = useRef<THREE.Group | null>(null)
  useEffect(() => {
    if (shellRef.current) shellRef.current.visible = hover
  }, [hover, model])
  useEffect(() => {
    let alive = true
    const spec = {
      ...caseSpec(caseId, color),
      ...(variant && { variant }),
      keycapKit,
      keycapColor,
      accent,
      capOf,
    }
    buildKeyboardModel(spec, false).then((obj) => {
      if (!alive) return
      // model tính theo u (1u = 19.05mm) → mét; dựng nghiêng theo mặt tựa, mép dưới đặt vào móc
      const kb = new THREE.Group()
      obj.scale.setScalar(0.01905)
      obj.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
      })
      kb.add(obj)
      // khung bao lúc nằm phẳng: góc trước dưới của đáy case (y nhỏ nhất, z lớn nhất)
      kb.updateMatrixWorld(true)
      const flat = new THREE.Box3().setFromObject(kb)
      // viền hover: khung phẳng quanh mép trên vỏ case (mesh con trực tiếp của model), không ôm keycap / đáy
      const box = new THREE.Box3()
      for (const c of obj.children) if ((c as THREE.Mesh).isMesh) box.expandByObject(c)
      const shell = new THREE.Group()
      shell.visible = false
      if (!box.isEmpty()) {
        const tilt = CASES[caseId]?.seat?.tilt ?? 0
        const w = box.max.x - box.min.x
        const d = (box.max.z - box.min.z) / Math.cos(tilt)
        const rect = (hw: number, hd: number) =>
          [
            [-hw, -hd],
            [hw, -hd],
            [hw, hd],
            [-hw, hd],
          ].map(([x, y]) => new THREE.Vector2(x, y))
        const shape = new THREE.Shape(rect(w / 2 + FRAME_W, d / 2 + FRAME_W))
        shape.holes.push(new THREE.Path(rect(w / 2, d / 2).reverse()))
        const frame = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), FRAME)
        // mép sau cao nhất (box.max.y), case nêm thì mép trước thấp dần theo tilt
        frame.rotation.x = tilt
        frame.position.set(
          (box.min.x + box.max.x) / 2,
          box.max.y + 0.0006 - (d / 2) * Math.sin(tilt),
          (box.min.z + box.max.z) / 2,
        )
        frame.raycast = () => {}
        shell.add(frame)
      }
      kb.add(shell)
      // nghiêng đúng góc mặt tựa: mặt phím ngửa ra trước + lên trên, mép sau nâng lên
      kb.rotation.x = LEAN
      // đặt góc trước dưới của đáy vào móc → mặt đáy song song, nằm ngay trước mặt tựa (không xuyên chân đỡ).
      // Không lấy điểm nhô ra trước nhất: khi dựng nghiêng đó là mặt keycap, cả bàn phím sẽ lùi vào trong chân đỡ
      const corner = new THREE.Vector3(0, flat.min.y, flat.max.z).applyEuler(kb.rotation)
      kb.position.set(-(flat.min.x + flat.max.x) / 2, SEAT[1] - corner.y, -SEAT[0] - corner.z)
      const width = flat.max.x - flat.min.x
      shellRef.current = shell
      setModel({ obj: kb, width, shell, spec })
    })
    return () => {
      alive = false
    }
  }, [caseId, color, keycapKit, keycapColor, accent, variant, capOf])
  // 2 chân đỡ ở 1/4 bề rộng bàn phím tính từ 2 mép
  const sx = (model?.width ?? 0.3) * 0.28
  return (
    <group {...props}>
      <KeyboardStand position-x={-sx} />
      <KeyboardStand position-x={sx} />
      {model && (
        // rê chuột: viền vàng; bấm (không phải kéo xoay camera) thì mở khung xem 3D
        <group
          {...bind}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => setDown([e.clientX, e.clientY])}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return
            e.stopPropagation()
            openView(model.spec)
          }}
        >
          <primitive object={model.obj} />
        </group>
      )}
    </group>
  )
}
