import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#111827"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#22c55e" stroke-width="9"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" stroke-width="9"
    stroke-dasharray="238" stroke-dashoffset="80" stroke-linecap="round" transform="rotate(-90 50 50)"/>
</svg>`

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-512-maskable.png', size: 512 }
]

for (const { file, size } of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${file}`)
}

console.log('Icons generated in public/icons/')
