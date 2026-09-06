import { renderResourceCards } from './resource-cards.js';
import { renderKnowledgeCard } from './knowledge-card.js';
import { bindEcosystemCards } from './ecosystem-interaction.js';
import './style.css';
import './ecosystem.css';
import { Application, extensions } from 'pixi.js';
import { configureCubismSDK, Live2DModel, Live2DPlugin } from 'untitled-pixi-live2d-engine/cubism';
extensions.add(Live2DPlugin);

const workers = [
  { id: 'knowledge', name: 'knowledge_worker', title: '知识检索', desc: '把角色的知识空间变成可引用、可追踪的答案来源。', tags: ['RAG', '重排', '质量门'], input: '用户问题 / 文档片段', output: '可引用答案', state: 'READY', detail: '负责召回、重排与引用链校验，避免回答脱离已索引的知识来源。' },
  { id: 'memory', name: 'memory_worker', title: '记忆编排', desc: '整理角色、用户和工作区记忆，让对话拥有连续性。', tags: ['Persona', 'Memory', 'Scope'], input: '会话事件 / 用户偏好', output: '作用域记忆', state: 'SYNCED', detail: '按角色、用户与工作区拆分记忆边界，只把当前任务需要的上下文交给 Agent。' },
  { id: 'document', name: 'document_worker', title: '文档处理', desc: '导入资料、分块、索引，把文件变成可使用的上下文。', tags: ['Import', 'Chunking', 'Index'], input: 'PDF / Markdown / TXT', output: '索引文档', state: 'INDEXED', detail: '完成解析、分块、Embedding 与索引写入，让原始资料变成可检索资源。' },
  { id: 'profile', name: 'profile_worker', title: '角色档案', desc: '管理人设、档案与导出，让每个角色拥有自己的边界。', tags: ['Profile', 'Version', 'Export'], input: '角色配置 / 版本', output: '可导出档案', state: 'VERSIONED', detail: '管理人设字段、版本快照与导出边界，保证角色配置可以回溯。' },
  { id: 'voice', name: 'voice_worker', title: '声音能力', desc: '连接 GPT-SoVITS，处理 TTS、ASR、音色与训练。', tags: ['TTS', 'ASR', 'Voice Asset'], input: '文本 / 音频', output: '语音资产', state: 'READY', detail: '连接 TTS 与 ASR 服务，统一音频格式、音色引用和生成结果。' },
  { id: 'rvc', name: 'rvc_worker', title: 'RVC 变声', desc: '从附件到结果音频，把长任务放回同一条 执行链路。', tags: ['Audio', 'RVC', 'Long task'], input: '附件 / 模型 / Index', output: '变声音频', state: 'RESUMABLE', detail: '保存模型、Index 与推理参数，管理可暂停、可取消、可重试的长任务。' },
  { id: 'live2d', name: 'live2d_worker', title: 'Live2D 连接', desc: '管理模型与连接，让角色不只停留在文字里。', tags: ['Model', 'Motion', 'Connect'], input: '模型 / 动作参数', output: '角色表现', state: 'CONNECTED', detail: '维护模型资源、动作状态与连接信息，把文本 Agent 接到可视化角色。' },
  { id: 'config', name: 'config_worker', title: '资源管理', desc: '检查、安装、启动和停止应用受管资源。', tags: ['Status', 'Install', 'Runtime'], input: '资源声明 / 操作', output: '运行状态', state: 'OBSERVABLE', detail: '检查、安装、启动和停止受管资源，并把生命周期状态返回给上层任务。' },
];
const state = { activeWorker: 'rvc', activeStep: 5, playing: null, audioCleanup: null };
const icons = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
};
const workerById = (id) => workers.find((worker) => worker.id === id) || workers[0];
const steps = ['接收附件', '准备音频', '分离人声', '等待确认', '转换任务', '回收结果'];
const stepDetail = ['attachment_id 进入任务', '音频标准化 / 音轨提取', '人声与伴奏分离', '用户确认下一步', '模型、Index 与参数', '结果引用回到对话'];
const workflowStages = [
  ['STEP 01 / INGEST','附件先变成可追踪的资源引用。','前端上传后只保留 attachment_id；任务记录写入 SQLite，Worker 通过引用读取文件，不把本地绝对路径暴露给对话层。','attachment_id','RECEIVED'],
  ['STEP 02 / PREPARE','先统一音频输入，再交给模型。','读取 WAV / FLAC 的采样率、声道与时长，必要时转换为 PCM WAV；同时生成 waveform metadata，避免后续任务重复探测。','PCM WAV','NORMALIZED'],
  ['STEP 03 / SEPARATE','人声和伴奏分别产出。','调用音源分离 Worker，将 vocal 与 instrumental 写入受管任务目录，并为两个结果生成独立 asset_id，便于回滚和重试。','VOCAL + INST','CHECKPOINT'],
  ['STEP 04 / CONFIRM','资源检查通过后，等待人工确认。','系统检查模型、Index、采样率和输出目录；状态进入 WAITING_输入，只有收到 resume 指令才会继续执行。','RESUME TOKEN','WAITING'],
  ['STEP 05 / CONVERT','RVC 参数作为一次可复现运行保存。','把 model、index、f0_method、transpose、protect 等参数写入 run snapshot；运行事件可用于进度、取消与失败恢复。','RUN SNAPSHOT','RUNNING'],
  ['STEP 06 / RESULT','变声文件已生成，可以直接试听。','RVC Worker 已完成推理并返回 WAV 音频；每个文件通过 asset_id 关联本次 run_id，支持播放、暂停和进度追踪。','VOICE ASSETS','COMPLETED'],
];

