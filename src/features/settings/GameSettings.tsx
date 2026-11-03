import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FlaskConical,
  Gamepad2,
  Keyboard,
  Monitor,
  Settings,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react'
import { useGame } from '@/store'
import { Button, CloseButton, HudCard, Muted, Slider, TabChip, Toggle } from '@/components/ui'
import { KeyCap, MouseIcon } from '@/components/game/ControlsHint'
import { OddsDialog } from '@/features/guide/OddsDialog'
import { cn } from '@/lib/format'
import { setPerfHud, usePerfHud } from '@/lib/perfStats'
import { closeSettings, useSettingsMenu, type SettingsTab } from '@/lib/settingsMenu'
import { setDevMoney, useDevMoney } from '@/features/apps/settings/devMoney'
import { DevBuildDialog } from '@/features/apps/settings/DevBuildDialog'
import { Row, Section } from './SettingsParts'

/** Hỏi có lưu tiến trình lên bảng xếp hạng trước khi về màn hình đăng nhập không */
function ConfirmExit({ onCancel }: { onCancel: () => void }) {
  const [saving, setSaving] = useState(false)
  const exit = () => (onCancel(), closeSettings(), useGame.getState().returnToTitle())
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

/** Tab Trò chơi: lưu tiến trình, bảng tỉ lệ, về màn hình đăng nhập (hướng dẫn chọn 1 lần lúc tạo game: người chơi mới / đã từng chơi) */
function GameTab() {
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [odds, setOdds] = useState(false)
  return (
    <>
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
      <Section title="Tỉ lệ" info="Tỉ lệ may rủi ở chợ, bán phím khách, hàn, test, đơn hàng">
        {/* bảng tỉ lệ (chợ, bán phím khách, hàn, test, đơn hàng): trước mở từ Keeb-chan ở máy tính */}
        <Row>
          <span className="flex-1 font-bold">Bảng tỉ lệ may rủi</span>
          <Button size="sm" onClick={() => setOdds(true)}>
            Xem
          </Button>
        </Row>
        {odds && <OddsDialog onClose={() => setOdds(false)} />}
      </Section>
      <Section title="Phiên đăng nhập" info="Tiến trình đã tự lưu trong máy, không bị xoá">
        <Row>
          <Button
            tone="red"
            className="flex-1"
            // tiến trình mới chưa lên bảng xếp hạng thì hỏi có lưu không
            onClick={() =>
              useGame.getState().unsynced()
                ? setExiting(true)
                : (closeSettings(), useGame.getState().returnToTitle())
            }
          >
            ↩ Về màn hình đăng nhập
          </Button>
        </Row>
        {exiting && <ConfirmExit onCancel={() => setExiting(false)} />}
      </Section>
    </>
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

function AudioTab() {
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
        <Row>
          <span className="flex-1 font-bold">Bật nhạc nền</span>
          <Toggle
            checked={!audio.musicOff}
            onChange={(on) => setAudio({ musicOff: !on })}
            label="Bật nhạc nền"
          />
        </Row>
        <div className={cn(audio.musicOff && 'pointer-events-none opacity-45')}>
          <VolumeRow
            label="Âm lượng nhạc nền"
            value={audio.musicVolume}
            onChange={(musicVolume) => setAudio({ musicVolume })}
          />
        </div>
        <VolumeRow
          label="Hiệu ứng thao tác"
          value={audio.effectsVolume}
          onChange={(effectsVolume) => setAudio({ effectsVolume })}
        />
      </div>
    </Section>
  )
}

/** 1 phím / nút chuột: chuỗi = keycap, 'left' / 'right' / 'wheel' = hình chuột */
type Bind = string | { mouse: 'left' | 'right' | 'wheel' }

/** Phím tắt cố định (chưa cho đổi): nhóm → [việc, phím] */
const KEYBINDS: [string, [string, Bind[]][]][] = [
  [
    'Chung',
    [
      ['Mở / đóng Cài đặt', ['Esc']],
      ['Hoàn tác', ['Ctrl', 'Z']],
    ],
  ],
  [
    'Đi lại trong phòng',
    [
      ['Di chuyển', ['W', 'A', 'S', 'D']],
      ['Nhìn quanh (kéo)', [{ mouse: 'left' }]],
      ['Phóng to / thu nhỏ', [{ mouse: 'wheel' }]],
      ['Dùng đồ vật / cầm thùng', [{ mouse: 'left' }]],
    ],
  ],
  [
    'Bàn build',
    [
      ['Mở thùng đơn / bắt đầu build (bấm vào thùng)', [{ mouse: 'left' }]],
      ['Cầm thùng trên bàn lên', [{ mouse: 'right' }]],
      ['Lật xem đáy / lật lại', ['Q']],
      ['Về góc nhìn mặc định', ['Space']],
      ['Chọn đầu vít', ['1', '2', '3', '4']],
    ],
  ],
]

function KeysTab() {
  return (
    <>
      {KEYBINDS.map(([group, rows]) => (
        <Section key={group} title={group}>
          {rows.map(([label, binds]) => (
            <Row key={label} className="py-1.5">
              <span className="flex-1 font-bold">{label}</span>
              <span className="flex items-center gap-1">
                {binds.map((b, i) =>
                  typeof b === 'string' ? (
                    <KeyCap key={i}>{b}</KeyCap>
                  ) : (
                    <MouseIcon key={i} btn={b.mouse} />
                  ),
                )}
              </span>
            </Row>
          ))}
        </Section>
      ))}
      <Muted className="px-2 text-xs">
        Bước test phím: mọi phím (kể cả Esc, Space) là phím đang thử.
      </Muted>
    </>
  )
}

/** Khung thông số hiệu năng góc phải (lưu theo máy, không theo lượt chơi) */
function DisplayTab() {
  const perf = usePerfHud((s) => s.on)
  return (
    <Section
      title="Hiển thị"
      info="Trình duyệt không đọc được CPU / GPU cả máy: chỉ đo riêng tab game (GPU, RAM cần Chrome / Edge). Lưu theo máy này"
    >
      <Row>
        <span className="flex-1 font-bold">Hiện FPS, CPU, GPU, RAM</span>
        <Toggle checked={perf} onChange={setPerfHud} label="Hiện thông số hiệu năng" />
      </Row>
    </Section>
  )
}

/** Công cụ thử nghiệm, chỉ hiện khi chạy `bun run dev` */
function DevTab() {
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
      {testing && (
        <DevBuildDialog
          onClose={() => {
            setTesting(false)
            closeSettings()
          }}
        />
      )}
    </Section>
  )
}

const TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: 'game', label: 'Trò chơi', icon: Gamepad2 },
  { id: 'audio', label: 'Âm thanh', icon: Volume2 },
  { id: 'keys', label: 'Phím tắt', icon: Keyboard },
  { id: 'display', label: 'Hiển thị', icon: Monitor },
  ...(import.meta.env.DEV ? [{ id: 'dev' as const, label: 'Dev', icon: FlaskConical }] : []),
]

