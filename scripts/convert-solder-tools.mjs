// Chuyển model đồ hàn tải về sang GLB cho bàn hàn.
// Dùng: bun run convert:solder-tools
//
// - assets/tools/solder/Sodering_Iron.obj (Blender, không kèm .mtl): trạm hàn + mỏ hàn + giá lò xo + dây.
//   Mỗi object OBJ thành 1 node (tô màu theo tên), bỏ tấm sàn "Plane". Đơn vị giữ nguyên, Y lên.
// - assets/tools/solder/soldering-brass-sponge-stand.3mf (Bambu Studio, mm, Z lên): giá bùi nhùi đồng,
//   2 phần in rời: object_3 (đế có vành khía) và object_4 (nắp vòm). Mỗi phần căn tâm, đáy ở y = 0
import fs from 'node:fs'
import { unzipSync, strFromU8 } from 'fflate'
import { Document, NodeIO } from '@gltf-transform/core'

const SRC = 'assets/tools/solder'
const OUT = 'public/models/tools/solder'

/** màu theo tên object OBJ (file gốc không có vật liệu) */
const OBJ_COLORS = [
  [/Soldering_Iron/i, [0.85, 0.2, 0.15]],
  [/Sphere/i, [0.75, 0.75, 0.78]],
  [/NurbsPath|Torus/i, [0.05, 0.05, 0.06]],
  [/Spring/i, [0.75, 0.76, 0.8]],
  [/Cube\.00[23]/i, [0.1, 0.35, 0.4]],
  [/Station|Cube/i, [0.17, 0.19, 0.22]],
  [/Cylinder/i, [0.55, 0.57, 0.6]],
]

function addMesh(doc, buffer, scene, name, pos, idx, rgb, metal = 0.2) {
  // pháp tuyến phẳng theo mặt (tách đỉnh) cho mặt cứng sắc nét
  const P = new Float32Array(idx.length * 3)
  const N = new Float32Array(idx.length * 3)
  for (let t = 0; t < idx.length; t += 3) {
    const v = [0, 1, 2].map((k) => [0, 1, 2].map((a) => pos[idx[t + k] * 3 + a]))
    const u = v[1].map((x, a) => x - v[0][a])
    const w = v[2].map((x, a) => x - v[0][a])
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const l = Math.hypot(...n) || 1
    for (let k = 0; k < 3; k++)
      for (let a = 0; a < 3; a++) {
        P[(t + k) * 3 + a] = v[k][a]
        N[(t + k) * 3 + a] = n[a] / l
      }
  }
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer))
    .setMaterial(
      doc
        .createMaterial(name)
        .setBaseColorFactor([...rgb.map((c) => Math.pow(c, 2.2)), 1])
        .setMetallicFactor(metal)
        .setRoughnessFactor(0.5)
        // mặt OBJ (dây cáp) quay lộn xộn: vẽ 2 mặt cho khỏi bị đứt khúc
        .setDoubleSided(true),
    )
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
}

fs.mkdirSync(OUT, { recursive: true })

