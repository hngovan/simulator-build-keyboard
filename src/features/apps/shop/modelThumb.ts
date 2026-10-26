import { createLubeJar, createOilBottle, isOil, LUBE_JAR_URL } from '@/scene/models/lubeJarModel'
import { createClipper } from '@/scene/models/clipperModel'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { KEYCAP_COLORS, KEYCAP_KITS, PLATES, STABS, TOOLS } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { getLayout } from '@/data/layouts'
import { capGeometry, keycapShape } from '@/scene/models/keycapShape'
import stabModel from '@/data/stabModel.json'
import { SWITCH_GLB, switchMaterials } from '@/scene/models/Switch'
import { HOUSING_GLB, STAB_GLB, WIRE_SEAT } from '@/scene/models/Stabilizer'
import { Y } from '@/data/steps'
import { boardOutline, outlinePlane, outlineSlab } from '@/scene/parts/boardOutline'
import { makePcbTexture } from '@/scene/parts/PcbSurface'
import { createSolderSpool, createSpoolHolder } from '@/scene/models/solderSpool'
import { DIPLOMA_URL, createDiploma } from '@/scene/models/diplomaModel'
import { createScroll } from '@/scene/models/scrollModel'

// Ảnh sản phẩm Shopii chụp từ chính model 3D trong game: 1 renderer ẩn dùng chung, chụp lần lượt
// rồi giữ ảnh theo loại (không mở canvas WebGL cho từng thẻ sản phẩm)
export type ThumbKind =
  'switch' | 'stab' | 'keycap' | 'pcb' | 'plate' | 'tool' | 'supply' | 'lubeJar'

const W = 360
const H = 240
let renderer: THREE.WebGLRenderer | null = null
let envMap: THREE.Texture | null = null
const loader = new GLTFLoader()
const gltfs = new Map<string, Promise<Record<string, THREE.Mesh>>>()
const keycapGltfs = new Map<string, Promise<THREE.Group>>()
const cache = new Map<string, Promise<string | null>>()
let queue: Promise<unknown> = Promise.resolve()

function meshes(url: string) {
  if (!gltfs.has(url))
    gltfs.set(
      url,
      loader.loadAsync(url).then((g) => {
        const out: Record<string, THREE.Mesh> = {}
        g.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) out[o.name] = o as THREE.Mesh
        })
        return out
      }),
    )
  return gltfs.get(url)!
}

function keycapModel(name: string) {
  if (!keycapGltfs.has(name))
    keycapGltfs.set(
      name,
      loader.loadAsync(`/models/keycaps/${name}.glb`).then((g) => g.scene),
    )
  return keycapGltfs.get(name)!
}

function setup() {
  if (renderer) return renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setSize(W, H, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const pmrem = new THREE.PMREMGenerator(renderer)
  envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  return renderer
}

/** Ảnh mẫu keycap 1u từ CAD gốc; ASA dùng mesh trong game vì chưa có CAD được phép dùng. */
async function keycapScene(type: string) {
  const [kit, color] = type.split(':')
  const profile = KEYCAP_KITS[kit]?.profile ?? 'cherry'
  const col = KEYCAP_COLORS[color] ?? Object.values(KEYCAP_COLORS)[0]
  const material = new THREE.MeshStandardMaterial({
    color: col.hex,
    roughness: 0.55,
    side: THREE.DoubleSide,
  })
  const model = ['cherry', 'oem', 'sa'].includes(profile) ? `${profile}-r3` : profile
  const group =
    profile === 'asa'
      ? new THREE.Group().add(
          new THREE.Mesh(capGeometry(0.92, 0.92, keycapShape(profile, 2)), material),
        )
      : (await keycapModel(model)).clone(true)
  group.traverse((part) => {
    if ((part as THREE.Mesh).isMesh) (part as THREE.Mesh).material = material
  })
  group.rotation.set(0.65, -0.55, 0)
  return group
}

/** Dựng cảnh sản phẩm (hệ mm) */
/** Vỉ 4 feet cao su bán cầu trên tấm đế (như ảnh vỉ feet bán ngoài): 1 lần mua = 4 cái */
function createFeetStrip(color: string) {
  const group = new THREE.Group()
  const rubber = new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.03, 0.62),
    new THREE.MeshStandardMaterial({
      color: color === '#1c1c1f' ? '#2a2a2e' : '#d9d7d0',
      roughness: 0.8,
    }),
  )
  group.add(base)
  const dome = new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(dome, rubber)
    m.scale.y = 0.75
    m.position.set((i - 1.5) * 0.5, 0.015, 0)
    group.add(m)
  }
  group.rotation.set(0.75, -0.35, 0.12)
  return group
}

