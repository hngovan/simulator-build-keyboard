// Tải avatar DiceBear Moods (CC0 1.0, preset Bare: không má hồng, animationVariant slow: chớp mắt chậm) cho khách, người chơi, người bán.
// Lưu sẵn trong repo để game không gọi API lúc chơi. Dùng: bun run fetch:avatars
import fs from 'node:fs'

const OUT = 'public/avatars/moods'
const COUNT = 24

fs.mkdirSync(OUT, { recursive: true })
for (let i = 1; i <= COUNT; i++) {
  const n = String(i).padStart(2, '0')
  const url = `https://api.dicebear.com/10.x/moods/svg?seed=keeb-mood-${n}&cheeksProbability=0&animationVariant=slow`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`mood-${n}: HTTP ${res.status}`)
  fs.writeFileSync(`${OUT}/mood-${n}.svg`, await res.text())
}
console.log(`Đã tải ${COUNT} avatar vào ${OUT}`)
