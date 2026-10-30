// Chuyển bộ sưu tập case CAD của người dùng (assets/keyboards/<tên>, chép từ "D:\IN 3D") sang GLB cho game.
// Dùng: bun run convert:user-cases [id...] (vd duality-horns/case: chỉ chuyển case đó; không tham số: mọi case)
//
// Các mảnh (nắp, đáy, tạ) của 1 case đã đặt sẵn ở toạ độ lắp ráp: Z hướng lên, mm, plate nằm phẳng.
// Script ghép các mảnh, tìm mặt trước (mép đáy mỏng hơn), đo góc gõ từ độ dốc đáy rồi xoay cho đáy
// nằm phẳng trên bàn. Kết quả: đáy ở y = 0, tâm ở gốc (x, z), mặt trước quay về +z.
// In ra seat (độ cao + góc nghiêng của plate trong case) để chép vào CASES (src/data/parts.ts).
//
// ⚠️ File do người dùng sưu tầm, chưa rõ giấy phép: chỉ dùng cá nhân, không phát hành kèm game.
import fs from 'node:fs'
import path from 'node:path'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'

const SRC = 'assets/keyboards'
const OUT = 'public/models/keyboards'
/** u = 19.05mm; đáy case trong game đặt ở Y.floorBot */
const MM = 1 / 19.05
const FLOOR_BOT = -0.9

