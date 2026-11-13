import { create } from 'zustand'

/** góc nhìn dọc (độ) khi đi lại trong phòng, lưu theo máy. Ngồi bàn build / máy tính vẫn dùng góc nhìn gốc của camera */
const KEY = 'sbk-walk-fov'
export const FOV_MIN = 30
export const FOV_MAX = 120
/** mặc định rộng hơn góc gốc 42° (hẹp như ống kính 50mm, đi lại dễ chóng mặt) */
export const FOV_DEFAULT = 60

function read() {
  try {
    const v = Number(localStorage.getItem(KEY))
    return v >= FOV_MIN && v <= FOV_MAX ? v : FOV_DEFAULT
  } catch {
    return FOV_DEFAULT
  }
}

export const useFov = create(() => ({ fov: read() }))

export function setFov(fov: number) {
  useFov.setState({ fov })
  try {
    localStorage.setItem(KEY, String(fov))
  } catch {
    // không lưu được thì chỉ giữ trong phiên này
  }
}
