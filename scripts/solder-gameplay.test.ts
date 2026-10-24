import { test, expect } from 'bun:test'
import { createStore } from 'zustand/vanilla'
import { createBuildSlice } from '../src/store/buildSlice'
import { START } from '../src/store/persistence'
import { solderTiming } from '../src/data/supplies'
import { stepProgress } from '../src/data/steps'
import { TOOLS } from '../src/data/parts'

function fixture() {
  const store = createStore<any>()((set, get, api) => ({
    ...START,
    ...createBuildSlice(set, get, api),
    tools: { ...START.tools, solder: 2, desolder: 1, tipCleaner: 1 },
    supplies: { solder6337: 100 },
    solderPick: 'solder6337',
    toast: () => {},
    build: {
      stepIdx: 0,
      solder: { a: { wire: 'solder6337', burnt: true } },
      switches: {},
      tipDirty: true,
    },
    ctx: { steps: ['solder', 'test'], keys: [{ id: 'a' }] },
  }))
  return store
}

test('burnt joint cannot be overwritten; pump removes it without refunding solder or cleaning tip', () => {
  const store = fixture()
  store.getState().solderKey('a', false)
  expect(store.getState().build.solder.a.burnt).toBe(true)
  expect(store.getState().desolderKey('a')).toBe(true)
  expect(store.getState().build.solder.a).toBeUndefined()
  expect(store.getState().build.tipDirty).toBe(true)
  expect(store.getState().supplies.solder6337).toBe(100)
  expect(store.getState().wear.desolder).toBe(1)
  expect(store.getState().desolderKey('a')).toBe(false)
  expect(store.getState().wear.desolder).toBe(1)
  store.getState().cleanTip()
  expect(store.getState().canSolder()).toBe(true)
})

test('missing pump, healthy joints and wrong step do not spend uses', () => {
  const store = fixture()
  store.setState({ tools: { ...store.getState().tools, desolder: 0 } })
  expect(store.getState().desolderKey('a')).toBe(false)
  store.setState({ tools: { ...store.getState().tools, desolder: 1 } })
  store.getState().patchBuild({ solder: { a: true } })
  expect(store.getState().desolderKey('a')).toBe(false)
  store.getState().patchBuild({ solder: { a: { burnt: true, wire: 'solder6337' } }, stepIdx: 1 })
  expect(store.getState().desolderKey('a')).toBe(false)
  expect(store.getState().wear.desolder).toBeUndefined()
})

test('pump lasts exactly 1000 completed removals', () => {
  const store = fixture()
  for (let i = 0; i < 1000; i++) {
    store.getState().patchBuild({ solder: { a: { burnt: true, wire: 'solder6337' } } })
    expect(store.getState().desolderKey('a')).toBe(true)
    expect(store.getState().tools.desolder).toBe(i === 999 ? 0 : 1)
  }
  store.getState().patchBuild({ solder: { a: { burnt: true, wire: 'solder6337' } } })
  expect(store.getState().desolderKey('a')).toBe(false)
})

test('burnt joints do not count toward completing solder step', () => {
  const s = fixture().getState()
  expect(stepProgress('solder', s.build, s.ctx, 1)).toEqual([0, 1])
})

test('holder subtracts one second, preserves release window and clamps fast irons', () => {
  const normal = solderTiming(1.4, 'solderCheap', false)
  const faster = solderTiming(1.4, 'solderCheap', false, true)
  expect(normal.ready - faster.ready).toBeCloseTo(1)
  expect(normal.burn - normal.ready).toBeCloseTo(faster.burn - faster.ready)
  expect(solderTiming(0.7, 'solderPro', true, true).ready).toBe(0.2)
})

test('premium station animation remains visible with fastest solder and holder', () => {
  const timing = solderTiming(TOOLS.solder[2].hold!, 'solderPro', true, true)
  expect(timing.ready).toBeCloseTo(1.4)
  expect(timing.burn - timing.ready).toBeCloseTo(2.4 * 0.35)
})
