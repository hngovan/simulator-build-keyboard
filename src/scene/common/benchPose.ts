/**
 * Chỗ camera ở góc nhìn mặc định bàn build (nhìn về tâm bàn): theo bề rộng bàn phím đang build,
 * chưa có build (bàn trống) thì null; fit = hệ số lùi theo tỉ lệ khung hình (`fitAspect`)
 */
export const benchPose = (width: number | null, fit: number): [number, number, number] =>
  width === null
    ? [0, 19 * fit, 17 * fit]
    : [0, (width * 0.62 + 1.5) * fit, (width * 0.42 + 2.5) * fit]

/**
 * Góc nhìn mặc định bàn build theo trạng thái: bước mở hộp / bàn có thùng (thùng cỡ thật cao gần 10u) thì lùi xa hơn.
 * Dùng chung cho ngồi xuống (`sitAtBench` bay tới) + `CameraRig` / `EmptyBench` (đặt lại) để không zoom vào rồi bật ra
 */
export const benchView = (
  v: { width: number | null; unbox?: boolean; box: boolean },
  fit: number,
): [number, number, number] =>
  v.width !== null && !v.unbox
    ? benchPose(v.width, fit)
    : benchPose(null, v.box || v.unbox ? fit * 1.5 : fit)
