import { useGame } from '@/store'
import { Alert } from '@/components/ui'
import { PostCard } from './PostCard'

// Group Facebook pass đồ: rẻ hơn nhưng caption "thuật ngữ chợ" giấu lỗi, có seller bùng; inbox để dò hỏi / trả giá
export function GroupFeed() {
  const posts = useGame((s) => s.posts)
  const order = useGame((s) => s.order)
  if (!order)
    return (
      <div className="p-8 text-center text-muted">
        Nhận đơn trước để xem các bài pass đồ phù hợp nhé.
      </div>
    )
  return (
    <div className="flex flex-col gap-2.5">
      <Alert tone="yellow" title="Hàng pass rẻ hơn 20–40% nhưng mô tả toàn thuật ngữ chợ">
        Xin hình, check var trước khi chuyển khoản kẻo dính flaw hoặc gặp seller bùng!
      </Alert>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
