import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 相対パスで出力し、独自ドメイン直下でもサブパス配信でも動くようにする
  base: './',
  plugins: [react()],
})
