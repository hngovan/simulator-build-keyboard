import type { Key, LayoutGeometry, LayoutId, FormFactor, Variant, VariantKey } from '@/types'
import polygonClipping, { type Polygon } from 'polygon-clipping'
import { ALICE_KEYS, ALICE_OUTLINE } from './aliceKeys'

// Mỗi hàng: { x, y, items } — item là số (khoảng trống, đơn vị u) hoặc [nhãn, rộng, KeyboardEvent.code, cao, phần mở rộng]
// phần mở rộng phím chữ L = [x2, y2, w2, h2] như KLE (tính từ góc trái trên ô chính)
type KeyTuple = [
  label: string,
  w?: number,
  code?: string | null,
  h?: number,
  ext?: [number, number, number, number],
]
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

/** mã phím của 1 item (không phải khoảng trống) */
const codeAt = (it: Item) => (typeof it === 'number' ? undefined : it[2])

/**
 * Kiểu Backspace của 4 hàng chữ (hàng số, QWERTY, ASDF, Shift):
 * - `split`: Backspace 2u hàng số → "Back" 1u + "Del" 1u (60 / TKL / full đã tách sẵn ở `backspace`, 65 / 75 tách ở đây)
 * - `row2` (kiểu HHKB): `\|` 1.5u hàng QWERTY → Backspace 1.5u; chỗ Backspace hàng số → `\|` 1u + "Del" 1u.
 *   Enter ISO / Big-ass Enter chiếm chỗ `\|` hàng QWERTY → bỏ qua `row2`
 */
function backspaceSpot(v: Variant, [num, top, home, shift]: Item[][]): Item[][] {
  const b = num.findIndex((it) => codeAt(it) === 'Backspace')
  if (b < 0 || (v.backspace !== 'split' && v.backspace !== 'row2')) return [num, top, home, shift]
  const next = num[b + 1]
  const len = typeof next !== 'number' && next?.[0] === 'Del' ? 2 : 1
  if (v.backspace === 'split')
    return len === 2
      ? [num, top, home, shift]
      : [
          [...num.slice(0, b), ['Back', 1, 'Backspace'], ['Del', 1], ...num.slice(b + 1)],
          top,
          home,
          shift,
        ]
  if (v.enter === 'iso' || v.enter === 'bae') return [num, top, home, shift]
  return [
    [...num.slice(0, b), ['\\', 1, 'Backslash'], ['Del', 1], ...num.slice(b + len)],
    top.map((it): Item =>
      codeAt(it) === 'Backslash' ? ['Back', (it as KeyTuple)[1], 'Backspace'] : it,
    ),
    home,
    shift,
  ]
}

/**
 * Caps Lock stepped (`caps: 'stepped'`): Caps 1.75u → phần nhô 1.25u (switch ở giữa phần nhô) + bậc thấp 0.5u bên phải; phím 2 ô như
 * Enter chữ L (`ext` cùng hàng phủ cả 1.75u, keycap dựng bậc ở Keycap.tsx `stepOf`), khe 0.5u sau phím để hàng không lệch
 */
function capsSpot(v: Variant, [num, top, home, shift]: Item[][]): Item[][] {
  if (v.caps !== 'stepped') return [num, top, home, shift]
  // HHKB / True HHKB: Ctrl nằm chỗ Caps Lock → Ctrl stepped
  const i = home.findIndex((it) => codeAt(it) === 'CapsLock' || codeAt(it) === 'ControlLeft')
  const it = home[i]
  if (i < 0 || typeof it === 'number') return [num, top, home, shift]
  const w = it[1] ?? 1
  if (w <= 1.25) return [num, top, home, shift]
  return [
    num,
    top,
    [...home.slice(0, i), [it[0], 1.25, it[2], 1, [0, 0, w, 1]], w - 1.25, ...home.slice(i + 1)],
    shift,
  ]
}

/**
 * Shift trái ngắn kiểu ISO (`lshift: 'split'`): Shift trái 2.25u → Shift 1.25u + `<>` 1u (IntlBackslash). Enter ISO đã tự tách
 * Shift trái → bỏ qua
 */
