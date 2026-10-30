import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Clone, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, useBuild, useCtx, useStep } from '@/store'
import { DTB_MM, USB_PORT_MM, Y } from '@/data/steps'
import { playClick } from '@/sound'
import { lerpTo } from '../common/anim'
import { useHover } from '../common/useHover'
import { HINT_COLOR, HINT_HOVER } from '../common/hoverOutline'
import { HintArrow } from '../stations/StationKit'
import { MM } from '../models/Switch'
import type { WallPort } from './caseShell'

// Daughterboard ai03 Unified C3 (MIT, `bun run convert:dtb`) bắt vào sàn case sát vách sau, cổng USB-C ló ra lỗ khoét vách;
// dây JST SH 4 pin (dựng bằng code: 2 đầu cắm + 4 sợi dây AWG28) nối DTB với cổng JST mặt dưới PCB.
// Toạ độ trong file: u, gốc = tâm mặt dưới DTB trên sàn case (trừ `PcbJst` nằm trong hệ board)

const DTB_GLB = '/models/dtb/unified-c3.glb'
const SCREW_GLB = '/models/screws/socket-cap-m2x6.glb'
useGLTF.preload(DTB_GLB)

/** khe chừa trên gờ đỡ trong lòng case cho DTB (u) */
export const DTB_GAP = (DTB_MM.w + 2) * MM
/** lỗ cổng USB-C khoét xuyên vách sau case (tâm ngang tâm cổng USB-C của DTB nằm trên sàn) */
export const usbPort = (x: number): WallPort => ({
  x,
  y: Y.floorTop + DTB_MM.usb.y * MM,
  w: USB_PORT_MM.w * MM,
  h: USB_PORT_MM.h * MM,
  r: USB_PORT_MM.r * MM,
})

/** cổng JST trên PCB: lệch sang phải + tới trước so với DTB (dây chạy chéo dưới PCB), miệng quay ra sau (−z) */
const PCB_JST = { dx: 0.9, dz: 1.2 }
/** đầu cắm dây (SHR-04V-S, mm): rộng, cao, dài; cắm lút vào cổng `IN` */
const PLUG = { w: 5, h: 2.4, l: 4.2, in: 2 }
/** dây 4 sợi bước 1mm (VBUS / D− / D+ / GND), bán kính sợi (mm) */
const WIRES = ['#d63a2f', '#f2f2f2', '#3aa457', '#1d1d1f']
const WIRE_R = 0.42
/** độ cao cổng JST trên PCB so với sàn case (cổng treo ngược dưới mặt PCB, tâm miệng thấp hơn mặt dưới PCB 1,45mm) */
const PCB_MOUTH_Y = Y.pcbBot - Y.floorTop - 1.45 * MM

const plugGeo = new THREE.BoxGeometry(PLUG.w * MM, PLUG.h * MM, PLUG.l * MM)
const plugMat = new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.6 })
const wireMats = WIRES.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }))
const ghostMat = (hover: boolean) => (
  <meshBasicMaterial
    color={hover ? HINT_HOVER : HINT_COLOR}
    transparent
    opacity={hover ? 0.85 : 0.5}
    depthWrite={false}
  />
)

type Nodes = Record<string, THREE.Mesh>

/** mạch DTB (mạch đen + cổng USB-C + linh kiện + cổng JST); ghost = khối xanh chờ đặt */
function DtbModel({ ghost }: { ghost?: ReactNode }) {
  const { nodes } = useGLTF(DTB_GLB) as unknown as { nodes: Nodes }
  return (
    <group scale={MM}>
      {['pcb', 'usb', 'parts', 'jst'].map((n) => (
        <mesh
          key={n}
          geometry={nodes[n].geometry}
          material={ghost ? undefined : nodes[n].material}
          castShadow={!ghost}
          receiveShadow
        >
          {ghost}
        </mesh>
      ))}
    </group>
  )
}

/** vật bấm được (chấm xanh / khối mờ), viền sáng khi rê chuột */
function Target({
  children,
  onPick,
}: {
  children: (hover: boolean) => ReactNode
  onPick: () => void
}) {
  const { hover, bind } = useHover(true)
  return (
    <group
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onPick()
      }}
      {...bind}
    >
      {children(hover)}
    </group>
  )
}

