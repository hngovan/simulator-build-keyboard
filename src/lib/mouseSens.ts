import { create } from 'zustand'

/** độ nhạy chuột khi đi lại trong phòng (hệ số nhân tốc độ xoay nhìn), lưu theo máy */
const KEY = 'sbk-mouse-sens'
export const SENS_MIN = 0.1
export const SENS_MAX = 2
/** mặc định chậm hơn bản cũ (1 = tốc độ cũ, xoay nhanh dễ chóng mặt) */
export const SENS_DEFAULT = 0.8

function read() {
  try {
    const v = Number(localStorage.getItem(KEY))
    return v >= SENS_MIN && v <= SENS_MAX ? v : SENS_DEFAULT
  } catch {
    return SENS_DEFAULT
  }
}

export const useMouseSens = create(() => ({ sens: read() }))

export function setMouseSens(sens: number) {
  useMouseSens.setState({ sens })
  try {
    localStorage.setItem(KEY, String(sens))
  } catch {
    // không lưu được thì chỉ giữ trong phiên này
  }
}
