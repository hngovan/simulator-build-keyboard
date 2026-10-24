import { create } from 'zustand'

// Trạng thái tải của cảnh 3D (không lưu): dùng cho màn hình chờ ở bàn build
interface SceneLoading {
  /** cảnh đã dựng xong lần đầu (môi trường + model đã tải) */
  ready: boolean
  /** số khối đang chờ tải model khi đổi bước */
  pending: number
}

export const useSceneLoading = create<SceneLoading>()(() => ({ ready: false, pending: 0 }))
