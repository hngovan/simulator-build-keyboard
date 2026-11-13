import { useEffect, useState } from 'react'
import { Music } from 'lucide-react'
import { useGame } from '@/store'
import { playUiHover, playUiSelect } from '@/sound'
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

/** mục menu: `sub` = mục con (chữ nhỏ, thụt vào) dưới mục lớn không bấm được */
type MenuItem = {
  id: string
  label: string
  sub?: boolean
  run: () => void
}

export function TitleScreen() {
  const saveInfo = useGame((s) => s.saveInfo)
  const continueGame = useGame((s) => s.continueGame)
  const startFree = useGame((s) => s.startFree)
  const newGame = useGame((s) => s.newGame)
  const [creating, setCreating] = useState(false)
  const [dialog, setDialog] = useState<'log' | 'board' | null>(null)
  const musicOff = useGame((s) => !!s.audio.musicOff)
  const setAudio = useGame((s) => s.setAudio)
  // hỏi lại trước khi ghi đè bản lưu: cùng kiểu menu chữ (không khung), mặc định đứng ở "Quay lại"
  const back = () => {
    setCreating(false)
    setSel(0)
  }
  const items: MenuItem[] = creating
    ? [
        { id: 'back', label: 'Quay lại', sub: true, run: back },
        { id: 'overwrite', label: 'Chơi mới', sub: true, run: newGame },
      ]
    : [
        // chưa có bản lưu thì không hiện
        ...(saveInfo ? [{ id: 'continue', label: 'Tiếp tục', sub: true, run: continueGame }] : []),
        // có bản lưu thì hỏi lại trước khi ghi đè, chưa có thì vào luôn (tên xưởng đặt trong game)
        {
          id: 'new',
          label: 'Chơi mới',
          sub: true,
          run: () => {
            if (!saveInfo) return newGame()
            setCreating(true)
            setSel(0)
          },
        },
        // không hỏi tên, không đụng bản lưu Sự nghiệp
        { id: 'free', label: 'Free build', run: startFree },
        // bảng xếp hạng server (không cần bản lưu)
        { id: 'board', label: 'Bảng xếp hạng', run: () => setDialog('board') },
      ]
  // mặc định chọn mục đầu: Tiếp tục nếu có bản lưu, không thì Chơi mới
  const [sel, setSel] = useState(0)
  const cur = Math.min(sel, items.length - 1)
  // đổi mục đang chọn (rê chuột / mũi tên) = tiếng tick; bấm chọn = tiếng gõ phím
  const hover = (i: number) => {
    if (i === cur) return
    setSel(i)
    playUiHover()
  }
  const choose = (it: MenuItem) => {
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
          back()
        }
        return
      }
      if (dialog) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const d = e.key === 'ArrowDown' ? 1 : -1
        hover((cur + d + items.length) % items.length)
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
      onPointerEnter={() => hover(i)}
      onFocus={() => setSel(i)}
      onClick={() => choose(it)}
      className={`flex items-baseline gap-2 text-center font-head leading-tight font-extrabold transition-colors duration-150 [text-shadow:0_3px_0_#0008] ${it.sub ? 'text-2xl' : 'text-[30px]'} ${i === cur ? 'text-yellow' : 'text-ink'}`}
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
          <nav className="flex flex-col items-center gap-1.5">
            {/* mục lớn chỉ là tiêu đề nhóm, mục con chữ nhỏ bên dưới */}
            <span className="font-head text-[30px] leading-tight font-extrabold text-ink [text-shadow:0_3px_0_#0008]">
              {creating ? 'Chơi mới?' : 'Sự nghiệp'}
            </span>
            {creating && saveInfo && (
              <span className="mb-2 max-w-[420px] font-head text-base leading-snug font-bold text-ink/80 [text-shadow:0_2px_0_#0008]">
                Bản lưu xưởng <span className="text-yellow">{saveInfo.name}</span> (ngày{' '}
                {saveInfo.day}) sẽ bị ghi đè.
              </span>
            )}
            {items.map(menuItem)}
          </nav>
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
