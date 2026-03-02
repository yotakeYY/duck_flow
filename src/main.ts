/**
 * 应用程序入口文件
 * 初始化 Vue 实例和 Pinia 状态管理
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Vue Flow 样式（必须引入）
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

// 应用程序全局样式
import './style.css'

import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
