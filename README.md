插件通过 `~/.claude/settings.json` 的 `enabledPlugins` 字段管理。

| 插件 ID | 来源 | 提供的 Skills |
|---------|------|--------------|
| `superpowers@claude-plugins-official` | Anthropic 官方 | superpowers 系列（13个） |
| `frontend-design@claude-plugins-official` | Anthropic 官方 | frontend-design |
| `andrej-karpathy-skills@karpathy-skills` | forrestchang/andrej-karpathy-skills | Karpathy 编程原则 |

### MCP 服务器插件

| 插件名 | 类型 | 用途 |
|--------|------|------|
| `pencil` | VS Code 扩展 + MCP Server | AI 辅助 UI 设计，读写 `.pen` 设计文件 |

> [!tip] 安装新插件
> 在 `~/.claude/settings.json` 的 `enabledPlugins` 中添加插件 ID，重启 Claude Code 生效。

---

## Skills 完整列表

### 🦸 Superpowers 系列（开发工作流）

由 `superpowers@claude-plugins-official` 提供，自动触发，无需手动调用。

| Skill                                        | 触发时机              | 作用                             |
| -------------------------------------------- | ----------------- | ------------------------------ |
| `superpowers:using-superpowers`              | 每次对话开始            | 初始化 Skill 使用规则，确保正确调用其他 Skills |
| `superpowers:brainstorming`                  | 创意工作、构建功能前        | 头脑风暴工作流，避免跳过思考直接实现             |
| `superpowers:writing-plans`                  | 有规格或需求的多步骤任务前     | 编写实施计划                         |
| `superpowers:executing-plans`                | 执行已有计划时           | 在独立 worktree 中执行计划             |
| `superpowers:systematic-debugging`           | 遇到 Bug、测试失败、意外行为时 | 系统化调试工作流                       |
| `superpowers:test-driven-development`        | 实现功能或修复 Bug 前     | TDD 工作流，先写测试再实现                |
| `superpowers:verification-before-completion` | 即将声明工作完成前         | 验证工作确实完成，避免虚假完成                |
| `superpowers:requesting-code-review`         | 完成任务后             | 请求代码审查                         |
| `superpowers:receiving-code-review`          | 收到代码审查反馈后         | 处理审查反馈                         |
| `superpowers:dispatching-parallel-agents`    | 面对2+个独立任务时        | 并行派发多个 Agent                   |
| `superpowers:subagent-driven-development`    | 执行有独立任务的计划时       | Subagent 驱动开发                  |
| `superpowers:using-git-worktrees`            | 开始需要隔离的功能工作时      | Git worktree 工作流               |
| `superpowers:finishing-a-development-branch` | 实现完成后             | 完成开发分支的收尾工作                    |

---

### 🎨 Frontend Design（前端设计）

由 `frontend-design@claude-plugins-official` 提供。

| Skill | 触发场景 | 作用 |
|-------|---------|------|
| `frontend-design:frontend-design` | 创建生产级前端界面时 | 高设计质量的前端界面创作指南 |

---

### 📝 Obsidian 系列

由 `kepano/obsidian-skills`（已内置）提供，适用于本 vault 操作。

| Skill | 触发场景 | 作用 |
|-------|---------|------|
| `obsidian-markdown` | 创建/编辑 `.md` 文件时 | Obsidian 规范 Markdown：wikilinks、callouts、properties 等 |
| `obsidian-bases` | 创建/编辑 `.base` 文件时 | Obsidian Bases 数据库文件：视图、过滤器、公式 |
| `obsidian-cli` | 通过 CLI 操作 vault 时 | Obsidian CLI 命令行交互 |
| `obsidian-knowledge-saver` | 沉淀原子笔记时 | 将对话内容提炼为可迭代的原子笔记 |
| `json-canvas` | 创建/编辑 `.canvas` 白板时 | JSON Canvas 文件：节点、边、群组 |

---

### 🔧 开发工具类

