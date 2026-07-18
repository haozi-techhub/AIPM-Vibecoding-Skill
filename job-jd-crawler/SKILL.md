---
name: job-jd-crawler
description: 按目标城市、月薪区间和目标岗位自动搜索并抓取完整招聘 JD，支持断点续跑、串行限速、风控停机、同站/跨站去重、相关性审核和 CSV/Excel 输出。Use when the user asks to 抓岗位、抓 JD、搜招聘职位、批量收集岗位描述、从断点继续招聘数据抓取，或只给出城市/薪资/岗位并希望自动完成招聘调研。兼容 Codex 与 Claude Code；优先使用宿主已有的安全浏览能力，否则使用或经授权安装 opencli。
---

# Job JD Crawler

将用户的三个核心输入转成一套可监督、可恢复、只读的招聘数据采集任务。

## 输入与默认值

必须得到：

- 目标城市：一个或多个。
- 目标月薪区间：统一为 K/月；年薪输入先除以 12。
- 目标岗位：一个或多个岗位关键词。

未指定时使用：目标 200 条、单次运行最长 3 小时、来源为 BOSS 直聘与 51job。若三个核心输入已经齐全，不要再确认，直接执行。目标数量、来源或时长有歧义时采用默认值并在进度更新中说明。

## 选择抓取能力

按以下顺序选择，详细判定见 [provider-routing.md](references/provider-routing.md)：

1. 宿主原生浏览能力能稳定读取搜索列表和完整详情、复用登录态、顺序执行并保存来源 URL 时，优先使用原生能力。
2. 否则运行 `node <skill-dir>/scripts/preflight.mjs` 检查 `opencli`。
3. 若缺少 `opencli`，先向用户申请安装授权，再运行 `npm install -g @jackwener/opencli`。禁止静默安装。
4. 安装后运行 `opencli doctor`。浏览器桥接或招聘网站登录需要用户交互时，明确提示一次，完成后继续。

不要混用两个提供器抓同一请求。切换提供器时先保存断点并记录原因。

## 安全约束

- 只允许搜索和读取详情。禁止投递、打招呼、聊天、交换联系方式、发送消息或修改账号数据。
- 所有网站请求全局串行；一个完成后随机等待 30–33 秒再发下一个。
- 遇到验证码、安全验证、登录失效、403、429 或明确风控提示，立即停止并保存断点；禁止绕过。
- 普通临时错误按 2/5/15 分钟退避；连续三次失败后停止。
- 不并行派发网站请求，也不让多个代理同时操作招聘网站。
- 全程监督运行进程；至少每分钟检查一次进度、间隔、错误与风控状态。不要只把进程留在后台就结束任务。

## 使用内置 opencli 流程

在用户选择的工作目录执行。先生成配置：

```bash
node <skill-dir>/scripts/configure-run.mjs \
  --cities "上海,杭州,苏州" \
  --salary-min 33 \
  --salary-max 60 \
  --roles "AI产品经理" \
  --output job-search.config.json
```

自动派生岗位扩展词和相关性证据词。若岗位属于小众领域或自动派生不准确，追加：

```bash
--evidence-terms "领域词1,领域词2,同义词"
```

离线检查请求计划：

```bash
node <skill-dir>/scripts/crawl-jobs.mjs --config job-search.config.json --target 200 --max-hours 3 --dry-run
```

开始抓取：

```bash
node <skill-dir>/scripts/crawl-jobs.mjs --config job-search.config.json --target 200 --max-hours 3
```

从最近断点开启新的运行窗口：

```bash
node <skill-dir>/scripts/crawl-jobs.mjs --config job-search.config.json --target 200 --max-hours 3 --resume --new-session
```

若沙箱使抓取器子进程无法连接本地浏览器桥接，在用户授权后于沙箱外运行同一命令；不要修改限速或风控规则来规避环境问题。

## 监督与完成

持续读取进程输出，汇报：当前唯一岗位数/目标数、最近新增或拒绝原因、请求间隔与安全状态。

抓取器达到目标后：

1. 检查 `crawl-state.json` 的 `spacingViolations` 为空。
2. 对所有已接受岗位再做成对去重；相同城市、同公司和标准化标题且 JD 相似度 ≥0.8 时合并。同公司同城市且完整 JD 完全一致的标题变体也合并。
3. 删除明确重复后继续续跑，直到去重后仍达到目标，或候选耗尽/触发安全停止。
4. 将只由搜索词或行业命中、但职位名与完整 JD 都缺少目标证据词的记录标为“邻近方向—人工复核”，不要伪装成核心岗位。
5. 保留来源 URL、备用来源 URL、抓取时间、拒绝原因和去重日志。

## 输出

通用输出始终包含 `jobs.jsonl`、`crawl-state.json` 和 UTF-8 BOM CSV：

```bash
node <skill-dir>/scripts/export-csv.mjs --state <output-dir>/crawl-state.json
```

字段口径见 [output-schema.md](references/output-schema.md)。

- Codex：若可用 Spreadsheets 技能，必须用它生成并视觉验证 `.xlsx`，至少包含“分类汇总、岗位总表、JD详情、运行说明”四页。
- Claude Code：若环境已有可靠的 Excel 库或宿主表格能力，生成同结构 `.xlsx`；否则交付 CSV + JSONL，不要临时安装不必要的表格依赖。
- 汇总必须列出：唯一岗位数、来源分布、城市分布、明确目标证据数、邻近方向待复核数、请求数、间隔违规数、停止原因。

## 原生浏览提供器

使用宿主原生能力时，仍要采用相同的配置、断点 schema、安全约束、去重规则和输出字段。每完成一个列表页或详情页立刻原子写入断点。原生能力无法稳定获取完整 JD 或无法保证 30 秒请求间隔时，切回 `opencli`。

## 触发示例

- “帮我抓上海、杭州 30–50K 的 AI 产品经理 JD。”
- “搜索北京的数据产品经理岗位，月薪 25–45K，目标 100 条。”
- “从断点继续抓具身智能产品经理。”
- “按深圳、广州 / 40–70K / 大模型算法工程师自动跑完并导出。”