function lshiftSpot(v: Variant, [num, top, home, shift]: Item[][]): Item[][] {
  if (v.lshift !== 'split' || v.enter === 'iso') return [num, top, home, shift]
  const i = shift.findIndex((it) => codeAt(it) === 'ShiftLeft')
  if (i < 0) return [num, top, home, shift]
  return [
    num,
    top,
    home,
    [
      ...shift.slice(0, i),
      ['Shift', 1.25, 'ShiftLeft'],
      ['<>', 1, 'IntlBackslash'],
      ...shift.slice(i + 1),
    ],
  ]
}

/**
 * Đổi cụm Enter của 4 hàng chữ (hàng số, QWERTY, ASDF, Shift) theo `v.enter`, giữ nguyên các phím sau cụm (cột điều hướng 65 / 75%):
 * - ISO: `\` 1.5u hàng QWERTY → khe 0.25u + Enter chữ L (ô chính 1.25 × 2u, cánh trên 1.5u); Enter 2.25u hàng ASDF → `#` 1u
 *   + khe 1.25u (ô chính Enter phủ); Shift trái 2.25u → Shift 1.25u + `\` 1u (IntlBackslash)
 * - Big-ass Enter: Backspace (2u / split) → `\` 1u + Backspace 1u; `\` 1.5u hàng QWERTY → Enter chữ L (ô chính 1.5 × 2u,
 *   cánh dưới 2.25u hàng ASDF); Enter 2.25u hàng ASDF → khe 2.25u (cánh dưới phủ)
 */
function enterCluster(v: Variant, rows: Item[][]): Item[][] {
  const [num, top, home, shift] = capsSpot(v, lshiftSpot(v, backspaceSpot(v, rows)))
  if (v.enter !== 'iso' && v.enter !== 'bae') return [num, top, home, shift]
  const swap = (row: Item[], code: string, by: Item[]) => {
    const i = row.findIndex((it) => codeAt(it) === code)
    return i < 0 ? row : [...row.slice(0, i), ...by, ...row.slice(i + 1)]
  }
  if (v.enter === 'iso')
    return [
      num,
      swap(top, 'Backslash', [0.25, ['Enter', 1.25, 'Enter', 2, [-0.25, 0, 1.5, 1]]]),
      swap(home, 'Enter', [['#', 1, 'Backslash'], 1.25]),
      swap(shift, 'ShiftLeft', [
        ['Shift', 1.25, 'ShiftLeft'],
        ['\\', 1, 'IntlBackslash'],
      ]),
    ]
  // Backspace split = "Back" 1u + "Del" 1u (không mã): bỏ cả 2
  const b = num.findIndex((it) => codeAt(it) === 'Backspace')
  const next = num[b + 1]
  const bLen = typeof next !== 'number' && next?.[0] === 'Del' ? 2 : 1
  return [
    b < 0
      ? num
      : [
          ...num.slice(0, b),
          ['\\', 1, 'Backslash'],
          ['Back', 1, 'Backspace'],
          ...num.slice(b + bLen),
        ],
    swap(top, 'Backslash', [['Enter', 1.5, 'Enter', 2, [-0.75, 1, 2.25, 1]]]),
    swap(home, 'Enter', [2.25]),
    shift,
  ]
}

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
    : v.bottom === 'wk7'
      ? // WK space 7u (Tsangan có Win): như WKL nhưng 2 ô trống thành phím Win 1u
        [
          ['Ctrl', 1.5, 'ControlLeft'],
          ['Win', 1, 'MetaLeft'],
          ['Alt', 1.5, 'AltLeft'],
          ['', 7, 'Space'],
          ['Alt', 1.5, 'AltRight'],
          ['Win', 1, 'MetaRight'],
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
  ...enterCluster(v, [
    [...chars('`1234567890-='), ...backspace(v)],
    [['Tab', 1.5, 'Tab'], ...chars('qwertyuiop[]'), ['\\', 1.5, 'Backslash']],
    [['Caps', 1.75, 'CapsLock'], ...chars("asdfghjkl;'"), ['Enter', 2.25, 'Enter']],
    [['Shift', 2.25, 'ShiftLeft'], ...chars('zxcvbnm,./'), ...rshift(v)],
  ]),
  bottomRow(v),
]

