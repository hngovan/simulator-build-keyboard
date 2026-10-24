import { Text } from '@/scene/common/Text3D'

const steel = '#aeb7c2'

function SolderStation({
  position,
  variant,
}: {
  position: [number, number, number]
  variant: 'digital' | 'analog'
}) {
  const digital = variant === 'digital'
  return (
    <group position={position}>
      <mesh castShadow position-y={0.042}>
        <boxGeometry args={[0.19, 0.084, 0.14]} />
        <meshStandardMaterial color={digital ? '#343c47' : '#d8d8d0'} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.047, 0.071]}>
        <boxGeometry args={[0.105, 0.035, 0.004]} />
        <meshStandardMaterial
          color={digital ? '#142b32' : '#30343a'}
          emissive={digital ? '#174e59' : '#000'}
          emissiveIntensity={0.5}
        />
      </mesh>
      <Text
        position={[0, 0.049, 0.074]}
        fontSize={0.018}
        color={digital ? '#8ef0e8' : '#f4c94d'}
        anchorX="center"
        anchorY="middle"
      >
        {digital ? '350°C' : '936'}
      </Text>
      {digital ? (
        <>
          {[-0.055, 0.055].map((x) => (
            <mesh key={x} position={[x, 0.045, 0.075]}>
              <cylinderGeometry args={[0.009, 0.009, 0.01, 16]} />
              <meshStandardMaterial color={x < 0 ? '#cf493f' : '#4d9b70'} metalness={0.35} />
            </mesh>
          ))}
          <mesh castShadow position={[0, 0.091, -0.025]}>
            <boxGeometry args={[0.09, 0.012, 0.012]} />
            <meshStandardMaterial color={steel} metalness={0.8} roughness={0.25} />
          </mesh>
        </>
      ) : (
        <mesh castShadow position={[0.064, 0.055, 0.075]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.022, 0.022, 0.022, 24]} />
          <meshStandardMaterial color="#e7a82e" roughness={0.38} />
        </mesh>
      )}
      {[
        [-0.07, -0.047],
        [0.07, -0.047],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.008, z]}>
          <boxGeometry args={[0.014, 0.016, 0.014]} />
          <meshStandardMaterial color="#171b21" />
        </mesh>
      ))}
    </group>
  )
}

function SolderIron({
  position,
  color,
  rotation = 0,
}: {
  position: [number, number, number]
  color: string
  rotation?: number
}) {
  return (
    <group position={position} rotation-z={rotation}>
      {/* iron tip points down-left, with a heat shield, grip and cable boot */}
      <mesh castShadow position={[-0.092, 0, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.005, 0.055, 10]} />
        <meshStandardMaterial color={steel} metalness={0.9} roughness={0.23} />
      </mesh>
      <mesh castShadow position={[-0.057, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.009, 0.012, 0.035, 12]} />
        <meshStandardMaterial color="#737b83" metalness={0.82} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.017, 0.022, 0.095, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.055, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.013, 0.018, 0.025, 12]} />
        <meshStandardMaterial color="#252a31" roughness={0.78} />
      </mesh>
      <mesh position={[0.075, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.004, 0.004, 0.018, 8]} />
        <meshStandardMaterial color="#20242b" />
      </mesh>
    </group>
  )
}

function IronHolder({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position-y={0.009}>
        <cylinderGeometry args={[0.045, 0.05, 0.018, 24]} />
        <meshStandardMaterial color="#343a42" metalness={0.45} roughness={0.5} />
      </mesh>
      <mesh position-y={0.021}>
        <cylinderGeometry args={[0.026, 0.032, 0.012, 20]} />
        <meshStandardMaterial color="#252a30" />
      </mesh>
      <mesh position={[0, 0.082, -0.005]} rotation-x={-0.22}>
        <torusGeometry args={[0.031, 0.004, 8, 20, Math.PI]} />
        <meshStandardMaterial color={steel} metalness={0.88} roughness={0.25} />
      </mesh>
      <mesh position-y={0.045}>
        <cylinderGeometry args={[0.004, 0.004, 0.05, 8]} />
        <meshStandardMaterial color={steel} metalness={0.85} />
      </mesh>
    </group>
  )
}

function SolderSpool({
  position,
  wireColor,
  label,
  radius,
}: {
  position: [number, number, number]
  wireColor: string
  label: string
  radius: number
}) {
  return (
    <group position={position}>
      <mesh castShadow rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[radius, radius, 0.025, 32]} />
        <meshStandardMaterial color="#e9e5d9" roughness={0.72} />
      </mesh>
      <mesh castShadow rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[radius * 0.38, radius * 0.38, 0.031, 24]} />
        <meshStandardMaterial color="#b7a98f" roughness={0.8} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh key={i} rotation-y={Math.PI / 2}>
          <torusGeometry args={[radius * (0.42 + i * 0.075), 0.0022, 6, 28]} />
          <meshStandardMaterial color={wireColor} metalness={0.88} roughness={0.24} />
        </mesh>
      ))}
      <Text
        position={[0.018, 0, 0]}
        rotation-y={Math.PI / 2}
        fontSize={0.012}
        color="#35312c"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

