import { useState } from 'react'
import { useGame } from '@/store'
import { Button } from '@/components/ui'
import { fmt } from '@/lib/format'
import { SolderingScene } from './SolderingScene'
import { Changelog } from './Changelog'

const BG =
  'radial-gradient(circle at 30% 20%, #3b2a6b, transparent 50%), radial-gradient(circle at 80% 80%, #0f5a5a, transparent 50%), #12131c'

/** trang Facebook tác giả (chỉ hiện icon) */
const AUTHOR_FB = 'https://www.facebook.com/mn.HoangEt'

/** Logo Facebook (chữ f trong vòng tròn) */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
    </svg>
  )
}

/** Form nhập tên khi bắt đầu chơi mới */
function NewGameForm({ onCancel, overwrite }: { onCancel?: () => void; overwrite: boolean }) {
  const [name, setName] = useState('')
  const newGame = useGame((s) => s.newGame)
  return (
    <form
      className="mx-auto flex w-[360px] max-w-full flex-col gap-3 rounded-2xl border-[3px] border-black/40 bg-panel/95 p-5 text-left"
      onSubmit={(e) => {
        e.preventDefault()
        newGame(name)
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
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            ← Quay lại
          </Button>
        )}
        <Button tone="yellow" type="submit" className="flex-1" disabled={!name.trim()}>
          ✦ Mở xưởng
        </Button>
      </div>
    </form>
  )
}

export function TitleScreen() {
  const saveInfo = useGame((s) => s.saveInfo)
  const continueGame = useGame((s) => s.continueGame)
  const [creating, setCreating] = useState(!saveInfo)
  const [log, setLog] = useState(false)
  return (
    <div className="fixed inset-0 grid place-items-center" style={{ background: BG }}>
      <div className="px-4 text-center">
        <SolderingScene className="mx-auto mb-2 w-[220px] max-w-[60vw] drop-shadow-[0_8px_0_rgba(0,0,0,0.4)]" />
        <h1 className="text-[64px] leading-[0.95] text-white [text-shadow:0_6px_0_#000a] max-md:text-[40px]">
          {/* bàn phím nhún nhảy cạnh tên game (đặt ngoài dòng chữ để tên vẫn căn giữa) */}
          <span className="relative">
            SIMULATOR
            <span className="absolute -top-2 left-full ml-4 rotate-12 text-[0.8em]">
              <span className="block animate-bob drop-shadow-[0_6px_0_rgba(0,0,0,0.4)]">⌨️</span>
            </span>
          </span>
          <br />
          <span className="text-yellow">BUILD KEYBOARD</span>
        </h1>
        <p className="mt-3.5 mb-7 text-lg text-muted">
          Nhận đơn · Săn linh kiện · Lắp ráp · Giao hàng
        </p>
        {creating ? (
          <NewGameForm
            overwrite={!!saveInfo}
            onCancel={saveInfo ? () => setCreating(false) : undefined}
          />
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {saveInfo && (
              <Button tone="green" size="lg" onClick={continueGame}>
                ▶ Tiếp tục: {saveInfo.name}
                <span className="block text-sm font-bold opacity-80">
                  Ngày {saveInfo.day} · {fmt(saveInfo.money)}
                </span>
              </Button>
            )}
            <Button tone="yellow" size="lg" onClick={() => setCreating(true)}>
              ✦ Chơi mới
            </Button>
          </div>
        )}
      </div>
      {/* góc dưới: phiên bản game (bấm xem lịch sử cập nhật) + link tác giả */}
      <div className="fixed inset-x-4 bottom-3 flex items-center justify-between text-xs text-muted">
        <button
          type="button"
          title="Lịch sử cập nhật"
          onClick={() => setLog(true)}
          className="underline decoration-dotted underline-offset-2 hover:text-yellow"
        >
          v{__APP_VERSION__}
        </button>
        {log && <Changelog onClose={() => setLog(false)} />}
        <a
          href={AUTHOR_FB}
          target="_blank"
          rel="noreferrer"
          aria-label="Facebook tác giả"
          title="Facebook tác giả"
          className="grid size-10 place-items-center rounded-full bg-[#1877f2] text-white shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5 hover:brightness-110"
        >
          <FacebookIcon className="size-6" />
        </a>
      </div>
    </div>
  )
}
