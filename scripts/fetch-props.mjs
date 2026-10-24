// Tải model đạo cụ CC0 từ Poly Haven để tham khảo hoặc dùng trong game.
// Dùng: node scripts/fetch-props.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'

// tua vít + thùng carton dùng trong game nên tải bằng fetch:room (public/models/room); ở đây chỉ giữ model tham khảo
const MODELS = {
  metal_toolbox: 'metal-toolbox.glb',
}
const OUT = 'assets/community/props-polyhaven'
const API = 'https://api.polyhaven.com'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sbk-props-'))
const io = new NodeIO()
const credits = []

async function getJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json()
}

async function download(url, target) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()))
}

try {
  fs.mkdirSync(OUT, { recursive: true })
  for (const [id, filename] of Object.entries(MODELS)) {
    const [info, files] = await Promise.all([
      getJson(`${API}/info/${id}`),
      getJson(`${API}/files/${id}`),
    ])
    const source = files.gltf['1k'].gltf
    const dir = path.join(tmp, id)
    const main = path.join(dir, path.basename(new URL(source.url).pathname))
    await download(source.url, main)
    for (const [rel, file] of Object.entries(source.include ?? {})) {
      const target = path.resolve(dir, rel)
      if (!target.startsWith(dir + path.sep)) throw new Error(`Đường dẫn lạ: ${rel}`)
      await download(file.url, target)
    }
    const doc = await io.read(main)
    const out = path.join(OUT, filename)
    await io.write(out, doc)
    console.log(`${out}: ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`)
    credits.push(
      `- [${info.name}](https://polyhaven.com/a/${id}) — ${Object.keys(info.authors).join(', ')}`,
    )
  }
  fs.writeFileSync(
    path.join(OUT, 'SOURCE.md'),
    `# Model đạo cụ Poly Haven\n\nGiấy phép [CC0](https://polyhaven.com/license). Tải bản glTF 1K rồi đóng gói thành GLB, không chỉnh hình học.\n\n${credits.join('\n')}\n`,
  )
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
