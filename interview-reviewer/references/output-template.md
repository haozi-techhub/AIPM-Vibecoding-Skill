# 飞书输出模板

面试复盘文档的 Lark-flavored Markdown 结构模板。Phase 8 按此模板组装内容。

---

## 色彩规范

| 用途 | callout背景色 | 边框色 | emoji |
|------|-------------|--------|-------|
| 复盘概览/中性信息 | light-blue | blue | clipboard |
| 表现不错 | light-green | green | writing_hand |
| 有待改进 | light-orange | light-orange | writing_hand |
| 关键失分 | light-red | red | warning |
| 正确答案教学 | light-green | green | book |
| Senior级回答示例 | light-purple | purple | trophy |
| Level评级 | pale-yellow | yellow | bar_chart |
| 追问防御链 | light-yellow | yellow | shield |
| 思维路径 | 不用callout，用代码块 | - | - |
| 知识盲区/差距 | light-yellow | yellow | light_bulb |
| 岗位匹配 | light-blue | blue | target |
| 训练任务 | light-green | green | weight_lifter |
| 自查项 | light-red | red | check_mark |
| 行动建议 | pale-gray | gray | pushpin |
| 话术库增量摘要 | light-purple | purple | books |

## 文档骨架

```markdown
# 面试复盘 - {公司名} - {YYYY-MM-DD}

🎧 **面试录音回放：** {录音链接}

{上面这行放在文档最顶部、概览之前，方便边看复盘边回听原音；用户未提供录音链接则整行省略}

<callout emoji="clipboard" background-color="light-blue" border-color="blue">

**面试概览**

- 公司/岗位：{公司名} - {岗位名}
- 薪资/Base：{薪资范围} / {城市}
- 面试轮次：{第几轮/共几轮}
- 面试时长：约{N}分钟
- 讨论项目：{项目1}、{项目2}
- 总体评估：{一句话总结}

</callout>

{如果有JD，用callout展示JD摘要}

---

# Part 1：QA问答对

## {主题分组1，如"离职原因"}

### {面试官问题1}

面试官考察点：{考察什么}

```plaintext {wrap}
{候选人实际回答，清洗口语但保留原意}
```

{根据严重度选择callout颜色}

<callout emoji="writing_hand" background-color="{light-green/light-orange/light-red}" border-color="{green/light-orange/red}">

{诊断：2-3句话，指出问题或亮点}

</callout>

### {面试官问题2}

{重复上述结构...}

## {主题分组2，如"项目经历"}

{继续QA对...}

---

# Part 2：正确答案（关键弱题深度教学）

<callout emoji="brain" background-color="light-blue" border-color="blue">

以下对本次面试中答得最差的{N}个关键问题做深度知识教学。目标不是背答案，而是**真正理解知识点**。

</callout>

## 关键问题1：{问题标题}

<callout emoji="warning" background-color="light-red" border-color="red">

{为什么这个问题是关键失分点，1-2句话}

</callout>

### 正确理解

{概念/框架/原理的教学，来自Obsidian知识库}

{如果涉及多方案对比，用表格展示（表格放在callout外面）}

| 方案 | 原理 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|---------|
| ... | ... | ... | ... | ... |

### 在你的项目中

{映射到用户实际项目，来自项目文档}

### 关键数据解释

{如果涉及指标/数据，解释定义和观测方式}

### 行业最佳实践

{行业怎么做的，来自知识库或WebSearch}

### Senior（55万级）回答示例

<callout emoji="trophy" background-color="light-purple" border-color="purple">

**Senior级回答的结构：**

1. **开头（破题+定结论）：** {一句话给出明确判断}
2. **中段（数据+论据）：** {3-4个具体数据/事实支撑}
3. **收尾（战略视野）：** {跳出问题谈更广泛影响}

</callout>

**针对本题的senior级范例：**

```plaintext {wrap}
{完整的范例回答，约150-250字，用用户真实项目的数据填充}
```

### 你的Level评级

<callout emoji="bar_chart" background-color="pale-yellow" border-color="yellow">

**当前评级：** {🔴初级 / 🟡中级 / 🟢高级senior / 🌟专家级}

**对应薪资区间：** {25-35万 / 35-45万 / 45-60万 / 60万+}

**距离senior（55万target）的具体gap：**
- {gap 1}
- {gap 2}
- {gap 3}

**这个gap可以通过什么训练补上：** {具体训练动作}

</callout>

## 关键问题2：{...}

{重复结构...}

---

# Part 3：思维路径

{对同样的关键弱题}

## 问题1：{问题标题}

```plaintext {wrap}
听到"{面试官的问题}" →

