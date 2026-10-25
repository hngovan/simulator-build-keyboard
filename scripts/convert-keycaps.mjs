// Chuyển mẫu CAD keycap 1u cộng đồng sang GLB chuẩn hoá cho ảnh xem trước.
// Dùng: bun run convert:keycaps
import fs from 'node:fs'
import path from 'node:path'
import occtimportjs from 'occt-import-js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { Document, NodeIO } from '@gltf-transform/core'
import { MeshoptSimplifier } from 'meshoptimizer'

const SRC = 'assets/community/keycap-profiles'
const OUT = 'public/models/keycaps'
fs.mkdirSync(OUT, { recursive: true })
const stl = new STLLoader()
const io = new NodeIO()

function fromStl(file) {
  const data = fs.readFileSync(path.join(SRC, file))
  const geo = stl.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
  return [
    { position: geo.getAttribute('position').array, normal: geo.getAttribute('normal').array },
  ]
}

function fromObj(file) {
  const obj = new OBJLoader().parse(fs.readFileSync(path.join(SRC, file), 'utf8'))
  const parts = []
  obj.traverse((child) => {
    if (!child.isMesh || !['XDA_1U_Base', 'XDA_1U_Top'].includes(child.name)) return
    parts.push({
      position: child.geometry.getAttribute('position').array,
      normal: child.geometry.getAttribute('normal').array,
    })
  })
  if (parts.length !== 2) throw new Error('Không tìm đủ phần XDA 1u')
  return parts
}

async function fromStep(file) {
  const occt = await occtimportjs()
  const result = occt.ReadStepFile(new Uint8Array(fs.readFileSync(path.join(SRC, file))), null)
  if (!result.success || !result.meshes.length) throw new Error(`Không đọc được ${file}`)
  return result.meshes.map((mesh) => ({
    position: mesh.attributes.position.array,
    normal: mesh.attributes.normal.array,
    index: mesh.index.array,
  }))
}

function weld(position, normal, step) {
  const vertices = []
  const normals = []
  const indices = []
  const map = new Map()
  for (let i = 0; i < position.length; i += 9) {
    const tri = []
    for (let v = 0; v < 3; v++) {
      const off = i + v * 3
      const key = [0, 1, 2].map((j) => Math.round(position[off + j] / step)).join(',')
      let idx = map.get(key)
      if (idx === undefined) {
        idx = vertices.length / 3
        map.set(key, idx)
        vertices.push(position[off], position[off + 1], position[off + 2])
        normals.push(0, 0, 0)
      }
      for (let j = 0; j < 3; j++) normals[idx * 3 + j] += normal[off + j]
      tri.push(idx)
    }
    if (new Set(tri).size === 3) indices.push(...tri)
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1
    for (let j = 0; j < 3; j++) normals[i + j] /= len
  }
  return {
    position: new Float32Array(vertices),
    normal: new Float32Array(normals),
    index: new Uint32Array(indices),
  }
}

await MeshoptSimplifier.ready

function simplify(mesh, targetTriangles) {
  const target = Math.min(mesh.index.length, targetTriangles * 3)
  const [indices, error] = MeshoptSimplifier.simplify(mesh.index, mesh.position, 3, target, 0.015)
  const [remap, count] = MeshoptSimplifier.compactMesh(indices)
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  for (let old = 0; old < remap.length; old++) {
    const next = remap[old]
    if (next === 0xffffffff) continue
    for (let j = 0; j < 3; j++) {
      position[next * 3 + j] = mesh.position[old * 3 + j]
      normal[next * 3 + j] = mesh.normal[old * 3 + j]
    }
  }
  console.log(`  giảm còn ${indices.length / 3} tam giác, sai số ${error.toFixed(4)}`)
  return { position, normal, index: indices }
}

/**
 * Xoay quanh trục đứng (rad) cho đúng chiều game: người gõ ở +z, mép sau (-z) của hàng trên (R1, R2)
 * cao hơn mép trước, hàng dưới (R4) ngược lại. SA R1 / R2 dốc theo trục x (mỗi file một chiều), OPK hàng 3 ngược 180°.
 * Cherry / OEM: giữ nguyên chiều file gốc (thành đứng ở sau, thành vát ở trước như bảng profile R1–R4),
 * nhưng file đánh số hàng ngược (r4-1u = R1 … r1-1u = R4) → đổi tên khi ghi ra (vòng lặp cuối file).
 * Bản cũ xoay 180° cho đúng độ dốc mặt trên nên thành đứng / vát bị ngược
 */
