import { ScanEye } from 'lucide-react'
import { useGame } from '@/store'
import { IconButton } from '@/components/ui'
import { useBenchKey } from './useBenchKey'

const resetCam = () => useGame.getState().resetCam()

/**
 * Nút đưa camera về góc nhìn mặc định + phím Space (camera bàn build xoay neo quanh tâm vật đang làm + zoom); dùng ở bàn build lẫn bàn trống.
 * Bước test phím: Space là phím đang thử (`useBenchKey` bỏ qua, `useKeyboardTest` chặn mặc định) → chỉ bấm nút, tooltip ghi rõ
 */
export function ResetCamButton() {
  useBenchKey('Space', resetCam)
  const testing = useGame((s) => !!s.build && s.step() === 'test')
  return (
    <IconButton
      icon={<ScanEye />}
      label={
        testing
          ? 'Góc nhìn mặc định (đang test phím: Space là phím thử)'
          : 'Góc nhìn mặc định (Space)'
      }
      onClick={resetCam}
    />
  )
}
