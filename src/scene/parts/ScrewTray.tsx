import { useEffect, useMemo, useState } from 'react'
import type * as THREE from 'three'
import { useGame, useBuild, useCtx } from '@/store'
import { SCREW_FULL, screwLevel } from '@/data/parts'
import { DTB_MM, Y, caseScrewShaft } from '@/data/steps'
import { playClick } from '@/sound'
import { Clickable } from '../stations/StationKit'
import { bowlY, createScrewTray } from '../models/screwTrayModel'
import { SPIN_MS } from '../models/HandTools'
import { LooseScrew, OUT_MS, TRAY_SHAFT, screwLength } from './Screw'

/** số giả ngẫu nhiên cố định theo thứ tự ốc (ốc không nhảy chỗ mỗi lần vẽ lại) */
const rand = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Ốc case đã tháo (bước `caseOpen`) mà chưa vặn lại (`caseScrew`) + ốc tray mount / ốc M2 top mount kèm case chưa bắt
 * (`trayScrew` / `topScrew`, bấm lần đầu là lấy ra khỏi khay) + ốc stab screw-in chưa bắt (`stabScrew`, có sẵn từ đầu build:
 * tới bước lắp stab là thấy ốc để bắt): có khay đựng ốc (`tools.screwTray`) thì nằm gọn trong lòng khay, không có thì vương vãi trên bàn. Đặt góc sau bên trái thảm (sau case, không chồng lên case trên đang tháo).
 * Bấm khay để đổi màu (`nextTrayColor`). Khay chỉ để gọn, không tăng chỉ số
 */
