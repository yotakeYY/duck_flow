import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
// DuckDB-Wasm 需要 SharedArrayBuffer，因此需要设置 COOP/COEP 响应头
// GitHub Pages 部署时通过 coi-serviceworker.js 绕过此限制
export default defineConfig({
  // 部署到 GitHub Pages 子目录时，需通过环境变量设置 base
  // 本地开发使用 '/'，GitHub Actions 会设置 VITE_BASE_URL=/<repo-name>/
  base: process.env.VITE_BASE_URL ?? '/',

  plugins: [
    vue(),
    {
      // 自定义插件：为本地开发服务器添加必要的安全响应头
      // 生产环境由 coi-serviceworker.js 处理
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
  build: {
    // 提高 chunk 大小警告阈值（DuckDB-Wasm 文件较大）
    chunkSizeWarningLimit: 1000,
  },
})
