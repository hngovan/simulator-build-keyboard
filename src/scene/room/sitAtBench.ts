import { useGame } from '@/store'
import { benchPose } from '../common/benchPose'
import { fitAspect } from '../common/fitAspect'
import { useRoom } from './roomStore'

/** Đang đi lại: camera bay về góc nhìn mặc định bàn build rồi ngồi xuống làm (thoát chế độ đi lại) */
export function sitAtBench() {
  const s = useGame.getState()
  // Canvas phủ toàn màn hình nên tỉ lệ khung hình = cửa sổ
  const fit = fitAspect(window.innerWidth / window.innerHeight)
  useRoom.setState({
    hover: null,
    goal: null,
    fly: {
      pos: benchPose(s.ctx && s.build ? s.ctx.width : null, fit),
      look: [0, 0, 0],
      then: () => {
        useGame.setState({ walk: false })
        useGame.getState().resetCam()
      },
    },
  })
}
