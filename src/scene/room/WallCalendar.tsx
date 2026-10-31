import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGame } from '@/store'
import { isSaleDay } from '@/data/sale'
import { calendarStart } from '@/data/calendar'
import { CALENDAR } from './roomLayout'
import { RoomSpot } from './RoomSpot'
import { useRoom } from './roomStore'

// Lịch treo tường lớn phía trên bàn build: 4 tuần quanh hôm nay (ngày trong game), gạch chéo ngày đã qua, hộp xanh ngày có kiện tới,
// khoanh hôm nay, đánh dấu ngày Shopii sale + hạn giao các đơn đang làm. Bấm (đi lại hay ngồi bàn build đều được)
// → popup lịch chi tiết (`CalendarDialog`: kết thúc ngày / làm tiếp).
// Đơn vị mét; gốc = tâm tờ lịch, mặt quay +z

const CW = 520
const CH = 700

interface CalendarData {
  day: number
  /** hạn giao: ngày → tên khách */
  due: Record<number, string[]>
  /** ngày có kiện hàng tới cửa (Shopii / chợ) */
  arrive: Set<number>
}

/** hộp hàng xanh (kiện tới cửa) vẽ ở góc phải trên ô ngày, cạnh `s` px */
function drawBox(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save()
  g.strokeStyle = '#2f6fd6'
  // lót nền giấy cho khỏi lẫn vòng khoanh hôm nay
  g.fillStyle = '#fbf8f1'
  g.fillRect(x - 2, y - 2, s + 4, s + 4)
  g.fillStyle = 'rgba(47,111,214,0.15)'
  g.lineWidth = 3
  g.lineJoin = 'round'
  g.fillRect(x, y + s * 0.25, s, s * 0.75)
  g.strokeRect(x, y + s * 0.25, s, s * 0.75)
  // nắp thùng + băng keo giữa
  g.beginPath()
  g.moveTo(x, y + s * 0.25)
  g.lineTo(x + s * 0.2, y)
  g.lineTo(x + s * 0.8, y)
  g.lineTo(x + s, y + s * 0.25)
  g.moveTo(x + s / 2, y)
  g.lineTo(x + s / 2, y + s * 0.6)
  g.stroke()
  g.restore()
}

