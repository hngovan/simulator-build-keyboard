import { create } from 'zustand'

// Trạng thái tải của cảnh 3D (không lưu): dùng cho màn hình chờ ở bàn build
interface SceneLoading {
  /** cảnh đã dựng xong lần đầu (môi trường + model đã tải) */
  ready: boolean
  /** số khối đang chờ tải model khi đổi bước */
  pending: number
  /** lần vào bàn build này đã tải xong hết (cả model bước đầu); chưa xong thì màn chờ phủ kín cả HUD */
  settled: boolean
}

export const useSceneLoading = create<SceneLoading>()(() => ({
  ready: false,
  pending: 0,
  settled: false,
}))

// đã dựng cảnh + không còn model chờ tải: coi như vào bàn xong, từ đó đổi bước chỉ phủ mờ
useSceneLoading.subscribe((s) => {
  if (s.ready && s.pending === 0 && !s.settled) useSceneLoading.setState({ settled: true })
})
