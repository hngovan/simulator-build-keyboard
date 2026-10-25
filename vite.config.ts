import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// phiên bản game hiện ở màn hình đăng nhập
import { version } from './package.json'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: {
    alias: { '@': '/src' },
  },
  // server bảng xếp hạng (`bun run server`)
  server: { proxy: { '/api': 'http://localhost:8787' } },
})
