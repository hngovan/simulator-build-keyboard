// Bộ 3 tranh treo tường quán cafe (assets/room/cafe_wall_pictures.glb, Sketchfab "Cafe Wall Pictures" của Guy in a Poncho,
// CC BY 4.0): tranh phẳng treo tường nên bỏ normal / ORM map (6 PNG 1024px), ảnh màu PNG → JPEG, vật liệu đục (không blend).
// Lớp kính (vùng đen alpha thấp trong ảnh màu) bỏ hẳn tam giác, không thì thành tấm đen che tranh.
// ~5,6MB → vài trăm KB. Dùng: bun run convert:cafe-pictures
import { NodeIO } from '@gltf-transform/core'
import jpeg from 'jpeg-js'
import { inflateSync } from 'node:zlib'

const SRC = 'assets/room/cafe_wall_pictures.glb'
const OUT = 'public/models/room/cafe-wall-pictures.glb'

/** giải mã PNG 8-bit RGB / RGBA không interlace → RGBA */
function decodePng(buf) {
  let p = 8
  let w = 0
  let h = 0
  let type = 0
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const kind = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (kind === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      if (data[8] !== 8 || data[12] !== 0) throw new Error('PNG không hỗ trợ')
      type = data[9]
    } else if (kind === 'IDAT') idat.push(data)
    else if (kind === 'IEND') break
    p += 12 + len
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0
  if (!bpp) throw new Error(`PNG color type ${type} không hỗ trợ`)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * bpp
  const cur = Buffer.alloc(stride)
  const prev = Buffer.alloc(stride)
  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0
      const b = prev[i]
      const c = i >= bpp ? prev[i - bpp] : 0
      let v = line[i]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) {
        const pa = Math.abs(b - c)
        const pb = Math.abs(a - c)
        const pc = Math.abs(a + b - 2 * c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[i] = v & 255
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      out[o] = cur[x * bpp]
      out[o + 1] = cur[x * bpp + 1]
      out[o + 2] = cur[x * bpp + 2]
      out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255
    }
    cur.copy(prev)
  }
  return { width: w, height: h, data: out }
}

const io = new NodeIO()
const doc = await io.read(SRC)
const root = doc.getRoot()
/** alpha ảnh tại UV (glTF: v = 0 ở mép trên ảnh) */
const alphaAt = (img, u, v) => {
  const x = Math.min(img.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * img.width)))
  const y = Math.min(img.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * img.height)))
  return img.data[(y * img.width + x) * 4 + 3]
}

for (const mat of root.listMaterials()) {
  const base = mat.getBaseColorTexture()
  const img = decodePng(Buffer.from(base.getImage()))
  // bỏ tam giác kính: alpha tại tâm UV tam giác < 128
  for (const prim of root.listMeshes().flatMap((m) => m.listPrimitives())) {
    if (prim.getMaterial() !== mat) continue
    const uv = prim.getAttribute('TEXCOORD_0')
    const idx = prim.getIndices()
    const tri = idx ? Array.from(idx.getArray()) : [...Array(uv.getCount()).keys()]
    const keep = []
    let drop = 0
    for (let t = 0; t < tri.length; t += 3) {
      const [a, b, c] = [tri[t], tri[t + 1], tri[t + 2]].map((i) => uv.getElement(i, []))
      const alpha = alphaAt(img, (a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)
      if (alpha < 128) drop++
      else keep.push(tri[t], tri[t + 1], tri[t + 2])
    }
    const out = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep))
    prim.setIndices(out)
    console.log(`${mat.getName()}: bỏ ${drop} / ${tri.length / 3} tam giác kính`)
  }
  base.setImage(new Uint8Array(jpeg.encode(img, 85).data)).setMimeType('image/jpeg')
  mat
    .setNormalTexture(null)
    .setOcclusionTexture(null)
    .setMetallicRoughnessTexture(null)
    .setMetallicFactor(0)
    .setRoughnessFactor(0.7)
    .setAlphaMode('OPAQUE')
    // mặt tranh có tam giác ngược chiều (model gốc dựa vào 2 mặt): giữ 2 mặt
    .setDoubleSided(true)
}
// texture không còn dùng
for (const tex of root.listTextures()) if (!tex.listParents().some((p) => p !== root)) tex.dispose()
await io.write(OUT, doc)
console.log(`→ ${OUT}`)
