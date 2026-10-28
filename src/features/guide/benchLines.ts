import type { StepId } from '@/types'

// Hội thoại Keeb-chan ở bàn build: bàn trống (`EMPTY` / `PICK`), build đầu tiên (`INTRO`) + lần đầu gặp mỗi bước
// (`STEP_LINES`). Đọc xong thì ghi id vào `guideSeen`, không hiện lại
export interface Topic {
  id: string
  lines: string[]
}

/**
 * các đoạn hội thoại hợp tình huống (lọc đã đọc ở `BenchDialog`): `step` = bước đang làm, không có = bàn trống;
 * `mica` = case mica xếp nhiều lớp (bước mở / đóng case nói theo `MICA_LINES`)
 */
export const benchTopics = (step: StepId | undefined, hasOrder: boolean, mica = false): Topic[] =>
  !step
    ? [hasOrder ? { id: 'bench:pick', lines: PICK } : { id: 'bench:empty', lines: EMPTY }]
    : [
        { id: 'bench:intro', lines: INTRO },
        mica && MICA_LINES[step]
          ? { id: `step:${step}:mica`, lines: MICA_LINES[step] }
          : { id: `step:${step}`, lines: STEP_LINES[step] },
      ]

const EMPTY = [
  'Ơ, bàn build còn trống trơn nè! Mình là Keeb-chan, trợ lý của thợ phím mới 💕',
  'Muốn build thì phải có đơn đã. Bấm "Về máy tính" góc trái trên, mở Mezzenger xem khách nhắn.',
  'Chọn đơn hợp sức rồi bấm "Nhận đơn". Nhận xong quay lại đây, bấm ô vàng trên bàn để bắt đầu nha!',
]

const PICK = [
  'Có đơn rồi đó! Bấm ô vàng trên bàn để mở danh sách đơn đã nhận.',
  'Chọn 1 đơn: đủ linh kiện là vào build luôn, thiếu thì mình liệt kê ra để bạn đặt ở Shopii, hàng tới cửa thì ra nhận nha.',
]

const INTRO = [
  'Chào mừng tới bàn build! Mình sẽ đi cùng bạn từng bước lắp phím nha 💕',
  'Bên trái là thông tin đơn và danh sách bước. Bấm vào bước đã làm để quay lại sửa.',
  'Ở dưới là việc cần làm ngay bây giờ, mũi tên vàng chỉ chỗ cần bấm. Lỡ tay thì Ctrl + Z hoàn tác nhé!',
]

/** bước vặn vít vào: skill check canh lực, quá tay là trượt ren / nứt case → đền khách */
const TORQUE_LINE =
  'Bấm vít cho kim lực chạy qua lại, bấm lần nữa (hoặc Space) dừng trong vùng xanh, trúng vàng là hoàn hảo. Dừng ở đỏ bên phải là trượt ren, 3 lần là tuôn, case PC / mica / acrylic còn có thể nứt, giao đi là phải đền khách đó 😱'

/** case mica: nhiều tấm mica cắt laser chồng lên nhau, vít xuyên qua mọi lớp (không phải case 2 mảnh) */
const MICA_LINES: Partial<Record<StepId, string[]>> = {
  caseOpen: [
    'Case mica này là nhiều tấm mica cắt laser chồng lên nhau, vít xuyên qua hết các lớp giữ chúng lại.',
    'Chọn đúng đầu vít rồi click từng con vít (sai đầu là tuôn ren). Tháo hết là nhấc được mấy lớp trên ra để thả board vào.',
  ],
  caseClose: ['Xếp các lớp mica phía trên lại lên board nào. Click vào phần case trên nhé.'],
  caseScrew: [
    'Vặn vít xuyên qua các lớp mica cho chặt là cả chồng mica liền thành case rồi 💪',
    TORQUE_LINE,
  ],
}

