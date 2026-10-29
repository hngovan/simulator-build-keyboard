// Sinh con trỏ pixel 8-bit (SVG 32 × 32, mỗi điểm ảnh 2px) → public/cursors/. Chạy: node scripts/gen-cursors.mjs
// # = viền tối, o = ruột trắng, . = trống. Điểm bấm (hotspot) khai báo ở src/index.css (--cursor-arrow / --cursor-hand)
import { writeFileSync } from 'node:fs'

const COLOR = { '#': '#141821', o: '#ffffff' }
const ARROW = [
  '#.........',
  '##........',
  '#o#.......',
  '#oo#......',
  '#ooo#.....',
  '#ooooo#...',
  '#oooooo#..',
  '#ooooooo#.',
  '#oooo#####',
  '#oo#oo#...',
  '#o#.#oo#..',
  '##..#oo#..',
  '#....#oo#.',
  '.....#oo#.',
  '......##..',
]
const HAND = [
  '....##.......',
  '...#oo#......',
  '...#oo#......',
  '...#oo#......',
  '...#oo###....',
  '...#oo#oo###.',
  '.###oo#oo#oo#',
  '#oo#ooooo#oo#',
  '#ooooooooooo#',
  '.#oooooooooo#',
  '.#ooooooooo#.',
  '..#oooooooo#.',
  '...#ooooooo#.',
  '...#########.',
]

const svg = (rows) => {
  let rects = ''
  rows.forEach((r, y) =>
    [...r].forEach((c, x) => {
      if (COLOR[c])
        rects += `<rect x="${x * 2}" y="${y * 2}" width="2" height="2" fill="${COLOR[c]}"/>`
    }),
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">${rects}</svg>\n`
}
writeFileSync('public/cursors/arrow.svg', svg(ARROW))
writeFileSync('public/cursors/hand.svg', svg(HAND))
console.log('public/cursors/arrow.svg, hand.svg')
