// Chụp sẵn ảnh sản phẩm Shopii (thẻ sản phẩm + ô Kho) ra WebP để lúc chơi không phải tải model 3D chỉ để chụp ảnh:
// mở game (dev server đang chạy) bằng Chrome ngầm, gọi `window.__bakeThumbs` (src/features/apps/shop/bakeThumbs.ts, cùng code
// chụp ảnh trong game) → public/thumbs/<khoá>.webp + bảng tra src/data/generated/thumbs.json. Đổi model / thêm sản phẩm thì chạy lại.
//   bun run dev   (cửa sổ khác)
//   bun run bake:thumbs [url dev, mặc định http://localhost:5173]
// Chrome: đặt CHROME=<đường dẫn> nếu không nằm chỗ mặc định.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const URL_DEV = process.argv[2] ?? 'http://localhost:5173'
const OUT_DIR = 'public/thumbs'
const MANIFEST = 'src/data/generated/thumbs.json'
const PORT = 9341
const CHROME =
  process.env.CHROME ??
  {
    win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  }[process.platform as string] ??
  'google-chrome'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** tên tệp từ khoá ảnh (vd `keycap:cherry:#ff0000` → `keycap__cherry__ff0000.webp`) */
const fileOf = (key: string) =>
  key
    .replace(/:/g, '__')
    .replace(/#/g, '')
    .replace(/[^a-z0-9_.-]/gi, '-') + '.webp'

try {
  await fetch(URL_DEV)
} catch {
  console.error(`Không mở được ${URL_DEV}: chạy \`bun run dev\` trước`)
  process.exit(1)
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-thumbs-'))
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  'about:blank',
])
let ws: WebSocket | undefined
try {
  // chờ Chrome mở cổng debug
  let page: { type: string; webSocketDebuggerUrl: string } | undefined
  for (let i = 0; i < 40 && !page; i++) {
    await sleep(250)
    try {
      const tabs = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()) as (typeof page)[]
      page = tabs.find((t) => t?.type === 'page')
    } catch {
      // chưa mở xong
    }
  }
  if (!page) throw new Error('Không mở được Chrome ngầm')
  const sock = new WebSocket(page.webSocketDebuggerUrl)
  ws = sock
  await new Promise((r) => (sock.onopen = r))
  let id = 0
  const pend = new Map<number, (v: unknown) => void>()
  sock.onmessage = (m) => {
    const d = JSON.parse(String(m.data))
    pend.get(d.id)?.(d)
    pend.delete(d.id)
  }
  const send = (method: string, params = {}) =>
    new Promise<{ result: { result?: { value?: unknown }; exceptionDetails?: unknown } }>((r) => {
      const i = ++id
      pend.set(i, r as (v: unknown) => void)
      sock.send(JSON.stringify({ id: i, method, params }))
    })
  const ev = async <T>(expression: string) => {
    const { result } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result?.value as T
  }

  await send('Page.navigate', { url: URL_DEV })
  for (let i = 0; i < 120 && !(await ev<boolean>('!!window.__bakeThumbs').catch(() => false)); i++)
    await sleep(500)
  const keys = await ev<string[]>('window.__bakeThumbs.keys()')
  if (!keys?.length) throw new Error('Không lấy được danh sách ảnh (window.__bakeThumbs)')

  fs.rmSync(OUT_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const manifest: Record<string, string> = {}
  const used = new Set<string>()
  let bytes = 0
  for (const [i, key] of keys.entries()) {
    const file = fileOf(key)
    if (used.has(file)) throw new Error(`Trùng tên tệp: ${file} (${key})`)
    used.add(file)
    const url = await ev<string>(`window.__bakeThumbs.shoot(${JSON.stringify(key)})`).catch(
      (e: Error) => (console.warn(`  bỏ qua ${key}: ${e.message.slice(0, 120)}`), null),
    )
    if (!url?.startsWith('data:image/webp')) continue
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
    fs.writeFileSync(path.join(OUT_DIR, file), buf)
    manifest[key] = file
    bytes += buf.length
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1} / ${keys.length}`)
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  console.log(
    `Xong: ${Object.keys(manifest).length} / ${keys.length} ảnh, ${(bytes / 1024 / 1024).toFixed(2)} MB → ${OUT_DIR}`,
  )
} finally {
  ws?.close()
  chrome.kill()
  await sleep(500)
  // Chrome có thể còn giữ tệp hồ sơ một lúc: xoá không được thì thôi (thư mục tạm)
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
  } catch {
    // bỏ qua
  }
}
