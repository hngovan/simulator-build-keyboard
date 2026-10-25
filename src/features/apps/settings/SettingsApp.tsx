import { Volume2, VolumeX } from 'lucide-react'
import { useGame } from '@/store'
import { Button, Heading, Muted, Panel, Slider, Toggle } from '@/components/ui'

function VolumeRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 text-sm font-bold">
      <span>{label}</span>
      <span className="text-muted">{Math.round(value * 100)}%</span>
      <Slider
        className="col-span-2"
        value={value}
        onChange={onChange}
        aria-label={label}
        title={`Chỉnh âm lượng: ${label}`}
      />
    </label>
  )
}

/** Cài đặt cục bộ của KeebOS, bao gồm các kênh âm thanh. */
export function SettingsApp() {
  const audio = useGame((s) => s.audio)
  const { setAudio, returnToTitle } = useGame.getState()

  return (
    <div className="space-y-3">
      <Panel>
        <Heading note="lưu cùng tiến trình">Âm thanh</Heading>
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-panel-2 px-3 py-2.5">
          {/* icon loa đổi theo trạng thái tắt / bật */}
          <span className="flex items-center gap-2 font-bold [&_svg]:size-5">
            {audio.muted ? <VolumeX className="text-red" /> : <Volume2 className="text-green" />}
            Tắt toàn bộ âm thanh
          </span>
          <Toggle
            checked={audio.muted}
            onChange={(muted) => setAudio({ muted })}
            label="Tắt toàn bộ âm thanh"
          />
        </div>
        <div className={audio.muted ? 'pointer-events-none space-y-3 opacity-45' : 'space-y-3'}>
          <VolumeRow
            label="Nhạc nền bàn build"
            value={audio.musicVolume}
            onChange={(musicVolume) => setAudio({ musicVolume })}
          />
          <VolumeRow
            label="Hiệu ứng thao tác"
            value={audio.effectsVolume}
            onChange={(effectsVolume) => setAudio({ effectsVolume })}
          />
        </div>
        <Muted>
          Nhạc nền phát ở máy tính và bàn build. Muốn dùng bài riêng: chép file vào
          public/audio/bgm.mp3.
        </Muted>
      </Panel>

      <Panel>
        <Heading>Phiên đăng nhập</Heading>
        <Muted>Tiến trình hiện tại đã được lưu tự động và không bị xoá.</Muted>
        <Button tone="red" wide onClick={returnToTitle}>
          ↩ Về màn hình đăng nhập
        </Button>
      </Panel>
    </div>
  )
}
