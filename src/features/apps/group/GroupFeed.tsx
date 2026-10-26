import { useState } from 'react'
import { useGame } from '@/store'
import { ClipboardList } from 'lucide-react'
import { Alert, Empty, OptionChip } from '@/components/ui'
import { PostCard } from './PostCard'
import { MyListings } from './MyListings'

// Group Facebook pass đồ: rẻ hơn nhưng caption "thuật ngữ chợ" giấu lỗi, có seller bùng; inbox để dò hỏi / trả giá.
// Tab "Bài của tôi": shop tự đăng bán (MyListings)
export function GroupFeed() {
  const posts = useGame((s) => s.posts)
  const order = useGame((s) => s.order)
  const day = useGame((s) => s.day)
  const banUntil = useGame((s) => s.marketBanUntil)
  const mine = useGame((s) => s.listings.length)
  const openStolen = useGame((s) => s.stolen.some((x) => x.status === 'open'))
  const [tab, setTab] = useState<'feed' | 'mine'>(openStolen ? 'mine' : 'feed')
  // đi ăn xin bị ban: không xem / mua / đăng được tới hết ngày banUntil - 1
  if (day < banUntil)
    return (
      <div className="p-6">
        <Alert tone="red" title={`🚫 Bạn đang bị ban khỏi chợ (còn ${banUntil - day} ngày)`}>
          Admin ban vì đi ăn xin người bán. Ngày {banUntil} mới vào lại được, giờ mua ở Shopii nhé.
        </Alert>
      </div>
    )
  return (
    <div className="flex flex-col gap-2.5">
      {/* 2 tab dính trên cùng khi cuộn (bù padding thân cửa sổ để nền phủ kín mép) */}
      <div className="sticky -top-3.5 z-10 -mx-3.5 -mt-3.5 flex flex-wrap gap-1 bg-panel px-3.5 pt-3.5 pb-2 max-md:-top-2.5 max-md:-mx-2.5 max-md:-mt-2.5 max-md:px-2.5 max-md:pt-2.5">
        <OptionChip active={tab === 'feed'} onClick={() => setTab('feed')}>
          Chợ pass
        </OptionChip>
        <OptionChip active={tab === 'mine'} onClick={() => setTab('mine')}>
          Bài của tôi{mine ? ` (${mine})` : ''}
          {openStolen && ' 🚨'}
        </OptionChip>
      </div>
      {tab === 'mine' ? (
        <MyListings />
      ) : !order ? (
        <Empty icon={<ClipboardList />}>Nhận đơn trước để xem các bài pass đồ phù hợp nhé.</Empty>
      ) : (
        <>
          <Alert tone="yellow" title="Hàng pass rẻ hơn 20–40% nhưng mô tả toàn thuật ngữ chợ">
            Xin hình, check var trước khi chuyển khoản kẻo dính flaw hoặc gặp seller bùng!
          </Alert>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </>
      )}
    </div>
  )
}
