import type { Key, LayoutGeometry, LayoutId, FormFactor, Variant, VariantKey } from '@/types'
import { ALICE_KEYS, ALICE_OUTLINE } from './aliceKeys'

// Mỗi hàng: { x, y, items } — item là số (khoảng trống, đơn vị u) hoặc [nhãn, rộng, KeyboardEvent.code, cao]
type KeyTuple = [label: string, w?: number, code?: string | null, h?: number]
type Item = number | KeyTuple
interface RowSpec {
  x: number
  y: number
  items: Item[]
  /** xoay cả hàng (độ, dương = ngược chiều kim đồng hồ nhìn từ trên) quanh tâm (rx, ry) — như KLE */
  rot?: number
  rx?: number
  ry?: number
}

const PUNCT: Record<string, string> = {
  '`': 'Backquote',
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  ';': 'Semicolon',
  "'": 'Quote',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
}
const codeOf = (c: string) => PUNCT[c] ?? (/\d/.test(c) ? `Digit${c}` : `Key${c.toUpperCase()}`)
const chars = (s: string): KeyTuple[] => [...s].map((c) => [c.toUpperCase(), 1, codeOf(c)])
const F = (n: number): KeyTuple => [`F${n}`, 1, `F${n}`]

const backspace = (v: Variant): KeyTuple[] =>
  v.backspace === 'split'
    ? [
        ['Back', 1, 'Backspace'],
        ['Del', 1],
      ]
    : [['Backspace', 2, 'Backspace']]
const rshift = (v: Variant): KeyTuple[] =>
  v.rshift === 'split'
    ? [
        ['Shift', 1.75, 'ShiftRight'],
        ['Fn', 1],
      ]
    : [['Shift', 2.75, 'ShiftRight']]
const bottomRow = (v: Variant): Item[] =>
  v.bottom === 'wkl'
    ? [
        ['Ctrl', 1.5, 'ControlLeft'],
        1,
        ['Alt', 1.5, 'AltLeft'],
        ['', 7, 'Space'],
        ['Alt', 1.5, 'AltRight'],
        1,
        ['Ctrl', 1.5, 'ControlRight'],
      ]
    : [
        ['Ctrl', 1.25, 'ControlLeft'],
        ['Win', 1.25, 'MetaLeft'],
        ['Alt', 1.25, 'AltLeft'],
        ['', 6.25, 'Space'],
        ['Alt', 1.25, 'AltRight'],
        ['Win', 1.25, 'MetaRight'],
        ['Menu', 1.25, 'ContextMenu'],
        ['Ctrl', 1.25, 'ControlRight'],
      ]

const alpha60 = (v: Variant): Item[][] => [
  [...chars('`1234567890-='), ...backspace(v)],
  [['Tab', 1.5, 'Tab'], ...chars('qwertyuiop[]'), ['\\', 1.5, 'Backslash']],
  [['Caps', 1.75, 'CapsLock'], ...chars("asdfghjkl;'"), ['Enter', 2.25, 'Enter']],
  [['Shift', 2.25, 'ShiftLeft'], ...chars('zxcvbnm,./'), ...rshift(v)],
  bottomRow(v),
]

const alpha40 = (v: Variant): Item[][] => [
  [['Esc', 1, 'Escape'], ...chars('qwertyuiop'), ['Back', 1.75, 'Backspace']],
  [['Tab', 1.25, 'Tab'], ...chars('asdfghjkl;'), ['Enter', 1.5, 'Enter']],
  [['Shift', 1.75, 'ShiftLeft'], ...chars('zxcvbnm,./'), ['Shift', 1, 'ShiftRight']],
  v.space === 'split'
    ? [
        ['Ctrl', 1.25, 'ControlLeft'],
        ['Win', 1.25, 'MetaLeft'],
        ['Alt', 1.25, 'AltLeft'],
        ['', 2.25, 'Space'],
        ['Fn', 1.25],
        ['', 2.75],
        ['Alt', 1.25, 'AltRight'],
        ['Ctrl', 1.5, 'ControlRight'],
      ]
    : [
        ['Ctrl', 1.25, 'ControlLeft'],
        ['Win', 1.25, 'MetaLeft'],
        ['Alt', 1.25, 'AltLeft'],
        ['', 6.25, 'Space'],
        ['Alt', 1.25, 'AltRight'],
        ['Ctrl', 1.5, 'ControlRight'],
      ],
]

