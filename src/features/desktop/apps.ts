import type { ComponentType } from 'react'
import type { AppId } from '@/store'
import { Messenger } from '@/features/apps/messenger/Messenger'
import { Shopii } from '@/features/apps/shop/Shopii'
import { GroupFeed } from '@/features/apps/group/GroupFeed'
import { InventoryApp } from '@/features/apps/inventory/InventoryApp'
import { SettingsApp } from '@/features/apps/settings/SettingsApp'

export interface AppDef {
  title: string
  icon: string
  color: string
  width: number
  Component: ComponentType
}

// Danh sách app trên máy tính trong game. Thêm app mới chỉ cần thêm 1 dòng ở đây
export const APPS: Record<AppId, AppDef> = {
  messenger: { title: 'Mezzenger', icon: '💬', color: '#7b5cff', width: 480, Component: Messenger },
  shopii: { title: 'Shopii', icon: '🛒', color: '#ee4d2d', width: 900, Component: Shopii },
  group: {
    title: 'Hội Phím Cơ VN',
    icon: '👥',
    color: '#1877f2',
    width: 600,
    Component: GroupFeed,
  },
  inventory: {
    title: 'Kho & Bàn build',
    icon: '📦',
    color: '#16a085',
    width: 600,
    Component: InventoryApp,
  },
  settings: { title: 'Cài đặt', icon: '⚙️', color: '#66758f', width: 460, Component: SettingsApp },
}

export const APP_IDS = Object.keys(APPS) as AppId[]
