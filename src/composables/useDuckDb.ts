/**
 * useDuckDb.ts
 * 负责 DuckDB-Wasm 的初始化、表管理和查询执行
 * 使用单例模式管理数据库实例
 */

import { ref, readonly } from 'vue'
import * as duckdb from '@duckdb/duckdb-wasm'
import type { DuckDbStatus, QueryResult } from '@/types/pipeline'

// 以单例形式持有 DuckDB 实例
let dbInstance: duckdb.AsyncDuckDB | null = null
let connectionInstance: duckdb.AsyncDuckDBConnection | null = null

// 全局响应式状态
const status = ref<DuckDbStatus>('idle')
const errorMessage = ref<string>('')
const registeredTables = ref<Set<string>>(new Set())

/**
 * 从 CDN bundles 初始化 DuckDB-Wasm
 * 在不支持 SharedArrayBuffer 的环境下会回退到 eh bundle
 */
async function initializeDuckDb(): Promise<void> {
    if (dbInstance) return  // 已初始化则跳过

    status.value = 'initializing'
    errorMessage.value = ''

    try {
        // 自动选择 CDN bundle（根据环境选择最优 bundle）
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()

        // 自动选择可用的 bundle
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)

        // 通过 URL 生成 Worker 脚本
        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker!}");`], {
                type: 'text/javascript',
            })
        )

        // 配置 Worker 和 Logger
        const worker = new Worker(worker_url)
        const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING)

        // 创建并初始化 DuckDB 实例
        dbInstance = new duckdb.AsyncDuckDB(logger, worker)
        await dbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker)

        // 建立数据库连接
        connectionInstance = await dbInstance.connect()

        // 初始化完成
        status.value = 'ready'
        console.log('[DuckDB] 初始化完成')

        // 防止 Worker URL 内存泄漏
        URL.revokeObjectURL(worker_url)
    } catch (err) {
        status.value = 'error'
        errorMessage.value = err instanceof Error ? err.message : '发生未知错误'
        console.error('[DuckDB] 初始化错误:', err)
        throw err
    }
}

/**
 * 将 CSV 文件注册为 DuckDB 数据表
 * @param tableName - DuckDB 中的表名
 * @param csvContent - CSV 文件内容（字符串）
 */
async function registerCsvAsTable(tableName: string, csvContent: string): Promise<void> {
    if (!dbInstance || !connectionInstance) {
        throw new Error('DuckDB 尚未初始化')
    }

    // 将 CSV 文件注册到 DuckDB 虚拟文件系统
    const encoder = new TextEncoder()
    const csvBuffer = encoder.encode(csvContent)
    await dbInstance.registerFileBuffer(`${tableName}.csv`, csvBuffer)

    // 直接从 CSV 创建数据表
    await connectionInstance.query(`
    CREATE OR REPLACE TABLE "${tableName}" AS
    SELECT * FROM read_csv_auto('${tableName}.csv', header=true)
  `)

    registeredTables.value.add(tableName)
    console.log(`[DuckDB] 表 "${tableName}" 注册成功`)
}

/**
 * 执行 SQL 查询并返回格式化结果
 * @param sql - 要执行的 SQL 语句
 * @returns 格式化后的 QueryResult
 */
async function executeQuery(sql: string): Promise<QueryResult> {
    if (!connectionInstance) {
        throw new Error('DuckDB 未连接')
    }

    const startTime = performance.now()

    const result = await connectionInstance.query(sql)
    const executionTime = performance.now() - startTime

    // 将 Apache Arrow 表转换为行数据
    const schema = result.schema
    const columns = schema.fields.map((f: { name: string }) => f.name)

    const rows: Record<string, unknown>[] = []
    const batches = result.batches

    for (const batch of batches) {
        const numRows = batch.numRows
        for (let i = 0; i < numRows; i++) {
            const row: Record<string, unknown> = {}
            for (const col of columns) {
                const colIdx = schema.fields.findIndex((f: { name: string }) => f.name === col)
                const vector = batch.getChildAt(colIdx)
                row[col] = vector?.get(i) ?? null
            }
            rows.push(row)
        }
    }

    return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime,
    }
}

/**
 * 获取表的列名列表
 * @param tableName - 目标表名
 * @returns 列名数组
 */
async function getTableColumns(tableName: string): Promise<string[]> {
    if (!connectionInstance) return []

    try {
        const result = await executeQuery(
            `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`
        )
        return result.rows.map((row) => row['column_name'] as string)
    } catch {
        return []
    }
}

/**
 * 删除数据表
 * @param tableName - 要删除的表名
 */
async function dropTable(tableName: string): Promise<void> {
    if (!connectionInstance) return

    await connectionInstance.query(`DROP TABLE IF EXISTS "${tableName}"`)
    registeredTables.value.delete(tableName)
    console.log(`[DuckDB] 表 "${tableName}" 已删除`)
}

/**
 * DuckDb 组合式函数
 * 提供数据库初始化和操作功能
 */
export function useDuckDb() {
    return {
        // 响应式状态（只读）
        status: readonly(status),
        errorMessage: readonly(errorMessage),
        registeredTables: readonly(registeredTables),

        // 数据库操作方法
        initializeDuckDb,
        registerCsvAsTable,
        executeQuery,
        getTableColumns,
        dropTable,
    }
}
