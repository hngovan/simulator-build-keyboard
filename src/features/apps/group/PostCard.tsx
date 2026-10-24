import { Avatar, Button, Muted } from '@/components/ui'
import { itemName } from '@/data/parts'
import { fmt } from '@/lib/format'
import type { GroupPost } from '@/types'
import { ProductImage } from '../shop/ProductImage'

/** Bài đăng pass đồ trong group */
export function PostCard({ post, onBuy }: { post: GroupPost; onBuy: () => void }) {
  return (
    <div className="rounded-[14px] bg-panel-2 p-3">
      <div className="flex items-center gap-2.5">
        <Avatar small>{post.seller[0]}</Avatar>
        <div>
          <b>{post.seller}</b>
          <div>
            <Muted>{post.caption}</Muted>
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <div className="w-[90px] shrink-0">
          <ProductImage
            product={post.product}
            swatch={post.opt.swatch}
            item={post.opt.item}
            className="h-24"
          />
        </div>
        <div>
          <div className="font-extrabold">{itemName(post.product.cat, post.opt.item)}</div>
          <div>
            <s className="text-muted">{fmt(post.opt.price)}</s>{' '}
            <span className="font-head text-lg font-extrabold text-[#ff8c5a]">
              {fmt(post.price)}
            </span>
          </div>
          <Muted>
            👍 {post.likes} · 💬 {Math.floor(post.likes / 3)} bình luận
          </Muted>
        </div>
      </div>
      <Button tone="blue" wide disabled={post.sold} onClick={onBuy}>
        {post.sold ? 'Đã chốt' : '💬 Inbox chốt đơn'}
      </Button>
    </div>
  )
}
