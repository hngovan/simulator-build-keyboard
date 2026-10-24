// Chuyển bộ STL lube station sang GLB cho bàn lube trong game.
// Dùng: bun run convert:lube-station
import fs from 'node:fs'
import { Document, NodeIO } from '@gltf-transform/core'

const SOURCE = 'assets/community/keyboard-lube-station-fonz'
const OUT = 'public/models/lube'
const names = [
  'switch-module',
  'stems-module',
  'accent-left-side',
  'accent-right-side',
  'connector',
]

function readStl(file) {
  const buffer = fs.readFileSync(file)
  const faces = buffer.readUInt32LE(80)
  const positions = new Float32Array(faces * 9)
  const normals = new Float32Array(faces * 9)
  for (let face = 0; face < faces; face++) {
    const offset = 84 + face * 50
    for (let vertex = 0; vertex < 3; vertex++)
      for (let axis = 0; axis < 3; axis++) {
        positions[face * 9 + vertex * 3 + axis] = buffer.readFloatLE(
          offset + 12 + vertex * 12 + axis * 4,
        )
        normals[face * 9 + vertex * 3 + axis] = buffer.readFloatLE(offset + axis * 4)
      }
  }
  return { positions, normals }
}

const loaded = Object.fromEntries(names.map((name) => [name, readStl(`${SOURCE}/${name}.stl`)]))
const base = loaded['switch-module'].positions
const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < base.length; i += 3)
  for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], base[i + axis])
    max[axis] = Math.max(max[axis], base[i + axis])
  }
const centerX = (min[0] + max[0]) / 2
const centerZ = (min[1] + max[1]) / 2

fs.mkdirSync(OUT, { recursive: true })
for (const name of names) {
  const { positions, normals } = loaded[name]
  const pos = new Float32Array(positions.length)
  const nor = new Float32Array(normals.length)
  for (let i = 0; i < positions.length; i += 3) {
    pos[i] = positions[i] - centerX
    pos[i + 1] = positions[i + 2] - min[2]
    pos[i + 2] = -(positions[i + 1] - centerZ)
    nor[i] = normals[i]
    nor[i + 1] = normals[i + 2]
    nor[i + 2] = -normals[i + 1]
  }
  const indices = Uint32Array.from({ length: pos.length / 3 }, (_, i) => i)
  const doc = new Document()
  const buffer = doc.createBuffer()
  const primitive = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer))
  doc
    .createScene(name)
    .addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(primitive)))
  const output = `${OUT}/${name}.glb`
  await new NodeIO().write(output, doc)
  console.log(`✔ ${output}: ${(fs.statSync(output).size / 1024).toFixed(0)} KB`)
}
