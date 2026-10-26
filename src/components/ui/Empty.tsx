import type { ReactNode } from 'react'

/** Ô trống: icon + chữ ở giữa (danh sách chưa có gì, cần làm gì trước) */
export function Empty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-panel-2 px-4 py-6 text-center text-sm font-bold text-muted [&_svg]:size-8 [&_svg]:opacity-70">
      {icon}
      {children}
    </div>
  )
}
