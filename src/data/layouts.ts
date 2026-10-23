import type { Key, LayoutGeometry, LayoutId, FormFactor, Variant, VariantKey } from '@/types'

// Mỗi hàng: { x, y, items } — item là số (khoảng trống, đơn vị u) hoặc [nhãn, rộng, KeyboardEvent.code, cao]
type KeyTuple = [label: string, w?: number, code?: string | null, h?: number]
type Item = number | KeyTuple
interface RowSpec {
  x: number
  y: number
  items: Item[]
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
  variants: Partial<Record<VariantKey, string[]>>
  rows: (v: Variant) => RowSpec[]
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
}

export const VARIANT_INFO: Record<VariantKey, Record<string, string>> = {
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
  const raw: Omit<Key, 'id' | 'cx' | 'cz' | 'stab'>[] = []
  for (const { x: x0, y, items } of LAYOUTS[layoutId].rows(variant)) {
    let x = x0
    for (const it of items) {
      if (typeof it === 'number') {
        x += it
        continue
      }
      const [label, w = 1, code = null, h = 1] = it
      raw.push({ label, w, h, code, x, y })
      x += w
    }
  }
  const width = Math.max(...raw.map((k) => k.x + k.w))
  const depth = Math.max(...raw.map((k) => k.y + k.h))
  const keys: Key[] = raw.map((k, i) => ({
    ...k,
    id: String(i),
    cx: k.x + k.w / 2 - width / 2,
    cz: k.y + k.h / 2 - depth / 2,
    stab: k.w >= 2 || k.h >= 2,
  }))
  const result = { keys, width, depth }
  cache.set(ck, result)
  return result
}
