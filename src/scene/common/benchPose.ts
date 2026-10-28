/**
 * Chỗ camera ở góc nhìn mặc định bàn build (nhìn về tâm bàn): theo bề rộng bàn phím đang build,
 * chưa có build (bàn trống) thì null; fit = hệ số lùi theo tỉ lệ khung hình (`fitAspect`)
 */
export const benchPose = (width: number | null, fit: number): [number, number, number] =>
  width === null
    ? [0, 19 * fit, 17 * fit]
    : [0, (width * 0.62 + 1.5) * fit, (width * 0.42 + 2.5) * fit]