// Render only the detail content; keep the page, GIF and audio nodes mounted.
function renderWorkerDetail(worker) {
  return `
    <div class="worker-detail-head"><span class="worker-state"><i></i>${worker.state}</span><span class="worker-index">WORKER / ${String(workers.findIndex((item) => item.id === worker.id) + 1).padStart(2, '0')}</span></div>
    <h3 class="worker-technical-name">${worker.name}</h3>
    <h4 class="worker-function-name">${worker.title}</h4>
    <p class="worker-description">${worker.desc}</p>
    <p class="worker-detail-copy">${worker.detail}</p>
    <div class="worker-io"><div><small>输入</small><strong>${worker.input}</strong></div><div><small>输出</small><strong>${worker.output}</strong></div></div>
    <div class="tag-list" aria-label="相关技术">
      ${worker.tags.map((tag) => `<span>${tag}</span>`).join('')}
    </div>
  `;
}

function updateWorker(id) {
  const worker = workers.find((item) => item.id === id);
  const detail = document.getElementById('worker-detail');
  if (!worker || !detail || state.activeWorker === id) return;

  state.activeWorker = id;
  detail.classList.remove('is-switching');
  void detail.offsetWidth;
  detail.innerHTML = renderWorkerDetail(worker);
  detail.classList.add('is-switching');
  document.querySelectorAll('.worker-row').forEach((row) => {
    const selected = row.dataset.worker === id;
    row.classList.toggle('active', selected);
    row.setAttribute('aria-pressed', String(selected));
  });
}

function renderWorkflowStage() {
  const stage = workflowStages[state.activeStep];
  return `<div class=\"workflow-stage-card\"><span class=\"stage-kicker\">${stage[0]}</span><h3>${stage[1]}</h3><p>${stage[2]}</p><div class=\"stage-metrics\"><span>输出<strong>${stage[3]}</strong></span><span>状态<strong>${stage[4]}</strong></span></div></div>`;
}
function updateWorkflowStep(index) {
  state.activeStep = index;
  document.querySelectorAll('.workflow-step').forEach((step, i) => {
    step.classList.toggle('active', i === index);
    step.classList.toggle('done', i < index);
  });
  const dynamic = document.querySelector('.workflow-dynamic-stage');
  if (dynamic) { dynamic.innerHTML = renderWorkflowStage(); dynamic.classList.toggle('is-hidden', index === 5); dynamic.classList.toggle('is-visible', index !== 5); }
  const audioResult = document.querySelector('.audio-result-card');
  if (audioResult) { audioResult.classList.toggle('is-hidden', index !== 5); audioResult.classList.toggle('is-visible', index === 5); }
  document.querySelector('.workflow-results')?.classList.toggle('is-current', index === 5);
}

