import { useGame } from '@/store'
import { TOOLS, TOOL_KINDS } from '@/data/parts'
import { ArtCard, type ArtCardState } from '@/components/ui'
import { ToolArt } from '@/components/art/ToolArt'
import { fmt } from '@/lib/format'
import type { ToolKind } from '@/types'

// Tiệm đồ nghề: viền xanh = đang dùng, rê chuột lên món chưa có để mua
export function ToolShop() {
  const tools = useGame((s) => s.tools)
  const buyTool = useGame((s) => s.buyTool)
  return (
    <div>
      {(Object.entries(TOOLS) as [ToolKind, (typeof TOOLS)[ToolKind]][]).map(([kind, levels]) => (
        <div key={kind} className="mb-3.5">
          <h4 className="mb-2 text-base">{TOOL_KINDS[kind]}</h4>
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {levels.map((t, lv) => {
              if (t.none) return null
              const state: ArtCardState =
                tools[kind] === lv ? 'owned' : tools[kind] > lv ? 'outdated' : 'buyable'
              return (
                <ArtCard
                  key={lv}
                  art={<ToolArt kind={kind} level={lv} />}
                  title={t.name}
                  desc={t.desc}
                  state={state}
                  action={`Mua ${fmt(t.price)}`}
                  onAction={() => buyTool(kind, lv)}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
