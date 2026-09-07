# CHARACTOID

CHARACTOID 是一个本地优先的开源角色 Agent 工作台展示项目。

它围绕“角色”组织知识、记忆、声音、工具、Live2D 形象与可恢复任务，展示从自然语言请求到 Worker 执行、状态记录和结果返回的完整链路。

## 展示内容

- Agent / Supervisor / Worker 的分层协作
- RVC 文件型任务工作流
- 知识资源与 RAG 检索思路
- GPT-SoVITS、RVC 与实时语音链路
- Skill / MCP 工具接入方向
- Live2D 角色与语音口型互动
- 任务状态、人工确认、暂停、恢复、取消与重试

## 本地运行

需要 Node.js 18+：

```bash
npm install
npm run dev
```

打开 <http://127.0.0.1:18080/> 查看页面。

生产构建：

```bash
npm run build
```

## 项目定位

这是一个纯前端产品官网式展示项目，不包含 CHARACTOID 后端运行时。页面中的 RVC、音频和 Live2D 内容用于展示产品能力与交互方向。

## 许可

MIT License