// ---------- OBJ: trạm hàn + mỏ hàn ----------
{
  const lines = fs.readFileSync(`${SRC}/Sodering_Iron.obj`, 'utf8').split('\n')
  const V = []
  const objs = []
  let cur = null
  for (const l of lines) {
    if (l.startsWith('o ')) objs.push((cur = { name: l.slice(2).trim(), faces: [] }))
    else if (l.startsWith('v ')) V.push(l.split(/\s+/).slice(1, 4).map(Number))
    else if (l.startsWith('f ') && cur) {
      const f = l
        .split(/\s+/)
        .slice(1)
        .filter(Boolean)
        .map((s) => parseInt(s.split('/')[0], 10) - 1)
      for (let i = 1; i < f.length - 1; i++) cur.faces.push(f[0], f[i], f[i + 1])
    }
  }
  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene()
  for (const o of objs) {
    if (o.name === 'Plane' || !o.faces.length) continue
    // chỉ số OBJ là toàn cục: đánh lại chỉ số trong object
    const map = new Map()
    const pos = []
    const idx = o.faces.map((g) => {
      if (!map.has(g)) {
        map.set(g, pos.length / 3)
        pos.push(...V[g])
      }
      return map.get(g)
    })
    const rgb = OBJ_COLORS.find(([re]) => re.test(o.name))?.[1] ?? [0.5, 0.5, 0.5]
    addMesh(
      doc,
      buffer,
      scene,
      o.name,
      pos,
      idx,
      rgb,
      /Spring|Sphere|Cylinder/.test(o.name) ? 0.8 : 0.15,
    )
    console.log(`obj ${o.name}: ${o.faces.length / 3} tam giác`)
  }
  await new NodeIO().write(`${OUT}/iron-station.glb`, doc)

  // mỏ hàn của trạm tách riêng (cầm trên tay khi hàn): mũi ở gốc, cán hướng +y
  const IRON = ['Soldering_Iron_Cylinder', 'Sphere.003']
  const parts = objs.filter((o) => IRON.includes(o.name))
  const pts = parts.flatMap((o) => o.faces.map((g) => V[g]))
  // trục thân = hướng dài nhất (tâm → điểm xa nhất), mũi ở phía x lớn
  const c = [0, 1, 2].map((a) => pts.reduce((s, p) => s + p[a], 0) / pts.length)
  const far = pts.reduce((b, p) =>
    Math.hypot(...p.map((x, a) => x - c[a])) > Math.hypot(...b.map((x, a) => x - c[a])) ? p : b,
  )
  let d = far.map((x, a) => x - c[a])
  if (d[0] < 0) d = d.map((x) => -x)
  const dl = Math.hypot(...d)
  d = d.map((x) => x / dl)
  const tip = pts.reduce((b, p) =>
    p.reduce((s, x, a) => s + (x - c[a]) * d[a], 0) >
    b.reduce((s, x, a) => s + (x - c[a]) * d[a], 0)
      ? p
      : b,
  )
  // xoay: -d (mũi → cán) thành +y, theo công thức Rodrigues
  const from = d.map((x) => -x)
  const k = [from[2], 0, -from[0]] // from × (0,1,0)
  const sin = Math.hypot(...k)
  const cos = from[1]
  const kn = sin ? k.map((x) => x / sin) : [1, 0, 0]
  const turn = (p) => {
    const dot = kn.reduce((s, x, a) => s + x * p[a], 0)
    const cr = [
      kn[1] * p[2] - kn[2] * p[1],
      kn[2] * p[0] - kn[0] * p[2],
      kn[0] * p[1] - kn[1] * p[0],
    ]
    return p.map((x, a) => x * cos + cr[a] * sin + kn[a] * dot * (1 - cos))
  }
  // kiểm tra: thân (tâm) phải nằm trên mũi, sai dấu thì lật 180° quanh x
  const up = turn(c.map((x, a) => x - tip[a]))[1] > 0
  const rot = (p) => {
    const r = turn(p)
    return up ? r : [r[0], -r[1], -r[2]]
  }
  const ironDoc = new Document()
  const ironBuf = ironDoc.createBuffer()
  const ironScene = ironDoc.createScene()
  // thân kim loại mảnh phía mũi (dưới ~40% chiều dài) tô màu thép, phần trên là cán nhựa đỏ
  const STEEL_Y = dl * 2 * 0.4
  for (const o of parts) {
    const map = new Map()
    const pos = []
    const idx = o.faces.map((g) => {
      if (!map.has(g)) {
        map.set(g, pos.length / 3)
        pos.push(...rot(V[g].map((x, a) => x - tip[a])))
      }
      return map.get(g)
    })
    const rgb = OBJ_COLORS.find(([re]) => re.test(o.name))?.[1] ?? [0.5, 0.5, 0.5]
    if (/Sphere/.test(o.name)) {
      addMesh(ironDoc, ironBuf, ironScene, o.name, pos, idx, rgb, 0.8)
      continue
    }
    const steel = []
    const grip = []
    for (let t = 0; t < idx.length; t += 3) {
      const y = (pos[idx[t] * 3 + 1] + pos[idx[t + 1] * 3 + 1] + pos[idx[t + 2] * 3 + 1]) / 3
      ;(y < STEEL_Y ? steel : grip).push(idx[t], idx[t + 1], idx[t + 2])
    }
    addMesh(ironDoc, ironBuf, ironScene, `${o.name}_steel`, pos, steel, [0.72, 0.74, 0.78], 0.9)
    addMesh(ironDoc, ironBuf, ironScene, o.name, pos, grip, rgb, 0.15)
  }
  await new NodeIO().write(`${OUT}/iron-pro.glb`, ironDoc)
  // Use the same tip/grip split for the iron resting on the station.
  const stationIron = scene
    .listChildren()
    .find((node) => node.getName() === 'Soldering_Iron_Cylinder')
  const old = stationIron.getMesh().listPrimitives()[0]
  const positions = old.getAttribute('POSITION').getArray()
  const steelIndices = [],
    gripIndices = []
  for (let i = 0; i < positions.length / 3; i += 3) {
    const y =
      [0, 1, 2].reduce(
        (sum, k) => sum + rot([0, 1, 2].map((a) => positions[(i + k) * 3 + a] - tip[a]))[1],
        0,
      ) / 3
    ;(y < STEEL_Y ? steelIndices : gripIndices).push(i, i + 1, i + 2)
  }
  const steelMat = doc
    .createMaterial('Iron steel tip')
    .setBaseColorFactor([0.48, 0.51, 0.57, 1])
    .setMetallicFactor(0.9)
    .setRoughnessFactor(0.3)
    .setDoubleSided(true)
  stationIron.getMesh().removePrimitive(old)
  for (const [indices, mat] of [
    [steelIndices, steelMat],
    [gripIndices, old.getMaterial()],
  ]) {
    stationIron.getMesh().addPrimitive(
      doc
        .createPrimitive()
        .setAttribute('POSITION', old.getAttribute('POSITION'))
        .setAttribute('NORMAL', old.getAttribute('NORMAL'))
        .setIndices(
          doc
            .createAccessor()
            .setType('SCALAR')
            .setArray(new Uint32Array(indices))
            .setBuffer(buffer),
        )
        .setMaterial(mat),
    )
  }
  let floor = Infinity
  for (const node of scene.listChildren())
    for (const p of node.getMesh().listPrimitives())
      floor = Math.min(floor, p.getAttribute('POSITION').getMin([])[1])
  for (const node of scene.listChildren()) node.setTranslation([0, -floor + 0.03, 0])
  await new NodeIO().write(`${OUT}/iron-station.glb`, doc)
  console.log(`iron-pro: dài ${(dl * 2).toFixed(2)} đơn vị OBJ`)
}

