// Chuyển case bàn phím cộng đồng (MIT) sang GLB cho cảnh lắp ráp.
// Dùng: bun run convert:cases
//
// - Bakeneko 60 (kkatano/bakeneko-60): assets/community/bakeneko-60/case/case.step
// - Planck (MajorKoos/KBDParts): assets/community/planck/case/planck.stl
// CAD: mm, trục cao = trục có kích thước nhỏ nhất (STEP Bakeneko Z lên, STL Planck Y lên). Game: Y hướng lên, mm, tâm case ở gốc (x, z), đáy case ở y = 0,
// mặt thấp hơn (phía người gõ) quay về +z
import fs from 'node:fs'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'

const OUT = 'public/models/cases'
// turn: xoay thêm 180° quanh trục đứng. Planck là khay phẳng (2 mép cao bằng nhau) nên đoán mặt trước theo
// "phía thấp hơn" bị ngược → lỗ cổng USB-C ra trước phải; xoay lại để cổng ở sau bên trái như bàn thật
const SOURCES = {
  bakeneko60: { file: 'assets/community/bakeneko-60/case/case.step', kind: 'step' },
  planck: { file: 'assets/community/planck/case/planck.stl', kind: 'stl', turn: true },
}

/** STL nhị phân → mảng tam giác không chỉ số (position + pháp tuyến mặt) */
function readStl(file) {
  const buf = fs.readFileSync(file)
  const n = buf.readUInt32LE(80)
  const pos = new Float32Array(n * 9)
  const nor = new Float32Array(n * 9)
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50
    for (let v = 0; v < 3; v++)
      for (let a = 0; a < 3; a++) {
        pos[i * 9 + v * 3 + a] = buf.readFloatLE(o + 12 + v * 12 + a * 4)
        nor[i * 9 + v * 3 + a] = buf.readFloatLE(o + a * 4)
      }
  }
  return { pos, nor, idx: null }
}

async function readStep(files) {
  const occt = await occtimportjs()
  const meshes = []
  for (const file of [files].flat()) {
    const res = occt.ReadStepFile(new Uint8Array(fs.readFileSync(file)), null)
    if (!res.success) throw new Error(`Không đọc được ${file}`)
    meshes.push(...res.meshes)
  }
  const pos = []
  const nor = []
  const idx = []
  for (const m of meshes) {
    const base = pos.length / 3
    pos.push(...m.attributes.position.array)
    nor.push(...m.attributes.normal.array)
    for (const i of m.index.array) idx.push(base + i)
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint32Array(idx) }
}

fs.mkdirSync(OUT, { recursive: true })
for (const [id, src] of Object.entries(SOURCES)) {
  const { pos, nor, idx } = src.kind === 'stl' ? readStl(src.file) : await readStep(src.file)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], pos[i + a])
      max[a] = Math.max(max[a], pos[i + a])
    }
  // trục cao (up) = kích thước nhỏ nhất; 2 trục còn lại: trục dài hơn là ngang (x)
  const ext = [0, 1, 2].map((a) => max[a] - min[a])
  const up = ext.indexOf(Math.min(...ext))
  const [ax, ad] = [0, 1, 2].filter((a) => a !== up).sort((a, b) => ext[b] - ext[a])
  const cx = (min[ax] + max[ax]) / 2
  const cy = (min[ad] + max[ad]) / 2
  // mặt nào thấp hơn (đo đỉnh cao nhất ở nửa y âm / dương) thì là phía người gõ
  let hiNeg = -Infinity
  let hiPos = -Infinity
  for (let i = 0; i < pos.length; i += 3)
    if (pos[i + ad] < cy) hiNeg = Math.max(hiNeg, pos[i + up])
    else hiPos = Math.max(hiPos, pos[i + up])
  // CAD y âm thấp hơn → đưa về +z; `turn` đảo cả x lẫn z = xoay 180° (không phải lật gương)
  const flip = (hiNeg < hiPos ? -1 : 1) * (src.turn ? -1 : 1)
  const P = new Float32Array(pos.length)
  const N = new Float32Array(nor.length)
  // phép đổi trục (ax, up, ad) → (x, y, z) là hoán vị lẻ thì là ảnh gương: đảo dấu x để thành phép xoay thật
  // (giữ đúng bên trái / phải của case, mặt tam giác không bị lật chiều)
  const perm = [ax, up, ad]
  const odd = ((perm[0] > perm[1]) + (perm[0] > perm[2]) + (perm[1] > perm[2])) % 2
  const mx = odd ? -flip : flip
  for (let i = 0; i < pos.length; i += 3) {
    P[i] = (pos[i + ax] - cx) * mx
    P[i + 1] = pos[i + up] - min[up]
    P[i + 2] = (pos[i + ad] - cy) * flip
    N[i] = nor[i + ax] * mx
    N[i + 1] = nor[i + up]
    N[i + 2] = nor[i + ad] * flip
  }
  const tri = idx ?? Uint32Array.from({ length: P.length / 3 }, (_, i) => i)

  const doc = new Document()
  const buffer = doc.createBuffer()
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(tri).setBuffer(buffer))
  doc
    .createScene(id)
    .addChild(doc.createNode('case').setMesh(doc.createMesh('case').addPrimitive(prim)))
  const out = `${OUT}/${id}.glb`
  await new NodeIO().write(out, doc)
  console.log(
    `✔ ${out}: ${(max[0] - min[0]).toFixed(1)} × ${(max[1] - min[1]).toFixed(1)} × ${(max[2] - min[2]).toFixed(1)}mm,`,
    `${tri.length / 3} tam giác, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`,
  )
}
// occt giữ tiến trình sống sau khi đọc xong
process.exit(0)
