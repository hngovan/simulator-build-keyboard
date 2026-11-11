import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button, HudCard, Muted } from '@/components/ui'
import { CASES, MOUNTS } from '@/data/parts'
import { useGame } from '@/store'
import { buildFree, derive, layoutName, pickDefaultCase, setFree, useFreeForm } from './freeForm'
import { FreePreview } from './FreePreview'
import { CaseList, ColumnTitle, FreePicker } from './FreePickers'
import {
  CaseColorTile,
  FeetTile,
  KeycapTile,
  LayoutTile,
  MountTile,
  PcbTile,
  PlateTile,
  StabTile,
  SwitchTile,
} from './FreeTiles'

/**
 * Free build: bảng cấu hình 3 cột. Trái = lựa chọn chính, loại case (`CaseList`: lọc theo cỡ đứng yên + danh sách thẻ, bấm thẻ là
 * chọn). Giữa = khung xem 3D bàn phím đang chọn. Phải = lựa chọn phụ dạng lưới bento (`FreeTiles`: màu case chọn ngay trên ô;
 * layout, mount, PCB, plate, stab, switch, keycap, feet mỗi ô 1 component hiện giá trị đang chọn), bấm 1 ô = cột phải vào màn chọn
 * riêng của ô đó (`FreePicker`, có nút quay lại), không lẫn nhóm khác. Lựa chọn nằm ở store `useFreeForm` (mở bảng là có sẵn
 * 1 case). Bấm Build = vào bàn build với đủ đồ (`startFreeBuild`)
 */
export function FreeBuildDialog() {
  const onClose = () => useGame.setState({ freePick: false })
  const f = useFreeForm()
  const d = derive(f)
  const ready = !!f.pick && !!f.layout
  // mở bảng: về màn chính, chưa có case thì chọn sẵn 1 case
  useEffect(() => {
    setFree({ tile: null })
    pickDefaultCase()
  }, [])
  return createPortal(
    <div
      className="fixed inset-0 z-[3500] grid animate-fade-in place-items-center bg-black/45 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* điện thoại: xếp dọc (xem 3D → lưới ô → bảng chọn), cuộn cả bảng */}
      {/* bảng trong hơn mặc định để khung xem 3D kính mờ nhìn xuyên thấy bàn build phía sau */}
      <HudCard className="flex h-[min(92vh,860px)] w-[min(1400px,100%)] flex-col gap-3 !bg-panel/60 backdrop-blur-sm max-md:h-auto max-md:max-h-[94vh] max-md:overflow-y-auto">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h3 className="font-head text-xl font-extrabold text-yellow">Free build</h3>
          <Muted className="text-sm">
            Đủ linh kiện + dụng cụ + vật tư, không chấm điểm. Chọn loại case, chỉnh tuỳ chọn rồi bấm
            Build.
          </Muted>
        </div>
        <div className="flex min-h-0 flex-1 gap-3 max-md:flex-col">
          {/* 1. loại case */}
          <div className="flex w-[300px] shrink-0 flex-col max-md:w-full">
            <CaseList />
          </div>
          {/* xem 3D ở giữa */}
          <div className="min-h-0 min-w-0 flex-1 max-md:order-first max-md:h-56 max-md:flex-none">
            <FreePreview />
          </div>
          {/* 2. lựa chọn phụ: lưới ô, bấm ô thì vào màn chọn riêng của ô đó */}
          <div className="flex w-[380px] shrink-0 flex-col gap-2 max-md:w-full">
            {f.tile ? (
              <FreePicker tile={f.tile} />
            ) : (
              <>
                <ColumnTitle n={2} title="Tuỳ chọn" hint="bấm ô để đổi" />
                <div className="grid min-h-0 grid-cols-2 content-start gap-2 overflow-y-auto">
                  {/* thứ tự theo việc hay đổi nhất: màu case → switch → keycap → layout (ô to), rồi các món ít đổi (ô nhỏ) */}
                  <CaseColorTile className="col-span-2" />
                  <SwitchTile className="col-span-2" big />
                  <KeycapTile className="col-span-2" big />
                  <LayoutTile className="col-span-2" />
                  <MountTile />
                  <PcbTile />
                  <PlateTile />
                  <StabTile />
                  <FeetTile className="col-span-2" />
                </div>
              </>
            )}
          </div>
        </div>
        {/* đáy: tóm tắt lựa chọn (hoặc nhắc vì sao chưa build được) + nút */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto min-w-0 truncate text-sm font-bold text-muted">
            {f.pick && f.layout
              ? `${CASES[f.pick.caseId].name} · ${d.hhkb40 ? '40% HHKB' : layoutName(f.layout)} · ${MOUNTS[f.mount]?.name ?? ''}`
              : 'Chưa chọn case: bấm 1 thẻ ở cột Loại case'}
          </span>
          <Button onClick={onClose}>Đóng</Button>
          <Button tone="green" disabled={!ready} onClick={buildFree}>
            Build
          </Button>
        </div>
      </HudCard>
    </div>,
    document.body,
  )
}