function render() {
  state.audioCleanup?.();
  state.audioCleanup = null;
  const active = workerById(state.activeWorker);
  const stepStatus = (index) => index < state.activeStep ? 'done' : index === state.activeStep ? 'active' : '';
  document.querySelector('#app').innerHTML = `
    <header class="site-header">
      <a class="brand" href="#top" aria-label="YUMENO 首页"><span class="brand-mark"><i></i><i></i><i></i></span><span>YUMENO</span><small>角色 Agent 运行时</small></a>
      <nav class="desktop-nav" aria-label="主导航"><a href="#capabilities">能力</a><a href="#architecture">架构</a><a href="#workflow">工作流</a><a href="#ecosystem">生态</a><a href="#boundaries">边界</a></nav>
      <div class="header-actions"><a class="text-link" href="https://github.com/TKGEKKOU/yumeno" target="_blank" rel="noreferrer">GitHub ${icons.arrow}</a><a class="button button-primary button-small" href="#closing">进入体验 ${icons.arrow}</a></div>
      <button class="mobile-menu" aria-label="打开菜单">${icons.menu}</button>
    </header>
    <div class="mobile-drawer" aria-hidden="true"><button class="drawer-close" aria-label="关闭菜单">${icons.close}</button><a href="#capabilities">能力</a><a href="#architecture">架构</a><a href="#workflow">工作流</a><a href="#ecosystem">生态</a><a href="#boundaries">边界</a><a href="#closing">进入体验 ${icons.arrow}</a></div>
    <main>
      <section class="hero" id="top">
        <div class="hero-copy reveal"><p class="eyebrow"><span class="eyebrow-dot"></span> 本地优先 · 角色 Agent 运行时</p><h1>让角色，<em>不止于</em><br />对话。</h1><p class="hero-lede">YUMENO 把意图、知识、声音和工具编排成一条可以真正完成任务的 执行链路。</p><div class="hero-actions"><a class="button button-primary" href="#architecture">查看执行链路 ${icons.arrow}</a><a class="button button-ghost" href="#workflow">看一个真实任务</a></div><div class="hero-note"><span>01</span><div><strong>对话即控制台</strong><p>从一句自然语言开始，让角色完成资源准备、文件处理和知识工作。</p></div></div></div>
        <div class="hero-visual reveal reveal-delay"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-panel"><div class="panel-top"><span class="live-indicator"><i></i> 运行中</span><span>RUN_00429</span></div><div class="agent-presence"><div class="avatar-ring"><div class="avatar-core">Y</div></div><div><p class="mini-label">当前角色</p><h2>Yume <span>梦野</span></h2><p>正在把你的想法变成下一步。</p></div></div><div class="run-message"><span class="message-mark">“</span><p>用这段音频做一次变声，先帮我检查需要的资源。</p><span class="message-time">11:42:08</span></div><div class="run-route"><div class="route-line"><span class="route-dot filled"></span><span class="route-track"></span><span class="route-dot active"></span><span class="route-track muted"></span><span class="route-dot"></span></div><div class="route-copy"><span>Core Agent</span><strong>config_worker</strong><span>rvc_worker</span></div></div><div class="run-footer"><span><i class="pulse"></i> 等待资源检查结果</span><span>68%</span></div></div><span class="float-label label-top">请求 → 执行</span><span class="float-label label-bottom">可继续任务</span></div>
      </section>
      <section class="marquee-strip" aria-label="YUMENO 核心关键词"><div class="marquee-track"><span class="marquee-unit">角色 Agent <b>•</b> 意图理解 <b>•</b> Supervisor 编排 <b>•</b> Worker 执行 <b>•</b> RAG 知识库 <b>•</b> 记忆 <b>•</b> GPT-SoVITS <b>•</b> TTS / ASR <b>•</b> RVC 变声 <b>•</b> Live2D <b>•</b> Skill <b>•</b> MCP <b>•</b> 资源管理 <b>•</b> 可恢复任务 <b>•</b> Native Runtime <b>•</b></span><span class="marquee-unit" aria-hidden="true">角色 Agent <b>•</b> 意图理解 <b>•</b> Supervisor 编排 <b>•</b> Worker 执行 <b>•</b> RAG 知识库 <b>•</b> 记忆 <b>•</b> GPT-SoVITS <b>•</b> TTS / ASR <b>•</b> RVC 变声 <b>•</b> Live2D <b>•</b> Skill <b>•</b> MCP <b>•</b> 资源管理 <b>•</b> 可恢复任务 <b>•</b> Native Runtime <b>•</b></span></div></section>
      <section class="statement section-pad" id="capabilities"><div class="section-kicker reveal"><span>01 / 产品定位</span><span>对话就是操作入口</span></div><div class="statement-grid"><h2 class="editorial-title reveal">不是把功能<br /><em>堆在一起。</em></h2><div class="statement-body reveal reveal-delay"><p class="big-copy">YUMENO 让角色成为统一入口。它理解你在说什么，判断缺少什么，找到该负责的 Worker，然后把任务带到真正的结果。</p><div class="micro-rule"></div><p class="support-copy">资源、服务、文件、知识和声音，不再是互相割裂的设置页，而是同一条可观察、可恢复的 执行链路。</p></div></div><div class="scenario-grid reveal"><article class="scenario scenario-dark"><span class="scenario-index">A / RESOURCE</span><h3>“帮我检查一下<br />RVC 现在能不能用。”</h3><div class="scenario-state"><span class="status-chip status-green">READY</span><span>config_worker</span></div><p>真实状态、容量、阶段和下一步，全部回到对话里。</p></article><article class="scenario scenario-tint"><span class="scenario-index">B / KNOWLEDGE</span><h3>“把这份资料<br />加入她的知识库。”</h3><div class="scenario-state"><span class="status-chip status-teal">INDEXING</span><span>document_worker</span></div><p>从文档导入、分块到检索，角色拥有自己的上下文。</p></article><article class="scenario scenario-outline"><span class="scenario-index">C / VOICE</span><h3>“用她的声音<br />读一下这段文字。”</h3><div class="scenario-state"><span class="status-chip status-blue">QUEUED</span><span>voice_worker</span></div><p>服务按需启动，素材、语言和结果都有明确的状态。</p></article></div></section>
      <section class="architecture section-pad" id="architecture"><div class="section-kicker reveal"><span>02 / Agent 工作方式</span><span>一个请求，多个专长 Worker</span></div><div class="architecture-heading"><h2 class="display-title reveal">一个角色，<br /><em>一支团队。</em></h2><p class="reveal reveal-delay">Core Agent 负责理解请求，Supervisor 负责分派任务，Worker 负责具体执行；每一步都有状态，可以暂停、继续或重试。</p></div><div class="system-map reveal"><div class="map-side map-left"><div class="map-caption">输入</div><div class="map-source"><span class="source-glyph">✦</span><strong>你的一句话</strong><small>自然语言意图</small></div></div><div class="map-core"><div class="map-node node-persona"><span class="node-num">01</span><strong>PERSONA</strong><small>角色 / 记忆 / 知识</small></div><div class="connector"></div><div class="map-node node-supervisor"><span class="node-num">02</span><strong>SUPERVISOR</strong><small>识别 / 委派 / 收口</small></div><div class="connector"></div><div class="worker-stack"><div class="map-node node-worker"><span class="node-num">03</span><strong>DOMAIN WORKER</strong><small>${active.name}</small></div><div class="worker-dots"><i></i><i></i><i></i><i></i></div></div><div class="connector"></div><div class="map-node node-runtime"><span class="node-num">04</span><strong>NATIVE RUNTIME</strong><small>事件 / Resume / Finish</small></div></div><div class="map-side map-right"><div class="map-caption">输出</div><div class="map-result"><span class="result-check">${icons.check}</span><strong>可继续的结果</strong><small>状态 + 下一步</small></div></div></div><div class="principles"><div><span>01</span><strong>意图不丢失</strong><p>结构化委派让自然语言目标保持可追踪。</p></div><div><span>02</span><strong>状态不伪造</strong><p>未启动、运行中、等待确认与已完成清晰区分。</p></div><div><span>03</span><strong>任务不失联</strong><p>长任务可以暂停、恢复、取消或重试。</p></div></div></section>
      <section class="workflow section-pad" id="workflow"><div class="workflow-head reveal"><div><div class="section-kicker"><span>03 / CASE STUDY</span><span>RVC FILE WORKFLOW</span></div><h2 class="display-title">从一句话，<br /><em>到一个结果。</em></h2></div><p>RVC 是 YUMENO 当前最完整的文件型 Worker 样板。附件、资源、确认、长任务和结果，都在同一个对话任务里闭环。</p></div><div class="workflow-layout"><div class="workflow-media reveal"><div class="media-frame"><img src="/assets/yumeno-rvc-workflow-full.gif" alt="YUMENO RVC 变声工作流演示" /><div class="media-stamp">REAL TASK<br /><strong>RVC / 06 STEPS</strong></div></div><div class="media-caption"><span>真实页面操作记录</span><span>YUMENO / 2026</span></div></div><div class="workflow-steps reveal reveal-delay">${steps.map((name, index) => `<button class="workflow-step ${stepStatus(index)}" data-step="${index}"><span class="step-number">${String(index + 1).padStart(2, '0')}</span><span class="step-copy"><strong>${name}</strong><small>${stepDetail[index]}</small></span><span class="step-mark">${index < state.activeStep ? icons.check : index === state.activeStep ? '<i class="step-pulse"></i>' : icons.arrow}</span></button>`).join('')}</div></div><div class="workflow-results reveal"><div class="workflow-dynamic-stage ${state.activeStep === 5 ? 'is-hidden' : 'is-visible'}">${renderWorkflowStage()}</div><div class="workflow-stage-card audio-result-card ${state.activeStep === 5 ? 'is-visible' : 'is-hidden'}"><div class="audio-result-copy"><span class="stage-kicker">STEP 06 / RESULT AUDIO</span><h3>变声文件已生成，可以直接试听。</h3><p>RVC Worker 已完成推理并返回 WAV 音频；每个文件通过 asset_id 关联本次 run_id，支持播放、暂停和进度追踪。</p></div><div class="audio-stack compact-audio-stack reveal reveal-delay"><article class="audio-card" data-audio="voice-result-01.wav"><div class="audio-visual"><canvas class="audio-waveform" aria-label="Voice result 01 动态波形"></canvas><div class="audio-progress" aria-hidden="true"><span></span></div><button class="audio-play" aria-label="播放音频">${icons.play}</button></div><div class="audio-meta"><div><strong>真实产生的示例音频01</strong></div></div></article><article class="audio-card" data-audio="voice-result-02.wav"><div class="audio-visual visual-two"><canvas class="audio-waveform" aria-label="Voice result 02 动态波形"></canvas><div class="audio-progress" aria-hidden="true"><span></span></div><button class="audio-play" aria-label="播放音频">${icons.play}</button></div><div class="audio-meta"><div><strong>真实产生的示例音频02</strong></div></div></article></div></div></div></section>
      <section class="workers section-pad" id="workers"><div class="workers-intro reveal"><div class="section-kicker"><span>04 / WORKER ATLAS</span><span>专长 Worker</span></div><h2 class="display-title">每个能力，<br /><em>都有自己的职责。</em></h2><p>YUMENO 不把所有事情塞给一个万能 Agent。清晰的 Worker 边界，让能力可以组合，也让状态可以被理解。</p></div><div class="worker-explorer"><div class="worker-list reveal">${workers.map((worker, index) => `<button class="worker-row ${worker.id === state.activeWorker ? 'active' : ''}" data-worker="${worker.id}" aria-controls="worker-detail" aria-pressed="${worker.id === state.activeWorker}"><span class="row-index">${String(index + 1).padStart(2, '0')}</span><span class="row-name">${worker.title}</span><span class="row-arrow">${icons.arrow}</span></button>`).join('')}</div><div class="worker-detail reveal reveal-delay" id="worker-detail" role="region" aria-label="Worker 功能详情" aria-live="polite">${renderWorkerDetail(active)}</div></div></section>
      <section class="ecosystem section-pad" id="ecosystem"><div class="section-kicker reveal"><span>05 / 资源与扩展</span><span>Worker 需要资源</span></div><div class="ecosystem-grid"><div class="eco-copy reveal"><h2 class="display-title">Worker 不凭空工作，<br /><em>它们依赖可管理的资源。</em></h2><p>知识、声音、工具和角色模型由不同 Worker 按需读取、写入和管理。把鼠标移到卡片上，查看每个方向的输入、处理路径与输出。</p></div><div class="eco-collage reveal reveal-delay" role="list" aria-label="资源与扩展方向">${renderKnowledgeCard()}${renderResourceCards()}</div></div></section>
      <section class="boundaries section-pad" id="boundaries"><div class="runtime-top reveal"><div class="section-kicker"><span>06 / 能力边界</span><span>状态默认可见</span></div><h2 class="display-title">好的 Agent，<br /><em>不会装作完成。</em></h2></div><div class="runtime-grid"><div class="runtime-console reveal" id="runtime"><div class="console-header"><span>任务事件记录</span><span class="console-live"><i></i> LIVE</span></div><div class="console-body"><div class="console-event"><time>11:42:08</time><span class="event-dot teal"></span><div><strong>intent.received</strong><p>用户请求：用这段音频做一次变声</p></div></div><div class="console-event"><time>11:42:10</time><span class="event-dot blue"></span><div><strong>worker.dispatched</strong><p>delegate_to_config_worker</p></div></div><div class="console-event"><time>11:42:13</time><span class="event-dot green"></span><div><strong>checkpoint.created</strong><p>等待用户确认资源状态</p></div></div><div class="console-event faded"><time>— — —</time><span class="event-dot muted"></span><div><strong>next action</strong><p>resume / cancel / retry</p></div></div></div><div class="console-footer"><span>SESSION / YUME_00429</span><span>仅本机</span></div></div><div class="runtime-copy reveal reveal-delay"><div class="runtime-rule"></div><h3>每一个状态，都有下一步。</h3><p>未配置、未安装、未启动、检查中、运行中、等待输入、失败、取消和已完成，不会被混成一句模糊的“处理中”。</p><div class="state-list"><span><i class="dot-green"></i> 已完成</span><span><i class="dot-teal"></i> 等待输入</span><span><i class="dot-blue"></i> 运行中</span><span><i class="dot-dark"></i> 可取消</span></div></div></div><div class="boundary-rail reveal"><article><span class="boundary-index">01 / DATA</span><h3>数据边界</h3><p>SQLite 管理角色、会话、知识空间和运行摘要；Milvus Lite 管理文档分块与 Dense / Sparse Vector；文件系统只承载原始资料、附件、模型、音频与任务结果。</p></article><article><span class="boundary-index">02 / EXECUTION</span><h3>执行边界</h3><p>前端只提交结构化操作，不暴露本地路径、Shell、Python 或临时命令。Worker 通过稳定引用执行任务，资源管理只操作应用受管目录。</p></article><article><span class="boundary-index">03 / HUMAN LOOP</span><h3>人工确认与生命周期</h3><p>未配置、未安装、未启动、检查中、运行中、等待输入、失败、取消、已完成；每个长任务都支持 Resume / Cancel / Retry。</p></article></div><div class="boundary-lifecycle reveal"><span>INTENT</span><i></i><span>CHECK</span><i></i><span>CONFIRM</span><i></i><span>RUN</span><i></i><span>RESULT</span><i></i><span>RESUME / CANCEL / RETRY</span></div></section>
      <section class="closing section-pad" id="closing"><div class="closing-inner reveal"><span class="closing-orbit orbit-a"></span><span class="closing-orbit orbit-b"></span><p class="eyebrow"><span class="eyebrow-dot"></span> 从一个请求开始</p><h2>把下一个任务，<br /><em>交给你的角色。</em></h2><p>YUMENO 把对话变成一条可以继续的路。</p><div class="hero-actions"><a class="button button-dark" href="https://github.com/TKGEKKOU/yumeno" target="_blank" rel="noreferrer">浏览项目 ${icons.arrow}</a><a class="button button-outline-white" href="#top">回到顶部 ↑</a></div></div></section>
    </main>
    <footer class="site-footer"><div class="footer-brand"><span class="brand-mark"><i></i><i></i><i></i></span><div><strong>YUMENO</strong><span>角色 Agent 运行时</span></div></div><div class="footer-links"><a href="#capabilities">产品能力</a><a href="#architecture">Agent 架构</a><a href="#workflow">真实工作流</a><a href="#boundaries">能力边界</a><a href="https://github.com/TKGEKKOU/yumeno" target="_blank" rel="noreferrer">GitHub ${icons.arrow}</a></div><div class="footer-bottom"><span>Local-first. Role-driven. Resumable.</span><span>MIT LICENSE / 2026</span></div></footer>`;
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('.worker-row').forEach((row) => {
    row.addEventListener('click', () => updateWorker(row.dataset.worker));
  });
  bindEcosystemCards();
  document.querySelectorAll('.workflow-step').forEach((step) => step.addEventListener('click', () => updateWorkflowStep(Number(step.dataset.step))));
  document.querySelector('.mobile-menu')?.addEventListener('click', () => document.querySelector('.mobile-drawer')?.classList.add('open'));
  document.querySelector('.drawer-close')?.addEventListener('click', () => document.querySelector('.mobile-drawer')?.classList.remove('open'));
  document.querySelectorAll('.mobile-drawer a').forEach((link) => link.addEventListener('click', () => document.querySelector('.mobile-drawer')?.classList.remove('open')));
  bindAudio();
  bindLive2D();
  observeReveals();
}
function scrollToId(id) { requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
function bindAudio() {
  const players = [];
  let audioContext;
  let activePlayer = null;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const getContext = () => {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  };
  const paint = (player, live = false) => {
    const { canvas, audio, card, analyser, data, progress } = player;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width; const h = rect.height;
    context.clearRect(0, 0, w, h);
    if (analyser && live) analyser.getByteFrequencyData(data);
    const bars = 44; const gap = 3; const barWidth = Math.max(2, (w - gap * (bars - 1)) / bars);
    const ratio = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
    for (let i = 0; i < bars; i += 1) {
      const wave = 0.25 + Math.abs(Math.sin(i * 0.74 + (live ? performance.now() / 360 : 0))) * 0.52;
      const signal = analyser && data ? (data[Math.floor(i / bars * data.length)] / 255) : wave;
      const barHeight = Math.max(5, (0.2 + signal * 0.8) * h);
      const x = i * (barWidth + gap); const y = (h - barHeight) / 2;
      context.fillStyle = i / bars <= ratio ? '#39C5BB' : 'rgba(57, 197, 187, .34)';
      context.beginPath();
      if (context.roundRect) context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      else context.rect(x, y, barWidth, barHeight);
      context.fill();
    }
    progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    if (live && !reduceMotion && !audio.paused && !audio.ended) player.frame = requestAnimationFrame(() => paint(player, true));
  };
  const stopPlayer = (player, reset = false) => {
    if (!player) return;
    player.audio.pause();
    if (player.frame) cancelAnimationFrame(player.frame);
    player.card.classList.remove('playing');
    player.button.innerHTML = icons.play;
    player.button.setAttribute('aria-label', '播放音频');
    if (reset) player.audio.currentTime = 0;
    paint(player);
  };
  document.querySelectorAll('.audio-card').forEach((card) => {
    const button = card.querySelector('.audio-play');
    const canvas = card.querySelector('.audio-waveform');
    const progress = card.querySelector('.audio-progress span');
    const audio = new Audio(`/assets/${card.dataset.audio}`);
    audio.preload = 'metadata';
    const player = { card, button, canvas, progress, audio, analyser: null, data: null, frame: null };
    players.push(player);
    audio.addEventListener('timeupdate', () => paint(player));
    audio.addEventListener('loadedmetadata', () => paint(player));
    audio.addEventListener('ended', () => { stopPlayer(player, true); if (activePlayer === player) { activePlayer = null; state.playing = null; } });
    button.addEventListener('click', () => {
      if (activePlayer && activePlayer !== player) stopPlayer(activePlayer);
      if (!audio.paused) { stopPlayer(player); activePlayer = null; state.playing = null; return; }
      const context = getContext();
      if (context && !player.analyser) {
        player.analyser = context.createAnalyser(); player.analyser.fftSize = 128; player.data = new Uint8Array(player.analyser.frequencyBinCount);
        const source = context.createMediaElementSource(audio); source.connect(player.analyser); player.analyser.connect(context.destination);
      }
      audio.play().then(() => {
        activePlayer = player; state.playing = card.dataset.audio; card.classList.add('playing'); button.innerHTML = icons.pause; button.setAttribute('aria-label', '暂停音频'); paint(player, true);
      }).catch(() => { button.setAttribute('aria-label', '播放失败，请重试'); });
    });
    paint(player);
  });
  state.audioCleanup = () => {
    players.forEach((player) => stopPlayer(player, false));
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
    activePlayer = null;
    state.playing = null;
  };
}
function observeReveals() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach((item) => item.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: 0.12 });
  items.forEach((item) => observer.observe(item));
}
render();