export function ScrewTray() {
  const ctx = useCtx()
  const b = useBuild()
  const hasTray = useGame((s) => (s.tools.screwTray ?? 0) > 0)
  const color = useGame((s) => s.trayColor)
  const tray = useMemo(() => createScrewTray(color), [color])
  useEffect(
    () => () =>
      tray.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
      }),
    [tray],
  )
  const electric = useGame((s) => screwLevel(s.tools, s.screwPick) > 0)
  // ốc chỉ vào khay khi hoạt cảnh tháo xong (tua vít quay hết + ốc bay ra khỏi lỗ), không phải lúc vừa bấm;
  // ốc đã tháo sẵn lúc vào bàn (tải lại) thì có trong khay luôn, hoàn tác thì bỏ ra ngay
  const key = ctx.screws.caseOpen
    .filter((s) => (b.screws[s.id] ?? 0) >= SCREW_FULL)
    .map((s) => s.id)
    .join(',')
  const [landed, setLanded] = useState(() => new Set(key ? key.split(',') : []))
  useEffect(() => {
    const ids = key ? key.split(',') : []
    const delay = (electric ? SPIN_MS.electric : SPIN_MS.manual) + OUT_MS
    const timers = [
      setTimeout(() => setLanded((prev) => new Set([...prev].filter((id) => ids.includes(id)))), 0),
      ...ids.map((id) =>
        setTimeout(() => setLanded((prev) => (prev.has(id) ? prev : new Set(prev).add(id))), delay),
      ),
    ]
    return () => timers.forEach(clearTimeout)
  }, [key, electric])
  const removed = key ? key.split(',').filter((id) => landed.has(id)).length : 0
  const back = ctx.screws.caseScrew.filter((s) => (b.screws[s.id] ?? 0) > 0).length
  const n = Math.max(0, removed - back)
  // đúng ốc trên case: cùng model / cỡ với bước tháo vít, case mica vít xuyên mọi lớp thì dài như lúc bắt (ScrewSet)
  const shaft = caseScrewShaft(ctx.caseDef)
  // ốc tray mount chưa bắt (chưa bấm lần nào)
  const trayLeft =
    ctx.mount === 'tray' ? ctx.screws.trayScrew.filter((s) => !b.screws[s.id]).length : 0
  // ốc M2 top mount kèm case chưa bắt: nằm sẵn trên khay tới bước bắt plate vào case trên
  const topLeft = ctx.steps.includes('topScrew')
    ? ctx.screws.topScrew.filter((s) => !b.screws[s.id]).length
    : 0
  // ốc stab screw-in chưa bắt: nằm sẵn từ đầu (khách / shop có đủ ốc theo bộ stab), bắt con nào bớt con đó
  const stabLeft = ctx.steps.includes('stabScrew')
    ? ctx.screws.stabScrew.filter((s) => !b.screws[s.id]).length
    : 0
  const len = screwLength('caseOpen', shaft)
  const trayLen = screwLength('trayScrew', TRAY_SHAFT)
  const topLen = screwLength('topScrew')
  const stabLen = screwLength('stabScrew')
  // ốc tạ che DTB đã tháo (bước coverOff) mà chưa siết lại (coverOn): chờ hoạt cảnh bay ra xong như ốc case
  const coverOut = Object.keys(b.cover?.out ?? {}).length
  const coverBack = Object.keys(b.cover?.tight ?? {}).length
  const coverN = Math.max(0, coverOut - coverBack)
  // 2 vít M2 bắt DTB: nằm sẵn trên khay (lỗ ren sàn case để trống) tới khi siết qua lỗ DTB
  const dtbN = ctx.dtb
    ? Math.max(0, DTB_MM.holes.length - Object.keys(b.dtb?.screws ?? {}).length)
    : 0
  const total = n + trayLeft + topLeft + stabLeft + coverN + dtbN
  // thứ tự ốc trong khay: case tháo ra → tray → top → stab → ốc tạ → vít DTB
  const kindOf = (i: number) =>
    i < n
      ? 'case'
      : i < n + trayLeft
        ? 'tray'
        : i < n + trayLeft + topLeft
          ? 'top'
          : i < n + trayLeft + topLeft + stabLeft
            ? 'stab'
            : i < n + trayLeft + topLeft + stabLeft + coverN
              ? 'cover'
              : 'dtb'
  const spots = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        if (!hasTray) {
          // vương trên bàn quanh chỗ đặt khay
          const x = (rand(i, 1) - 0.5) * 3.2
          const z = (rand(i, 2) - 0.5) * 2.4
          return { x, y: 0, z, rot: rand(i, 3) * Math.PI * 2 }
        }
        // thả lộn xộn trong lòng khay: chỗ + hướng ngẫu nhiên cố định theo thứ tự, càng xa tâm càng tì lên thành lòng chảo;
        // nhiều ốc thì chồng hơi cao lên (đè lên nhau)
        const a = rand(i, 4) * Math.PI * 2
        const r = Math.sqrt(rand(i, 5)) * 0.62
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const rot = rand(i, 6) * Math.PI * 2
        const l = {
          case: len,
          tray: trayLen,
          top: topLen,
          stab: stabLen,
          cover: 0.3,
          dtb: topLen,
        }[kindOf(i)]
        // đầu / mũi ốc xa tâm nhất (thân dọc trục x sau khi xoay rot)
        const reach = Math.hypot(x, z) + l / 2
        const stack = Math.floor(i / 7) * 0.05
        return { x, y: bowlY(Math.min(reach, 1.12)) + stack, z, rot }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kindOf dẫn xuất từ n / trayLeft / topLeft / stabLeft
    [n, trayLeft, topLeft, stabLeft, coverN, total, hasTray, len, trayLen, topLen, stabLen],
  )
  if (!hasTray && !total) return null
  return (
    // mặt thảm cắt (như SolderKit), góc sau bên trái board; mũi khay chĩa ra sau
    <group position={[-ctx.width / 2 + 1.5, Y.table + 0.08, -ctx.depth / 2 - 4]} rotation-y={-0.6}>
      {hasTray && (
        <Clickable
          active
          onAct={(e) => {
            e.stopPropagation()
            useGame.getState().nextTrayColor()
            playClick(800)
          }}
        >
          <primitive object={tray} />
        </Clickable>
      )}
      {spots.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} rotation-y={p.rot}>
          {kindOf(i) === 'case' ? (
            <LooseScrew step="caseOpen" shaft={shaft} />
          ) : kindOf(i) === 'tray' ? (
            <LooseScrew step="trayScrew" shaft={TRAY_SHAFT} />
          ) : kindOf(i) === 'top' ? (
            <LooseScrew step="topScrew" />
          ) : kindOf(i) === 'stab' ? (
            <LooseScrew step="stabScrew" />
          ) : kindOf(i) === 'dtb' ? (
            // vít M2 đầu trụ bắt DTB (cùng kiểu ốc top mount)
            <LooseScrew step="topScrew" />
          ) : (
            // ốc tạ (ốc nón đầu bằng, cùng kiểu ốc tháo case)
            <LooseScrew step="caseOpen" />
          )}
        </group>
      ))}
    </group>
  )
}
