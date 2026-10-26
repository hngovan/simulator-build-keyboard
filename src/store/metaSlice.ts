import type { StateCreator } from 'zustand'
import { randomOffers } from '@/data/orders'
import { buildContext } from '@/data/steps'
import type { InventoryCheck } from '@/data/parts'
import type { AudioSettings, Order, ShopCategory, Toast, Review } from '@/types'
import { newRunId, runEntry, runSig } from '@/data/gameOver'
import { submitRun, type RunEndReason, type RunEntry } from '@/lib/leaderboardApi'
import { START, clearSave, loadSave, writeSave, type Profile, type SaveData } from './persistence'
import { emptyInventory } from './shopSlice'
import { compactHistory } from './buildSlice'
import type { GameState } from '.'
import { applyAudioSettings, stopBgm } from '@/sound'

type Screen = 'title' | 'pc' | 'bench'
export type AppId =
  'messenger' | 'shopii' | 'group' | 'inventory' | 'order' | 'reviews' | 'leaderboard' | 'settings'

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
  /** đánh giá khách vừa để lại, hiện nổi ở góc phải trên (không lưu) */
  reviewPops: Review[]
  /** lưu đánh giá + hiện thông báo; cộng / trừ uy tín do nơi gọi tự tính */
  addReviews: (reviews: Review[]) => void
  dismissReview: (id: string) => void
  /** thông báo hệ thống ở góc phải trên (bị ban khỏi chợ...), không lưu */
  notices: Notice[]
  notify: (title: string, text: string) => void
  dismissNotice: (id: number) => void
  /** người chơi tự lật bàn phím xem đáy */
  viewFlip: boolean
  /** tăng lên để đưa camera về góc mặc định */
  camKey: number
  /** đang bay camera vào màn hình máy tính trên bàn (xong thì về desktop), không lưu */
  pcZoom: boolean
  zoomToPC: () => void
  /** chuột trái: xoay camera (orbit) hay kéo khung nhìn (bàn tay, như app chỉnh sửa) */
  camMode: 'orbit' | 'pan'
  /** mục Shopii đang xem (ô đồ còn thiếu trên bàn mod mở thẳng tới mục cần mua) */
  shopCat: ShopCategory
  /** bảng chọn đơn ở bàn build trống đang mở (không lưu) */
  benchPicker: boolean
  /** đơn vừa chọn ở bảng chọn đơn nhưng còn thiếu linh kiện (giữ qua lúc đổi HUD, không lưu) */
  benchShort: { order: Order; missing: InventoryCheck[] } | null
  toast: (text: string, kind?: Toast['kind']) => void
  newGame: (name: string) => void
  continueGame: () => void
  goPC: () => void
  goBench: () => void
  openApp: (id: AppId) => void
  /** về máy tính, mở Shopii đúng mục */
  openShop: (cat: ShopCategory) => void
  minimizeApp: (id: AppId) => void
  closeApp: (id: AppId) => void
  toggleFlip: () => void
  resetCam: () => void
  setCamMode: (mode: 'orbit' | 'pan') => void
  setAudio: (audio: Partial<AudioSettings>) => void
  returnToTitle: () => void
  save: () => void
  /** lượt chơi vừa kết thúc (thua / phá sản): hiện popup tổng kết, không lưu */
  gameOver: GameOver | null
  /** kết thúc lượt chơi: gửi bảng xếp hạng, xoá bản lưu, hiện popup */
  endRun: (reason: RunEndReason) => void
  /** đóng popup thua game, về màn hình tiêu đề */
  closeGameOver: () => void
  /** lưu tiến trình hiện tại lên bảng xếp hạng (lượt vẫn chơi tiếp), trả đã gửi được chưa */
  saveRun: () => Promise<boolean>
  /** tiến trình đã đổi so với lần ghi bảng xếp hạng gần nhất */
  unsynced: () => boolean
  /** NPC hướng dẫn: đã đọc mẹo (không hiện lại) */
  seeGuide: (id: string) => void
}

export interface GameOver {
  reason: RunEndReason
  entry: RunEntry
  /** đang gửi / hạng theo uy tín trên server / gửi lỗi (đã cất hàng chờ) */
  sent: 'sending' | { rank: number; total: number } | 'offline'
}

export interface Notice {
  id: number
  title: string
  text: string
}

let toastId = 0
/** số đánh giá giữ lại trong bản lưu */
const REVIEW_KEEP = 100
/** thông báo đánh giá tự ẩn sau (ms) */
const REVIEW_POP_MS = 6000
/** thông báo hệ thống tự ẩn sau (ms) */
const NOTICE_MS = 10000

const infoOf = (s: SaveData | null) =>
  s?.name ? { name: s.name, day: s.day, money: s.money } : null