const hhkbTop: Item[][] = [
  [['Esc', 1, 'Escape'], ...chars('1234567890-='), ['\\', 1, 'Backslash'], ['`', 1, 'Backquote']],
  [['Tab', 1.5, 'Tab'], ...chars('qwertyuiop[]'), ['Back', 1.5, 'Backspace']],
  [['Ctrl', 1.75, 'ControlLeft'], ...chars("asdfghjkl;'"), ['Enter', 2.25, 'Enter']],
  [['Shift', 2.25, 'ShiftLeft'], ...chars('zxcvbnm,./'), ['Shift', 1.75, 'ShiftRight'], ['Fn', 1]],
]

const stack = (rows: Item[][], y0 = 0, x = 0): RowSpec[] =>
  rows.map((items, r) => ({ x, y: y0 + r, items }))

const tklRows = (v: Variant): RowSpec[] => [
  {
    x: 0,
    y: 0,
    items: [
      ['Esc', 1, 'Escape'],
      1,
      F(1),
      F(2),
      F(3),
      F(4),
      0.5,
      F(5),
      F(6),
      F(7),
      F(8),
      0.5,
      F(9),
      F(10),
      F(11),
      F(12),
    ],
  },
  {
    x: 15.25,
    y: 0,
    items: [
      ['PrtSc', 1, 'PrintScreen'],
      ['ScrLk', 1, 'ScrollLock'],
      ['Pause', 1, 'Pause'],
    ],
  },
  ...stack(alpha60(v), 1.25),
  {
    x: 15.25,
    y: 1.25,
    items: [
      ['Ins', 1, 'Insert'],
      ['Home', 1, 'Home'],
      ['PgUp', 1, 'PageUp'],
    ],
  },
  {
    x: 15.25,
    y: 2.25,
    items: [
      ['Del', 1, 'Delete'],
      ['End', 1, 'End'],
      ['PgDn', 1, 'PageDown'],
    ],
  },
  { x: 16.25, y: 4.25, items: [['Up', 1, 'ArrowUp']] },
  {
    x: 15.25,
    y: 5.25,
    items: [
      ['Left', 1, 'ArrowLeft'],
      ['Down', 1, 'ArrowDown'],
      ['Right', 1, 'ArrowRight'],
    ],
  },
]

/** TKL bỏ hàng F (Function Row Less): cả cụm phím dời lên 1.25u */
const frlRows = (v: Variant): RowSpec[] =>
  tklRows(v)
    .filter((r) => r.y > 0)
    .map((r) => ({ ...r, y: r.y - 1.25 }))

/** 65%: 75% bỏ hàng F (cột điều hướng bên phải, mũi tên dưới Shift) */
const rows65 = (): RowSpec[] =>
  rows75()
    .filter((r) => r.y > 0)
    .map((r) => ({ ...r, y: r.y - 1 }))

/** 75% gọn (kiểu KBD75 / Q1): hàng F sát hàng số, cột điều hướng bên phải, mũi tên lọt dưới Shift */
/**
 * 75% kiểu Repent75 (đo từ model case: lòng 16u): hàng F tách nhóm Esc | F1–F4 | F5–F8 | F9–F12 | Del (khe 0.5u)
 * và cách hàng số 0.25u (thanh ngang của case); hàng dưới 12.5u phím + khe 0.5u + cụm mũi tên
 */
