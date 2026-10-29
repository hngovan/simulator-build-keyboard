import {
  CASE_DAMAGE_REP,
  CASE_REFUND,
  CASE_SCREW_STEPS,
  STRIP_FEW_UNNOTICED,
  SCREW_STEPS,
  STRIP_UNNOTICED,
  isBuildStep,
  isOptionalStep,
  stepProgress,
} from '@/data/steps'
import { CASES, SOUND_WISH, STABS, TOOLS, buildSound, soundMatch } from '@/data/parts'
import { stabQuality, switchLubeEval } from '@/data/mods'
import { SUPPLIES } from '@/data/supplies'
import type {
  BuildContext,
  BuildState,
  DeliveryResult,
  Inventory,
  Order,
  ScoreCheck,
  ScrewStep,
} from '@/types'

/** điểm thưởng tối đa khi mọi lần vặn vít vào / hàn đều trúng vùng vàng skill check */
const PERFECT_BONUS = 5

/** giao khi chưa test hết phím: tỉ lệ khách phát hiện 1 nút lỗi */
export const UNTESTED_FAIL = 0.05
/** khách báo lỗi nút: sao tối đa */
const DEFECT_STARS = 2

/** tiền khách trả khi nhận hàng: budget linh kiện + tiền công − tiền đền hỏng (case nứt / tuôn ren) */
export const payout = (r: DeliveryResult) => r.reimburse + r.labor - (r.refund ?? 0)

/** phím chưa hàn / hàn cháy: không ăn (PCB hàn) */
export const deadKey = (build: BuildState, id: string) => {
  const j = build.solder[id]
  return !j || (j !== true && j.burnt)
}

interface ScoreInput {
  order: Order
  inventory: Inventory
  build: BuildState
  ctx: BuildContext
  mount: string | null
  spent: number
  screwClicks: number
  brushLevel: number
  /** nguồn ngẫu nhiên (lỗi ẩn khi chưa test hết), mặc định Math.random */
  rng?: () => number
}

