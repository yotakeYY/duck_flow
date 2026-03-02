/**
 * usePipeline.ts
 * 管道状态管理与 SQL 生成、执行逻辑
 * 遍历节点图，动态生成基于 CTE 的 SQL 查询
 */

import { ref, type Ref, computed, watch } from 'vue'
import type { Edge } from '@vue-flow/core'
import type {
    PipelineNode,
    QueryResult,
    SqlFilterParams,
    SqlJoinParams,
    CsvSourceParams,
} from '@/types/pipeline'
import { useDuckDb } from './useDuckDb'

const { executeQuery } = useDuckDb()

// 管道状态（显式声明类型以避免循环类型推断）
const nodes: Ref<PipelineNode[]> = ref([])
const edges: Ref<Edge[]> = ref([])
const selectedNodeId: Ref<string | null> = ref(null)
const queryResults: Ref<Map<string, QueryResult>> = ref(new Map())
const executingNodes: Ref<Set<string>> = ref(new Set())

/**
 * 获取指定节点的输入节点列表
 */
function getInputNodes(nodeId: string): PipelineNode[] {
    const inputEdges = edges.value.filter((e: Edge) => e.target === nodeId)
    return inputEdges
        .map((e: Edge) => nodes.value.find((n: PipelineNode) => n.id === e.source))
        .filter((n: PipelineNode | undefined): n is PipelineNode => n !== undefined)
}

/**
 * 向上游递归追溯，收集所有可用的列名
 * 优先从直接上游的 CSV 源节点读取，若上游是其他节点则继续向上追溯
 * @param nodeId - 起始节点 ID
 * @returns 列名字符串数组
 */
function getUpstreamColumns(nodeId: string): string[] {
    const inputs = getInputNodes(nodeId)
    for (const input of inputs) {
        if (input.type === 'csv_source') {
            // 直接连接的 CSV 源节点，返回其列名
            const params = input.data.params as CsvSourceParams
            return params.columns ?? []
        }
        // 非 CSV 源节点则继续向上游追溯
        const cols = getUpstreamColumns(input.id)
        if (cols.length > 0) return cols
    }
    return []
}

/**
 * 对节点图进行拓扑排序遍历
 * 用于按依赖顺序执行节点
 */
function topologicalSort(startNodeId: string): PipelineNode[] {
    const visited = new Set<string>()
    const result: PipelineNode[] = []

    function visit(nodeId: string) {
        if (visited.has(nodeId)) return
        visited.add(nodeId)

        // 先处理输入节点
        const inputs = getInputNodes(nodeId)
        for (const input of inputs) {
            visit(input.id)
        }

        const node = nodes.value.find((n: PipelineNode) => n.id === nodeId)
        if (node) result.push(node)
    }

    visit(startNodeId)
    return result
}

/**
 * 生成节点的 SQL 片段
 * 根据不同节点类型输出对应 SQL
 */
function generateNodeSql(node: PipelineNode, inputTableName: string | null): string {
    switch (node.type) {
        case 'csv_source': {
            // CSV 源节点直接引用表名
            return `SELECT * FROM "${node.data.tableName}"`
        }

        case 'sql_filter': {
            const params = node.data.params as SqlFilterParams
            if (!inputTableName) return 'SELECT 1'
            const value =
                params.operator === 'LIKE' || isNaN(Number(params.value))
                    ? `'${params.value}'`
                    : params.value
            return `SELECT * FROM "${inputTableName}" WHERE "${params.column}" ${params.operator} ${value}`
        }

        case 'sql_join': {
            const params = node.data.params as SqlJoinParams
            const inputs = getInputNodes(node.id)
            if (inputs.length < 2) return 'SELECT 1'
            const leftNode = inputs[0]
            const rightNode = inputs[1]
            if (!leftNode || !rightNode) return 'SELECT 1'
            const leftTable = leftNode.data.tableName ?? leftNode.id
            const rightTable = rightNode.data.tableName ?? rightNode.id
            return `
        SELECT l.*, r.*
        FROM "${leftTable}" l
        ${params.joinType} JOIN "${rightTable}" r
        ON l."${params.leftColumn}" = r."${params.rightColumn}"
      `
        }

        case 'output_view': {
            if (!inputTableName) return 'SELECT 1'
            return `SELECT * FROM "${inputTableName}"`
        }

        default:
            return 'SELECT 1'
    }
}

