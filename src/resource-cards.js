// Keep product copy separate from the page shell and Live2D runtime.
export function renderResourceCards() {
  return `
    <article class="eco-card eco-voice" tabindex="0" role="listitem">
      <div class="eco-card-front">
        <span class="eco-number">02</span><h3>声音资源</h3>
        <p>从原始音视频，到能实时对话的角色音色。</p>
        <small>GPT-SoVITS · RVC</small>
      </div>
      <div class="eco-card-detail resource-detail voice-detail">
        <header class="resource-heading"><span>声音资源 / GPT-SoVITS + RVC</span>
          <h3>从一段素材，到角色开口说话。</h3>
          <p>统一素材入口，分别通向角色语音对话与音频变声。</p>
        </header>
        <ol class="voice-source-flow" aria-label="音视频素材准备">
          <li><b>01 导入素材</b><span>上传音频或视频</span></li>
          <li><b>02 提取音轨</b><span>视频先转为音频</span></li>
          <li><b>03 统一格式</b><span>转换采样率与声道</span></li>
          <li><b>04 分离人声</b><span>按需拆分人声与伴奏</span></li>
          <li><b>05 选择用途</b><span>训练角色音色 / 变声</span></li>
        </ol>
        <div class="voice-paths">
          <section class="voice-path voice-path-chat">
            <header><span>GPT-SoVITS</span><h4>准备训练数据，得到可绑定的角色音色</h4></header>
            <ol aria-label="角色音色训练流程"><li>检测语音并切片</li><li>整理训练音频</li><li>ASR 转写标注</li><li>校验语言与标注</li><li>提取文本 / 语音特征</li><li>训练 GPT 与 SoVITS</li><li>收集权重与参考音频</li><li>保存音色资产</li></ol>
            <div class="voice-dialogue">
              <h5>从训练结果到实时语音对话</h5>
              <ol aria-label="角色实时语音对话流程"><li>将音色绑定角色</li><li>接收聊天输入</li><li>生成角色回复</li><li>按语言分段</li><li>读取绑定音色推理</li><li>逐段返回语音并播放</li></ol>
            </div>
          </section>
          <section class="voice-path voice-path-rvc">
            <header><span>RVC</span><h4>把已有声音转换为目标音色音频</h4></header>
            <ol aria-label="RVC 音频转换流程"><li>选择待转换音频 / 人声</li><li>加载音色模型与可选 Index</li><li>设置变调等参数</li><li>确认并提交任务</li><li>提取特征、执行转换</li><li>输出变声人声</li><li>按需混回伴奏</li><li>试听、裁剪与导出</li></ol>
            <p>使用已有 RVC 模型进行音色转换；不必先经过上面的 GPT-SoVITS 训练。</p>
          </section>
        </div>
        <p class="resource-footnote">角色语音可接入 B 站直播互动与机器人语音消息。</p>
      </div>
    </article>
    <article class="eco-card eco-extension" tabindex="0" role="listitem">
      <div class="eco-card-front">
        <span class="eco-number">03</span><h3>工具与扩展</h3>
        <p>内置工具与外部服务，统一交给角色调用。</p>
        <small>工具调用 · 技能组合 · MCP 接入</small>
      </div>
      <div class="eco-card-detail resource-detail tool-detail">
        <header class="resource-heading"><span>工具与扩展</span>
          <h3>角色发起任务，工具受控执行。</h3>
          <p>统一调度内置能力与外部服务；按角色策略开放，而不是把所有工具交给模型。</p>
        </header>
        <ol class="tool-execution-flow" aria-label="工具调用流程">
          <li><b>01 分配任务</b><span>主控识别需求，委派专长 Worker</span></li>
          <li><b>02 选择工具</b><span>按任务加载能力，应用角色启用策略</span></li>
          <li><b>03 按需确认</b><span>检查确认要求，等待用户授权后继续</span></li>
          <li><b>04 执行回传</b><span>返回结构化结果，由主控汇总回复</span></li>
        </ol>
        <section class="tool-access" aria-label="三种能力组织方式">
          <h4>执行、复用、接入，各有分工</h4>
          <dl class="tool-capabilities">
            <div><dt>具体操作 <small>Tool</small></dt><dd>由统一注册表管理，声明负责的 Worker、数据变更与确认要求。</dd><dd class="tool-example">例如：检索资料、转换音频、修改配置</dd></div>
            <div><dt>任务方法 <small>Skill</small></dt><dd>组合提示词与工具集合，按需加载；复用任务方法，不默认暴露全部工具。</dd><dd class="tool-example">同一套方法，可复用于后续同类任务</dd></div>
            <div><dt>外部服务 <small>MCP</small></dt><dd>将外部服务在运行时注册为工具，纳入角色能力策略与确认流程。</dd><dd class="tool-example">扩展能力实现，保留统一的调用入口</dd></div>
          </dl>
        </section>
        <div class="tool-permissions"><b>确认规则不只看“是否写入”</b><p>只读检索的联网兜底也可能需要确认。MCP 工具默认不可信，除非服务端显式声明只读，否则先经过确认流程。</p></div>
      </div>
    </article>
    <article class="eco-card eco-live" tabindex="0" role="listitem">
      <div class="eco-card-front">
        <span class="eco-number">04</span><h3>Live2D 角色</h3>
        <p>让角色出现在对话中，支持全屏沉浸式语音互动。</p>
        <small>对话展示 · 全屏互动 · 语音口型</small>
      </div>
      <div class="eco-card-detail resource-detail">
        <div class="live2d-detail">
          <div class="live2d-stage"><div class="live2d-canvas" data-live2d-model="/assets/miku/miku.clean.model3.json" aria-label="Miku Live2D 动态模型预览" role="button" tabindex="0"></div></div>
          <div class="live-resource-copy">
            <header class="resource-heading"><span>Live2D 角色</span><h3>与角色面对面对话。</h3></header>
            <ol class="live-capabilities" aria-label="角色模型与对话展示能力">
              <li><b>导入与绑定</b><p>导入本地模型，选择并绑定角色。</p></li>
              <li><b>对话与全屏展示</b><p>对话页展示立绘；全屏沉浸式语音对话。</p></li>
              <li><b>语音驱动口型</b><p>结合音素与音频能量，口型跟随正在播放的语音。</p></li>
              <li><b>扩展到直播</b><p>可连接 VTube Studio，经直播软件采集到直播间展示。</p></li>
            </ol>
            <p class="resource-footnote">此模型仅为本页示例用。实际模型会跟随语音输出进行口型与动作响应。</p>
          </div>
        </div>
      </div>
    </article>`;
}
