import { CASES, KEYCAP_KITS, keycapKitShort } from '@/data/parts'
import { KeyboardViewer } from '@/features/apps/messenger/OrderViewer'
import { useShelfView } from '@/scene/models/shelfView'

/** Khung xem 3D bàn phím chưng trên kệ (bấm vào bàn phím trên kệ ở bàn build) */
export function ShelfViewer() {
  const spec = useShelfView((s) => s.spec)
  const close = useShelfView((s) => s.close)
  if (!spec) return null
  return (
    <KeyboardViewer
      spec={spec}
      title={`${CASES[spec.caseId].name} + keycap ${keycapKitShort(KEYCAP_KITS[spec.keycapKit].name)}`}
      onClose={close}
    />
  )
}
