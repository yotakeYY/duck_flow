# DuckFlow

> 🦆 在浏览器中运行的可视化 SQL 管道工具，基于 DuckDB-Wasm 驱动。

## 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 + TypeScript | 前端框架 |
| Vite | 构建工具 |
| DuckDB-Wasm | 浏览器内置 SQL 引擎 |
| Vue Flow | 可视化节点画布 |
| PapaParse | CSV 解析 |
| Pinia | 状态管理 |

## 功能特性

- **CSV 源节点** — 上传 CSV 文件并自动注册为 DuckDB 数据表
- **SQL 过滤节点** — 通过 WHERE 子句过滤数据
- **SQL 连接节点** — 合并两张数据表（INNER / LEFT / RIGHT / FULL OUTER）
- **输出视图节点** — 可视化预览管道最终结果
- **数据预览面板** — 分页展示查询结果，显示执行时间
- **暗色 IDE 主题** — 专业级深色界面

## 快速开始

### 方式一：Docker 开发环境（推荐）

```bash
docker-compose up --build
```

访问 [http://localhost:5173](http://localhost:5173)

### 方式二：本地开发

```bash
npm install
npm run dev
```

### 生产构建

```bash
npm run build
```

## 目录结构

```
src/
├── App.vue                    # 主画布与路由编排
├── main.ts                    # 应用入口
├── style.css                  # 全局暗色 IDE 主题
├── types/
│   └── pipeline.ts            # TypeScript 类型定义
├── composables/
│   ├── useDuckDb.ts           # DuckDB-Wasm 核心引擎
│   └── usePipeline.ts         # 管道状态与 SQL 生成
└── components/
    ├── NodeSidebar.vue        # 节点库侧边栏
    ├── PreviewPanel.vue       # 数据预览面板
    └── nodes/
        ├── CsvSourceNode.vue  # CSV 源节点
        ├── SqlFilterNode.vue  # SQL 过滤节点
        ├── SqlJoinNode.vue    # SQL 连接节点
        └── OutputViewNode.vue # 输出视图节点
```

## 使用方法

1. 从左侧**节点库**拖入所需节点到画布
2. 连接节点（从输出端口拖到输入端口）
3. 配置节点参数（上传 CSV、填写过滤条件等）
4. 点击节点或 **全部执行** 查看结果
5. 底部**预览面板**显示查询结果数据

## Docker 配置说明

本项目使用多阶段 Docker 构建：

- `develop-stage` — 开发模式，支持热更新（HMR）
- `build-stage` — 生产构建
- `production-stage` — Nginx 静态文件服务

> **注意**：DuckDB-Wasm 需要 `SharedArrayBuffer` 支持，Vite 开发服务器已自动添加 `COOP/COEP` 响应头。
