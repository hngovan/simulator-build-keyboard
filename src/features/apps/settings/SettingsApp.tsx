import { useGame } from '@/store'
import { Button, Heading, Muted, Panel } from '@/components/ui'

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
      <input
        className="col-span-2 w-full accent-orange"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
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
        <label className="mb-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-panel-2 px-3 py-2.5">
          <span>
            <b>Tắt toàn bộ âm thanh</b>
            <Muted>Nhạc nền và hiệu ứng sẽ im lặng</Muted>
          </span>
          <input
            className="size-4 accent-orange"
            type="checkbox"
            checked={audio.muted}
            onChange={(event) => setAudio({ muted: event.target.checked })}
          />
        </label>
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
        <Muted>Nhạc nền chỉ phát khi bạn đang ở bàn build.</Muted>
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
