// Tải model + texture phòng làm việc từ Poly Haven (CC0) và đóng gói cho game.
// Dùng: bun run fetch:room
//
// Model glTF 1k (gltf + bin + texture) được tải vào thư mục tạm riêng rồi gộp thành 1 file .glb
// trong public/models/room/. Texture sàn / tường (jpg 1k) lưu vào public/textures/room/.
// Ghi công tác giả vào public/models/room/CREDITS.md.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'

const API = 'https://api.polyhaven.com'
const RES = '1k'
const MODELS = [
  'wooden_table_02',
  'potted_plant_04',
  'Shelf_01',
  'painted_wooden_chair_01',
  'hanging_picture_frame_01',
  'wall_clock',
  // thùng hàng ở bước mở hộp
]
/** texture: id → các map cần (tên khoá trong API Poly Haven) */
const TEXTURES = {
  laminate_floor_02: ['Diffuse', 'nor_gl', 'Rough'],
  beige_wall_001: ['Diffuse', 'nor_gl', 'Rough'],
  // vân gỗ cho case gỗ sồi / gỗ óc chó
  oak_veneer_01: ['Diffuse', 'nor_gl', 'Rough'],
  walnut_veneer: ['Diffuse', 'nor_gl', 'Rough'],
}
const OUT_MODELS = 'public/models/room'
const OUT_TEX = 'public/textures/room'

const getJson = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}
const download = async (url, file) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
}

fs.mkdirSync(OUT_MODELS, { recursive: true })
fs.mkdirSync(OUT_TEX, { recursive: true })
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sbk-room-'))
const io = new NodeIO()
const credits = []

for (const id of MODELS) {
  const [info, files] = await Promise.all([
    getJson(`${API}/info/${id}`),
    getJson(`${API}/files/${id}`),
  ])
  const gltf = files.gltf[RES].gltf
  const dir = path.join(tmp, id)
  const main = path.join(dir, path.basename(new URL(gltf.url).pathname))
  await download(gltf.url, main)
  // texture + bin nằm cạnh file gltf theo đường dẫn tương đối
  for (const [rel, f] of Object.entries(gltf.include ?? {})) {
    const file = path.resolve(dir, rel)
    if (!file.startsWith(dir)) throw new Error(`Đường dẫn lạ trong ${id}: ${rel}`)
    await download(f.url, file)
  }
  const doc = await io.read(main)
  const out = path.join(OUT_MODELS, `${id}.glb`)
  await io.write(out, doc)
  console.log(`✔ ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)}MB)`)
  credits.push(`- ${info.name} (\`${id}\`) — ${Object.keys(info.authors).join(', ')}`)
}

for (const [id, maps] of Object.entries(TEXTURES)) {
  const [info, files] = await Promise.all([
    getJson(`${API}/info/${id}`),
    getJson(`${API}/files/${id}`),
  ])
  for (const map of maps) {
    const f = files[map][RES].jpg
    const out = path.join(OUT_TEX, path.basename(new URL(f.url).pathname))
    await download(f.url, out)
    console.log(`✔ ${out}`)
  }
  credits.push(`- ${info.name} (\`${id}\`, texture) — ${Object.keys(info.authors).join(', ')}`)
}

fs.rmSync(tmp, { recursive: true, force: true })
fs.writeFileSync(
  path.join(OUT_MODELS, 'CREDITS.md'),
  `# Nguồn model phòng làm việc\n\nTất cả từ [Poly Haven](https://polyhaven.com), giấy phép CC0.\n\n${credits.join('\n')}\n`,
)
