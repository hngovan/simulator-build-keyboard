import type { StateCreator } from 'zustand'
import { SCREW_STEPS, STEP_INFO, stepProgress } from '@/data/steps'
import { SWITCHES, TOOLS } from '@/data/parts'
import { lubeUseFit } from '@/data/supplies'
import { stabAnimDuration, stabModRules, type StabAnim, type StabModKind } from '@/data/mods'
import { SUPPLIES } from '@/data/supplies'
import type { BuildContext, BuildState, ScrewStep, StepId } from '@/types'
import { scoreDelivery } from './scoring'
import type { GameState } from '.'

export type { StabModKind }

// Thao tác trên bàn build 3D
export interface BuildSlice {
  ctx: BuildContext | null
  build: BuildState | null
  pressed: Record<string, boolean>
  /** hoạt cảnh mod stab đang chạy (không lưu) */
  stabAnim: StabAnim | null
  /** hoạt cảnh bàn lube switch đang chạy: quét mỡ 1 mẻ switch / lắc hộp lò xo (không lưu) */
  lubeAnim: LubeAnim | null
  /** lịch sử thao tác để hoàn tác / quay lại bước cũ (không lưu) */
  history: HistoryEntry[]
  /** tổng vật tư đã dùng trong lần build này (để hoàn trả khi hoàn tác) */
  supplyUsed: Record<string, number>
  /** hoàn tác thao tác vừa làm */
  undo: () => void
  /** quay lại đầu 1 bước đã làm */
  backToStep: (stepIdx: number) => void
  step: () => StepId | undefined
  /** cập nhật build rồi tự chuyển bước khi bước hiện tại xong */
  patchBuild: (patch: Partial<BuildState>) => void
  unbox: () => void
  turnScrew: (id: string) => void
  installStab: (id: string) => void
  placePlate: () => void
  modStab: (kind: StabModKind) => boolean
  lubeBatch: () => number
  lubeSprings: () => boolean
  finishOptional: () => void
  installRun: (kind: 'switch' | 'keycap', id: string) => number
  solderKey: (id: string) => void
  placeGasket: (i: number) => void
  wrapRing: () => void
  dropInCase: () => void
  closeCase: () => void
  press: (id: string, down: boolean) => boolean
  deliver: () => void
}

export const newBuild = (): BuildState => ({
  stepIdx: 0,
  unboxed: false,
  screws: {},
  stabs: {},
  plate: false,
  switches: {},
  solder: {},
  gaskets: {},
  ring: false,
  inCase: false,
  closed: false,
  keycaps: {},
  tested: {},
  stabMods: {
    clip: false,
    bandaid: false,
    housing: null,
    wire: null,
    assembled: false,
    wired: false,
  },
  stabModDone: false,
  lubed: 0,
  lubeType: null,
  springLube: null,
  lubeDone: false,
})

const screwClicks = (s: GameState) => TOOLS.screw[s.tools.screw].clicks!

/** Trạng thái chụp lại trước 1 thao tác */
export interface HistoryEntry {
  build: BuildState
  /** số switch đã cắm lúc đó (để trả switch về kho) */
  installed: number
  supplyUsed: Record<string, number>
  step: StepId
}
const HISTORY_MAX = 300

export interface LubeAnim {
  kind: 'switch' | 'spring'
  lube: string
  /** số switch trong mẻ (kind = switch) */
  batch: number
  at: number
  dur: number
}

/**
 * Rút gọn lịch sử để lưu: giữ điểm bắt đầu của mọi bước (quay lại bước nào cũng được)
 * + 60 thao tác gần nhất (hoàn tác từng thao tác)
 */
export function compactHistory(history: HistoryEntry[], recent = 60): HistoryEntry[] {
  const keep = new Set<number>()
  const seenStep = new Set<number>()
  history.forEach((e, i) => {
    if (!seenStep.has(e.build.stepIdx)) {
      seenStep.add(e.build.stepIdx)
      keep.add(i)
    }
    if (i >= history.length - recent) keep.add(i)
  })
  return history.filter((_, i) => keep.has(i))
}

