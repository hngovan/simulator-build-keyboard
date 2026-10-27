/** khoảng cách tooltip tới phần tử / mép màn hình (px) */
const GAP = 8
const EDGE = 8

/**
 * Vị trí tooltip / khung nổi theo kích thước thật (đo sau lần vẽ đầu): ưu tiên phía `prefer`, không đủ chỗ thì lật sang
 * phía kia, cả 2 đều chật thì chọn phía rộng hơn rồi ép trong màn hình; chiều ngang căn giữa (hoặc mép trái phần tử
 * với `start`) và không tràn ra ngoài
 */
export function placeTip(
  anchor: DOMRect,
  w: number,
  h: number,
  prefer: 'top' | 'bottom' = 'top',
  start = false,
) {
  const above = anchor.top - GAP - EDGE
  const below = innerHeight - anchor.bottom - GAP - EDGE
  const fits = prefer === 'top' ? h <= above : h <= below
  const side = fits ? prefer : above > below ? 'top' : 'bottom'
  const rawTop = side === 'top' ? anchor.top - GAP - h : anchor.bottom + GAP
  const top = Math.min(Math.max(EDGE, rawTop), innerHeight - h - EDGE)
  const rawLeft = start ? anchor.left : anchor.left + anchor.width / 2 - w / 2
  const left = Math.min(Math.max(EDGE, rawLeft), innerWidth - w - EDGE)
  return { left, top }
}
