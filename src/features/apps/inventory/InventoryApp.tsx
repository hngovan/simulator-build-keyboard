import { OwnedItems } from './OwnedItems'

// Kho: mọi đồ của shop (linh kiện đơn đang làm / đơn đang chờ / kho chung, dụng cụ, vật tư), ảnh model 3D như Shopii
export function InventoryApp() {
  return (
    <div className="text-sm">
      <OwnedItems />
    </div>
  )
}
