import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, Volume2, VolumeX } from 'lucide-react'
import { useGame } from '@/store'
import { Button, HudCard, Muted, Slider, Toggle } from '@/components/ui'
import { cn } from '@/lib/format'
import { Wallpaper } from '@/features/desktop/Wallpaper'
import { WALLPAPERS, WALLPAPER_IDS, wallpaperOf } from '@/features/desktop/wallpapers'
import { setDevMoney, useDevMoney } from './devMoney'
import { DevBuildDialog } from './DevBuildDialog'

/** Hỏi có lưu tiến trình lên bảng xếp hạng trước khi về màn hình đăng nhập không */
function ConfirmExit({ onCancel }: { onCancel: () => void }) {
  const [saving, setSaving] = useState(false)
  const exit = () => (onCancel(), useGame.getState().returnToTitle())
  return createPortal(
    <div
      className="fixed inset-0 z-[3500] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <HudCard className="flex w-[min(460px,100%)] flex-col gap-3">
        <h3 className="font-head text-xl font-extrabold text-yellow">
          💾 Lưu tiến trình trước khi thoát?
        </h3>
        <Muted className="text-sm">
          Tiến trình mới chưa được ghi lên bảng xếp hạng. Bản lưu trong máy vẫn còn, vào lại chơi
          tiếp được.
        </Muted>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onCancel}>Ở lại</Button>
          <Button tone="red" onClick={exit}>
            Thoát không lưu
          </Button>
          <Button
            tone="green"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await useGame.getState().saveRun()
              exit()
            }}
          >
            {saving ? 'Đang lưu...' : '💾 Lưu & thoát'}
          </Button>
        </div>
      </HudCard>
    </div>,
    document.body,
  )
}