/** đầu cắm dây JST: `at` = miệng cổng, `dir` = hướng dây chạy ra (+1 tới trước / −1 ra sau) */
function Plug({ at, dir, mat }: { at: THREE.Vector3; dir: 1 | -1; mat?: ReactNode }) {
  return (
    <mesh
      geometry={plugGeo}
      material={mat ? undefined : plugMat}
      position={[at.x, at.y, at.z + dir * (PLUG.l / 2 - PLUG.in) * MM]}
      castShadow
    >
      {mat}
    </mesh>
  )
}

/** 4 sợi dây từ đuôi đầu cắm DTB (a, chạy tới +z) tới đuôi đầu cắm còn lại (b, dây vào từ −z) */
function wireGeometries(a: THREE.Vector3, b: THREE.Vector3) {
  const lead = 0.3
  return WIRES.map((_, i) => {
    const off = new THREE.Vector3((i - 1.5) * MM, 0, 0)
    const pts = [
      a.clone(),
      a.clone().add(new THREE.Vector3(0, 0, lead)),
      b.clone().add(new THREE.Vector3(0, 0, -lead)),
      b.clone(),
    ].map((p) => p.add(off))
    // dây dài, chùng xuống giữa 2 đầu khi 2 đầu gần nhau (nằm dưới PCB)
    const mid = pts[1].clone().lerp(pts[2], 0.5)
    mid.y = Math.min(pts[1].y, pts[2].y) + 0.05
    pts.splice(2, 0, mid)
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, WIRE_R * MM, 6)
  })
}

/** dây JST: đầu DTB cắm sẵn; đầu kia nằm trong case (chưa cắm) hoặc cắm vào cổng PCB, theo board nhấc lên / thả xuống */
function JstCable() {
  const step = useStep()
  const b = useBuild()
  const plugJst = useGame((s) => s.plugJst)
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const lift = useRef<THREE.Group>(null)
  const plugged = !!b.jst
  // board nhấc khi chờ cắm dây / chờ thả vào case (khớp `lifted` trong Board)
  const lifted = (step === 'caseIn' && !b.inCase) || step === 'jst'
  const mouth = useMemo(() => new THREE.Vector3(0, DTB_MM.jst.y * MM, DTB_MM.jst.z * MM), [])
  const tailA = useMemo(
    () => mouth.clone().add(new THREE.Vector3(0, 0, (PLUG.l - PLUG.in) * MM)),
    [mouth],
  )
  // đầu chưa cắm nằm trên sàn case trước DTB
  const loose = useMemo(
    () => new THREE.Vector3(PCB_JST.dx * 0.7, (PLUG.h / 2) * MM, mouth.z + PCB_JST.dz + 0.4),
    [mouth],
  )
  const pcbMouth = (y: number) =>
    new THREE.Vector3(PCB_JST.dx, PCB_MOUTH_Y + y, mouth.z + PCB_JST.dz)
  const last = useRef(NaN)
  useFrame((_, dt) => {
    lerpTo(lift, 'y', lifted ? 2.6 : 0, dt, 6)
    const y = plugged ? (lift.current?.position.y ?? 0) : -1
    if (Math.abs(y - last.current) < 1e-4) return
    last.current = y
    const end = plugged ? pcbMouth(y) : loose
    const tailB = end.clone().add(new THREE.Vector3(0, 0, -(PLUG.l - PLUG.in) * MM))
    wireGeometries(tailA, tailB).forEach((g, i) => {
      const m = meshes.current[i]
      if (!m) return g.dispose()
      m.geometry.dispose()
      m.geometry = g
    })
  })
  useEffect(() => {
    last.current = NaN
  }, [plugged])
  const active = step === 'jst' && !plugged
  return (
    <group>
      {/* bộ đếm độ nhấc board (không vẽ gì) */}
      <group ref={lift} />
      <Plug at={mouth} dir={1} />
      {WIRES.map((_, i) => (
        <mesh key={i} ref={(m) => void (meshes.current[i] = m)} material={wireMats[i]} castShadow>
          <bufferGeometry />
        </mesh>
      ))}
      {plugged ? (
        <PlugOnBoard lift={lift} at={pcbMouth(0)} />
      ) : active ? (
        <>
          <Target
            onPick={() => {
              plugJst()
              playClick(1300)
            }}
          >
            {(hover) => <Plug at={loose} dir={-1} mat={ghostMat(hover)} />}
          </Target>
          <Plug at={loose} dir={-1} />
          <HintArrow at={[loose.x, loose.y + 0.05, loose.z]} size={0.8} />
        </>
      ) : (
        <Plug at={loose} dir={-1} />
      )}
    </group>
  )
}

