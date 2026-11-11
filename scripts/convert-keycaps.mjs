// Chuyển mẫu CAD keycap 1u cộng đồng sang GLB chuẩn hoá cho ảnh xem trước.
// Dùng: bun run convert:keycaps
import fs from 'node:fs'
import path from 'node:path'
import occtimportjs from 'occt-import-js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { Document, NodeIO } from '@gltf-transform/core'
import { MeshoptSimplifier } from 'meshoptimizer'
import * as THREE from 'three'
import { ADDITION, Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

const SRC = 'assets/keycaps'
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

/** OBJ 1 khối (DCS, Fooblitzky/DCS_keycaps): lấy mọi mesh */
function fromObjAll(file) {
  const obj = new OBJLoader().parse(fs.readFileSync(path.join(SRC, file), 'utf8'))
  const parts = []
  obj.traverse((child) => {
    if (!child.isMesh) return
    const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry
    if (!geo.getAttribute('normal')) geo.computeVertexNormals()
    // vn trong file DCS (Autodesk ATF) không chuẩn hoá (dài ~0,1): game dò trần lòng / stem theo pháp tuyến → chuẩn hoá
    geo.normalizeNormals()
    parts.push({
      position: geo.getAttribute('position').array,
      normal: geo.getAttribute('normal').array,
    })
  })
  if (!parts.length) throw new Error(`Không có mesh trong ${file}`)
  return parts
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
 * cao hơn mép trước, hàng dưới (R4) ngược lại. OPK hàng 3 ngược 180°.
 * Cherry / OEM: giữ nguyên chiều file gốc (thành đứng ở sau, thành vát ở trước như bảng profile R1–R4),
 * nhưng file đánh số hàng ngược (r4-1u = R1 … r1-1u = R4) → đổi tên khi ghi ra (vòng lặp cuối file).
 * Bản cũ xoay 180° cho đúng độ dốc mặt trên nên thành đứng / vát bị ngược
 */
const YAW = {
  opk: Math.PI,
}
const yawOf = (name) => YAW[name] ?? 0

/**
 * Model chỉ có vỏ ngoài đặc (XDA: repo gốc làm để render) → khoét lòng + thêm stem MX cho giống keycap thật
 * (lật ngửa / nhìn từ dưới thấy stem chữ thập như Cherry / OEM / DCS...)
 */
const HOLLOW = new Set(['xda'])
/** đơn vị u (1u = 19,05mm): thành keycap ~1,2mm, stem Ø5,5mm, chữ thập 4,1 × 1,3mm, đáy stem cao hơn mép váy 1mm */
const MMU = 1 / 19.05
const WALL = 1.2 * MMU
const STEM_R = 2.75 * MMU
const CROSS = [4.1 * MMU, 1.3 * MMU]
const STEM_BOT = 1 * MMU

/** stem MX: trụ tròn có lỗ chữ thập, từ `bot` lên `top` (trục y) */
function stemGeometry(bot, top) {
  const shape = new THREE.Shape().absarc(0, 0, STEM_R, 0, Math.PI * 2, false)
  const [l, w] = CROSS.map((v) => v / 2)
  const hole = new THREE.Path()
  for (const [x, y] of [
    [-w, -l],
    [w, -l],
    [w, -w],
    [l, -w],
    [l, w],
    [w, w],
    [w, l],
    [-w, l],
    [-w, w],
    [-l, w],
    [-l, -w],
    [-w, -w],
  ])
    hole.lineTo(x, y)
  hole.closePath()
  shape.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: top - bot,
    bevelEnabled: false,
    curveSegments: 24,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, bot, 0)
  return g
}

/** khối lòng keycap: hình chóp cụt (vách nghiêng theo vỏ ngoài) từ dưới đáy lên trần `ceil` */
function cavityGeometry(bot, top, ceil) {
  const g = new THREE.BoxGeometry(1, 1, 1)
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const up = p.getY(i) > 0
    const [hx, hz] = up ? top : bot
    p.setXYZ(i, Math.sign(p.getX(i)) * hx, up ? ceil : -0.05, Math.sign(p.getZ(i)) * hz)
  }
  g.computeVertexNormals()
  return g
}

