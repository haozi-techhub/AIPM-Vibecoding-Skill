# AntV Chart Visualization Skills

> AntV 数据可视化技能合集，用于让 Claude Code、Codex 等 Agent 根据实际任务自动选择对应的可视化能力。

## 合集与子 Skill 的关系

`AntV Chart Visualization Skills` 是合集名称，不是一个可单独调用的总 Skill。Agent 会读取各子 Skill 的 `description`，根据用户任务自动路由。

| 子 Skill | 适用任务 | 主要产物 |
|---|---|---|
| `chart-visualization` | 快速生成柱状图、折线图、饼图、桑基图、流程图等 | AntV API 返回的图表图片 |
| `antv-g2-chart` | Dashboard、经营分析和统计图表开发 | AntV G2 v5 JavaScript 代码 |
| `antv-g6-graph` | 知识图谱、组织架构、网络拓扑和关系网络 | AntV G6 v5 代码 |
| `antv-x6-editor` | 流程设计器、DAG、ER 图和数据血缘编辑器 | AntV X6 3.x 代码 |
| `antv-s2-expert` | 交叉表、透视表和多维分析表格 | AntV S2 / React / Vue 代码 |
| `infographic-creator` | 路线图、时间线、SWOT、四象限和信息图 | AntV Infographic HTML / SVG |
| `narrative-text-visualization` | 带指标、趋势和涨跌标注的数据解读报告 | T8 文本及前端代码 |
| `icon-retrieval` | 为网页、图表和信息图检索图标 | SVG 地址和源码 |

## 自动路由参考

- 直接要图表图片 → `chart-visualization`
- 要可嵌入产品的统计图表代码 → `antv-g2-chart`
- 要展示复杂节点关系 → `antv-g6-graph`
- 要拖拽、连线和编辑流程 → `antv-x6-editor`
- 要透视表或多维交叉分析 → `antv-s2-expert`
- 要一屏讲清楚步骤、路线或对比 → `infographic-creator`
- 要长篇数据解读 → `narrative-text-visualization`
- 要 SVG 图标 → `icon-retrieval`

## 安装

### 从本仓库安装到 Codex

```bash
cp -R antv-chart-visualization-skills/skills/* ~/.codex/skills/
```

### 从本仓库安装到 Claude Code

```bash
cp -R antv-chart-visualization-skills/skills/* ~/.claude/skills/
```

也可以直接从上游安装：

```bash
npx skills add antvis/chart-visualization-skills
```

安装后重新打开会话，使 Agent 重新扫描 Skill。

## 依赖与限制

- `chart-visualization` 和 `icon-retrieval` 依赖外部 HTTP API。
- Infographic 生成的 HTML 默认加载 AntV CDN。
- G2、G6、X6、S2 和 T8 代码落地时，需要安装对应的 AntV npm 包并进行运行验证。
- T8 要求使用真实、可追溯的数据，不能虚构分析数据。

## 上游来源

- 仓库：<https://github.com/antvis/chart-visualization-skills>
- 同步提交：`62ea33c5bbade187e182ebdefa961373322a4a67`
- 同步日期：2026-07-24
- License：MIT，见本目录下的 [`LICENSE`](./LICENSE)
