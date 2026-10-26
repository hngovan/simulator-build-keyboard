import { Hand, Rotate3d, ScanEye } from 'lucide-react'
import { useGame } from '@/store'
import { IconButton } from '@/components/ui'
import { useBenchKey } from './useBenchKey'

const toggleCam = () => {
  const s = useGame.getState()
  s.setCamMode(s.camMode === 'pan' ? 'orbit' : 'pan')
}
const resetCam = () => useGame.getState().resetCam()

/** Nút đổi chuột trái: xoay ↔ kéo khung nhìn (bàn tay) + phím R; dùng ở bàn build lẫn bàn trống */
export function CamModeButton() {
  const camMode = useGame((s) => s.camMode)
  useBenchKey('KeyR', toggleCam)
  return (
    <IconButton
      tone={camMode === 'pan' ? 'green' : 'default'}
      icon={camMode === 'pan' ? <Hand /> : <Rotate3d />}
      label={camMode === 'pan' ? 'Đang kéo khung nhìn (R)' : 'Đang xoay khung nhìn (R)'}
      onClick={toggleCam}
    />
  )
}

/** Nút đưa camera về góc nhìn mặc định + phím Space */
export function ResetCamButton() {
  useBenchKey('Space', resetCam)
  return <IconButton icon={<ScanEye />} label="Góc nhìn mặc định (Space)" onClick={resetCam} />
}
