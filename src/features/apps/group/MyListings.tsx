import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, Gavel, Newspaper, PackageOpen } from 'lucide-react'
import { useGame } from '@/store'
import { Alert, Button, Empty, Muted, OptionChip, OptionSelect } from '@/components/ui'
import { NameAvatar } from '@/components/game/CustomerAvatar'
import { Tag } from './Tag'
import { cn, fmt } from '@/lib/format'
import { CATS } from '@/data/parts'
import {
  BID_STEPS,
  BUYBACK_DAYS,
  bidFloor,
  jobPartFree,
  LISTING_TAGS,
  RICH_MAX,
  UNLIST_FREE,
  sourceBase,
  sourceFlaw,
  sourceTitle,
  sourceValue,
  type Listing,
  type ListingSource,
  type ListingTag,
} from '@/data/selling'
import type { PartCategory } from '@/types'

/** bot ghé bài của mình mỗi bao lâu (ms) khi đang mở tab */
const BOT_MS = 3500
const TAG_IDS = Object.keys(LISTING_TAGS) as ListingTag[]
const MODES = [{ label: 'Giá cố định' }, { label: 'Fast bid' }]

/** món đọc được tên + giá (bản lưu cũ có thể còn món mà id đã đổi / bỏ khỏi danh mục) */
const readable = (src: ListingSource) => {
  try {
    return !!sourceTitle(src) && Number.isFinite(sourceValue(src))
  } catch {
    return false
  }
}

interface Source {
  key: string
  src: ListingSource
  index?: number
}

/** món đăng bán được: phím của khách đã đóng gói chưa gửi, linh kiện đơn đã nhận (chưa build), kho chung */
function useSources(): Source[] {
  const spare = useGame((s) => s.spare)
  const packed = useGame((s) => s.packed)
  const order = useGame((s) => s.order)
  const inventory = useGame((s) => s.inventory)
  const provided = useGame((s) => s.provided)
  const build = useGame((s) => s.build)
  const result = useGame((s) => s.result)
  const jobs = useGame((s) => s.jobs)
  // linh kiện của 1 đơn đã nhận (kể cả đồ khách gửi): bán thoải mái như đồ thường, trừ món đã assem ở bàn build
  const jobParts = (
    id: string,
    customer: string,
    inv: typeof inventory,
    prov: typeof provided,
    b: typeof build,
  ): Source[] =>
    (Object.keys(CATS) as PartCategory[]).flatMap((cat) => {
      const item = inv[cat]
      if (!item || (cat === 'plate' && (item as { material: string }).material === 'none'))
        return []
      if (!jobPartFree(cat, item, b)) return []
      const src = { kind: 'job', orderId: id, customer, cat, item, provided: !!prov[cat] } as const
      return [{ key: `job:${id}:${cat}`, src }]
    })
  const list: Source[] = [
    ...packed
      .filter((p) => !p.shipped)
      .map((p) => ({ key: `c:${p.order.id}`, src: { kind: 'customer', packed: p } as const })),
    ...(order && !result ? jobParts(order.id, order.customer, inventory, provided, build) : []),
    ...jobs.flatMap((j) =>
      jobParts(
        j.order.id,
        j.order.customer,
        j.session.inventory,
        j.session.provided,
        j.session.build,
      ),
    ),
    ...Object.entries(spare.switches)
      .filter(([, n]) => n > 0)
      .map(([type, count]) => ({
        key: `sw:${type}`,
        src: { kind: 'switch', type, count } as const,
      })),
    ...Object.entries(spare.stabs).map(([type, stock]) => ({
      key: `st:${type}`,
      src: { kind: 'stab', type, item: { type, ...stock } } as const,
    })),
    ...spare.items.map((e, index) => ({
      key: `it:${index}`,
      src: { kind: 'item', cat: e.cat, item: e.item } as const,
      index,
    })),
  ]
  return list.filter((x) => readable(x.src))
}

/** nhãn nguồn món: phím của khách / đồ trong đơn / hàng lỗi */
function SourceTags({ src }: { src: ListingSource }) {
  const flaw = sourceFlaw(src)
  return (
    <>
      {src.kind === 'customer' && (
        <Tag tone="red" className="shrink-0">
          Phím của khách
        </Tag>
      )}
      {src.kind === 'job' && (
        <Tag tone="blue" className="shrink-0" title={`Linh kiện trong đơn ${src.customer}`}>
          Đơn {src.customer}
        </Tag>
      )}
      {flaw && (
        <Tag tone="red" className="shrink-0" title={`Lỗi: ${flaw}`}>
          Hàng lỗi
        </Tag>
      )}
    </>
  )
}