/** khoét lòng + gắn stem cho các mảnh đã chuẩn hoá (u, đáy y = 0, tâm ở gốc) */
function hollowWithStem(parts) {
  const geo = new THREE.BufferGeometry()
  const pos = []
  const nor = []
  for (const part of parts) {
    const idx = part.index ?? [...Array(part.position.length / 3).keys()]
    for (const i of idx) {
      pos.push(part.position[i * 3], part.position[i * 3 + 1], part.position[i * 3 + 2])
      nor.push(part.normal[i * 3], part.normal[i * 3 + 1], part.normal[i * 3 + 2])
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  // đo vỏ: điểm thấp nhất mặt trên vùng giữa (đáy lòng chảo), bề ngang ở đáy và ở mép mặt trên
  let dishLow = Infinity
  let top = 0
  const bot = [0, 0]
  const upper = [0, 0]
  for (let i = 0; i < pos.length; i += 3) {
    const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2]]
    top = Math.max(top, y)
    if (Math.abs(x) < 0.2 && Math.abs(z) < 0.2) dishLow = Math.min(dishLow, y)
    if (y < 0.02) {
      bot[0] = Math.max(bot[0], Math.abs(x))
      bot[1] = Math.max(bot[1], Math.abs(z))
    }
  }
  const ceil = dishLow - WALL * 1.5
  // bề ngang vỏ ở độ cao trần: điểm vỏ quanh độ cao đó
  for (let i = 0; i < pos.length; i += 3)
    if (Math.abs(pos[i + 1] - ceil) < 0.06) {
      upper[0] = Math.max(upper[0], Math.abs(pos[i]))
      upper[1] = Math.max(upper[1], Math.abs(pos[i + 2]))
    }
  for (let j = 0; j < 2; j++) if (!upper[j]) upper[j] = bot[j]
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  ev.useGroups = false
  const strip = (g) => {
    g.deleteAttribute('uv')
    return g
  }
  const cap = new Brush(geo)
  const cavity = new Brush(
    strip(
      cavityGeometry(
        bot.map((v) => v - WALL),
        upper.map((v) => v - WALL * 1.6),
        ceil,
      ),
    ),
  )
  const stem = new Brush(strip(stemGeometry(STEM_BOT, ceil + 0.01).toNonIndexed()))
  for (const b of [cap, cavity, stem]) b.updateMatrixWorld()
  const out = ev.evaluate(ev.evaluate(cap, cavity, SUBTRACTION), stem, ADDITION).geometry
  console.log(
    `  khoét lòng + stem: trần ${ceil.toFixed(3)}u, ${out.getAttribute('position').count / 3} tam giác`,
  )
  return {
    position: out.getAttribute('position').array,
    normal: out.getAttribute('normal').array,
  }
}

/** tên file mjseabright `<sâu>x<rộng>` (×100) → hậu tố model: phím rộng `w225`, phím đứng `h200` */
const wideTag = (depth, width) => (Number(depth) > 100 ? `h${depth}` : `w${width}`)

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
  // phím 1u: cạnh dài = 0,92u; phím rộng / đứng (`-w225`, `-h200`...): cạnh ngắn (chiều 1u) = 0,92u, giữ đúng tỉ lệ
  const span = [max[0] - min[0], max[2] - min[2]]
  const scale = 0.92 / (/-(w|h)\d+$/.test(name) ? Math.min(...span) : Math.max(...span))
  const center = [(max[0] + min[0]) / 2, min[1], (max[2] + min[2]) / 2]
  const doc = new Document()
  const buffer = doc.createBuffer()
  const mat = doc
    .createMaterial('pbt')
    .setBaseColorFactor([0.92, 0.91, 0.88, 1])
    .setRoughnessFactor(0.62)
    .setDoubleSided(true)
  const mesh = doc.createMesh(name)
  let norm = parts.map((part) => {
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
    return { position: pos, normal: nor, index: part.index }
  })
  if (HOLLOW.has(name)) norm = [hollowWithStem(norm)]
  for (const part of norm) {
    const pos = part.position
    const nor = part.normal
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
// SA (mjseabright/keycaps, bản med): R1–R4, có lòng + stem MX; trục đứng z, mép sau ở +y
for (const row of [1, 2, 3, 4]) await convert(`sa-r${row}`, fromStl(`sa/r${row}-1u.stl`), 'z')
// SA phím rộng theo hàng (Tab / Caps / Shift / Enter / Backspace / mod hàng dưới 1.25u, space 6.25u / 7u ở R3) + phím đứng 2u (numpad)
for (const f of fs.readdirSync(path.join(SRC, 'sa'))) {
  const m = /^sa_R(\d)_(\d+)x(\d+)(?:_space)?\.stl$/.exec(f)
  if (m) await convert(`sa-r${m[1]}-${wideTag(m[2], m[3])}`, fromStl(`sa/${f}`), 'z')
}
// DCS: file Row_N_1u (trục đứng z, mép sau ở +y) = hàng R1 (hàng số) … R4 (Shift + hàng dưới)
for (const row of [1, 2, 3, 4])
  await convert(`dcs-r${row}`, fromObjAll(`dcs/row${row}-1u.obj`), 'z')
// DSA (mjseabright/keycaps, bản med): 1u + phím rộng 1.25–2.75u + phím đứng 2u, mọi hàng như nhau
await convert('dsa', fromStl('dsa/dsa_100x100.stl'), 'z')
for (const f of fs.readdirSync(path.join(SRC, 'dsa'))) {
  const m = /^dsa_(\d+)x(\d+)\.stl$/.exec(f)
  if (!m || f === 'dsa_100x100.stl') continue
  await convert(`dsa-${wideTag(m[1], m[2])}`, fromStl(`dsa/${f}`), 'z')
}
await convert('xda', fromObj('xda/keycaps.obj'))
await convert('mt3', fromStl('mt3/row0.stl'))
await convert('opk', await fromStep('opk/row3-u1.step'), 'z')
// occt-import-js giữ worker sống sau khi đọc STEP
process.exit(0)
