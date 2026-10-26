/**
 * Hệ số lùi camera theo tỉ lệ khung hình: góc nhìn mặc định canh cho màn ngang (~16:10); màn dọc (điện thoại)
 * góc nhìn ngang hẹp hơn nhiều nên lùi xa thêm cho vừa bề rộng bàn phím
 */
export const fitAspect = (aspect: number) => Math.min(3.2, Math.max(1, 1.45 / aspect))