function SpoolStand({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh castShadow position-y={0.012}>
        <boxGeometry args={[0.085, 0.024, 0.095]} />
        <meshStandardMaterial color="#343b43" metalness={0.4} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.054, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.008, 0.008, 0.075, 12]} />
        <meshStandardMaterial color={steel} metalness={0.9} roughness={0.25} />
      </mesh>
      <SolderSpool
        position={[0, 0.054, 0]}
        wireColor={color}
        label={color === '#8a9ba2' ? 'Sn63' : 'SAC305'}
        radius={0.042}
      />
    </group>
  )
}

/** Open cup filled with irregular brass wool for cleaning the hot iron tip. */
function BrassTipCleaner({ position }: { position: [number, number, number] }) {
  const loops = [
    [-0.012, 0.032, -0.008, 0.022],
    [0.012, 0.033, 0.007, 0.025],
    [-0.003, 0.043, 0.011, 0.019],
    [-0.016, 0.047, 0.009, 0.015],
    [0.015, 0.046, -0.01, 0.017],
    [0.001, 0.054, -0.003, 0.021],
    [-0.009, 0.059, -0.014, 0.014],
    [0.015, 0.058, 0.013, 0.013],
    [-0.018, 0.052, -0.002, 0.012],
  ] as const
  return (
    <group position={position}>
      <mesh castShadow position-y={0.014}>
        <cylinderGeometry args={[0.045, 0.038, 0.028, 24]} />
        <meshStandardMaterial color="#282e35" metalness={0.48} roughness={0.48} />
      </mesh>
      <mesh position-y={0.029}>
        <torusGeometry args={[0.041, 0.003, 8, 24]} />
        <meshStandardMaterial color="#777f87" metalness={0.82} roughness={0.28} />
      </mesh>
      {loops.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[i * 0.71, i * 0.43, i * 0.87]}>
          <torusGeometry args={[r, 0.0035, 5, 12]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#d2a344' : '#b77c25'}
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
      ))}
      <Text
        position={[0, 0.031, 0.045]}
        rotation-x={-Math.PI / 2}
        fontSize={0.008}
        color="#e8c66e"
        anchorX="center"
        anchorY="middle"
      >
        BRASS WOOL
      </Text>
    </group>
  )
}

/** Compact tool cart with two station styles, iron rests and two solder alloys on spool stands. */
export function SolderingWorkbench() {
  return (
    <group>
      {/* mobile cart: wood top, lower shelf, steel legs and casters */}
      <mesh castShadow receiveShadow position-y={0.72}>
        <boxGeometry args={[0.68, 0.045, 0.43]} />
        <meshStandardMaterial color="#79583e" roughness={0.72} />
      </mesh>
      <mesh castShadow position-y={0.31}>
        <boxGeometry args={[0.62, 0.026, 0.39]} />
        <meshStandardMaterial color="#464c53" metalness={0.25} roughness={0.6} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <group key={`${x}-${z}`} position={[x * 0.31, 0, z * 0.18]}>
            <mesh castShadow position-y={0.35}>
              <boxGeometry args={[0.022, 0.72, 0.022]} />
              <meshStandardMaterial color="#41474e" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh castShadow position-y={0.035} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.035, 0.035, 0.025, 16]} />
              <meshStandardMaterial color="#252a30" roughness={0.7} />
            </mesh>
          </group>
        )),
      )}
      {/* two visibly different control stations */}
      <SolderStation position={[-0.205, 0.745, -0.105]} variant="digital" />
      <SolderStation position={[0.015, 0.745, -0.105]} variant="analog" />

      {/* irons parked in individual metal cradles */}
      <IronHolder position={[-0.205, 0.745, 0.105]} />
      <IronHolder position={[0.005, 0.745, 0.105]} />
      <SolderIron position={[-0.205, 0.83, 0.105]} color="#df5749" rotation={0.08} />
      <SolderIron position={[0.005, 0.83, 0.105]} color="#e0b638" rotation={-0.06} />

      {/* separate spool holders show thin leaded and lead-free solder wire */}
      <SpoolStand position={[0.19, 0.745, -0.09]} color="#8a9ba2" />
      <SpoolStand position={[0.19, 0.745, 0.115]} color="#bfaa75" />
      <BrassTipCleaner position={[-0.075, 0.745, 0.155]} />
      <mesh castShadow position={[0.19, 0.83, 0.03]}>
        <boxGeometry args={[0.055, 0.008, 0.16]} />
        <meshStandardMaterial color="#252a30" />
      </mesh>
    </group>
  )
}
