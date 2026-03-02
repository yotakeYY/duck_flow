<template>
  <!-- 数据预览面板：以表格形式展示选中节点的执行结果 -->
  <Transition name="panel-slide">
    <div v-if="isVisible" class="preview-panel">
      <!-- 面板头部 -->
      <div class="panel-header">
        <div class="panel-title">
          <span class="title-icon">📊</span>
          <span>数据预览</span>
          <span v-if="selectedNodeId" class="panel-node-id">— {{ selectedNodeId }}</span>
        </div>
        <div class="panel-meta">
          <span v-if="result" class="meta-rows">
            {{ result.rowCount.toLocaleString() }} 行 ×
            {{ result.columns.length }} 列
          </span>
          <span v-if="result" class="meta-time">
            {{ result.executionTime.toFixed(1) }}ms
          </span>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
      </div>

      <!-- 加载中状态 -->
      <div v-if="isExecuting" class="panel-loading">
        <div class="loading-spinner"></div>
        <span>正在执行查询...</span>
      </div>

      <!-- 错误显示 -->
      <div v-else-if="errorMessage" class="panel-error">
        <span class="error-icon">⚠</span>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- 数据表格 -->
      <div v-else-if="result && result.rows.length > 0" class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="col in result.columns" :key="col" class="th-cell">
                <div class="th-content">
                  <span class="col-name">{{ col }}</span>
                  <span class="col-icon">⇕</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIdx) in displayedRows"
              :key="rowIdx"
              class="table-row"
              :class="{ 'row-even': rowIdx % 2 === 0 }"
            >
              <td v-for="col in result.columns" :key="col" class="td-cell">
                <span :class="getCellClass(row[col])">{{ formatValue(row[col]) }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页 -->
        <div class="pagination">
          <button
            class="page-btn"
            :disabled="currentPage === 0"
            @click="currentPage--"
          >
            ←
          </button>
          <span class="page-info">
            第 {{ currentPage + 1 }} / {{ totalPages }} 页
            （共 {{ result.rowCount.toLocaleString() }} 行）
          </span>
          <button
            class="page-btn"
            :disabled="currentPage >= totalPages - 1"
            @click="currentPage++"
          >
            →
          </button>
        </div>
      </div>

      <!-- 空结果状态 -->
      <div v-else-if="result && result.rows.length === 0" class="panel-empty">
        <span>查询结果为空（0 行）</span>
      </div>

      <!-- 未执行状态 -->
      <div v-else class="panel-placeholder">
        <span class="placeholder-icon">🔍</span>
        <span>请选择节点并执行查询</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePipeline } from '@/composables/usePipeline'

interface Props {
  isVisible: boolean
}

defineProps<Props>()
defineEmits<{
  close: []
}>()

const { selectedNodeId, selectedNodeResult, executingNodes } = usePipeline()

const currentPage = ref(0)
const pageSize = 50

const result = selectedNodeResult
const isExecuting = computed(() =>
  selectedNodeId.value ? executingNodes.value.has(selectedNodeId.value) : false
)
const errorMessage = ref('')

// 当前页显示的行（分页）
const displayedRows = computed(() => {
  if (!result.value) return []
  const start = currentPage.value * pageSize
  return result.value.rows.slice(start, start + pageSize)
})

const totalPages = computed(() => {
  if (!result.value) return 1
  return Math.ceil(result.value.rowCount / pageSize)
})

/**
 * 将单元格值格式化为显示字符串
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

/**
 * 根据单元格值类型返回对应的样式类名
 */
function getCellClass(value: unknown): string {
  if (value === null || value === undefined) return 'cell-null'
  if (typeof value === 'number' || typeof value === 'bigint') return 'cell-number'
  if (typeof value === 'boolean') return 'cell-boolean'
  return 'cell-string'
}
</script>
