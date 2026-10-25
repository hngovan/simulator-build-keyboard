import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { TitleBar, TitleButton } from '@/components/ui'
import { CHANGELOG } from '@/data/changelog'

/** Bảng lịch sử cập nhật: mỗi phiên bản = các commit tính năng, mới nhất ở trên */
export function Changelog({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[2000] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[min(80vh,640px)] w-[min(94vw,560px)] flex-col overflow-hidden rounded-2xl border-[3px] border-black/40 bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
        <TitleBar color="#7b5cff" title="Lịch sử cập nhật">
          <TitleButton close aria-label="Đóng" title="Đóng" onClick={onClose}>
            <X />
          </TitleButton>
        </TitleBar>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 text-left">
          {CHANGELOG.map((e, i) => (
            <section key={`${e.version}-${i}`} className="rounded-xl bg-panel-2 p-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <b className={i === 0 ? 'text-yellow' : undefined}>v{e.version}</b>
                <span className="font-bold">{e.title}</span>
                <span className="ml-auto text-xs text-muted">{e.date}</span>
              </div>
              {e.commits.length > 0 && (
                <div className="mt-0.5 font-mono text-[11px] text-muted">
                  commit {e.commits.join(', ')}
                </div>
              )}
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm">
                {e.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
