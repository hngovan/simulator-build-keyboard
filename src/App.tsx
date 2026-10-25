import { useEffect } from 'react'
import { useGame } from '@/store'
import { useKeyboardTest } from '@/hooks/useKeyboardTest'
import { Toasts } from '@/components/game/Toasts'
import { GlobalTooltip } from '@/components/ui/GlobalTooltip'
import { ReviewPops } from '@/features/apps/reviews/ReviewPops'
import { TitleScreen } from '@/features/title/TitleScreen'
import { Desktop } from '@/features/desktop/Desktop'
import { BenchHud } from '@/features/bench/BenchHud'
import { BenchLoader } from '@/features/bench/BenchLoader'
import { EmptyBenchHud } from '@/features/bench/EmptyBenchHud'
import { ShelfViewer } from '@/features/bench/ShelfViewer'
import { Bench } from '@/scene/Bench'
import { applyAudioSettings, startBgm, stopBgm } from '@/sound'

export default function App() {
  const screen = useGame((s) => s.screen)
  const hasBuild = useGame((s) => !!s.build)
  // đang bay camera vào màn hình máy tính: ẩn HUD cho thấy rõ màn hình
  const zooming = useGame((s) => s.pcZoom)
  const audio = useGame((s) => s.audio)
  useKeyboardTest()
  useEffect(() => {
    applyAudioSettings(audio)
    // nhạc nền ở cả máy tính lẫn bàn build (không phát ở màn hình tiêu đề)
    if (screen === 'pc' || screen === 'bench') startBgm(audio)
    else stopBgm()
  }, [audio, screen])
  return (
    <>
      {screen === 'title' && <TitleScreen />}
      {screen === 'pc' && <Desktop />}
      {screen === 'bench' && (
        <>
          <Bench />
          {!zooming && (hasBuild ? <BenchHud /> : <EmptyBenchHud />)}
          <ShelfViewer />
          <BenchLoader />
        </>
      )}
      <Toasts />
      <GlobalTooltip />
      <ReviewPops />
    </>
  )
}
