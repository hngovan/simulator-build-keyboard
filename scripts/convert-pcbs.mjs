// Chuyển PCB bàn phím của Mechlovin (github.com/mechlovin/PCB) sang GLB nhẹ để chụp ảnh sản phẩm Shopii.
// Dùng: bun run convert:pcbs
//
// STEP gốc rất nặng (Zed60 HS > 1 triệu tam giác vì socket hotswap) nên:
// - gộp mesh theo màu CAD (mỗi màu 1 primitive),
// - giảm lưới bằng gom đỉnh theo ô lưới CELL mm (ảnh sản phẩm 360px ≈ 0.9mm/px nên không thấy khác),
//   chỉ gộp đỉnh của các mặt cùng hướng để giữ cạnh sắc khi xem 3D,
// - xoay về hệ game: Y lên (mặt có linh kiện quay lên), cạnh dài theo x, tâm ở gốc, đáy ở y = 0 (mm).
import fs from 'node:fs'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'

const SRC = 'assets/community/mechlovin-pcb'
const OUT = 'public/models/pcbs'
const CELL = 0.7

/** id → file STEP + layout; file có "HS" là hotswap, còn lại PCB hàn */
const SOURCES = {
  common60: { file: '60-PCB/Common60/PCB-Common60.step', layout: '60' },
  hannah60: { file: '60-PCB/Hannah60/Hannah60-DuckEagle.step', layout: '60' },
  jay60: { file: '60-PCB/Jay60/Rev1/PCB-Jay60-Rev1-30102021.step', layout: '60' },
  zed60: { file: '60-PCB/Zed60/Step-files/Zed60-rev1-22032023.step', layout: '60' },
  'zed60-hs': {
    file: '60-PCB/Zed60/Step-files/MKP-ZED60-HS_R1.2-C-JST_SUR-04082026.step',
    layout: '60',
  },
  hannah65: { file: 'Hannah65/Hannah65-Rev1.step', layout: '65' },
  kay65: { file: 'Kay65/Kay65_Rev1_11052022.step', layout: '65' },
  zed65: { file: 'Zed65/Rev1/Step-files/Zed65-Rev1-North-USB-TOP-16062023.step', layout: '65' },
  infinity87: {
    file: 'TKL PCB - Infinity Series/Infinity87/Step-files/Infinity87.step',
    layout: 'tkl',
  },
  'infinity87-hs': {
    file: 'TKL PCB - Infinity Series/Infinity87/Step-files/MKP-IF87-3.1-HS-28052026.STEP',
    layout: 'tkl',
  },
  infinity88: {
    file: 'TKL PCB - Infinity Series/Infinity88/Step-files/Infinity88.step',
    layout: 'tkl',
  },
  adelais: { file: 'Adelais/Step-files/Adelais_rev4.step', layout: 'alice' },
  'adelais-hs': { file: 'Adelais/Step-files/Adelais-Rev5-HS-SUR-05102026.step', layout: 'alice' },
}

const only = process.argv.slice(2)
const occt = await occtimportjs()
fs.mkdirSync(OUT, { recursive: true })
const summary = {}

