# YUMENO 展示页信息架构与排版骨架优化

日期：2026-09-06
目标：在不修改 `03 / CASE STUDY RVC FILE WORKFLOW` 与 `05 / 资源与扩展` 内部内容的前提下，让展示页从“模块目录”变成“真实任务链路”。

## 已确认的产品事实

- 用户从对话提出目标；Core Agent 理解意图，Supervisor 负责委派与收口，领域 Worker 负责具体执行，Native Runtime 管理状态、事件、Resume、Cancel 和 Finish。
- RVC 是最完整的文件型长任务样板，展示附件、资源、人工确认、异步执行和结果回收。
- Worker 依赖可管理的知识、声音、模型、工具和外部扩展资源；资源管理与功能 Worker 有明确边界。
- 系统明确区分未配置、未安装、未启动、运行中、等待输入、失败、取消和已完成，不把未完成伪装成完成。

事实来源：
- `D:\CodePython\YUMENO\README.md`
- `D:\CodePython\YUMENO\ARCHITECTURE.md`
- `D:\CodePython\YUMENO\docs\architecture\agent-rag-platform.md`

## 选定方向：证据先行 / 任务链路优先

页面顺序调整为：

```text
Hero
→ 01 / 产品定位
→ 03 / CASE STUDY RVC FILE WORKFLOW
→ 02 / Agent 工作方式
→ 04 / WORKER ATLAS
→ 05 / 资源与扩展
→ 06 / 能力边界
→ Closing
```

原因：访客先理解产品承诺，再看一个真实任务；随后再把案例抽象成 Supervisor、Worker、Resource、Runtime 的通用关系，最后用能力边界完成可信度收口。

## 实施范围

- 调整 `E:\landing\src\main.js` 中 section 的外层顺序。
- 调整站内导航，使导航顺序与实际阅读顺序一致。
- 增加轻量的章节过渡带，用来表达“产品定位 → 真实证据 → 系统结构 → 执行单元 → 资源 → 可信状态”的关系。
- 在 `E:\landing\src\style.css` 增加集中式的叙事布局与平板/移动端覆盖规则，避免继续为单个模块追加零散补丁。
- 保持 03 和 05 的 section 内部内容、交互数据和文案不变；只改变它们的外层顺序、外层 class 和相邻关系。
- 不更换当前黑白灰、青绿色、编辑式标题和技术状态视觉语言。

## 响应式骨架

- 桌面：Hero、RVC、Architecture、Worker、Runtime 保持双区或主次分栏；章节过渡带作为低高度的阅读节拍。
- 平板：优先保留内容分区，不把所有结构粗暴压成手机单列；Architecture 改成垂直流程，避免桌面地图造成无效留白。
- 手机：按“章节标题 → 核心说明 → 主内容 → 下一步”线性阅读；Workflow 步骤、Worker 列表、Runtime 事件优先于装饰。
- Ecosystem 保持既有内容和交互，但外层容器允许自然增高，避免固定高度成为移动端内容截断风险。

## 回退点

- Git 初始提交：`16c514b chore: capture initial landing state`
- 完整源文件快照：`E:\landing\_rollback\initial-20260906-124004`
- 快照包含 `src`、`public`、`index.html`、package manifests 与本地 tar 包，并附带 `manifest.json` SHA-256 清单。
