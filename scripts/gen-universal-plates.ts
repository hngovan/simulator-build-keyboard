// Sinh plate universal 60 / 75 / TKL / full bằng lõi ai03 Plate Generator (kbplate.ai03.com):
// layout game (gộp mọi variant) → KLE JSON → buildPlate → DXF + lỗ cắt đã gộp cho game.
// Mã ai03 là AGPL-3.0 nên KHÔNG nhúng vào repo: clone riêng rồi trỏ YAKB_DIR tới đó
//   git clone https://github.com/ai03-2725/yet-another-keyboard-builder ../yakb && (cd ../yakb && bun install)
// Dùng: YAKB_DIR=../yakb bun run gen:plates-universal
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import polygonClipping, { type Polygon } from 'polygon-clipping'
import { getLayout } from '../src/data/layouts'
import type { Key, LayoutId, Variant, VariantKey } from '../src/types'

const YAKB = path.resolve(process.env.YAKB_DIR ?? '../yakb')
if (!fs.existsSync(path.join(YAKB, 'src/PlateBuilder.js')))
  throw new Error(`Không thấy ai03 plate generator ở ${YAKB} (đặt YAKB_DIR)`)
const load = (f: string) => import(pathToFileURL(path.join(YAKB, f)).href)
const { parseKle } = await load('src/KLEParser.js')
const { buildPlate } = await load('src/PlateBuilder.js')
const makerjs = (await load('node_modules/makerjs/dist/index.js')).default
const Decimal = (await load('node_modules/decimal.js/decimal.mjs')).default

const OUT = 'assets/plates/universal'
const DATA = 'src/data/generated'
const LAYOUT_IDS: LayoutId[] = ['60', '75', 'tkl', 'full']
// mọi tuỳ chọn hàng phím: layout không dùng variant nào thì rows() bỏ qua
const OPTIONS: Partial<Record<VariantKey, string[]>> = {
  backspace: ['2u', 'split'],
  bottom: ['wk', 'wkl'],
  rshift: ['2.75u', 'split'],
}

/** mọi tổ hợp variant */
function variants(): Variant[] {
  let list: Variant[] = [{}]
  for (const [k, opts] of Object.entries(OPTIONS) as [VariantKey, string[]][])
    list = list.flatMap((v) => opts.map((o) => ({ ...v, [k]: o })))
  return list
}

/** phím gộp của mọi variant (trùng vị trí + cỡ thì giữ 1) */
function universalKeys(id: LayoutId) {
  const seen = new Map<string, Key>()
  for (const v of variants())
    for (const k of getLayout(id, v).keys) seen.set(`${k.x},${k.y},${k.w},${k.h}`, k)
  return [...seen.values()].sort((a, b) => a.y - b.y || a.x - b.x)
}

/** KLE raw data: mỗi phím 1 hàng (KLE cộng y + 1 mỗi hàng, x về 0), dán được vào KLE / kbplate */
function toKle(keys: Key[]) {
  let y = -1
  return keys.map((k) => {
    const props: Record<string, number> = { x: k.x, y: k.y - y - 1 }
    if (k.w !== 1) props.w = k.w
    if (k.h !== 1) props.h = k.h
    y = k.y
    return [props, k.label || ' ']
  })
}

const opts = {
  switchCutoutType: 'mx-basic',
  stabilizerCutoutType: 'mx-basic',
  acousticCutoutType: 'none',
  switchFilletRadius: new Decimal(0.5),
  stabilizerFilletRadius: new Decimal(0.5),
  acousticFilletRadius: new Decimal(0),
  unitWidth: new Decimal(19.05),
  unitHeight: new Decimal(19.05),
  kerf: new Decimal(0),
}

fs.mkdirSync(OUT, { recursive: true })
const result: Record<string, [number, number][][]> = {}
for (const id of LAYOUT_IDS) {
  const keys = universalKeys(id)
  const kle = JSON.stringify(toKle(keys))
  fs.writeFileSync(`${OUT}/${id}.kle.json`, kle + '\n')
  const plate = buildPlate(parseKle(kle), opts)
  fs.writeFileSync(
    `${OUT}/${id}.dxf`,
    makerjs.exporter.toDXF(plate, { units: makerjs.unitType.Millimeter }),
  )
  // lỗ cắt (bỏ khung bao), gộp các lỗ chồng nhau của các variant thành 1 vòng
  delete plate.models.BoundingBox0
  const chains = makerjs.model.findChains(plate) as { endless: boolean }[]
  const polys: Polygon[] = chains
    .filter((c) => c.endless)
    .map((c) => [makerjs.chain.toKeyPoints(c, 0.4) as [number, number][]])
  const merged = polygonClipping.union(polys[0], ...polys.slice(1))
  // toạ độ makerjs (mm, y hướng lên, gốc = góc trên trái KLE) → u quanh tâm layout như Key.cx / cz
  const k0 = keys[0]
  const offX = k0.cx - (k0.x + k0.w / 2)
  const offZ = k0.cz - (k0.y + k0.h / 2)
  const r = (n: number) => Math.round(n * 1e4) / 1e4
  result[id] = merged.map(([outer]) =>
    outer
      .slice(0, -1)
      .map(([x, y]): [number, number] => [r(x / 19.05 + offX), r(-y / 19.05 + offZ)]),
  )
  console.log(
    `✔ ${id}: ${keys.length} phím, ${polys.length} lỗ → ${result[id].length} lỗ sau khi gộp`,
  )
}
fs.writeFileSync(
  `${DATA}/plateUniversal.ts`,
  `// Sinh bởi scripts/gen-universal-plates.ts (ai03 Plate Generator, MX basic + stab MX basic).\n` +
    `// Lỗ cắt plate universal theo layout: [x, z] (u, quanh tâm layout như Key.cx / cz)\n` +
    `export const plateUniversal: Record<string, [number, number][][]> = ${JSON.stringify(result)}\n`,
)
console.log(`✔ ${DATA}/plateUniversal.ts`)
