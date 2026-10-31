// Chỉ nạp khi dev (main.tsx): script `bun run bake:thumbs` mở game bằng trình duyệt ngầm, gọi `window.__bakeThumbs`
// lấy danh sách khoá ảnh mọi sản phẩm Shopii rồi chụp từng khoá ra WebP (cùng code chụp ảnh thẻ) để lưu vào `public/thumbs/`
import { buildCatalog } from '@/data/parts'
import { buildKeyboardModel, caseSpec } from '../messenger/orderThumb'
import { buildScene, shootFresh, type ThumbKind } from './modelThumb'
import { caseKey, productThumb } from './productThumb'

/** mọi khoá ảnh của sản phẩm Shopii (mỗi option 1 khoá; case = bàn phím theo case + màu) */
function keys() {
  const out = new Set<string>()
  for (const p of buildCatalog())
    for (const item of p.options.length ? p.options.map((o) => o.item) : [undefined]) {
      const { kind, type, caseItem } = productThumb(p, item)
      if (caseItem) out.add(caseKey(caseItem.id, caseItem.color))
      else if (kind && type) out.add(`${kind}:${type}`)
    }
  return [...out].sort()
}

/** chụp 1 khoá ra data URL WebP */
function shoot(key: string) {
  if (key.startsWith('caseonly:')) {
    const [, id, color] = key.split(':')
    return shootFresh(() => buildKeyboardModel(caseSpec(id, color), true, true))
  }
  const i = key.indexOf(':')
  return shootFresh(() => buildScene(key.slice(0, i) as ThumbKind, key.slice(i + 1)))
}

declare global {
  interface Window {
    __bakeThumbs?: { keys: typeof keys; shoot: typeof shoot }
  }
}

window.__bakeThumbs = { keys, shoot }
