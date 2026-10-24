import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useGame } from '@/store'
import { Y } from '@/data/steps'
import { CuttingMat } from './common/CuttingMat'
import { MissingSlot } from './stations/StationKit'

/** Bàn build khi chưa có đơn nào đang build: tấm lót trống + ô vàng nét đứt, bấm để chọn đơn */
export function EmptyBench() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  useEffect(() => {
    camera.position.set(0, 19, 17)
    controls?.target.set(0, 0, 0)
    controls?.update()
  }, [camera, controls])
  const at = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  return (
    <>
      <CuttingMat w={31.5} d={23.5} position-y={Y.table + 0.005} />
      {/* phóng 3 lần cho ô + chữ đủ to ở góc nhìn cả bàn */}
      <group position-y={Y.table + 0.08} scale={3}>
        <MissingSlot
          at={at}
          size={[5.6, 2.4]}
          label="Bàn trống — bấm để chọn đơn build"
          onAct={() => useGame.setState({ benchPicker: true })}
        />
      </group>
    </>
  )
}
