<template>
  <!-- CSV 源节点：上传并将 CSV 文件注册到 DuckDB -->
  <div
    class="pipeline-node csv-node"
    :class="{ selected: selected, executing: data.isExecuting, error: data.hasError }"
    @click.stop="handleSelect"
  >
    <!-- 节点头部 -->
    <div class="node-header">
      <span class="node-icon">📁</span>
      <span class="node-title">CSV 源</span>
      <span v-if="data.isExecuting" class="node-spinner">⟳</span>
      <span v-if="data.hasError" class="node-error-icon">⚠</span>
    </div>

    <!-- 节点主体 -->
    <div class="node-body">
      <div v-if="data.params?.fileName" class="node-info">
        <div class="info-row">
          <span class="info-label">文件</span>
          <span class="info-value">{{ data.params.fileName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">行数</span>
          <span class="info-value">{{ data.params.rowCount?.toLocaleString() }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">列数</span>
          <span class="info-value">{{ data.params.columns?.length }}</span>
        </div>
      </div>

      <label v-else class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
        <input type="file" accept=".csv" hidden @change="handleFileChange" />
        <span class="upload-icon">⬆</span>
        <span class="upload-text">拖入 CSV 文件<br />或点击上传</span>
      </label>
    </div>

    <!-- 输出端口 -->
    <Handle type="source" :position="Position.Right" class="handle-right" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import Papa from 'papaparse'
import { useDuckDb } from '@/composables/useDuckDb'
import { usePipeline } from '@/composables/usePipeline'

interface Props {
  id: string
  data: {
    label: string
    tableName?: string
    params: {
      fileName?: string
      columns?: string[]
      rowCount?: number
    }
    isExecuting?: boolean
    hasError?: boolean
    errorMessage?: string
    rowCount?: number
  }
  selected?: boolean
}

const props = defineProps<Props>()
const { registerCsvAsTable } = useDuckDb()
const { updateNode, selectedNodeId } = usePipeline()

/**
 * 文件输入变更处理器
 */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) {
    processFile(input.files[0])
  }
}

/**
 * 拖放处理器
 */
function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0]
  if (file && file.name.endsWith('.csv')) {
    processFile(file)
  }
}

/**
 * 解析 CSV 文件并注册到 DuckDB
 */
async function processFile(file: File) {
  const tableName = file.name.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9_]/g, '_')

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (result) => {
      const csvString = Papa.unparse(result.data)
      await registerCsvAsTable(tableName, csvString)

      updateNode(props.id, {
        tableName,
        params: {
          fileName: file.name,
          columns: result.meta.fields ?? [],
          rowCount: result.data.length,
        },
      })

      // 自动选中该节点并执行
      selectedNodeId.value = props.id
    },
  })
}

/**
 * 选中当前节点
 */
function handleSelect() {
  selectedNodeId.value = props.id
}
</script>
