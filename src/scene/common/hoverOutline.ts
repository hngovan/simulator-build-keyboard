import { useEffect, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** màu tương tác trong cảnh 3D (viền hover, mũi tên hướng dẫn, chỗ chờ đặt / bấm): xanh lá như `--color-green` */
export const HINT_COLOR = '#3ecf6e'
/** sáng hơn khi rê chuột */
export const HINT_HOVER = '#8af5ac'
const HOVER_COLOR = HINT_COLOR

// vỏ ngược (inverted hull): đẩy đỉnh ra theo pháp tuyến, chỉ vẽ mặt sau → viền xanh quanh vật.
// Độ dày tính theo khoảng cách camera nên nhìn gần / xa đều mảnh như nhau
export const OUTLINE_MAT = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(HOVER_COLOR) }, width: { value: 0.004 } },
  vertexShader: /* glsl */ `
    uniform float width;
    void main() {
      vec4 p = vec4(position, 1.0);
      vec3 n = normal;
      #ifdef USE_INSTANCING
        p = instanceMatrix * p;
        n = mat3(instanceMatrix) * n;
      #endif
      vec4 mv = modelViewMatrix * p;
      mv.xyz += normalize(normalMatrix * n) * width * -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    void main() { gl_FragColor = vec4(color, 1.0); }
  `,
  side: THREE.BackSide,
})
OUTLINE_MAT.toneMapped = false

/**
 * Viền cho khối trong suốt (ô chỗ đặt thùng): vẽ ở lượt trong suốt sau khối (khối ghi chiều sâu) → phần vỏ ngược nằm sau mặt trước
 * bị che, chỉ lộ đường bao quanh mặt nhìn thấy (không tô xanh kín cả khối)
 */
export const OUTLINE_GHOST_MAT = OUTLINE_MAT.clone()
OUTLINE_GHOST_MAT.transparent = true
OUTLINE_GHOST_MAT.toneMapped = false

const KEY = 'hoverOutline'
const noRay = () => null

/**
 * Hình hộp (thùng carton, khối chỗ đặt): pháp tuyến phẳng từng mặt làm vỏ ngược tách rời từng mặt → viền gãy, dày, sắc.
 * Gộp đỉnh trùng + tính lại pháp tuyến mượt (đỉnh góc đẩy chéo ra) → 1 đường bao gọn quanh mặt nhìn thấy, nhẹ như viền model
 */
const smoothCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>()
export function outlineGeometry(g: THREE.BufferGeometry) {
  if (g.type !== 'BoxGeometry') return g
  let s = smoothCache.get(g)
  if (!s) {
    const pos = new THREE.BufferGeometry()
    pos.setAttribute('position', g.attributes.position)
    pos.setIndex(g.index)
    s = mergeVertices(pos)
    s.computeVertexNormals()
    smoothCache.set(g, s)
  }
  return s
}

/** viền của 1 mesh (tạo 1 lần, gắn làm con để theo transform / ẩn hiện của mesh) */
function outlineOf(m: THREE.Mesh) {
  let o = m.userData[KEY] as THREE.Mesh | undefined
  if (!o) {
    const geo = outlineGeometry(m.geometry)
    o =
      m instanceof THREE.InstancedMesh
        ? Object.assign(new THREE.InstancedMesh(geo, OUTLINE_MAT, m.instanceMatrix.count), {
            instanceMatrix: m.instanceMatrix,
          })
        : new THREE.Mesh(geo, OUTLINE_MAT)
    o.raycast = noRay
    o.frustumCulled = false
    o.userData[KEY] = o
    m.userData[KEY] = o
    m.add(o)
  }
  return o
}

/** mesh vẽ viền được: có pháp tuyến, không phải chữ 3D (troika) hay chính viền */
const outlinable = (o: THREE.Object3D): o is THREE.Mesh =>
  o instanceof THREE.Mesh &&
  o.userData[KEY] !== o &&
  !!o.geometry?.attributes.normal &&
  !('text' in o)

/** Viền xanh quanh mọi mesh trong group khi `show` (vật tương tác được đang được rê chuột) */
export function useHoverOutline(ref: RefObject<THREE.Object3D>, show: boolean) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const list: THREE.Mesh[] = []
    if (show) root.traverse((o) => outlinable(o) && list.push(outlineOf(o)))
    else
      root.traverse((o) => o.userData[KEY] && o.userData[KEY] !== o && list.push(o.userData[KEY]))
    list.forEach((o) => (o.visible = show))
  }, [ref, show])
  // InstancedMesh đổi số con (mở thêm switch...) thì viền theo
  useFrame(() => {
    if (!show || !ref.current) return
    ref.current.traverse((o) => {
      const line = o.userData[KEY] as THREE.Mesh | undefined
      if (line && line !== o && o instanceof THREE.InstancedMesh)
        (line as THREE.InstancedMesh).count = o.count
    })
  })
}
