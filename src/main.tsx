import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// dev: công cụ chụp sẵn ảnh sản phẩm Shopii cho script `bun run bake:thumbs`
if (import.meta.env.DEV) void import('./features/apps/shop/bakeThumbs')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