export async function buildScene(kind: ThumbKind, type: string) {
  const group = new THREE.Group()
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.x = x
    group.add(m)
    return m
  }
  if (kind === 'keycap') return keycapScene(type)
  // dầu: lọ nhỏ giọt giống trên bàn lube; mỡ: hũ
  if (kind === 'lubeJar')
    return isOil(type) ? createOilBottle(type) : createLubeJar(await glbScene(LUBE_JAR_URL), type)
  if (kind === 'plate') {
    const [layoutId, plateId] = type.split(':') as [import('@/types').LayoutId, string]
    const { keys, width, depth, outline } = getLayout(layoutId)
    const { shapes, shapeOf } = boardOutline(keys, width, depth, 0.01, outline)
    const halfCut = (14 * (1 / 19.05)) / 2
    for (const key of keys) {
      const c = Math.cos(key.rot)
      const s = Math.sin(key.rot)
      const point = (x: number, z: number) =>
        [key.cx + x * c + z * s, -(key.cz - x * s + z * c)] as const
      const hole = new THREE.Path()
      hole.moveTo(...point(-halfCut, -halfCut))
      hole.lineTo(...point(-halfCut, halfCut))
      hole.lineTo(...point(halfCut, halfCut))
      hole.lineTo(...point(halfCut, -halfCut))
      hole.closePath()
      shapeOf(key).holes.push(hole)
    }
    const plate = PLATES[plateId]
    const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 0.08, bevelEnabled: false })
      .rotateX(-Math.PI / 2)
      .translate(0, -0.08, 0)
    group.add(
      new THREE.Mesh(
        geometry,
        new THREE.MeshPhysicalMaterial({
          color: plate?.color ?? '#aeb5c0',
          metalness: plate?.metal ? 0.82 : 0.08,
          // PC / PEI: nhựa trong suốt
          roughness: plate?.clear ? 0.12 : plate?.metal ? 0.27 : 0.52,
          transmission: plate?.clear ? 0.9 : 0,
          thickness: 0.1,
          transparent: plate?.clear,
          opacity: plate?.clear ? 0.5 : 1,
          side: THREE.DoubleSide,
        }),
      ),
    )
    group.rotation.set(0.68, -0.34, 0)
    return group
  }
  if (kind === 'supply') {
    if (SUPPLIES[type]?.spell) return createScroll(SUPPLIES[type].name)
    if (SUPPLIES[type]?.feet) return createFeetStrip(SUPPLIES[type].color)
    if (type === 'urgo') {
      // hộp băng cá nhân "Band Aid Box" (Logansryche, Sketchfab, CC BY 4.0): model lệch xa gốc, căn tâm về 0
      const box = (await glbScene('/models/supplies/band-aid-box.glb')).clone(true)
      box.updateMatrixWorld(true)
      const bb = new THREE.Box3().setFromObject(box)
      const c = bb.getCenter(new THREE.Vector3())
      box.position.sub(c)
      const holder = new THREE.Group()
      holder.add(box)
      holder.scale.setScalar(1.6 / bb.getSize(new THREE.Vector3()).length())
      holder.rotation.set(0.55, -0.6, 0)
      return holder
    } else {
      return createSolderSpool(SUPPLIES[type]?.color ?? '#c5cbd0')
    }
    return group
  }
  if (kind === 'tool') {
    const [tool, levelText] = type.split(':')
    if (tool === 'spoolHolder') return createSpoolHolder()
    if (tool === 'cert')
      return createDiploma(
        await glbScene(DIPLOMA_URL),
        TOOLS.cert[Number(levelText)].name.replace('Chứng chỉ ', ''),
      )
    if (tool === 'desolder') {
      const pump = (await glbScene('/models/solder/desolder-pump.glb')).clone(true)
      pump.rotation.z = -0.45
      return pump
    }
    const level = Number(levelText)
    const material = (color: string, metalness = 0, roughness = 0.45) =>
      new THREE.MeshStandardMaterial({ color, metalness, roughness })
    const addMesh = (
      geometry: THREE.BufferGeometry,
      mat: THREE.Material,
      position: [number, number, number],
      rotation: [number, number, number] = [0, 0, 0],
    ) => {
      const mesh = new THREE.Mesh(geometry, mat)
      mesh.position.set(...position)
      mesh.rotation.set(...rotation)
      group.add(mesh)
      return mesh
    }
    const metal = material('#aeb7c2', 0.9, 0.24)
    const charcoal = material('#303640', 0.35, 0.38)
    if (tool === 'brush') {
      const source = await glbScene('/models/lube/brush.glb')
      const brush = source.clone(true)
      brush.rotation.z = -0.7
      group.add(brush)
    } else if (tool === 'opener') {
      // đồ mở switch MX in 3D (mm)
      const opener = (await glbScene('/models/tools/mx-opener.glb')).clone(true)
      opener.scale.setScalar(0.07)
      opener.position.y = -0.7
      group.add(opener)
    } else if (tool === 'screw') {
      // tua vít điện (model thật, mũi ở gốc, trục +y): nằm nghiêng, mũi chĩa xuống trái
      const driver = (await glbScene('/models/tools/electric-screwdriver.glb')).clone(true)
      driver.scale.setScalar(1.5)
      driver.rotation.z = 0.5
      driver.position.set(-0.05, -1.05, 0)
      group.add(driver)
    } else if (tool === 'solder') {
      // model thật: bút hàn 60W (mét, dựng theo +y) / trạm hàn cả cụm (đơn vị OBJ)
      if (level > 1) {
        const station = (await glbScene('/models/solder/iron-station.glb')).clone(true)
        station.scale.setScalar(0.28)
        station.position.set(-0.2, -0.3, 0)
        group.add(station)
      } else {
        const pen = (await glbScene('/models/solder/iron-60w.glb')).clone(true)
        pen.scale.setScalar(9)
        pen.rotation.z = -1.1
        group.add(pen)
      }
    } else if (tool === 'tipCleaner') {
      // giá bùi nhùi (in 3D, mm): chỉ phần vòm "base" + cục đồng trong lỗ
      const stand = (await glbScene('/models/solder/sponge-stand.glb')).clone(true)
      stand.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.name !== 'base') o.visible = false
      })
      stand.scale.setScalar(0.02)
      // lỗ vòm quay ra trước (bù góc nghiêng chung của ảnh dụng cụ) để thấy cục đồng bên trong
      stand.rotation.y = -Math.PI / 2 + 0.38
      stand.position.y = -0.6
      group.add(stand)
      addMesh(
        new THREE.IcosahedronGeometry(0.33, 1),
        material('#d9a441', 0.9, 0.5),
        [0.05, -0.15, 0.12],
      )
    } else if (tool === 'clipper') {
      group.add(createClipper())
      group.rotation.set(1.05, -0.15, 0)
      return group
    } else if (tool === 'switch' || tool === 'keycap') {
      addMesh(new THREE.BoxGeometry(1.65, 0.18, 0.92), charcoal, [0, -0.12, 0])
      if (level > 1) {
        addMesh(new THREE.BoxGeometry(1.85, 0.15, 1.05), metal, [0, 0.72, 0])
        for (const x of [-0.78, 0.78])
          addMesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), metal, [x, 0.32, 0])
        addMesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.62, 12),
          material('#c7443d'),
          [0.02, 1.08, 0],
        )
      }
      for (let i = 0; i < (level > 1 ? 7 : 5); i++) {
        const x = -0.62 + i * 0.205
        if (tool === 'switch') {
          addMesh(new THREE.BoxGeometry(0.15, 0.23, 0.15), material('#202127'), [x, 0.085, 0])
          addMesh(new THREE.BoxGeometry(0.055, 0.07, 0.055), material('#e0b834'), [x, 0.235, 0])
        } else {
          addMesh(
            new THREE.CylinderGeometry(0.105, 0.12, 0.16, 4),
            material(i % 2 ? '#e7e0d0' : '#d1c5ae'),
            [x, 0.09, 0],
          )
        }
      }
    } else {
      addMesh(new THREE.BoxGeometry(1.2, 0.16, 0.65), metal, [0, -0.1, 0])
      for (const x of [-0.42, 0.42])
        addMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 12), charcoal, [x, 0.02, 0])
    }
    group.rotation.set(0.42, -0.38, 0)
    return group
  }
  if (kind === 'pcb') {
    const [layoutId, pcbType] = type.split(':') as [import('@/types').LayoutId, string]
    const { keys, width, depth, outline } = getLayout(layoutId)
    const { shapes } = boardOutline(keys, width, depth, 0, outline)
    const dark = pcbType === 'hotswap'
    const body = new THREE.Mesh(
      outlineSlab(shapes, Y.pcbBot, Y.pcbTop),
      new THREE.MeshStandardMaterial({ color: dark ? '#182229' : '#174f3e', roughness: 0.65 }),
    )
    const texture = makePcbTexture(width, depth, keys, dark)
    const face = new THREE.Mesh(
      outlinePlane(shapes, width, depth),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.68, metalness: 0.08 }),
    )
    face.position.y = Y.pcbTop + 0.002
    group.add(body, face)
    group.rotation.set(0.62, -0.25, 0)
    return group
  }
  if (kind === 'switch') {
    const n = await meshes(SWITCH_GLB)
    const m = switchMaterials(type)
    add(n.bottom.geometry, m.bottom)
    add(n.pegs.geometry, m.bottom)
    add(n.pins.geometry, m.metal)
    add(n.top.geometry, m.top)
    add(n.stemTop.geometry, m.stem)
    group.rotation.set(0.5, -0.6, 0)
  } else {
    const n = await meshes(STAB_GLB)
    // "loại:cỡ" (cỡ 2u / 6.25u / 7u theo option đang chọn; không ghi = 2u)
    const [stabType, size = '2u'] = type.split(':')
    const st = STABS[stabType]
    // housing theo kiểu lắp như bàn build: clip-in / plate-mount có model riêng, screw-in dùng CAD gốc
    const own =
      st.mount === 'clip' || st.mount === 'plate' ? await meshes(HOUSING_GLB[st.mount]) : null
    const housingGeo = (own ?? n).housing.geometry
    // model Sketchfab có mặt lật chiều → vẽ 2 mặt
    const housing = new THREE.MeshPhysicalMaterial({
      color: st.housing,
      roughness: 0.45,
      side: THREE.DoubleSide,
    })
    const stem = new THREE.MeshPhysicalMaterial({ color: st.stem, roughness: 0.45 })
    const wire = new THREE.MeshStandardMaterial({ color: '#cfd3d8', metalness: 1, roughness: 0.22 })
    // dây dài: dây 6.25u của CAD, 7u kéo giãn theo khoảng cách slider (giống StabWireCad trên bàn build)
    const long = size !== '2u'
    const span = long ? (STAB_SPAN_MM[size] ?? stabModel.spans['6.25u']) : stabModel.spans['2.25u']
    for (const x of [-span, span]) {
      add(housingGeo, housing, x)
      add(n.stem.geometry, stem, x)
    }
    const wireMesh = add(long ? n.wire625.geometry : n.wire225.geometry, wire)
    if (long) wireMesh.scale.x = span / stabModel.spans['6.25u']
    // dây nằm đúng rãnh giữ dây của housing (plate-mount thấp + gần slider hơn)
    const [wy, wz] = WIRE_SEAT[st.mount] ?? [0, 0]
    wireMesh.position.y += wy
    wireMesh.position.z += wz
    group.rotation.set(0.6, -0.35, 0)
  }
  return group
}

