import { create } from 'zustand'

/** Khoá camera bàn build (không xoay / kéo / zoom) khi đang giữ chuột thao tác, vd giữ mỏ hàn trên chân switch */
export const useCamLock = create<{ locked: boolean }>(() => ({ locked: false }))
