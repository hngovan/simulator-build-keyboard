import { useEffect } from 'react'
import { Hand, Rotate3d, ScanEye } from 'lucide-react'
import { useGame } from '@/store'
import { IconButton } from '@/components/ui'

/**
 * Phím tắt camera (H đổi kéo / xoay, R về góc nhìn mặc định): bỏ qua khi đang gõ ô nhập
 * hoặc ở bước test (mọi phím là phím đang test)
 */
function useCamKey(code: string, run: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState()
      const typing = (e.target as HTMLElement | null)?.closest?.(
        'input, textarea, [contenteditable]',
      )
      const testing = !!s.build && s.step() === 'test'
      if (
        e.code === code &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.repeat &&
        !typing &&
        !testing
      )
        run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [code, run])
}

const toggleCam = () => {
  const s = useGame.getState()
  s.setCamMode(s.camMode === 'pan' ? 'orbit' : 'pan')
}
const resetCam = () => useGame.getState().resetCam()

/** Nút đổi chuột trái: xoay ↔ kéo khung nhìn (bàn tay) + phím H; dùng ở bàn build lẫn bàn trống */
export function CamModeButton() {
  const camMode = useGame((s) => s.camMode)
  useCamKey('KeyH', toggleCam)
  return (
    <IconButton
      tone={camMode === 'pan' ? 'green' : 'default'}
      icon={camMode === 'pan' ? <Hand /> : <Rotate3d />}
      label={camMode === 'pan' ? 'Đang kéo khung nhìn (H)' : 'Đang xoay khung nhìn (H)'}
      onClick={toggleCam}
    />
  )
}

/** Nút đưa camera về góc nhìn mặc định + phím R */
export function ResetCamButton() {
  useCamKey('KeyR', resetCam)
  return <IconButton icon={<ScanEye />} label="Góc nhìn mặc định (R)" onClick={resetCam} />
}
