import { useGame } from '@/store'
import { PostCard } from './PostCard'

// Group Facebook pass đồ: rẻ hơn nhưng có thể bị bùng
export function GroupFeed() {
  const posts = useGame((s) => s.posts)
  const order = useGame((s) => s.order)
  const buyPost = useGame((s) => s.buyPost)
  if (!order)
    return (
      <div className="p-8 text-center text-muted">
        Nhận đơn trước để xem các bài pass đồ phù hợp nhé.
      </div>
    )
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-[10px] border-2 border-yellow bg-[#5a3d0a] px-3 py-2 font-bold">
        ⚠️ Hàng pass rẻ hơn 20–40% nhưng có khoảng 20% khả năng gặp seller bùng tiền!
      </div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onBuy={() => buyPost(post)} />
      ))}
    </div>
  )
}
