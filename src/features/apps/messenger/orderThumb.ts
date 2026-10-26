import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { BLOCKER_SKIN, BLOCKER_TOP, blockerGaps, getLayout, keyRegions } from '@/data/layouts'
import { CASES, CASE_COLORS, KEYCAP_COLORS, KEYCAP_KITS, caseFits, caseModelOf } from '@/data/parts'
import { CASE_MARGIN, CASE_WALL, Y, caseScrewHoles, feetPockets } from '@/data/steps'
import { MM } from '@/scene/models/Switch'
import { caseShellGeometry, micaStack } from '@/scene/parts/caseShell'
import { WEIGHT_METALS, WOOD_TEX, prepWood, woodTexFor, woodUV } from '@/scene/materials'
import { boardOutline, outlineSlab } from '@/scene/parts/boardOutline'
import { capGeometry, keycapModel, keycapShape, stretchCap } from '@/scene/models/keycapShape'
import type { FormFactor, Key, LayoutId, Order, Variant } from '@/types'
import { cachedThumb, glbMeshes, glbScene } from '../shop/modelThumb'

// Ảnh minh hoạ đơn hàng: ghép bàn phím hoàn chỉnh (case CAD thật nếu có + keycap theo layout),
// phối màu theo yêu cầu khách; khách không dặn màu case thì bốc ngẫu nhiên (cố định theo mã đơn)

