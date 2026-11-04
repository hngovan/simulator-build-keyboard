import { create } from 'zustand'
import { useGame } from '@/store'
import { SUPPLIES } from '@/data/supplies'
import { SPELL_KEY, useDevSpells } from '@/lib/devSpells'

export { useDevSpells }

// Chỉ dùng khi dev: tiền vô hạn để thử Shopii / dụng cụ / sách phép cho nhanh; Shopii mở khoá mọi món.
// Cả 2 công tắc lưu theo máy (localStorage, như công tắc FPS), tải lại trang vẫn giữ
const RICH = 999_999_999
const MONEY_KEY = 'sbk-dev-money'
const BEFORE_KEY = 'sbk-dev-money-before'
const UNLOCK_KEY = 'sbk-dev-unlock'
const SPELL_BEFORE_KEY = 'sbk-dev-spells-before'

const read = (key: string) => {
  if (!import.meta.env.DEV) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // không lưu được thì chỉ giữ trong phiên này
  }
}

export const useDevMoney = create<{ on: boolean }>(() => ({ on: false }))

let unsub: (() => void) | null = null
/** tiền trước khi bật, tắt thì trả lại (lưu cùng công tắc để tải lại trang vẫn trả đúng) */
let before = Number(read(BEFORE_KEY) ?? 0) || 0

const top = () => {
  if (useGame.getState().money < RICH) useGame.setState({ money: RICH })
}

/** Bật: ví luôn được bơm lại về RICH mỗi khi tiêu; tắt: trả về số tiền cũ */
export function setDevMoney(on: boolean) {
  if (on === useDevMoney.getState().on) return
  useDevMoney.setState({ on })
  write(MONEY_KEY, on ? '1' : '0')
  unsub?.()
  unsub = null
  if (!on) return useGame.setState({ money: before })
  before = useGame.getState().money
  write(BEFORE_KEY, String(before))
  top()
  unsub = useGame.subscribe(top)
}

/** Chỉ khi dev: Shopii mở khoá mọi món (bỏ qua cấp xưởng `lockProduct`) */
export const useDevUnlock = create<{ on: boolean }>(() => ({ on: read(UNLOCK_KEY) === '1' }))
export function setDevUnlock(on: boolean) {
  useDevUnlock.setState({ on })
  write(UNLOCK_KEY, on ? '1' : '0')
}

/**
 * Chỉ khi dev: sách phép vô hạn (mở / lube / lắp / hàn / keycap / stab = làm theo mẻ), mặc định bật. Bật: lượt phép cũ cất vào
 * localStorage rồi bơm lên 999 (build thử `topUp` cũng bơm khi bật); tắt: trả lại lượt cũ để làm bình thường từng con
 */
const SPELLS = Object.keys(SUPPLIES).filter((id) => SUPPLIES[id].spell)
const SPELL_FULL = 999

/** bơm sách phép (chỉ khi công tắc bật); lần đầu thì cất lượt cũ */
export function topUpSpells() {
  if (!useDevSpells.getState().on) return
  const supplies = { ...useGame.getState().supplies }
  if (read(SPELL_BEFORE_KEY) === null)
    write(
      SPELL_BEFORE_KEY,
      JSON.stringify(Object.fromEntries(SPELLS.map((id) => [id, supplies[id] ?? 0]))),
    )
  for (const id of SPELLS) supplies[id] = Math.max(supplies[id] ?? 0, SPELL_FULL)
  useGame.setState({ supplies })
}

export function setDevSpells(on: boolean) {
  useDevSpells.setState({ on })
  write(SPELL_KEY, on ? '1' : '0')
  if (on) return topUpSpells()
  const raw = read(SPELL_BEFORE_KEY)
  if (raw === null) return
  try {
    const before = JSON.parse(raw) as Record<string, number>
    useGame.setState((s) => ({ supplies: { ...s.supplies, ...before } }))
  } catch {
    // bản cất hỏng: giữ nguyên lượt hiện tại
  }
  try {
    localStorage.removeItem(SPELL_BEFORE_KEY)
  } catch {
    // không xoá được thì lần bật sau vẫn dùng bản cũ
  }
}

// tải lại trang mà công tắc tiền đang bật: bật lại (giữ `before` đã lưu, không ghi đè bằng ví đang vô hạn)
if (read(MONEY_KEY) === '1') {
  useDevMoney.setState({ on: true })
  top()
  unsub = useGame.subscribe(top)
}
