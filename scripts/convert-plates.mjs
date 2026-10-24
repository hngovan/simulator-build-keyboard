// Chuyển plate CAD cộng đồng sang hình học runtime cho các layout khớp.
// Dùng: bun run convert:plates
import fs from 'node:fs'
import DxfParser from 'dxf-parser'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'

const ROOT = 'assets/community/keyboard-plate-files-4xgk3'
const OUT = 'public/models/plates'
const DATA = 'src/data/generated'
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(DATA, { recursive: true })

function closedPolylinePoints(vertices) {
  const points = []
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    points.push([a.x, a.y])
    const bulge = a.bulge ?? 0
    if (Math.abs(bulge) < 1e-6) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const chord = Math.hypot(dx, dy)
    const theta = 4 * Math.atan(bulge)
    const radius = (chord * (1 + bulge * bulge)) / (4 * Math.abs(bulge))
    const offset = (chord * (1 - bulge * bulge)) / (4 * bulge)
    const cx = (a.x + b.x) / 2 - (dy / chord) * offset
    const cy = (a.y + b.y) / 2 + (dx / chord) * offset
    const start = Math.atan2(a.y - cy, a.x - cx)
    const steps = Math.max(2, Math.ceil(Math.abs(theta) / (Math.PI / 18)))
    for (let j = 1; j < steps; j++) {
      const angle = start + (theta * j) / steps
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
    }
  }
  return points
}

const parser = new DxfParser()
const dxf = parser.parseSync(fs.readFileSync(`${ROOT}/60/typ60-full.dxf`, 'utf8'))
const paths = dxf.entities
  .filter((entity) => entity.type === 'LWPOLYLINE' && entity.shape && entity.vertices.length >= 3)
  .map((entity) => closedPolylinePoints(entity.vertices))
  .filter((points) => points.length >= 3)
fs.writeFileSync(
  `${DATA}/plate60.ts`,
  `// Generated from assets/community/keyboard-plate-files-4xgk3/60/typ60-full.dxf.\n` +
    `export const plate60Cutouts: [number, number][][] = ${JSON.stringify(paths)}\n`,
)
console.log(`✔ ${DATA}/plate60.ts: ${paths.length} CAD cutouts`)

const occt = await occtimportjs()
const stepFile = `${ROOT}/alice/alice.stp`
const result = occt.ReadStepFile(new Uint8Array(fs.readFileSync(stepFile)), null)
if (!result.success || !result.meshes.length) throw new Error(`Không đọc được ${stepFile}`)
const positions = []
const normals = []
const indices = []
for (const mesh of result.meshes) {
  const offset = positions.length / 3
  const p = mesh.attributes.position.array
  const n = mesh.attributes.normal.array
  for (let i = 0; i < p.length; i += 3) positions.push(p[i], p[i + 2], -p[i + 1])
  for (let i = 0; i < n.length; i += 3) normals.push(n[i], n[i + 2], -n[i + 1])
  for (const index of mesh.index.array) indices.push(offset + index)
}
const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < positions.length; i += 3)
  for (let a = 0; a < 3; a++) {
    min[a] = Math.min(min[a], positions[i + a])
    max[a] = Math.max(max[a], positions[i + a])
  }
const centerX = (min[0] + max[0]) / 2
const centerZ = (min[2] + max[2]) / 2
const pos = Float32Array.from(positions, (value, i) =>
  i % 3 === 0 ? value - centerX : i % 3 === 2 ? value - centerZ : value - min[1],
)
const doc = new Document()
const buffer = doc.createBuffer()
const primitive = doc
  .createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
  .setAttribute(
    'NORMAL',
    doc.createAccessor().setType('VEC3').setArray(Float32Array.from(normals)).setBuffer(buffer),
  )
  .setIndices(
    doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from(indices)).setBuffer(buffer),
  )
doc
  .createScene('alice-plate')
  .addChild(
    doc.createNode('alice-plate').setMesh(doc.createMesh('alice-plate').addPrimitive(primitive)),
  )
await new NodeIO().write(`${OUT}/alice.glb`, doc)
console.log(`✔ ${OUT}/alice.glb: ${(fs.statSync(`${OUT}/alice.glb`).size / 1024).toFixed(0)} KB`)
process.exit(0)
