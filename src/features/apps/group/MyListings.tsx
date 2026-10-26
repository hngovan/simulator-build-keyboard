import { useEffect, useState, type ReactNode } from 'react'
import { Newspaper, PackageOpen } from 'lucide-react'
import { useGame } from '@/store'
import { Alert, Avatar, Badge, Button, Heading, Muted } from '@/components/ui'
import { fmt } from '@/lib/format'
import {
  BUYBACK_DAYS,
  sourceTitle,
  sourceValue,
  type Listing,
  type ListingSource,
} from '@/data/selling'

/** bot ghé bài của mình mỗi bao lâu (ms) khi đang mở tab */
const BOT_MS = 3500

/** món đọc được tên + giá (bản lưu cũ có thể còn món mà id đã đổi / bỏ khỏi danh mục) */
const readable = (src: ListingSource) => {
  try {
    return !!sourceTitle(src) && Number.isFinite(sourceValue(src))
  } catch {
    return false
  }
}

/** món đăng bán được: đồ trong kho chung + phím của khách đã đóng gói chưa gửi */
function useSources(): { key: string; src: ListingSource; index?: number }[] {
  const spare = useGame((s) => s.spare)
  const packed = useGame((s) => s.packed)
  const list: { key: string; src: ListingSource; index?: number }[] = [
    ...packed
      .filter((p) => !p.shipped)
      .map((p) => ({ key: `c:${p.order.id}`, src: { kind: 'customer', packed: p } as const })),
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

/** 1 dòng món có thể đăng: tên, giá gợi ý, ô nhập giá + nút đăng */
function SourceRow({ src, index }: { src: ListingSource; index?: number }) {
  const value = sourceValue(src)
  const [price, setPrice] = useState(value)
  const customer = src.kind === 'customer'
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-panel-2 px-2.5 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5 font-bold">
          <span className="truncate">{sourceTitle(src)}</span>
          {customer && (
            <Badge solid tone="red" className="ml-0 shrink-0">
              Đồ của khách
            </Badge>
          )}
        </div>
        <Muted>Giá chợ ~{fmt(value)}</Muted>
      </div>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Giá đăng bán (k)"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, '')) || 0)}
        onFocus={(e) => e.target.select()}
        className="h-8 w-20 rounded-lg border-2 border-white/15 bg-black/25 text-center font-head text-sm font-extrabold outline-none focus:border-orange"
      />
      <Button
        size="sm"
        tone={customer ? 'red' : 'blue'}
        title={customer ? 'Chỉ 5% khách không phát hiện, bị lộ thì −1 uy tín' : undefined}
        onClick={() => useGame.getState().postListing(src, price, index)}
      >
        Đăng bán
      </Button>
    </div>
  )
}

/** bài mình đã đăng: bình luận / trả giá của bot, bấm giá để bán */
function ListingCard({ l }: { l: Listing }) {
  const { sellListing, unlist } = useGame.getState()
  return (
    <div className="rounded-[14px] bg-panel-2 p-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 font-extrabold">
          <span className="truncate">{l.title}</span>
          {l.src.kind === 'customer' && (
            <Badge solid tone="red" className="ml-0 shrink-0">
              Đồ của khách
            </Badge>
          )}
        </div>
        <span className="font-head text-lg font-extrabold text-[#ff8c5a]">{fmt(l.price)}</span>
        <Button size="sm" onClick={() => unlist(l.id)}>
          Gỡ bài
        </Button>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {!l.log.length && <Muted>Chưa ai bình luận, chờ chút nhé...</Muted>}
        {l.log.map((line, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <Avatar small>{line.name[0]}</Avatar>
            <div className="min-w-0 flex-1">
              <b>{line.name}</b>: {line.text}
            </div>
            {line.offer && (
              <Button size="sm" tone="green" onClick={() => sellListing(l.id, i)}>
                Bán {fmt(line.offer)}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Tab "Bài của tôi" ở Hội Phím Cơ: shop tự đăng bán đồ kho chung / phím của khách, chuộc lại phím bị lộ
export function MyListings() {
  const listings = useGame((s) => s.listings)
  const stolen = useGame((s) => s.stolen)
  const day = useGame((s) => s.day)
  const sources = useSources()
  const has = listings.length > 0

  // bot ghé bài định kỳ khi đang mở tab
  useEffect(() => {
    if (!has) return
    const t = setInterval(() => useGame.getState().botVisit(), BOT_MS)
    return () => clearInterval(t)
  }, [has])

  return (
    <div className="flex flex-col gap-2.5">
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
            <Badge solid tone={x.status === 'returned' ? 'green' : 'red'} className="ml-0">
              {x.status === 'returned' ? 'Đã chuộc lại' : 'Mất phím'}
            </Badge>
          </div>
        ))}

      <Heading info="Đồ trong kho chung hoặc phím của khách đã đóng gói chưa gửi. Bán phím của khách thì 95% bị lộ">
        Bài đang đăng ({listings.length})
      </Heading>
      {!has && <Empty icon={<Newspaper />}>Chưa có bài đăng nào</Empty>}
      {listings.map((l) => (
        <ListingCard key={l.id} l={l} />
      ))}

      <Heading>Đăng bán món mới</Heading>
      {!sources.length && <Empty icon={<PackageOpen />}>Kho trống</Empty>}
      {sources.map((x) => (
        <SourceRow key={x.key} src={x.src} index={x.index} />
      ))}
    </div>
  )
}

/** ô trống: icon + chữ ở giữa */
function Empty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-panel-2 py-6 text-sm font-bold text-muted [&_svg]:size-8 [&_svg]:opacity-70">
      {icon}
      {children}
    </div>
  )
}
