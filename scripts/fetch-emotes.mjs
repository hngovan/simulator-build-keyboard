// Tải emote ếch xanh (Pepe) từ FrankerFaceZ để thay emoji trong tin nhắn Mezzenger.
// Emote do người dùng FFZ tải lên (fan art Pepe của Matt Furie), chưa rõ giấy phép: chỉ dùng cá nhân.
// Dùng: bun run fetch:emotes
import fs from 'node:fs'

const OUT = 'public/emotes'
// tên emote → id FFZ (chọn bản dùng nhiều nhất, ảnh tĩnh)
const EMOTES = {
  FeelsOkayMan: 145947,
  Prayge: 507766,
  peepoMad: 259518,
  Sadge: 425196,
  peepoHappy: 228449,
  peepoRun: 334008,
  peepoLove: 250614,
  FeelsGoodMan: 109777,
  peepoSad: 230082,
  pepeLaugh: 341767,
  monkaS: 130762,
}

fs.mkdirSync(OUT, { recursive: true })
const credits = []
for (const [name, id] of Object.entries(EMOTES)) {
  const info = await (await fetch(`https://api.frankerfacez.com/v1/emote/${id}`)).json()
  // bản 4x (~112px) cho nét trên màn hình độ phân giải cao
  const res = await fetch(`https://cdn.frankerfacez.com/emote/${id}/4`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(await res.arrayBuffer()))
  credits.push(
    `- ${name}: https://www.frankerfacez.com/emoticon/${id} (tải lên bởi ${info.emote.owner.name})`,
  )
  console.log(`✔ ${name}`)
}
fs.writeFileSync(
  `${OUT}/SOURCE.md`,
  `# Emote ếch xanh (Pepe)\n\nNguồn FrankerFaceZ, fan art Pepe the Frog (Matt Furie). Chưa rõ giấy phép — chỉ dùng cá nhân.\n\n${credits.join('\n')}\n`,
)