function drawCalendar({ day, due, arrive }: CalendarData) {
  const c = document.createElement('canvas')
  c.width = CW
  c.height = CH
  const g = c.getContext('2d')!
  g.fillStyle = '#fbf8f1'
  g.fillRect(0, 0, CW, CH)
  // đầu lịch: dải đỏ + tiêu đề
  g.fillStyle = '#c0392b'
  g.fillRect(0, 0, CW, 150)
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.font = '800 34px system-ui, sans-serif'
  g.fillText('LỊCH XƯỞNG PHÍM', CW / 2, 52)
  g.font = '900 72px system-ui, sans-serif'
  g.fillText(`NGÀY ${day}`, CW / 2, 128)
  // lưới 7 × 4
  const start = calendarStart(day)
  const top = 170
  const cell = CW / 7
  const rowH = 112
  g.strokeStyle = '#d9d2c3'
  g.lineWidth = 2
  for (let i = 0; i < 28; i++) {
    const d = start + i
    const x = (i % 7) * cell
    const y = top + Math.floor(i / 7) * rowH
    g.strokeRect(x + 1, y + 1, cell - 2, rowH - 2)
    if (isSaleDay(d)) {
      g.fillStyle = '#ffe1dc'
      g.fillRect(x + 3, y + 3, cell - 6, rowH - 6)
      g.fillStyle = '#c0392b'
      g.font = '800 18px system-ui, sans-serif'
      g.fillText('SALE', x + cell / 2, y + rowH - 12)
    }
    g.fillStyle = d === day ? '#1e7a44' : '#3a3530'
    g.font = `${d === day ? 900 : 700} 36px system-ui, sans-serif`
    g.fillText(String(d), x + cell / 2, y + 48)
    // hạn giao đơn: chấm cam (tên khách xem ở popup lịch)
    if (due[d]?.length) {
      g.fillStyle = '#e67e22'
      g.beginPath()
      g.arc(x + 14, y + 14, 8, 0, Math.PI * 2)
      g.fill()
    }
    if (d < day) {
      // ngày đã qua: gạch chéo bút đỏ
      g.strokeStyle = 'rgba(192,57,43,0.75)'
      g.lineWidth = 5
      g.beginPath()
      g.moveTo(x + 14, y + 14)
      g.lineTo(x + cell - 14, y + rowH - 14)
      g.moveTo(x + cell - 14, y + 14)
      g.lineTo(x + 14, y + rowH - 14)
      g.stroke()
      g.strokeStyle = '#d9d2c3'
      g.lineWidth = 2
    } else if (d === day) {
      g.strokeStyle = '#1e7a44'
      g.lineWidth = 5
      g.beginPath()
      g.ellipse(x + cell / 2, y + 36, 32, 30, 0, 0, Math.PI * 2)
      g.stroke()
      g.strokeStyle = '#d9d2c3'
      g.lineWidth = 2
    }
    // kiện tới cửa: hộp xanh góc phải trên, vẽ sau cùng nên nằm trên vòng khoanh hôm nay
    if (arrive.has(d)) drawBox(g, x + cell - 24, y + 6, 18)
  }
  // chân lịch: chú thích
  const fy = top + 4 * rowH + 34
  g.textAlign = 'left'
  g.font = '700 19px system-ui, sans-serif'
  g.fillStyle = '#3a3530'
  g.fillText(`Đã làm ${day - 1} ngày`, 14, fy)
  g.fillStyle = '#e67e22'
  g.fillText('● hạn giao', 160, fy)
  drawBox(g, 272, fy - 17, 20)
  g.fillStyle = '#2f6fd6'
  g.fillText('hàng tới', 298, fy)
  g.fillStyle = '#c0392b'
  g.fillText('SALE Shopii', 400, fy)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function WallCalendar(props: JSX.IntrinsicElements['group']) {
  const day = useGame((s) => s.day)
  // hạn giao các đơn đang làm / đang chờ (chuỗi để useMemo so sánh theo giá trị)
  const dueKey = useGame((s) =>
    [...(s.order && !s.result ? [s.order] : []), ...s.jobs.map((j) => j.order)]
      .filter((o) => !o.cancel && o.dueDay)
      .map((o) => `${o.dueDay}:${o.customer}`)
      .join('|'),
  )
  // ngày có kiện tới cửa (chuỗi để so sánh theo giá trị, như dueKey)
  const arriveKey = useGame((s) => [...new Set(s.parcels.map((p) => p.arrive))].sort().join(','))
  const tex = useMemo(() => {
    const due: CalendarData['due'] = {}
    for (const part of dueKey ? dueKey.split('|') : []) {
      const [d, name] = [
        Number(part.slice(0, part.indexOf(':'))),
        part.slice(part.indexOf(':') + 1),
      ]
      ;(due[d] ??= []).push(name)
    }
    const arrive = new Set(arriveKey ? arriveKey.split(',').map(Number) : [])
    return drawCalendar({ day, due, arrive })
  }, [day, dueKey, arriveKey])
  useEffect(() => () => tex.dispose(), [tex])
  const { w, h } = CALENDAR
  return (
    <group {...props}>
      {/* bìa mỏng: viền dày ×2 cho bằng viền bàn */}
      <RoomSpot
        label="Xem lịch / kết thúc ngày"
        outlineScale={2}
        onAct={() => useRoom.setState({ calendar: true })}
      >
        {/* bìa cứng sau tờ lịch */}
        <mesh position-z={0.004} castShadow>
          <boxGeometry args={[w + 0.02, h + 0.02, 0.008]} />
          <meshStandardMaterial color="#6b4a33" roughness={0.8} />
        </mesh>
        <mesh position-z={0.0085}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={tex} roughness={0.9} />
        </mesh>
      </RoomSpot>
      {/* gáy lò xo + đinh treo */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh
          key={i}
          position={[-w / 2 + 0.03 + (i * (w - 0.06)) / 12, h / 2, 0.012]}
          rotation-y={Math.PI / 2}
        >
          <torusGeometry args={[0.008, 0.0016, 6, 12]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, h / 2 + 0.04, 0.006]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.004, 0.004, 0.02, 8]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}
