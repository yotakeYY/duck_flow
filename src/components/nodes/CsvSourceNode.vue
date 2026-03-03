<template>
  <!-- CSV 源节点：上传并将 CSV 文件注册到 DuckDB，上传完成后自动执行 -->
  <div
    class="pipeline-node csv-node"
    :class="{ selected: selected, executing: isLoading || data.isExecuting, error: data.hasError }"
    @click.stop="handleSelect"
  >
    <!-- 节点头部 -->
    <div class="node-header">
      <span class="node-icon">📁</span>
      <span class="node-title">CSV 源</span>
      <!-- 加载中：文件上传阶段 或 DuckDB 查询阶段 -->
      <span v-if="isLoading || data.isExecuting" class="node-spinner">⟳</span>
      <span v-else-if="data.hasError" class="node-error-icon">⚠</span>
      <!-- 上传成功后显示勾号 -->
      <span v-else-if="data.params?.fileName" class="node-ok-icon">✓</span>
    </div>

    <!-- 节点主体 -->
    <div class="node-body">
      <!-- 上传阶段提示 -->
      <div v-if="isLoading" class="node-loading-info">
        <span class="loading-dot-row">
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
        </span>
        <span class="loading-label">{{ loadingStage }}</span>
      </div>

      <!-- 已上传：显示文件信息 -->
      <div v-else-if="data.params?.fileName" class="node-info">
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
        <!-- 重新上传按钮 -->
        <label class="reupload-btn" title="点击重新上传文件">
          <input type="file" accept=".csv" hidden @change="handleFileChange" />
          ↻ 重新上传
        </label>
      </div>

      <!-- 未上传：拖放区域 -->
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
import { ref } from 'vue'
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
const { updateNode, selectedNodeId, executeForward } = usePipeline()

// 本地加载状态（文件上传 + DuckDB 注册阶段）
const isLoading = ref(false)
// 加载阶段说明文字
const loadingStage = ref('正在解析文件...')

/**
 * 文件输入变更处理器
 */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) {
    processFile(input.files[0])
    // 重置 input 以允许重复选择同一文件
    input.value = ''
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
 * 解析 CSV 文件 → 注册到 DuckDB → 级联执行下游节点
 * 全程显示加载动画，完成后自动展示结果
 */
async function processFile(file: File) {
  isLoading.value = true
  loadingStage.value = '正在解析文件...'

  const tableName = file.name
    .replace(/\.csv$/i, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (result) => {
      try {
        loadingStage.value = '正在注册数据表...'
        const csvString = Papa.unparse(result.data)
        await registerCsvAsTable(tableName, csvString)

        // 更新节点数据
        updateNode(props.id, {
          tableName,
          params: {
            fileName: file.name,
            columns: result.meta.fields ?? [],
            rowCount: result.data.length,
          },
        })

        // 选中该节点（触发预览面板自动打开）
        selectedNodeId.value = props.id

        loadingStage.value = '正在执行查询...'
        // 级联执行：当前节点 → 所有下游节点（自动更新预览）
        await executeForward(props.id)
      } finally {
        // 无论成功或失败，结束加载状态
        isLoading.value = false
        loadingStage.value = ''
      }
    },
    error: () => {
      isLoading.value = false
      loadingStage.value = ''
    },
  })
}

/**
 * 选中当前节点（显示预览）
 */
function handleSelect() {
  selectedNodeId.value = props.id
}
</script>
