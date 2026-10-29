// Xem cấu trúc file STEP: tên chi tiết, số tam giác, khung bao (mm)
// Dùng: node scripts/inspect-step.mjs assets/stab/Stabilizer-2.25u.stp
import fs from 'node:fs'
import occtimportjs from 'occt-import-js'

const occt = await occtimportjs()
const file = fs.readFileSync(process.argv[2])
const res = occt.ReadStepFile(new Uint8Array(file), null)
if (!res.success) throw new Error('Không đọc được file STEP')

const bbox = (pos) => {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], pos[i + a])
      max[a] = Math.max(max[a], pos[i + a])
    }
  return { min: min.map((v) => +v.toFixed(2)), max: max.map((v) => +v.toFixed(2)) }
}

function walk(node, depth = 0) {
  console.log(
    `${'  '.repeat(depth)}- ${node.name || '(no name)'} meshes=[${node.meshes.join(',')}]`,
  )
  node.children.forEach((c) => walk(c, depth + 1))
}
walk(res.root)
res.meshes.forEach((m, i) => {
  const tris = m.index.array.length / 3
  console.log(
    `mesh ${i}: ${m.name} tris=${tris} color=${m.color ?? '-'}`,
    JSON.stringify(bbox(m.attributes.position.array)),
  )
})
