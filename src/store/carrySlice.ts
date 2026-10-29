import type { StateCreator } from 'zustand'
import { SHELF_SLOTS, SHIP_SLOTS, slotTaken, type BoxSpot } from '@/data/boxes'
import type { GameState } from '.'
import { stashActive } from './shopSlice'
import { buildContext } from '@/data/steps'

/**
 * Cầm / đặt thùng hàng trong phòng (đi lại, góc nhìn người): nhận đơn thì thùng đơn tới kệ ngoài cửa, cầm về đặt lên bàn build
 * mới build được; đổi đơn thì cầm đơn dở cất lên kệ cất đơn; đóng gói xong cầm thùng ra ô giao hàng trên kệ cửa = gửi khách.
 * Mỗi lúc cầm 1 thùng, bàn build để 1 thùng. Id thùng = id đơn (đơn đã đóng gói vẫn giữ id)
 */
export interface CarrySlice {
  /** thùng đang ở kệ (id đơn → ô) */
  boxes: Record<string, BoxSpot>
  /** thùng đang trên bàn build (đơn đang làm, hoặc thùng vừa đóng gói) */
  benchBox: string | null
  /** thùng đang cầm trên tay */
  held: string | null
  /** cầm thùng ở kệ lên tay */
  pickBox: (id: string) => void
  /** đang ngồi bàn build: cầm thùng trên bàn lên (đơn dở giữ nguyên tiến độ) rồi đứng dậy */
  pickBench: () => void
  /** cất thùng đang cầm vào ô kệ cất đơn */
  placeShelf: (slot: number) => void
  /** đặt thùng đơn đang cầm lên bàn build: chuyển sang đơn đó, đủ đồ thì bắt đầu build; trả về false nếu không đặt được */
  placeBench: () => boolean
  /** đặt thùng đã đóng gói vào ô giao hàng trên kệ cửa = gửi cho khách */
  placeShip: (slot: number) => void
  /** thùng đã đóng gói (chưa gửi) trên bàn: mở ra, trả đơn về đang build nguyên trạng để sửa / làm tiếp, đóng gói lại thì chấm lại */
  unpackBox: () => void
}

/** thùng đã đóng gói (có trong `packed`) hay thùng đơn */
export const isPackedBox = (s: Pick<GameState, 'packed'>, id: string) =>
  s.packed.some((p) => p.order.id === id)

/** tên khách của thùng (đơn đang làm / đang chờ / đã đóng gói) */
export function boxCustomer(s: GameState, id: string) {
  const o =
    (s.order?.id === id ? s.order : null) ??
    s.jobs.find((j) => j.order.id === id)?.order ??
    s.packed.find((p) => p.order.id === id)?.order
  return o?.customer ?? 'khách'
}

/** đơn đang làm có đang nằm trên bàn build (đơn build thử dev luôn tính là trên bàn) */
export const onBench = (s: Pick<GameState, 'order' | 'benchBox'>) =>
  !!s.order && (!!s.order.dev || s.benchBox === s.order.id)

export const createCarrySlice: StateCreator<GameState, [], [], CarrySlice> = (set, get) => ({
  boxes: {},
  benchBox: null,
  held: null,
  pickBox: (id) => {
    const s = get()
    const at = s.boxes[id]
    if (!at || at.at === 'ship') return
    if (s.held) return s.toast(`Tay đang cầm thùng của ${boxCustomer(s, s.held)}, cất đi đã`, 'bad')
    const boxes = { ...s.boxes }
    delete boxes[id]
    set({ boxes, held: id })
  },
  pickBench: () => {
    const s = get()
    if (!s.benchBox || s.stabAnim || s.lubeAnim) return
    if (s.held) return s.toast('Tay đang cầm thùng khác rồi', 'bad')
    set({ held: s.benchBox, benchBox: null })
    s.standUp('bench')
  },
  placeShelf: (slot) => {
    const s = get()
    if (!s.held || slot < 0 || slot >= SHELF_SLOTS || slotTaken(s.boxes, 'shelf', slot)) return
    set({ boxes: { ...s.boxes, [s.held]: { at: 'shelf', slot } }, held: null })
  },
  placeBench: () => {
    const s = get()
    const id = s.held
    if (!id) return false
    if (s.benchBox) {
      s.toast('Bàn build đang có thùng khác: ngồi vào bàn cầm thùng đó lên cất trước', 'bad')
      return false
    }
    if (isPackedBox(s, id)) {
      s.toast('Thùng này đóng gói rồi: mang ra ô giao hàng trên kệ ngoài cửa', 'bad')
      return false
    }
    if (s.order?.id !== id) {
      s.switchJob(id, true)
      if (get().order?.id !== id) return false
    }
    set({ benchBox: id, held: null })
    // đủ đồ thì vào build luôn, thiếu thì thùng nằm trên bàn chờ mua đủ
    const missing = get().buildOrder(id) ?? []
    if (missing.length)
      get().toast(
        `Đơn ${boxCustomer(get(), id)} còn thiếu: ${missing.map((m) => m.msg).join(', ')}. Mua đủ rồi bấm thùng trên bàn để build`,
        'bad',
      )
    return true
  },
  unpackBox: () => {
    const s = get()
    const p = s.packed.find((x) => x.order.id === s.benchBox && !x.shipped)
    if (!p) return
    if (!p.session?.build || !p.session.mount)
      return s.toast('Thùng này đóng từ bản lưu cũ, không mở lại được', 'bad')
    // đơn khác đang là đơn làm (chọn ở app Danh sách đơn) thì cất vào danh sách chờ
    const jobs = stashActive(s)
    const { session, order } = p
    set({
      jobs,
      packed: s.packed.filter((x) => x !== p),
      order,
      ...session,
      ctx: buildContext(order, session.inventory, session.mount!),
      result: null,
      future: [],
      pressed: {},
      viewFlip: false,
    })
    s.toast(`📦 Đã mở thùng đơn ${order.customer}: sửa xong thì đóng gói lại nhé`)
  },
  placeShip: (slot) => {
    const s = get()
    const id = s.held
    if (!id || slot < 0 || slot >= SHIP_SLOTS || slotTaken(s.boxes, 'ship', slot)) return
    if (!s.packed.some((p) => p.order.id === id && !p.shipped))
      return s.toast('Chỉ đặt thùng đã đóng gói vào ô giao hàng', 'bad')
    set({ boxes: { ...s.boxes, [id]: { at: 'ship', slot } }, held: null })
    s.shipOrder(id)
  },
})
