<template>
  <!-- SQL 过滤节点：生成 WHERE 子句 -->
  <div
    class="pipeline-node filter-node"
    :class="{ selected: selected, executing: data.isExecuting, error: data.hasError }"
    @click.stop="handleSelect"
  >
    <!-- 输入端口 -->
    <Handle type="target" :position="Position.Left" class="handle-left" />

    <!-- 节点头部 -->
    <div class="node-header">
      <span class="node-icon">🔍</span>
      <span class="node-title">SQL 过滤</span>
      <span v-if="data.isExecuting" class="node-spinner">⟳</span>
      <span v-if="data.hasError" class="node-error-icon">⚠</span>
    </div>

    <!-- 节点主体 -->
    <div class="node-body">
      <div class="filter-form">

        <!-- 列名选择：当上游列名可用时显示下拉框，否则显示文本输入 -->
        <div class="column-selector">
          <select
            v-if="upstreamColumns.length > 0"
            v-model="localParams.column"
            class="node-select column-select"
            :class="{ 'placeholder-shown': !localParams.column }"
            @change="updateFilter"
          >
            <option value="" disabled>选择列名...</option>
            <option
              v-for="col in upstreamColumns"
              :key="col"
              :value="col"
            >
              {{ col }}
            </option>
          </select>
          <input
            v-else
            v-model="localParams.column"
            class="node-input"
            placeholder="列名（先连接 CSV 源）"
            @change="updateFilter"
          />
          <!-- 上游连接提示标签 -->
          <span v-if="upstreamColumns.length > 0" class="col-badge">
            {{ upstreamColumns.length }} 列
          </span>
        </div>

        <!-- 运算符选择 -->
        <select v-model="localParams.operator" class="node-select" @change="updateFilter">
          <option>=</option>
          <option>&gt;</option>
          <option>&lt;</option>
          <option>&gt;=</option>
          <option>&lt;=</option>
          <option>!=</option>
          <option>LIKE</option>
        </select>

        <!-- 过滤值输入 -->
        <input
          v-model="localParams.value"
          class="node-input"
          placeholder="值（如：25）"
          @input="updateFilter"
        />
      </div>

      <!-- 生成的 SQL 预览 -->
      <div v-if="sqlPreview" class="sql-preview">
        <code>{{ sqlPreview }}</code>
      </div>

      <!-- 行数显示 -->
      <div v-if="data.rowCount !== undefined" class="row-count">
        {{ data.rowCount?.toLocaleString() }} 行
      </div>
    </div>

    <!-- 输出端口 -->
    <Handle type="source" :position="Position.Right" class="handle-right" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { usePipeline } from '@/composables/usePipeline'
import type { SqlFilterParams } from '@/types/pipeline'

interface Props {
  id: string
  data: {
    label: string
    tableName?: string
    params: SqlFilterParams
    isExecuting?: boolean
    hasError?: boolean
    errorMessage?: string
    rowCount?: number
  }
  selected?: boolean
}

const props = defineProps<Props>()
const { updateNode, selectedNodeId, edges, getUpstreamColumns } = usePipeline()

// 本地参数状态（输入框绑定）
const localParams = ref<SqlFilterParams>({
  column: props.data.params?.column ?? '',
  operator: props.data.params?.operator ?? '=',
  value: props.data.params?.value ?? '',
})

/**
 * 上游列名列表（响应式）
 * 当边连接/断开时自动重新计算
 * edges 是响应式的，computed 会在边变更时自动触发
 */
const upstreamColumns = computed<string[]>(() => {
  // 依赖 edges 使得当连接改变时自动刷新
  void edges.value
  return getUpstreamColumns(props.id)
})

// 当上游列名更新后，如果之前选中的列名不在列表中，则重置列名选择
watch(upstreamColumns, (newCols) => {
  if (newCols.length > 0 && localParams.value.column && !newCols.includes(localParams.value.column)) {
    localParams.value.column = ''
    updateFilter()
  }
})

// SQL 预览文本
const sqlPreview = computed(() => {
  const { column, operator, value } = localParams.value
  if (!column || !value) return ''
  return `WHERE "${column}" ${operator} '${value}'`
})

/**
 * 更新过滤条件并同步到管道
 */
function updateFilter() {
  updateNode(props.id, {
    params: { ...localParams.value },
    sqlSnippet: sqlPreview.value,
  })
}

/**
 * 选中当前节点
 */
function handleSelect() {
  selectedNodeId.value = props.id
}
</script>
