import { useEffect } from 'react'
import { useGame } from '@/store'
import { Button } from '@/components/ui'
import { Spotlight } from './Spotlight'
import { holeOf, useTargetRect } from './spotlightRect'
import { SHIP_TOUR_ID } from './roomGuideSteps'
import { PAY_LINES } from './benchLines'

/**
 * Tour nhỏ ở máy tính: đơn hướng dẫn đã gửi mà chưa thu tiền → tối màn, sáng icon Mezzenger (mở sẵn đúng hội thoại khách)
 * rồi sáng nút "Thu tiền". Thu xong thì tắt (lời dẫn trong phòng chuyển sang bấm lịch kết thúc ngày)
 */
export function PayTour() {
  const id = useGame(
    (s) =>
      s.packed.find((p) => p.order.tutorial && p.shipped && p.paid === false)?.order.id ?? null,
  )
  const seen = useGame((s) => s.guideSeen.includes(SHIP_TOUR_ID))
  // mở Mezzenger là vào thẳng hội thoại khách của đơn này
  useEffect(() => {
    if (id && !seen) useGame.getState().setMessengerPick(id)
  }, [id, seen])
  const pay = useTargetRect(id && !seen ? 'collect-pay' : null)
  const app = useTargetRect(id && !seen && !pay ? 'app-messenger' : null)
  if (!id || seen) return null
  const hole = holeOf(pay ?? app)
  return (
    <Spotlight
      hole={hole}
      text={pay ? PAY_LINES.collect : PAY_LINES.open}
      actions={
        <Button size="sm" onClick={() => useGame.getState().seeGuide(SHIP_TOUR_ID)}>
          Bỏ qua hướng dẫn
        </Button>
      }
    />
  )
}
