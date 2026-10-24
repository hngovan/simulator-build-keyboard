import { OwnedItems } from './OwnedItems'

// Kho: chỉ đồ đang có trong kho (linh kiện đơn đang làm, dụng cụ, vật tư), ảnh model 3D như Shopii
export function InventoryApp() {
  return (
    <div className="text-sm">
      <OwnedItems />
    </div>
  )
}
