import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useGame } from '@/store'
import { useSceneLoading } from '@/scene/common/loadingStore'
import { GuideGirl } from '@/components/art/GuideGirl'
import { LOAD_TIPS } from '@/data/loadTips'

/** nền giống màn hình tiêu đề */
const BG =
  'radial-gradient(circle at 30% 20%, #3b2a6b, transparent 50%), radial-gradient(circle at 80% 80%, #0f5a5a, transparent 50%), #12131c'
/** đổi mẹo sau mỗi bao lâu (ms) */
const TIP_MS = 4500

/** nhãn đang làm gì theo đường dẫn tệp đang tải: [câu chính, chú thích nhỏ] */
const PHASES: [RegExp, string, string][] = [
  [/models\/keyboards\//, 'Đang dọn case lên kệ...', 'Mô hình case'],
  [/models\/switch\//, 'Đang phân loại switch...', 'Mô hình switch'],
  [/models\/stab\//, 'Đang lắp stab mẫu...', 'Mô hình stab'],
  [/models\/dtb\//, 'Đang cắm daughterboard...', 'Mô hình mạch'],
  [/models\/tools\//, 'Đang bày dụng cụ...', 'Mỏ hàn, tua vít'],
  [/models\/(room|desk)\//, 'Đang kê bàn ghế...', 'Đồ trong phòng'],
  [/\.(hdr|exr)/, 'Đang bật đèn xưởng...', 'Ánh sáng'],
  [/audio\//, 'Đang lên dây âm thanh...', 'Âm thanh'],
  [/\.(png|jpe?g|webp|ktx2)/, 'Đang dán decal...', 'Hình ảnh'],
]

/** tệp tài nguyên tính vào dung lượng đã tải (model / ảnh / âm thanh, bỏ code) */
const ASSET = /\.(glb|gltf|bin|hdr|exr|png|jpe?g|webp|ktx2|mp3|ogg|wav)(\?|$)/
// cộng dồn từ đầu phiên bằng PerformanceObserver (bộ đệm `getEntriesByType` chỉ giữ 250 mục, dev server Vite lấp đầy bằng module JS)
let assetBytes = 0
if (typeof PerformanceObserver !== 'undefined')
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as PerformanceResourceTiming[])
      if (ASSET.test(e.name)) assetBytes += e.decodedBodySize || e.encodedBodySize || 0
  }).observe({ type: 'resource', buffered: true })

/** dung lượng tài nguyên đã tải (MB), đọc lại mỗi 300ms khi màn tải đang hiện */
function useLoadedMb(on: boolean) {
  const [mb, setMb] = useState(0)
  useEffect(() => {
    if (!on) return
    const read = () => setMb(assetBytes / 1024 / 1024)
    read()
    const t = setInterval(read, 300)
    return () => clearInterval(t)
  }, [on])
  return mb
}

/** số giây từ lúc `on` bật (đếm mỗi 200ms), tắt thì về 0 */
function useElapsed(on: boolean) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!on) return
    const t0 = performance.now()
    const t = setInterval(() => setSec((performance.now() - t0) / 1000), 200)
    return () => {
      clearInterval(t)
      setSec(0)
    }
  }, [on])
  return sec
}

/**
 * % ước lượng theo giai đoạn: lúc màn chờ hiện còn tệp đang tải thì tải tệp 0–80, dựng cảnh 80–95; tệp đã tải sẵn hết (từ màn tiêu đề)
 * thì dựng cảnh chạy luôn 0–95 (tăng chậm dần theo thời gian); model bước đầu 99
 */
const FILES_PCT = 80
const BUILD_PCT = 95
/** dựng cảnh: sau chừng này giây đi được ~63% đoạn đường còn lại tới 95 */
const BUILD_TAU = 3

/** mẹo xoay vòng, bắt đầu ngẫu nhiên */
function useTip(on: boolean) {
  const [i, setI] = useState(() => Math.floor(Math.random() * LOAD_TIPS.length))
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => setI((x) => (x + 1) % LOAD_TIPS.length), TIP_MS)
    return () => clearInterval(t)
  }, [on])
  return LOAD_TIPS[i]
}