/** id → các mảnh [file, dời z (mm)] + cao độ mặt trên plate trong CAD (mm; Catto / Vintage: file plate trải 0 → 14.7) */
const CASES = {
  'exodus60/case': {
    parts: [
      ['exodus60/Exodus60 TOP.stl', -51.2],
      ['exodus60/Exodus60 BOT.stl'],
      ['exodus60/Exodus60 TẠ.stl'],
    ],
    plateZ: 0,
  },
  'exodus60/case-wkl': {
    parts: [
      ['exodus60/Exodus60 TOP WKL.stl'],
      ['exodus60/Exodus60 BOT.stl'],
      ['exodus60/Exodus60 TẠ.stl'],
    ],
    plateZ: 0,
  },
  'exodus60/case-hhkb': {
    parts: [
      ['exodus60/Exodus60 TOP hống hách kb.stl'],
      ['exodus60/Exodus60 BOT.stl'],
      ['exodus60/Exodus60 TẠ.stl'],
    ],
    plateZ: 0,
  },
  'exodus80/case': {
    parts: [
      ['exodus80/Exodus80 TOP in 3D.stl'],
      ['exodus80/Exodus80 BOT in 3D.stl'],
      ['exodus80/Exodus80 TẠ TRONG in 3D.stl'],
      ['exodus80/Exodus80 TẠ NGOÀI in 3D.stl'],
    ],
    plateZ: 0,
  },
  'repent75/case': {
    parts: [
      ['repent75/REPENT75 TOP in 3D.stl'],
      ['repent75/REPENT75 BOT in 3D.stl'],
      ['repent75/REPENT75 TẠ in 3D.stl'],
    ],
    plateZ: 0,
  },
  // case TKL kiểu Realforce (thư mục REALFORCER1,2)
  'rf-bruh/case': { parts: [['rf-bruh/TOP RFBRUH.stl'], ['rf-bruh/BOT RFBRUH.stl']], plateZ: 0 },
  // CattoRF v4: tấm đáy mỏng + thân case; plate ước lượng dưới mép trên ~9mm
  'catto-rf/case': { parts: [['catto-rf/CattoRF v4.step']], plateZ: 24 },
  // Duality Horns (TKL, 2 mảnh): thân (SOLID) = nắp, BOTTOM = node đáy riêng (cùng 1 file nên đánh dấu `bottom`), tạ / badge /
  // accent; bỏ 4 tấm plate và đệm. `marks`: 4 lỗ vít ghép ở 4 góc (dò trên cả SOLID lẫn BOTTOM, Ø2mm) → in toạ độ game cho `screws`
  'duality-horns/case': {
    // 8 vít ghép bắt chéo, đầu vít quay vào trong (người dùng xác nhận): lỗ xuyên nắp r ~1,5mm nghiêng ~42–48° ra ngoài xuống trụ đáy.
    // Đầu vít = đáy hốc đầu vít trên nắp (dò bằng scripts/probe-screw-axis.mjs), trục hướng lên [dx, dy, dz]
    // 6 tai plate (top mount): tâm đệm trên / dưới tai trong STEP, khớp 6 khe tai plate thật (plate/duality-tkl.dwg)
    marks: {
      topScrews: [
        [61.9, 2.5],
        [204.8, 2.5],
        [288.1, 2.5],
        [51.9, -121.5],
        [214.6, -121.5],
        [293, -121.5],
      ],
    },
    heads: {
      angledScrews: [
        ...[42.9, 123.8, 223.6, 309.6].map((x) => [x, 2.05, -0.37, 0, -0.672, 0.741]),
        ...[24.3, 99.3, 233.9, 309.6].map((x) => [x, -120.97, -0.64, 0, 0.746, 0.665]),
      ],
      // ốc nón bắt tạ (4 lỗ Ø7,2 trên WEIGHT) + dải accent (2 lỗ Ø5,5): đầu ốc ngang mặt trên, trục đứng (dò lỗ côn trong STEP)
      weightScrews: [
        ...[
          [46.1, -13.2],
          [46.1, -42.5],
          [301.5, -13.2],
          [301.5, -42.5],
        ].map(([x, y]) => [x, y, -10.43, 0, 0, 1]),
        [95.5, -80.5, -10.33, 0, 0, 1],
        [252.1, -80.5, -10.33, 0, 0, 1],
      ],
      // vít M2 bắt badge chữ thập từ trong nắp lên: đầu vít ở mặt dưới mặt bích badge (lỗ Ø2,67 z 2,03), ăn vào lỗ ren nắp
      // (Ø2,06 z 3,7–4,6); ốc đi vào hướng lên → trục ghi [0, 0, −1]
      badgeScrews: [
        [340.14, -70.76, 2.03, 0, 0, -1],
        [340.14, -88.01, 2.03, 0, 0, -1],
      ],
    },
    parts: [
      ['duality-horns/duality_horns_v1_asm v11.step', 0, { names: ['SOLID'] }],
      ['duality-horns/duality_horns_v1_asm v11.step', 0, { names: ['BOTTOM'], bottom: true }],
      [
        'duality-horns/duality_horns_v1_asm v11.step',
        0,
        { names: ['WEIGHT', 'ACCENT_V2'], weight: true },
      ],
      // badge chữ thập cạnh cụm mũi tên: gắn vào lỗ chữ thập của nắp → node "badge" đi cùng nắp (vẽ cả lúc chỉ có nắp: top mount)
      ['duality-horns/duality_horns_v1_asm v11.step', 0, { names: ['BADGE'], badge: true }],
    ],
    plateZ: 0,
  },
  'catto-hhkb/case': {
    parts: [
      ['catto-hhkb/CattoHHKB TOP.step'],
      ['catto-hhkb/CattoHHKB BOT.step'],
      ['catto-hhkb/CattoHHKB TA.step'],
    ],
    plateZ: 14.7,
  },
  'vintage60-hhkb/case': {
    parts: [['vintage60-hhkb/Vintage60 TOP fix 2.stl'], ['vintage60-hhkb/Vintage60 BOT.stl']],
    plateZ: 14.7,
  },
  'eclipse60/case': {
    parts: [['eclipse60/TOP egg.step'], ['eclipse60/BOT egg.step'], ['eclipse60/TA egg.step']],
    plateZ: -51.5,
  },
  'head4/case-alu': {
    parts: [
      ['head4/4HEAD TOP ALU.step'],
      ['head4/4HEAD BOT ACRYLIC.step'],
      ['head4/4HEAD TA BRASS.step'],
    ],
    plateZ: 1.5,
  },
  'head4/case-acrylic': {
    parts: [
      ['head4/4HEAD TOP ACRYLIC.step'],
      ['head4/4HEAD BOT ACRYLIC.step'],
      ['head4/4HEAD TA BRASS.step'],
    ],
    plateZ: 1.5,
  },
  'ta65/case': {
    parts: [['ta65/65TA in3D TOP.stl'], ['ta65/65TA in3D BOT.stl'], ['ta65/65TA in3D TA.stl']],
    plateZ: 0,
  },
  // Blossom (doughnut923/Blossom, MIT — assets/keyboards/blossom): 2 mảnh xếp sẵn để in. Nắp trên in úp mặt →
  // lật 180° quanh trục x, dời về trên đáy. Mũi nhọn (mặt trước) của đáy ở y nhỏ.
  // Đáy là hình nêm (mép trước cao 2.5mm, vách sau 14.5mm) → nắp nghiêng ~5.4° tựa lên mép sau (rot),
  // chừa khe đều ~0,6mm (dz) cho thấy đường tách 2 mảnh (đo bằng tia đứng qua vách bên),
  // không thì nắp nằm ngang hở 1 khe lớn phía trước. plate nghiêng theo nắp: seat.tilt ghi tay ở parts.ts
  'blossom/case': {
    parts: [
      ['blossom/case/B_Case.stl'],
      [
        'blossom/case/U_Case.stl',
        26.4,
        { flip: true, dy: -343.7, rot: { angle: 0.0941, y0: 127.3, z0: 14.5 } },
      ],
    ],
    plateZ: 10,
    front: 'ymin',
  },
}

