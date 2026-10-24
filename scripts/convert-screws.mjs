// Chuyển các ốc CC0 STEP từ Innerscene sang GLB cho cảnh lắp ráp.
// Dùng: node scripts/convert-screws.mjs
// CAD: Z hướng lên, mm, đỉnh đầu ốc ở Z max.
// Game: Y hướng lên, mm, đỉnh đầu ốc ở Y = 0; component nhân MM.
import fs from 'node:fs'
import path from 'node:path'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'

const INPUT = 'assets/community/screws-innerscene'
const OUTPUT = 'public/models/screws'
const NAMES = ['countersunk-m3x10', 'socket-cap-m2x6', 'button-head-m3x8']
const occt = await occtimportjs()
const io = new NodeIO()
fs.mkdirSync(OUTPUT, { recursive: true })

for (const name of NAMES) {
  const source = path.join(INPUT, `${name}.step`)
  const result = occt.ReadStepFile(new Uint8Array(fs.readFileSync(source)), null)
  if (!result.success || !result.meshes.length) throw new Error(`Không đọc được ${source}`)
  let top = -Infinity
  for (const mesh of result.meshes) {
    const p = mesh.attributes.position.array
    for (let i = 2; i < p.length; i += 3) top = Math.max(top, p[i])
  }
  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene(name)
  const material = doc
    .createMaterial('steel')
    .setBaseColorFactor([0.72, 0.75, 0.79, 1])
    .setMetallicFactor(0.9)
    .setRoughnessFactor(0.28)
  for (const [index, mesh] of result.meshes.entries()) {
    const original = mesh.attributes.position.array
    const sourceNormal = mesh.attributes.normal.array
    const positions = new Float32Array(original.length)
    const normals = new Float32Array(sourceNormal.length)
    for (let i = 0; i < original.length; i += 3) {
      positions[i] = original[i]
      positions[i + 1] = original[i + 2] - top
      positions[i + 2] = -original[i + 1]
      normals[i] = sourceNormal[i]
      normals[i + 1] = sourceNormal[i + 2]
      normals[i + 2] = -sourceNormal[i + 1]
    }
    const primitive = doc
      .createPrimitive()
      .setAttribute(
        'POSITION',
        doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer),
      )
      .setAttribute(
        'NORMAL',
        doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer),
      )
      .setIndices(
        doc
          .createAccessor()
          .setType('SCALAR')
          .setArray(new Uint32Array(mesh.index.array))
          .setBuffer(buffer),
      )
      .setMaterial(material)
    scene.addChild(
      doc.createNode(`${name}-${index}`).setMesh(doc.createMesh(name).addPrimitive(primitive)),
    )
  }
  const target = path.join(OUTPUT, `${name}.glb`)
  await io.write(target, doc)
  console.log(`${target}: ${(fs.statSync(target).size / 1024).toFixed(0)} KB`)
}
