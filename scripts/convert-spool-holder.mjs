import fs from 'node:fs'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Document, NodeIO } from '@gltf-transform/core'

const bytes = fs.readFileSync('assets/user-tools/SpoolHolder.STL')
const geometry = new STLLoader().parse(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
)
geometry.rotateX(-Math.PI / 2)
geometry.computeBoundingBox()
const box = geometry.boundingBox
geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
geometry.scale(0.1, 0.1, 0.1)
const doc = new Document(),
  buffer = doc.createBuffer()
const primitive = doc.createPrimitive()
for (const [name, attribute] of [
  ['POSITION', 'position'],
  ['NORMAL', 'normal'],
]) {
  primitive.setAttribute(
    name,
    doc
      .createAccessor()
      .setType('VEC3')
      .setArray(geometry.getAttribute(attribute).array)
      .setBuffer(buffer),
  )
}
primitive.setMaterial(
  doc
    .createMaterial('Graphite holder')
    .setBaseColorFactor([0.14, 0.18, 0.22, 1])
    .setMetallicFactor(0.25)
    .setRoughnessFactor(0.45),
)
doc
  .createScene()
  .addChild(doc.createNode('Spool holder').setMesh(doc.createMesh().addPrimitive(primitive)))
await new NodeIO().write('public/models/solder/spool-holder.glb', doc)
console.log('Converted spool holder, grounded on Y=0')
