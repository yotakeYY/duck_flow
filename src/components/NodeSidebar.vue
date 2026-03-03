<template>
  <!-- 节点库侧边栏：通过拖拽将节点添加到画布 -->
  <aside class="node-sidebar">
    <!-- Logo + 帮助按钮 -->
    <div class="sidebar-logo">
      <span class="logo-icon">🦆</span>
      <span class="logo-text">DuckFlow</span>
      <!-- 使用说明按钮 -->
      <button
        class="help-btn"
        title="使用说明"
        @click="showHelp = true"
      >?</button>
    </div>

    <!-- 分割线 -->
    <div class="sidebar-divider"></div>

    <!-- 节点库 -->
    <div class="sidebar-section">
      <div class="section-label">节点库</div>

      <div
        v-for="item in nodeLibrary"
        :key="item.type"
        class="node-item"
        draggable="true"
        @dragstart="onDragStart($event, item.type)"
      >
        <span class="node-item-icon">{{ item.icon }}</span>
        <div class="node-item-info">
          <span class="node-item-title">{{ item.title }}</span>
          <span class="node-item-desc">{{ item.description }}</span>
        </div>
      </div>
    </div>

    <!-- 分割线 -->
    <div class="sidebar-divider"></div>

    <!-- DuckDB 状态 -->
    <div class="sidebar-section">
      <div class="section-label">引擎状态</div>
      <div class="db-status" :class="`status-${duckDbStatus}`">
        <span class="status-dot"></span>
        <span class="status-text">{{ statusLabels[duckDbStatus] }}</span>
      </div>
      <div v-if="registeredTables.size > 0" class="table-list">
        <div class="section-label" style="margin-top: 8px;">已注册的表</div>
        <div
          v-for="table in Array.from(registeredTables)"
          :key="table"
          class="table-item"
        >
          <span class="table-icon">🗄</span>
          <span class="table-name">{{ table }}</span>
        </div>
      </div>
    </div>

    <!-- 弹性间距 -->
    <div style="flex: 1"></div>

    <!-- 底部版本号 -->
    <div class="sidebar-footer">
      <span class="footer-version">v0.1.0</span>
    </div>
  </aside>

  <!-- 使用说明弹窗 -->
  <HelpModal v-model="showHelp" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDuckDb } from '@/composables/useDuckDb'
import type { NodeType } from '@/types/pipeline'
import HelpModal from '@/components/HelpModal.vue'

const { status: duckDbStatus, registeredTables } = useDuckDb()

// 使用说明弹窗显示状态
const showHelp = ref(false)

// 状态显示标签
const statusLabels: Record<string, string> = {
  idle: '未初始化',
  initializing: '初始化中...',
  ready: '就绪',
  error: '错误',
}

// 节点库定义（移除了输出视图节点，结果现在自动展示）
const nodeLibrary: Array<{
  type: NodeType
  icon: string
  title: string
  description: string
}> = [
  {
    type: 'csv_source',
    icon: '📁',
    title: 'CSV 源',
    description: '加载 CSV 文件',
  },
  {
    type: 'sql_filter',
    icon: '🔍',
    title: 'SQL 过滤',
    description: '使用 WHERE 子句过滤',
  },
  {
    type: 'sql_join',
    icon: '🔗',
    title: 'SQL 连接',
    description: '连接两张数据表',
  },
]

/**
 * 拖拽开始时将节点类型写入 DataTransfer
 */
function onDragStart(event: DragEvent, nodeType: NodeType) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow-node-type', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }
}
</script>