const rows75 = (): RowSpec[] => [
  {
    x: 0,
    y: 0,
    items: [
      ['Esc', 1, 'Escape'],
      0.5,
      F(1),
      F(2),
      F(3),
      F(4),
      0.5,
      F(5),
      F(6),
      F(7),
      F(8),
      0.5,
      F(9),
      F(10),
      F(11),
      F(12),
      0.5,
      ['Del', 1, 'Delete'],
    ],
  },
  ...stack(
    [
      [...chars('`1234567890-='), ['Backspace', 2, 'Backspace'], ['Home', 1, 'Home']],
      [
        ['Tab', 1.5, 'Tab'],
        ...chars('qwertyuiop[]'),
        ['\\', 1.5, 'Backslash'],
        ['PgUp', 1, 'PageUp'],
      ],
      [
        ['Caps', 1.75, 'CapsLock'],
        ...chars("asdfghjkl;'"),
        ['Enter', 2.25, 'Enter'],
        ['PgDn', 1, 'PageDown'],
      ],
      [
        ['Shift', 2.25, 'ShiftLeft'],
        ...chars('zxcvbnm,./'),
        ['Shift', 1.75, 'ShiftRight'],
        ['↑', 1, 'ArrowUp'],
        ['End', 1, 'End'],
      ],
      [
        ['Ctrl', 1.25, 'ControlLeft'],
        ['Win', 1.25, 'MetaLeft'],
        ['Alt', 1.25, 'AltLeft'],
        ['', 6.25, 'Space'],
        ['Alt', 1.25, 'AltRight'],
        ['Ctrl', 1.25, 'ControlRight'],
        0.5,
        ['←', 1, 'ArrowLeft'],
        ['↓', 1, 'ArrowDown'],
        ['→', 1, 'ArrowRight'],
      ],
    ],
    1.25,
  ),
]

const numpad: RowSpec[] = [
  {
    x: 18.5,
    y: 1.25,
    items: [
      ['Num', 1, 'NumLock'],
      ['/', 1, 'NumpadDivide'],
      ['*', 1, 'NumpadMultiply'],
      ['-', 1, 'NumpadSubtract'],
    ],
  },
  {
    x: 18.5,
    y: 2.25,
    items: [
      ['7', 1, 'Numpad7'],
      ['8', 1, 'Numpad8'],
      ['9', 1, 'Numpad9'],
      ['+', 1, 'NumpadAdd', 2],
    ],
  },
  {
    x: 18.5,
    y: 3.25,
    items: [
      ['4', 1, 'Numpad4'],
      ['5', 1, 'Numpad5'],
      ['6', 1, 'Numpad6'],
    ],
  },
  {
    x: 18.5,
    y: 4.25,
    items: [
      ['1', 1, 'Numpad1'],
      ['2', 1, 'Numpad2'],
      ['3', 1, 'Numpad3'],
      ['Ent', 1, 'NumpadEnter', 2],
    ],
  },
  {
    x: 18.5,
    y: 5.25,
    items: [
      ['0', 2, 'Numpad0'],
      ['.', 1, 'NumpadDecimal'],
    ],
  },
]

// ff = form factor của case (HHKB dùng chung case 60%)
interface LayoutDef {
  name: string
  ff: FormFactor
  /** cỡ case khác cũng vừa (case dựng theo kích thước layout, không có model CAD) */
  fits?: FormFactor[]
  variants: Partial<Record<VariantKey, string[]>>
  rows: (v: Variant) => RowSpec[]
  /** layout lấy toạ độ thật từ PCB CAD (Alice / Blossom): bỏ qua rows */
  fixed?: typeof ALICE_KEYS
  /** đường viền PCB thật (cùng hệ toạ độ với fixed) */
  outline?: [number, number][]
}