/**
 * Cụm Enter 40% (3 hàng chữ): ISO / Big-ass Enter chữ L chiếm cuối hàng ASDF + hàng Shift (hàng QWERTY giữ Backspace 1.75u),
 * mất Shift phải; kiểu mũi tên (↑ dưới cột `.`) vướng ô Enter → giữ Enter ANSI:
 * - ISO: hàng ASDF Tab 1u + `A`–`;` + khe 0.25u + cánh trên 1.75u; ô chính 1.5 × 2u, hàng Shift còn Shift 1.25u + `Z`–`/`
 * - Big-ass: hàng ASDF Tab 1.25u + `A`–`;` + ô chính 1.5 × 2u; cánh dưới 2.25u hàng Shift (Shift 1.5u + `Z`–`.`, bỏ `/`)
 */
function enter40(v: Variant, [top, home, shift]: Item[][]): Item[][] {
  if ((v.enter !== 'iso' && v.enter !== 'bae') || v.space === 'arrow') return [top, home, shift]
  // phím chữ hàng ASDF / Shift (bỏ Tab / Enter, Shift trái / phải)
  const letters = home.slice(1, -1)
  const zs = shift.slice(1, -1)
  if (v.enter === 'iso')
    return [
      top,
      [['Tab', 1, 'Tab'], ...letters, 0.25, ['Enter', 1.5, 'Enter', 2, [-0.25, 0, 1.75, 1]]],
      [['Shift', 1.25, 'ShiftLeft'], ...zs],
    ]
  return [
    top,
    [['Tab', 1.25, 'Tab'], ...letters, ['Enter', 1.5, 'Enter', 2, [-0.75, 1, 2.25, 1]]],
    [['Shift', 1.5, 'ShiftLeft'], ...zs.slice(0, -1)],
  ]
}

