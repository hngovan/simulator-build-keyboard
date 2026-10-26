import { useState } from 'react'
import { MessageCircle, MessageSquareText, ThumbsUp } from 'lucide-react'
import { Avatar, Badge, Button } from '@/components/ui'
import { itemName } from '@/data/parts'
import { fmt } from '@/lib/format'
import type { GroupPost } from '@/types'
import { ProductImage } from '../shop/ProductImage'
import { InboxChat } from './InboxChat'

/** Bài đăng pass đồ trong group: caption thuật ngữ chợ, inbox người bán để hỏi / trả giá / chốt */
export function PostCard({ post }: { post: GroupPost }) {
  const [inbox, setInbox] = useState(false)
  const deal = post.deal
  const [desc, ...tags] = post.caption.split(' · ')
  return (
    <div className="rounded-[14px] bg-panel-2 p-3">
      <div className="flex items-center gap-2.5">
        <Avatar small>{post.seller[0]}</Avatar>
        <div className="min-w-0">
          <b>{post.seller}</b>
          <div className="text-sm">“{desc}”</div>
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
        <div className="min-w-0">
          <div className="font-extrabold">{itemName(post.product.cat, post.opt.item)}</div>
          <div>
            <s className="text-muted">{fmt(post.opt.price)}</s>{' '}
            <span className="font-head text-lg font-extrabold text-[#ff8c5a]">
              {fmt(deal?.price ?? post.price)}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge
                key={t}
                solid
                tone={
                  t === 'Fs'
                    ? 'green'
                    : t === 'Price no offer'
                      ? 'red'
                      : t.startsWith('Nhanh gọn')
                        ? 'blue'
                        : 'yellow'
                }
                className="ml-0"
                title={t === 'Fs' ? 'Fs = free ship, người bán chịu phí ship' : undefined}
              >
                {t}
              </Badge>
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-3 font-head text-sm font-bold text-ink/85 [&_svg]:size-4">
            <span className="flex items-center gap-1" title="Lượt thích">
              <ThumbsUp className="fill-blue/30 text-[#7fb0ff]" />
              {post.likes}
            </span>
            <span className="flex items-center gap-1" title="Bình luận">
              <MessageSquareText className="text-[#9ff0b8]" />
              {Math.floor(post.likes / 3)} bình luận
            </span>
          </div>
        </div>
      </div>
      <Button
        tone={deal?.blocked ? 'red' : 'blue'}
        wide
        disabled={post.sold || deal?.blocked}
        className="flex items-center justify-center gap-2 [&_svg]:size-4"
        onClick={() => setInbox(true)}
      >
        <MessageCircle />
        {post.sold
          ? 'Đã chốt'
          : deal?.blocked
            ? 'Bị chặn'
            : deal?.log.length
              ? 'Inbox tiếp'
              : 'Inbox'}
      </Button>
      {inbox && <InboxChat post={post} onClose={() => setInbox(false)} />}
    </div>
  )
}
