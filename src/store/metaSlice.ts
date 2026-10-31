import type { StateCreator } from 'zustand'
import { SHELF_SLOTS, fitBoxes, type BoxSpot } from '@/data/boxes'
import { randomOffers } from '@/data/orders'
import { buildContext } from '@/data/steps'
import type {
  AudioSettings,
  LayoutId,
  NotifyItem,
  Order,
  ShopCategory,
  Toast,
  Review,
  Variant,
  VariantKey,
} from '@/types'
import { LAYOUTS } from '@/data/layouts'
import { newRunId, runEntry, runSig } from '@/data/gameOver'
import { submitRun, type RunEndReason, type RunEntry } from '@/lib/leaderboardApi'
import { START, clearSave, loadSave, writeSave, type Profile, type SaveData } from './persistence'
import { emptyInventory } from './shopSlice'
import { compactHistory } from './buildSlice'
import type { GameState } from '.'
import { applyAudioSettings, stopBgm } from '@/sound'
import { useRoom } from '@/scene/room/roomStore'
import { afterLoad } from '@/scene/common/loadingStore'

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
  /** ghi 1 thông báo vào chuông góc phải (không hiện nổi; `notify` / `addReviews` tự ghi) */
  logNotify: (title: string, text: string, review?: boolean) => void
  /** xoá 1 thông báo khỏi chuông */
  removeNotify: (id: string) => void
  clearNotify: () => void
  /** mở chuông: đánh dấu đã xem hết */
  readNotify: () => void
  /** người chơi tự lật bàn phím xem đáy */
  viewFlip: boolean
  /** tăng lên để đưa camera về góc mặc định */
  camKey: number
  /** đang bay camera vào màn hình máy tính trên bàn (xong thì về desktop), không lưu */
  pcZoom: boolean
  zoomToPC: () => void
  /** đang đi lại trong phòng (góc nhìn người, WASD) thay vì ngồi ở bàn build; không lưu */
  walk: boolean
  /** đứng dậy đi lại trong phòng, bắt đầu từ chỗ đang ngồi (máy tính / bàn build) */
  standUp: (from: 'pc' | 'bench') => void
  /** mục Shopii đang xem (ô đồ còn thiếu trên bàn mod mở thẳng tới mục cần mua) */
  shopCat: ShopCategory
  /** hội thoại đang mở ở Mezzenger (id đơn); đóng gói xong thì mở thẳng hội thoại đơn đó để gửi */
  messengerPick: string | null
  setMessengerPick: (id: string | null) => void
  /** tab đang mở ở Hội Phím Cơ (chợ pass / bài của tôi) */
  groupTab: 'feed' | 'mine'
  setGroupTab: (tab: 'feed' | 'mine') => void
  /** mở Hội Phím Cơ ở tab "Bài của tôi" để đăng bán (nút Đăng bán trong app Kho) */
  openSell: () => void
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
/** số thông báo giữ lại ở chuông */
const INBOX_KEEP = 50
let notifySeq = 0
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
    screwPick: s.screwPick,
    trayColor: s.trayColor,
    wallpaper: s.wallpaper,
    rev,
    wear,
    reviews,
    spare,
    marketBanUntil,
    marketBanWhy: s.marketBanWhy,
    unlists: s.unlists,
    runId: s.runId,
    lbSynced: s.lbSynced,
    listings: s.listings,
    stolen: s.stolen,
    guideSeen: s.guideSeen,
    guideHidden: s.guideHidden,
    inbox: s.inbox,
    unread: s.unread,
    parcels: s.parcels,
    saleBought: s.saleBought,
    cart: s.cart,
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
      acceptedToday: s.acceptedToday,
      dayStart: s.dayStart,
      worked: s.worked,
      boxes: s.boxes,
      benchBox: s.benchBox,
      held: s.held,
    },
  }
}

/**
 * biến thể layout không còn hợp lệ (layout đổi bộ biến thể, vd TKL F13 giờ chỉ hàng dưới WKL — đơn cũ còn 'wk' space 6.25u lệch
 * lỗ plate 7u) → lựa chọn đầu tiên còn hợp lệ
 */
function fixVariant(layout: LayoutId, v: Variant = {}): Variant {
  const opts = LAYOUTS[layout]?.variants ?? {}
  const out: Variant = { ...v }
  for (const [k, list] of Object.entries(opts) as [VariantKey, string[]][])
    if (out[k] !== undefined && !list.includes(out[k]!)) out[k] = list[0]
    else if (out[k] === undefined && list.length === 1) out[k] = list[0]
  return out
}