export const LAYOUTS: Record<LayoutId, LayoutDef> = {
  '40': {
    name: '40%',
    ff: '40',
    variants: { space: ['6.25u', 'split'] },
    rows: (v) => stack(alpha40(v)),
  },
  '60': {
    name: '60%',
    ff: '60',
    variants: { backspace: ['2u', 'split'], bottom: ['wk', 'wkl'], rshift: ['2.75u', 'split'] },
    rows: (v) => stack(alpha60(v)),
  },
  hhkb: {
    name: 'HHKB',
    ff: '60',
    variants: {},
    rows: () =>
      stack([
        ...hhkbTop,
        [
          1.5,
          ['Win', 1, 'MetaLeft'],
          ['Alt', 1.5, 'AltLeft'],
          ['', 7, 'Space'],
          ['Alt', 1.5, 'AltRight'],
          ['Win', 1, 'MetaRight'],
        ],
      ]),
  },
  truehhkb: {
    name: 'True HHKB',
    ff: '60',
    variants: {},
    rows: () =>
      stack([
        ...hhkbTop,
        [
          1.5,
          ['Alt', 1.5, 'AltLeft'],
          ['Win', 1.5, 'MetaLeft'],
          ['', 6, 'Space'],
          ['Win', 1.5, 'MetaRight'],
          ['Alt', 1.5, 'AltRight'],
        ],
      ]),
  },
  tkl: {
    name: 'TKL',
    ff: 'tkl',
    variants: { backspace: ['2u', 'split'], bottom: ['wk', 'wkl'] },
    rows: tklRows,
  },
  full: {
    name: 'Full size',
    ff: 'full',
    variants: { backspace: ['2u', 'split'], bottom: ['wk', 'wkl'] },
    rows: (v) => [...tklRows(v), ...numpad],
  },
  '65': {
    name: '65%',
    ff: '65',
    variants: {},
    rows: rows65,
  },
  '75': {
    name: '75%',
    ff: '75',
    variants: {},
    rows: rows75,
  },
  frl: {
    name: 'FRL (TKL không hàng F)',
    ff: 'frl',
    variants: { backspace: ['2u', 'split'], bottom: ['wk', 'wkl'] },
    rows: frlRows,
  },
  // Alice (Blossom, doughnut923/Blossom, MIT): 67 phím đúng tâm / góc / cỡ switch trên PCB KiCad (scripts/alice-layout.mjs)
  alice: {
    name: 'Alice (ergo)',
    ff: 'alice',
    variants: {},
    rows: () => [],
    fixed: ALICE_KEYS,
    outline: ALICE_OUTLINE,
  },
  // Planck (OLKB, case MIT từ MajorKoos/KBDParts): ortholinear 12 × 4, hàng dưới MIT (space 2u giữa)
  planck: {
    name: 'Planck (ortho 40%)',
    ff: 'planck',
    // 12u × 4u lọt khay case 40% (case 40% dựng theo bề rộng layout)
    fits: ['40'],
    variants: {},
    rows: () =>
      stack([
        [['Tab', 1, 'Tab'], ...chars('qwertyuiop'), ['Back', 1, 'Backspace']],
        [['Esc', 1, 'Escape'], ...chars("asdfghjkl;'")],
        [['Shift', 1, 'ShiftLeft'], ...chars('zxcvbnm,./'), ['Enter', 1, 'Enter']],
        [
          ['Ctrl', 1, 'ControlLeft'],
          ['Fn', 1],
          ['Win', 1, 'MetaLeft'],
          ['Alt', 1, 'AltLeft'],
          ['Lower', 1],
          ['', 2, 'Space'],
          ['Raise', 1],
          ['←', 1, 'ArrowLeft'],
          ['↓', 1, 'ArrowDown'],
          ['↑', 1, 'ArrowUp'],
          ['→', 1, 'ArrowRight'],
        ],
      ]),
  },
}

