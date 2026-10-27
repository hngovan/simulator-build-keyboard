import { useGame } from '@/store'
import { CircleAlert, ClipboardList, Newspaper, Store, UsersRound } from 'lucide-react'
import { Alert, Empty, TabChip } from '@/components/ui'
import { UNLIST_FREE } from '@/data/selling'
import { PostCard } from './PostCard'
import { MyListings } from './MyListings'

// Group Facebook pass đồ: rẻ hơn nhưng caption "thuật ngữ chợ" giấu lỗi, có seller bùng; inbox để dò hỏi / trả giá.
// Tab "Bài của tôi": shop tự đăng bán (MyListings)
export function GroupFeed() {
  const posts = useGame((s) => s.posts)
  const order = useGame((s) => s.order)
  const day = useGame((s) => s.day)
  const banUntil = useGame((s) => s.marketBanUntil)
  const banWhy = useGame((s) => s.marketBanWhy)
  const mine = useGame((s) => s.listings.length)
  const openStolen = useGame((s) => s.stolen.some((x) => x.status === 'open'))
  const tab = useGame((s) => (openStolen ? 'mine' : s.groupTab))
  const setTab = useGame((s) => s.setGroupTab)
  // bị admin ban (ăn xin, gỡ bài quá nhiều, bán hàng lỗi bị tố): không xem / mua / đăng được tới hết ngày banUntil - 1
  if (day < banUntil)
    return (
      <div className="p-6">
        <Alert tone="red" title={`🚫 Bạn đang bị ban khỏi chợ (còn ${banUntil - day} ngày)`}>
          Lý do: {banWhy || 'đi ăn xin người bán'}. Ngày {banUntil} mới vào lại được, giờ mua ở
          Shopii nhé.
        </Alert>
      </div>
    )
  return (
    // cùng kiểu bảng xếp hạng: đầu (icon + tiêu đề + ⓘ) → tab lọc kiểu Shopii (đứng yên) → khung nền tối cuộn riêng
    <div className="flex h-[min(680px,74vh)] flex-col gap-3 group-data-fill/win:h-full">
      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-yellow/15 text-yellow">
          <UsersRound className="size-9" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-head text-2xl leading-tight font-extrabold text-yellow">
            Hội Phím Cơ VN
          </div>
          <div className="truncate text-sm text-muted">
            {tab === 'mine'
              ? 'Đăng bán đồ kho chung, linh kiện đơn đã nhận'
              : 'Hàng pass rẻ hơn 20–40% nhưng mô tả toàn thuật ngữ chợ'}
          </div>
        </div>
        <span
          className="shrink-0 self-start text-muted hover:text-ink"
          title={
            tab === 'mine'
              ? `Gỡ bài quá ${UNLIST_FREE} lần / ngày là bị admin ban chợ · bán đồ của khách thì 95% bị lộ`
              : 'Xin hình, check var trước khi chuyển khoản kẻo dính flaw hoặc gặp seller bùng! Ai cũng uy tín cho đến khi...'
          }
        >
          <CircleAlert className="size-5" />
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <TabChip
          active={tab === 'feed'}
          icon={Store}
          count={order ? posts.length : undefined}
          onClick={() => setTab('feed')}
        >
          Chợ pass
        </TabChip>
        <TabChip
          active={tab === 'mine'}
          icon={Newspaper}
          count={mine}
          title={openStolen ? 'Phím của khách đang bị giữ, chuộc lại ngay' : undefined}
          onClick={() => setTab('mine')}
        >
          Bài của tôi
          {openStolen && ' 🚨'}
        </TabChip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-2xl bg-black/15 p-1.5">
        {tab === 'mine' ? (
          <MyListings />
        ) : !order ? (
          <Empty icon={<ClipboardList />}>Nhận đơn trước để xem các bài pass đồ phù hợp nhé.</Empty>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
