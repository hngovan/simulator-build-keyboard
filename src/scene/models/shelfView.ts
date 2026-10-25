import { create } from 'zustand'
import type { KeyboardSpec } from '@/features/apps/messenger/orderThumb'

/** bàn phím trên kệ đang mở xem 3D (bấm vào bàn phím chưng trên kệ), không lưu */
export const useShelfView = create<{
  spec: KeyboardSpec | null
  open: (spec: KeyboardSpec) => void
  close: () => void
}>((set) => ({
  spec: null,
  open: (spec) => set({ spec }),
  close: () => set({ spec: null }),
}))
