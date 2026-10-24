import { useGame } from '@/store'
import { useState } from 'react'
import { Button, Heading, Muted, Panel, Toggle } from '@/components/ui'
import { CREDITS } from '@/data/credits'

/** Ghi công model / texture bên thứ ba (bấm để mở danh sách) */
function CreditsPanel() {
  const [open, setOpen] = useState(false)
  return (
    <Panel>
      <Heading note="model & texture bên thứ ba">Ghi công</Heading>
      {open ? (
        <div className="space-y-3 text-xs">
          {CREDITS.map((g) => (
            <div key={g.title}>
              <b className="text-sm">{g.title}</b>
              <ul className="mt-1 space-y-1">
                {g.items.map((c) => (
                  <li key={c.what} className="leading-snug">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline"
                    >
                      {c.what}
                    </a>{' '}
                    — {c.author} ·{' '}
                    {c.licenseFile ? (
                      <a
                        href={`/licenses/${c.licenseFile}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow underline"
                      >
                        {c.license}
                      </a>
                    ) : (
                      <span className="text-yellow">{c.license}</span>
                    )}
                    {c.note && <span className="text-muted"> · {c.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Muted>
            Bản đầy đủ:{' '}
            <a href="/CREDITS.md" target="_blank" rel="noreferrer" className="underline">
              CREDITS.md
            </a>
          </Muted>
        </div>
      ) : (
        <Muted>
          Danh sách tác giả và giấy phép của các model CAD, đồ nội thất, texture trong game.
        </Muted>
      )}
      <Button wide onClick={() => setOpen(!open)}>
        {open ? 'Thu gọn' : '📜 Xem ghi công'}
      </Button>
    </Panel>
  )
}

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
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-panel-2 px-3 py-2.5">
          <span>
            <b>Tắt toàn bộ âm thanh</b>
            <Muted>Nhạc nền và hiệu ứng sẽ im lặng</Muted>
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

      <CreditsPanel />

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
