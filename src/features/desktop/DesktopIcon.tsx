import type { AppDef } from './apps'

/** Icon app trên màn hình desktop */
export function DesktopIcon({
  app,
  badge,
  onOpen,
}: {
  app: Pick<AppDef, 'title' | 'icon' | 'color'>
  badge?: boolean
  onOpen: () => void
}) {
  return (
    <button
      className="flex w-[92px] flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-white/10"
      onClick={onOpen}
    >
      <span
        className="relative grid size-14 place-items-center rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.3)]"
        style={{ background: app.color }}
      >
        <img src={app.icon} alt="" className="size-8 brightness-0 invert" />
        {badge && (
          <i className="absolute -top-1 -right-1 size-3.5 rounded-full border-2 border-white bg-red" />
        )}
      </span>
      <span className="text-center text-xs font-extrabold [text-shadow:0_1px_2px_#000]">
        {app.title}
      </span>
    </button>
  )
}