/** Khối 1 nhóm cài đặt (khuôn bảng xếp hạng): hàng tiêu đề chữ xám + ⓘ bên phải, các dòng `bg-panel-2` */
function Section({ title, info, children }: { title: string; info?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-black/15 p-1.5">
      <div className="flex items-center gap-3 px-3 pt-1 pb-2 text-[13px] font-bold text-muted">
        <div className="flex-1">{title}</div>
        {info && (
          <span title={info} className="shrink-0 hover:text-ink">
            <CircleAlert className="size-4" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

/** Dòng trong khối: chữ trái, điều khiển / giá trị phải */
function Row({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2.5', className)}>
      {children}
    </div>
  )
}

/** Trên cùng Cài đặt: lưu tiến trình lên bảng xếp hạng */
function ProgressPanel() {
  const [saving, setSaving] = useState(false)
  return (
    <Section
      title="Tiến trình"
      info="Ghi tiến trình hiện tại lên bảng xếp hạng, chơi tiếp bình thường"
    >
      <Row>
        <Button
          tone="green"
          className="flex-1"
          disabled={saving}
          title="Ghi tiến trình hiện tại lên bảng xếp hạng"
          onClick={async () => {
            setSaving(true)
            await useGame.getState().saveRun()
            setSaving(false)
          }}
        >
          {saving ? 'Đang lưu...' : 'Lưu tiến trình'}
        </Button>
      </Row>
    </Section>
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
    <Row className="flex-col items-stretch gap-1.5">
      <div className="flex items-center justify-between gap-3 font-bold">
        <span>{label}</span>
        <span className="font-head text-lg text-green">{Math.round(value * 100)}%</span>
      </div>
      <Slider
        value={value}
        onChange={onChange}
        aria-label={label}
        title={`Chỉnh âm lượng: ${label}`}
      />
    </Row>
  )
}

function AudioPanel() {
  const audio = useGame((s) => s.audio)
  const { setAudio } = useGame.getState()
  return (
    <Section
      title="Âm thanh"
      info="Nhạc nền phát ngẫu nhiên 3 bài. Muốn dùng bài riêng: chép đè public/audio/bgm.mp3, bgm-2.mp3 hoặc bgm-3.mp3"
    >
      <Row>
        {/* icon loa đổi theo trạng thái tắt / bật */}
        <span className="flex flex-1 items-center gap-2 font-bold [&_svg]:size-5">
          {audio.muted ? <VolumeX className="text-red" /> : <Volume2 className="text-green" />}
          Tắt toàn bộ âm thanh
        </span>
        <Toggle
          checked={audio.muted}
          onChange={(muted) => setAudio({ muted })}
          label="Tắt toàn bộ âm thanh"
        />
      </Row>
      <div className={cn('flex flex-col gap-1.5', audio.muted && 'pointer-events-none opacity-45')}>
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
    </Section>
  )
}

/** Đổi hình nền desktop: ô xem trước thu nhỏ (vẽ cỡ 800×450 rồi scale, không ghi tên, tên ở tooltip), đang chọn viền vàng */
function WallpaperPanel() {
  const current = useGame((s) => s.wallpaper)
  return (
    <Section title="Hình nền" info="Lưu cùng tiến trình">
      <div className="grid grid-cols-3 gap-1.5">
        {WALLPAPER_IDS.map((id) => {
          const active = id === wallpaperOf(current)
          return (
            <button
              key={id}
              title={`Đặt hình nền: ${WALLPAPERS[id]}`}
              onClick={() => useGame.setState({ wallpaper: id })}
              className={cn(
                'rounded-xl p-1.5 transition-colors',
                active
                  ? 'bg-[#3a3418] ring-2 ring-yellow ring-inset'
                  : 'bg-panel-2 hover:bg-[#323d52]',
              )}
            >
              <span className="relative block aspect-video w-full overflow-hidden rounded-lg">
                <span className="pointer-events-none absolute top-0 left-0 h-[450px] w-[800px] origin-top-left scale-[0.16]">
                  <Wallpaper id={id} />
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

/** Bật / tắt NPC Keeb-chan (mẹo ở máy tính + hội thoại bàn build) */
function GuidePanel() {
  const shown = useGame((s) => !s.guideHidden)
  return (
    <Section title="Hướng dẫn" info="Lưu cùng tiến trình">
      <Row>
        <span className="flex-1 font-bold">Hiện Keeb-chan</span>
        <Toggle
          checked={shown}
          onChange={(on) => useGame.setState({ guideHidden: !on })}
          label="Hiện Keeb-chan"
        />
      </Row>
    </Section>
  )
}

/** Công cụ thử nghiệm, chỉ hiện khi chạy `bun run dev` */
function DevPanel() {
  const rich = useDevMoney((s) => s.on)
  const [testing, setTesting] = useState(false)
  return (
    <Section
      title="Dev"
      info="Chỉ có khi dev: tiền vô hạn (tắt thì trả lại tiền cũ), build thử mọi case không cần đơn"
    >
      <Row>
        <span className="flex-1 font-bold">Tiền vô hạn</span>
        <Toggle checked={rich} onChange={setDevMoney} label="Tiền vô hạn" />
      </Row>
      <Row>
        <span className="flex-1 font-bold">Build thử mọi case + màu</span>
        <Button size="sm" tone="blue" onClick={() => setTesting(true)}>
          🧪 Chọn case
        </Button>
      </Row>
      {testing && <DevBuildDialog onClose={() => setTesting(false)} />}
    </Section>
  )
}

/** Cài đặt cục bộ của KeebOS (khuôn bảng xếp hạng: các khối nhóm, không có đầu app) */
export function SettingsApp() {
  const { returnToTitle } = useGame.getState()
  const [exiting, setExiting] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <ProgressPanel />
      <AudioPanel />
      <WallpaperPanel />
      <GuidePanel />
      {import.meta.env.DEV && <DevPanel />}

      <Section title="Phiên đăng nhập" info="Tiến trình đã tự lưu trong máy, không bị xoá">
        <Row>
          <Button
            tone="red"
            className="flex-1"
            // tiến trình mới chưa lên bảng xếp hạng thì hỏi có lưu không
            onClick={() => (useGame.getState().unsynced() ? setExiting(true) : returnToTitle())}
          >
            ↩ Về màn hình đăng nhập
          </Button>
        </Row>
        {exiting && <ConfirmExit onCancel={() => setExiting(false)} />}
      </Section>
    </div>
  )
}