export const createBuildSlice: StateCreator<GameState, [], [], BuildSlice> = (set, get) => {
  // Chỉ cho thao tác khi đang ở đúng bước; trả về state đã chắc chắn có build
  const at = (step: StepId) => {
    const s = get()
    return s.build && s.ctx && s.step() === step
      ? (s as GameState & { build: BuildState; ctx: BuildContext })
      : null
  }
  // Chụp trạng thái TRƯỚC thao tác; chỉ ghi vào lịch sử khi thao tác thành công (commit)
  const snapshot = (): HistoryEntry | null => {
    const s = get()
    if (!s.build || !s.ctx) return null
    return {
      build: s.build,
      installed: Object.keys(s.build.switches).length,
      supplyUsed: s.supplyUsed,
      step: s.ctx.steps[s.build.stepIdx],
    }
  }
  const commit = (snap: HistoryEntry | null) => {
    if (snap) set((s) => ({ history: [...s.history, snap].slice(-HISTORY_MAX) }))
  }
  // Khôi phục 1 trạng thái cũ: trả lại switch + vật tư đã dùng sau thời điểm đó
  const restore = (e: HistoryEntry) => {
    const s = get()
    if (!s.build) return
    const back = Object.keys(s.build.switches).length - e.installed
    const supplies = { ...s.supplies }
    for (const [id, used] of Object.entries(s.supplyUsed))
      supplies[id] = (supplies[id] ?? 0) + used - (e.supplyUsed[id] ?? 0)
    const sw = s.inventory.switch
    set({
      build: e.build,
      supplies,
      supplyUsed: e.supplyUsed,
      inventory: sw ? { ...s.inventory, switch: { ...sw, count: sw.count + back } } : s.inventory,
      pressed: {},
      viewFlip: false,
    })
  }
  const once = (step: StepId, patch: Partial<BuildState>) => () => {
    const snap = snapshot()
    if (!at(step)) return
    commit(snap)
    get().patchBuild(patch)
  }

  return {
    ctx: null,
    build: null,
    pressed: {},
    stabAnim: null,
    lubeAnim: null,
    history: [],
    supplyUsed: {},

    undo: () => {
      const s = get()
      const e = s.history[s.history.length - 1]
      if (!e || s.stabAnim || s.lubeAnim) return
      restore(e)
      set({ history: s.history.slice(0, -1) })
      s.toast(`↶ Hoàn tác: ${STEP_INFO[e.step].title}`)
    },
    backToStep: (stepIdx) => {
      const s = get()
      if (s.stabAnim || s.lubeAnim) return
      // lần đầu bước đó bắt đầu = trạng thái trước thao tác đầu tiên trong bước
      const j = s.history.findIndex((e) => e.build.stepIdx >= stepIdx)
      if (j < 0) return
      const e = s.history[j]
      restore(e)
      set({ history: s.history.slice(0, j) })
      s.toast(`↶ Quay lại bước: ${STEP_INFO[e.step].title}`)
    },

    step: () => {
      const { ctx, build } = get()
      return build ? ctx?.steps[build.stepIdx] : undefined
    },
    patchBuild: (patch) => {
      const s = get()
      if (!s.build || !s.ctx) return
      const build = { ...s.build, ...patch }
      while (build.stepIdx < s.ctx.steps.length - 1) {
        const [done, total] = stepProgress(s.ctx.steps[build.stepIdx], build, s.ctx, screwClicks(s))
        if (done < total) break
        build.stepIdx++
      }
      set({ build })
    },
    unbox: once('unbox', { unboxed: true }),
    placePlate: once('plate', { plate: true }),
    wrapRing: once('ring', { ring: true }),
    dropInCase: once('caseIn', { inCase: true }),
    closeCase: once('caseClose', { closed: true }),

    turnScrew: (id) => {
      const s = get()
      const step = s.step() as ScrewStep
      if (
        !s.build ||
        !s.ctx ||
        !SCREW_STEPS[step] ||
        !s.ctx.screws[step].some((sc) => sc.id === id)
      )
        return
      const cur = s.build.screws[id] ?? 0
      if (cur >= screwClicks(s)) return
      commit(snapshot())
      s.patchBuild({ screws: { ...s.build.screws, [id]: cur + 1 } })
    },
    installStab: (id) => {
      const s = at('stab')
      if (!s || s.build.stabs[id]) return
      commit(snapshot())
      s.patchBuild({ stabs: { ...s.build.stabs, [id]: true } })
    },
    // Mod stab theo mẫu stab (áp dụng cho toàn bộ stab của layout). Kiểm tra + trừ vật tư ngay,
    // chạy hoạt cảnh trên bàn mod rồi mới ghi kết quả khi hoạt cảnh xong
    modStab: (kind) => {
      const s = at('stabMod')
      if (!s || !s.inventory.stab || s.stabAnim) return false
      const snap = snapshot()
      const n = s.ctx.stabKeys.length
      const mods = s.build.stabMods
      if (mods[kind]) return false
      const rules = stabModRules(s.inventory.stab.type)
      const rule = rules.find((r) => r.kind === kind)!
      const needed = (k: StabModKind) => rules.find((r) => r.kind === k)!.needed
      const fail = (msg: string) => (s.toast(msg, 'bad'), false)
      if (!rule.allowed) return fail(rule.reason ?? 'Không làm được mod này')

      let value: boolean | string = true
      let lube: string | undefined
      switch (kind) {
        case 'clip':
          if (mods.assembled) return fail('Slider đã lắp vào housing, phải tháo ra mới clip được')
          if (TOOLS.clipper[s.tools.clipper].none)
            return fail('Cần kìm cắt — mua ở Tiệm Đồ Nghề hoặc Shopii')
          break
        case 'bandaid':
          if (mods.assembled)
            return fail('Phải Holee mod (dán băng vào lỗ dây trên slider) trước khi lắp slider')
          if (!s.useSupply('urgo', n)) return false
          if (rule.reason) s.toast(`⚠️ ${rule.reason}`, 'bad')
          break
        case 'assembled':
          if (needed('clip') && !mods.clip) return fail('Clip chân stem trước khi lắp slider')
          if (needed('housing') && !mods.housing) return fail('Lube housing + slider trước khi lắp')
          break
        case 'wired':
          if (!mods.assembled) return fail('Lắp slider vào housing trước rồi mới tra dây')
          if (!mods.wire) s.toast('⚠️ Dây chưa lube! Tra vào rồi sẽ không lube được nữa', 'bad')
          break
        case 'housing':
        case 'wire': {
          if (kind === 'housing' && mods.assembled)
            return fail('Đã lắp slider rồi, không lube housing được nữa')
          if (kind === 'wire' && mods.wired) return fail('Dây đã tra vào ngàm, không lube được nữa')
          if (TOOLS.brush[s.tools.brush].none)
            return fail('Cần cọ lube — mua ở Tiệm Đồ Nghề hoặc Shopii')
          lube = s.lubePick[kind]
          const [fit, note] = lubeUseFit(lube, kind)
          if (!fit) return fail(`Không dùng ${SUPPLIES[lube].name} cho phần này được`)
          if (!s.useSupply(lube, n)) return false
          if (fit < 0.7) s.toast(`⚠️ ${note}`, 'bad')
          value = lube
        }
      }
      const dur = stabAnimDuration(kind, lube)
      commit(snap)
      set({ stabAnim: { kind, lube, at: performance.now(), dur } })
      setTimeout(() => {
        const cur = get()
        if (!cur.build) return set({ stabAnim: null })
        set({ stabAnim: null })
        cur.patchBuild({ stabMods: { ...cur.build.stabMods, [kind]: value } })
      }, dur * 1000)
      return true
    },
    // Lube 1 mẻ switch: số lượng mỗi mẻ theo đồ mở switch, cần cọ
    lubeBatch: () => {
      const s = at('switchLube')
      if (!s || s.lubeAnim) return 0
      const snap = snapshot()
      const opener = TOOLS.opener[s.tools.opener]
      if (opener.none)
        return (s.toast('Cần đồ mở switch — mua ở Tiệm Đồ Nghề hoặc Shopii', 'bad'), 0)
      if (TOOLS.brush[s.tools.brush].none)
        return (s.toast('Cần cọ lube — mua ở Tiệm Đồ Nghề hoặc Shopii', 'bad'), 0)
      const type = s.lubePick.switch
      const sw = SWITCHES[s.inventory.switch!.type]
      const [fit, note] = lubeUseFit(type, sw.feel)
      if (!fit) return (s.toast(`Không dùng ${type} cho switch được`, 'bad'), 0)
      if (s.build.lubeType && s.build.lubeType !== type)
        return (s.toast('Đã lube loại khác rồi, không trộn 2 loại mỡ', 'bad'), 0)
      const left = s.ctx.keys.length - s.build.lubed
      const batch = Math.min(opener.n!, left, s.supplies[type] ?? 0)
      if (batch <= 0) return (s.useSupply(type, 1), 0)
      if (!s.useSupply(type, batch)) return 0
      if (!s.build.lubed) {
        if (fit < 0.8) s.toast(`⚠️ ${note}`, 'bad')
        if (sw.prelubed) s.toast('⚠️ Switch này đã lube sẵn, lube thêm dễ over-lube', 'bad')
        if (s.order?.lubePref === 'none')
          s.toast('⚠️ Khách dặn không lube để giữ tiếng gốc!', 'bad')
      }
      commit(snap)
      const dur = 2.2 + (SUPPLIES[type].viscosity ?? 0.5) * 1.4
      set({ lubeAnim: { kind: 'switch', lube: type, batch, at: performance.now(), dur } })
      setTimeout(() => {
        const cur = get()
        set({ lubeAnim: null })
        if (cur.build) cur.patchBuild({ lubed: cur.build.lubed + batch, lubeType: type })
      }, dur * 1000)
      return batch
    },
    // Lube lò xo cho cả bộ (hết tiếng ping)
    lubeSprings: () => {
      const s = at('switchLube')
      if (!s || s.build.springLube || s.lubeAnim) return false
      const snap = snapshot()
      if (TOOLS.brush[s.tools.brush].none)
        return (s.toast('Cần cọ lube — mua ở Tiệm Đồ Nghề hoặc Shopii', 'bad'), false)
      const type = s.lubePick.spring
      const [fit, note] = lubeUseFit(type, 'spring')
      if (!fit) return (s.toast(`Không dùng ${type} cho lò xo được`, 'bad'), false)
      if (!s.useSupply(type, s.ctx.keys.length)) return false
      if (fit < 0.8) s.toast(`⚠️ ${note}`, 'bad')
      commit(snap)
      const dur = 3.8
      set({ lubeAnim: { kind: 'spring', lube: type, batch: 0, at: performance.now(), dur } })
      setTimeout(() => {
        const cur = get()
        set({ lubeAnim: null })
        if (cur.build) cur.patchBuild({ springLube: type })
      }, dur * 1000)
      return true
    },
    finishOptional: () => {
      const step = get().step()
      if (step === 'stabMod' || step === 'switchLube') commit(snapshot())
      if (step === 'stabMod') get().patchBuild({ stabModDone: true })
      if (step === 'switchLube') get().patchBuild({ lubeDone: true })
    },
    // Lắp switch/keycap theo dụng cụ: n phím liền nhau trong cùng hàng, tính từ phím được click
    installRun: (kind, id) => {
      const s = at(kind)
      if (!s) return 0
      const snap = snapshot()
      const field = kind === 'switch' ? 'switches' : 'keycaps'
      const n = TOOLS[kind][s.tools[kind]].n!
      const k0 = s.ctx.keys.find((k) => k.id === id)
      if (!k0) return 0
      const row = s.ctx.keys
        .filter((k) => k.y === k0.y && k.x >= k0.x && !s.build[field][k.id])
        .sort((a, b) => a.x - b.x)
      let targets = row.slice(0, n).map((k) => k.id)
      if (!targets.includes(id)) return 0
      if (kind === 'switch') {
        const inv = s.inventory.switch!
        targets = targets.slice(0, inv.count)
        if (!targets.length) return (s.toast('Hết switch! Về máy tính mua thêm', 'bad'), 0)
        commit(snap)
        set({
          inventory: { ...s.inventory, switch: { ...inv, count: inv.count - targets.length } },
        })
      }
      if (kind === 'keycap') commit(snap)
      const next = { ...s.build[field] }
      targets.forEach((t) => (next[t] = true))
      s.patchBuild({ [field]: next })
      return targets.length
    },
    solderKey: (id) => {
      const s = at('solder')
      if (!s || s.build.solder[id]) return
      commit(snapshot())
      s.patchBuild({ solder: { ...s.build.solder, [id]: true } })
    },
    placeGasket: (i) => {
      const s = at('gasket')
      if (!s || s.build.gaskets[i]) return
      commit(snapshot())
      s.patchBuild({ gaskets: { ...s.build.gaskets, [i]: true } })
    },
    press: (id, down) => {
      const s = at('test')
      if (!s || !s.build.keycaps[id]) return false
      const pressed = { ...s.pressed, [id]: down }
      if (down && !s.build.tested[id])
        set({ pressed, build: { ...s.build, tested: { ...s.build.tested, [id]: true } } })
      else set({ pressed })
      return true
    },

    deliver: () => {
      const s = get()
      if (!s.order || !s.build || !s.ctx) return
      const result = scoreDelivery({
        order: s.order,
        inventory: s.inventory,
        build: s.build,
        ctx: s.ctx,
        mount: s.mount,
        spent: s.spent,
        screwClicks: screwClicks(s),
        brushLevel: s.tools.brush,
      })
      set({
        money: s.money + result.reimburse + result.labor,
        rep: s.rep + result.stars - 3,
        done: s.done + 1,
        result,
        screen: 'pc',
        windows: ['messenger'],
        build: null,
        ctx: null,
        history: [],
        supplyUsed: {},
      })
      get().save()
    },
  }
}
