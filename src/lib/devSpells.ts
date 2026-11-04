import { create } from 'zustand'

// Công tắc dev "Sách phép vô hạn" (Cài đặt → Dev), mặc định bật, lưu theo máy. Tách riêng khỏi devMoney.ts (file đó import store)
// để store đọc được mà không vòng import. Bật + đơn build thử: mod stab 1 lần làm hết mọi con (`modStab`)
export const SPELL_KEY = 'sbk-dev-spells'

const initial = () => {
  if (!import.meta.env.DEV) return false
  try {
    return localStorage.getItem(SPELL_KEY) !== '0'
  } catch {
    return true
  }
}

export const useDevSpells = create<{ on: boolean }>(() => ({ on: initial() }))
