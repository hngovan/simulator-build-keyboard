import { wallpaperOf, type WallpaperId } from './wallpapers'

// Hình nền desktop KeebOS (vẽ bằng CSS, không cần ảnh), đổi ở Cài đặt (danh sách: wallpapers.ts)

/** Chữ KeebOS mờ góc phải dưới, dùng chung mọi hình nền */
function Logo({ className = 'text-white/10' }: { className?: string }) {
  return (
    <div
      className={`absolute right-10 bottom-[70px] font-head text-[90px] font-extrabold ${className}`}
    >
      KeebOS
    </div>
  )
}

/** Mặc định: gradient xanh tím + lưới chấm */
function Aurora() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#1d3b6e_0%,#3f2b72_55%,#7a2f6a_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:22px_22px]" />
      <Logo />
    </div>
  )
}

/** Hoàng hôn: trời cam, mặt trời sọc retro, 2 lớp đồi */
function Sunset() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#2a1b4a_0%,#8a3a6b_45%,#f08a4b_75%,#ffc46b_100%)]">
      <div
        className="absolute bottom-[18%] left-1/2 aspect-square w-[30%] -translate-x-1/2 rounded-full"
        style={{
          background:
            'linear-gradient(180deg,#0000 58%,#8a3a6b 58% 59.5%,#0000 59.5%,#0000 67%,#8a3a6b 67% 69.5%,#0000 69.5%,#0000 76%,#8a3a6b 76% 79.5%,#0000 79.5%,#0000 85%,#8a3a6b 85% 90%,#0000 90%),linear-gradient(180deg,#ffe08a,#ff8a4b)',
          maskImage: 'linear-gradient(180deg,#000 55%,rgba(0,0,0,0.85) 100%)',
        }}
      />
      <div className="absolute -bottom-[30%] -left-[10%] h-[55%] w-[75%] rounded-[50%] bg-[#4a2350]" />
      <div className="absolute -right-[15%] -bottom-[35%] h-[55%] w-[80%] rounded-[50%] bg-[#331a3e]" />
      <Logo className="text-white/15" />
    </div>
  )
}

/** Bàn phím: nền tối, keycap xếp nghiêng như nhìn từ trên xuống */
function Keys() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1f3a3a_0%,#10181f_70%)]">
      <div
        className="absolute -inset-1/2 rotate-[-18deg] opacity-60"
        style={{
          backgroundImage: 'linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02))',
          backgroundSize: '64px 64px',
          maskImage:
            'linear-gradient(90deg,#000 0 54px,#0000 54px),linear-gradient(180deg,#000 0 54px,#0000 54px)',
          maskSize: '64px 64px',
          maskComposite: 'intersect',
        }}
      />
      {/* vài phím màu nhấn (Esc / Enter kiểu keycap artisan) */}
      <div className="absolute top-[22%] left-[18%] size-[54px] rotate-[-18deg] rounded-md bg-[#ffcc2e]/70" />
      <div className="absolute top-[58%] right-[26%] h-[54px] w-[118px] rotate-[-18deg] rounded-md bg-[#2ed3a0]/60" />
      <Logo className="text-[#2ed3a0]/15" />
    </div>
  )
}

const VIEWS: Record<WallpaperId, () => JSX.Element> = { aurora: Aurora, sunset: Sunset, keys: Keys }

/** Hình nền theo id (bản lưu cũ / id lạ thì về mặc định) */
export function Wallpaper({ id }: { id: string }) {
  const View = VIEWS[wallpaperOf(id)]
  return <View />
}
