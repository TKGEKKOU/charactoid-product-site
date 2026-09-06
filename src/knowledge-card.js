const mechanisms = [
  ['01', '结构化入库', '按标题、段落与语义分块，保留来源和相邻关系；向量写入 Milvus。'],
  ['02', '混合检索', '语义向量 + BM25 关键词双路召回，RRF 融合排名，兼顾含义与专有名词。'],
  ['03', '证据精排', '候选去重、相关性重排；按配置补全相邻片段，在上下文预算内组织证据。'],
  ['04', '质量检查', '自适应路径支持限次改写与重试；证据不足不强答，故障不伪装成结果。'],
  ['05', '知识权限隔离', '服务端按工作区、知识空间强制过滤；角色只能检索获准访问的资料。'],
  ['06', '表格独立查询', 'CSV / XLSX 数据进入 SQLite，表结构说明进入向量库；统计走受限只读 SQL。'],
];

export function renderKnowledgeCard() {
  return `<article class="eco-card eco-knowledge" tabindex="0" role="listitem">
    <div class="eco-card-front">
      <span class="eco-number">01</span><h3>知识资源</h3>
      <p>按角色授权检索资料，为回答提供可追溯的证据。</p>
      <small>混合检索 · 质量检查 · 知识隔离</small>
    </div>
    <div class="eco-card-detail rag-detail">
      <header class="rag-heading"><span class="rag-label">知识资源 / RAG</span>
        <h3>先检索证据，再组织回答。</h3>
        <p>本地资料不是整篇塞入提示词，而是按需检索、筛选与校验。</p>
      </header>
      <ol class="rag-pipeline" aria-label="知识处理流程">
        <li>解析分块</li><li>混合召回</li><li>重排组装</li><li>质量校验</li>
      </ol>
      <div class="rag-mechanisms">${mechanisms.map(([number, title, text]) => `
        <section class="rag-mechanism"><span aria-hidden="true">${number}</span>
          <div><h4>${title}</h4><p>${text}</p></div>
        </section>`).join('')}
      </div>
      <footer class="rag-handoff">
        <p><b>知识 Worker 返回证据</b><span aria-hidden="true"> → </span><b>Supervisor 组织回复</b></p>
        <p>本地证据不足时，按策略拒答或申请联网补证；不默认联网。</p>
      </footer>
    </div>
  </article>`;
}
