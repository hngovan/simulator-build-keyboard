import { useEffect } from 'react'
import { useGame } from '@/store'
import { useKeyboardTest } from '@/hooks/useKeyboardTest'
import { useAppShortcuts } from '@/hooks/useAppShortcuts'
import { Toasts } from '@/components/game/Toasts'
import { GlobalTooltip } from '@/components/ui/GlobalTooltip'
import { ReviewPops } from '@/features/apps/reviews/ReviewPops'
import { GameOverDialog } from '@/features/gameover/GameOverDialog'
import { GuideNpc } from '@/features/guide/GuideNpc'
import { BenchDialog } from '@/features/guide/BenchDialog'
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
  // fast bid ở Hội Phím Cơ: bot ghé bid / bình luận, hết giờ thì chốt bán (kể cả khi không mở tab chợ)
  const hasBid = useGame((s) => s.listings.some((l) => l.bid))
  useEffect(() => {
    if (!hasBid) return
    const t = setInterval(() => {
      useGame.getState().bidVisit()
      useGame.getState().settleBids()
    }, 1000)
    return () => clearInterval(t)
  }, [hasBid])
  useKeyboardTest()
  useAppShortcuts()
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
          {!zooming && <BenchDialog />}
          <ShelfViewer />
          <BenchLoader />
        </>
      )}
      <Toasts />
      <GlobalTooltip />
      <ReviewPops />
      {!zooming && <GuideNpc />}
      <GameOverDialog />
    </>
  )
}
