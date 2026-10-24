import type { ComponentType } from 'react'
import type { AppId } from '@/store'
import { Messenger } from '@/features/apps/messenger/Messenger'
import { Shopii } from '@/features/apps/shop/Shopii'
import { GroupFeed } from '@/features/apps/group/GroupFeed'
import { InventoryApp } from '@/features/apps/inventory/InventoryApp'
import { OrderApp } from '@/features/apps/inventory/OrderApp'
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
  messenger: {
    title: 'Mezzenger',
    icon: '/icons/apps/messages-square.svg',
    color: '#7b5cff',
    width: 880,
    Component: Messenger,
  },
  shopii: {
    title: 'Shopii',
    icon: '/icons/apps/shopping-bag.svg',
    color: '#ee4d2d',
    width: 900,
    Component: Shopii,
  },
  group: {
    title: 'Hội Phím Cơ VN',
    icon: '/icons/apps/users-round.svg',
    color: '#1877f2',
    width: 600,
    Component: GroupFeed,
  },
  inventory: {
    title: 'Kho',
    icon: '/icons/apps/boxes.svg',
    color: '#16a085',
    width: 600,
    Component: InventoryApp,
  },
  order: {
    title: 'Danh sách đơn',
    icon: '/icons/apps/clipboard-list.svg',
    color: '#d9822b',
    width: 680,
    Component: OrderApp,
  },
  settings: {
    title: 'Cài đặt',
    icon: '/icons/apps/settings-2.svg',
    color: '#66758f',
    width: 460,
    Component: SettingsApp,
  },
}

export const APP_IDS = Object.keys(APPS) as AppId[]

/** Lối tắt ra bàn build (không phải cửa sổ): có build thì vào làm tiếp, chưa có thì bàn trống để chọn đơn */
export const BENCH_ICON: Omit<AppDef, 'Component' | 'width'> = {
  title: 'Bàn build',
  icon: '/icons/apps/keyboard.svg',
  color: '#2e8b57',
}