const STEP_LINES: Record<StepId, string[]> = {
  unbox: ['Hàng về rồi! Click vào thùng hàng để mở hộp, xem khách gửi gì nào 📦'],
  caseOpen: [
    'Case này 2 mảnh nên phải tháo vít trước đã.',
    'Chọn đúng đầu vít rồi click từng con vít (sai đầu là tuôn ren). Tháo hết là nhấc được case trên ra.',
  ],
  stabMod: [
    'Mod stab là bước tuỳ chọn, nhưng làm thì phím dài êm hẳn, hết lạch cạch đó!',
    'Cứ theo mũi tên vàng: stab Cherry thì cắt chân stem, dán băng Urgo; stab đời mới (TX, Staebies...) khít sẵn, chỉ cần phết mỡ housing + slider rồi tới wire.',
    'Vội thì bấm "Bỏ qua" cũng được, khách khó tính có thể chê tiếng stab thôi 😅',
  ],
  stab: [
    'Giờ lắp stab cho các phím dài (từ 2u trở lên) như Space, Shift, Enter, Backspace.',
    'Click vào đúng vị trí các phím dài trên board là stab tự vào chỗ.',
  ],
  stabScrew: [
    'Stab screw-in thì mỗi con cần 2 vít bắt từ mặt dưới PCB. Vặn chặt kẻo stab bị lỏng nha!',
    TORQUE_LINE,
  ],
  foam: [
    'Lót foam Poron giữa PCB và plate là tuỳ chọn, nhưng gõ sẽ bớt rung và ra tiếng thock trầm hơn đó!',
    'Có foam trong kho thì click vào PCB để lót. Không cần thì bấm "Bỏ qua" nha.',
  ],
  plate: ['Đặt plate lên trên PCB nào. Click vào board để thả plate xuống.'],
  switchLube: [
    'Lube switch cũng tuỳ chọn, nhưng switch lube rồi gõ mượt và đầm tiếng hơn nhiều ✨',
    'Click switch trên đồ mở để tách housing, stem và lò xo ra trước.',
    'Rồi click switch đã mở để lube 1 mẻ. Mở hết switch thì lắc lube lò xo trong hộp được luôn.',
  ],
  switch: [
    'Tới lúc cắm switch! Click vào lỗ trên plate để cắm.',
    'Mỗi lần cắm được bao nhiêu con tuỳ bậc thợ. Có chứng chỉ hoặc sách phép thì cắm nhanh hơn nhiều đó.',
  ],
  solder: [
    'Board đã lật rồi, giờ hàn switch vào PCB nhé 🔥',
    'Bấm chân switch cho kim nhiệt chạy, bấm lần nữa dừng trong vùng xanh (vàng là hoàn hảo). Dừng ở đỏ bên phải là cháy chân đó!',
    'Hàn cháy thì mũi hàn bị đen: lau vào bùi nhùi rồi hút thiếc hàn lại chân cháy.',
  ],
  gasket: ['Gasket mount: dán các miếng đệm silicon quanh plate cho phím gõ êm và nhún nhẹ.'],
  ring: [
    'O-ring mount: cuốn vòng silicon vào khe giữa PCB và plate.',
    'Click vào board là vòng tự cuốn quanh, plate sẽ được kẹp êm trong case.',
  ],
  feet: [
    'Case đã lật úp rồi. Dán feet cao su vào từng hốc tròn dưới đáy để phím không trượt trên bàn.',
    'Chọn feet đen hay trắng ở bảng bên phải, mỗi hốc dán 1 cái nha.',
  ],
  topCase: ['Top mount: úp case trên xuống plate trước. Click vào case trên nhé.'],
  topScrew: [
    'Case trên úp rồi thì bấm Q (hoặc bấm vào case) lật cả cụm lên, vặn ốc M2 từ dưới qua tai plate vào case trên.',
    TORQUE_LINE,
  ],
  caseIn: ['Giờ thả board vào case. Click vào case để đặt board xuống.'],
  trayScrew: [
    'Tray mount: vặn các vít giữ PCB vào standoff dưới đáy case. Nhớ đổi đúng đầu vít Torx!',
    TORQUE_LINE,
  ],
  caseClose: ['Đậy case trên lại nào. Click vào case trên.'],
  caseScrew: ['Vặn vít khoá 2 mảnh case lại là xong phần vỏ rồi 💪', TORQUE_LINE],
  keycap: [
    'Sắp xong rồi! Click vào switch để cắm keycap.',
    'Khách có đòi chất liệu keycap thì xem lại thông tin đơn bên trái cho chắc nha.',
  ],
  test: [
    'Bước cuối: test phím! Gõ bàn phím thật hoặc click phím 3D, phím test rồi có chấm xanh.',
    'Test hết phím trước khi giao nhé! Bỏ sót là khách có thể báo lỗi nút, bị đánh giá thấp đó 😣',
    'Phím không bấm ăn thì quay lại bước hàn sửa. Xong thì đóng gói giao khách thôi 🎉',
  ],
}