/** nâng cấp bản lưu chưa có thùng hàng: đơn đang build nằm trên bàn, còn lại xếp kệ cất đơn (quá ô thì ra kệ cửa) */
function oldBoxes(order: Order | null, building: boolean, waiting: string[]) {
  const boxes: Record<string, BoxSpot> = {}
  const rest = order && !building ? [order.id, ...waiting] : waiting
  rest.forEach((id, i) => {
    boxes[id] = i < SHELF_SLOTS ? { at: 'shelf', slot: i } : { at: 'door', slot: i - SHELF_SLOTS }
  })
  return { boxes, benchBox: order && building ? order.id : null, held: null }
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
  walk: false,
  standUp: (from) => {
    useRoom.setState({ spot: from, fly: null })
    set({ screen: 'bench', walk: true, pcZoom: false })
  },
  shopCat: 'case',
  groupTab: 'feed',
  messengerPick: null,
  setMessengerPick: (messengerPick) => set({ messengerPick }),
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
    for (const r of reviews)
      get().logNotify(`⭐ Đánh giá ${r.stars}★ · ${r.customer}`, `“${r.text}”`, true)
    for (const r of reviews) setTimeout(() => get().dismissReview(r.id), REVIEW_POP_MS)
  },
  dismissReview: (id) => set((s) => ({ reviewPops: s.reviewPops.filter((r) => r.id !== id) })),
  notify: (title, text) => {
    const id = ++toastId
    set((s) => ({ notices: [...s.notices, { id, title, text }].slice(-3) }))
    setTimeout(() => get().dismissNotice(id), NOTICE_MS)
    get().logNotify(title, text)
  },
  dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  logNotify: (title, text, review) => {
    const item: NotifyItem = {
      id: `nt-${Date.now().toString(36)}-${(notifySeq++).toString(36)}`,
      day: get().day,
      title,
      text,
      ...(review ? { review } : {}),
    }
    set((s) => ({ inbox: [item, ...s.inbox].slice(0, INBOX_KEEP), unread: s.unread + 1 }))
  },
  removeNotify: (id) => set((s) => ({ inbox: s.inbox.filter((n) => n.id !== id) })),
  clearNotify: () => set({ inbox: [], unread: 0 }),
  readNotify: () => set({ unread: 0 }),
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
      acceptedToday: 0,
      dayStart: { money: START.money, rep: START.rep },
      worked: [],
      name: name.trim() || 'Thợ phím',
      lastSolderPurchase: null,
      // vào game là đứng trong phòng (kiểu PC Building Simulator), bấm màn hình máy tính mới vào desktop
      screen: 'bench',
      walk: true,
      // mở máy tính là desktop trống, không tự mở Mezzenger
      windows: [],
      minimized: [],
      offers: randomOffers(),
      jobs: [],
      boxes: {},
      benchBox: null,
      held: null,
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
    useRoom.setState({ spot: 'pc', fly: null })
    get().save()
    // chào sau khi phòng 3D tải xong (màn chờ còn che thì chưa)
    afterLoad(() => get().toast(`Chào mừng ${get().name} tới xưởng phím! 🎉`, 'good'))
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
      variant: fixVariant(o.layout, o.variant),
    })
    const order = rest.order ? fix(rest.order) : null
    set({
      ...profile,
      // giỏ hàng bản trước (1 món gộp, chưa có số lượng): bỏ
      cart: (profile.cart ?? []).filter((l) => l.unit && l.qty),
      lastSolderPurchase: null,
      ...rest,
      order: order && { ...order, dueDay: order.dueDay ?? profile.day + order.days },
      offers: (offers ?? (offer ? [offer] : randomOffers())).map(fix),
      jobs: (jobs ?? []).map((j) => ({ ...j, order: fix(j.order) })),
      packed: session?.packed ?? [],
      // bản lưu cũ chưa có thùng: đơn đang build coi như trên bàn, đơn chờ / đơn chưa build / đơn đóng gói chưa gửi xếp lên kệ cất đơn
      ...(session?.boxes
        ? { boxes: fitBoxes(session.boxes) }
        : oldBoxes(order, !!rest.build, [
            ...(jobs ?? []).map((j) => j.order.id),
            ...(session?.packed ?? []).filter((p) => !p.shipped).map((p) => p.order.id),
          ])),
      history: session?.history ?? [],
      future: [],
      supplyUsed: session?.supplyUsed ?? {},
      rejected: session?.rejected ?? [],
      // bản lưu cũ: coi như hôm nay đã làm các đơn đang có (không bị phạt oan)
      acceptedToday: session?.acceptedToday ?? 0,
      // bản lưu cũ: lấy tiền / uy tín lúc tải làm mốc đầu ngày
      dayStart: session?.dayStart ?? { money: profile.money, rep: profile.rep },
      worked:
        session?.worked ??
        [rest.order, ...(jobs ?? []).map((j) => j.order)].flatMap((o) => (o ? [o.id] : [])),
      reviews: profile.reviews ?? [],
      // bản lưu cũ chưa có mã lượt chơi
      runId: profile.runId || newRunId(),
      gameOver: null,
      screen: 'bench',
      walk: true,
      windows: [],
      minimized: [],
    })
    // ctx là dữ liệu dẫn xuất: dựng lại từ đơn + kho đồ
    const s = get()
    if (s.build && s.order && s.mount) set({ ctx: buildContext(s.order, s.inventory, s.mount) })
    useRoom.setState({ spot: 'pc', fly: null })
    afterLoad(() => s.toast(`Chào mừng ${save.name} quay lại! Ngày ${save.day}`, 'good'))
  },
  goPC: () => set({ screen: 'pc', pcZoom: false }),
  // ở bàn build: camera bay tới màn hình rồi mới về desktop (PcZoom trong Bench.tsx)
  zoomToPC: () => (get().screen === 'bench' ? set({ pcZoom: true }) : get().goPC()),
  // chưa có build thì vào bàn trống, bấm ô vàng để chọn đơn
  goBench: () => set({ screen: 'bench', walk: false }),
  openApp: (id) =>
    set((s) => ({
      windows: [...s.windows.filter((w) => w !== id), id],
      minimized: s.minimized.filter((w) => w !== id),
    })),
  setGroupTab: (groupTab) => set({ groupTab }),
  openSell: () => {
    set({ screen: 'pc', groupTab: 'mine' })
    get().openApp('group')
  },
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