/** đầu cắm đã cắm vào cổng PCB: đi theo board */
function PlugOnBoard({ lift, at }: { lift: RefObject<THREE.Group>; at: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current && lift.current) ref.current.position.y = lift.current.position.y
  })
  return (
    <group ref={ref}>
      <Plug at={at} dir={-1} />
    </group>
  )
}

/** cổng JST SH 4 pin trên PCB bàn phím (hệ board): treo ngược dưới mặt PCB, miệng quay ra sau đón dây từ DTB */
export function PcbJst() {
  const { dtb } = useCtx()
  const { nodes } = useGLTF(DTB_GLB) as unknown as { nodes: Nodes }
  if (!dtb) return null
  return (
    <group
      position={[dtb.x + PCB_JST.dx, Y.pcbBot, dtb.z + DTB_MM.jst.z * MM + PCB_JST.dz]}
      rotation-x={Math.PI}
    >
      {/* cổng trong model DTB: đáy ở y 1,65mm, miệng ở z 7,8mm → dời về gốc rồi lật ngược (miệng quay −z) */}
      <mesh
        geometry={nodes.jst.geometry}
        material={nodes.jst.material}
        scale={MM}
        position={[0, -1.65 * MM, -DTB_MM.jst.z * MM]}
        castShadow
      />
    </group>
  )
}

/** Daughterboard trong case dưới: bước `dtb` đặt mạch → bắt vít M2 → cắm dây JST; từ đó trở đi nằm cố định trong case */
export function Daughterboard({ at }: { at: { x: number; z: number } }) {
  const step = useStep()
  const d = useBuild().dtb ?? {}
  const { placeDtb, screwDtb, plugDtb } = useGame.getState()
  const active = step === 'dtb'
  const screws = d.screws ?? {}
  const nextHole = d.placed ? DTB_MM.holes.findIndex((_, i) => !screws[i]) : -1
  const mouth: [number, number, number] = [0, DTB_MM.jst.y * MM, DTB_MM.jst.z * MM]
  const headY = (DTB_MM.t + 2) * MM
  const screwModel = useGLTF(SCREW_GLB).scene
  if (!d.placed && !active) return null
  return (
    <group position={[at.x, Y.floorTop, at.z]}>
      {d.placed ? (
        <DtbModel />
      ) : (
        <>
          <Target
            onPick={() => {
              placeDtb()
              playClick(800)
            }}
          >
            {(hover) => (
              <group position-y={0.25}>
                <DtbModel ghost={ghostMat(hover)} />
              </group>
            )}
          </Target>
          <HintArrow at={[0, 0.45, 0]} size={0.8} />
        </>
      )}
      {d.placed &&
        DTB_MM.holes.map(([hx, hz], i) =>
          screws[i] ? (
            <group key={i} position={[hx * MM, headY, hz * MM]} scale={MM}>
              <Clone object={screwModel} castShadow />
            </group>
          ) : (
            active && (
              <Target
                key={i}
                onPick={() => {
                  screwDtb(i)
                  playClick(1100)
                }}
              >
                {(hover) => (
                  <mesh
                    position={[hx * MM, DTB_MM.t * MM + 0.004, hz * MM]}
                    rotation-x={-Math.PI / 2}
                  >
                    <circleGeometry args={[2.4 * MM, 24]} />
                    {ghostMat(hover || i === nextHole)}
                  </mesh>
                )}
              </Target>
            )
          ),
        )}
      {active && nextHole >= 0 && (
        <HintArrow
          at={[DTB_MM.holes[nextHole][0] * MM, 0.12, DTB_MM.holes[nextHole][1] * MM]}
          size={0.6}
        />
      )}
      {/* bắt đủ vít: đầu dây JST chờ cắm trước miệng cổng */}
      {active && d.placed && nextHole < 0 && !d.plugged && (
        <>
          <Target
            onPick={() => {
              plugDtb()
              playClick(1300)
            }}
          >
            {(hover) => (
              <Plug
                at={new THREE.Vector3(...mouth).setZ(mouth[2] + 0.12)}
                dir={1}
                mat={ghostMat(hover)}
              />
            )}
          </Target>
          <HintArrow at={[0, mouth[1] + 0.12, mouth[2] + 0.12]} size={0.6} />
        </>
      )}
      {d.plugged && <JstCable />}
    </group>
  )
}
