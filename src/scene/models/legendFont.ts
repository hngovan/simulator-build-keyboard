import type { KeycapProfile } from '@/data/parts'

/**
 * Font chữ in trên keycap theo profile (font MIT của dakotafelder, `public/fonts/*-LICENSE.txt`):
 * - Cherry: Open Cherry (kiểu chữ GMK / Cherry doubleshot)
 * - DCS: Open Gorton thường (Gorton Modified của SP, kiểu bàn phím terminal Wyse)
 * - SA: Open Gorton đậm (chữ SP doubleshot SA dày, to nét)
 * Profile khác dùng Nunito như cũ. Các font này không có mũi tên → phím mũi tên vẫn in bằng Nunito
 */
const LEGEND_FONT: Partial<Record<KeycapProfile, { url: string; family: string }>> = {
  cherry: { url: '/fonts/OpenCherry-Regular.otf', family: 'Open Cherry' },
  dcs: { url: '/fonts/OpenGorton-Regular.otf', family: 'Open Gorton' },
  sa: { url: '/fonts/OpenGorton-Bold.otf', family: 'Open Gorton Bold' },
}

/** đường dẫn font cho chữ 3D (troika); undefined = font mặc định */
export const legendFontUrl = (profile: KeycapProfile) => LEGEND_FONT[profile]?.url

const loaded = new Map<string, Promise<string>>()

/** Nạp font vào trang (FontFace) để vẽ chữ trên canvas; trả về chuỗi font-family CSS (lỗi thì về Nunito) */
export function loadLegendFont(profile: KeycapProfile): Promise<string> {
  const f = LEGEND_FONT[profile]
  if (!f || typeof FontFace === 'undefined') return Promise.resolve('Nunito')
  let p = loaded.get(f.family)
  if (!p) {
    p = new FontFace(f.family, `url(${f.url})`)
      .load()
      .then((face) => {
        document.fonts.add(face)
        return `'${f.family}'`
      })
      .catch(() => 'Nunito')
    loaded.set(f.family, p)
  }
  return p
}
