import { create } from 'zustand'

/**
 * Đóng gói (bước cuối `pack`, nút cam "Đóng gói" trên thanh bàn build): `at` = lúc bắt đầu hoạt cảnh thùng úp lên bàn phím,
 * `stash` = cất đơn dở vào thùng (nút "Cầm thùng đơn lên": xong thì cầm thùng đi, không chấm điểm) thay vì giao (`deliver`),
 * `ask` = đang hỏi lại vì build chưa xong / còn yêu cầu khách chưa đạt, `clean` = build đủ (HUD cập nhật)
 */
export const usePack = create<{ at: number | null; stash: boolean; ask: boolean; clean: boolean }>(
  () => ({
    at: null,
    stash: false,
    ask: false,
    clean: false,
  }),
)

/** bấm thùng / nút đóng gói: build đủ thì đóng luôn, chưa đủ thì hỏi lại */
export function requestPack() {
  const p = usePack.getState()
  if (p.at !== null) return
  if (p.clean) usePack.setState({ at: performance.now(), stash: false })
  else usePack.setState({ ask: true })
}

/** đã xác nhận giao dù chưa xong: chạy hoạt cảnh đóng gói */
export const confirmPack = () =>
  usePack.setState({ ask: false, at: performance.now(), stash: false })

/** đơn đang build dở: cho bàn phím lại vào thùng (hoạt cảnh như đóng gói), xong thì cầm thùng lên mang đi cất */
export function requestStash() {
  if (usePack.getState().at !== null) return
  usePack.setState({ at: performance.now(), stash: true })
}