/** ô nhập số tiền (k) */
function PriceInput({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      title={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
      onFocus={(e) => e.target.select()}
      className="h-8 w-20 rounded-lg border-2 border-white/15 bg-black/25 text-center font-head text-sm font-extrabold outline-none focus:border-orange"
    />
  )
}

/** 1 món có thể đăng: tên, giá gốc / giá chợ; bấm mở form đăng (giá cố định / bid, tag bài) */
function SourceRow({ src, index }: { src: ListingSource; index?: number }) {
  const value = sourceValue(src)
  const base = sourceBase(src)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(0)
  const [price, setPrice] = useState(value)
  const [step, setStep] = useState(1)
  // giá BIN (0 = không đặt): người mua trả đúng giá này là thắng ngay
  const [bin, setBin] = useState(0)
  const [tags, setTags] = useState<ListingTag[]>([])
  const customer = src.kind === 'customer'
  const bid = mode === 1
  const post = () =>
    useGame.getState().postListing(src, price, index, {
      tags,
      ...(bid ? { bidStep: BID_STEPS[step], bin } : {}),
    })
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border-2 bg-panel-2 px-2.5 py-2',
        sourceFlaw(src) ? 'border-red/70' : 'border-transparent',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-bold">
            <span className="truncate">{sourceTitle(src)}</span>
            <SourceTags src={src} />
          </div>
          <Muted>
            Giá gốc {fmt(base)} · giá chợ ~{fmt(value)}
          </Muted>
        </div>
        <Button size="sm" tone={open ? 'default' : 'blue'} onClick={() => setOpen(!open)}>
          {open ? 'Đóng' : 'Đăng bán'}
        </Button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 border-t border-dashed border-line pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <OptionSelect
              value={mode}
              // fast bid mặc định khởi điểm = giá sàn (khởi điểm cao hơn giá người mua chịu trả thì không ai bid)
              onChange={(m) => {
                setMode(m)
                setPrice(m === 1 ? bidFloor(src) : value)
              }}
              options={MODES}
              className="w-36"
            />
            <PriceInput
              value={price}
              onChange={setPrice}
              label={bid ? 'Giá khởi điểm (k), thấp nhất 0' : 'Giá đăng bán (k)'}
            />
            {bid && (
              <OptionSelect
                value={step}
                onChange={setStep}
                options={BID_STEPS.map((n) => ({ label: `Bước ${n}k` }))}
                className="w-32"
              />
            )}
            {bid && (
              <label className="flex items-center gap-1.5 font-head text-sm font-extrabold">
                BIN
                <PriceInput
                  value={bin}
                  onChange={setBin}
                  label="Giá BIN (k): ai trả đúng giá này thắng ngay, 0 = không đặt"
                />
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {TAG_IDS.filter((t) => !bid || (t !== 'firm' && t !== 'lowball')).map((t) => (
              <OptionChip
                key={t}
                active={tags.includes(t)}
                title={LISTING_TAGS[t].hint}
                onClick={() =>
                  setTags((cur) =>
                    cur.includes(t)
                      ? cur.filter((x) => x !== t)
                      : // price no offer / lowball thoải mái không đi cùng nhau
                        [
                          ...cur.filter(
                            (x) =>
                              !(t === 'firm' && x === 'lowball') &&
                              !(t === 'lowball' && x === 'firm'),
                          ),
                          t,
                        ],
                  )
                }
              >
                #{LISTING_TAGS[t].label}
              </OptionChip>
            ))}
          </div>
          <Muted>
            {bid
              ? `Fast bid chạy 1 phút, đặt giá BIN thì ai trả đúng giá đó thắng ngay (dừng giờ). Giá sàn ${fmt(bidFloor(src))}: khởi điểm tới mức này chắc chắn có người bid (hạ được tới 0đ), cao hơn thì có thể ế. May thì lời, ế thì lỗ.`
              : `Đăng tới ${RICH_MAX}× giá gốc (${fmt(Math.round(base * RICH_MAX))}) vẫn có thể gặp đại gia chốt trong đêm; chứng chỉ thợ +5% mỗi bậc.`}
            {sourceFlaw(src) && ' Hàng lỗi: bán đi có thể bị tố mô tả sai, admin ban chợ.'}
          </Muted>
          <Button
            size="sm"
            tone={customer ? 'red' : 'green'}
            title={customer ? 'Chỉ 5% khách không phát hiện, bị lộ thì −1 uy tín' : undefined}
            onClick={post}
            className="self-end"
          >
            {bid ? 'Mở fast bid' : 'Đăng bài'}
          </Button>
        </div>
      )}
    </div>
  )
}

