import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useGame } from '@/store'
import { Button } from '@/components/ui'
import { Spotlight } from './Spotlight'
import { holeOf, useTargetRect } from './spotlightRect'
import { cartItems } from '@/data/cart'
import { getLayout } from '@/data/layouts'
import { checkInventory, stabStock } from '@/data/parts'
import { FEET_IDS } from '@/data/supplies'
import type { GameState } from '@/store'
import type { Inventory, PartCategory, PartItem, StabItem, SwitchItem, ToolKind } from '@/types'

/**
 * Tour hướng dẫn lần đầu ngồi máy tính: làm tối cả màn, chừa 1 ô sáng (viền vàng nhấp nháy) đúng chỗ cần bấm + bong bóng lời
 * Keeb-chan. Bấm đúng chỗ đó thì sang bước sau; vùng tối chặn bấm chỗ khác. Phần tử đích gắn `data-tour="<id>"`.
 * Xong / bỏ qua thì ghi `guideSeen` (`TOUR_ID`), Cài đặt → Hướng dẫn có nút xem lại
 */
export { TOUR_ID } from '@/data/tourIds'
import { TOUR_ID } from '@/data/tourIds'

interface TourStep {
  /** `data-tour` của phần tử cần bấm (bước chờ: vùng được thao tác) */
  target: string
  text: string
  /** bước chờ: không sang khi bấm đích mà khi điều kiện đạt (vd đã bỏ case vào giỏ) */
  until?: (s: GameState) => boolean
  /** vào bước mà điều kiện đã đạt (vd món đã trong giỏ) thì bỏ qua bước */
  skip?: (s: GameState) => boolean
  /** bước mua đồ: hiện danh sách món cần mua (✓ món đã có / đã trong giỏ / đang giao) */
  list?: boolean
}

/** đơn tour dắt mua: đơn đang làm, chưa nhận thì đơn chào đầu */
const tourOrder = (s: GameState) => s.order ?? s.offers[0] ?? null

/** kho đơn đang làm + món trong giỏ + món đang giao (gộp số switch / stab cùng loại) */
function plannedInventory(s: GameState): Inventory {
  const inv = { ...s.inventory }
  const items = [...s.cart.flatMap(cartItems), ...s.parcels.flatMap((p) => p.items)]
  for (const it of items) {
    if (it.kind !== 'part') continue
    const cur = inv[it.cat] as SwitchItem | StabItem | null
    if (it.cat === 'switch' && cur && (cur as SwitchItem).type === (it.item as SwitchItem).type) {
      const sw = cur as SwitchItem
      inv.switch = { ...sw, count: sw.count + (it.item as SwitchItem).count }
    } else if (it.cat === 'stab' && cur && (cur as StabItem).type === (it.item as StabItem).type) {
      const a = stabStock(cur as StabItem)
      const b = stabStock(it.item as StabItem)
      inv.stab = {
        ...(cur as StabItem),
        short: a.short + b.short,
        long: a.long + b.long,
        long7: a.long7 + b.long7,
      }
    } else (inv[it.cat] as PartItem) = it.item
  }
  return inv
}

/** món của đơn đã đủ (có trong kho / giỏ / kiện đang giao) */
function partReady(s: GameState, cat: PartCategory) {
  const order = tourOrder(s)
  if (!order) return true
  return !!checkInventory(plannedInventory(s), order).find((c) => c.cat === cat)?.ok
}
/** feet (bước dán đáy case bắt buộc): có trong vật tư / giỏ / kiện */
function feetReady(s: GameState) {
  const items = [...s.cart.flatMap(cartItems), ...s.parcels.flatMap((p) => p.items)]
  return (
    FEET_IDS.some((id) => (s.supplies[id] ?? 0) > 0) ||
    items.some((it) => it.kind === 'supply' && FEET_IDS.includes(it.id))
  )
}

/** món sắp có: trong giỏ + kiện đã đặt (đang giao / chờ ở cửa) */
const planned = (s: GameState) => [
  ...s.cart.flatMap(cartItems),
  ...s.parcels.flatMap((p) => p.items),
]
/** dụng cụ đã có / đã đặt */
const toolReady = (s: GameState, kind: ToolKind) =>
  s.tools[kind] >= 1 || planned(s).some((it) => it.kind === 'tool' && it.tool === kind)
/** vật tư đã có / đã đặt */
const supplyReady = (s: GameState, id: string) =>
  (s.supplies[id] ?? 0) > 0 || planned(s).some((it) => it.kind === 'supply' && it.id === id)
