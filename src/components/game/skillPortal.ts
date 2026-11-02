/**
 * Gắn `<Html portal={SKILL_PORTAL}>` cho thanh lực trong cảnh 3D: Html mặc định nằm trong khung Canvas (`fixed` = lớp riêng,
 * zIndex bên trong không vượt được HUD) nên bị bảng chọn đầu vít che; đưa ra body thì zIndexRange so thẳng với HUD
 */
export const SKILL_PORTAL = { current: document.body }
