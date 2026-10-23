import { useState } from 'react'
import { useGame } from '@/store'
import { Button } from '@/components/ui'
import { fmt } from '@/lib/format'

const BG =
  'radial-gradient(circle at 30% 20%, #3b2a6b, transparent 50%), radial-gradient(circle at 80% 80%, #0f5a5a, transparent 50%), #12131c'

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
  return (
    <div className="fixed inset-0 grid place-items-center" style={{ background: BG }}>
      <div className="px-4 text-center">
        <div className="animate-bob text-[90px] drop-shadow-[0_8px_0_rgba(0,0,0,0.4)]">⌨️</div>
        <h1 className="text-[64px] leading-[0.95] text-white [text-shadow:0_6px_0_#000a] max-md:text-[40px]">
          SIMULATOR
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
    </div>
  )
}