const occt = await occtimportjs()

/** 1 mảnh → mảng tam giác (pos, nor, idx) */
function readPart(file, dz = 0, opt = {}) {
  const buf = fs.readFileSync(path.join(SRC, file))
  let pos
  let nor
  let idx = null
  if (/\.stl$/i.test(file)) {
    const p = []
    const n = []
    if (buf.slice(0, 5).toString() === 'solid' && buf.includes('facet')) {
      const text = buf.toString()
      for (const f of text.matchAll(/facet normal\s+(\S+)\s+(\S+)\s+(\S+)([\s\S]*?)endfacet/g)) {
        const vs = [...f[4].matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)]
        for (const v of vs) {
          p.push(+v[1], +v[2], +v[3])
          n.push(+f[1], +f[2], +f[3])
        }
      }
    } else {
      const count = buf.readUInt32LE(80)
      for (let i = 0; i < count; i++) {
        const o = 84 + i * 50
        const fn = [0, 1, 2].map((a) => buf.readFloatLE(o + a * 4))
        for (let v = 0; v < 3; v++) {
          for (let a = 0; a < 3; a++) p.push(buf.readFloatLE(o + 12 + v * 12 + a * 4))
          n.push(...fn)
        }
      }
    }
    pos = p
    nor = n
  } else {
    const r = occt.ReadStepFile(new Uint8Array(buf), null)
    if (!r.success) throw new Error(`Không đọc được ${file}`)
    pos = []
    nor = []
    idx = []
    // file lắp ráp nhiều chi tiết: chỉ lấy chi tiết có tên trong opt.names
    for (const m of r.meshes.filter((m) => !opt.names || opt.names.includes(m.name))) {
      const base = pos.length / 3
      for (const v of m.attributes.position.array) pos.push(v)
      for (const v of m.attributes.normal.array) nor.push(v)
      for (const i of m.index.array) idx.push(base + i)
    }
  }
  // lật 180° quanh trục x (mảnh in úp mặt): y → −y, z → −z (giữ đúng chiều tam giác)
  if (opt.flip)
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] = -pos[i + 1]
      pos[i + 2] = -pos[i + 2]
      nor[i + 1] = -nor[i + 1]
      nor[i + 2] = -nor[i + 2]
    }
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] += opt.dy ?? 0
    pos[i + 2] += dz
  }
  // xoay quanh trục x qua (y0, z0): góc dương hạ mặt trước (y nhỏ) xuống
  if (opt.rot) {
    const { angle, y0, z0 } = opt.rot
    const c = Math.cos(angle)
    const sn = Math.sin(angle)
    for (let i = 0; i < pos.length; i += 3) {
      const y = pos[i + 1] - y0
      const z = pos[i + 2] - z0
      pos[i + 1] = y0 + y * c - z * sn
      pos[i + 2] = z0 + z * c + y * sn
      const ny = nor[i + 1]
      const nz = nor[i + 2]
      nor[i + 1] = ny * c - nz * sn
      nor[i + 2] = nz * c + ny * sn
    }
  }
  return { pos, nor, idx: idx ?? Array.from({ length: pos.length / 3 }, (_, i) => i) }
}