const VARIANT_INFO: Record<VariantKey, Record<string, string>> = {
  backspace: { '2u': 'Backspace 2u', split: 'Split backspace (1u + 1u)' },
  bottom: { wk: 'Hàng dưới WK (có phím Win)', wkl: 'Hàng dưới WKL (không Win, space 7u)' },
  rshift: { '2.75u': 'Shift phải 2.75u', split: 'Split shift phải (1.75u + Fn)' },
  space: { '6.25u': 'Space liền 6.25u', split: 'Split space (2.25u + 1.25u + 2.75u)' },
}

export const variantText = (v: Variant) =>
  (Object.entries(v) as [VariantKey, string][]).map(([k, val]) => VARIANT_INFO[k][val])

export function randomVariant(layoutId: LayoutId): Variant {
  const v: Variant = {}
  for (const [k, opts] of Object.entries(LAYOUTS[layoutId].variants) as [VariantKey, string[]][])
    v[k] = opts[Math.floor(Math.random() * opts.length)]
  return v
}

const cache = new Map<string, LayoutGeometry>()

// Trả về danh sách phím đã tính toạ độ tâm (cx, cz) quanh gốc 0
export function getLayout(layoutId: LayoutId, variant: Variant = {}): LayoutGeometry {
  const ck = layoutId + JSON.stringify(variant)
  const hit = cache.get(ck)
  if (hit) return hit
  type Raw = Omit<Key, 'id' | 'cx' | 'cz' | 'stab' | 'row'> & { px: number; pz: number }
  const raw: Raw[] = []
  const def = LAYOUTS[layoutId]
  // layout toạ độ thật: x = thứ tự trong hàng, y = hàng (để chia hàng keycap / bus PCB)
  def.fixed?.forEach((k, i) =>
    raw.push({
      label: k.label,
      w: k.w,
      h: 1,
      code: k.code,
      x: i,
      y: k.row,
      rot: (k.deg * Math.PI) / 180,
      px: k.cx,
      pz: k.cz,
    }),
  )
  for (const { x: x0, y, items, rot = 0, rx = 0, ry = 0 } of def.rows(variant)) {
    // xoay quanh trục đứng như three.js (rotation-y): (x, z) → (x cos + z sin, −x sin + z cos)
    const a = (rot * Math.PI) / 180
    const turn = (px: number, pz: number) => [
      rx + (px - rx) * Math.cos(a) + (pz - ry) * Math.sin(a),
      ry - (px - rx) * Math.sin(a) + (pz - ry) * Math.cos(a),
    ]
    let x = x0
    for (const it of items) {
      if (typeof it === 'number') {
        x += it
        continue
      }
      const [label, w = 1, code = null, h = 1] = it
      const [px, pz] = turn(x + w / 2, y + h / 2)
      raw.push({ label, w, h, code, x, y, rot: a, px, pz })
      x += w
    }
  }
  // khung bao theo 4 góc từng phím (đã xoay)
  const corners = raw.flatMap((k) =>
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([sx, sz]) => {
      const dx = (sx * k.w) / 2
      const dz = (sz * k.h) / 2
      return [
        k.px + dx * Math.cos(k.rot) + dz * Math.sin(k.rot),
        k.pz - dx * Math.sin(k.rot) + dz * Math.cos(k.rot),
      ]
    }),
  )
  const minX = Math.min(...corners.map((c) => c[0]))
  const minZ = Math.min(...corners.map((c) => c[1]))
  const width = Math.max(...corners.map((c) => c[0])) - minX
  const depth = Math.max(...corners.map((c) => c[1])) - minZ
  // hàng keycap đếm từ dưới lên: hàng dưới cùng = 4, Shift = 3, ASDF = 2, QWERTY = 1, hàng số và F = 0
  // (layout có hàng F / 40% không có hàng số vẫn khớp đúng hàng R của profile)
  const rowYs = [...new Set(raw.map((k) => k.y))].sort((a, b) => b - a)
  const keys: Key[] = raw.map(({ px, pz, ...k }, i) => ({
    ...k,
    id: String(i),
    cx: px - minX - width / 2,
    cz: pz - minZ - depth / 2,
    stab: k.w >= 2 || k.h >= 2,
    row: Math.max(0, 4 - rowYs.indexOf(k.y)),
  }))
  // tâm khung phím trong hệ toạ độ gốc của layout (Alice: theo tâm case CAD) → case dời theo
  // chỉ layout toạ độ thật (Alice / Blossom) mới lệch tâm so với gốc case CAD; layout thường đã canh giữa = 0
  const origin: [number, number] = def.fixed ? [minX + width / 2, minZ + depth / 2] : [0, 0]
  const outline = def.outline?.map(([x, z]): [number, number] => [x - origin[0], z - origin[1]])
  const result = { keys, width, depth, origin, outline }
  cache.set(ck, result)
  return result
}

