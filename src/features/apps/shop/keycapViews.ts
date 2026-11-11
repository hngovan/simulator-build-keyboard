/**
 * Loại phím xem được trong khung 3D sản phẩm keycap Shopii (ô "Xem phím"): 1u, Backspace, Shift (trái + phải cùng lúc), Enter (thường / ISO / Big-ass
 * cùng lúc), Space (mọi cỡ cùng lúc). `row` = hàng keycap (0 = hàng số … 4 = hàng dưới cùng)
 */
export type KeycapPart =
  /** phím chữ nhật rộng `w` (u) */
  | { w: number }
  /** Enter chữ L lấy từ layout 60% */
  | { enter: 'iso' | 'bae' }

export interface KeycapView {
  id: string
  label: string
  row: number
  parts: KeycapPart[]
  /** nhiều phím: xếp từ sau ra trước (`z`, space) hoặc ngang cạnh nhau (`x`, Enter) */
  stack?: 'x' | 'z'
}

export const KEYCAP_VIEWS: KeycapView[] = [
  { id: '1u', label: 'Phím 1u', row: 2, parts: [{ w: 1 }] },
  { id: 'bs', label: 'Backspace 2u', row: 0, parts: [{ w: 2 }] },
  // Shift trái (2.25u ANSI, 1.25u ISO) + phải (2.75u, 1.75u) cạnh nhau
  {
    id: 'shift',
    label: 'Shift (trái + phải)',
    row: 3,
    parts: [{ w: 2.25 }, { w: 1.25 }, { w: 2.75 }, { w: 1.75 }],
    stack: 'x',
  },
  {
    id: 'enter',
    label: 'Enter (3 kiểu)',
    row: 2,
    parts: [{ w: 2.25 }, { enter: 'iso' }, { enter: 'bae' }],
    stack: 'x',
  },
  {
    id: 'space',
    label: 'Space (5 cỡ)',
    row: 4,
    parts: [{ w: 7 }, { w: 6.25 }, { w: 6 }, { w: 3 }, { w: 2.75 }],
    stack: 'z',
  },
]

export const keycapView = (id: string | undefined) =>
  KEYCAP_VIEWS.find((v) => v.id === id) ?? KEYCAP_VIEWS[0]
