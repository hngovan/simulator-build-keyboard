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
  { label: '', w: 2.75, code: 'Space', row: 4, cx: 0.9167, cz: 2.2358, deg: 12 },
  { label: '1', w: 1, code: 'Digit1', row: 0, cx: -6.7489, cz: -2.3653, deg: 0 },
  { label: '3', w: 1, code: 'Digit3', row: 0, cx: -4.6943, cz: -2.2225, deg: -12 },
  { label: '4', w: 1, code: 'Digit4', row: 0, cx: -3.7161, cz: -2.0146, deg: -12 },
  { label: 'Enter', w: 2.25, code: 'Enter', row: 2, cx: 6.5249, cz: -0.3653, deg: 0 },
  { label: '', w: 2, code: 'Space', row: 4, cx: -3.3251, cz: 2.1579, deg: -12 },
  { label: 'Shift', w: 2.25, code: 'ShiftLeft', row: 3, cx: -7.7749, cz: 0.6347, deg: 0 },
  { label: 'Caps', w: 1.75, code: 'CapsLock', row: 2, cx: -7.8058, cz: -0.3653, deg: 0 },
  { label: 'Shift', w: 1.75, code: 'ShiftRight', row: 3, cx: 5.7749, cz: 0.6347, deg: 0 },
  { label: 'Tab', w: 1.5, code: 'Tab', row: 1, cx: -7.7174, cz: -1.3653, deg: 0 },
  { label: 'Ctrl', w: 1.5, code: 'ControlLeft', row: 4, cx: -8.1494, cz: 1.6347, deg: 0 },
  { label: 'Alt', w: 1.5, code: 'AltLeft', row: 4, cx: -5.0369, cz: 1.7941, deg: -12 },
  { label: 'Alt', w: 1.5, code: 'AltRight', row: 4, cx: 2.9953, cz: 1.794, deg: 12 },
  { label: '\\', w: 1.5, code: 'Backslash', row: 1, cx: 6.6758, cz: -1.3653, deg: 0 },
  { label: 'Esc', w: 1, code: 'Escape', row: 0, cx: -7.7489, cz: -2.3653, deg: 0 },
  { label: 'Q', w: 1, code: 'KeyQ', row: 1, cx: -6.4675, cz: -1.3653, deg: 0 },
  { label: 'A', w: 1, code: 'KeyA', row: 2, cx: -6.4308, cz: -0.3653, deg: 0 },
  { label: 'Z', w: 1, code: 'KeyZ', row: 3, cx: -6.1499, cz: 0.6347, deg: 0 },
  { label: '2', w: 1, code: 'Digit2', row: 0, cx: -5.7489, cz: -2.4441, deg: 0 },
  { label: 'W', w: 1, code: 'KeyW', row: 1, cx: -5.3913, cz: -1.3483, deg: -12 },
  { label: 'S', w: 1, code: 'KeyS', row: 2, cx: -5.3547, cz: -0.3182, deg: -12 },
  { label: 'X', w: 1, code: 'KeyX', row: 3, cx: -5.0735, cz: 0.7639, deg: -12 },
  { label: 'E', w: 1, code: 'KeyE', row: 1, cx: -4.4131, cz: -1.1404, deg: -12 },
  { label: 'D', w: 1, code: 'KeyD', row: 2, cx: -4.3765, cz: -0.1103, deg: -12 },
  { label: 'C', w: 1, code: 'KeyC', row: 3, cx: -4.0953, cz: 0.9718, deg: -12 },
  { label: 'R', w: 1, code: 'KeyR', row: 1, cx: -3.435, cz: -0.9325, deg: -12 },
  { label: 'F', w: 1, code: 'KeyF', row: 2, cx: -3.3984, cz: 0.0977, deg: -12 },
  { label: 'V', w: 1, code: 'KeyV', row: 3, cx: -3.1172, cz: 1.1798, deg: -12 },
  { label: '5', w: 1, code: 'Digit5', row: 0, cx: -2.738, cz: -1.8067, deg: -12 },
  { label: 'T', w: 1, code: 'KeyT', row: 1, cx: -2.4568, cz: -0.7246, deg: -12 },
  { label: 'G', w: 1, code: 'KeyG', row: 2, cx: -2.4202, cz: 0.3056, deg: -12 },
  { label: 'B', w: 1, code: 'KeyB', row: 3, cx: -2.1391, cz: 1.3877, deg: -12 },
  { label: 'Fn', w: 1, code: null, row: 4, cx: -1.8579, cz: 2.4698, deg: -12 },
  { label: '6', w: 1, code: 'Digit6', row: 0, cx: -1.7598, cz: -1.5988, deg: -12 },
  { label: 'Y', w: 1, code: 'KeyY', row: 1, cx: -0.5629, cz: -0.5167, deg: 12 },
  { label: 'H', w: 1, code: 'KeyH', row: 2, cx: -0.1105, cz: 0.4095, deg: 12 },
  { label: 'N', w: 1, code: 'KeyN', row: 3, cx: 0.342, cz: 1.3357, deg: 12 },
  { label: '7', w: 1, code: 'Digit7', row: 0, cx: -0.2818, cz: -1.5988, deg: 12 },
  { label: 'U', w: 1, code: 'KeyU', row: 1, cx: 0.4152, cz: -0.7246, deg: 12 },
  { label: 'J', w: 1, code: 'KeyJ', row: 2, cx: 0.8677, cz: 0.2016, deg: 12 },
  { label: 'M', w: 1, code: 'KeyM', row: 3, cx: 1.3201, cz: 1.1277, deg: 12 },
  { label: '8', w: 1, code: 'Digit8', row: 0, cx: 0.6964, cz: -1.8067, deg: 12 },
  { label: 'I', w: 1, code: 'KeyI', row: 1, cx: 1.3934, cz: -0.9325, deg: 12 },
  { label: 'K', w: 1, code: 'KeyK', row: 2, cx: 1.8458, cz: -0.0063, deg: 12 },
  { label: ',', w: 1, code: 'Comma', row: 3, cx: 2.2983, cz: 0.9198, deg: 12 },
  { label: '9', w: 1, code: 'Digit9', row: 0, cx: 1.6745, cz: -2.0146, deg: 12 },
  { label: 'O', w: 1, code: 'KeyO', row: 1, cx: 2.3715, cz: -1.1404, deg: 12 },
  { label: 'L', w: 1, code: 'KeyL', row: 2, cx: 2.824, cz: -0.2142, deg: 12 },
  { label: '.', w: 1, code: 'Period', row: 3, cx: 3.2764, cz: 0.7119, deg: 12 },
  { label: '0', w: 1, code: 'Digit0', row: 0, cx: 2.6527, cz: -2.2225, deg: 12 },
  { label: 'P', w: 1, code: 'KeyP', row: 1, cx: 3.3497, cz: -1.3483, deg: 12 },
  { label: ';', w: 1, code: 'Semicolon', row: 2, cx: 3.8999, cz: -0.3653, deg: 0 },
  { label: '/', w: 1, code: 'Slash', row: 3, cx: 4.3999, cz: 0.6347, deg: 0 },
  { label: '-', w: 1, code: 'Minus', row: 0, cx: 3.7068, cz: -2.4441, deg: 0 },
  { label: '[', w: 1, code: 'BracketLeft', row: 1, cx: 4.4254, cz: -1.3653, deg: 0 },
  { label: "'", w: 1, code: 'Quote', row: 2, cx: 4.8999, cz: -0.3653, deg: 0 },
  { label: '=', w: 1, code: 'Equal', row: 0, cx: 4.7068, cz: -2.3653, deg: 0 },
  { label: ']', w: 1, code: 'BracketRight', row: 1, cx: 5.4254, cz: -1.3653, deg: 0 },
  { label: '←', w: 1, code: 'ArrowLeft', row: 4, cx: 6.3999, cz: 1.8847, deg: 0 },
  { label: 'Bksp', w: 1, code: 'Backspace', row: 0, cx: 5.7068, cz: -2.3653, deg: 0 },
  { label: '↑', w: 1, code: 'ArrowUp', row: 3, cx: 7.3999, cz: 0.8847, deg: 0 },
  { label: '↓', w: 1, code: 'ArrowDown', row: 4, cx: 7.3999, cz: 1.8847, deg: 0 },
  { label: 'Del', w: 1, code: 'Delete', row: 0, cx: 6.7068, cz: -2.3653, deg: 0 },
  { label: 'Home', w: 1, code: 'Home', row: 0, cx: 7.9568, cz: -2.6153, deg: 0 },
  { label: 'PgUp', w: 1, code: 'PageUp', row: 1, cx: 8.1758, cz: -1.6153, deg: 0 },
  { label: 'PgDn', w: 1, code: 'PageDown', row: 2, cx: 8.3999, cz: -0.6153, deg: 0 },
  { label: '→', w: 1, code: 'ArrowRight', row: 4, cx: 8.3999, cz: 1.8847, deg: 0 },
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