| Skill | 触发场景 | 作用 |
|-------|---------|------|
| `update-config` | 配置 Claude Code settings.json 时 | 修改权限、Hooks、环境变量、插件等配置 |
| `keybindings-help` | 自定义键盘快捷键时 | 配置 `~/.claude/keybindings.json` |
| `claude-api` | 使用 Anthropic SDK 开发时 | Claude API 最佳实践（含提示词缓存） |
| `simplify` | 代码写完后 | 审查代码质量、复用性和效率 |
| `fewer-permission-prompts` | 减少权限提示时 | 扫描 transcript 并添加常见操作到 allowlist |
| `init` | 初始化新项目时 | 创建 CLAUDE.md 代码库文档 |
| `review` | 审查 PR 时 | 代码审查工作流 |
| `security-review` | 安全审查时 | 当前分支待更改内容的安全审查 |

---

### ✍️ 内容创作类

| Skill | 触发场景 | 作用 |
|-------|---------|------|
| `article-writer` | 写文章时 | 完整写作工作流：风格参考 + 选题角度 + 配图方案 |
| `khazix-writer` | 写微信公众号长文时 | 微信公众号长文写作工作流（4000-8000字），仿"数字生活KHazix"的写作风格：无标题分隔、对话感强、真实体验感，包含5种内容原型和4层质量审查 |
| `note-summarizer` | 总结笔记/飞书文档时 | 专业笔记整理，结构化输出 |
| `competitive-analysis` | 竞品调研时 | 产品经理竞品分析工作流 |
| `defuddle` | 从网页提取内容时 | 用 Defuddle CLI 提取干净 Markdown，去除广告噪音 |

---

### 🐦 飞书（Lark）系列

| Skill | 用途 |
|-------|------|
| `lark-shared` | 飞书基础认证、应用配置初始化 |
| `lark-im` | 飞书即时消息：收发消息、管理群聊 |
| `lark-doc` | 飞书云文档：创建编辑文档，从 Markdown 创建 |
| `lark-wiki` | 飞书知识库：管理知识空间和文档节点 |
| `lark-drive` | 飞书云空间：文件上传下载、文件夹管理 |
| `lark-calendar` | 飞书日历：日程管理、会议创建 |
| `lark-task` | 飞书任务：待办创建、任务状态更新 |
| `lark-base` | 飞书多维表格：建表、字段管理、数据操作 |
| `lark-sheets` | 飞书电子表格：单元格读写、表格创建 |
| `lark-contact` | 飞书通讯录：组织架构查询、人员搜索 |
| `lark-mail` | 飞书邮箱：起草、发送、回复、搜索邮件 |
| `lark-minutes` | 飞书妙记：获取会议总结、待办、逐字稿 |
| `lark-vc` | 飞书视频会议：查询会议记录和纪要 |
| `lark-event` | 飞书事件订阅：WebSocket 监听飞书事件 |
| `lark-whiteboard` | 飞书画板：绘制架构图、流程图、思维导图 |
| `lark-openapi-explorer` | 探索飞书未封装的原生 OpenAPI |
| `lark-skill-maker` | 创建飞书 lark-cli 自定义 Skill |
| `lark-workflow-standup-report` | 日程待办摘要工作流 |
| `lark-workflow-meeting-summary` | 会议纪要整理工作流 |

---

### 🚀 Vercel / React 系列

| Skill | 用途 |
|-------|------|
| `deploy-to-vercel` | 部署应用到 Vercel |
| `vercel-cli-with-tokens` | 使用 Token 认证管理 Vercel 项目 |
| `vercel-react-best-practices` | React/Next.js 性能优化指南 |
| `vercel-react-native-skills` | React Native/Expo 移动应用最佳实践 |
| `vercel-react-view-transitions` | React View Transitions 动画实现 |
| `vercel-composition-patterns` | React 可扩展组件组合模式 |
| `web-design-guidelines` | Web 界面设计规范审查 |
| `remotion-best-practices` | Remotion 视频创作最佳实践 |

