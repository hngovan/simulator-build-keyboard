/** số avatar DiceBear Moods trong `public/avatars/moods/` (`bun run fetch:avatars`) */
export const AVATAR_COUNT = 24

/** đường dẫn avatar thứ `index` (đếm từ 0, quá số avatar thì quay vòng) */
export const avatarSrc = (index: number) =>
  `/avatars/moods/mood-${String((index % AVATAR_COUNT) + 1).padStart(2, '0')}.svg`

/** số avatar cố định theo tên (hash) */
export const avatarIndex = (name: string) =>
  [...name].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 0)
