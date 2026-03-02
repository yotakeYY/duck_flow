/**
 * DuckFlow 管道状态类型定义
 * 管理节点类型、管道状态和执行结果
 */

// 节点类型
export type NodeType = 'csv_source' | 'sql_filter' | 'sql_join' | 'output_view'

// CSV 源节点参数
export interface CsvSourceParams {
    fileName: string
    columns: string[]
    rowCount: number
}

// SQL 过滤节点参数
export interface SqlFilterParams {
    column: string
    operator: '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN'
    value: string
}

// SQL JOIN 节点参数
export interface SqlJoinParams {
    joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER'
    leftColumn: string
    rightColumn: string
}

// 输出视图节点参数
export interface OutputViewParams {
    selectedColumns: string[]
    orderBy: string
    limit: number
}

// 管道节点定义
export interface PipelineNode {
    id: string
    type: NodeType
    data: {
        label: string
        sqlSnippet?: string  // 该节点生成的 SQL 逻辑片段
        tableName?: string   // DuckDB 中的虚拟表名
        params: CsvSourceParams | SqlFilterParams | SqlJoinParams | OutputViewParams | Record<string, unknown>
        isExecuting?: boolean
        hasError?: boolean
        errorMessage?: string
        rowCount?: number
    }
    position: { x: number; y: number }
}

// 管道边（节点连接）
export interface PipelineEdge {
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
}

// 查询执行结果
export interface QueryResult {
    columns: string[]
    rows: Record<string, unknown>[]
    rowCount: number
    executionTime: number
}

// 节点执行上下文（用于 SQL 查询生成）
export interface NodeExecutionContext {
    nodeId: string
    ctes: Map<string, string>  // CTE 名称 -> SQL 定义
    tableName: string
}

// DuckDB 初始化状态
export type DuckDbStatus = 'idle' | 'initializing' | 'ready' | 'error'

// 整体管道状态
export interface PipelineState {
    nodes: PipelineNode[]
    edges: PipelineEdge[]
    selectedNodeId: string | null
    queryResult: QueryResult | null
    isExecuting: boolean
}