/** đồ mod stab Cherry clip-in (khách dặn stab phải êm, mod stab tính điểm): Urgo, mỡ housing, mỡ wire, kìm cắt, cọ */
const STAB_SUPPLIES = ['urgo', 'g2', 'bdz']
const STAB_TOOLS: ToolKind[] = ['clipper', 'brush']
const stabModReady = (s: GameState) =>
  STAB_SUPPLIES.every((id) => supplyReady(s, id)) && STAB_TOOLS.every((k) => toolReady(s, k))

/** danh sách mua của đơn hướng dẫn (thứ tự = thứ tự bước) */
const SHOPPING: { name: string; ok: (s: GameState) => boolean }[] = [
  { name: 'Case', ok: (s) => partReady(s, 'case') },
  { name: 'PCB', ok: (s) => partReady(s, 'pcb') },
  { name: 'Plate', ok: (s) => partReady(s, 'plate') },
  { name: 'Stab', ok: (s) => partReady(s, 'stab') },
  { name: 'Switch', ok: (s) => partReady(s, 'switch') },
  { name: 'Keycap', ok: (s) => partReady(s, 'keycap') },
  { name: 'Feet', ok: feetReady },
  { name: 'Đồ mod stab', ok: stabModReady },
]

const KEYS_60 = getLayout('60', {}).keys.length

/** switch Linear rẻ nhất (cấp 1) cho đơn hướng dẫn */
const TUT_SWITCH = 'gateronYellow'

/** thẻ sản phẩm đang chọn đúng option chưa (`data-opt` trên thẻ, vd "70 con", "PBT · Trắng") */
const optIs = (product: string, opt: string) =>
  document.querySelector(`[data-tour="product-${product}"]`)?.getAttribute('data-opt') === opt

/**
 * Các bước mua 1 món: bấm đúng tab mục hàng → (cần option riêng) sáng ô chọn option, chờ chọn đúng → sáng nút
 * "Thêm vào giỏ" của đúng thẻ, chờ món vào giỏ. Món đã đủ thì bỏ qua cả cụm
 */
function buyPart(
  cat: PartCategory,
  name: string,
  product: string,
  intro: string,
  pick?: { opt: string; text: string },
): TourStep[] {
  const ok = (s: GameState) => partReady(s, cat)
  return [
    {
      target: `shopcat-${cat}`,
      // đang đứng sẵn ở đúng mục (vd Shopii mở lần đầu là mục Case) thì khỏi bấm
      skip: (s) => ok(s) || s.shopCat === cat,
      list: true,
      text: `Tiếp theo là ${name}. Bấm mục "${name}" ở cột trái.`,
    },
    ...(pick
      ? [
          {
            target: `opt-${product}`,
            skip: ok,
            until: (s: GameState) => ok(s) || optIs(product, pick.opt),
            list: true,
            text: `${intro} ${pick.text}`,
          },
        ]
      : []),
    {
      target: `add-${product}`,
      until: ok,
      list: true,
      text: pick
        ? `Đúng rồi, "${pick.opt}"! Giờ bấm "Thêm vào giỏ".`
        : `${intro} Bấm "Thêm vào giỏ".`,
    },
  ]
}

