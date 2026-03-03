<template>
  <!-- SQL JOIN 节点：合并两张数据表 -->
  <div
    class="pipeline-node join-node"
    :class="{ selected: selected, executing: data.isExecuting, error: data.hasError }"
    @click.stop="handleSelect"
  >
    <!-- 左侧上输入端口（Left 表） -->
    <Handle id="left" type="target" :position="Position.Left" style="top: 38%" class="handle-left" />
    <!-- 左侧下输入端口（Right 表） -->
    <Handle id="right" type="target" :position="Position.Left" style="top: 68%" class="handle-left handle-right-input" />

    <!-- 节点头部 -->
    <div class="node-header">
      <span class="node-icon">🔗</span>
      <span class="node-title">SQL 连接</span>
      <span v-if="data.isExecuting" class="node-spinner">⟳</span>
      <span v-if="data.hasError" class="node-error-icon">⚠</span>
    </div>

    <!-- 节点主体 -->
    <div class="node-body">

      <!-- JOIN 类型选择 -->
      <select v-model="localParams.joinType" class="node-select" @change="updateJoin">
        <option>INNER</option>
        <option>LEFT</option>
        <option>RIGHT</option>
        <option>FULL OUTER</option>
      </select>

      <!-- 左表列名区域 -->
      <div class="join-side">
        <!-- 左表表名标签 -->
        <div class="join-table-label left-label">
          <span class="join-handle-dot left-dot"></span>
          <span class="join-table-name">
            {{ leftTableName || '左表（未连接）' }}
          </span>
        </div>
        <!-- 左列选择 -->
        <select
          v-if="leftColumns.length > 0"
          v-model="localParams.leftColumn"
          class="node-select column-select"
          :class="{ 'placeholder-shown': !localParams.leftColumn }"
          @change="updateJoin"
        >
          <option value="" disabled>选择列名...</option>
          <option v-for="col in leftColumns" :key="col" :value="col">{{ col }}</option>
        </select>
        <input
          v-else
          v-model="localParams.leftColumn"
          class="node-input"
          placeholder="左侧列名"
          @change="updateJoin"
        />
      </div>

      <!-- 连接符号 -->
      <div class="join-eq-row">
        <span class="join-type-badge">{{ localParams.joinType }}</span>
        <span class="join-eq-symbol">=</span>
      </div>

      <!-- 右表列名区域 -->
      <div class="join-side">
        <!-- 右表表名标签 -->
        <div class="join-table-label right-label">
          <span class="join-handle-dot right-dot"></span>
          <span class="join-table-name">
            {{ rightTableName || '右表（未连接）' }}
          </span>
        </div>
        <!-- 右列选择 -->
        <select
          v-if="rightColumns.length > 0"
          v-model="localParams.rightColumn"
          class="node-select column-select"
          :class="{ 'placeholder-shown': !localParams.rightColumn }"
          @change="updateJoin"
        >
          <option value="" disabled>选择列名...</option>
          <option v-for="col in rightColumns" :key="col" :value="col">{{ col }}</option>
        </select>
        <input
          v-else
          v-model="localParams.rightColumn"
          class="node-input"
          placeholder="右侧列名"
          @change="updateJoin"
        />
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
import { Handle, Position } from '@vue-flow/core'
import { usePipeline } from '@/composables/usePipeline'
import type { SqlJoinParams, CsvSourceParams } from '@/types/pipeline'

interface Props {
  id: string
  data: {
    label: string
    params: SqlJoinParams
    isExecuting?: boolean
    hasError?: boolean
    rowCount?: number
  }
  selected?: boolean
}

const props = defineProps<Props>()
const { edges, updateNode, selectedNodeId, getInputNodeByHandle } = usePipeline()

const localParams = ref<SqlJoinParams>({
  joinType: props.data.params?.joinType ?? 'INNER',
  leftColumn: props.data.params?.leftColumn ?? '',
  rightColumn: props.data.params?.rightColumn ?? '',
})

/**
 * 左侧输入端口（handle id="left"）连接的节点
 * 依赖 edges 使得连接变更时自动刷新
 */
const leftInputNode = computed(() => {
  void edges.value   // 触发响应式依赖
  return getInputNodeByHandle(props.id, 'left')
})

/**
 * 右侧输入端口（handle id="right"）连接的节点
 */
const rightInputNode = computed(() => {
  void edges.value
  return getInputNodeByHandle(props.id, 'right')
})

/**
 * 左表表名：从连接的 CSV 源节点读取
 */
const leftTableName = computed(() => leftInputNode.value?.data.tableName ?? '')
const rightTableName = computed(() => rightInputNode.value?.data.tableName ?? '')

/**
 * 左表可用列名（来自 CSV 源节点）
 */
const leftColumns = computed<string[]>(() => {
  const node = leftInputNode.value
  if (node?.type === 'csv_source') {
    return (node.data.params as CsvSourceParams).columns ?? []
  }
  return []
})

/**
 * 右表可用列名（来自 CSV 源节点）
 */
const rightColumns = computed<string[]>(() => {
  const node = rightInputNode.value
  if (node?.type === 'csv_source') {
    return (node.data.params as CsvSourceParams).columns ?? []
  }
  return []
})

// 当左表列名列表更新后，若当前选择已不在列表中则重置
watch(leftColumns, (cols) => {
  if (cols.length > 0 && localParams.value.leftColumn && !cols.includes(localParams.value.leftColumn)) {
    localParams.value.leftColumn = ''
    updateJoin()
  }
})

// 同上，右表
watch(rightColumns, (cols) => {
  if (cols.length > 0 && localParams.value.rightColumn && !cols.includes(localParams.value.rightColumn)) {
    localParams.value.rightColumn = ''
    updateJoin()
  }
})

function updateJoin() {
  updateNode(props.id, { params: { ...localParams.value } })
}

function handleSelect() {
  selectedNodeId.value = props.id
}
</script>
