<template>
  <!-- SQL JOIN 节点：合并两张数据表 -->
  <div
    class="pipeline-node join-node"
    :class="{ selected: selected, executing: data.isExecuting, error: data.hasError }"
    @click.stop="handleSelect"
  >
    <!-- 左侧输入端口 -->
    <Handle id="left" type="target" :position="Position.Left" style="top: 35%" class="handle-left" />
    <!-- 右侧输入端口 -->
    <Handle id="right" type="target" :position="Position.Left" style="top: 65%" class="handle-left handle-right-input" />

    <!-- 节点头部 -->
    <div class="node-header">
      <span class="node-icon">🔗</span>
      <span class="node-title">SQL 连接</span>
      <span v-if="data.isExecuting" class="node-spinner">⟳</span>
      <span v-if="data.hasError" class="node-error-icon">⚠</span>
    </div>

    <!-- 节点主体 -->
    <div class="node-body">
      <div class="join-form">
        <select v-model="localParams.joinType" class="node-select" @change="updateJoin">
          <option>INNER</option>
          <option>LEFT</option>
          <option>RIGHT</option>
          <option>FULL OUTER</option>
        </select>
        <div class="join-cols">
          <input
            v-model="localParams.leftColumn"
            class="node-input"
            placeholder="左侧列名"
            @change="updateJoin"
          />
          <span class="join-eq">=</span>
          <input
            v-model="localParams.rightColumn"
            class="node-input"
            placeholder="右侧列名"
            @change="updateJoin"
          />
        </div>
      </div>
      <div v-if="data.rowCount !== undefined" class="row-count">
        {{ data.rowCount?.toLocaleString() }} 行
      </div>
    </div>

    <!-- 输出端口 -->
    <Handle type="source" :position="Position.Right" class="handle-right" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { usePipeline } from '@/composables/usePipeline'
import type { SqlJoinParams } from '@/types/pipeline'

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
const { updateNode, selectedNodeId } = usePipeline()

const localParams = ref<SqlJoinParams>({
  joinType: props.data.params?.joinType ?? 'INNER',
  leftColumn: props.data.params?.leftColumn ?? '',
  rightColumn: props.data.params?.rightColumn ?? '',
})

function updateJoin() {
  updateNode(props.id, { params: { ...localParams.value } })
  selectedNodeId.value = props.id
}

function handleSelect() {
  selectedNodeId.value = props.id
}
</script>
