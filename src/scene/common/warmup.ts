import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Giảm khựng khi đi lại: (1) đồ trang trí không dùng transmission (mỗi khung có vật transmission trong tầm nhìn three vẽ lại
// cả cảnh vào render target + tạo mipmap, máy GPU tích hợp tụt hẳn khung); (2) biên dịch shader + tải texture lên GPU
// trước, không để tới lần đầu vật lọt vào khung hình (quay ra / quay lại hành lang khựng vài giây); (3) gộp mesh theo vật liệu
// cho đồ tĩnh nhiều mảnh (mỗi keycap 1 mesh → mỗi vật liệu 1 draw call)

/**
 * Đổi vật liệu transmission (kính, case PC / mica trong) trong `root` sang trong suốt thường: giữ màu / độ nhám,
 * độ đục theo opacity cũ (vật đã trong suốt) hoặc theo transmission (kính đục 1 → mờ còn ~0,2). Clone vật liệu, không sửa bản dùng chung
 */
export function cheapGlass(root: THREE.Object3D) {
  const done = new Map<THREE.Material, THREE.Material>()
  const swap = (m: THREE.Material) => {
    const p = m as THREE.MeshPhysicalMaterial
    if (!p.isMeshPhysicalMaterial || !(p.transmission > 0)) return m
    let c = done.get(m)
    if (!c) {
      const n = p.clone()
      n.transmission = 0
      n.transparent = true
      n.opacity =
        p.transparent && p.opacity < 1 ? p.opacity : Math.max(0.15, 1 - p.transmission * 0.85)
      n.depthWrite = false
      done.set(m, (c = n))
    }
    return c
  }
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
  })
}

/** mọi texture vật liệu trong `root` */
function textures(root: THREE.Object3D) {
  const out = new Set<THREE.Texture>()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      for (const v of Object.values(m))
        if ((v as THREE.Texture)?.isTexture) out.add(v as THREE.Texture)
  })
  return out
}

/**
 * Biên dịch shader (song song nếu trình duyệt hỗ trợ) + tải texture của `root` lên GPU trước. `target` = cảnh chứa đèn
 * (root chưa gắn vào cảnh). Lỗi thì bỏ qua: chỉ là làm trước, lúc vẽ three vẫn tự làm
 */
export async function warmUp(
  gl: THREE.WebGLRenderer,
  root: THREE.Object3D,
  camera: THREE.Camera,
  target?: THREE.Scene,
) {
  try {
    for (const t of textures(root)) gl.initTexture(t)
    await gl.compileAsync(root, camera, target ?? null)
  } catch {
    // bỏ qua
  }
}

/**
 * Gộp mọi mesh trong `root` (đồ tĩnh) thành 1 mesh / vật liệu, toạ độ theo hệ của `root`. Mesh có texture / nhiều vật liệu / thiếu
 * position giữ nguyên (chỉ gắn lại vào nhóm mới). Chỉ giữ position + normal (vật liệu không texture không cần uv). Trả nhóm mới
 */
export function mergeByMaterial(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const inv = root.matrixWorld.clone().invert()
  const out = new THREE.Group()
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const keep: THREE.Mesh[] = []
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible) return
    const mat = mesh.material
    const rel = inv.clone().multiply(mesh.matrixWorld)
    if (
      Array.isArray(mat) ||
      (mat as THREE.MeshStandardMaterial).map ||
      !mesh.geometry.attributes.position
    ) {
      const c = mesh.clone()
      rel.decompose(c.position, c.quaternion, c.scale)
      keep.push(c)
      return
    }
    let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
    for (const name of Object.keys(g.attributes))
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    g.morphAttributes = {}
    if (!g.attributes.normal) g.computeVertexNormals()
    g = g.applyMatrix4(rel)
    // lật gương (scale âm) thì đảo chiều tam giác cho mặt trước đúng phía
    if (rel.determinant() < 0) {
      const p = g.attributes.position.array as Float32Array
      const n = g.attributes.normal.array as Float32Array
      for (const a of [p, n])
        for (let i = 0; i < a.length; i += 9)
          for (let k = 0; k < 3; k++) [a[i + 3 + k], a[i + 6 + k]] = [a[i + 6 + k], a[i + 3 + k]]
    }
    const list = groups.get(mat) ?? []
    list.push(g)
    groups.set(mat, list)
  })
  for (const [mat, list] of groups) {
    const merged = mergeGeometries(list)
    list.forEach((g) => g.dispose())
    if (!merged) continue
    const m = new THREE.Mesh(merged, mat)
    m.castShadow = m.receiveShadow = true
    out.add(m)
  }
  for (const k of keep) out.add(k)
  return out
}