// 使用 Cubism Modern（3/4/5）运行时加载完整模型；仅在用户点击立绘后驱动参数。
async function bindLive2D() {
  const viewport = document.querySelector('.live2d-canvas');
  if (!viewport || viewport.dataset.bound === 'true') return;
  viewport.dataset.bound = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // 默认启用高频语音式活动；点击后切换为慢速待机。
  let active = true;
  let app;
  let model;
  try {
    configureCubismSDK({ memorySizeMB: 64 });
    app = new Application();
    await app.init({ backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2), preference: 'webgl' });
    viewport.replaceChildren(app.canvas);
    app.canvas.setAttribute('aria-label', '点击模型切换活动');
    model = await Live2DModel.from(viewport.dataset.live2dModel, { textureOptions: { lod: 'single-auto' }, autoInteract: false });
    // 水印开关：该模型的水印表情文件把 Param137 设为 1；按用户要求显式启用。
    model.anchor.set(0.5, 1);
    app.stage.addChild(model);
    const baseWidth = model.width || 1;
    const baseHeight = model.height || 1;
    const fit = () => {
      const w = viewport.clientWidth || 260;
      const h = viewport.clientHeight || 300;
      const scale = Math.min(w / baseWidth, h / baseHeight) * 2.49;
      model.scale.set(scale);
      model.position.set(w * 0.23, h * 2.40);
      app.renderer.resize(w, h);
    };
    viewport.dataset.loaded = 'true';
    fit();
    requestAnimationFrame(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    const internal = model.internalModel;
    const core = internal.coreModel;
    const watermarkIndex = Array.from({ length: core.getParameterCount() }, (_, index) => index)
      .find((index) => core.getParameterId(index).getString().s === 'Param137');
    if (watermarkIndex !== undefined) core.setParameterValueByIndex(watermarkIndex, 1);
    // getParameterId 接收数字索引，不是字符串；缓存实际存在的参数。
    const parameterIndices = new Map();
    for (let index = 0; index < core.getParameterCount(); index++) {
      parameterIndices.set(core.getParameterId(index).getString().s, index);
    }
    const setParam = (id, value) => {
      const index = parameterIndices.get(id);
      if (index !== undefined) core.setParameterValueByIndex(index, value);
    };
    internal.on('beforeModelUpdate', () => {
      if (!active || reduced.matches) return;
      const t = performance.now() / 1000;
      // 多层低频身体运动：避免单一正弦波造成机械的匀速摆动。
      const motionRate = active ? 1 : 0.42;
      const sway = Math.sin(t * 0.82 * motionRate) * 15 + Math.sin(t * 1.63 * motionRate + 0.7) * 5 + Math.sin(t * 0.31 * motionRate) * 4;
      const tilt = Math.sin(t * 0.67 * motionRate + 1.2) * 5 + Math.sin(t * 1.27 * motionRate) * 2;
      setParam('ParamAngleX', sway);
      setParam('ParamAngleY', Math.sin(t * 0.58 * motionRate) * 4 + Math.sin(t * 1.11 * motionRate) * 2);
      setParam('ParamBodyAngleX', tilt);
      // 模拟语音音量包络：快速开合、短暂停顿，避免嘴巴像钟摆一样匀速张合。
      const syllable = Math.max(0, Math.sin(t * 8.4 * motionRate) * 0.62 + Math.sin(t * 13.7 * motionRate + 0.9) * 0.28 + Math.sin(t * 3.1 * motionRate) * 0.18);
      const mouth = Math.min(1, Math.pow(syllable, 1.35) * 1.15);
      setParam('ParamMouthOpenY', mouth);
    });
    const toggle = () => { active = !active; viewport.classList.toggle('is-active', active); };
    viewport.addEventListener('click', toggle);
    viewport.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
  } catch (error) {
    console.error('Cubism 5 模型加载失败', error);
    viewport.dataset.error = 'true';
    viewport.dataset.errorMessage = error?.message || '未知错误';
    viewport.replaceChildren();
  }
}



















