import { useEffect } from 'react'
import { useGame } from '@/store'
import { useKeyboardTest } from '@/hooks/useKeyboardTest'
import { Toasts } from '@/components/game/Toasts'
import { TitleScreen } from '@/features/title/TitleScreen'
import { Desktop } from '@/features/desktop/Desktop'
import { BenchHud } from '@/features/bench/BenchHud'
import { Bench } from '@/scene/Bench'
import { applyAudioSettings, startBgm, stopBgm } from '@/sound'

export default function App() {
  const screen = useGame((s) => s.screen)
  const hasBuild = useGame((s) => !!s.build)
  const audio = useGame((s) => s.audio)
  useKeyboardTest()
  useEffect(() => {
    applyAudioSettings(audio)
    if (screen === 'bench' && hasBuild) startBgm(audio)
    else stopBgm()
  }, [audio, hasBuild, screen])
  return (
    <>
      {screen === 'title' && <TitleScreen />}
      {screen === 'pc' && <Desktop />}
      {screen === 'bench' && hasBuild && (
        <>
          <Bench />
          <BenchHud />
        </>
      )}
      <Toasts />
    </>
  )
}