---

### 🛠️ 其他工具

| Skill | 用途 |
|-------|------|
| `loop` | 设置循环定时任务（如每5分钟执行一次） |
| `notebooklm-skill` | 查询 Google NotebookLM 笔记本 |
| `statusline-setup` | 配置 Claude Code 状态栏显示 |
| `opencli` | OpenCLI 命令行工具交互 |

---

## 🖊️ Pencil — AI 原生设计工具

> [!info] 安装方式
> 在 VS Code / Cursor 中安装 [Pencil 扩展](https://www.pencil.dev/)，MCP Server 会自动配置，Claude Code 可直接通过 MCP 工具操作 `.pen` 文件。

### 是什么

Pencil 是一个运行在 VS Code / Cursor 内部的 **AI 原生画布设计工具**，口号是「Design on canvas. Land in code.」。
- 设计文件使用专有 `.pen` 格式（JSON 加密），存放在项目目录里，可以 Git 版控
- 内置 Shadcn UI、Lunaris、Halo、Nitro 等设计系统
- 通过 MCP 协议让 Claude 直接读写设计文件，获取精确坐标和 token 值，避免截图猜测

### MCP 工具速查

| 工具 | 用途 |
|------|------|
| `get_editor_state` | 获取当前编辑器状态（活跃文件、用户选中内容）—— 任务开始先调用 |
| `open_document` | 打开已有 `.pen` 文件，或传 `'new'` 新建空文件 |
| `get_guidelines` | 加载设计规范和样式指引 |
| `batch_get` | 按 pattern 或 nodeId 批量读取节点，用于理解设计结构 |
| `batch_design` | 批量执行 Insert / Copy / Update / Replace / Move / Delete / Image 操作（核心写入工具） |
| `get_screenshot` | 获取指定元素的可视截图 |
| `snapshot_layout` | 检查布局结构，发现对齐/间距问题 |
| `get_variables` | 读取全局样式变量和主题 token |
| `set_variables` | 更新颜色、字体、间距等设计 token |
| `find_empty_space_on_canvas` | 找到画布上可用的空白区域 |
| `export_nodes` | 导出节点为 PNG / JPEG / WEBP / PDF |
| `search_all_unique_properties` | 搜索全文件唯一属性值（排查一致性） |
| `replace_all_matching_properties` | 批量替换匹配属性（全局改色/换字体） |

### 典型工作流

**① 用自然语言生成 UI 设计**
1. `open_document('new')` 新建画布
2. `get_guidelines` 加载设计系统规范
3. 描述想要的界面 → Claude 用 `batch_design` 生成初稿
4. `get_screenshot` 查看效果，循环迭代

**② 从设计生成代码**
1. `batch_get` 读取精确坐标和 token
2. Claude 根据规格直接生成生产级代码（无需截图猜测）

**③ 设计一致性审查**
1. `search_all_unique_properties` 找出所有颜色/字体值
2. `replace_all_matching_properties` 批量统一风格

> [!tip] 注意事项
> - `.pen` 文件内容加密，**只能通过 Pencil MCP 工具读写**，不要用 `Read` / `Grep` 直接打开
> - 单次 `batch_design` 建议不超过 25 个操作

---

## Karpathy 编程原则

由 `andrej-karpathy-skills@karpathy-skills` 提供，自动注入，被动生效。

> [!quote] 核心理念
> LLMs 擅长朝着具体目标循环推进，而非执行模糊指令。

| 原则 | 说明 |
|------|------|
| **Think Before Coding** | 先澄清假设和歧义，提出多种解释，询问确认，而不是盲目开始写代码 |
| **Simplicity First** | 只实现被要求的，不加推测性功能、不必要的抽象或防御性错误处理 |
| **Surgical Changes** | 只修改必要的代码，保留原有代码风格，不重构不相关的部分 |
| **Goal-Driven Execution** | 定义可验证的成功标准，循环推进直到达成目标，而非执行模糊指令 |