const alpha40 = (v: Variant): Item[][] => [
  ...enter40(v, [
    [['Esc', 1, 'Escape'], ...chars('qwertyuiop'), ['Back', 1.75, 'Backspace']],
    [['Tab', 1.25, 'Tab'], ...chars('asdfghjkl;'), ['Enter', 1.5, 'Enter']],
    v.space === 'arrow'
      ? // mũi tên: ↑ thế chỗ phím trước '/', ← ↓ → góc phải hàng dưới
        [
          ['Shift', 1.75, 'ShiftLeft'],
          ...chars('zxcvbnm,.'),
          ['↑', 1, 'ArrowUp'],
          ['/', 1, 'Slash'],
        ]
      : [['Shift', 1.75, 'ShiftLeft'], ...chars('zxcvbnm,./'), ['Shift', 1, 'ShiftRight']],
  ]),
  v.space === 'arrow'
    ? // split space 2.25u + 2.75u, Fn + cụm mũi tên (cùng bề ngang 12.75u)
      [
        ['Ctrl', 1.25, 'ControlLeft'],
        ['Win', 1.25, 'MetaLeft'],
        ['Alt', 1.25, 'AltLeft'],
        ['', 2.25, 'Space'],
        ['', 2.75],
        ['Fn', 1],
        ['←', 1, 'ArrowLeft'],
        ['↓', 1, 'ArrowDown'],
        ['→', 1, 'ArrowRight'],
      ]
    : v.space === 'split'
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
      : v.space === 'hhkbSplit' || v.space === 'hhkbSplit3' || v.space === 'hhkbSplit275'
        ? // kiểu HHKB split space: như `hhkb`, phần space 7u chia 2 nửa + Fn giữa (stab 2u mỗi nửa):
          // 2.75u + 1.5u + 2.75u / đều 3u + 1u + 3u / lệch 2.75u + 1.25u + 3u
          (() => {
            const [l, fn, r] =
              v.space === 'hhkbSplit3'
                ? [3, 1, 3]
                : v.space === 'hhkbSplit275'
                  ? [2.75, 1.25, 3]
                  : [2.75, 1.5, 2.75]
            return [
              1.25,
              ['Alt', 1.5, 'AltLeft'],
              ['', l, 'Space'],
              ['Fn', fn],
              ['', r],
              ['Alt', 1.5, 'AltRight'],
            ] satisfies Item[]
          })()
        : v.space === 'hhkb'
          ? // kiểu HHKB: bỏ 2 phím góc hàng dưới (khối chặn 1.25u trái / 1.5u phải), Alt 1.5u + space 7u + Alt 1.5u, cùng bề ngang 12.75u
            [1.25, ['Alt', 1.5, 'AltLeft'], ['', 7, 'Space'], ['Alt', 1.5, 'AltRight']]
          : v.space === '10u'
            ? // space 10u gần kín cả hàng (stab dây 7u giữa phím), chỉ chừa Ctrl / Fn 2 đầu, cùng bề ngang 12.75u
              [
                ['Ctrl', 1.25, 'ControlLeft'],
                ['', 10, 'Space'],
                ['Fn', 1.5],
              ]
            : v.space === '7u'
              ? // space 7u (stab dây 7u): bỏ Win, Ctrl / Alt to hơn, cùng bề ngang 12.75u
                [
                  ['Ctrl', 1.5, 'ControlLeft'],
                  ['Alt', 1.5, 'AltLeft'],
                  ['', 7, 'Space'],
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

/**
 * TKL F13 (Duality Horns...): hàng F dồn sát, cách nhau 0.25u (Esc · F1–F4 · F5–F8 · F9–F12 · F13) rồi cụm PrtSc;
 * các hàng dưới như TKL
 */
const tklF13Rows = (v: Variant): RowSpec[] => [
  {
    x: 0,
    y: 0,
    items: [
      ['Esc', 1, 'Escape'],
      0.25,
      F(1),
      F(2),
      F(3),
      F(4),
      0.25,
      F(5),
      F(6),
      F(7),
      F(8),
      0.25,
      F(9),
      F(10),
      F(11),
      F(12),
      0.25,
      F(13),
    ],
  },
  ...tklRows(v).slice(1),
]

/** TKL bỏ hàng F (Function Row Less): cả cụm phím dời lên 1.25u */
const frlRows = (v: Variant): RowSpec[] =>
  tklRows(v)
    .filter((r) => r.y > 0)
    .map((r) => ({ ...r, y: r.y - 1.25 }))

/** 65%: 75% bỏ hàng F (cột điều hướng bên phải, mũi tên dưới Shift) */
const rows65 = (v: Variant): RowSpec[] =>
  rows75(v)
    .filter((r) => r.y > 0)
    .map((r) => ({ ...r, y: r.y - 1 }))

/** 75% gọn (kiểu KBD75 / Q1): hàng F sát hàng số, cột điều hướng bên phải, mũi tên lọt dưới Shift */
/**
 * 75% kiểu Repent75 (đo từ model case: lòng 16u): hàng F tách nhóm Esc | F1–F4 | F5–F8 | F9–F12 | Del (khe 0.5u)
 * và cách hàng số 0.25u (thanh ngang của case); hàng dưới 12.5u phím + khe 0.5u + cụm mũi tên
 */
const rows75 = (v: Variant): RowSpec[] => [
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
      ...enterCluster(v, [
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
      ]),
      [
        // WK space 7u: Ctrl 1.5 + Win 1 + Alt 1.5 + space 7 + Alt 1.5 (cũng 12.5u)
        ...((v.bottom === 'wk7'
          ? [
              ['Ctrl', 1.5, 'ControlLeft'],
              ['Win', 1, 'MetaLeft'],
              ['Alt', 1.5, 'AltLeft'],
              ['', 7, 'Space'],
              ['Alt', 1.5, 'AltRight'],
            ]
          : [
              ['Ctrl', 1.25, 'ControlLeft'],
              ['Win', 1.25, 'MetaLeft'],
              ['Alt', 1.25, 'AltLeft'],
              ['', 6.25, 'Space'],
              ['Alt', 1.25, 'AltRight'],
              ['Ctrl', 1.25, 'ControlRight'],
            ]) as Item[]),
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

/** kiểu Enter (60 / 65 / 75 / TKL / full): ANSI, ISO chữ L, Big-ass Enter (`enterCluster`); chỉ case dựng bằng code (`caseFits`) */
const ENTERS = ['ansi', 'iso', 'bae']

// ff = form factor của case (HHKB dùng chung case 60%)
interface LayoutDef {
  name: string
  ff: FormFactor
  /** cỡ case khác cũng vừa (case dựng theo kích thước layout, không có model CAD) */
  fits?: FormFactor[]
  /** case CAD (nắp cắt sẵn ô phím) phải ghi đích danh layout này trong `CaseDef.layouts` mới vừa (vd TKL F13 lệch hàng F) */
  strict?: boolean
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
    variants: {
      space: [
        '6.25u',
        '7u',
        '10u',
        'hhkb',
        'hhkbSplit',
        'hhkbSplit3',
        'hhkbSplit275',
        'split',
        'arrow',
      ],
      enter: ENTERS,
    },
    rows: (v) => stack(alpha40(v)),
  },
  '60': {
    name: '60%',
    ff: '60',
    variants: {
      backspace: ['2u', 'split', 'row2'],
      bottom: ['wk', 'wk7', 'wkl'],
      lshift: ['2.25u', 'split'],
      caps: ['normal', 'stepped'],
      rshift: ['2.75u', 'split'],
      enter: ENTERS,
    },
    rows: (v) => stack(alpha60(v)),
  },
  hhkb: {
    name: 'HHKB',
    ff: '60',
    variants: { space: ['7u', '10u'], caps: ['normal', 'stepped'] },
    rows: (v) =>
      stack([
        ...capsSpot(v, hhkbTop),
        v.space === '10u'
          ? // space 10u kín hàng giữa 2 khối chặn 1.5u: chỉ chừa 1 phím 1.75u mỗi bên (stab dây 7u giữa phím)
            [1.5, ['Alt', 1.75, 'AltLeft'], ['', 10, 'Space'], ['Alt', 1.75, 'AltRight']]
          : [
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
    variants: { caps: ['normal', 'stepped'] },
    rows: (v) =>
      stack([
        ...capsSpot(v, hhkbTop),
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
    variants: {
      backspace: ['2u', 'split', 'row2'],
      bottom: ['wk', 'wk7', 'wkl'],
      lshift: ['2.25u', 'split'],
      caps: ['normal', 'stepped'],
      enter: ENTERS,
    },
    rows: tklRows,
  },
  tklf13: {
    name: 'TKL F13',
    ff: 'tkl',
    strict: true,
    // Duality Horns (case duy nhất dùng F13): nắp gốc WKL, bản WK khoét bỏ khối chặn chỗ Win (`bun run gen:duality-wk`)
    variants: {
      backspace: ['2u', 'split', 'row2'],
      bottom: ['wkl', 'wk'],
      lshift: ['2.25u', 'split'],
      caps: ['normal', 'stepped'],
    },
    rows: tklF13Rows,
  },
  full: {
    name: 'Full size',
    ff: 'full',
    variants: {
      backspace: ['2u', 'split', 'row2'],
      bottom: ['wk', 'wk7', 'wkl'],
      lshift: ['2.25u', 'split'],
      caps: ['normal', 'stepped'],
      enter: ENTERS,
    },
    rows: (v) => [...tklRows(v), ...numpad],
  },
  '65': {
    name: '65%',
    ff: '65',
    variants: {
      backspace: ['2u', 'split', 'row2'],
      bottom: ['wk', 'wk7'],
      lshift: ['2.25u', 'split'],
      caps: ['normal', 'stepped'],
      enter: ENTERS,
    },
    rows: rows65,
  },
  '75': {
    name: '75%',
    ff: '75',
    variants: {
      backspace: ['2u', 'split', 'row2'],
      lshift: ['2.25u', 'split'],
      caps: ['normal', 'stepped'],
      enter: ENTERS,
    },
    rows: rows75,
  },
  frl: {
    name: 'FRL (TKL không hàng F)',
    ff: 'frl',
    variants: {
      backspace: ['2u', 'split', 'row2'],
      bottom: ['wk', 'wk7', 'wkl'],
      lshift: ['2.25u', 'split'],
      caps: ['normal', 'stepped'],
    },
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
  backspace: {
    '2u': 'Backspace 2u',
    split: 'Split backspace (1u + 1u)',
    row2: 'Backspace hàng 2 (thay \\|, hàng số \\| + Del 1u)',
  },
  bottom: {
    wk: 'Hàng dưới WK (có phím Win, space 6.25u)',
    wk7: 'Hàng dưới WK space 7u (Win 1u)',
    wkl: 'Hàng dưới WKL (không Win, space 7u)',
  },
  rshift: { '2.75u': 'Shift phải 2.75u', split: 'Split shift phải (1.75u + Fn)' },
  lshift: { '2.25u': 'Shift trái 2.25u', split: 'Shift trái ISO (1.25u + <>)' },
  caps: { normal: 'Caps Lock thường', stepped: 'Caps Lock stepped (bậc 1.25u + 0.5u)' },
  enter: { ansi: 'Enter ANSI', iso: 'Enter ISO', bae: 'Big-ass Enter' },
  space: {
    '6.25u': 'Space liền 6.25u',
    '7u': 'Space liền 7u (không Win)',
    '10u': 'Space 10u',
    hhkb: 'HHKB (space 7u)',
    hhkbSplit: 'HHKB split space (2.75u + 1.5u + 2.75u)',
    hhkbSplit3: 'HHKB split space (3u + 1u + 3u)',
    hhkbSplit275: 'HHKB split space (2.75u + 1.25u + 3u)',
    split: 'Split space (2.25u + 1.25u + 2.75u)',
    arrow: 'Split space + mũi tên (2.25u + 2.75u)',
  },
}
/** tên 1 kiểu layout (vd "Split space (2.25u + 1.25u + 2.75u)") */
export const variantLabel = (k: VariantKey, val: string) => VARIANT_INFO[k][val] ?? val
/** tên từng lựa chọn kiểu layout (nhãn dòng ở bảng Free build) */
export const VARIANT_NAME: Record<VariantKey, string> = {
  backspace: 'Kiểu backspace',
  bottom: 'Layout row cuối',
  rshift: 'Kiểu shift phải',
  lshift: 'Kiểu shift trái',
  caps: 'Kiểu Caps Lock',
  // 40% / HHKB: kiểu space = cả hàng dưới
  space: 'Layout row cuối',
  enter: 'Kiểu enter',
}
/** nhãn ngắn cho nút chọn (lựa chọn chỉ 2 kiểu hiện thành nút) */
const VARIANT_SHORT: Partial<Record<VariantKey, Record<string, string>>> = {
  caps: { normal: 'Thường', stepped: 'Stepped (bậc 1.25u + 0.5u)' },
  bottom: { wk: 'WK space 6.25u', wk7: 'WK space 7u', wkl: 'WKL' },
}
export const variantShort = (k: VariantKey, val: string) =>
  VARIANT_SHORT[k]?.[val] ?? variantLabel(k, val)

/** plate universal (ai03, sinh sẵn) không có lỗ cho các phím này → cắt lỗ plate theo phím: Enter ISO / Big-ass + Caps stepped (`ext`),
 * Shift trái ISO (phím <>), hàng dưới WK space 7u (Win 1u) */
export const offUniversal = (keys: Key[]) =>
  keys.some(
    (k) =>
      k.ext ||
      k.code === 'IntlBackslash' ||
      ((k.code === 'MetaLeft' || k.code === 'MetaRight') && k.w === 1),
  )

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
      const [label, w = 1, code = null, h = 1, e] = it
      const [px, pz] = turn(x + w / 2, y + h / 2)
      // phím chữ L: tâm cánh tương đối tâm ô chính (chưa xoay)
      const ext = e && { x: e[0] + e[2] / 2 - w / 2, z: e[1] + e[3] / 2 - h / 2, w: e[2], h: e[3] }
      raw.push({ label, w, h, code, x, y, rot: a, px, pz, ...(ext && { ext }) })
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
/**
 * Các ô chữ nhật phủ mặt phím (toạ độ layout, chưa xoay: dùng cho layout không xoay): ô chính + cánh phím chữ L (Enter ISO / Big-ass)
 */
export function keyRects(k: Key): { x: number; z: number; w: number; h: number }[] {
  const main = { x: k.cx, z: k.cz, w: k.w, h: k.h }
  return k.ext ? [main, { x: k.cx + k.ext.x, z: k.cz + k.ext.z, w: k.ext.w, h: k.ext.h }] : [main]
}

export function blockerGaps(keys: Key[], width: number, depth: number, edge: number) {
  if (keys.some((k) => k.rot)) return []
  const S = 0.125
  const nx = Math.round(width / S)
  const nz = Math.round(depth / S)
  const free = Array.from({ length: nz }, () => new Array<boolean>(nx).fill(true))
  for (const r of keys.flatMap(keyRects)) {
    const x0 = Math.max(0, Math.round((r.x - r.w / 2 + width / 2) / S))
    const x1 = Math.min(nx, Math.round((r.x + r.w / 2 + width / 2) / S))
    const z0 = Math.max(0, Math.round((r.z - r.h / 2 + depth / 2) / S))
    const z1 = Math.min(nz, Math.round((r.z + r.h / 2 + depth / 2) / S))
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
 * Vùng phím của layout có phím xoay (Alice, như khung trên Blossom): hợp các ô phím (w × h, xoay theo `rot`) nới 0,01u
 * cho ô sát nhau dính liền; mỗi vùng lấy viền ngoài (chỗ trống bị phím bao quanh cũng khoét như `keyRegions`)
 */
function rotatedRegions(keys: Key[]): [number, number][][] {
  const G = 0.01
  const rects = keys.map((k): Polygon => {
    const c = Math.cos(k.rot)
    const s = Math.sin(k.rot)
    const hx = k.w / 2 + G
    const hz = k.h / 2 + G
    const pt = (dx: number, dz: number): [number, number] => [
      k.cx + dx * c + dz * s,
      k.cz - dx * s + dz * c,
    ]
    return [[pt(-hx, -hz), pt(hx, -hz), pt(hx, hz), pt(-hx, hz), pt(-hx, -hz)]]
  })
  const [first, ...rest] = rects
  if (!first) return []
  // viền ngoài polygon-clipping lặp lại điểm đầu ở cuối → bỏ
  return polygonClipping.union(first, ...rest).map(([outer]) => outer.slice(0, -1))
}

/**
 * Đường bao các vùng phím (cụm F, cụm chính, cụm nav, cụm mũi tên...) trên lưới 1/8u: mỗi vùng ô phím liền nhau → 1 vòng
 * đa giác vuông góc [x, z] (u, quanh gốc). Dùng khoét tấm mica trên cùng của case mica ghép (khung chặn liền 1 tấm với mặt
 * case). Layout có phím xoay (Alice): gộp các ô phím xoay thành vùng (`rotatedRegions`)
 */
export function keyRegions(keys: Key[], width: number, depth: number): [number, number][][] {
  if (keys.some((k) => k.rot)) return rotatedRegions(keys)
  const S = 0.125
  const nx = Math.round(width / S)
  const nz = Math.round(depth / S)
  const occ = Array.from({ length: nz }, () => new Array<boolean>(nx).fill(false))
  for (const r of keys.flatMap(keyRects)) {
    const x0 = Math.max(0, Math.round((r.x - r.w / 2 + width / 2) / S))
    const x1 = Math.min(nx, Math.round((r.x + r.w / 2 + width / 2) / S))
    const z0 = Math.max(0, Math.round((r.z - r.h / 2 + depth / 2) / S))
    const z1 = Math.min(nz, Math.round((r.z + r.h / 2 + depth / 2) / S))
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
