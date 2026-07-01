# Subagent 使用规约（CLAUDE.md 摘录）

> 本文件摘录自 `~/.claude/CLAUDE.md`（全局）与项目 `CLAUDE.md`，记录三个自研 subagent 在 CLAUDE.md 中的强制执行规则。完整 CLAUDE.md 不在此仓库内，这里只保留与 subagent 调度直接相关的部分。

---

## Context Guardian — 强制执行规则（来自全局 CLAUDE.md）

context-guardian 必须在每次会话中严格执行，不可跳过。

### 触发时机（必须执行，不可省略）

1. **首次响应前**：收到用户第一条任务消息后，在执行任何其他操作之前，必须先调用 `Agent` 工具启动 context-guardian 进行首次上下文评估
2. **每完成 5 次工具调用后**：无论什么任务，每累计 5 次工具调用（Read/Write/Edit/Bash/Agent 等）必须启动一次 context-guardian 检查
3. **等待用户输入前**：任务运行中，每次需要用户确认、审批权限、或等待用户输入新指令时，必须先启动 context-guardian 检查上下文状态，再等待用户响应
4. **长输出后**：任何单次工具调用返回超过 200 行内容后，立即启动 context-guardian
5. **运行时间超过 3 分钟后**：任务累计运行时间超过 3 分钟后，立即启动 context-guardian
6. **🟠/🔴 状态时**：context-guardian 报告 ORANGE 或 RED 状态后，必须立即执行压缩，然后再次启动 context-guardian 验证压缩效果

### 执行方式

使用 Agent 工具，subagent_type 设为 `context-guardian`：

```
Agent({ subagent_type: "context-guardian", description: "上下文状态检测", prompt: "评估当前上下文使用状态，报告 🟢/🟡/🟠/🔴 状态。如需压缩则执行压缩并输出 Task Checkpoint。" })
```

### 不可跳过

- 即使用户没有明确要求，也必须执行
- 即使用户催促"继续"或"快做"，也必须先检测再继续
- 跳过 context-guardian 是严重违规行为

---

## Output Audit Protocol（来自项目 CLAUDE.md）

Every output this system produces — not just knowledge base queries, but also new notes, MOC updates, article processing, conversation replies, code changes — must pass the atomic-note-auditor before being shown to the user. No exceptions.

The auditor checks two dimensions:

1. **人话审核**: Output must read like natural human writing. No AI flavor (boilerplate hedging, slogan-style endings, overly formal tone, unnecessary list formatting, empty opening statements). If it sounds like AI wrote it, reject and rewrite until it reads naturally.
2. **正确性审核**: Facts, source attributions, wikilinks, frontmatter, note structure — all must be accurate. If the auditor finds errors, the error details become input for the next rewrite iteration. Same error must not recur.

**Error feedback loop**: When the auditor rejects output, the rejection reason (specific error description) is fed back into the next rewrite. The loop continues until the output passes both checks. Maximum 5 rewrite rounds. By round 3 the output should be converging (fewer new errors than previous round). By round 5 the output must pass — if it still fails, escalate to the user with full error history.

**How to execute**: After producing any output, spawn the atomic-note-auditor agent to audit it. Only deliver after audit passes.

### Knowledge Base Query Protocol 中的审核步骤

回答知识库问题时遵循三步流程：

1. 先搜原子笔记
2. 需要时回溯原文
3. **响应前自审** — spawn an audit subagent (subagent_type: "claude") that checks: (a) accuracy vs note content, (b) no missing key points, (c) source attribution is correct. Only output the answer after audit passes.

---

## Loop Engineering 质量护栏（来自项目 CLAUDE.md）

### 对抗理解债
- AI 自动拆文/建笔记时，关键笔记用户需亲自过一遍
- "审过"不能变成"扫过"——原文依据的 wikilink 是可追溯性的命根子
- 自动化越快，"仓库里实际存在的东西"和"你脑子里理解的东西"鸿沟越大

### 防认知投降
- auditor 说通过不等于你不用看——带着判断力设计 loop 是解药，为逃避思考设计 loop 是助燃剂
- 同一个动作，相反的结果

### 验证仍归你
- Agent 说"done"是声明不是证明——硬验收（wikilink可达/frontmatter完整/原文可溯）是不可替代的