// ---------- 3MF: giá bùi nhùi đồng ----------
{
  const zip = unzipSync(fs.readFileSync(`${SRC}/soldering-brass-sponge-stand.3mf`))
  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene()
  for (const [file, name] of [
    ['3D/Objects/object_3.model', 'base'],
    ['3D/Objects/object_4.model', 'cover'],
  ]) {
    const xml = strFromU8(zip[file])
    const pos = []
    for (const m of xml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g))
      // Z lên (in 3D) → Y lên, giữ chiều tay phải
      pos.push(+m[1], +m[3], -m[2])
    const idx = []
    for (const m of xml.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g))
      idx.push(+m[1], +m[2], +m[3])
    // căn tâm theo x, z và đặt đáy ở y = 0
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < pos.length; i += 3)
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], pos[i + a])
        max[a] = Math.max(max[a], pos[i + a])
      }
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] -= (min[0] + max[0]) / 2
      pos[i + 1] -= min[1]
      pos[i + 2] -= (min[2] + max[2]) / 2
    }
    addMesh(doc, buffer, scene, name, pos, idx, [0.22, 0.24, 0.27], 0.1)
    console.log(
      `3mf ${name}: ${idx.length / 3} tam giác, ${(max[0] - min[0]).toFixed(1)}×${(max[1] - min[1]).toFixed(1)}×${(max[2] - min[2]).toFixed(1)}mm`,
    )
  }
  await new NodeIO().write(`${OUT}/sponge-stand.glb`, doc)
}
