// Chuyển model switch Kailh Choc V2 red (linear) từ STEP sang GLB cho bàn lube.
// Dùng: bun run convert:choc
//
// Nguồn: assets/community/switches-koktoh/choc-v2/red.step (koktoh, CC BY-NC-SA 4.0 — chỉ dùng phi thương mại)
// CAD: Z hướng lên, mm. Game: Y hướng lên, mm, gốc ở tâm switch (x, z), Y giữ nguyên độ cao gốc của CAD.
// Gộp chi tiết thành 4 node: bottom (đế + lá đồng + chân), top, stem, spring
import fs from 'node:fs'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'

const SRC = 'assets/community/switches-koktoh/choc-v2/red.step'
const OUT = 'public/models/choc-red.glb'
const GROUP = {
  bottom: 'bottom',
  contact: 'bottom',
  pin1: 'bottom',
  pin2: 'bottom',
  pin3: 'bottom',
  top: 'top',
  stem: 'stem',
  shrunken_spring: 'spring',
}

const occt = await occtimportjs()
const res = occt.ReadStepFile(new Uint8Array(fs.readFileSync(SRC)), null)
if (!res.success) throw new Error('Không đọc được file STEP')

const parts = {}
for (const m of res.meshes) {
  const g = GROUP[m.name]
  if (!g) throw new Error(`Chi tiết lạ: ${m.name}`)
  ;(parts[g] ??= []).push(m)
}

const doc = new Document()
const buffer = doc.createBuffer()
const scene = doc.createScene('choc-red')
for (const [name, meshes] of Object.entries(parts)) {
  // gộp các mesh cùng nhóm, đổi trục Z-up → Y-up (x, z, -y)
  const pos = []
  const nor = []
  const idx = []
  for (const m of meshes) {
    const base = pos.length / 3
    const p = m.attributes.position.array
    const n = m.attributes.normal?.array
    for (let i = 0; i < p.length; i += 3) {
      pos.push(p[i], p[i + 2], -p[i + 1])
      if (n) nor.push(n[i], n[i + 2], -n[i + 1])
    }
    for (const i of m.index.array) idx.push(base + i)
  }
  const prim = doc
    .createPrimitive()
    .setAttribute(
      'POSITION',
      doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer),
    )
    .setIndices(
      doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer),
    )
  if (nor.length === pos.length)
    prim.setAttribute(
      'NORMAL',
      doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer),
    )
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
  const ys = pos.filter((_, i) => i % 3 === 1)
  console.log(
    name.padEnd(7),
    `y ${Math.min(...ys).toFixed(2)} .. ${Math.max(...ys).toFixed(2)}`,
    `${idx.length / 3} tam giác`,
  )
}
await new NodeIO().write(OUT, doc)
console.log(`Đã ghi ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