Step 1（先定义/给结论）：{...}
Step 2（说原因/trade-off）：{...}
Step 3（对比其他方案）：{...}
Step 4（回到你的场景和结果）：{...}
```

## 问题2：{...}

{重复...}

---

# Part 4：追问防御链

{对同样的关键弱题}

## 问题1：{问题标题}

<callout emoji="shield" background-color="light-yellow" border-color="yellow">

**追问1："{追问问题}"**

追问意图：{面试官在测什么}

思路关键词：{2-3个关键点}

**追问2："{追问问题}"**

追问意图：{...}

思路关键词：{...}

</callout>

## 问题2：{...}

{重复...}

---

# Part 5：差距分析

## 项目深挖清单

<callout emoji="clipboard" background-color="light-blue" border-color="blue">

以下问题是这场面试暴露的"你对自己项目不够清楚"的地方。每一条你都必须能用自己的话回答。

</callout>

### {项目名1}

1. {问题}（{文档已覆盖：去复习 xxx.md / 文档未覆盖：需自己补充}）
2. {问题}
3. ...

### {项目名2}

{继续...}

## 知识盲区清单

<callout emoji="light_bulb" background-color="light-yellow" border-color="yellow">

以下是这场面试暴露的PM/AI知识盲区。

</callout>

### {知识域1，如Agent架构}

| 概念 | 一句话解释 | 为什么你需要懂 | Obsidian参考 |
|------|----------|-------------|-------------|
| {概念} | {解释} | {原因} | {文件路径 or "尚未收录"} |

### {知识域2}

{继续...}

## 岗位匹配映射

{仅在用户提供JD时输出}

<callout emoji="target" background-color="light-blue" border-color="blue">

**{公司名} {岗位名} JD逐条匹配分析**

三种状态：✅直接覆盖 ｜ 🔄迁移论证 ｜ ❌空白

</callout>

| JD要求 | 匹配度 | 你的经验证据 | 面试中的表现 | 下次怎么讲 |
|--------|--------|------------|------------|----------|
| {要求} | {状态} | {证据} | {表现} | {建议} |

### 核心差距总结

<callout emoji="warning" background-color="light-red" border-color="red">

**必须补的{N}个差距（按紧急度排序）：**

1. **{差距1}** — {说明}
2. **{差距2}** — {说明}
3. **{差距3}** — {说明}

</callout>

## 本周训练任务（每条配参考答案）

<callout emoji="weight_lifter" background-color="light-green" border-color="green">

本周必须完成的训练任务，每条都已给出senior级参考答案。目标是练到能在面试中自然说出。

</callout>

### 训练任务1：{任务描述}

**为什么练这个：** {基于本场面试哪个问题暴露出来的}

**参考答案（senior级）：**

```plaintext {wrap}
{完整的标准回答，约150-300字，基于用户真实项目+知识库}
```

**答案来源：** {项目文档：xxx.md | 知识库：xxx.md}

**验收标准：**
- {可验证的具体行为，如"能默写完整框架"}
- {追问扛得住的标准，如"能回答'为什么不选B方案'"}

{如有数据空白}
**⚠️ 待用户补充真实数据：** {具体哪些数据需要确认}

### 训练任务2：{...}

{重复结构...}

## 下次面试前自查项（每条配标准答案）

<callout emoji="check_mark" background-color="light-red" border-color="red">

下次面试前必须能用自己的话答出以下问题。每条都已给出基于你真实项目和知识库的标准答案。

</callout>

### 自查问题1：{面试官可能怎么问}

**标准答案：**

```plaintext {wrap}
{完整回答，可以直接说出口的版本，约100-200字}
```

**答案来源：** {项目文档路径 | 知识库笔记路径}

{如有数据空白}
**⚠️ 待用户补充：** {具体哪些数据需要确认}

### 自查问题2：{...}

{重复结构...}

---

# 本场可复用话术（已追加进话术库）

<callout emoji="books" background-color="light-purple" border-color="purple">

本场提炼出 {N} 条可复用项，已追加进 **[我的面试话术库]({库链接})**。下次面试前直接翻库，不用回头看这份复盘文档。

**本场增量：**
- 新增题：{题名1}、{题名2}…
- 已有题补充原话：{题名}（这次又被问了一遍）
- 新增提问套路：{套路名}
- ⚠️ 待你确认：{行为题答案等待你核对的项}

</callout>
```

## 分段策略

文档通常很长（20+ QA对 + 深度分析 + 训练任务+自查项），需要分段发布：

| 段 | 内容 | 方式 |
|----|------|------|
| Seg 1 | 录音链接（文档顶部）+ 复盘概览 + JD（如有） | docs +create |
| Seg 2 | Part 1 QA对（前半） | docs +update append |
| Seg 3 | Part 1 QA对（后半） | docs +update append |
| Seg 4 | Part 2 正确答案 + Senior示例 + Level评级（关键问题1-2） | docs +update append |
| Seg 5 | Part 2 正确答案 + Senior示例 + Level评级（关键问题3-5） | docs +update append |
| Seg 6 | Part 3 思维路径 + Part 4 追问防御链 | docs +update append |
| Seg 7 | Part 5a/5b/5c 差距分析 | docs +update append |
| Seg 8 | Part 5d 本周训练任务（含参考答案） | docs +update append |
| Seg 9 | Part 5e 下次面试前自查项（含标准答案） | docs +update append |
| Seg 10 | 本场可复用话术增量摘要段（指向话术库） | docs +update append |

每段控制在合理长度内（建议每段不超过15000字符），避免单次API调用超时。如果某段内容过长，可进一步拆分。

**话术库是另一份独立文档**：上表只管复盘文档本身。把可复用项写进「我的面试话术库」是 Phase 8 Step 8.3 的独立操作（fetch 全库 → 合并 → overwrite 写回），规范见 [`talk-track-bank.md`](talk-track-bank.md)，不要和复盘文档的分段混在一起。
