import { useGame } from '@/store'
import { stabSpan } from '@/data/steps'
import type { Key } from '@/types'
import { Stabilizer } from '../models/Stabilizer'

/** Stab lắp cho 1 phím dài; phím dọc (numpad +, Enter) thì xoay 90° */
export function StabMesh({ k }: { k: Key }) {
  const model = useGame((s) => s.inventory.stab?.type)
  const lubed = useGame((s) => !!s.build?.stabMods.housing)
  const wireLube = useGame((s) => s.build?.stabMods.wire)
  const holee = useGame((s) => !!s.build?.stabMods.bandaid)
  if (!model) return null
  return (
    <group rotation-y={k.h >= 2 ? Math.PI / 2 : 0}>
      <Stabilizer
        model={model}
        span={stabSpan(k)}
        lubed={lubed}
        holee={holee}
        wireLube={wireLube}
      />
    </group>
  )
}
