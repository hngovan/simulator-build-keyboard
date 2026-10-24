// Sinh tự động bởi scripts/alice-layout.mjs từ PCB KiCad của Blossom (doughnut923/Blossom, MIT) — không sửa tay.
// Toạ độ theo tâm khung PCB (u, z dương = phía trước); deg: góc xoay switch (dương = ngược kim đồng hồ nhìn từ trên)

export const ALICE_KEYS: {
  label: string
  w: number
  code: string | null
  /** hàng: 0 = hàng số … 4 = hàng space */
  row: number
  cx: number
  cz: number
  deg: number
}[] = [
  { label: '', w: 2.75, code: 'Space', row: 4, cx: -0.5322, cz: 2.0326, deg: 12 },
  { label: '1', w: 1, code: 'Digit1', row: 0, cx: -7.2489, cz: -2.8653, deg: 0 },
  { label: '3', w: 1, code: 'Digit3', row: 0, cx: -5.0794, cz: -2.8155, deg: -12 },
  { label: '4', w: 1, code: 'Digit4', row: 0, cx: -4.1013, cz: -2.6076, deg: -12 },
  { label: 'Enter', w: 2.25, code: 'Enter', row: 2, cx: 5.3999, cz: -0.8653, deg: 0 },
  { label: '', w: 2, code: 'Space', row: 4, cx: -4.1993, cz: 1.4609, deg: -12 },
  { label: 'Shift', w: 2.25, code: 'ShiftLeft', row: 3, cx: -8.8999, cz: 0.1347, deg: 0 },
  { label: 'Caps', w: 1.75, code: 'CapsLock', row: 2, cx: -8.6808, cz: -0.8653, deg: 0 },
  { label: 'Shift', w: 1.75, code: 'ShiftRight', row: 3, cx: 4.8999, cz: 0.1347, deg: 0 },
  { label: 'Tab', w: 1.5, code: 'Tab', row: 1, cx: -8.4674, cz: -1.8653, deg: 0 },
  { label: 'Ctrl', w: 1.5, code: 'ControlLeft', row: 4, cx: -8.8994, cz: 1.1347, deg: 0 },
  { label: 'Alt', w: 1.5, code: 'AltLeft', row: 4, cx: -5.6665, cz: 1.1491, deg: -12 },
  { label: 'Alt', w: 1.5, code: 'AltRight', row: 4, cx: 2.1577, cz: 1.4609, deg: 12 },
  { label: '\\', w: 1.5, code: 'Backslash', row: 1, cx: 5.9258, cz: -1.8653, deg: 0 },
  { label: 'Esc', w: 1, code: 'Escape', row: 0, cx: -8.2489, cz: -2.8653, deg: 0 },
  { label: 'Q', w: 1, code: 'KeyQ', row: 1, cx: -6.9675, cz: -1.8653, deg: 0 },
  { label: 'A', w: 1, code: 'KeyA', row: 2, cx: -6.9308, cz: -0.8653, deg: 0 },
  { label: 'Z', w: 1, code: 'KeyZ', row: 3, cx: -6.6499, cz: 0.1347, deg: 0 },
  { label: '2', w: 1, code: 'Digit2', row: 0, cx: -6.2489, cz: -2.9441, deg: 0 },
  { label: 'W', w: 1, code: 'KeyW', row: 1, cx: -5.7764, cz: -1.9413, deg: -12 },
  { label: 'S', w: 1, code: 'KeyS', row: 2, cx: -5.7398, cz: -0.9112, deg: -12 },
  { label: 'X', w: 1, code: 'KeyX', row: 3, cx: -5.4586, cz: 0.1709, deg: -12 },
  { label: 'E', w: 1, code: 'KeyE', row: 1, cx: -4.7983, cz: -1.7334, deg: -12 },
  { label: 'D', w: 1, code: 'KeyD', row: 2, cx: -4.7616, cz: -0.7033, deg: -12 },
  { label: 'C', w: 1, code: 'KeyC', row: 3, cx: -4.4805, cz: 0.3788, deg: -12 },
  { label: 'R', w: 1, code: 'KeyR', row: 1, cx: -3.8201, cz: -1.5255, deg: -12 },
  { label: 'F', w: 1, code: 'KeyF', row: 2, cx: -3.7835, cz: -0.4954, deg: -12 },
  { label: 'V', w: 1, code: 'KeyV', row: 3, cx: -3.5023, cz: 0.5867, deg: -12 },
  { label: '5', w: 1, code: 'Digit5', row: 0, cx: -3.1231, cz: -2.3997, deg: -12 },
  { label: 'T', w: 1, code: 'KeyT', row: 1, cx: -2.842, cz: -1.3176, deg: -12 },
  { label: 'G', w: 1, code: 'KeyG', row: 2, cx: -2.8053, cz: -0.2875, deg: -12 },
  { label: 'B', w: 1, code: 'KeyB', row: 3, cx: -2.5242, cz: 0.7946, deg: -12 },
  { label: 'Fn', w: 1, code: null, row: 4, cx: -2.243, cz: 1.8767, deg: -12 },
  { label: '6', w: 1, code: 'Digit6', row: 0, cx: -2.145, cz: -2.1918, deg: -12 },
  { label: 'Y', w: 1, code: 'KeyY', row: 1, cx: -1.1559, cz: -0.9018, deg: 12 },
  { label: 'H', w: 1, code: 'KeyH', row: 2, cx: -0.7035, cz: 0.0244, deg: 12 },
  { label: 'N', w: 1, code: 'KeyN', row: 3, cx: -0.2511, cz: 0.9505, deg: 12 },
  { label: '7', w: 1, code: 'Digit7', row: 0, cx: -0.8748, cz: -1.9839, deg: 12 },
  { label: 'U', w: 1, code: 'KeyU', row: 1, cx: -0.1778, cz: -1.1097, deg: 12 },
  { label: 'J', w: 1, code: 'KeyJ', row: 2, cx: 0.2746, cz: -0.1835, deg: 12 },
  { label: 'M', w: 1, code: 'KeyM', row: 3, cx: 0.7271, cz: 0.7426, deg: 12 },
  { label: '8', w: 1, code: 'Digit8', row: 0, cx: 0.1034, cz: -2.1918, deg: 12 },
  { label: 'I', w: 1, code: 'KeyI', row: 1, cx: 0.8003, cz: -1.3176, deg: 12 },
  { label: 'K', w: 1, code: 'KeyK', row: 2, cx: 1.2528, cz: -0.3915, deg: 12 },
  { label: ',', w: 1, code: 'Comma', row: 3, cx: 1.7052, cz: 0.5347, deg: 12 },
  { label: '9', w: 1, code: 'Digit9', row: 0, cx: 1.0815, cz: -2.3997, deg: 12 },
  { label: 'O', w: 1, code: 'KeyO', row: 1, cx: 1.7785, cz: -1.5255, deg: 12 },
  { label: 'L', w: 1, code: 'KeyL', row: 2, cx: 2.2309, cz: -0.5994, deg: 12 },
  { label: '.', w: 1, code: 'Period', row: 3, cx: 2.6834, cz: 0.3268, deg: 12 },
  { label: '0', w: 1, code: 'Digit0', row: 0, cx: 2.0597, cz: -2.6076, deg: 12 },
  { label: 'P', w: 1, code: 'KeyP', row: 1, cx: 2.7566, cz: -1.7334, deg: 12 },
  { label: ';', w: 1, code: 'Semicolon', row: 2, cx: 3.3999, cz: -0.8653, deg: 0 },
  { label: '/', w: 1, code: 'Slash', row: 3, cx: 3.8999, cz: 0.1347, deg: 0 },
  { label: '-', w: 1, code: 'Minus', row: 0, cx: 3.2068, cz: -2.9441, deg: 0 },
  { label: '[', w: 1, code: 'BracketLeft', row: 1, cx: 3.9254, cz: -1.8653, deg: 0 },
  { label: "'", w: 1, code: 'Quote', row: 2, cx: 4.3999, cz: -0.8653, deg: 0 },
  { label: '=', w: 1, code: 'Equal', row: 0, cx: 4.2068, cz: -2.8653, deg: 0 },
  { label: ']', w: 1, code: 'BracketRight', row: 1, cx: 4.9254, cz: -1.8653, deg: 0 },
  { label: '←', w: 1, code: 'ArrowLeft', row: 4, cx: 5.8999, cz: 1.3847, deg: 0 },
  { label: 'Bksp', w: 1, code: 'Backspace', row: 0, cx: 5.2068, cz: -2.8653, deg: 0 },
  { label: '↑', w: 1, code: 'ArrowUp', row: 3, cx: 6.8999, cz: 0.3847, deg: 0 },
  { label: '↓', w: 1, code: 'ArrowDown', row: 4, cx: 6.8999, cz: 1.3847, deg: 0 },
  { label: 'Del', w: 1, code: 'Delete', row: 0, cx: 6.2068, cz: -2.8653, deg: 0 },
  { label: 'Home', w: 1, code: 'Home', row: 0, cx: 7.4568, cz: -3.1153, deg: 0 },
  { label: 'PgUp', w: 1, code: 'PageUp', row: 1, cx: 7.6758, cz: -2.1153, deg: 0 },
  { label: 'PgDn', w: 1, code: 'PageDown', row: 2, cx: 7.8999, cz: -1.1153, deg: 0 },
  { label: '→', w: 1, code: 'ArrowRight', row: 4, cx: 7.8999, cz: 1.3847, deg: 0 },
]

/** Đường viền PCB (Edge.Cuts), [x, z] u theo tâm khung PCB */
export const ALICE_OUTLINE: [number, number][] = [
  [-0.647, 3.1153],
  [2.7902, 2.3847],
  [8.7949, 2.3847],
  [8.8999, -3.0103],
  [-8.7949, -3.1153],
  [-8.8999, 2.2797],
  [-4.8204, 2.3847],
  [-1.3835, 3.1153],
]