// Màn hình chờ khi tải cảnh 3D: phủ kín (che cả HUD / desktop) tới khi cảnh + model bước đầu tải xong, phủ mờ khi bước mới cần tải model
// (chỉ ở bàn build; ngồi máy tính thì cảnh đứng yên làm nền, không phủ mờ)
export function BenchLoader() {
  const ready = useSceneLoading((s) => s.settled)
  const pc = useGame((s) => s.screen === 'pc')
  const stepLoading = useSceneLoading((s) => s.pending > 0) && !pc
  const { active, progress, item, loaded, total } = useProgress()
  // Suspense ngoài cùng đã xong (môi trường + phòng dựng xong), còn chờ model bước đầu
  const built = useSceneLoading((s) => s.ready)
  const full = !ready
  // tệp đã tải xong (thường tải sẵn từ màn tiêu đề qua useGLTF.preload) mà cảnh chưa dựng xong: đang giải nén model / dựng cảnh
  const building = full && !active && !built
  const buildSec = useElapsed(building)
  const mb = useLoadedMb(full)
  const tip = useTip(full)
  // % theo giai đoạn (không chỉ đếm tệp: model tải sẵn từ màn tiêu đề nên số tệp thường đã đủ ngay từ đầu,
  // phần chờ thật là dựng cảnh); chỉ 100% khi xong hẳn (lúc đó màn chờ đã tắt)
  // lúc màn chờ vừa hiện: có tệp đang tải không + số tệp đã tải khi đó (tệp tải sẵn từ màn tiêu đề không tính, % chạy từ 0);
  // không có tệp đang tải thì bỏ giai đoạn tải tệp, % chạy theo dựng cảnh
  const [start, setStart] = useState<{ active: boolean; loaded: number } | null>(null)
  if (full && !start) setStart({ active, loaded })
  if (!full && start) setStart(null)
  const filesPct = start?.active ? FILES_PCT : 0
  const base = start?.loaded ?? 0
  const fileFrac = total > base ? Math.max(0, loaded - base) / (total - base) : 0
  const raw = !start
    ? 0
    : active
      ? Math.floor(fileFrac * filesPct)
      : building
        ? Math.floor(filesPct + (BUILD_PCT - filesPct) * (1 - Math.exp(-buildSec / BUILD_TAU)))
        : built
          ? 99
          : filesPct
  // chỉ tăng: giữa chừng có đợt tải mới (vd ánh sáng HDR) thì giữ số cũ, không tụt lùi; màn chờ tắt thì về 0
  const [shown, setShown] = useState(0)
  if (full && raw > shown) setShown(raw)
  if (!full && shown) setShown(0)
  if (ready && !stepLoading) return null

  // đổi bước cần tải model: chỉ phủ mờ + chữ nhỏ, không che HUD
  if (ready)
    return (
      <div className="pointer-events-none fixed inset-0 z-[4] grid animate-fade-in place-items-center bg-black/35">
        <div className="flex flex-col items-center gap-2 drop-shadow-[0_2px_4px_#000a]">
          <span className="animate-bob text-4xl">⌨️</span>
          <span className="font-head text-lg font-extrabold text-yellow">Đang tải mô hình...</span>
          <span className="text-xs text-muted">
            {active ? `${Math.round(progress)}%` : 'Sắp xong'}
          </span>
        </div>
      </div>
    )

  const pct = shown
  const phase = active ? PHASES.find(([re]) => re.test(item)) : undefined
  const [title, note] = phase
    ? [phase[1], phase[2]]
    : active
      ? [pc ? 'Đang mở xưởng phím...' : 'Đang dọn bàn build...', 'Tải tài nguyên']
      : building
        ? ['Đang dựng xưởng...', 'Giải nén mô hình, bật đèn']
        : ['Sắp xong...', 'Mô hình trên bàn']
  return (
    <div
      className="fixed inset-0 z-[50] flex animate-fade-in flex-col px-12 pt-10 pb-8 max-md:px-5 max-md:pt-6"
      style={{ background: BG }}
    >
      <h1 className="text-[34px] leading-[0.95] text-white [text-shadow:0_4px_0_#000a] max-md:text-2xl">
        SIMULATOR
        <br />
        <span className="text-yellow">BUILD KEYBOARD</span>
      </h1>

      {/* Keeb-chan nhún giữa màn + bóng đổ dưới chân */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <GuideGirl className="max-h-[52vh] w-[220px] animate-bob max-md:w-[150px]" />
        <span className="-mt-3 h-5 w-40 rounded-[50%] bg-black/45 blur-md" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-center">
          <div className="flex max-w-[640px] items-center gap-2.5 rounded-xl bg-black/45 px-3 py-2 backdrop-blur-sm">
            <span className="shrink-0 rounded-md bg-yellow px-2 py-0.5 font-head text-[11px] font-black text-[#3a2b00] shadow-[0_2px_0_rgba(0,0,0,0.35)]">
              MẸO
            </span>
            <span key={tip} className="animate-fade-in text-sm font-bold text-ink">
              {tip}
            </span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="truncate font-head text-lg font-extrabold text-yellow">{title}</span>
            <span className="truncate text-xs font-bold text-muted">{note}</span>
          </div>
          <span className="font-head text-2xl font-black text-white tabular-nums">{pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-black/45 shadow-[inset_0_2px_3px_rgba(0,0,0,0.4)]">
          <div
            className="h-full rounded-full bg-yellow shadow-[inset_0_2px_0_rgba(255,255,255,0.35)] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-bold text-muted tabular-nums">
          <span>
            {mb.toFixed(1)} MB đã tải{total ? ` · ${loaded} / ${total} tệp` : ''}
          </span>
          <span>v{__APP_VERSION__}</span>
        </div>
      </div>
    </div>
  )
}
