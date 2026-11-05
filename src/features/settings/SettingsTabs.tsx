import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Volume2, VolumeX } from 'lucide-react'
import { useGame } from '@/store'
import type { RunEndReason } from '@/lib/leaderboardApi'
import { Button, HudCard, Muted, Slider, Toggle } from '@/components/ui'
import { KeyCap, MouseIcon } from '@/components/game/ControlsHint'
import { cn } from '@/lib/format'
import { setPerfHud, usePerfHud } from '@/lib/perfStats'
import {
  setDevMoney,
  setDevSpells,
  setDevUnlock,
  useDevMoney,
  useDevSpells,
  useDevUnlock,
} from '@/features/apps/settings/devMoney'
import { DevBuildDialog } from '@/features/apps/settings/DevBuildDialog'
import { Row, Section } from './SettingsParts'

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

/** Tab Chung: lưu tiến trình, `children` (hình nền), về màn hình đăng nhập (hướng dẫn chọn 1 lần lúc tạo game: người chơi mới / đã từng chơi) */
export function GameTab({ children }: { children?: ReactNode }) {
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)
  // Free build không lưu / không lên bảng xếp hạng
  const free = useGame((s) => s.free)
  return (
    <>
      {!free && (
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
      )}
      {children}
      <Section title="Phiên đăng nhập" info="Tiến trình đã tự lưu trong máy, không bị xoá">
        <Row>
          <Button
            tone="red"
            className="flex-1"
            // tiến trình mới chưa lên bảng xếp hạng thì hỏi có lưu không
            onClick={() =>
              useGame.getState().unsynced() ? setExiting(true) : useGame.getState().returnToTitle()
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

export function AudioTab() {
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

/** 1 phím / nút chuột: chuỗi = keycap ('+' = dấu cộng, bấm cùng lúc), 'left' / 'right' / 'wheel' = hình chuột */
type Bind = string | { mouse: 'left' | 'right' | 'wheel' }

/** Phím tắt cố định (chưa cho đổi): nhóm → [việc, phím] */
const KEYBINDS: [string, [string, Bind[]][]][] = [
  [
    'Chung',
    [
      ['Quay lại / đứng dậy', ['Esc']],
      ['Hoàn tác', ['Ctrl', '+', 'Z']],
    ],
  ],
  [
    'Đi lại trong phòng',
    [
      ['Di chuyển', ['W', 'A', 'S', 'D']],
      ['Nhìn quanh (kéo)', [{ mouse: 'left' }]],
      ['Phóng to / thu nhỏ', [{ mouse: 'wheel' }]],
      ['Tương tác với đồ vật', [{ mouse: 'left' }]],
    ],
  ],
  [
    'Bàn build',
    [
      ['Tương tác với đồ vật', [{ mouse: 'left' }]],
      ['Xoay góc nhìn (kéo)', [{ mouse: 'left' }]],
      ['Trượt khung nhìn (kéo)', ['Shift', '+', { mouse: 'left' }]],
      ['Phóng to / thu nhỏ', [{ mouse: 'wheel' }]],
      ['Lật xem đáy / lật lại', ['Q']],
      ['Về góc nhìn mặc định', ['Space']],
      ['Chọn đầu vít', ['1', '2', '3', '4']],
    ],
  ],
]

export function KeysTab() {
  return (
    <>
      {KEYBINDS.map(([group, rows]) => (
        <Section key={group} title={group}>
          {rows.map(([label, binds]) => (
            <Row key={label} className="py-1.5">
              <span className="flex-1 font-bold">{label}</span>
              <span className="flex items-center gap-1">
                {binds.map((b, i) =>
                  b === '+' ? (
                    <span key={i} className="font-head font-bold text-muted">
                      +
                    </span>
                  ) : typeof b === 'string' ? (
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

/** Công cụ thử nghiệm, chỉ hiện khi chạy `bun run dev` */
/** các lý do thua để dev xem thử popup (`previewGameOver`) */
const LOSS_PREVIEW: [RunEndReason, string][] = [
  ['rep', 'Phốt'],
  ['money', 'Cạn vốn'],
]

export function DevTab() {
  const rich = useDevMoney((s) => s.on)
  const unlock = useDevUnlock((s) => s.on)
  const spells = useDevSpells((s) => s.on)
  const perf = usePerfHud((s) => s.on)
  const [testing, setTesting] = useState(false)
  return (
    <Section
      title="Dev"
      info="Chỉ có khi dev: tiền vô hạn (tắt thì trả lại tiền cũ), sách phép vô hạn (tắt = làm từng con, trả lại lượt cũ), Shopii mở khoá mọi món, build thử mọi case không cần đơn, thông số hiệu năng (kéo khung sang góc khác), xem thử màn thua game"
    >
      <Row>
        <span className="flex-1 font-bold">Tiền vô hạn</span>
        <Toggle checked={rich} onChange={setDevMoney} label="Tiền vô hạn" />
      </Row>
      <Row>
        <span className="flex-1 font-bold">Sách phép vô hạn (mở / lube / lắp theo mẻ)</span>
        <Toggle checked={spells} onChange={setDevSpells} label="Sách phép vô hạn" />
      </Row>
      <Row>
        <span className="flex-1 font-bold">Shopii mở khoá mọi món (bỏ qua cấp xưởng)</span>
        <Toggle checked={unlock} onChange={setDevUnlock} label="Mở khoá mọi món Shopii" />
      </Row>
      <Row>
        <span className="flex-1 font-bold">Hiện FPS, CPU, GPU, RAM</span>
        <Toggle checked={perf} onChange={setPerfHud} label="Hiện thông số hiệu năng" />
      </Row>
      <Row>
        <span className="flex-1 font-bold">Build thử mọi case + màu</span>
        <Button size="sm" tone="blue" onClick={() => setTesting(true)}>
          🧪 Chọn case
        </Button>
      </Row>
      <Row>
        <span className="flex-1 font-bold">Xem thử màn thua game</span>
        {LOSS_PREVIEW.map(([reason, label]) => (
          <Button
            key={reason}
            size="sm"
            tone="red"
            title="Không gửi bảng xếp hạng, không xoá bản lưu"
            onClick={() => useGame.getState().previewGameOver(reason)}
          >
            {label}
          </Button>
        ))}
      </Row>
      {testing && (
        <DevBuildDialog
          onClose={() => {
            setTesting(false)
            useGame.getState().closeApp('settings')
          }}
        />
      )}
    </Section>
  )
}
