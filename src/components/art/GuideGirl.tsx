// NPC hướng dẫn "Keeb-chan": cô bé chibi đội mũ máy đánh chữ, váy in bàn phím (ảnh `public/art/keeb-chan.webp`,
// nền trong suốt, thu nhỏ từ PNG gốc bằng ffmpeg)
const GUIDE_ART = '/art/keeb-chan.webp'

export function GuideGirl({ className }: { className?: string }) {
  return (
    <img
      src={GUIDE_ART}
      alt="Keeb-chan"
      draggable={false}
      className={`drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] select-none ${className ?? ''}`}
    />
  )
}