/**
 * Khối chặn liền case: mặt case che kín mọi chỗ trên board không có phím (như case thật: khung quanh từng cụm phím —
 * khe giữa hàng F và hàng số, giữa cụm chính / cụm nav / cụm mũi tên TKL, 2 đầu HHKB, giữa Ctrl / Alt WKL, khe trước
 * mũi tên 75%...). Dò theo lưới 1/8u: ô nào không thuộc phím nào thì trống, gộp ô trống thành hình chữ nhật (ưu tiên
 * dải ngang). Khối chạm mép board kéo ra `edge` (u, ăn vào thành case) để liền 1 khối với case, không có đường cắt.
 * Mọi khối cao bằng nhau (ngang mép case, mặt khung phẳng như case thật). Trả về tâm x, z và kích thước w × d
 * (u, quanh gốc). Layout có phím xoay (Alice) không tính
 */
export function blockerGaps(keys: Key[], width: number, depth: number, edge: number) {
  if (keys.some((k) => k.rot)) return []
  const S = 0.125
  const nx = Math.round(width / S)
  const nz = Math.round(depth / S)
  const free = Array.from({ length: nz }, () => new Array<boolean>(nx).fill(true))
  for (const k of keys) {
    const x0 = Math.max(0, Math.round((k.cx - k.w / 2 + width / 2) / S))
    const x1 = Math.min(nx, Math.round((k.cx + k.w / 2 + width / 2) / S))
    const z0 = Math.max(0, Math.round((k.cz - k.h / 2 + depth / 2) / S))
    const z1 = Math.min(nz, Math.round((k.cz + k.h / 2 + depth / 2) / S))
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) free[z][x] = false
  }
  /** top: mặt trên riêng (u), không có thì theo mép case */
  const out: { x: number; z: number; w: number; d: number; top?: number }[] = []
  for (let z = 0; z < nz; z++)
    for (let x = 0; x < nx; x++) {
      if (!free[z][x]) continue
      // dải ngang dài nhất từ ô này, rồi kéo xuống các hàng ô còn trống đủ cả dải
      let x1 = x
      while (x1 < nx && free[z][x1]) x1++
      let z1 = z + 1
      while (z1 < nz && free[z1].slice(x, x1).every(Boolean)) z1++
      for (let zz = z; zz < z1; zz++) for (let xx = x; xx < x1; xx++) free[zz][xx] = false
      // vụn nhỏ hơn 1/4u cả 2 chiều (lệch làm tròn) thì bỏ
      if ((x1 - x) * S < 0.24 && (z1 - z) * S < 0.24) continue
      const l = x === 0 ? -edge : x * S
      const r = x1 === nx ? width + edge : x1 * S
      const t = z === 0 ? -edge : z * S
      const b = z1 === nz ? depth + edge : z1 * S
      out.push({
        x: (l + r) / 2 - width / 2,
        z: (t + b) / 2 - depth / 2,
        w: r - l,
        d: b - t,
      })
    }
  return out
}

