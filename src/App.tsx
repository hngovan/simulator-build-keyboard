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
import { RoomHud } from '@/features/room/RoomHud'
import { CalendarDialog } from '@/features/room/CalendarDialog'
import { useRoom } from '@/scene/room/roomStore'
import { ShelfViewer } from '@/features/bench/ShelfViewer'
import { Bench } from '@/scene/Bench'
import { PayBanner } from '@/components/game/PayBanner'
import { onBench } from '@/store/carrySlice'
import { useSceneLoading } from '@/scene/common/loadingStore'
import { applyAudioSettings, startBgm, stopBgm } from '@/sound'

export default function App() {
  const screen = useGame((s) => s.screen)
  // đang build đơn có thùng trên bàn: HUD bàn build; còn lại (bàn trống / thùng chờ) HUD bàn trống
  const hasBuild = useGame((s) => !!s.build && onBench(s))
  // đang bay camera vào màn hình máy tính: ẩn HUD cho thấy rõ màn hình
  const zooming = useGame((s) => s.pcZoom)
  // đang đi lại trong phòng (không ngồi ở bàn build)
  const walk = useGame((s) => s.walk)
  // bấm lịch treo tường (đi lại hay ngồi bàn build đều mở được)
  const calendar = useRoom((r) => r.calendar)
  const guide = useGame((s) => !s.guideHidden)
  const audio = useGame((s) => s.audio)
  // phòng 3D chưa tải xong lần đầu: chỉ hiện màn chờ, xong mới hiện NPC / thông báo
  const loading = useSceneLoading((s) => !s.settled) && (screen === 'pc' || screen === 'bench')
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
      {/* phòng 3D dựng cả lúc ngồi máy tính: làm nền quanh khung desktop (camera đứng yên nhìn màn hình) */}
      {(screen === 'bench' || screen === 'pc') && <Bench />}
      {screen === 'pc' && (
        <>
          <Desktop />
          <BenchLoader />
        </>
      )}
      {screen === 'bench' && (
        <>
          {!zooming && (walk ? <RoomHud /> : hasBuild ? <BenchHud /> : <EmptyBenchHud />)}
          {!zooming && !walk && guide && !loading && <BenchDialog />}
          <ShelfViewer />
          {calendar && <CalendarDialog />}
          <BenchLoader />
        </>
      )}
      <Toasts />
      <GlobalTooltip />
      {!loading && (
        <>
          <ReviewPops />
          <PayBanner />
          {!zooming && guide && <GuideNpc />}
        </>
      )}
      <GameOverDialog />
    </>
  )
}