// Chấm điểm đơn hàng khi giao (hàm thuần, không đụng tới store)
export function scoreDelivery({
  order,
  inventory,
  build,
  ctx,
  mount,
  spent,
  screwClicks,
  brushLevel,
  rng = Math.random,
}: ScoreInput): DeliveryResult {
  let done = 0
  let total = 0
  for (const st of ctx.steps.filter((x) => isBuildStep(x) && !isOptionalStep(x, order))) {
    const [d, t] = stepProgress(st, build, ctx, screwClicks)
    done += Math.min(d, t)
    total += t
  }
  const completeness = done / total
  const nKeys = ctx.keys.length
  const nTest = Object.keys(build.tested).length
  const match = soundMatch(buildSound(inventory, mount, build, nKeys), order.wish)
  const over = Math.max(0, spent - order.budget)

  const brushQ = TOOLS.brush[brushLevel].quality ?? 0
  // Stab: mod theo đúng mẫu stab. Layout không có stab thì cho đủ điểm
  const stab =
    ctx.stabKeys.length && inventory.stab
      ? stabQuality(inventory.stab.type, build.stabMods, brushQ)
      : { q: 1, notes: [] }
  // Lube switch: theo yêu cầu khách (muốn / không được lube / tuỳ)
  const lube = switchLubeEval({
    switchType: inventory.switch!.type,
    lubeType: build.lubeType,
    lubed: build.lubed,
    nKeys,
    springLube: build.springLube,
    pref: order.lubePref,
    brushQ,
  })
  const lubeCheck: ScoreCheck = {
    label: `Lube switch (${build.lubed}/${nKeys})${lube.notes.length ? ' — ' + lube.notes.join('; ') : ''}`,
    pts: 10,
    got: 10 * lube.q,
  }

  // Mối hàn (chỉ PCB hàn): bóng / xỉn theo loại thiếc, cháy xém thì gần như hỏng
  const soldered = ctx.steps.includes('solder')
  const joints = Object.values(build.solder)
  const burnt = joints.filter((j) => j !== true && j.burnt).length
  const jointQ = joints.length
    ? joints.reduce(
        (a, j) =>
          a +
          (j === true
            ? 0.85
            : j.burnt
              ? 0.15
              : 0.55 + 0.45 * (SUPPLIES[j.wire]?.solder?.shine ?? 0.65)),
        0,
      ) / nKeys
    : 0
  const buildPts = soldered ? 12 : 20

  const checks: ScoreCheck[] = [
    {
      label: `Âm thanh "${SOUND_WISH[order.wish].name}" (khớp ${Math.round(match * 100)}%)`,
      pts: 25,
      got: 25 * match,
    },
    {
      label: 'Đúng màu keycap',
      pts: 10,
      got: inventory.keycap!.color === order.keycapColor ? 10 : 0,
    },
    // khách gửi case thì dặn mount; không gửi case thì chấm màu case shop chọn
    order.mount
      ? { label: 'Đúng kiểu mount khách yêu cầu', pts: 10, got: mount === order.mount ? 10 : 0 }
      : {
          label: order.caseColor ? 'Đúng màu case' : 'Màu case (khách để shop chọn)',
          pts: 10,
          got: !order.caseColor || inventory.case!.color === order.caseColor ? 10 : 0,
        },
    {
      label: `Build hoàn chỉnh (${Math.round(completeness * 100)}%)`,
      pts: buildPts,
      got: buildPts * completeness,
    },
    ...(soldered
      ? [
          {
            label: `Mối hàn đẹp (${Math.round(jointQ * 100)}%)${burnt ? ` — ${burnt} mối cháy xém` : ''}`,
            pts: 8,
            got: 8 * jointQ,
          },
        ]
      : []),
    {
      label: ctx.stabKeys.length
        ? `Stab êm, không lạch cạch (${Math.round(stab.q * 100)}%)${stab.notes.length ? ' — ' + stab.notes.join('; ') : ''}`
        : 'Stab (layout không có stab)',
      pts: 10,
      got: 10 * stab.q,
    },
    lubeCheck,
    { label: `Test phím (${nTest}/${nKeys})`, pts: 5, got: (5 * nTest) / nKeys },
    // khách dặn đúng độ cứng dây O-ring
    ...(order.oring
      ? [
          {
            label: `Dây O-ring ${SUPPLIES[order.oring].name.replace('Dây O-ring ', '')} như khách dặn`,
            pts: 5,
            got: build.ring === order.oring ? 5 : 0,
          },
        ]
      : []),
    // khách dặn lót foam Poron PCB
    ...(order.foam
      ? [{ label: 'Lót foam PCB như khách dặn', pts: 5, got: build.foam ? 5 : 0 }]
      : []),
    {
      label: over ? `Lố ngân sách ${over}k` : `Trong ngân sách (${spent}/${order.budget}k)`,
      pts: 10,
      got: Math.max(0, 10 - (over / order.budget) * 40),
    },
  ]
  // skill check trúng vùng vàng (vặn vít vào + hàn): điểm thưởng theo tỉ lệ thao tác hoàn hảo
  const skillIds = [
    ...ctx.steps
      .filter((st): st is ScrewStep => SCREW_STEPS[st as ScrewStep] === 'tighten')
      .flatMap((st) => ctx.screws[st].map((sc) => sc.id)),
    ...(ctx.steps.includes('solder') ? ctx.keys.map((k) => k.id) : []),
  ]
  if (skillIds.length) {
    const n = skillIds.filter((id) => build.perfect?.[id]).length
    checks.push({
      label: `Thao tác hoàn hảo (vùng vàng) ${n}/${skillIds.length}`,
      pts: PERFECT_BONUS,
      got: (PERFECT_BONUS * n) / skillIds.length,
    })
  }
  // nút lỗi khách báo lại: PCB hàn còn phím chưa hàn / hàn cháy thì chắc chắn lỗi đúng các nút đó;
  // không thì giao khi chưa test hết phím có UNTESTED_FAIL khách gặp 1 nút lỗi trong số phím chưa test
  const label = (k: { label: string; id: string; w: number }) =>
    k.label || (k.w >= 4 ? 'Space' : k.id)
  let defects = soldered ? ctx.keys.filter((k) => deadKey(build, k.id)).map(label) : []
  const untested = ctx.keys.filter((k) => !build.tested[k.id])
  if (!defects.length && untested.length && rng() < UNTESTED_FAIL)
    defects = [label(untested[Math.floor(rng() * untested.length)])]
  if (defects.length)
    checks.push({
      label: `Khách báo nút không nhận tín hiệu: ${defects.slice(0, 6).join(', ')}${defects.length > 6 ? ` (+${defects.length - 6})` : ''}`,
      pts: 0,
      got: -15,
    })
  // hỏng do vặn vít: case nứt thì khách thấy ngay; tuôn ren thì có thể khách không để ý.
  // case hỏng (nứt / ngàm case, lỗ ốc top mount lỏng gõ lọc xọc) đền 80% giá case + trừ uy tín; stab tuôn ren (lỏng) đền bộ stab mới
  const stripped = Object.keys(build.stripped ?? {})
  const stabStrips = stripped.filter((id) => id.startsWith('stab-')).length
  // lỗ ren case (ngàm case, lỗ ốc top mount, lỗ tray mount): tháo / vặn lại case cùng 1 lỗ (open-i = close-i)
  const holes = (ids: string[]) => new Set(ids.map((id) => id.replace(/^(open|close)-/, 'case-')))
  const caseIds = stripped.filter((id) => !id.startsWith('stab-'))
  const caseStrips = holes(caseIds).size
  // tỉ lệ lỗ hỏng cao nhất trong từng loại lỗ: hỏng ít (≤ 1/3) khách khó để ý hơn
  const ratio = Math.max(
    0,
    ...[['open', 'close'], ['top'], ['tray']].map((pre) => {
      const all = holes(
        CASE_SCREW_STEPS.flatMap((st) => ctx.screws[st].map((sc) => sc.id)).filter((id) =>
          pre.includes(id.split('-')[0]),
        ),
      )
      const bad = holes(caseIds.filter((id) => pre.includes(id.split('-')[0])))
      return all.size ? bad.size / all.size : 0
    }),
  )
  const unnoticed = ratio <= 1 / 3 ? STRIP_FEW_UNNOTICED : STRIP_UNNOTICED
  let damage: DeliveryResult['damage']
  let refund = 0
  let repLoss = 0
  const casePrice = inventory.case ? (CASES[inventory.case.id]?.price ?? 0) : 0
  const caseHit = build.cracked || (caseStrips > 0 && rng() >= unnoticed)
  if (caseHit) {
    damage = build.cracked ? 'crack' : 'strip'
    const r = Math.round(casePrice * CASE_REFUND)
    refund += r
    repLoss += CASE_DAMAGE_REP
    checks.push({
      label: build.cracked
        ? `Case nứt khi vặn vít: đền khách ${Math.round(CASE_REFUND * 100)}% giá case (${r}k), −${CASE_DAMAGE_REP} uy tín`
        : `Khách phát hiện ${caseStrips} vít case tuôn ren, gõ lọc xọc: đền ${Math.round(CASE_REFUND * 100)}% giá case (${r}k), −${CASE_DAMAGE_REP} uy tín`,
      pts: 0,
      got: build.cracked ? -25 : -15,
    })
  }
  if (stabStrips && inventory.stab && rng() >= STRIP_UNNOTICED) {
    damage ??= 'stab'
    const r = STABS[inventory.stab.type]?.price ?? 0
    refund += r
    checks.push({
      label: `Khách phát hiện stab tuôn ren, lỏng không vặn được: đền bộ stab mới (${r}k)`,
      pts: 0,
      got: -10,
    })
  }
  const flaws = (['case', 'pcb', 'plate', 'stab', 'keycap'] as const)
    .map((c) => (inventory[c] as { flaw?: string } | null)?.flaw)
    .filter(Boolean)
  if (flaws.length)
    checks.push({
      label: `Linh kiện pass có lỗi: ${flaws.join(', ')}`,
      pts: 0,
      got: -8 * flaws.length,
    })
  const score = Math.max(0, Math.round(checks.reduce((a, c) => a + c.got, 0)))
  const byScore = score >= 90 ? 5 : score >= 75 ? 4 : score >= 55 ? 3 : score >= 35 ? 2 : 1
  const stars = defects.length || damage ? Math.min(DEFECT_STARS, byScore) : byScore
  return {
    checks,
    score,
    stars,
    // khách trả đủ budget linh kiện: mua rẻ hơn thì phần dư vào túi shop, lố thì shop chịu
    reimburse: order.budget,
    labor: Math.round((order.labor * score) / 100),
    ...(defects.length ? { defects } : {}),
    ...(damage ? { damage, refund } : {}),
    ...(repLoss ? { repLoss } : {}),
  }
}