/** khoảng cách tâm → slider (mm) của stab phím dài: 6.25u theo CAD, 7u = 57.15mm (chuẩn Cherry) */
const STAB_SPAN_MM: Record<string, number> = { '6.25u': stabModel.spans['6.25u'], '7u': 57.15 }

/** Chụp 1 vật thể (đã dựng sẵn) thành ảnh PNG, canh khung theo khối bao */
async function shootObject(model: THREE.Object3D) {
  const r = setup()
  const scene = new THREE.Scene()
  scene.environment = envMap
  scene.add(new THREE.AmbientLight('#ffffff', 0.5))
  const sun = new THREE.DirectionalLight('#ffffff', 1.6)
  sun.position.set(30, 60, 40)
  scene.add(sun)
  scene.add(model)
  // canh khung theo khối bao của model
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 1000)
  const fit = Math.max(size.y, size.x / camera.aspect) / 2 / Math.tan((camera.fov * Math.PI) / 360)
  camera.position.copy(center).add(new THREE.Vector3(0, 0, fit * 1.15 + size.z / 2))
  camera.lookAt(center)
  r.render(scene, camera)
  return r.domElement.toDataURL('image/png')
}

/** Ảnh PNG (data URL) của sản phẩm; null nếu máy không có WebGL */
function modelThumb(kind: ThumbKind, type: string) {
  return cachedThumb(`${kind}:${type}`, () => buildScene(kind, type))
}

