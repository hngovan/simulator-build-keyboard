const AVATAR_COUNT = 10

function avatarIndex(customer: string) {
  return (
    [...customer].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 0) %
    AVATAR_COUNT
  )
}

/** Local, deterministic illustrated portrait; old saves with emoji map by customer name. */
export function CustomerAvatar({
  avatar,
  customer,
  className = 'size-11',
}: {
  avatar?: string
  customer: string
  className?: string
}) {
  const index = avatar?.startsWith('/avatars/customers/')
    ? Number(avatar.match(/customer-(\d+)/)?.[1] ?? 1) - 1
    : avatarIndex(customer)
  const src = `/avatars/customers/customer-${String((index % AVATAR_COUNT) + 1).padStart(2, '0')}.svg`
  return (
    <img
      src={src}
      alt={`Avatar của ${customer}`}
      className={`shrink-0 rounded-full bg-panel-2 object-cover ${className}`}
      loading="lazy"
    />
  )
}