/**
 * Đường bao các vùng phím (cụm F, cụm chính, cụm nav, cụm mũi tên...) trên lưới 1/8u: mỗi vùng ô phím liền nhau → 1 vòng
 * đa giác vuông góc [x, z] (u, quanh gốc). Dùng khoét tấm mica trên cùng của case mica ghép (khung chặn liền 1 tấm với mặt
 * case). Layout có phím xoay (Alice) trả về rỗng
 */
export function keyRegions(keys: Key[], width: number, depth: number): [number, number][][] {
  if (keys.some((k) => k.rot)) return []
  const S = 0.125
  const nx = Math.round(width / S)
  const nz = Math.round(depth / S)
  const occ = Array.from({ length: nz }, () => new Array<boolean>(nx).fill(false))
  for (const k of keys) {
    const x0 = Math.max(0, Math.round((k.cx - k.w / 2 + width / 2) / S))
    const x1 = Math.min(nx, Math.round((k.cx + k.w / 2 + width / 2) / S))
    const z0 = Math.max(0, Math.round((k.cz - k.h / 2 + depth / 2) / S))
    const z1 = Math.min(nz, Math.round((k.cz + k.h / 2 + depth / 2) / S))
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) occ[z][x] = true
  }
  const at = (x: number, z: number) => x >= 0 && z >= 0 && x < nx && z < nz && occ[z][x]
  // cạnh biên có hướng (ô phím luôn nằm bên trái khi đi theo cạnh) → nối thành vòng
  const next = new Map<string, [number, number][]>()
  const add = (a: [number, number], b: [number, number]) => {
    const k = `${a[0]},${a[1]}`
    next.set(k, [...(next.get(k) ?? []), b])
  }
  for (let z = 0; z < nz; z++)
    for (let x = 0; x < nx; x++) {
      if (!occ[z][x]) continue
      if (!at(x, z - 1)) add([x + 1, z], [x, z])
      if (!at(x - 1, z)) add([x, z], [x, z + 1])
      if (!at(x, z + 1)) add([x, z + 1], [x + 1, z + 1])
      if (!at(x + 1, z)) add([x + 1, z + 1], [x + 1, z])
    }
  const loops: [number, number][][] = []
  for (const [start] of next) {
    while (next.get(start)?.length) {
      const loop: [number, number][] = []
      let cur = start.split(',').map(Number) as [number, number]
      do {
        loop.push(cur)
        const key = `${cur[0]},${cur[1]}`
        const list = next.get(key)!
        cur = list.pop()!
        if (!list.length) next.delete(key)
      } while (`${cur[0]},${cur[1]}` !== start && loop.length < 100000)
      // bỏ điểm giữa đoạn thẳng
      const simple = loop.filter((p, i) => {
        const a = loop[(i + loop.length - 1) % loop.length]
        const b = loop[(i + 1) % loop.length]
        return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]))
      })
      // chỉ lấy viền ngoài vùng phím (trục z hướng xuống: diện tích âm), bỏ viền chỗ trống bị phím bao quanh
      let area = 0
      for (let i = 0; i < simple.length; i++) {
        const [x0, z0] = simple[i]
        const [x1, z1] = simple[(i + 1) % simple.length]
        area += x0 * z1 - x1 * z0
      }
      if (area < 0) loops.push(simple.map(([x, z]) => [x * S - width / 2, z * S - depth / 2]))
    }
  }
  return loops
}

/**
 * Bề dày lớp khung chặn (u, ~3,4mm): khối chặn là tấm mỏng ở mặt trên case (như mặt dưới case thật: khung mỏng quanh
 * các cụm phím, bên dưới rỗng), nối vào thành case qua các dải — không phải khối đặc từ sàn lên
 */
export const BLOCKER_SKIN = 0.18

/** Cao độ mặt trên khối chặn (u, mặt plate = 0): ngang mép case, thấp hơn mặt keycap một chút */
export const BLOCKER_TOP = 0.62
