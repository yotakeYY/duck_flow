<template>
  <!-- 输出视图节点：可视化最终结果 -->
  <div
    class="pipeline-node output-node"
    :class="{ selected: selected, executing: data.isExecuting, error: data.hasError }"
    @click.stop="handleSelect"
  >
    <!-- 输入端口 -->
    <Handle type="target" :position="Position.Left" class="handle-left" />

    <!-- 节点头部 -->
    <div class="node-header">
      <span class="node-icon">📊</span>
      <span class="node-title">输出视图</span>
      <span v-if="data.isExecuting" class="node-spinner">⟳</span>
      <span v-if="data.hasError" class="node-error-icon">⚠</span>
    </div>

    <!-- 节点主体 -->
    <div class="node-body">
      <div class="output-stats">
        <div class="stat-item">
          <span class="stat-icon">📋</span>
          <span class="stat-label">结果</span>
        </div>
        <div v-if="data.rowCount !== undefined" class="stat-value">
          {{ data.rowCount?.toLocaleString() }} 行
        </div>
        <div v-else class="stat-empty">请先执行</div>
      </div>

      <button class="run-btn" @click.stop="runNode">
        ▶ 执行
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { usePipeline } from '@/composables/usePipeline'

interface Props {
  id: string
  data: {
    label: string
    params: Record<string, unknown>
    isExecuting?: boolean
    hasError?: boolean
    rowCount?: number
  }
  selected?: boolean
}

const props = defineProps<Props>()
const { executeNode, selectedNodeId } = usePipeline()

function handleSelect() {
  selectedNodeId.value = props.id
}

async function runNode() {
  selectedNodeId.value = props.id
  await executeNode(props.id)
}
</script>
