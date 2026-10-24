import type { ComponentProps } from 'react'
import { Text as DreiText } from '@react-three/drei'

/**
 * Font mặc định cho chữ 3D: Nunito (SIL OFL, có tiếng Việt) tải từ public/fonts.
 * Không có font thì troika tự tải font từ CDN (jsdelivr) — bị chặn khi chạy trong trang Artifact
 */
const DEFAULT_FONT = '/fonts/Nunito.ttf'

/** Chữ 3D (drei Text) luôn có font nội bộ */
export function Text({ font = DEFAULT_FONT, ...props }: ComponentProps<typeof DreiText>) {
  return <DreiText font={font} {...props} />
}