/** Ảnh chụp toàn bộ tiến trình để lưu */
function snapshot(s: GameState): SaveData {
  const {
    name,
    money,
    rep,
    day,
    done,
    tools,
    supplies,
    audio,
    screwBit,
    rev,
    wear,
    reviews,
    spare,
  } = s
  const { offers, jobs, order, inventory, provided, spent, posts, mount, result, build, packed } = s
  const { supplyUsed, marketBanUntil } = s
  return {
    name,
    money,
    rep,
    day,
    done,
    tools,
    solderOwned: s.solderOwned,
    supplies,
    audio,
    screwBit,
    rev,
    wear,
    reviews,
    spare,
    marketBanUntil,
    runId: s.runId,
    lbSynced: s.lbSynced,
    listings: s.listings,
    stolen: s.stolen,
    guideSeen: s.guideSeen,
    session: {
      offers,
      jobs: jobs.map((j) => ({
        ...j,
        session: { ...j.session, history: compactHistory(j.session.history) },
      })),
      order,
      inventory,
      provided,
      spent,
      posts,
      mount,
      result,
      packed,
      build,
      history: compactHistory(s.history),
      supplyUsed,
      rejected: s.rejected,
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
  reviewPops: [],
  notices: [],
  viewFlip: false,
  camKey: 0,
  pcZoom: false,
  camMode: 'orbit',
  shopCat: 'case',
  benchPicker: false,
  benchShort: null,
  gameOver: null,

  toast: (text, kind = 'info') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }].slice(-4) }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  addReviews: (reviews) => {
    if (!reviews.length) return
    set((s) => ({
      reviews: [...s.reviews, ...reviews].slice(-REVIEW_KEEP),
      reviewPops: [...s.reviewPops, ...reviews].slice(-3),
    }))
    for (const r of reviews) setTimeout(() => get().dismissReview(r.id), REVIEW_POP_MS)
  },
  dismissReview: (id) => set((s) => ({ reviewPops: s.reviewPops.filter((r) => r.id !== id) })),
  notify: (title, text) => {
    const id = ++toastId
    set((s) => ({ notices: [...s.notices, { id, title, text }].slice(-3) }))
    setTimeout(() => get().dismissNotice(id), NOTICE_MS)
  },
  dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  newGame: (name) => {
    // chơi mới đè bản lưu cũ: ghi lượt cũ lên bảng xếp hạng
    const old = loadSave()
    if (old?.name) void submitRun(runEntry(old, 'newgame'))
    set({
      ...START,
      runId: newRunId(),
      gameOver: null,
      reviewPops: [],
      rejected: [],
      name: name.trim() || 'Thợ phím',
      lastSolderPurchase: null,
      screen: 'pc',
      windows: ['messenger'],
      minimized: [],
      offers: randomOffers(),
      jobs: [],
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
    const { offer, offers, jobs, ...rest } = session ?? ({} as NonNullable<typeof session>)
    // bản lưu cũ: 1 đơn chào, đơn chưa có mã / hạn
    const fix = (o: Order): Order => ({
      ...o,
      id: o.id ?? `old${Math.random()}`,
      days: o.days ?? 3,
    })
    const order = rest.order ? fix(rest.order) : null
    set({
      ...profile,
      lastSolderPurchase: null,
      ...rest,
      order: order && { ...order, dueDay: order.dueDay ?? profile.day + order.days },
      offers: (offers ?? (offer ? [offer] : randomOffers())).map(fix),
      jobs: jobs ?? [],
      packed: session?.packed ?? [],
      history: session?.history ?? [],
      future: [],
      supplyUsed: session?.supplyUsed ?? {},
      rejected: session?.rejected ?? [],
      reviews: profile.reviews ?? [],
      // bản lưu cũ chưa có mã lượt chơi
      runId: profile.runId || newRunId(),
      gameOver: null,
      screen: 'pc',
      windows: ['messenger'],
      minimized: [],
    })
    // ctx là dữ liệu dẫn xuất: dựng lại từ đơn + kho đồ
    const s = get()
    if (s.build && s.order && s.mount) set({ ctx: buildContext(s.order, s.inventory, s.mount) })
    s.toast(`Chào mừng ${save.name} quay lại! Ngày ${save.day}`, 'good')
  },
  goPC: () => set({ screen: 'pc', pcZoom: false }),
  // ở bàn build: camera bay tới màn hình rồi mới về desktop (PcZoom trong Bench.tsx)
  zoomToPC: () => (get().screen === 'bench' ? set({ pcZoom: true }) : get().goPC()),
  // chưa có build thì vào bàn trống, bấm ô vàng để chọn đơn
  goBench: () => set({ screen: 'bench', benchPicker: false, benchShort: null }),
  openApp: (id) =>
    set((s) => ({
      windows: [...s.windows.filter((w) => w !== id), id],
      minimized: s.minimized.filter((w) => w !== id),
    })),
  openShop: (cat) => {
    set({ screen: 'pc', shopCat: cat })
    get().openApp('shopii')
  },
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
  setCamMode: (camMode) => set({ camMode }),
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
    if (s.screen === 'title' || !s.name || s.gameOver) return
    const data = snapshot(s)
    writeSave(data)
    set({ saveInfo: infoOf(data) })
  },
  endRun: (reason) => {
    const s = get()
    if (s.gameOver || !s.name) return
    const entry = runEntry(s, reason)
    // thua là hết: bản lưu bị xoá, màn tiêu đề chỉ còn chơi mới
    clearSave()
    set({ gameOver: { reason, entry, sent: 'sending' }, saveInfo: null, pcZoom: false })
    void submitRun(entry).then((res) => {
      const g = get().gameOver
      if (g?.entry.runId === entry.runId) set({ gameOver: { ...g, sent: res ?? 'offline' } })
    })
  },
  saveRun: async () => {
    const s = get()
    if (!s.name || s.gameOver) return false
    s.save()
    const sig = runSig(s)
    const res = await submitRun(runEntry(s, 'save'))
    if (!res) {
      get().toast('Chưa kết nối được server, tiến trình sẽ tự gửi lại lần sau', 'bad')
      return false
    }
    set({ lbSynced: sig })
    get().toast(`💾 Đã lưu tiến trình: hạng ${res.rank} / ${res.total} theo điểm tổng`, 'good')
    return true
  },
  seeGuide: (id) => set((s) => ({ guideSeen: [...new Set([...s.guideSeen, id])] })),
  unsynced: () => {
    const s = get()
    return !!s.name && !s.gameOver && runSig(s) !== s.lbSynced
  },
  closeGameOver: () => {
    stopBgm()
    set({ gameOver: null, name: '', screen: 'title', windows: [], minimized: [] })
  },
})
