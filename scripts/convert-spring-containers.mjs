// Tách hộp bản lề STL thành thân + nắp, chuyển cùng khay đựng sang GLB.
// Dùng: node scripts/convert-spring-containers.mjs
import fs from 'node:fs'
import path from 'node:path'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Document, NodeIO } from '@gltf-transform/core'

const SRC = 'assets/lube/spring-containers'
const OUT = 'public/models/lube'
fs.mkdirSync(OUT, { recursive: true })
const loader = new STLLoader()
const io = new NodeIO()

function read(name) {
  const data = fs.readFileSync(path.join(SRC, name))
  return loader.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
}

async function write(name, geometry, select, offsetX, clear) {
  const original = geometry.getAttribute('position').array
  const sourceNormal = geometry.getAttribute('normal').array
  const positions = []
  const normals = []
  for (let i = 0; i < original.length; i += 9) {
    const cx = (original[i] + original[i + 3] + original[i + 6]) / 3
    if (!select(cx)) continue
    for (let j = 0; j < 9; j += 3) {
      positions.push(original[i + j] - offsetX, original[i + j + 2], -original[i + j + 1])
      normals.push(sourceNormal[i + j], sourceNormal[i + j + 2], -sourceNormal[i + j + 1])
    }
  }
  if (!positions.length) throw new Error(`Không có tam giác cho ${name}`)
  const doc = new Document()
  const buffer = doc.createBuffer()
  const material = doc
    .createMaterial(clear ? 'translucent-plastic' : 'ivory-plastic')
    .setBaseColorFactor(clear ? [0.76, 0.87, 0.95, 0.38] : [0.87, 0.86, 0.82, 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(clear ? 0.22 : 0.7)
    .setAlphaMode(clear ? 'BLEND' : 'OPAQUE')
    .setDoubleSided(true)
  const mesh = doc.createMesh(name).addPrimitive(
    doc
      .createPrimitive()
      .setAttribute(
        'POSITION',
        doc
          .createAccessor()
          .setType('VEC3')
          .setArray(new Float32Array(positions))
          .setBuffer(buffer),
      )
      .setAttribute(
        'NORMAL',
        doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buffer),
      )
      .setMaterial(material),
  )
  doc.createScene(name).addChild(doc.createNode(name).setMesh(mesh))
  const file = path.join(OUT, `${name}.glb`)
  await io.write(file, doc)
  console.log(`${file}: ${positions.length / 9} triangles`)
}

const box = read('hinged-clamshell.stl')
await write('spring-box-base', box, (x) => x < 44, 0, true)
await write('spring-box-lid', box, (x) => x >= 44, 88, true)
const tray = read('desk-tray.stl')
await write('spring-tray', tray, () => true, 0, false)
