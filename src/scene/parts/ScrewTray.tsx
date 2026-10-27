import { useEffect, useMemo, useState } from 'react'
import type * as THREE from 'three'
import { useGame, useBuild, useCtx } from '@/store'
import { SCREW_FULL, screwLevel } from '@/data/parts'
import { Y } from '@/data/steps'
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
 * Ốc case đã tháo (bước `caseOpen`) mà chưa vặn lại (`caseScrew`) + ốc tray mount kèm case chưa bắt (`trayScrew`, bấm lần
 * đầu là lấy ra khỏi khay): có khay đựng ốc (`tools.screwTray`) thì nằm gọn trong lòng khay, không có thì vương vãi trên bàn. Đặt góc sau bên trái thảm (sau case, không chồng lên case trên đang tháo).
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
  const shaft =
    ctx.caseDef.material === 'mica' && ctx.screwSide === 'top' ? Y.caseTop - Y.floorBot - 0.06 : 0
  // ốc tray mount chưa bắt (chưa bấm lần nào)
  const trayLeft =
    ctx.mount === 'tray' ? ctx.screws.trayScrew.filter((s) => !b.screws[s.id]).length : 0
  const len = screwLength('caseOpen', shaft)
  const trayLen = screwLength('trayScrew', TRAY_SHAFT)
  const total = n + trayLeft
  const spots = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        if (!hasTray) {
          // vương trên bàn quanh chỗ đặt khay
          const x = (rand(i, 1) - 0.5) * 3.2
          const z = (rand(i, 2) - 0.5) * 2.4
          return { x, y: 0, z, rot: rand(i, 3) * Math.PI * 2 }
        }
        // xếp song song trong lòng khay, đầu ốc so le (thân xen kẽ nhau cho sát); hàng ngoài tì lên thành lòng chảo
        const z = (i - (total - 1) / 2) * 0.22
        const l = i < n ? len : trayLen
        return { x: 0, y: bowlY(Math.hypot(l / 2, z)), z, rot: i % 2 ? Math.PI : 0 }
      }),
    [n, total, hasTray, len, trayLen],
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
          {i < n ? (
            <LooseScrew step="caseOpen" shaft={shaft} />
          ) : (
            <LooseScrew step="trayScrew" shaft={TRAY_SHAFT} />
          )}
        </group>
      ))}
    </group>
  )
}
