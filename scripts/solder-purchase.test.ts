import { expect, test } from 'bun:test'
import { createStore } from 'zustand/vanilla'
import { createShopSlice } from '../src/store/shopSlice'
import { createBuildSlice } from '../src/store/buildSlice'
import { START, loadSave, writeSave } from '../src/store/persistence'
import { TOOLS } from '../src/data/parts'

function fixture(money = 2000) {
  return createStore<any>()((set, get, api) => ({
    ...START,
    ...createShopSlice(set, get, api),
    ...createBuildSlice(set, get, api),
    money,
    tools: { ...START.tools, solder: 2 },
    solderOwned: { 2: 120 },
    wear: { solder: 120 },
    toast: () => {},
  }))
}

test('buy another iron, retain both and switch freely with independent durability', () => {
  const store = fixture()
  expect(store.getState().buyTool('solder', 1)).toBe('ok')
  expect(store.getState().solderOwned).toEqual({ 1: 0, 2: 120 })
  expect(store.getState().tools.solder).toBe(1)
  store.getState().wearTool('solder')
  expect(store.getState().solderOwned[1]).toBe(1)
  expect(store.getState().buyTool('solder', 2)).toBe('ok')
  expect(store.getState().money).toBe(2000 - TOOLS.solder[1].price)
  expect(store.getState().wear.solder).toBe(120)
  store.getState().equipSolder(1)
  expect(store.getState().wear.solder).toBe(1)
  expect(store.getState().equipSolder(99)).toBe(false)
})

test('buying an owned model does not charge or reset its wear', () => {
  const store = fixture()
  expect(store.getState().buyTool('solder', 2)).toBe('ok')
  expect(store.getState().wear.solder).toBe(120)
  expect(store.getState().money).toBe(2000)
})

test('insufficient money preserves ownership and active iron', () => {
  const store = fixture(0)
  expect(store.getState().buyTool('solder', 1)).toBe('fail')
  expect(store.getState().tools.solder).toBe(2)
  expect(store.getState().solderOwned).toEqual({ 2: 120 })
})

test('undo purchase refunds once and restores previous iron and ownership', () => {
  const store = fixture()
  store.getState().buyTool('solder', 1)
  store.getState().undoSolderPurchase()
  expect(store.getState().money).toBe(2000)
  expect(store.getState().tools.solder).toBe(2)
  expect(store.getState().wear.solder).toBe(120)
  expect(store.getState().solderOwned).toEqual({ 2: 120 })
  store.getState().undoSolderPurchase()
  expect(store.getState().money).toBe(2000)
})

test('using an iron ends purchase undo, and breakage retains the other iron', () => {
  const store = fixture()
  store.getState().buyTool('solder', 1)
  store.setState({ wear: { solder: TOOLS.solder[1].life! - 1 } })
  store.getState().wearTool('solder')
  expect(store.getState().lastSolderPurchase).toBeNull()
  expect(store.getState().solderOwned).toEqual({ 2: 120 })
  expect(store.getState().tools.solder).toBe(0)
  expect(store.getState().equipSolder(2)).toBe(true)
  expect(store.getState().wear.solder).toBe(120)
})

test('save/load keeps both irons, and old saves migrate the active iron', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let raw: string | null = null
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value
      },
    },
  })
  try {
    writeSave({
      ...START,
      tools: { ...START.tools, solder: 1 },
      wear: { solder: 8 },
      solderOwned: { 1: 8, 2: 120 },
    })
    expect(loadSave()?.solderOwned).toEqual({ 1: 8, 2: 120 })
    raw = JSON.stringify({
      ...START,
      tools: { ...START.tools, solder: 2 },
      wear: { solder: 120 },
      solderOwned: undefined,
    })
    expect(loadSave()?.solderOwned).toEqual({ 2: 120 })
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
