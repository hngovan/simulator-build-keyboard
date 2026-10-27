import { useState } from 'react'
import { ChevronDown, MessageCircle, MessageSquareText, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui'
import { NameAvatar } from '@/components/game/CustomerAvatar'
import { itemName } from '@/data/parts'
import { cn, fmt } from '@/lib/format'
import type { GroupPost } from '@/types'
import { ProductImage } from '../shop/ProductImage'
import { InboxChat } from './InboxChat'
import { Tag } from './Tag'

/**
 * Bài đăng pass đồ trong group: caption thuật ngữ chợ, inbox người bán để hỏi / trả giá / chốt.
 * Bấm đầu bài để thu gọn (chỉ còn người bán, tên món, giá); bài đã chốt mặc định thu gọn
 */
export function PostCard({ post }: { post: GroupPost }) {
  const [inbox, setInbox] = useState(false)
  const [open, setOpen] = useState(!post.sold)
  const deal = post.deal
  const [desc, ...tags] = post.caption.split(' · ')
  const name = itemName(post.product.cat, post.opt.item)
  const price = fmt(deal?.price ?? post.price)
  return (
    <div className={cn('shrink-0 rounded-xl bg-panel-2 p-3', post.sold && 'opacity-70')}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        title={open ? 'Thu gọn bài' : 'Mở bài'}
        className="flex cursor-pointer items-center gap-3"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(!open)}
      >
        <NameAvatar name={post.seller} className="size-10 ring-2 ring-white/15" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-head text-base font-extrabold">{post.seller}</div>
          {/* mở: caption của người bán; thu gọn: tên món */}
          <div className="truncate text-sm">{open ? `“${desc}”` : name}</div>
        </div>
        {!open && (
          <span className="shrink-0 font-head text-lg font-extrabold text-[#ff8c5a]">{price}</span>
        )}
        <ChevronDown
          className={cn('size-5 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </div>
      {open && (
        <>
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
              {/* hashtag nghiêng, nằm trên cùng khối thông tin */}
              <div className="mb-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 italic">
                {tags.map((t) => (
                  <Tag
                    key={t}
                    tone={
                      t === 'Fs'
                        ? 'green'
                        : t === 'Price no offer'
                          ? 'red'
                          : t.startsWith('Nhanh gọn')
                            ? 'blue'
                            : 'yellow'
                    }
                    title={t === 'Fs' ? 'Fs = free ship, người bán chịu phí ship' : undefined}
                  >
                    #{t}
                  </Tag>
                ))}
              </div>
              <div className="font-head font-extrabold">{name}</div>
              <div>
                <s className="text-muted">{fmt(post.opt.price)}</s>{' '}
                <span className="font-head text-lg font-extrabold text-[#ff8c5a]">{price}</span>
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
        </>
      )}
      {inbox && <InboxChat post={post} onClose={() => setInbox(false)} />}
    </div>
  )
}