/** Chụp theo khoá (mỗi khoá chụp 1 lần, chụp lần lượt trên renderer chung) */
export function cachedThumb(key: string, build: () => Promise<THREE.Object3D>) {
  if (!cache.has(key)) {
    const job = queue.then(async () => shootObject(await build())).catch(() => null)
    queue = job
    cache.set(key, job)
  }
  return cache.get(key)!
}

/** Tải mesh từ file glb (dùng chung cache) */
export const glbMeshes = meshes

const scenes = new Map<string, Promise<THREE.Group>>()
/** Scene gốc của file glb (dùng chung cache; clone trước khi gắn vào cảnh) */
export function glbScene(url: string) {
  if (!scenes.has(url))
    scenes.set(
      url,
      loader.loadAsync(url).then((g) => g.scene),
    )
  return scenes.get(url)!
}

/** Ảnh model 3D cho thẻ sản phẩm (null khi đang chụp / không chụp được → dùng ảnh vẽ) */
export function useModelThumb(kind: ThumbKind | null, type: string | undefined) {
  const key = kind && type ? `${kind}:${type}` : null
  const [shot, setShot] = useState<{ key: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!kind || !type || !key) return
    let alive = true
    modelThumb(kind, type).then((url) => alive && setShot({ key, url }))
    return () => {
      alive = false
    }
  }, [kind, type, key])
  return shot?.key === key ? shot.url : null
}
