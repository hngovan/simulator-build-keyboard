// Chuyển daughterboard ai03 Unified C3 (MIT, mraghuram3/Unified-Daughterboard) STEP → GLB cho cảnh lắp ráp.
// Dùng: node scripts/convert-dtb.mjs
// CAD: Z hướng lên, mm, mạch 18 × 16,5mm dày 1,6mm, cổng USB-C ở mép +y, đầu JST SH 4 pin (SM04B-SRSS-TB) ở mép −y.
// Game: Y hướng lên, mm, gốc = tâm mặt dưới mạch, USB-C quay ra sau (−z), miệng JST quay tới trước (+z); component nhân MM.
// Node: pcb (mạch), usb (cổng USB-C), jst (đầu cắm JST, dùng lại làm đầu cắm trên PCB bàn phím), parts (linh kiện dán).
import fs from 'node:fs'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'

const SOURCE = 'assets/community/unified-daughterboard/Unified-Daughterboard.step'
const TARGET = 'public/models/dtb/unified-c3.glb'
/** tâm mạch trong hệ CAD (khung Edge.Cuts: x 66–84, y −73,04 – −56,54) */
const CX = 75
const CY = -64.79

const occt = await occtimportjs()
const result = occt.ReadStepFile(new Uint8Array(fs.readFileSync(SOURCE)), null)
if (!result.success || !result.meshes.length) throw new Error(`Không đọc được ${SOURCE}`)

/** tên node con trong cây STEP → mesh index */
const names = new Map()
const walk = (n) => {
  n.meshes.forEach((m) => names.set(m, n.name))
  n.children.forEach(walk)
}
walk(result.root)
const groupOf = (name) =>
  name === 'COMPOUND' ? 'pcb' : /TYPE-C/.test(name) ? 'usb' : /JST/.test(name) ? 'jst' : 'parts'

const doc = new Document()
const buffer = doc.createBuffer()
const scene = doc.createScene('dtb')
const mat = (name, rgb, metal, rough) =>
  doc
    .createMaterial(name)
    .setBaseColorFactor([...rgb, 1])
    .setMetallicFactor(metal)
    .setRoughnessFactor(rough)
const MATS = {
  // mạch đen nhám như bản DTB bán ngoài (STEP tô xanh lá)
  pcb: mat('pcb', [0.03, 0.03, 0.035], 0, 0.55),
  usb: mat('usb', [0.78, 0.8, 0.82], 0.95, 0.25),
  jst: mat('jst', [0.92, 0.9, 0.84], 0, 0.6),
  parts: mat('parts', [0.12, 0.12, 0.13], 0.1, 0.5),
}
const meshes = { pcb: [], usb: [], jst: [], parts: [] }
result.meshes.forEach((mesh, i) => meshes[groupOf(names.get(i) ?? '')].push(mesh))

for (const [group, list] of Object.entries(meshes)) {
  const m = doc.createMesh(group)
  for (const mesh of list) {
    const src = mesh.attributes.position.array
    const srcN = mesh.attributes.normal.array
    const pos = new Float32Array(src.length)
    const nor = new Float32Array(srcN.length)
    // (x, y, z) CAD → (x, z, −y) game: phép quay, không lật gương
    for (let i = 0; i < src.length; i += 3) {
      pos[i] = src[i] - CX
      pos[i + 1] = src[i + 2]
      pos[i + 2] = -(src[i + 1] - CY)
      nor[i] = srcN[i]
      nor[i + 1] = srcN[i + 2]
      nor[i + 2] = -srcN[i + 1]
    }
    m.addPrimitive(
      doc
        .createPrimitive()
        .setAttribute(
          'POSITION',
          doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer),
        )
        .setAttribute(
          'NORMAL',
          doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buffer),
        )
        .setIndices(
          doc
            .createAccessor()
            .setType('SCALAR')
            .setArray(new Uint32Array(mesh.index.array))
            .setBuffer(buffer),
        )
        .setMaterial(MATS[group]),
    )
  }
  scene.addChild(doc.createNode(group).setMesh(m))
}

fs.mkdirSync('public/models/dtb', { recursive: true })
await new NodeIO().write(TARGET, doc)
console.log(`${TARGET}: ${(fs.statSync(TARGET).size / 1024).toFixed(0)} KB`)
