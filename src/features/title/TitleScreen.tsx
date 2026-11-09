import { useEffect, useState } from 'react'
import { Music } from 'lucide-react'
import { useGame } from '@/store'
import { playUiHover, playUiSelect } from '@/sound'
import { Button } from '@/components/ui'
import { WORKSPACE_ART } from '@/components/art/workspace'
import { GameLogo } from '@/components/art/GameLogo'
import { Changelog, TitleModal } from './Changelog'
import { Leaderboard } from '@/features/leaderboard/Leaderboard'

/** trang Facebook tác giả */
const AUTHOR_FB = 'https://www.facebook.com/mn.HoangEt'

/** Logo Facebook: chỉ chữ f, không nền (màu theo currentColor) */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.33-.04-1.56-.14-2.86-.14C11.93 2 10 3.66 10 6.7v2.8H7v4h3V22h4z" />
    </svg>
  )
}

/** chế độ khi bắt đầu: sự nghiệp (không hướng dẫn) / hướng dẫn build (tour Keeb-chan đơn đầu tiên) */
type Mode = 'career' | 'guide'

/** Form nhập tên khi bắt đầu chơi mới */
function NewGameForm({
  mode,
  onCancel,
  overwrite,
}: {
  mode: Mode
  onCancel: () => void
  overwrite: boolean
}) {
  const [name, setName] = useState('')
  const newGame = useGame((s) => s.newGame)
  return (
    <form
      className="flex w-[360px] max-w-full flex-col gap-3 rounded-2xl border-[3px] border-black/40 bg-panel/95 p-5 text-left"
      onSubmit={(e) => {
        e.preventDefault()
        playUiSelect()
        newGame(name, mode === 'career')
      }}
    >
      <label className="font-head text-lg font-extrabold">Tên thợ build của bạn</label>
      <input
        autoFocus
        maxLength={24}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="VD: Tuấn Keeb"
        className="rounded-xl border-2 border-line bg-panel-2 px-3 py-2 text-base outline-none focus:border-yellow"
      />
      {overwrite && <span className="text-xs text-red">Chơi mới sẽ ghi đè bản lưu hiện tại.</span>}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => {
            playUiSelect()
            onCancel()
          }}
        >
          Quay lại
        </Button>
        <Button tone="yellow" type="submit" className="flex-1" disabled={!name.trim()}>
          Mở xưởng
        </Button>
      </div>
    </form>
  )
}

/** mục menu: `sub` = mục con (chữ nhỏ, thụt vào) dưới mục lớn không bấm được */
type MenuItem = {
  id: string
  label: string
  sub?: boolean
  off?: boolean
  run: () => void
}