/**
 * Menu Cài đặt ngoài game (Esc mở / đóng ở máy tính, bàn build, đi lại): tab Trò chơi (lưu tiến trình, hướng dẫn,
 * đăng xuất) / Âm thanh / Phím tắt (cố định, chỉ xem) / Hiển thị / Dev. Cài đặt trong máy tính chỉ còn hình nền
 */
export function GameSettings() {
  const open = useSettingsMenu((m) => m.open)
  const tab = useSettingsMenu((m) => m.tab)
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[3200] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && closeSettings()}
    >
      <HudCard className="flex max-h-[calc(100dvh-32px)] w-[min(560px,100%)] flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-yellow text-[#3a2b00]">
            <Settings className="size-5" strokeWidth={2.5} />
          </span>
          <h2 className="flex-1 font-head text-2xl font-extrabold text-yellow">Cài đặt</h2>
          <CloseButton onClick={closeSettings} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <TabChip
              key={t.id}
              active={tab === t.id}
              icon={t.icon}
              onClick={() => useSettingsMenu.setState({ tab: t.id })}
            >
              {t.label}
            </TabChip>
          ))}
        </div>
        <div className="-mr-1 flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          {tab === 'game' && <GameTab />}
          {tab === 'audio' && <AudioTab />}
          {tab === 'keys' && <KeysTab />}
          {tab === 'display' && <DisplayTab />}
          {tab === 'dev' && import.meta.env.DEV && <DevTab />}
        </div>
      </HudCard>
    </div>
  )
}