for (const [id, src] of Object.entries(SOURCES)) {
  if (only.length && !only.includes(id)) continue
  const t0 = Date.now()
  const res = occt.ReadStepFile(new Uint8Array(fs.readFileSync(`${SRC}/${src.file}`)), null)
  if (!res.success) throw new Error(`Không đọc được ${src.file}`)

  // tam giác theo màu (màu mặt brep nếu có, không thì màu mesh)
  const groups = new Map()
  const colorKey = (c) => (c ? c.map((x) => Math.round(x * 20) / 20).join(',') : '0.5,0.5,0.5')
  for (const m of res.meshes) {
    const pos = m.attributes.position.array
    const idx = m.index.array
    const faces = m.brep_faces?.length
      ? m.brep_faces
      : [{ first: 0, last: idx.length / 3 - 1, color: null }]
    for (const f of faces) {
      const key = colorKey(f.color ?? m.color)
      if (!groups.has(key)) groups.set(key, [])
      const out = groups.get(key)
      for (let t = f.first; t <= f.last; t++)
        for (let k = 0; k < 3; k++) {
          const i = idx[t * 3 + k] * 3
          out.push(pos[i], pos[i + 1], pos[i + 2])
        }
    }
  }

  // khối bao chung → trục: cao = nhỏ nhất, ngang = dài nhất
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const tri of groups.values())
    for (let i = 0; i < tri.length; i += 3)
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], tri[i + a])
        max[a] = Math.max(max[a], tri[i + a])
      }
  const ext = [0, 1, 2].map((a) => max[a] - min[a])
  const up = ext.indexOf(Math.min(...ext))
  const [ax, az] = [0, 1, 2].filter((a) => a !== up).sort((a, b) => ext[b] - ext[a])
  const mid = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
  // mặt có linh kiện (nhiều tam giác lệch khỏi tấm mạch hơn) quay lên
  let above = 0
  let below = 0
  for (const tri of groups.values())
    for (let i = 0; i < tri.length; i += 3) {
      if (tri[i + up] > mid[up]) above++
      else below++
    }
  const flip = above >= below ? 1 : -1
  const toGame = (p, i) => [
    p[i + ax] - mid[ax],
    flip * (p[i + up] - mid[up]),
    // giữ ảnh không bị lật gương: lật trục cao thì lật cả trục sâu
    -flip * (p[i + az] - mid[az]),
  ]

  const doc = new Document()
  const buffer = doc.createBuffer()
  const mesh = doc.createMesh(id)
  let tris = 0
  let lowY = Infinity
  const prims = []
  for (const [key, tri] of groups) {
    // gom đỉnh theo ô lưới, bỏ tam giác suy biến / trùng
    const cells = new Map()
    const P = []
    const I = []
    const seen = new Set()
    // đỉnh = ô lưới + hướng mặt (lượng tử ~20°): chỉ gộp đỉnh của các mặt cùng hướng, để cạnh sắc
    // (mặt mạch ↔ thành lỗ khoan) không bị trung bình pháp tuyến thành bóng loang tam giác
    const snap = (p) => p.map((x) => Math.round(x / CELL) * CELL)
    const vert = (p, n) => {
      const c = `${p.map((x) => Math.round(x / CELL)).join(',')}|${n.map((x) => Math.round(x * 3)).join(',')}`
      let v = cells.get(c)
      if (v === undefined) {
        v = P.length / 3
        cells.set(c, v)
        P.push(...p)
        lowY = Math.min(lowY, p[1])
      }
      return v
    }
    for (let i = 0; i < tri.length; i += 9) {
      const [pa, pb, pc] = [i, i + 3, i + 6].map((j) => snap(toGame(tri, j)))
      const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]]
      const w = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]]
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
      const len = Math.hypot(...n)
      // tam giác suy biến sau khi gom về lưới
      if (len < 1e-9) continue
      const nn = n.map((x) => x / len)
      const a = vert(pa, nn)
      const b = vert(pb, nn)
      const c = vert(pc, nn)
      if (a === b || b === c || a === c) continue
      const k = [a, b, c].sort((x, y) => x - y).join(',')
      if (seen.has(k)) continue
      seen.add(k)
      I.push(a, b, c)
    }
    if (!I.length) continue
    tris += I.length / 3
    prims.push({ key, P, I })
  }
  for (const { key, P, I } of prims) {
    for (let i = 1; i < P.length; i += 3) P[i] -= lowY
    // pháp tuyến đỉnh (cộng theo diện tích mặt)
    const N = new Float32Array(P.length)
    for (let t = 0; t < I.length; t += 3) {
      const [a, b, c] = [I[t] * 3, I[t + 1] * 3, I[t + 2] * 3]
      const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]]
      const w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
      for (const v of [a, b, c]) for (let k = 0; k < 3; k++) N[v + k] += n[k]
    }
    for (let i = 0; i < N.length; i += 3) {
      const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1
      N[i] /= l
      N[i + 1] /= l
      N[i + 2] /= l
    }
    // màu CAD là sRGB, glTF cần màu tuyến tính
    const rgb = key.split(',').map((c) => Math.pow(Number(c), 2.2))
    const material = doc
      .createMaterial(key)
      .setBaseColorFactor([...rgb, 1])
      .setMetallicFactor(rgb[0] > 0.6 && rgb[1] > 0.6 ? 0.8 : 0.1)
      .setRoughnessFactor(0.55)
    const prim = doc
      .createPrimitive()
      .setAttribute(
        'POSITION',
        doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buffer),
      )
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer))
      .setIndices(
        doc
          .createAccessor()
          .setType('SCALAR')
          .setArray(P.length / 3 > 65535 ? new Uint32Array(I) : new Uint16Array(I))
          .setBuffer(buffer),
      )
      .setMaterial(material)
    mesh.addPrimitive(prim)
  }
  doc.createScene().addChild(doc.createNode(id).setMesh(mesh))
  await new NodeIO().write(`${OUT}/${id}.glb`, doc)
  const size = fs.statSync(`${OUT}/${id}.glb`).size
  summary[id] = { w: +ext[ax].toFixed(1), d: +ext[az].toFixed(1) }
  console.log(
    `${id}: ${res.meshes.length} mesh → ${prims.length} màu, ${tris} tam giác, ${(size / 1024).toFixed(0)} KB, ${ext[ax].toFixed(0)}×${ext[az].toFixed(0)}mm (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
  )
}
console.log(JSON.stringify(summary))
