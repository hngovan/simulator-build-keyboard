import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { HudCard, TitleButton } from '@/components/ui'
import { ODDS } from '@/data/odds'

/** Bảng tỉ lệ trong game Keeb-chan mở ra (dữ liệu `ODDS`, chung với README) */
export function OddsDialog({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      role="dialog"
      aria-label="Bảng tỉ lệ trong game"
      className="fixed inset-0 z-[3500] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <HudCard className="flex max-h-[85vh] w-[min(560px,100%)] flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-head text-xl font-extrabold text-yellow">📊 Bảng tỉ lệ trong game</h3>
          <TitleButton close aria-label="Đóng bảng tỉ lệ" title="Đóng" onClick={onClose}>
            <X />
          </TitleButton>
        </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          {ODDS.map((g) => (
            <section key={g.title}>
              <h4 className="mb-1 font-head text-base font-extrabold">
                {g.icon} {g.title}
              </h4>
              <div className="flex flex-col gap-1">
                {g.rows.map((r) => (
                  <div
                    key={r.what}
                    className="flex items-start justify-between gap-3 rounded-lg bg-panel-2 px-2.5 py-1.5 text-sm"
                  >
                    {/* tỉ lệ dài (vd phím chưa hàn) xuống dòng, không tràn khung: 2 cột co giãn, cột phải tối đa ~55% */}
                    <span className="min-w-0 flex-1">{r.what}</span>
                    <b className="max-w-[55%] min-w-0 text-right break-words text-yellow">
                      {r.odds}
                    </b>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </HudCard>
    </div>,
    document.body,
  )
}