export function TitleScreen() {
  const saveInfo = useGame((s) => s.saveInfo)
  const continueGame = useGame((s) => s.continueGame)
  const startFree = useGame((s) => s.startFree)
  const [creating, setCreating] = useState<Mode | null>(null)
  const [dialog, setDialog] = useState<'log' | 'board' | null>(null)
  const musicOff = useGame((s) => !!s.audio.musicOff)
  const setAudio = useGame((s) => s.setAudio)
  const items: MenuItem[] = [
    // chưa có bản lưu thì vẫn hiện, mờ đi, không bấm được
    {
      id: 'continue',
      label: 'Tiếp tục',
      sub: true,
      off: !saveInfo,
      run: continueGame,
    },
    { id: 'new', label: 'Chơi mới', sub: true, run: () => setCreating('career') },
    { id: 'guide', label: 'Hướng dẫn build', run: () => setCreating('guide') },
    // không hỏi tên, không đụng bản lưu Sự nghiệp
    { id: 'free', label: 'Free build', run: startFree },
    // bảng xếp hạng server (không cần bản lưu)
    { id: 'board', label: 'Bảng xếp hạng', run: () => setDialog('board') },
  ]
  // mặc định chọn Tiếp tục nếu có bản lưu, không thì Chơi mới
  const [sel, setSel] = useState(saveInfo ? 0 : 1)
  const cur = Math.min(sel, items.length - 1)
  // đổi mục đang chọn (rê chuột / mũi tên) = tiếng tick; bấm chọn = tiếng gõ phím
  const hover = (i: number) => {
    if (i === cur) return
    setSel(i)
    playUiHover()
  }
  const choose = (it: MenuItem) => {
    if (it.off) return
    playUiSelect()
    it.run()
  }

  // ↑ ↓ chọn, Enter vào mục; Esc đóng popup / quay lại từ form chơi mới
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dialog) setDialog(null)
        else if (creating) {
          playUiSelect()
          setCreating(null)
        }
        return
      }
      if (dialog || creating) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const d = e.key === 'ArrowDown' ? 1 : -1
        let i = cur
        do i = (i + d + items.length) % items.length
        while (items[i].off)
        hover(i)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (items[cur]) choose(items[cur])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const menuItem = (it: MenuItem, i: number) => (
    <button
      key={it.id}
      type="button"
      disabled={it.off}
      onPointerEnter={() => !it.off && hover(i)}
      onFocus={() => setSel(i)}
      onClick={() => choose(it)}
      className={`flex items-baseline gap-2 text-center font-head leading-tight font-extrabold transition-colors duration-150 [text-shadow:0_3px_0_#0008] ${it.sub ? 'text-2xl' : 'text-[30px]'} ${it.off ? 'cursor-default text-ink/35' : i === cur ? 'text-yellow' : 'text-ink'}`}
    >
      {/* dấu chọn 2 bên (bên phải lật ngược) để chữ vẫn đúng giữa */}
      <span className={`w-3 ${i === cur ? '' : 'opacity-0'}`}>›</span>
      <span>{it.label}</span>
      <span className={`w-3 ${i === cur ? '' : 'opacity-0'}`}>‹</span>
    </button>
  )

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      {/* ảnh góc bàn cạnh cửa sổ trong game tràn màn, làm mờ cả ảnh + phủ tối toàn màn cho dễ đọc chữ
          (phóng nhẹ 1,05 để mép ảnh mờ không lộ viền sáng) */}
      <img
        src={WORKSPACE_ART}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full scale-105 object-cover blur-sm select-none"
      />
      <div className="absolute inset-0 bg-[#15131e]/60" />

      {/* tên game + menu: 1 cột chính giữa màn (cả ngang + dọc) */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-10 overflow-y-auto px-6 py-8 text-center">
        {/* logo game (icon keycap + chữ nghiêng đậm) */}
        <GameLogo />

        <div className="flex flex-col items-center">
          {creating ? (
            <NewGameForm
              mode={creating}
              overwrite={!!saveInfo}
              onCancel={() => setCreating(null)}
            />
          ) : (
            <nav className="flex flex-col items-center gap-1.5">
              {/* mục lớn "Sự nghiệp" chỉ là tiêu đề nhóm, mục con chữ nhỏ bên dưới */}
              <span className="font-head text-[30px] leading-tight font-extrabold text-ink [text-shadow:0_3px_0_#0008]">
                Sự nghiệp
              </span>
              {items.map(menuItem)}
            </nav>
          )}
        </div>
      </div>

      {/* góc trên trái: bật / tắt nhạc nền (tắt = mờ + gạch chéo) */}
      <button
        type="button"
        title={musicOff ? 'Bật nhạc nền' : 'Tắt nhạc nền'}
        aria-label={musicOff ? 'Bật nhạc nền' : 'Tắt nhạc nền'}
        aria-pressed={!musicOff}
        onClick={() => {
          playUiSelect()
          setAudio({ musicOff: !musicOff })
        }}
        className={`absolute top-5 left-5 grid size-10 place-items-center text-white transition-[color,opacity] hover:text-yellow ${musicOff ? 'opacity-50' : ''}`}
      >
        <Music className="size-6" />
        {musicOff && (
          <span className="absolute h-[2.5px] w-8 rotate-45 rounded-full bg-current shadow-[0_0_0_2px_#15131e]" />
        )}
      </button>

      {/* đáy giữa màn: Facebook tác giả */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center">
        <a
          href={AUTHOR_FB}
          target="_blank"
          rel="noreferrer"
          aria-label="Facebook"
          title="Facebook"
          className="grid size-9 place-items-center text-white transition-colors hover:text-yellow"
        >
          <FacebookIcon className="size-5" />
        </a>
      </div>
      {/* góc dưới phải: phiên bản (bấm xem lịch sử cập nhật) */}
      <button
        type="button"
        title="Lịch sử cập nhật"
        onClick={() => setDialog('log')}
        className="absolute right-5 bottom-6 font-mono text-[11px] font-bold text-muted hover:text-yellow"
      >
        v{__APP_VERSION__}
      </button>

      {dialog === 'log' && <Changelog onClose={() => setDialog(null)} />}
      {dialog === 'board' && (
        <TitleModal color="#c0392b" title="Bảng xếp hạng" wide onClose={() => setDialog(null)}>
          {/* khung cao cố định, danh sách cuộn bên trong (không cuộn cả popup) */}
          <div data-fill className="group/win flex h-[min(64vh,560px)] min-h-0 flex-col">
            <Leaderboard />
          </div>
        </TitleModal>
      )}
    </div>
  )
}