const YAW = {
  'sa-r1': Math.PI / 2,
  'sa-r2': -Math.PI / 2,
  opk: Math.PI,
}
const yawOf = (name) => YAW[name] ?? 0

async function convert(name, parts, up = 'y') {
  const bounds = [
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity],
  ]
  const yaw = yawOf(name)
  const c = Math.cos(yaw)
  const sn = Math.sin(yaw)
  const rotate = (p, i) => {
    const [x, y, z] = up === 'z' ? [p[i], p[i + 2], -p[i + 1]] : [p[i], p[i + 1], p[i + 2]]
    return [x * c + z * sn, y, -x * sn + z * c]
  }
  for (const part of parts)
    for (let i = 0; i < part.position.length; i += 3) {
      const v = rotate(part.position, i)
      for (let j = 0; j < 3; j++) {
        bounds[0][j] = Math.min(bounds[0][j], v[j])
        bounds[1][j] = Math.max(bounds[1][j], v[j])
      }
    }
  const [min, max] = bounds
  const scale = 0.92 / Math.max(max[0] - min[0], max[2] - min[2])
  const center = [(max[0] + min[0]) / 2, min[1], (max[2] + min[2]) / 2]
  const doc = new Document()
  const buffer = doc.createBuffer()
  const mat = doc
    .createMaterial('pbt')
    .setBaseColorFactor([0.92, 0.91, 0.88, 1])
    .setRoughnessFactor(0.62)
    .setDoubleSided(true)
  const mesh = doc.createMesh(name)
  for (const part of parts) {
    const pos = new Float32Array(part.position.length)
    const nor = new Float32Array(part.normal.length)
    for (let i = 0; i < pos.length; i += 3) {
      const p = rotate(part.position, i)
      const n = rotate(part.normal, i)
      for (let j = 0; j < 3; j++) {
        pos[i + j] = (p[j] - center[j]) * scale
        nor[i + j] = n[j]
      }
    }
    const ready =
      name === 'mt3'
        ? simplify(weld(pos, nor, 0.0015), 4500)
        : name === 'dsa'
          ? simplify(weld(pos, nor, 0.001), 4500)
          : { position: pos, normal: nor, index: part.index }
    const primitive = doc
      .createPrimitive()
      .setAttribute(
        'POSITION',
        doc.createAccessor().setType('VEC3').setArray(ready.position).setBuffer(buffer),
      )
      .setAttribute(
        'NORMAL',
        doc.createAccessor().setType('VEC3').setArray(ready.normal).setBuffer(buffer),
      )
      .setMaterial(mat)
    if (ready.index)
      primitive.setIndices(
        doc
          .createAccessor()
          .setType('SCALAR')
          .setArray(new Uint32Array(ready.index))
          .setBuffer(buffer),
      )
    mesh.addPrimitive(primitive)
  }
  doc.createScene(name).addChild(doc.createNode(name).setMesh(mesh))
  const target = path.join(OUT, `${name}.glb`)
  await io.write(target, doc)
  console.log(
    `${target}: ${(fs.statSync(target).size / 1024).toFixed(0)} KB; cao ${((max[1] - min[1]) * scale).toFixed(3)}u`,
  )
}

for (const row of [1, 2, 3, 4]) {
  // file r1-1u là hàng dưới cùng (R4) … r4-1u là hàng số (R1)
  await convert(`cherry-r${5 - row}`, fromStl(`cherry/r${row}-1u.stl`))
  await convert(`oem-r${5 - row}`, await fromStep(`oem/extracted/r${row}-1u.step`))
}
for (const row of [1, 2, 3]) await convert(`sa-r${row}`, fromStl(`sa/r${row}.stl`), 'z')
await convert('dsa', fromStl('dsa/1u.stl'))
await convert('xda', fromObj('xda/keycaps.obj'))
await convert('mt3', fromStl('mt3/row0.stl'))
await convert('opk', await fromStep('opk/row3-u1.step'), 'z')
// occt-import-js giữ worker sống sau khi đọc STEP
process.exit(0)