const STEPS: TourStep[] = [
  {
    target: 'app-messenger',
    text: 'Khách đặt phím qua Mezzenger, tin vừa tới nằm trong đó. Bấm vào đây để mở xem đơn nhé!',
  },
  {
    target: 'offer',
    text: 'Đơn đầu tiên đây! Bấm vào để đọc yêu cầu: layout, loại switch, keycap, ngân sách, hạn giao.',
  },
  {
    target: 'accept',
    text: 'Khách nhờ build 60% từ A tới Z: shop tự mua hết linh kiện, giao xong khách trả lại tiền đồ (trong budget) + tiền công. Bấm Nhận đơn.',
  },
  {
    target: 'app-shop',
    text: 'Một bàn phím cần 6 món: case, PCB, plate, stab, switch, keycap (+ feet dán đáy). Mình chỉ từng món một, mở Shopii nào!',
  },
  ...buyPart(
    'case',
    'Case',
    'case-plastic60',
    'Case = vỏ bàn phím. Thẻ "Case 60%" (nhựa ABS, 300k, lắp kiểu Tray mount dễ nhất); khách không dặn màu, màu nào cũng được.',
  ),
  ...buyPart(
    'pcb',
    'PCB',
    'pcb-60',
    'PCB = mạch điện. Thẻ "PCB 60%" loại Hotswap: cắm switch thẳng vào mạch, không phải hàn.',
  ),
  ...buyPart('plate', 'Plate', 'plate-60', 'Plate = tấm đỡ giữ switch thẳng hàng.', {
    opt: 'FR4',
    text: 'Ở thẻ "Plate 60%" bấm ô chọn chất liệu này → chọn "FR4" (rẻ, tiếng cân bằng).',
  }),
  ...buyPart(
    'stab',
    'Stab',
    'stab-cherryClip',
    'Stab giữ phím dài (Space, Shift, Enter, Backspace) không lệch. Thẻ "Stab Cherry Clip-in", giữ option "Bộ TKL" (đủ cho 60%, đừng mua lẻ).',
  ),
  ...buyPart(
    'switch',
    'Switch',
    `sw-${TUT_SWITCH}`,
    'Switch = công tắc dưới mỗi phím, khách cần loại Linear.',
    {
      opt: '70 con',
      text: `Ở thẻ "Gateron Vàng" (Linear, rẻ nhất) bấm ô "10 con" này → chọn "70 con" (60% có ${KEYS_60} phím, gói 10 không đủ; gói 70 còn rẻ hơn 10%).`,
    },
  ),
  ...buyPart('keycap', 'Keycap', 'kc-full', 'Keycap = nút bấm.', {
    opt: 'PBT · Trắng',
    text: 'Ở thẻ "Keycap Cherry" bấm ô chọn này → cột chất liệu chọn "PBT", cột màu chọn "Trắng" (đúng như khách dặn).',
  }),
  {
    target: 'shopcat-supply',
    skip: (s) => feetReady(s) || s.shopCat === 'supply',
    list: true,
    text: 'Còn feet cao su dán đáy case (bước lắp cuối bắt buộc). Bấm mục "Lube & vật tư".',
  },
  {
    target: 'add-sup-feet',
    until: feetReady,
    list: true,
    text: 'Thẻ "Feet cao su": màu nào cũng được, 1 vỉ 4 cái là đủ. Bấm "Thêm vào giỏ".',
  },
  // khách dặn "stab phải êm": mod stab (tính điểm) → mua đủ đồ mod cho stab Cherry clip-in
  {
    target: 'add-sup-urgo',
    until: (s) => supplyReady(s, 'urgo'),
    list: true,
    text: 'Khách dặn stab phải êm, nên phải mod stab. Đầu tiên băng Urgo (Holee mod, dán lỗ stem cho wire bớt lắc): 1 cái dùng cho 2 stab, gói 10 là đủ. Bấm "Thêm vào giỏ".',
  },
  {
    target: 'add-sup-g2',
    until: (s) => supplyReady(s, 'g2'),
    list: true,
    text: 'Krytox 205g2: mỡ phết housing + slider stab (hợp nhất cho stab). Bấm "Thêm vào giỏ".',
  },
  {
    target: 'add-sup-bdz',
    until: (s) => supplyReady(s, 'bdz'),
    list: true,
    text: 'Krytox XHT-BDZ: mỡ rất đặc phết wire stab, chống lạch cạch tốt nhất. Bấm "Thêm vào giỏ".',
  },
  {
    target: 'shopcat-tool',
    skip: (s) => STAB_TOOLS.every((k) => toolReady(s, k)) || s.shopCat === 'tool',
    list: true,
    text: 'Còn 2 dụng cụ mod stab. Bấm mục "Dụng cụ".',
  },
  {
    target: 'add-tool-clipper-1',
    until: (s) => toolReady(s, 'clipper'),
    list: true,
    text: 'Kìm cắt chân stab: cắt chân stem stab Cherry cho bớt lạch cạch. Bấm "Thêm vào giỏ".',
  },
  {
    target: 'add-tool-brush-1',
    until: (s) => toolReady(s, 'brush'),
    list: true,
    text: 'Cọ lube: để phết mỡ stab (sau này lube switch cũng dùng). Bấm "Thêm vào giỏ".',
  },
  {
    target: 'cart',
    list: true,
    text: 'Đủ món rồi! Mở Giỏ hàng để thanh toán.',
  },
  {
    target: 'ship-express',
    until: (s) =>
      (!s.cart.length && s.parcels.length > 0) ||
      document.querySelector('[data-tour="ship-express"]')?.getAttribute('aria-pressed') === 'true',
    text: 'Chọn tốc độ giao "Hoả tốc": hàng tới kệ cuối hành lang ngay hôm nay để build luôn (phí +50k mỗi món, đơn đầu cần làm ngay nên đáng). Mẹo: đơn hạn dài (còn 3–4 ngày) thì chọn Nhanh (mai tới) hoặc Tiết kiệm (2 ngày, miễn phí giao) cho đỡ tiền.',
  },
  {
    target: 'place-order',
    until: (s) => !s.cart.length && s.parcels.length > 0,
    text: 'Bấm "Đặt hàng". Tiền linh kiện shop ứng trước, giao phím xong khách trả lại (trong budget).',
  },
  {
    target: 'back',
    text: 'Xong việc ở máy tính! Bấm đây đứng dậy: ra kệ cuối hành lang nhận kiện + cầm thùng đơn, đặt lên bàn build rồi bấm vào thùng để bắt đầu lắp!',
  },
]

