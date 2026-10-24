import fs from 'node:fs'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'

const source = 'assets/user-tools/desolder-pump/pump.step'
const occt = await occtimportjs()
const result = occt.ReadStepFile(new Uint8Array(fs.readFileSync(source)), null)
if (!result.success) throw new Error('Cannot read solder pump STEP')
const doc = new Document(),
  buffer = doc.createBuffer(),
  scene = doc.createScene()
const all = result.meshes.flatMap((m) => m.attributes.position.array)
const min = [Infinity, Infinity, Infinity],
  max = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < all.length; i++) {
  min[i % 3] = Math.min(min[i % 3], all[i])
  max[i % 3] = Math.max(max[i % 3], all[i])
}
const scale = 3 / (max[2] - min[2])
for (const m of result.meshes) {
  const p = m.attributes.position.array,
    n = m.attributes.normal?.array
  const positions = [],
    normals = []
  for (let i = 0; i < p.length; i += 3) {
    positions.push(
      (p[i] - (min[0] + max[0]) / 2) * scale,
      (max[2] - p[i + 2]) * scale,
      (p[i + 1] - (min[1] + max[1]) / 2) * scale,
    )
    if (n) normals.push(n[i], -n[i + 2], n[i + 1])
  }
  const plastic = /Seal|Cap|Trigger|Button|Sucker Shell/i.test(m.name)
  const color = /Sucker Shell/i.test(m.name)
    ? [0.8, 0.82, 0.79, 1]
    : plastic
      ? [0.025, 0.045, 0.065, 1]
      : [0.13, 0.4, 0.56, 1]
  const material = doc
    .createMaterial(m.name)
    .setBaseColorFactor(color)
    .setMetallicFactor(plastic ? 0.05 : 0.8)
    .setRoughnessFactor(0.35)
  const prim = doc
    .createPrimitive()
    .setAttribute(
      'POSITION',
      doc.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer),
    )
    .setIndices(
      doc
        .createAccessor()
        .setType('SCALAR')
        .setArray(new Uint32Array(m.index.array))
        .setBuffer(buffer),
    )
    .setMaterial(material)
  if (n)
    prim.setAttribute(
      'NORMAL',
      doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buffer),
    )
  scene.addChild(doc.createNode(m.name).setMesh(doc.createMesh(m.name).addPrimitive(prim)))
}
fs.mkdirSync('public/models/solder', { recursive: true })
await new NodeIO().write('public/models/solder/desolder-pump.glb', doc)
console.log('Converted pump: nozzle at origin, handle along +Y, length 3 units')