/**
 * 生成目标节点的 CTE 链式 SQL 字符串
 */
function buildCteSql(targetNode: PipelineNode): string {
    const chain = topologicalSort(targetNode.id)
    const ctes: string[] = []

    // 构建各节点的 CTE 名称映射
    const nodeTableMap = new Map<string, string>()

    for (const node of chain) {
        const cteName = `cte_${node.id.replace(/-/g, '_')}`
        const inputs = getInputNodes(node.id)
        const firstInput = inputs[0]
        const inputTableName = inputs.length > 0 && firstInput
            ? nodeTableMap.get(firstInput.id) ?? null
            : null

        const sql = generateNodeSql(node, inputTableName)
        nodeTableMap.set(node.id, cteName)

        // CSV 源节点直接引用表，无需 CTE
        if (node.type !== 'csv_source') {
            ctes.push(`"${cteName}" AS (\n  ${sql}\n)`)
        } else {
            // CSV 节点直接使用表名
            nodeTableMap.set(node.id, node.data.tableName ?? node.id)
        }
    }

    if (ctes.length === 0) {
        // 无 CTE（仅 CSV 源节点）
        const lastNode = chain[chain.length - 1]
        if (!lastNode) return 'SELECT 1'
        return generateNodeSql(lastNode, null)
    }

    const lastCteName = nodeTableMap.get(targetNode.id) ?? ''
    return `WITH ${ctes.join(',\n')} SELECT * FROM "${lastCteName}"`
}

/**
 * 执行指定节点并缓存查询结果
 */
async function executeNode(nodeId: string): Promise<QueryResult | null> {
    const node = nodes.value.find((n: PipelineNode) => n.id === nodeId)
    if (!node) return null

    executingNodes.value.add(nodeId)
    node.data.isExecuting = true
    node.data.hasError = false

    try {
        const sql = buildCteSql(node)
        console.log(`[Pipeline] 正在执行节点 "${nodeId}":\n${sql}`)

        const result = await executeQuery(sql)
        queryResults.value.set(nodeId, result)
        node.data.rowCount = result.rowCount
        node.data.isExecuting = false
        return result
    } catch (err) {
        node.data.hasError = true
        node.data.errorMessage = err instanceof Error ? err.message : '执行错误'
        node.data.isExecuting = false
        console.error(`[Pipeline] 节点 "${nodeId}" 执行错误:`, err)
        return null
    } finally {
        executingNodes.value.delete(nodeId)
    }
}

// 选中节点变更时自动执行
watch(selectedNodeId, async (newId) => {
    if (newId) {
        await executeNode(newId)
    }
})

/**
 * 添加节点
 */
function addNode(node: PipelineNode) {
    nodes.value.push(node)
}

/**
 * 更新节点数据
 */
function updateNode(nodeId: string, updates: Partial<PipelineNode['data']>) {
    const node = nodes.value.find((n: PipelineNode) => n.id === nodeId)
    if (node) {
        node.data = { ...node.data, ...updates }
    }
}

/**
 * 删除节点
 */
function removeNode(nodeId: string) {
    nodes.value = nodes.value.filter((n: PipelineNode) => n.id !== nodeId)
    edges.value = edges.value.filter(
        (e: Edge) => e.source !== nodeId && e.target !== nodeId
    )
    queryResults.value.delete(nodeId)
    if (selectedNodeId.value === nodeId) {
        selectedNodeId.value = null
    }
}

// 当前选中节点的执行结果
const selectedNodeResult = computed(() =>
    selectedNodeId.value ? queryResults.value.get(selectedNodeId.value) ?? null : null
)

export function usePipeline() {
    return {
        // 状态
        nodes,
        edges,
        selectedNodeId,
        queryResults,
        executingNodes,
        selectedNodeResult,

        // 操作方法
        addNode,
        updateNode,
        removeNode,
        executeNode,
        buildCteSql,
        getUpstreamColumns,
    }
}
