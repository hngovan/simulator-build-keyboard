import type {
  BuildState,
  AudioSettings,
  DeliveryResult,
  GroupPost,
  Inventory,
  Order,
  PartCategory,
  ToolLevels,
} from '@/types'
import type { HistoryEntry } from './buildSlice'

const SAVE_KEY = 'sbk-save-v3'

// Tiến trình lâu dài của người chơi
export interface Profile {
  name: string
  money: number
  rep: number
  day: number
  done: number
  tools: ToolLevels
  supplies: Record<string, number>
  audio: AudioSettings
}

// Đơn đang làm dở (lưu lại để thoát game vào lại vẫn tiếp tục được)
export interface Session {
  offer: Order | null
  order: Order | null
  inventory: Inventory
  provided: Partial<Record<PartCategory, true>>
  spent: number
  posts: GroupPost[]
  mount: string | null
  result: DeliveryResult | null
  build: BuildState | null
  /** lịch sử hoàn tác (đã rút gọn) + vật tư đã dùng, để tải lại trang vẫn quay lại được */
  history?: HistoryEntry[]
  supplyUsed?: Record<string, number>
}

export interface SaveData extends Profile {
  session?: Session
  savedAt?: number
}

export const START: Profile = {
  name: '',
  money: 3000,
  rep: 0,
  day: 1,
  done: 0,
  supplies: {},
  audio: { muted: false, musicVolume: 0.45, effectsVolume: 0.7 },
  tools: { switch: 0, keycap: 0, screw: 0, solder: 0, clipper: 0, brush: 0, opener: 0 },
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const save = JSON.parse(raw) as Partial<SaveData>
    // bản lưu cũ có thể thiếu dụng cụ / vật tư mới
    return {
      ...START,
      ...save,
      tools: { ...START.tools, ...save.tools },
      supplies: save.supplies ?? {},
      audio: { ...START.audio, ...save.audio },
    }
  } catch {
    return null
  }
}

export function writeSave(data: SaveData) {
  const put = (d: SaveData) =>
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, savedAt: Date.now() }))
  try {
    put(data)
  } catch {
    // quá dung lượng: vẫn lưu tiến trình, chỉ bỏ lịch sử hoàn tác
    try {
      put({ ...data, session: data.session && { ...data.session, history: [] } })
    } catch {
      // trình duyệt chặn storage: bỏ qua, game vẫn chạy
    }
  }
}
