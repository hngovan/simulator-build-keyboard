import { useGame } from '@/store'
import { Avatar, Button, Panel, Muted } from '@/components/ui'
import { OrderSpec } from '@/components/game/OrderSpec'
import { ChatBubble } from './ChatBubble'
import { ResultCard } from './ResultCard'

const reaction = (stars: number) =>
  stars >= 4
    ? 'Phím xịn quá shop ơi, cảm ơn nhiều!'
    : stars >= 3
      ? 'Cũng ổn, nhưng chưa hoàn hảo lắm.'
      : 'Không giống mình dặn lắm shop ạ 😕'

// Tin nhắn: nhận đơn mới, xem đơn đang làm, xem kết quả giao hàng
export function Messenger() {
  const offer = useGame((s) => s.offer)
  const order = useGame((s) => s.order)
  const result = useGame((s) => s.result)
  const { acceptOrder, declineOrder, nextDay } = useGame.getState()
  const o = order ?? offer
  if (!o) return null

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2.5">
        <Avatar>{o.avatar}</Avatar>
        <div>
          <b>{o.customer}</b>
          <div>
            <Muted>{result ? 'Đã giao hàng' : order ? 'Đơn đang làm' : 'Tin nhắn mới'}</Muted>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {o.lines.map((l, i) => (
          <ChatBubble key={i} from="in">
            {l}
          </ChatBubble>
        ))}
        {order && <ChatBubble from="out">Ok bạn, shop nhận đơn nhé! 👌</ChatBubble>}
        {result && (
          <>
            <ChatBubble from="out">Hàng đã giao, bạn check giúp shop nhé 📦</ChatBubble>
            <ChatBubble from="in">{reaction(result.stars)}</ChatBubble>
          </>
        )}
      </div>
      {result ? (
        <ResultCard result={result} onNext={nextDay} />
      ) : (
        <Panel>
          <OrderSpec order={o} />
          {!order && (
            <div className="mt-3 flex gap-2.5">
              <Button tone="green" className="flex-1" onClick={acceptOrder}>
                ✔ Nhận đơn
              </Button>
              <Button tone="red" className="flex-1" onClick={declineOrder}>
                ✖ Từ chối
              </Button>
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}
