// Lỗ switch plate 60% chuẩn từ DXF cộng đồng → src/data/generated/plate60.ts.
// Dùng: bun run convert:plates
import fs from 'node:fs'
import DxfParser from 'dxf-parser'

const ROOT = 'assets/plates/4xgk3'
const DATA = 'src/data/generated'
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
  `// Generated from assets/plates/4xgk3/60/typ60-full.dxf.\n` +
    `export const plate60Cutouts: [number, number][][] = ${JSON.stringify(paths)}\n`,
)
console.log(`✔ ${DATA}/plate60.ts: ${paths.length} CAD cutouts`)

process.exit(0)
