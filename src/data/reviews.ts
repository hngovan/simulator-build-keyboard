import type { DeliveryResult, Order, Review } from '@/types'

// Đánh giá của khách: câu chữ theo số sao / lý do, uy tín đi kèm

/** số đơn từ chối mỗi ngày không bị trừ uy tín; từ đơn thứ 3 trở đi khách bực, −1 uy tín / đơn */
export const DECLINE_FREE = 2
export const DECLINE_REP = -1

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)]

const TEXTS = {
  great: [
    'Thợ có tâm, phím gõ đã tay, đóng gói cẩn thận 10/10',
    'Đúng y mô tả, âm thanh ngon lành. Sẽ quay lại!',
    'Shop tư vấn nhiệt tình, phím đẹp hơn mong đợi 😍',
  ],
  ok: [
    'Phím ổn, nhưng vài chỗ chưa kỹ lắm',
    'Tạm được, đúng giá tiền',
    'Gõ cũng được, chưa thấy gì đặc biệt',
  ],
  bad: [
    'Làm sai với mô tả, dặn một đằng làm một nẻo 😤',
    'Thợ không có tâm, phím lỗi tùm lum',
    'Tiền mất tật mang, không recommend',
  ],
  crack: [
    'Nhận phím mà case nứt một đường, shop vặn vít kiểu gì vậy 😡',
    'Case PC đẹp vậy mà nứt luôn chỗ bắt vít, may shop còn chịu đền',
  ],
  strip: [
    'Vít case tuôn ren lỏng lẻo, gõ cứ lọc xọc. Ẩu quá!',
    'Mở ra kiểm tra thấy lỗ ốc case toét ren, shop đền tiền mà vẫn bực',
  ],
  stab: [
    'Stab lỏng lẻo, vít tuôn ren vặn không ăn, space kêu lạch cạch 😤',
    'Mở ra thấy vít stab toét ren, may shop đền bộ stab mới',
  ],
  late: ['Hẹn mà trễ {n} ngày, chờ mòn mỏi 😮‍💨', 'Phím được nhưng giao trễ {n} ngày, mất điểm'],
  decline: [
    'Thợ chảnh chó, nhắn mấy lần không thèm nhận đơn',
    'Shop gì kén khách quá, thôi đi chỗ khác',
    'Hỏi đơn mà bị từ chối thẳng, hơi mất thiện cảm',
  ],
  cancel: ['Ôm đơn rồi để đó, quá hạn cả tuần. Huỷ!', 'Thợ không có tâm, nhận đơn xong bỏ xó'],
  sold: [
    'Gửi đồ cho shop build mà shop đem lên chợ bán. Huỷ kèo, né gấp!',
    'Lướt Hội Phím Cơ thấy đúng món mình gửi đang được bán. Shop lừa đảo!',
  ],
  defect: [
    'Nhận phím về bấm nút {keys} không nhận tín hiệu, shop có test trước khi giao không vậy 😤',
    'Nút {keys} chết ngắc, làm ăn ẩu quá',
    'Vừa gõ thử đã lỗi nút {keys}, thất vọng ghê',
  ],
}

const base = (order: Order, day: number) => ({
  id: `${order.id}-${day}-${Math.random().toString(36).slice(2, 6)}`,
  day,
  customer: order.customer,
  avatar: order.avatar,
})

/** uy tín khi giao hàng: sao − 3, trễ mỗi ngày −1, case hỏng trừ thêm `repLoss` */
export const shipRep = (r: DeliveryResult) => r.stars - 3 - (r.late ?? 0) - (r.repLoss ?? 0)

/** Khách nhận hàng: đánh giá theo sao, trễ hạn thì phàn nàn trễ */
export function shipReview(order: Order, r: DeliveryResult, day: number): Review {
  const text = r.damage
    ? pick(TEXTS[r.damage])
    : r.defects?.length
      ? pick(TEXTS.defect).replace('{keys}', r.defects.slice(0, 4).join(', '))
      : r.late
        ? pick(TEXTS.late).replace('{n}', String(r.late))
        : pick(r.stars >= 4 ? TEXTS.great : r.stars >= 3 ? TEXTS.ok : TEXTS.bad)
  return { ...base(order, day), stars: r.stars, text, kind: 'ship', rep: shipRep(r) }
}

/** Khách bị từ chối quá nhiều đơn trong ngày */
export const declineReview = (order: Order, day: number): Review => ({
  ...base(order, day),
  stars: 1,
  text: pick(TEXTS.decline),
  kind: 'decline',
  rep: DECLINE_REP,
})

/** Khách huỷ kèo vì phát hiện shop bán đồ mình gửi */
export const soldReview = (order: Order, day: number, rep: number): Review => ({
  ...base(order, day),
  stars: 1,
  text: pick(TEXTS.sold),
  kind: 'cancel',
  rep,
})

/** Khách huỷ đơn vì trễ hạn quá lâu */
export const cancelReview = (order: Order, day: number, rep: number): Review => ({
  ...base(order, day),
  stars: 1,
  text: pick(TEXTS.cancel),
  kind: 'cancel',
  rep,
})
