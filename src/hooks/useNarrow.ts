import { useEffect, useState } from 'react'

/** màn hẹp (điện thoại, < 768px như breakpoint `md` của Tailwind) */
const QUERY = '(max-width: 767px)'

/** true khi màn hẹp; theo dõi xoay màn / đổi cỡ cửa sổ */
export function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}