export function Tour() {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const rect = useTargetRect(step.target)
  const done = () => useGame.getState().seeGuide(TOUR_ID)

  // bấm đúng phần tử đích (bắt ở pha capture, không chặn click của nó) → sang bước sau khi giao diện kịp đổi
  useEffect(() => {
    let t = 0
    const onClick = (e: MouseEvent) => {
      // bước chờ: bấm trong vùng không tính, chờ điều kiện
      if (step.until) return
      if (!(e.target as Element).closest?.(`[data-tour="${step.target}"]`)) return
      // bước cuối (đứng dậy) ghi đã xem ngay: màn đổi liền, tour bị gỡ trước khi hẹn giờ kịp chạy
      if (i + 1 >= STEPS.length) return done()
      t = window.setTimeout(() => setI(i + 1), 250)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      clearTimeout(t)
    }
  }, [i, step])

  // bước chờ: mở sẵn đúng mục Shopii, đạt điều kiện (vd đã bỏ đúng món vào giỏ) thì sang bước sau
  const ticks = useGame((s) => SHOPPING.map((x) => x.ok(s)).join())
  useEffect(() => {
    if (step.skip?.(useGame.getState())) {
      const t = window.setTimeout(() => setI(i + 1), 0)
      return () => clearTimeout(t)
    }
    // thẻ sản phẩm cần mua: cuộn cả thẻ vào giữa khung cho thấy đủ tên + ô chọn + nút
    const sc = window.setTimeout(() => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      ;(el?.closest('[data-tour^="product-"]') ?? el)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      })
    }, 300)
    const until = step.until
    if (!until) return () => clearTimeout(sc)
    let t = 0
    const check = (s: GameState) => {
      if (t || !until(s)) return
      t = window.setTimeout(() => setI(i + 1), 600)
    }
    check(useGame.getState())
    const unsub = useGame.subscribe(check)
    // điều kiện đọc DOM (option đang chọn trên thẻ) không đổi store: dò thêm định kỳ
    const poll = window.setInterval(() => check(useGame.getState()), 250)
    return () => {
      unsub()
      clearInterval(poll)
      clearTimeout(t)
      clearTimeout(sc)
    }
  }, [i, step])

  const hole = holeOf(rect)
  return (
    <Spotlight
      hole={hole}
      // ô chọn option / nút thêm giỏ nằm trong thẻ sản phẩm: bong bóng sang cạnh để không che thẻ
      side={/^(opt|add)-/.test(step.target)}
      label={`${i + 1} / ${STEPS.length}`}
      text={step.text}
      actions={
        <Button size="sm" onClick={done}>
          Bỏ qua hướng dẫn
        </Button>
      }
    >
      {/* danh sách món cần mua: ✓ khi đã có / đã trong giỏ / đang giao */}
      {step.list && (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-lg bg-black/20 px-2 py-1.5 text-xs font-bold">
          {SHOPPING.map((x, k) => {
            const ok = ticks.split(',')[k] === 'true'
            return (
              <li
                key={x.name}
                className={
                  ok ? 'flex items-center gap-1 text-green' : 'flex items-center gap-1 text-muted'
                }
              >
                {ok ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="size-3.5 text-center">·</span>
                )}
                {x.name}
              </li>
            )
          })}
        </ul>
      )}
    </Spotlight>
  )
}

/** mọi câu lời dẫn của tour máy tính (`bun run gen:voice` sinh giọng Keeb-chan) */
export const TOUR_LINES = STEPS.map((s) => s.text)
