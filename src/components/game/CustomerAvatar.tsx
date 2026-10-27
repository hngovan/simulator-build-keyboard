import { avatarIndex, avatarSrc } from '@/data/avatars'

/** Avatar ngẫu nhiên nhưng cố định theo tên (người chơi, người bán ở chợ...) */
export function NameAvatar({ name, className = 'size-11' }: { name: string; className?: string }) {
  return (
    <img
      src={avatarSrc(avatarIndex(name))}
      alt={`Avatar của ${name}`}
      className={`shrink-0 rounded-full bg-panel-2 object-cover ${className}`}
      loading="lazy"
    />
  )
}

/** Avatar khách: theo số trong `order.avatar` (save cũ `customer-NN` / emoji thì theo tên khách) */
export function CustomerAvatar({
  avatar,
  customer,
  className = 'size-11',
}: {
  avatar?: string
  customer: string
  className?: string
}) {
  const num = avatar?.startsWith('/avatars/') ? Number(avatar.match(/-(\d+)\.svg$/)?.[1]) : NaN
  return (
    <img
      src={num > 0 ? avatarSrc(num - 1) : avatarSrc(avatarIndex(customer))}
      alt={`Avatar của ${customer}`}
      className={`shrink-0 rounded-full bg-panel-2 object-cover ${className}`}
      loading="lazy"
    />
  )
}
