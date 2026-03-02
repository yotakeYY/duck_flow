import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
// DuckDB-Wasm 需要 SharedArrayBuffer，因此需要设置 COOP/COEP 响应头
export default defineConfig({
  plugins: [
    vue(),
    {
      // 自定义插件：为开发服务器添加必要的安全响应头
      name: 'configure-response-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    // 将 DuckDB-Wasm 依赖排除在预打包之外
    exclude: ['@duckdb/duckdb-wasm'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
