import { useEffect } from 'react'
import { useGame } from '@/store'
import { useKeyboardTest } from '@/hooks/useKeyboardTest'
import { useAppShortcuts } from '@/hooks/useAppShortcuts'
import { Toasts } from '@/components/game/Toasts'
import { PerfHud } from '@/components/game/PerfHud'
import { GlobalTooltip } from '@/components/ui/GlobalTooltip'
import { ReviewPops } from '@/features/apps/reviews/ReviewPops'
import { GameOverDialog } from '@/features/gameover/GameOverDialog'
import { FreeBuildDialog } from '@/features/free/FreeBuildDialog'
import { BenchTour } from '@/features/guide/BenchTour'
import { PayTour } from '@/features/guide/PayTour'
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
import { applyAudioSettings, startBgm } from '@/sound'
import { TOUR_ID, Tour } from '@/features/guide/Tour'

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
  // tour hướng dẫn lần đầu ngồi máy tính (xong / bỏ qua thì ghi guideSeen)
  const tourSeen = useGame((s) => s.guideSeen.includes(TOUR_ID))
  const audio = useGame((s) => s.audio)
  // phòng 3D chưa tải xong lần đầu: chỉ hiện màn chờ, xong mới hiện NPC / thông báo
  const loading = useSceneLoading((s) => !s.settled) && (screen === 'pc' || screen === 'bench')
  // fast bid ở Hội Phím Cơ: bot ghé bid / bình luận, hết giờ thì chốt bán (kể cả khi không mở tab chợ)
  const hasBid = useGame((s) => s.listings.some((l) => l.bid))
  // Free build: bảng chọn case (lúc vào chế độ / ngồi vào bàn trống / bấm "Chọn case" ở bàn trống), chỉ khi đang ngồi ở bàn
  // build (đi lại trong phòng thì ẩn), chờ phòng tải xong mới hiện
  const freePick = useGame((s) => s.freePick && !s.walk) && !loading
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
    // nhạc nền phát mặc định ở mọi màn (cả màn tiêu đề), tắt bằng nút nhạc / cài đặt âm thanh (`musicOff`)
    startBgm(audio)
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
          {!tourSeen && !loading && !zooming && <Tour />}
          {/* đơn hướng dẫn đã gửi: chỉ chỗ thu tiền */}
          {tourSeen && !loading && !zooming && <PayTour />}
        </>
      )}
      {screen === 'bench' && (
        <>
          {/* HUD đi lại (số thùng ở hành lang, trạng thái) chỉ hiện khi đã tải xong: lúc còn tải màn chờ chỉ phủ mờ */}
          {!zooming &&
            (walk ? !loading && <RoomHud /> : hasBuild ? <BenchHud /> : <EmptyBenchHud />)}
          {/* Keeb-chan chỉ nằm trong tour: tour bàn build (đơn hướng dẫn) / lời dẫn lần đầu gặp bước */}
          {!zooming && !walk && !loading && <BenchTour />}
          <ShelfViewer />
          {calendar && <CalendarDialog />}
          <BenchLoader />
        </>
      )}
      <Toasts />
      <GlobalTooltip />
      <PerfHud />
      {!loading && (
        <>
          <ReviewPops />
          <PayBanner />
        </>
      )}
      {/* menu Cài đặt ngoài game (Esc) */}
      <GameOverDialog />
      {freePick && <FreeBuildDialog />}
    </>
  )
}
