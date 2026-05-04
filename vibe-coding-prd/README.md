# Vibe Coding PRD Skill

> 一个 Claude Code skill，专门帮 vibe coding 用户（不写代码的 PM）写出"AI 可直接执行"的 PRD。

## 一句话定位

写一份**给 Claude Code / Cursor 直接执行**的 PRD（不是给团队 review 的传统 PRD）。

---

## 为什么需要它

传统 PRD 写给开发团队看，模糊处可以会议讨论补齐。
Vibe coding PRD 写给 AI 看——**AI 不会开会，模糊处会被自由发挥**。

| 场景 | 传统 PRD | Vibe Coding PRD |
|---|---|---|
| 颜色描述 | "温暖的米色" ✅ | 必须 `#fef3ef` |
| 功能描述 | "支持 @ 提及" ✅ | 必须「输入 `@` → 弹出选择浮层」 |
| 不做的事 | 可以省略 | **必须显式列出**（不然 AI 会过度发挥）|

---

## 主要功能

### 1. 4 步引导对话（每步必须用户确认）

```
Step 1: 前置信息确认（5 必答题或读取已有文档）
   ↓ 等用户确认
Step 2: 产品架构草图（1 屏架构卡片）
   ↓ 等用户确认
Step 3: PRD 5 模块逐个撰写
   ├─ Context（上下文）
   ├─ Scope（范围）
   ├─ Specification（规范）
   ├─ Acceptance（验收）
   └─ Guardrails（护栏）
   ↓ 每模块写完都等用户确认
Step 4: 17 项自查清单 + 二次确认
```

### 2. 主动 + 被动两种触发模式

**主动触发**（立即启动）：
- 命令：`/vibe-coding-prd` 或 `/vcprd`
- 自然语言："写 vibe coding PRD"、"给 Claude Code 用的 PRD"

**被动建议**（检测信号 + 询问）：
当你聊新项目想法时，如果同时满足 ≥3 个信号（讲了功能 + 平台 + 用户 + 问下一步等），skill 主动问"要不要帮你写 PRD？"——回 "好" 才启动，回 "不用" 就闭嘴。

### 3. 跨平台支持

包含 3 个完整示例，覆盖最常见的 vibe coding 场景：
- Web 工具（Next.js / Vercel）
- iOS App（SwiftUI）
- 微信小程序（云开发）

详见 [examples/](./examples/) 目录。

### 4. 输出文件解耦设计

默认输出到 `docs/PRD.md` 单文件；当 P 模块（Specification）超过 200 行时，**自动拆分**为：
- `docs/PRD.md`（主文档）
- `docs/DESIGN.md`（视觉 + 行为规范）
- `docs/TECH.md`（数据 + 技术规范）

---

## 怎么用

### 第一次使用

1. 确认 skill 已装（在 Claude Code 里输入 `/vcprd` 看是否有提示）
2. 准备好你的产品想法（一句话或一段描述都行）
3. 输入 `/vcprd`，按 4 步流程走

### 已有 BRD/MRD 的情况

skill 会自动扫描当前目录下的：
- `BRD.md`
- `MRD.md`
- `idea.md` / `notes.md` / `想法.md`

读到后会跳过 Step 1 的部分提问，直接复述确认。

---

## 文件结构

```
vibe-coding-prd/
├── SKILL.md              # 主入口（AI 加载的核心规则）
├── README.md             # 本文件
├── VERSION               # 版本号
├── CHANGELOG.md          # 变更日志
├── examples/             # 3 个跨平台完整示例
│   ├── web-tool.md
│   ├── ios-app.md
│   └── miniprogram.md
└── templates/            # 可直接复制的模板
    └── prd-template.md
```

---

## 怎么自定义 / 修改

### 改触发词
编辑 `SKILL.md` 的 frontmatter 中 `description` 字段。
注意：触发词改窄容易，改宽小心和其他 skill 冲突（如 `vibe-prd-writer`、`brd`、`mrd`）。

### 改 5 个模块
编辑 `SKILL.md` 的 §3 章节。每个模块的 DO/DON'T 都在那里。

### 改自查清单
编辑 `SKILL.md` 的 §7 章节（17 项清单）。增减条目要更新总数。

### 改示例
编辑 `examples/` 下对应文件，或新增（如 `examples/android-app.md`）。

### 改输出模板
编辑 `templates/prd-template.md`。

### 改后必须做的事
1. 更新 `VERSION`（语义化版本，重大改动 +1.0.0，小改动 +0.1.0）
2. 在 `CHANGELOG.md` 加一条记录
3. 重启 Claude Code 才能让改动生效（或运行 `/hooks` 重载配置）

---

## 怎么分享给同事

### 方式 A：直接拷贝目录
把整个 `vibe-coding-prd/` 文件夹拷给同事，让他们放到自己的 `~/.claude/skills/` 下，重启 Claude Code 即可。

### 方式 B：git 仓库
```bash
cd ~/.claude/skills/vibe-coding-prd
git init
git add .
git commit -m "v1.0.0 vibe coding prd skill"
git remote add origin <你的仓库地址>
git push -u origin main
```

同事拉取：
```bash
cd ~/.claude/skills
git clone <你的仓库地址> vibe-coding-prd
```

### 方式 C：打包 zip
```bash
cd ~/.claude/skills
zip -r vibe-coding-prd-v1.0.0.zip vibe-coding-prd/
```
发给同事让他们解压到 `~/.claude/skills/`。

---

## 与其他 skill 的关系

| Skill | 关系 | 何时用 |
|---|---|---|
| `brd` | 上游 | 评估"要不要做"时用 brd；决定要做后用本 skill |
| `mrd` | 上游 | 市场分析后，用本 skill 写执行 PRD |
| `office-hours` | 上游 | 头脑风暴阶段；想清楚后再用本 skill |
| `pre-flight`（计划中） | 下游 | PRD 完成后，开发前检查环境 |
| `agent-research`（计划中） | 下游 | AI 项目专用，研究角色 prompt |
| `eng-control`（计划中） | 下游 | 上线前的工程完备性审查 |

---

## 常见问题

### Q1: 它和 `vibe-prd-writer` 有什么区别？
- `vibe-prd-writer`：10 模块一次性输出（已停用）
- `vibe-coding-prd`：5 核心模块 + 4 步引导对话 + 强护栏（推荐）

### Q2: 为什么每一步都要等我确认？
因为 vibe coding 的核心痛点是"AI 默默推进做错了一大段"。强制等确认 = 早发现问题 = 少返工。

### Q3: 我中途想退出怎么办？
直接说"算了不写了"或者"暂停"。skill 会保留已写入的部分（不删除），下次叫它会从未完成的模块继续。

### Q4: PRD 写完后 idea 改了怎么办？
直接和 Claude Code 说"PRD 里的 X 改成 Y"。skill 会更新 PRD 并在文末加变更记录。
**绝对不要**让 Claude Code 直接改代码而不更新 PRD——会导致代码和文档脱节。

### Q5: 怎么验证 skill 装好了？
在 Claude Code 输入 `/vcprd`，如果出现引导对话就是装好了。
如果什么反应都没有，重启一下 Claude Code。

---

## 版本

当前版本：见 [VERSION](./VERSION)
变更历史：见 [CHANGELOG.md](./CHANGELOG.md)

---

## 作者

由 vibe coding PM 实际项目复盘后沉淀，开放给团队复用。
