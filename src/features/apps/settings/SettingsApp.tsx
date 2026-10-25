import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Volume2, VolumeX } from 'lucide-react'
import { useGame } from '@/store'
import { Alert, Button, HudCard, Heading, Muted, Panel, Slider, Toggle } from '@/components/ui'
import { setDevMoney, useDevMoney } from './devMoney'

/** Hỏi lại trước khi phá sản (portal ra body để phủ cả màn hình, không bị khung cửa sổ cắt) */
function ConfirmBankrupt({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[3500] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <HudCard className="flex w-[460px] max-w-full flex-col gap-3">
        <h3 className="font-head text-xl font-extrabold text-yellow">🏳️ Tuyên bố phá sản?</h3>
        <Alert tone="yellow" title="99% người chơi dừng lại ngay trước khi thắng lớn">
          Đơn ngon có thể tới ngay ngày mai. Phá sản là xoá bản lưu, kết quả hiện tại được ghi lên
          bảng xếp hạng và không chơi tiếp được nữa.
        </Alert>
        <div className="flex justify-end gap-2">
          <Button tone="red" onClick={onConfirm}>
            Vẫn phá sản
          </Button>
          <Button tone="green" onClick={onCancel}>
            💪 Cố thêm chút nữa
          </Button>
        </div>
      </HudCard>
    </div>,
    document.body,
  )
}

/** Người chơi tự tuyên bố phá sản: kết thúc lượt chơi, gửi bảng xếp hạng */
function BankruptPanel() {
  const [asking, setAsking] = useState(false)
  return (
    <Panel>
      <Heading note="không hoàn tác được">Phá sản</Heading>
      <Muted>Đóng cửa xưởng, ghi kết quả lượt chơi lên bảng xếp hạng rồi chơi lại từ đầu.</Muted>
      <Button tone="red" wide onClick={() => setAsking(true)}>
        🏳️ Tuyên bố phá sản
      </Button>
      {asking && (
        <ConfirmBankrupt
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false)
            useGame.getState().endRun('bankrupt')
          }}
        />
      )}
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

/** Công cụ thử nghiệm, chỉ hiện khi chạy `bun run dev` */
function DevPanel() {
  const rich = useDevMoney((s) => s.on)
  return (
    <Panel>
      <Heading note="chỉ có khi dev">Dev</Heading>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-panel-2 px-3 py-2.5">
        <span className="font-bold">Tiền vô hạn</span>
        <Toggle checked={rich} onChange={setDevMoney} label="Tiền vô hạn" />
      </div>
      <Muted>Bật thì ví luôn đầy, tắt thì trả lại số tiền trước khi bật.</Muted>
    </Panel>
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
          Nhạc nền phát ngẫu nhiên 3 bài ở máy tính và bàn build. Muốn dùng bài riêng: chép đè
          public/audio/bgm.mp3, bgm-2.mp3 hoặc bgm-3.mp3.
        </Muted>
      </Panel>

      {import.meta.env.DEV && <DevPanel />}

      <Panel>
        <Heading>Phiên đăng nhập</Heading>
        <Muted>Tiến trình hiện tại đã được lưu tự động và không bị xoá.</Muted>
        <Button tone="red" wide onClick={returnToTitle}>
          ↩ Về màn hình đăng nhập
        </Button>
      </Panel>

      <BankruptPanel />
    </div>
  )
}