/** đếm ngược bài bid (giây) */
function useCountdown(endsAt?: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [endsAt])
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0
}

/** bài mình đã đăng: thu gọn = tiêu đề + giá + nhãn (bấm tiêu đề / mũi tên); mở = bình luận / trả giá của bot, bấm giá để bán */
function ListingCard({ l }: { l: Listing }) {
  const { sellListing, unlist, closeBid, bailBid } = useGame.getState()
  const [open, setOpen] = useState(true)
  const left = useCountdown(l.bid?.endsAt)
  const offers = l.log.filter((x) => x.offer).length
  return (
    <div
      className={cn(
        'rounded-xl border-2 bg-panel-2 p-3',
        sourceFlaw(l.src) ? 'border-red/70' : 'border-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          title={open ? 'Thu gọn bài' : 'Mở bài'}
          className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
        >
          {/* hashtag nghiêng, nằm trên cùng (trên tiêu đề) */}
          {!!l.tags?.length && (
            <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 italic">
              {l.tags.map((t) => (
                <Tag key={t} tone={LISTING_TAGS[t].tone} title={LISTING_TAGS[t].hint}>
                  #{LISTING_TAGS[t].label}
                </Tag>
              ))}
            </span>
          )}
          <span className="w-full truncate font-head font-extrabold">{l.title}</span>
          <span className="flex flex-wrap items-center gap-1">
            {l.bid && (
              <Tag tone="orange">
                <Gavel />{' '}
                {l.bid.binned
                  ? 'Có người BIN · chờ chốt'
                  : l.bid.ended
                    ? 'Fast bid xong · chờ chốt'
                    : left > 0
                      ? `Fast bid · còn ${left}s`
                      : 'Hết giờ'}
              </Tag>
            )}
            {l.bid?.bin && !l.bid.binned && <Tag tone="green">BIN {fmt(l.bid.bin)}</Tag>}
            <SourceTags src={l.src} />
            {!open && (
              <Muted>
                {l.log.length} bình luận{offers ? ` · ${offers} trả giá` : ''}
              </Muted>
            )}
          </span>
        </button>
        <div className="flex flex-col items-end">
          <span className="font-head text-lg font-extrabold text-[#ff8c5a]">
            {fmt(l.bid?.top?.amount ?? l.price)}
          </span>
          {l.bid && (
            <Muted>
              {l.bid.top
                ? `${l.bid.top.name} ${l.bid.binned ? 'đã BIN' : l.bid.ended ? 'thắng bid' : 'đang giữ giá'}`
                : `Khởi điểm · bước ${l.bid.step}k`}
            </Muted>
          )}
        </div>
        {!l.bid?.top && (
          <Button size="sm" onClick={() => unlist(l.id)}>
            Gỡ bài
          </Button>
        )}
        {/* mở / đóng bình luận (giống dòng Danh sách đơn) */}
        <button
          type="button"
          aria-label={open ? 'Thu gọn bài' : 'Mở bài'}
          onClick={() => setOpen(!open)}
          className="shrink-0 text-muted hover:text-ink"
        >
          <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {/* fast bid hết giờ: không tự bán, shop chốt cho người thắng hoặc bùng (bị admin ban chợ) */}
      {l.bid?.ended && l.bid.top && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            tone="red"
            title="Không bán cho người thắng: món về chỗ cũ nhưng bị admin ban chợ"
            onClick={() => bailBid(l.id)}
          >
            Bùng bid
          </Button>
          <Button size="sm" tone="green" onClick={() => closeBid(l.id)}>
            Chốt bán {fmt(l.bid.top.amount)} cho {l.bid.top.name}
          </Button>
        </div>
      )}
      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {!l.log.length && <Muted>Chưa ai bình luận, chờ chút nhé...</Muted>}
          {l.log.map((line, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <NameAvatar name={line.name} className="size-9" />
              <div className="min-w-0 flex-1">
                <b>{line.name}</b>: {line.text}
              </div>
              {line.offer && !l.bid && (
                <Button size="sm" tone="green" onClick={() => sellListing(l.id, i)}>
                  Bán {fmt(line.offer)}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Nhóm bài thu gọn được: tiêu đề + ghi chú bên trái, số bài / món (14px đậm) + mũi tên bên phải; bấm tiêu đề để mở / đóng */
function Section({
  title,
  note,
  count,
  unit,
  children,
}: {
  title: string
  note?: string
  count: number
  /** đơn vị số đếm: bài / món */
  unit: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        title={open ? 'Thu gọn' : 'Mở'}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-1.5 pt-1 text-left text-base font-bold"
      >
        <span className="font-head font-extrabold">{title}</span>
        {note && <span className="text-xs font-normal text-muted">{note}</span>}
        <span className="ml-auto font-head text-sm font-extrabold text-muted tabular-nums">
          {count} {unit}
        </span>
        <ChevronDown
          className={cn('size-5 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && children}
    </>
  )
}

// Tab "Bài của tôi" ở Hội Phím Cơ: shop tự đăng bán đồ kho chung / linh kiện đơn / phím của khách, chuộc lại phím bị lộ
export function MyListings() {
  const listings = useGame((s) => s.listings)
  const stolen = useGame((s) => s.stolen)
  const day = useGame((s) => s.day)
  const unlists = useGame((s) => (s.unlists.day === s.day ? s.unlists.n : 0))
  const sources = useSources()
  const has = listings.length > 0

  // bot ghé bài định kỳ khi đang mở tab
  useEffect(() => {
    if (!has) return
    const t = setInterval(() => useGame.getState().botVisit(), BOT_MS)
    return () => clearInterval(t)
  }, [has])

  return (
    // chữ phụ xám (text-xs text-muted: giá gốc / chợ, bình luận, ghi chú gỡ bài) 12 → 13px cho dễ đọc
    <div className="flex flex-col gap-2.5 [&_.text-xs.text-muted]:text-[13px]">
      {stolen
        .filter((x) => x.status === 'open')
        .map((x) => (
          <Alert key={x.id} title={`Phím của ${x.packed.order.customer} đang ở chỗ ${x.buyer}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1">
                Chuộc lại để gửi khách (còn {BUYBACK_DAYS - (day - x.day)} ngày trước khi người mua
                bán đi). Có người không cho chuộc đâu nhé.
              </span>
              <Button tone="green" size="sm" onClick={() => useGame.getState().buyBack(x.id)}>
                Inbox chuộc lại · {fmt(x.price)}
              </Button>
            </div>
          </Alert>
        ))}
      {stolen
        .filter((x) => x.status !== 'open' && day - x.day <= 1)
        .map((x) => (
          <div key={x.id} className="rounded-xl bg-panel-2 px-3 py-2 text-sm">
            <b>{x.buyer}</b>: “{x.reply}”{' '}
            <Tag tone={x.status === 'returned' ? 'green' : 'red'}>
              {x.status === 'returned' ? 'Đã chuộc lại' : 'Mất phím'}
            </Tag>
          </div>
        ))}

      <Section
        title="Bài đang đăng"
        note={unlists ? `· đã gỡ ${unlists}/${UNLIST_FREE} lần hôm nay` : undefined}
        count={listings.length}
        unit="bài"
      >
        {!has && <Empty icon={<Newspaper />}>Chưa có bài đăng nào</Empty>}
        {listings.map((l) => (
          <ListingCard key={l.id} l={l} />
        ))}
      </Section>

      <Section title="Đăng bán món mới" count={sources.length} unit="món">
        {!sources.length && (
          <Empty icon={<PackageOpen />}>Kho trống, chưa có món nào để đăng bán</Empty>
        )}
        {sources.map((x) => (
          <SourceRow key={x.key} src={x.src} index={x.index} />
        ))}
      </Section>
    </div>
  )
}
