// Housing stab clip-in (Cherry, Sketchfab) + plate-mount (Sketchfab) → GLB chỉ 1 node `housing`, cùng hệ với
// public/models/stab/stab.glb (screw-in CAD): mm, gốc = tâm slider, y = 0 là mặt PCB (plate-mount: chỗ đặt trên PCB),
// trục x ngang, z dọc phím, dây ở phía +z. Slider + dây vẫn dùng CAD của stab.glb.
// Chạy: node scripts/convert-stab-variants.mjs [thư mục model gốc] (mặc định assets/stab/variants)
import { Document, NodeIO } from '@gltf-transform/core'
import path from 'node:path'

const SRC = process.argv[2] ?? 'assets/stab/variants'
const OUT = 'public/models/stab'
const io = new NodeIO()

/** đọc vị trí + pháp tuyến + chỉ số của 1 mesh (gộp các primitive) */
function meshData(doc, name) {
  const node = doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === name)
  if (!node) throw new Error(`không thấy node ${name}`)
  const pos = [],
    nor = [],
    idx = []
  for (const p of node.getMesh().listPrimitives()) {
    const a = p.getAttribute('POSITION').getArray()
    const n = p.getAttribute('NORMAL')?.getArray()
    const base = pos.length / 3
    pos.push(...a)
    nor.push(...(n ?? new Float32Array(a.length)))
    const ind =
      p.getIndices()?.getArray() ??
      a
        .map((_, i) => i)
        .filter((i) => i % 3 === 0)
        .map((i) => i / 3)
    for (const i of ind) idx.push(i + base)
  }
  return { pos, nor, idx }
}

/** giữ các tam giác có cả 3 đỉnh thoả `keep(x, y, z)` (tách 1 housing khỏi mesh chứa cả 2) */
function filterTris({ pos, nor, idx }, keep) {
  const map = new Map(),
    P = [],
    N = [],
    I = []
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]]
    if (!tri.every((v) => keep(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]))) continue
    for (const v of tri) {
      if (!map.has(v)) {
        map.set(v, P.length / 3)
        P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])
        N.push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2])
      }
      I.push(map.get(v))
    }
  }
  return { pos: P, nor: N, idx: I }
}

/** đổi mỗi đỉnh qua `fp` (vị trí) / `fn` (pháp tuyến) */
function transform({ pos, nor, idx }, fp, fn) {
  const P = [],
    N = []
  for (let i = 0; i < pos.length; i += 3) {
    P.push(...fp(pos[i], pos[i + 1], pos[i + 2]))
    const n = fn(nor[i], nor[i + 1], nor[i + 2])
    const l = Math.hypot(...n) || 1
    N.push(n[0] / l, n[1] / l, n[2] / l)
  }
  return { pos: P, nor: N, idx }
}

function bbox(pos) {
  const mn = [1e9, 1e9, 1e9],
    mx = [-1e9, -1e9, -1e9]
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      mn[k] = Math.min(mn[k], pos[i + k])
      mx[k] = Math.max(mx[k], pos[i + k])
    }
  return { mn, mx }
}

async function write(file, data) {
  const doc = new Document()
  const buf = doc.createBuffer()
  const prim = doc
    .createPrimitive()
    .setAttribute(
      'POSITION',
      doc.createAccessor().setType('VEC3').setArray(new Float32Array(data.pos)).setBuffer(buf),
    )
    .setAttribute(
      'NORMAL',
      doc.createAccessor().setType('VEC3').setArray(new Float32Array(data.nor)).setBuffer(buf),
    )
    .setIndices(
      doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(data.idx)).setBuffer(buf),
    )
  const node = doc.createNode('housing').setMesh(doc.createMesh('housing').addPrimitive(prim))
  doc.createScene().addChild(node)
  await io.write(file, doc)
  const { mn, mx } = bbox(data.pos)
  console.log(
    file,
    `${data.idx.length / 3} tam giác`,
    'min',
    mn.map((v) => v.toFixed(2)).join(','),
    'max',
    mx.map((v) => v.toFixed(2)).join(','),
  )
}

// ---------- clip-in: housing Cherry trái trong mesh có rig `Object_19` (tư thế gốc) ----------
{
  const doc = await io.read(path.join(SRC, 'cherry_mx_stabilizer.glb'))
  const left = filterTris(meshData(doc, 'Object_19'), (x) => x < 0)
  // tâm slider = tâm slider trái (Object_18 trái: x −21.05…−15.55, z 21.75…32.11)
  const cx = -18.3,
    cz = 26.93
  // đáy chân housing y 0.18 → chân lòi dưới PCB 2.7mm như CAD screw-in
  const S = 0.8,
    y0 = 0.18,
    pin = 2.7
  await write(
    path.join(OUT, 'stab-clip.glb'),
    transform(
      left,
      (x, y, z) => [(x - cx) * S, (y - y0) * S - pin, (z - cz) * S],
      (x, y, z) => [x, y, z],
    ),
  )
}

// ---------- plate-mount: housing `Object_5` (phần trên) + thân dưới trong `Object_6` + slider `Object_2` ----------
// (Z-up, đơn vị ≈ 4.306mm). Object_6 chứa thân dưới của CẢ 2 housing + dây (không riêng dây): chỉ lấy tam giác nằm trong
// bề ngang housing trái, không thì housing xuất ra thủng mất thành dưới
{
  const doc = await io.read(path.join(SRC, 'keyboard_plate_mounted_stabilizer.glb'))
  const top = meshData(doc, 'Object_5')
  const body = meshData(doc, 'Object_6')
  const hb = bbox(top.pos)
  const lower = filterTris(body, (x) => x > hb.mn[0] - 0.1 && x < hb.mx[0] + 0.1)
  const base = top.pos.length / 3
  const housing = {
    pos: [...top.pos, ...lower.pos],
    nor: [...top.nor, ...lower.nor],
    idx: [...top.idx, ...lower.idx.map((i) => i + base)],
  }
  const stem = bbox(meshData(doc, 'Object_2').pos)
  const wire = bbox(body.pos)
  const cx = (stem.mn[0] + stem.mx[0]) / 2,
    cy = (stem.mn[1] + stem.mx[1]) / 2
  // 2 housing cách nhau 5.545 đơn vị = 23.876mm (stab 2u) → 4.306mm / đơn vị
  const S = 23.876 / 5.545
  // Z-up → Y-up: (x, y, z) → (x, z, −y); dây phải ở phía +z như CAD, ngược thì xoay 180° quanh trục đứng
  const wireSide = (wire.mn[1] + wire.mx[1]) / 2 - cy
  const flip = wireSide > 0 ? -1 : 1
  await write(
    path.join(OUT, 'stab-plate.glb'),
    transform(
      housing,
      // gốc stab plate-mount nằm trên PCB 1.5mm (KeySlot PLATE_STAB_Y) → hạ 1.5mm cho đáy housing chạm PCB
      (x, y, z) => [(x - cx) * S * flip, z * S - 1.5, -(y - cy) * S * flip],
      (x, y, z) => [x * flip, z, -y * flip],
    ),
  )
}
