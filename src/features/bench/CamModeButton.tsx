import { ScanEye } from 'lucide-react'
import { useGame } from '@/store'
import { IconButton } from '@/components/ui'
import { useBenchKey } from './useBenchKey'

const resetCam = () => useGame.getState().resetCam()

/** Nút đưa camera về góc nhìn mặc định + phím Space (camera bàn build xoay neo quanh tâm vật đang làm + zoom); dùng ở bàn build lẫn bàn trống */
export function ResetCamButton() {
  useBenchKey('Space', resetCam)
  return <IconButton icon={<ScanEye />} label="Góc nhìn mặc định (Space)" onClick={resetCam} />
}
