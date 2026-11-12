// Thời tiết giả theo ngày chơi (chỉ trang trí): taskbar máy tính + ảnh trên màn hình 3D dùng chung

/** các kiểu thời tiết: màu icon + tên + khoảng nhiệt độ (°C); `sun` = có mặt trời (màn hình 3D vẽ chấm tròn, còn lại vẽ mây) */
export const WEATHERS = [
  { id: 'sun', color: '#ffcc2e', name: 'Nắng đẹp', temp: [30, 35], sun: true },
  { id: 'cloudSun', color: '#ffcc2e', name: 'Nắng nhẹ', temp: [27, 32], sun: true },
  { id: 'cloud', color: '#c3cbdb', name: 'Nhiều mây', temp: [25, 29], sun: false },
  { id: 'drizzle', color: '#7fb0ff', name: 'Mưa phùn', temp: [22, 26], sun: false },
  { id: 'rain', color: '#7fb0ff', name: 'Mưa rào', temp: [23, 27], sun: false },
  { id: 'storm', color: '#b3a1ff', name: 'Mưa dông', temp: [24, 28], sun: false },
] as const

export type WeatherId = (typeof WEATHERS)[number]['id']

/** số giả ngẫu nhiên cố định theo ngày chơi (cùng ngày luôn ra cùng thời tiết) */
const dayRand = (day: number, salt: number) => {
  const x = Math.sin(day * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** thời tiết + nhiệt độ của ngày chơi */
export function weatherOf(day: number) {
  const w = WEATHERS[Math.floor(dayRand(day, 1) * WEATHERS.length)]
  return { ...w, temp: Math.round(w.temp[0] + dayRand(day, 2) * (w.temp[1] - w.temp[0])) }
}
