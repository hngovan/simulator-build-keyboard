// Danh sách hình nền desktop (hình vẽ ở Wallpaper.tsx), lưu id trong Profile.wallpaper
export const WALLPAPERS = {
  aurora: 'Cực quang',
  sunset: 'Hoàng hôn',
  keys: 'Bàn phím',
} as const

export type WallpaperId = keyof typeof WALLPAPERS
export const WALLPAPER_IDS = Object.keys(WALLPAPERS) as WallpaperId[]

/** id hợp lệ (bản lưu cũ / id lạ thì về mặc định) */
export const wallpaperOf = (id: string): WallpaperId =>
  id in WALLPAPERS ? (id as WallpaperId) : 'aurora'
