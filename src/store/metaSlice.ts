import type { StateCreator } from 'zustand'
import { randomOrder } from '@/data/orders'
import { buildContext } from '@/data/steps'
import type { AudioSettings, Toast } from '@/types'
import { START, loadSave, writeSave, type Profile, type SaveData } from './persistence'
import { emptyInventory } from './shopSlice'
import { compactHistory } from './buildSlice'
import type { GameState } from '.'
import { applyAudioSettings, stopBgm } from '@/sound'

export type Screen = 'title' | 'pc' | 'bench'
export type AppId = 'messenger' | 'shopii' | 'group' | 'inventory' | 'settings'

// Trạng thái chung: màn hình, cửa sổ, thông báo, tiến trình lưu
export interface MetaSlice extends Profile {
  screen: Screen
  /** thông tin bản lưu để hiện ở màn hình tiêu đề */
  saveInfo: { name: string; day: number; money: number } | null
  /** thứ tự z: phần tử cuối nằm trên cùng */
  windows: AppId[]
  /** cửa sổ đang thu nhỏ xuống taskbar */
  minimized: AppId[]
  toasts: Toast[]
  /** người chơi tự lật bàn phím xem đáy */
  viewFlip: boolean
  /** tăng lên để đưa camera về góc mặc định */
  camKey: number
  toast: (text: string, kind?: Toast['kind']) => void
  newGame: (name: string) => void
  continueGame: () => void
  goPC: () => void
  goBench: () => void
  openApp: (id: AppId) => void
  minimizeApp: (id: AppId) => void
  closeApp: (id: AppId) => void
  toggleFlip: () => void
  resetCam: () => void
  setAudio: (audio: Partial<AudioSettings>) => void
  returnToTitle: () => void
  save: () => void
}

let toastId = 0

const infoOf = (s: SaveData | null) =>
  s?.name ? { name: s.name, day: s.day, money: s.money } : null

/** Ảnh chụp toàn bộ tiến trình để lưu */
export function snapshot(s: GameState): SaveData {
  const { name, money, rep, day, done, tools, supplies, audio } = s
  const { offer, order, inventory, provided, spent, posts, mount, result, build, supplyUsed } = s
  return {
    name,
    money,
    rep,
    day,
    done,
    tools,
    supplies,
    audio,
    session: {
      offer,
      order,
      inventory,
      provided,
      spent,
      posts,
      mount,
      result,
      build,
      history: compactHistory(s.history),
      supplyUsed,
    },
  }
}

export const createMetaSlice: StateCreator<GameState, [], [], MetaSlice> = (set, get) => ({
  ...START,
  screen: 'title',
  saveInfo: infoOf(loadSave()),
  windows: [],
  minimized: [],
  toasts: [],
  viewFlip: false,
  camKey: 0,

  toast: (text, kind = 'info') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }].slice(-4) }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  newGame: (name) => {
    set({
      ...START,
      name: name.trim() || 'Thợ phím',
      screen: 'pc',
      windows: ['messenger'],
      minimized: [],
      offer: randomOrder(),
      order: null,
      inventory: emptyInventory(),
      provided: {},
      spent: 0,
      posts: [],
      mount: null,
      build: null,
      ctx: null,
      result: null,
    })
    get().save()
    get().toast(`Chào mừng ${get().name} tới xưởng phím! 🎉`, 'good')
  },
  continueGame: () => {
    const save = loadSave()
    if (!save) return
    const { session, ...profile } = save
    set({
      ...profile,
      ...session,
      history: session?.history ?? [],
      supplyUsed: session?.supplyUsed ?? {},
      screen: 'pc',
      windows: ['messenger'],
      minimized: [],
    })
    // ctx là dữ liệu dẫn xuất: dựng lại từ đơn + kho đồ
    const s = get()
    if (s.build && s.order && s.mount) set({ ctx: buildContext(s.order, s.inventory, s.mount) })
    s.toast(`Chào mừng ${save.name} quay lại! Ngày ${save.day}`, 'good')
  },
  goPC: () => set({ screen: 'pc' }),
  goBench: () => {
    if (get().build) set({ screen: 'bench' })
  },
  openApp: (id) =>
    set((s) => ({
      windows: [...s.windows.filter((w) => w !== id), id],
      minimized: s.minimized.filter((w) => w !== id),
    })),
  minimizeApp: (id) =>
    set((s) => ({
      minimized: s.windows.includes(id)
        ? [...s.minimized.filter((w) => w !== id), id]
        : s.minimized,
    })),
  closeApp: (id) =>
    set((s) => ({
      windows: s.windows.filter((w) => w !== id),
      minimized: s.minimized.filter((w) => w !== id),
    })),
  toggleFlip: () => set((s) => ({ viewFlip: !s.viewFlip })),
  resetCam: () => set((s) => ({ camKey: s.camKey + 1 })),
  setAudio: (audio) => {
    set((s) => ({ audio: { ...s.audio, ...audio } }))
    applyAudioSettings(get().audio)
  },
  returnToTitle: () => {
    stopBgm()
    set({ screen: 'title', windows: [], minimized: [] })
  },
  save: () => {
    const s = get()
    if (s.screen === 'title' || !s.name) return
    const data = snapshot(s)
    writeSave(data)
    set({ saveInfo: infoOf(data) })
  },
})
