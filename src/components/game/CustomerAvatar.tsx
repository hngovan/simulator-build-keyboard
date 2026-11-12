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
