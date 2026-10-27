import { useRef } from 'react'
import { create } from 'zustand'
import { buildSound } from '@/data/parts'
import { lossReason } from '@/data/gameOver'
import { createMetaSlice, type MetaSlice } from './metaSlice'
import { createShopSlice, type ShopSlice } from './shopSlice'
import { createBuildSlice, type BuildSlice } from './buildSlice'
import { createSellSlice, type SellSlice } from './sellSlice'

export type GameState = MetaSlice & ShopSlice & BuildSlice & SellSlice
export type { AppId } from './metaSlice'
export type { StabModKind } from './buildSlice'

export const useGame = create<GameState>()((...a) => ({
  ...createMetaSlice(...a),
  ...createShopSlice(...a),
  ...createBuildSlice(...a),
  ...createSellSlice(...a),
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
  'solderOwned',
  'supplies',
  'audio',
  'screwBit',
  'screwPick',
  'trayColor',
  'wear',
  'reviews',
  'spare',
  'marketBanUntil',
  'marketBanWhy',
  'unlists',
  'rejected',
  'acceptedToday',
  'dayStart',
  'worked',
  'offers',
  'jobs',
  'order',
  'inventory',
  'provided',
  'spent',
  'posts',
  'mount',
  'result',
  'packed',
  'build',
  'history',
  'supplyUsed',
  'runId',
  'lbSynced',
  'listings',
  'stolen',
  'guideSeen',
] as const satisfies readonly (keyof GameState)[]
let saveTimer: ReturnType<typeof setTimeout> | undefined
useGame.subscribe((s, prev) => {
  if (s.screen === 'title' || !SAVED_KEYS.some((k) => s[k] !== prev[k])) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => useGame.getState().save(), 400)
})

// Đơn đang làm có mua đồ / thao tác build thì tính là hôm nay đã làm đơn đó (chuyển đơn / tải save thì không tính)
useGame.subscribe((s, prev) => {
  const o = s.order
  if (!o || s.result || o.id !== prev.order?.id || s.worked.includes(o.id)) return
  if ((s.build && s.build !== prev.build) || s.spent > prev.spent)
    useGame.setState({ worked: [...s.worked, o.id] })
})

// Thua game: uy tín quá thấp / hết tiền nhận đơn. Chờ một nhịp cho toast / đánh giá kịp hiện rồi xét lại
const LOSS_KEYS = ['rep', 'money', 'offers', 'order', 'jobs', 'packed'] as const
let lossTimer: ReturnType<typeof setTimeout> | undefined
useGame.subscribe((s, prev) => {
  if (s.screen === 'title' || s.gameOver || !LOSS_KEYS.some((k) => s[k] !== prev[k])) return
  clearTimeout(lossTimer)
  lossTimer = setTimeout(() => {
    const now = useGame.getState()
    const reason = now.screen === 'title' || now.gameOver ? null : lossReason(now)
    if (reason) now.endRun(reason)
  }, 1200)
})

// Mở store trong console khi dev để debug
declare global {
  interface Window {
    __game?: typeof useGame
  }
}
if (import.meta.env.DEV) window.__game = useGame
