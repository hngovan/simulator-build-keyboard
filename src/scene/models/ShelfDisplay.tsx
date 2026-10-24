import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { buildKeyboardModel, caseSpec } from '@/features/apps/messenger/orderThumb'

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
  ...props
}: {
  caseId: string
  color: string
  keycapKit: string
  keycapColor: string
  accent: string
} & JSX.IntrinsicElements['group']) {
  const [model, setModel] = useState<{ obj: THREE.Object3D; width: number } | null>(null)
  useEffect(() => {
    let alive = true
    const spec = { ...caseSpec(caseId, color), keycapKit, keycapColor, accent }
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
      // nghiêng đúng góc mặt tựa: mặt phím ngửa ra trước + lên trên, mép sau nâng lên
      kb.rotation.x = LEAN
      // đặt góc trước dưới của đáy vào móc → mặt đáy song song, nằm ngay trước mặt tựa (không xuyên chân đỡ).
      // Không lấy điểm nhô ra trước nhất: khi dựng nghiêng đó là mặt keycap, cả bàn phím sẽ lùi vào trong chân đỡ
      const corner = new THREE.Vector3(0, flat.min.y, flat.max.z).applyEuler(kb.rotation)
      kb.position.set(-(flat.min.x + flat.max.x) / 2, SEAT[1] - corner.y, -SEAT[0] - corner.z)
      const width = flat.max.x - flat.min.x
      setModel({ obj: kb, width })
    })
    return () => {
      alive = false
    }
  }, [caseId, color, keycapKit, keycapColor, accent])
  // 2 chân đỡ ở 1/4 bề rộng bàn phím tính từ 2 mép
  const sx = (model?.width ?? 0.3) * 0.28
  return (
    <group {...props}>
      <KeyboardStand position-x={-sx} />
      <KeyboardStand position-x={sx} />
      {model && <primitive object={model.obj} />}
    </group>
  )
}
