import { avatarIndex } from '@/data/avatars'
import { cn } from '@/lib/format'

/** nền pastel của avatar, cố định theo tên khách */
const COLORS = ['#aee3f5', '#ffc9d6', '#c9b8f0', '#ffe0a3', '#b8ecc9', '#ffd0b0']

/** nét miệng theo tâm trạng (khung 40 × 40) */
const MOUTHS = {
  smile: 'M15 25q5 4 10 0',
  flat: 'M15 24.5h10',
  happy: 'M14 23q6 6.5 12 0',
  sad: 'M15 26.5q5 -4 10 0',
} as const

export type Mood = keyof typeof MOUTHS

/** Avatar khách (Mezzenger, Danh sách đơn, Đánh giá): hình tròn pastel + mặt nét đơn (2 mắt gạch, miệng theo tâm trạng) */
export function FaceAvatar({
  name,
  mood = 'smile',
  className = 'size-10',
}: {
  name: string
  mood?: Mood
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Avatar của ${name}`}
      className={cn('shrink-0 rounded-full', className)}
      style={{ background: COLORS[avatarIndex(name) % COLORS.length] }}
      fill="none"
      stroke="#1b2130"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M13 16.5h4M23 16.5h4" />
      <path d={MOUTHS[mood]} />
    </svg>
  )
}
