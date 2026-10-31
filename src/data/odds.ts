// Bảng tỉ lệ trong game (Keeb-chan mở được ở máy tính, README chép lại): lấy thẳng từ hằng số trong code
// để đổi tỉ lệ ở đâu thì bảng tự đúng theo. Món nào code ghi số trực tiếp (không có hằng) thì chép số ở đây.
import { BAN_DAYS, BEG_BLOCK, BEG_GIFT, LOWBALL_BLOCK, LOWBALL_OK, MUTE_BLOCK } from './market'
import {
  BUYBACK_DAYS,
  BUYBACK_MARKUP,
  BUYBACK_REFUSE,
  BUYBACK_REP,
  FLAW_CAUGHT,
  PRICEY,
  RICH_BASE,
  RICH_CERT,
  RICH_MAX,
  STEAL_OK,
  UNLIST_FREE,
} from './selling'
import { SUPPLIES } from './supplies'
import { UNTESTED_FAIL } from '@/store/scoring'
import { NO_WORK_FINE } from '@/store/shopSlice'

const pct = (p: number) => `${Math.round(p * 100)}%`

export interface OddsRow {
  /** tình huống */
  what: string
  /** tỉ lệ / kết quả */
  odds: string
}
export interface OddsGroup {
  icon: string
  title: string
  rows: OddsRow[]
}

export const ODDS: OddsGroup[] = [
  {
    icon: '🤝',
    title: 'Mua hàng pass ở Hội Phím Cơ',
    rows: [
      { what: 'Người bán liêm (mô tả đúng tình trạng)', odds: '60%' },
      { what: 'Người bán bùng tiền', odds: '8% người liêm · 30% người không liêm' },
      { what: 'Check var lục được bài tố người bùng', odds: '70%' },
      { what: 'Hàng lỗi: case / plate / PCB', odds: '45% / 35% / 35%' },
      {
        what: 'Hàng lỗi: keycap / switch / stab (không lắp cho khách được, chỉ bán lại, giá còn 1 nửa)',
        odds: '55% / 40% / 40%',
      },
      { what: 'Bài "Price no offer" · "Fs" (free ship) · "câm điếc"', odds: '25% · 35% · 30%' },
      { what: 'Hỏi han bài "câm điếc" bị chặn (mỗi câu)', odds: pct(MUTE_BLOCK) },
      { what: 'Xin lộc bài "Price no offer" bị chặn', odds: '40%' },
      { what: 'Chốt nhanh được bớt 100–200k', odds: '65%' },
      {
        what: 'Lowball (trả 70%) bài thường',
        odds: `${pct(LOWBALL_BLOCK.normal)} bị chặn · ${pct((1 - LOWBALL_BLOCK.normal) * LOWBALL_OK.normal)} được`,
      },
      {
        what: 'Lowball bài "Lowball thoải mái"',
        odds: `${pct(LOWBALL_BLOCK.lowball)} bị chặn · ${pct((1 - LOWBALL_BLOCK.lowball) * LOWBALL_OK.lowball)} được`,
      },
      { what: 'Lowball bài "Price no offer"', odds: '100% bị chặn' },
      {
        what: 'Đi ăn xin',
        odds: `${pct(BEG_GIFT)} được free · ${pct(BEG_BLOCK)} bị chặn · ${pct(1 - BEG_GIFT - BEG_BLOCK)} ban chợ ${BAN_DAYS} ngày`,
      },
    ],
  },
  {
    icon: '💸',
    title: 'Tự đăng bán / bán phím của khách',
    rows: [
      { what: 'Bán phím của khách mà khách không phát hiện', odds: pct(STEAL_OK) },
      { what: 'Bị lộ', odds: `${pct(1 - STEAL_OK)} · −1 uy tín` },
      {
        what: `Chuộc lại phím (giá ×${BUYBACK_MARKUP[0]} ~ ×${BUYBACK_MARKUP[1]} giá đã bán)`,
        odds: `${pct(BUYBACK_REFUSE)} bị từ chối · được thì +${BUYBACK_REP} uy tín, giữ ${BUYBACK_DAYS} ngày`,
      },
      {
        what: `Đăng trên giá chợ tới ${RICH_MAX}× giá gốc: đại gia chốt trong đêm (tối đa 1 đại gia / đêm)`,
        odds: `${pct(RICH_BASE)} · +${pct(RICH_CERT)} mỗi bậc thợ · +5% nếu Free ship`,
      },
      {
        what: `Đăng > ${PRICEY}× giá gốc: bị chê (có chứng chỉ thì bớt chê, có người khen)`,
        odds: `35% (> ${RICH_MAX}×: 60%) mỗi lượt bot ghé · −${pct(RICH_CERT)} mỗi bậc thợ`,
      },
      {
        what: 'Fast bid (1 phút): giá chốt',
        odds: '~45% → 125% giá chợ (có thể lời / lỗ) · khởi điểm ≤ giá sàn (45% giá chợ) chắc chắn có người bid',
      },
      {
        what: 'Bán hàng lỗi bị tố mô tả sai sự thật',
        odds: `${pct(FLAW_CAUGHT)} · admin ban chợ ${BAN_DAYS} ngày`,
      },
      { what: `Gỡ bài quá ${UNLIST_FREE} lần / ngày`, odds: `Admin ban chợ ${BAN_DAYS} ngày` },
    ],
  },
  {
    icon: '🔧',
    title: 'Lắp ráp & giao hàng',
    rows: [
      {
        what: 'Thiếc đểu cháy chân dù nhả đúng vùng xanh',
        odds: pct(SUPPLIES.solderCheap.solder?.burnChance ?? 0),
      },
      { what: 'Giao khi chưa test hết phím: khách báo 1 nút lỗi', odds: pct(UNTESTED_FAIL) },
      {
        what: 'Còn switch chưa hàn / hàn cháy',
        odds: 'Test: phím không nhận · giao đi: khách báo nút không nhận tín hiệu (100%, tối đa 2 sao)',
      },
    ],
  },
  {
    icon: '📨',
    title: 'Đơn hàng',
    rows: [
      { what: 'Đơn kit (khách gửi sẵn vài món)', odds: '~50%' },
      { what: 'Yêu cầu đúng loại switch (1 mẫu cụ thể)', odds: '35%' },
      { what: 'Đòi đích danh case / stab / plate', odds: '30% mỗi món' },
      { what: 'Đòi chất liệu keycap', odds: '80%' },
      {
        what: 'Qua ngày mà đơn đã nhận cả ngày không làm (khách report)',
        odds: `Đền ${pct(NO_WORK_FINE)} tiền công mỗi đơn`,
      },
      { what: 'Muốn lube · cấm lube · tuỳ shop', odds: '40% · 20% · 40%' },
    ],
  },
]
