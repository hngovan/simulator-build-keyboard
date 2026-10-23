import { useRef } from 'react'
import { create } from 'zustand'
import { buildSound } from '@/data/parts'
import { createMetaSlice, type MetaSlice } from './metaSlice'
import { createShopSlice, type ShopSlice } from './shopSlice'
import { createBuildSlice, type BuildSlice } from './buildSlice'

export type GameState = MetaSlice & ShopSlice & BuildSlice
export type { AppId, Screen } from './metaSlice'
export type { BuyResult } from './shopSlice'
export type { StabModKind } from './buildSlice'

export const useGame = create<GameState>()((...a) => ({
  ...createMetaSlice(...a),
  ...createShopSlice(...a),
  ...createBuildSlice(...a),
}))

// ---------- selector dùng lại ở nhiều nơi ----------

/** Âm thanh bàn phím hiện tại (dùng cho test, máy đo, chấm điểm) */
export const currentSound = (s: GameState) =>
  buildSound(s.inventory, s.mount, s.build, s.ctx?.keys.length)

/** Bước build hiện tại */
export const useStep = () => useGame((s) => (s.build ? s.ctx?.steps[s.build.stepIdx] : undefined))
export const useStepIdx = () => useGame((s) => s.build?.stepIdx ?? 0)

/** Giữ giá trị khác null gần nhất: component 3D có thể render thêm 1 nhịp sau khi build bị xoá (vừa giao hàng) */
function useSticky<T>(value: T | null): T {
  const last = useRef(value)
  if (value) last.current = value
  return last.current as T
}

/** Context build (chỉ dùng trong component bàn build) */
export const useCtx = () => useSticky(useGame((s) => s.ctx))
export const useBuild = () => useSticky(useGame((s) => s.build))

// Tự lưu (debounce) mỗi khi tiến trình thay đổi
const SAVED_KEYS = [
  'name',
  'money',
  'rep',
  'day',
  'done',
  'tools',
  'supplies',
  'audio',
  'offer',
  'order',
  'inventory',
  'provided',
  'spent',
  'posts',
  'mount',
  'result',
  'build',
  'history',
  'supplyUsed',
] as const satisfies readonly (keyof GameState)[]
let saveTimer: ReturnType<typeof setTimeout> | undefined
useGame.subscribe((s, prev) => {
  if (s.screen === 'title' || !SAVED_KEYS.some((k) => s[k] !== prev[k])) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => useGame.getState().save(), 400)
})

// Mở store trong console khi dev để debug
declare global {
  interface Window {
    __game?: typeof useGame
  }
}
if (import.meta.env.DEV) window.__game = useGame
