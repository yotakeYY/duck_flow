<template>
  <!-- 使用说明弹窗 -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="modal-container" role="dialog" aria-modal="true">

          <!-- 弹窗头部 -->
          <div class="modal-header">
            <div class="modal-title-row">
              <span class="modal-logo">🦆</span>
              <div>
                <h2 class="modal-title">DuckFlow 使用说明</h2>
                <p class="modal-subtitle">浏览器内置 SQL 管道工具 · 零后端 · 即开即用</p>
              </div>
            </div>
            <button class="modal-close-btn" @click="$emit('update:modelValue', false)">✕</button>
          </div>

          <!-- 弹窗内容 -->
          <div class="modal-body">

            <!-- 快速开始 -->
            <section class="help-section">
              <h3 class="section-title">🚀 快速开始</h3>
              <div class="steps-grid">
                <div class="step-card">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <span class="step-label">拖入节点</span>
                    <span class="step-desc">从左侧面板将节点拖到画布上</span>
                  </div>
                </div>
                <div class="step-card">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <span class="step-label">上传数据</span>
                    <span class="step-desc">点击 CSV 源节点，拖入或选择 CSV 文件</span>
                  </div>
                </div>
                <div class="step-card">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <span class="step-label">连接节点</span>
                    <span class="step-desc">从节点右侧圆点拖到下一个节点左侧圆点</span>
                  </div>
                </div>
                <div class="step-card">
                  <span class="step-num">4</span>
                  <div class="step-content">
                    <span class="step-label">查看结果</span>
                    <span class="step-desc">数据处理完成后自动展示在底部预览面板</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- 节点说明 -->
            <section class="help-section">
              <h3 class="section-title">📦 节点类型</h3>
              <div class="node-cards">

                <div class="node-help-card csv-card">
                  <div class="node-card-header">
                    <span class="node-card-icon">📁</span>
                    <span class="node-card-title">CSV 源</span>
                    <span class="node-card-badge csv-badge">数据源</span>
                  </div>
                  <ul class="node-card-list">
                    <li>拖入 CSV 文件或点击上传区域选择文件</li>
                    <li>支持任意编码与分隔符（自动检测）</li>
                    <li>上传后数据自动注册为 DuckDB 数据表</li>
                    <li>上传完成后自动执行并展示数据预览</li>
                    <li>点击「↻ 重新上传」可替换数据</li>
                  </ul>
                </div>

                <div class="node-help-card filter-card">
                  <div class="node-card-header">
                    <span class="node-card-icon">🔍</span>
                    <span class="node-card-title">SQL 过滤</span>
                    <span class="node-card-badge filter-badge">转换</span>
                  </div>
                  <ul class="node-card-list">
                    <li>连接 CSV 源节点后，列名下拉框自动填充</li>
                    <li>支持运算符：= / &gt; / &lt; / &gt;= / &lt;= / != / LIKE</li>
                    <li>LIKE 运算符支持通配符：<code>%关键词%</code></li>
                    <li>下方实时预览生成的 WHERE 子句</li>
                    <li>点击节点即可在预览面板查看过滤结果</li>
                  </ul>
                </div>

                <div class="node-help-card join-card">
                  <div class="node-card-header">
                    <span class="node-card-icon">🔗</span>
                    <span class="node-card-title">SQL 连接</span>
                    <span class="node-card-badge join-badge">合并</span>
                  </div>
                  <ul class="node-card-list">
                    <li>左侧有<b>两个</b>输入端口，分别接左表和右表</li>
                    <li>连接后，左右表名和列名自动显示</li>
                    <li>支持 INNER / LEFT / RIGHT / FULL OUTER JOIN</li>
                    <li>从列名下拉框选择连接键（JOIN ON 条件）</li>
                    <li>点击节点即可预览合并后的结果</li>
                  </ul>
                </div>

              </div>
            </section>

            <!-- 交互技巧 -->
            <section class="help-section">
              <h3 class="section-title">✨ 交互技巧</h3>
              <div class="tips-grid">
                <div class="tip-item">
                  <span class="tip-icon">🖱️</span>
                  <div class="tip-text">
                    <span class="tip-title">右键单击节点</span>
                    <span class="tip-desc">弹出菜单：复制节点 / 删除节点</span>
                  </div>
                </div>
                <div class="tip-item">
                  <span class="tip-icon">🔗</span>
                  <div class="tip-text">
                    <span class="tip-title">右键单击连接线</span>
                    <span class="tip-desc">弹出菜单：删除这条连接</span>
                  </div>
                </div>
                <div class="tip-item">
                  <span class="tip-icon">📋</span>
                  <div class="tip-text">
                    <span class="tip-title">复制节点</span>
                    <span class="tip-desc">右键 → 复制节点，位置偏移 30px 生成副本</span>
                  </div>
                </div>
                <div class="tip-item">
                  <span class="tip-icon">📊</span>
                  <div class="tip-text">
                    <span class="tip-title">自动预览</span>
                    <span class="tip-desc">点击任意节点，底部面板自动打开并显示结果</span>
                  </div>
                </div>
                <div class="tip-item">
                  <span class="tip-icon">⚡</span>
                  <div class="tip-text">
                    <span class="tip-title">级联执行</span>
                    <span class="tip-desc">CSV 上传后自动依次执行所有下游节点</span>
                  </div>
                </div>
                <div class="tip-item">
                  <span class="tip-icon">🔍</span>
                  <div class="tip-text">
                    <span class="tip-title">全部执行</span>
                    <span class="tip-desc">点击工具栏「▶ 全部执行」重新运行所有节点</span>
                  </div>
                </div>
                <div class="tip-item">
                  <span class="tip-icon">🗺️</span>
                  <div class="tip-text">
                    <span class="tip-title">小地图导航</span>
                    <span class="tip-desc">右下角小地图可快速定位画布中的节点</span>
                  </div>
                </div>
                <div class="tip-item">
                  <span class="tip-icon">🔄</span>
                  <div class="tip-text">
                    <span class="tip-title">滚轮缩放</span>
                    <span class="tip-desc">在画布上滚动鼠标滚轮可缩放视图</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- 技术说明 -->
            <section class="help-section">
              <h3 class="section-title">🔧 技术说明</h3>
              <div class="tech-info">
                <div class="tech-item">
                  <span class="tech-label">SQL 引擎</span>
                  <span class="tech-value">DuckDB-Wasm（完全在浏览器本地运行，数据不上传服务器）</span>
                </div>
                <div class="tech-item">
                  <span class="tech-label">支持格式</span>
                  <span class="tech-value">CSV（自动检测分隔符、表头）</span>
                </div>
                <div class="tech-item">
                  <span class="tech-label">SQL 语法</span>
                  <span class="tech-value">标准 SQL，支持 DuckDB 扩展函数（如 regexp_matches、json 等）</span>
                </div>
                <div class="tech-item">
                  <span class="tech-label">数据隐私</span>
                  <span class="tech-value">✅ 所有数据在本地浏览器内处理，不发送至任何服务器</span>
                </div>
              </div>
            </section>

          </div>

          <!-- 弹窗底部 -->
          <div class="modal-footer">
            <span class="modal-version">DuckFlow v0.1.0</span>
            <button class="modal-ok-btn" @click="$emit('update:modelValue', false)">
              开始使用 →
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
