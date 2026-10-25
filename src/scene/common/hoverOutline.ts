import { useEffect, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** màu viền hover, giống màn hình PC trên bàn */
const HOVER_COLOR = '#ffd84a'

// vỏ ngược (inverted hull): đẩy đỉnh ra theo pháp tuyến, chỉ vẽ mặt sau → viền vàng quanh vật.
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

const KEY = 'hoverOutline'
const noRay = () => null

/** viền của 1 mesh (tạo 1 lần, gắn làm con để theo transform / ẩn hiện của mesh) */
function outlineOf(m: THREE.Mesh) {
  let o = m.userData[KEY] as THREE.Mesh | undefined
  if (!o) {
    o =
      m instanceof THREE.InstancedMesh
        ? Object.assign(new THREE.InstancedMesh(m.geometry, OUTLINE_MAT, m.instanceMatrix.count), {
            instanceMatrix: m.instanceMatrix,
          })
        : new THREE.Mesh(m.geometry, OUTLINE_MAT)
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

/** Viền vàng quanh mọi mesh trong group khi `show` (vật tương tác được đang được rê chuột) */
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