/** mảnh tạ (weight) — tách node riêng để game tô màu kim loại khác case: tên file có "TẠ" / "TA" rời */
const isWeight = (file, opt = {}) =>
  opt.weight ?? /(^|[\s/])(TẠ|TA)([\s.]|$)/.test(path.basename(file))

/** mảnh đáy — node "bottom" riêng để game tô chất liệu khác nắp (vd nắp PC, đáy nhôm): tên file có "BOT" / "B_Case" */
const isBottom = (file, opt = {}) =>
  opt.bottom ?? /(^|[\s/_])(BOT|BOTTOM|B_Case)([\s._]|$)/i.test(path.basename(file))

fs.mkdirSync(OUT, { recursive: true })
const only = process.argv.slice(2)
for (const [id, def] of Object.entries(CASES)) {
  if (only.length && !only.includes(id)) continue
  const pos = []
  const nor = []
  const idx = []
  const weightIdx = []
  const badgeIdx = []
  const bottomIdx = []
  for (const [file, dz, opt] of def.parts) {
    const p = readPart(file, dz, opt)
    const base = pos.length / 3
    // mảng lớn: thêm từng phần tử (spread quá nhiều đối số sẽ tràn stack)
    for (const v of p.pos) pos.push(v)
    for (const v of p.nor) nor.push(v)
    const into = opt?.badge
      ? badgeIdx
      : isWeight(file, opt)
        ? weightIdx
        : isBottom(file, opt)
          ? bottomIdx
          : idx
    for (const i of p.idx) into.push(base + i)
  }
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], pos[i + a])
      max[a] = Math.max(max[a], pos[i + a])
    }
  const cx = (min[0] + max[0]) / 2
  const cy = (min[1] + max[1]) / 2
  // đáy thấp nhất ở dải 15mm sát mép y nhỏ / y lớn: mép đáy cao hơn (case mỏng hơn) là mặt trước
  let lowA = Infinity
  let lowB = Infinity
  for (let i = 0; i < pos.length; i += 3) {
    if (pos[i + 1] < min[1] + 15) lowA = Math.min(lowA, pos[i + 2])
    if (pos[i + 1] > max[1] - 15) lowB = Math.min(lowB, pos[i + 2])
  }
  // case phẳng (2 mép đáy cao bằng nhau): các file trong bộ sưu tập đều để cổng USB ở y lớn → mặt trước ở y nhỏ
  const flat = Math.abs(lowA - lowB) < 0.5
  const frontAtMin = def.front ? def.front === 'ymin' : flat ? true : lowA > lowB
  const span = max[1] - min[1] - 15
  // góc gõ: đáy dốc lên về phía trước (plate phẳng trong CAD) → xoay cho đáy phẳng
  const rise = Math.abs(lowA - lowB)
  const tilt = rise > 1 ? Math.atan2(rise, span) : 0
  // CAD (x, y, z-lên) → game (x, y-lên, z-trước), mặt trước về +z (xoay 180° quanh trục đứng nếu cần)
  const s = frontAtMin ? -1 : 1
  const c = Math.cos(tilt)
  const sn = Math.sin(tilt)
  // (x, y, z) → (−x·s, z, y·s): phép xoay thật (định thức +1). Bản cũ để gx = x·s là ảnh gương
  // trái–phải (cụm mũi tên TKL nằm sai bên, mặt tam giác lật chiều)
  const toGame = (x, y, z) => {
    const gx = -(x - cx) * s
    const gz = (y - cy) * s
    // xoay quanh trục x: mặt trước (+z) hạ xuống đúng góc gõ
    return [gx, z * c - gz * sn, z * sn + gz * c]
  }
  const P = new Float32Array(pos.length)
  const N = new Float32Array(nor.length)
  let low = Infinity
  for (let i = 0; i < pos.length; i += 3) {
    const g = toGame(pos[i], pos[i + 1], pos[i + 2])
    P.set(g, i)
    low = Math.min(low, g[1])
    const nx = -nor[i] * s
    const nz = nor[i + 1] * s
    const ny = nor[i + 2]
    N.set([nx, ny * c - nz * sn, ny * sn + nz * c], i)
  }
  for (let i = 1; i < P.length; i += 3) P[i] -= low
  // tâm plate (tâm case, mặt trên plate) sau khi xoay → board nâng tới đó và nghiêng theo
  const plate = toGame(cx, cy, def.plateZ)
  const plateH = plate[1] - low

  const doc = new Document()
  const buffer = doc.createBuffer()
  const posAcc = doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer)
  const norAcc = doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer)
  const scene = doc.createScene(id)
  // node "case" (vỏ / nắp) + "bottom" (đáy, nếu tách được) + "weight" (tạ / badge, nếu có) dùng chung đỉnh
  for (const [name, list] of [
    ['case', idx],
    ['bottom', bottomIdx],
    ['weight', weightIdx],
    ['badge', badgeIdx],
  ]) {
    if (!list.length) continue
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', posAcc)
      .setAttribute('NORMAL', norAcc)
      .setIndices(
        doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(list)).setBuffer(buffer),
      )
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
  }
  const out = path.join(OUT, `${id}.glb`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await new NodeIO().write(out, doc)
  console.log(
    `✔ ${id.padEnd(15)} ${(max[0] - min[0]).toFixed(0)} × ${(max[1] - min[1]).toFixed(0)}mm,`,
    `góc gõ ${((tilt * 180) / Math.PI).toFixed(1)}°,`,
    `seat: { rise: ${(FLOOR_BOT + plateH * MM).toFixed(3)}, tilt: ${tilt.toFixed(3)} },`,
    weightIdx.length ? `tạ ${weightIdx.length / 3} tam giác,` : 'không tạ,',
    bottomIdx.length ? 'tách đáy,' : '',
    `${(fs.statSync(out).size / 1024).toFixed(0)} KB`,
  )
  // đầu ốc theo nhóm (vít nghiêng: đáy hốc đầu vít; ốc tạ: mặt trên lỗ côn; mm CAD) + trục hướng lên → [x, y, z] mm hệ model game
  // (y so với đáy) + hướng ốc đi vào (ngược trục) → chép vào CaseDef cùng tên (angledScrews / weightScrews)
  for (const [name, list] of Object.entries(def.heads ?? {})) {
    const r1 = (n) => Math.round(n * 10) / 10
    const r2 = (n) => Math.round(n * 100) / 100
    const o = toGame(0, 0, 0)
    const out2 = list.map(([x, y, z, dx, dy, dz]) => {
      const g = toGame(x, y, z)
      const gd = toGame(-dx, -dy, -dz).map((v, i) => v - o[i])
      return [r1(g[0]), r1(g[1] - low), r1(g[2]), ...gd.map(r2)]
    })
    console.log(`  ${name}:`, JSON.stringify(out2))
  }
  // điểm đánh dấu theo nhóm (x, y mm trong CAD, vd lỗ vít / tai plate) → [x, z] mm hệ model game (chép vào CaseDef cùng tên)
  for (const [name, list] of Object.entries(def.marks ?? {}))
    console.log(
      `  ${name}:`,
      JSON.stringify(
        list.map(([x, y]) => {
          const g = toGame(x, y, 0)
          return [Math.round(g[0] * 10) / 10, Math.round(g[2] * 10) / 10]
        }),
      ),
    )
}
process.exit(0)