/** số ngẫu nhiên ổn định theo mã đơn (ảnh không đổi mỗi lần mở lại) */
function seeded(id: string) {
  let h = 2166136261
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/** case + màu case của đơn: kit khách gửi → đúng case đó; đơn full → case rẻ nhất cùng cỡ */
export function orderLook(order: Order) {
  const rnd = seeded(order.id)
  const kits = Object.keys(KEYCAP_KITS).filter(
    (id) => !KEYCAP_KITS[id].hidden && KEYCAP_KITS[id].layouts.includes(order.layout),
  )
  // khách đã đặt bộ keycap thì dùng đúng bộ đó; đơn cũ chưa có thì bốc theo mã đơn
  const picked = kits[Math.floor(rnd() * kits.length)]
  const keycapKit = order.keycapKit && KEYCAP_KITS[order.keycapKit] ? order.keycapKit : picked
  if (order.kit?.case)
    return { caseId: order.kit.case.id, color: order.kit.case.color, keycapKit, rnd }
  const ids = Object.keys(CASES).filter((id) => caseFits(CASES[id], order.layout))
  const caseId = ids[Math.floor(rnd() * ids.length)]
  const colors = CASES[caseId].colors
  const color =
    order.caseColor && colors.includes(order.caseColor)
      ? order.caseColor
      : colors[Math.floor(rnd() * colors.length)]
  return { caseId, color, keycapKit, rnd }
}

const texLoader = new THREE.TextureLoader()
const woodCache = new Map<string, Promise<THREE.MeshStandardMaterial>>()
/** Vật liệu gỗ thật cho case gỗ (cùng bộ vân với bàn build) */
function woodMaterial(color: string) {
  if (!woodCache.has(color))
    woodCache.set(
      color,
      Promise.all(
        Object.entries(woodTexFor(color)).map(async ([k, url]) => [
          k,
          await texLoader.loadAsync(url),
        ]),
      ).then((entries) => {
        const maps = prepWood(Object.fromEntries(entries))
        return new THREE.MeshStandardMaterial({
          ...maps,
          color: WOOD_TEX[color] ? '#ffffff' : (CASE_COLORS[color]?.hex ?? '#ffffff'),
        })
      }),
    )
  return woodCache.get(color)!
}

/** Vật liệu vỏ case theo chất liệu + màu (trong suốt: acrylic / mica / PC màu trong) */
async function shellMaterial(material: string, color: string) {
  if (material === 'wood') return (await woodMaterial(color)).clone()
  const clear = color === 'clear' || material === 'acrylic' || material === 'mica'
  const pc = material === 'pc'
  return new THREE.MeshPhysicalMaterial({
    color: CASE_COLORS[color]?.hex ?? '#888',
    roughness: material === 'anod' ? 0.35 : material === 'acrylic' ? 0.08 : pc ? 0.35 : 0.55,
    metalness: material === 'anod' ? 0.6 : 0,
    // PC mờ: trong mờ như bàn build (thấy lờ mờ bên trong)
    transmission: pc ? 0.9 : 0,
    thickness: pc ? 0.5 : 0,
    ior: pc ? 1.58 : 1.5,
    transparent: clear || pc,
    opacity: color === 'clear' ? 0.55 : clear ? 0.75 : pc ? 0.6 : 1,
    depthWrite: !(clear || pc),
  })
}

/** Mọi thứ cần để ghép 1 bàn phím hoàn chỉnh */
export interface KeyboardSpec {
  layout: LayoutId
  variant: Variant
  caseId: string
  /** màu case */
  color: string
  keycapKit: string
  keycapColor: string
  /** màu keycap phím chức năng */
  accent: string
  /** phối màu riêng từng phím (hex), không trả về thì theo màu chính / màu nhấn (bàn phím chưng trên kệ) */
  capOf?: (k: Key) => string | undefined
}

/** Bàn phím của đơn: case / keycap theo đơn, phím chức năng phối màu nhấn cố định theo mã đơn */
export function orderSpec(order: Order): KeyboardSpec {
  const { caseId, color, keycapKit, rnd } = orderLook(order)
  const main = KEYCAP_COLORS[order.keycapColor]
  const others = Object.values(KEYCAP_COLORS).filter((c) => c !== main)
  const accent = rnd() < 0.5 ? main.legend : others[Math.floor(rnd() * others.length)].hex
  return {
    layout: order.layout,
    variant: order.variant,
    caseId,
    color,
    keycapKit,
    keycapColor: order.keycapColor,
    accent,
  }
}

/** Layout mặc định cho từng cỡ case (ảnh case trên Shopii) */
const FF_LAYOUT: Record<FormFactor, LayoutId> = {
  '40': '40',
  '60': '60',
  '65': '65',
  '75': '75',
  frl: 'frl',
  tkl: 'tkl',
  full: 'full',
  planck: 'planck',
  alice: 'alice',
}

/** Bàn phím trưng bày cho 1 case (Shopii): layout theo cỡ case, keycap Cherry trắng chữ đen */
export function caseSpec(caseId: string, color: string): KeyboardSpec {
  // case chỉ hợp vài layout (vd HHKB) thì lấy layout đầu tiên, không thì theo form factor
  const layout = CASES[caseId].layouts?.[0] ?? FF_LAYOUT[CASES[caseId].ff]
  const keycapKit = 'full'
  return {
    layout,
    variant: {},
    caseId,
    color,
    keycapKit,
    keycapColor: 'white',
    accent: KEYCAP_COLORS.white.legend,
  }
}

/** Dựng bàn phím của đơn (đơn vị u, mặt trên plate ở y = 0). tilt: nghiêng sẵn cho ảnh chụp */
const buildKeyboard = (order: Order, tilt = true) => buildKeyboardModel(orderSpec(order), tilt)

/**
 * Ghép bàn phím hoàn chỉnh từ spec: case (CAD thật nếu có) → PCB → plate → switch → keycap → khối chặn.
 * caseOnly: chỉ dựng vỏ case (+ khối chặn liền case) cho ảnh / khung xem case trên Shopii
 */
export async function buildKeyboardModel(spec: KeyboardSpec, tilt = true, caseOnly = false) {
  const { caseId, color, keycapKit } = spec
  const profile = KEYCAP_KITS[keycapKit].profile
  const { keys, width, depth, origin, outline } = getLayout(spec.layout, spec.variant)
  const def = CASES[caseId]
  const group = new THREE.Group()
  const caseMat = await shellMaterial(def.material, color)
  // case 2 tông: đáy chất liệu / màu riêng
  const bottomMat = def.bottom
    ? await shellMaterial(def.bottom.material, def.bottom.color)
    : caseMat
  const caseModel = caseModelOf(def, spec.layout, spec.variant)
  if (caseModel) {
    const n = await glbMeshes(`/models/cases/${caseModel}.glb`)
    // STL in 3D hay có mặt lật chiều → vẽ 2 mặt
    caseMat.side = THREE.DoubleSide
    const m = new THREE.Mesh(n.case.geometry, caseMat)
    m.scale.setScalar(MM)
    m.position.set(-origin[0], Y.floorBot, -origin[1])
    group.add(m)
    if (n.bottom) {
      bottomMat.side = THREE.DoubleSide
      const b = new THREE.Mesh(n.bottom.geometry, bottomMat)
      b.scale.setScalar(MM)
      b.position.copy(m.position)
      group.add(b)
    }
    // tạ / badge: kim loại riêng
    if (n.weight) {
      const w = new THREE.Mesh(
        n.weight.geometry,
        new THREE.MeshStandardMaterial({
          ...WEIGHT_METALS[def.weight ?? 'brass'],
          side: THREE.DoubleSide,
        }),
      )
      w.scale.setScalar(MM)
      w.position.copy(m.position)
      group.add(w)
    }
  } else {
    const W = width + 2 * (CASE_MARGIN + CASE_WALL)
    const D = depth + 2 * (CASE_MARGIN + CASE_WALL)
    // 4 hốc feet tròn CNC lõm dưới đáy (case CAD có hốc sẵn trong model)
    const pockets = feetPockets(undefined, width, depth, origin)
    // case 2 mảnh: lỗ vít ở đáy (nhôm / PC / acrylic) hoặc xuyên mọi lớp (mica ghép)
    const screwHoles = caseScrewHoles(def, width, depth)
    if (def.material === 'mica') {
      // mica: tấm cắt phẳng xếp chồng (2 lớp dưới là đáy liền), giống bàn build
      // tấm trên mặt plate khoét theo vùng phím: khung chặn liền tấm mica trên cùng
      group.add(
        micaStack(
          W,
          D,
          Y.floorBot,
          Y.caseTop,
          CASE_WALL,
          caseMat,
          2,
          pockets,
          screwHoles,
          keyRegions(keys, width, depth),
        ),
      )
    } else {
      // vỏ liền 1 khối (vành + sàn đáy) như bàn build; case 2 mảnh: phần dưới (đáy riêng màu) + vành trên
      const shell = (y0: number, y1: number, mat: THREE.Material, floor?: number) => {
        // phần có sàn (đáy) thì khoét 4 hốc feet CNC như bàn build
        const g = caseShellGeometry(
          W,
          D,
          y0,
          y1,
          CASE_WALL,
          floor,
          floor === undefined ? [] : [...pockets, ...screwHoles],
        )
        group.add(new THREE.Mesh(def.material === 'wood' ? woodUV(g) : g, mat))
      }
      if (def.pieces === 2) {
        shell(Y.floorBot, Y.split, bottomMat, Y.floorTop)
        shell(Y.split, Y.caseTop, caseMat)
      } else shell(Y.floorBot, Y.caseTop, def.bottom ? bottomMat : caseMat, Y.floorTop)
    }
  }
  // lớp giữa case và keycap theo cao độ Y của bàn build: PCB → plate → housing switch từng phím
  // (case thấp như Planck không còn hở khúc giữa)
  // PCB / plate theo đường viền layout (Alice: 2 nửa xoay)
  const pcb = new THREE.Mesh(
    outlineSlab(boardOutline(keys, width, depth, 0, outline).shapes, Y.pcbBot, Y.pcbTop),
    new THREE.MeshStandardMaterial({ color: '#1d6b3a', roughness: 0.6 }),
  )
  const plate = new THREE.Mesh(
    outlineSlab(boardOutline(keys, width, depth, 0.01, outline).shapes, Y.plateBot, 0),
    new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: 0.7, roughness: 0.35 }),
  )
  // board (PCB → keycap) gom 1 khối: case CAD cao / có góc gõ thì đặt theo seat như trên bàn build
  const board = new THREE.Group()
  if (!caseOnly) board.add(pcb, plate)
  const housing = new THREE.BoxGeometry(14 * MM, 0.3, 14 * MM).translate(0, 0.15, 0)
  const housingMat = new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.5 })
  for (const k of caseOnly ? [] : keys) {
    const sw = new THREE.Mesh(housing, housingMat)
    sw.position.set(k.cx, 0, k.cz)
    sw.rotation.y = k.rot
    board.add(sw)
  }

  // keycap: màu chính theo yêu cầu khách, phím chức năng phối màu nhấn (màu chữ hoặc 1 màu khác)
  const main = KEYCAP_COLORS[spec.keycapColor]
  const accent = spec.accent
  const side = THREE.DoubleSide
  const mainMat = new THREE.MeshStandardMaterial({ color: main.hex, roughness: 0.55, side })
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.55, side })
  const isMod = (label: string) => label.length > 1 || label === ''
  const ownMats = new Map<string, THREE.MeshStandardMaterial>()
  const capMat = (hex: string) => {
    if (!ownMats.has(hex))
      ownMats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, side }))
    return ownMats.get(hex)!
  }
  for (const k of caseOnly ? [] : keys) {
    const own = spec.capOf?.(k)
    const mat = own ? capMat(own) : isMod(k.label) && k.code !== 'Space' ? accentMat : mainMat
    // cả bàn 1 profile: model CAD 1u (phím rộng kéo dãn), ASA chưa có CAD thì dựng theo thông số
    const model = keycapModel(profile, k.row)
    let cap: THREE.Object3D
    if (model) {
      cap = (await glbScene(`/models/keycaps/${model}.glb`)).clone(true)
      cap.traverse((part) => {
        if ((part as THREE.Mesh).isMesh) (part as THREE.Mesh).material = mat
      })
      stretchCap(cap, k.w, k.h)
    } else
      cap = new THREE.Mesh(capGeometry(k.w - 0.08, k.h - 0.08, keycapShape(profile, k.row)), mat)
    cap.position.set(k.cx, 0.36, k.cz)
    cap.rotation.y = k.rot
    board.add(cap)
  }
  // khối chặn liền case ở chỗ trống hàng dưới (HHKB, WKL...)
  // case CAD cao hơn: khối chặn tới BLOCKER_TOP; case dựng bằng code thì ngang mép trên case
  // case CAD nghiêng (board thấp theo mặt nêm): khối chặn thấp ngang mặt khung, không nhô giữa hàng phím
  const blockTop = caseModel ? (def.seat?.tilt ? 0.3 : BLOCKER_TOP) : Y.caseTop
  // mica: khung chặn đã nằm trong tấm mica trên cùng
  const blocks =
    !caseModel && def.material === 'mica' ? [] : blockerGaps(keys, width, depth, CASE_MARGIN + 0.05)
  for (const bl of blocks) {
    // tấm khung mỏng ở mặt trên, bên dưới rỗng (như bàn build)
    const t = bl.top ?? blockTop
    const h = Math.min(BLOCKER_SKIN, t - Y.plateBot)
    const block = new THREE.Mesh(new THREE.BoxGeometry(bl.w, h, bl.d), caseMat)
    block.position.set(bl.x, t - h / 2, bl.z)
    board.add(block)
  }
  // nghiêng bàn phím cho thấy mặt trên + cạnh trước
  if (def.seat) {
    board.position.y = def.seat.rise
    board.position.z = def.seat.dz ?? 0
    board.position.x = def.seat.dx ?? 0
    board.rotation.x = def.seat.tilt
  }
  group.add(board)
  if (tilt) group.rotation.set(0.95, 0, 0)
  return group
}

/** Ảnh bàn phím của đơn (null khi đang chụp / máy không có WebGL) */
export function useOrderThumb(order: Order) {
  const [url, setUrl] = useState<{ id: string; src: string | null } | null>(null)
  useEffect(() => {
    let alive = true
    cachedThumb(`order:${order.id}`, () => buildKeyboard(order)).then(
      (src) => alive && setUrl({ id: order.id, src }),
    )
    return () => {
      alive = false
    }
  }, [order])
  return url?.id === order.id ? url.src : null
}

/** Ảnh case trên Shopii: chỉ vỏ case đúng màu option đang chọn */
export function useCaseThumb(caseId: string | undefined, color: string | undefined) {
  const key = caseId && color ? `caseonly:${caseId}:${color}` : null
  const [shot, setShot] = useState<{ key: string; src: string | null } | null>(null)
  useEffect(() => {
    if (!key || !caseId || !color) return
    let alive = true
    cachedThumb(key, () => buildKeyboardModel(caseSpec(caseId, color), true, true)).then(
      (src) => alive && setShot({ key, src }),
    )
    return () => {
      alive = false
    }
  }, [key, caseId, color])
  return shot?.key === key ? shot.src : null
}
