<template>
  <div class="app-container">
    <!-- 侧边栏：节点库 -->
    <NodeSidebar />

    <!-- 主画布区域 -->
    <div class="canvas-area">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="toolbar-btn" :disabled="isExecutingAny" @click="runAll">
            <span>▶</span> 全部执行
          </button>
          <button class="toolbar-btn toolbar-btn-secondary" @click="clearCanvas">
            <span>✕</span> 清空画布
          </button>
        </div>
        <div class="toolbar-right">
          <button
            class="toolbar-btn toolbar-btn-ghost"
            @click="previewVisible = !previewVisible"
          >
            <span>📊</span> 预览 {{ previewVisible ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <!-- Vue Flow 画布 -->
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        class="vue-flow-canvas"
        :node-types="nodeTypes"
        :default-edge-options="defaultEdgeOptions"
        :connection-line-style="connectionLineStyle"
        fit-view-on-init
        @drop="onDrop"
        @dragover="onDragOver"
        @node-click="onNodeClick"
        @connect="onConnect"
      >
        <!-- 背景网格 -->
        <Background :variant="BackgroundVariant.Dots" :gap="24" :size="1.5" :color="'#2a2d3e'" />

        <!-- 控制按钮 -->
        <Controls class="flow-controls" />

        <!-- 小地图 -->
        <MiniMap
          class="flow-minimap"
          :node-color="miniMapNodeColor"
          :mask-color="'rgba(15, 17, 30, 0.7)'"
        />
      </VueFlow>

      <!-- 空画布引导（无节点时显示） -->
      <Transition name="fade">
        <div v-if="nodes.length === 0" class="empty-canvas-guide">
          <div class="guide-content">
            <span class="guide-icon">🦆</span>
            <h2 class="guide-title">欢迎使用 DuckFlow</h2>
            <p class="guide-desc">
              从左侧面板拖入节点<br />
              开始构建您的 SQL 管道
            </p>
          </div>
        </div>
      </Transition>

      <!-- 数据预览面板 -->
      <PreviewPanel :is-visible="previewVisible" @close="previewVisible = false" />
    </div>

    <!-- DuckDB 初始化中遮罩层 -->
    <Transition name="fade">
      <div v-if="duckDbStatus === 'initializing'" class="init-overlay">
        <div class="init-card">
          <div class="init-spinner"></div>
          <span class="init-text">正在初始化 DuckDB-Wasm...</span>
          <span class="init-sub">正在准备浏览器内置 SQL 引擎</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, onMounted } from 'vue'
import {
  VueFlow,
  useVueFlow,
  type Connection,
  type NodeMouseEvent,
} from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { v4 as uuidv4 } from 'uuid'

import NodeSidebar from '@/components/NodeSidebar.vue'
import PreviewPanel from '@/components/PreviewPanel.vue'
import CsvSourceNode from '@/components/nodes/CsvSourceNode.vue'
import SqlFilterNode from '@/components/nodes/SqlFilterNode.vue'
import SqlJoinNode from '@/components/nodes/SqlJoinNode.vue'
import OutputViewNode from '@/components/nodes/OutputViewNode.vue'

import { useDuckDb } from '@/composables/useDuckDb'
import { usePipeline } from '@/composables/usePipeline'
import type { NodeType, PipelineNode } from '@/types/pipeline'

// ---- DuckDB 初始化 ----
const { status: duckDbStatus, initializeDuckDb } = useDuckDb()
const { nodes, edges, selectedNodeId, executingNodes, addNode, executeNode } = usePipeline()

// ---- 注册自定义节点类型（用 markRaw 阻止响应式转换）----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  csv_source: markRaw(CsvSourceNode),
  sql_filter: markRaw(SqlFilterNode),
  sql_join: markRaw(SqlJoinNode),
  output_view: markRaw(OutputViewNode),
}

// ---- 边的默认配置 ----
const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { stroke: '#6366f1', strokeWidth: 2 },
  animated: true,
}

const connectionLineStyle = { stroke: '#6366f1', strokeWidth: 2 }

const { addEdges, project } = useVueFlow()

const previewVisible = ref(false)
const isExecutingAny = computed(() => executingNodes.value.size > 0)

// ---- 各节点类型的默认数据 ----
function getDefaultNodeData(type: NodeType) {
  const defaults: Record<NodeType, Partial<PipelineNode['data']>> = {
    csv_source: { label: 'CSV 源', params: { fileName: '', columns: [], rowCount: 0 } },
    sql_filter: {
      label: '过滤',
      params: { column: '', operator: '=', value: '' },
    },
    sql_join: {
      label: '连接',
      params: { joinType: 'INNER', leftColumn: '', rightColumn: '' },
    },
    output_view: { label: '输出', params: {} },
  }
  return defaults[type]
}

/**
 * 拖放时生成节点并添加到画布
 */
function onDrop(event: DragEvent) {
  const nodeType = event.dataTransfer?.getData('application/vueflow-node-type') as NodeType
  if (!nodeType) return

  event.preventDefault()

  // 将拖放位置转换为流坐标
  const position = project({ x: event.clientX - 250, y: event.clientY - 40 })

  const newNode: PipelineNode = {
    id: uuidv4(),
    type: nodeType,
    position,
    data: getDefaultNodeData(nodeType) as PipelineNode['data'],
  }

  addNode(newNode)
}

/**
 * 拖拽经过时允许放置
 */
function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

/**
 * 点击节点时选中并显示预览
 */
function onNodeClick({ node }: NodeMouseEvent) {
  selectedNodeId.value = node.id
  previewVisible.value = true
  executeNode(node.id)
}

/**
 * 创建连接（边）
 */
function onConnect(params: Connection) {
  addEdges({
    ...params,
    id: uuidv4(),
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
  })
}

/**
 * 执行所有输出节点
 */
async function runAll() {
  const outputNodes = nodes.value.filter((n) => n.type === 'output_view')
  for (const node of outputNodes) {
    await executeNode(node.id)
  }
}

/**
 * 清空画布
 */
function clearCanvas() {
  nodes.value = []
  edges.value = []
  selectedNodeId.value = null
  previewVisible.value = false
}

/**
 * 返回小地图中节点的颜色
 */
function miniMapNodeColor(node: { type: string }): string {
  const colors: Record<string, string> = {
    csv_source: '#10b981',
    sql_filter: '#6366f1',
    sql_join: '#f59e0b',
    output_view: '#ec4899',
  }
  return colors[node.type] ?? '#64748b'
}

// ---- 应用启动时初始化 DuckDB ----
onMounted(async () => {
  await initializeDuckDb()
})
</script>
