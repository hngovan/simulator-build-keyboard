import { ProgressBar } from './ProgressBar'

interface Props {
  loud: number
  pitch: number
  /** [độ ồn, cao độ] khách mong muốn */
  target?: [number, number]
}

function Row({
  left,
  right,
  children,
}: {
  left: string
  right: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[34px_1fr_34px] items-center gap-1.5 text-[11px] text-muted">
      <span>{left}</span>
      {children}
      <span className="text-right">{right}</span>
    </div>
  )
}

/** 2 thanh mô tả âm thanh: êm ↔ ồn, trầm ↔ giòn */
export function SoundBars({ loud, pitch, target }: Props) {
  return (
    <div className="my-1 flex flex-col gap-1">
      <Row left="Êm" right="Ồn">
        <ProgressBar value={loud} target={target?.[0]} />
      </Row>
      <Row left="Trầm" right="Giòn">
        <ProgressBar value={pitch} tone="pitch" target={target?.[1]} />
      </Row>
    </div>
  )
}
