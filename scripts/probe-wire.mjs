// Đường tâm dây 2.25u: thanh ngang, đoạn móc, chỗ uốn
import { NodeIO } from '@gltf-transform/core'
const doc = await new NodeIO().read('public/models/stab/stab.glb')
const node = doc
  .getRoot()
  .listNodes()
  .find((n) => n.getName() === 'wire225')
const a = node.getMesh().listPrimitives()[0].getAttribute('POSITION').getArray()
const pts = []
for (let i = 0; i < a.length; i += 3) pts.push([a[i], a[i + 1], a[i + 2]])
const rng = (list, k) => [
  Math.min(...list.map((p) => p[k])).toFixed(2),
  Math.max(...list.map((p) => p[k])).toFixed(2),
]
const bar = pts.filter((p) => Math.abs(p[0]) < 5)
console.log('thanh ngang (|x|<5): y', rng(bar, 1), 'z', rng(bar, 2))
const hook = pts.filter((p) => p[0] > 10 && p[2] < 3)
console.log('móc phải (x>10, z<3): x', rng(hook, 0), 'y', rng(hook, 1))
// lát cắt theo x quanh chỗ uốn bên phải: z min/max
for (let x = 8; x <= 13; x += 0.5) {
  const s = pts.filter((p) => Math.abs(p[0] - x) < 0.25)
  if (s.length) console.log(`x≈${x}: z ${rng(s, 2).join('..')}`)
}
// lát cắt theo z dọc móc: x min/max
for (let z = 4; z <= 9; z += 0.5) {
  const s = pts.filter((p) => p[0] > 8 && Math.abs(p[2] - z) < 0.25)
  if (s.length) console.log(`z≈${z}: x ${rng(s, 0).join('..')}`)
}
