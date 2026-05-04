---
name: note-summarizer
description: |
  专业笔记专家工具。当用户说"总结笔记"、"整理笔记"、"帮我看这个飞书文档"、"处理我的笔记"、"优化笔记"、"做成网页"、"生成PPT风格页面"时必须触发。
  支持输入：本地文件（md/txt/pdf/html）、目录路径、飞书文档链接（feishu.cn/docx、/wiki）。
  核心能力：图片内容识别融入正文；自动识别笔记类型（学习/会议/技术/读书）；错误内容用高亮块标注修正建议；从权威来源补充约100字扩展知识并附链接；输出形式由用户指定——飞书文档（归入统一文件夹，同名覆盖，返回链接）或高级设计风格HTML网页。
---

# 📝 Note Summarizer — 专业笔记专家 Skill

扮演专业笔记专家角色：读懂笔记 → 识别图片 → 纠错标注 → 补充知识 → 按用户指定形式输出。

---

## 工作流程总览

```
输入（文件 / 飞书链接）
  ↓
Step 1：读取内容
  ↓
Step 2：识别图片（若有）
  ↓
Step 3：自动判断笔记类型
  ↓
Step 4：内容分析（总结 + 纠错 + 知识补充）
  ↓
Step 5：按用户指定输出
         ├── 飞书文档 → 返回链接
         └── HTML网页 → 高级设计风格
```

---

## Step 1：读取内容

### 输入类型判断

**飞书链接**（URL 含 feishu.cn 或 larksuite.com）：
```bash
lark document get --url "https://xxx.feishu.cn/docx/TOKEN"
```
若 CLI 命令失败，回退到 scripts/feishu_fetch.py（见 references/feishu-integration.md）。

**本地文件**：
```bash
# Markdown / TXT
cat /path/to/note.md

# PDF → 参考 /mnt/skills/public/pdf-reading/SKILL.md

# HTML（提取纯文本）
python3 -c "
from html.parser import HTMLParser
class S(HTMLParser):
    def __init__(self): super().__init__(); self.r=[]
    def handle_data(self, d): self.r.append(d)
import sys; p=S(); p.feed(open(sys.argv[1]).read()); print(''.join(p.r))
" /path/to/note.html
```

**目录**：
```bash
find /path/to/notes -type f \( -name "*.md" -o -name "*.txt" -o -name "*.pdf" \) | sort
```
对每个文件依次执行完整流程。

---

## Step 2：识别图片

```bash
python3 scripts/extract_images.py /path/to/note.md
```

对每张图片用 Claude 原生视觉能力分析（见 references/image-analysis-tips.md），提取文字/场景/图表/手写内容，以 [图片：{分析摘要}] 融入对应正文段落。

---

## Step 3：自动判断笔记类型

| 类型 | 判断特征 | 分析重点 |
|------|---------|---------|
| 学习笔记 | 概念定义、公式、例题、课程名 | 概念提炼、公式保留、重点标注内容 |
| 会议/讲座笔记 | 日期、参与者、Action Item、决策 | 决策事项、待办、关键结论 |
| 技术笔记 | 代码块、命令行、报错、框架名 | 代码功能说明、踩坑记录、配置要点 |
| 读书笔记 | 书名、作者、章节、批注 | 核心论点、用户批注、行动启示 |
| 通用笔记 | 不符合以上特征 | 核心主题、要点列表 |

---

## Step 4：内容分析与增强

### 4a. 结构化总结

按笔记类型使用对应模板（见 templates/summary-template.md）生成主体内容。
原则：忠实原文 / 图文融合 / 总结约为原文 20-30%

### 4b. 纠错标注

通读全文，识别事实错误、逻辑矛盾、明显笔误。每处问题紧跟在问题段落之后，高亮块格式：

```
💡 原文如此
建议修正：{正确内容}
原因：{一句话说明}
```

不修改原文。无错误则跳过。

### 4c. 知识补充（扩展区块）

1. 提取笔记核心概念词（3-5个）
2. web_search 搜索，优先来源：官方文档 > 维基百科 > 知名技术社区 > 粉丝1500+博主
3. 多来源矛盾时取最权威的一个

格式（文档末尾）：
```
## 📚 扩展阅读

### {概念名}
{约100字简明介绍}

来源：[{来源名称}]({URL})

---
```

---

## Step 5：输出

用户未指定时默认输出飞书文档。用户说"做成网页"、"HTML"、"PPT风格"时输出 HTML。

---

### 输出 A：飞书文档

```bash
# 首次运行：创建统一文件夹
lark folder create --name "笔记总结"

# 检查同名文档，存在则先删除
DOC_ID=$(lark document list --folder "笔记总结" | grep "{文档标题}" | awk '{print $1}')
[ -n "$DOC_ID" ] && lark document delete --id $DOC_ID

# 创建文档
lark document create \
  --title "{文档标题}" \
  --folder "笔记总结" \
  --content-file /tmp/note_output.md

# 获取链接
lark document url --title "{文档标题}" --folder "笔记总结"
```

CLI 报错时先运行 lark --help，再参考 references/feishu-integration.md。

最终报告：
```
✅ 飞书文档已生成
📄 文档名：{标题}
📁 所在文件夹：笔记总结
🔗 链接：{飞书文档URL}
- 识别图片：{N} 张
- 纠错标注：{N} 处
- 扩展知识：{N} 个条目
```

---

### 输出 B：HTML 网页（高级设计风格）

#### 设计前置：从专业设计网站寻找灵感

在生成 HTML 前，**必须先执行设计调研**：

```
web_search: site:behance.net presentation design 2024 award
web_search: awwwards best ui design dark editorial
web_search: dribbble most popular slides deck design
```

从搜索结果中提取当前顶尖设计的视觉语言要素：配色系统、排版逻辑、版面结构、动效风格。
将这些要素作为本次 HTML 的设计基础，不使用通用 AI 默认审美。

#### 设计方向提取规则

根据笔记类型匹配设计基调，但以从网上找到的灵感为准进行创意发挥：

| 笔记类型 | 建议基调 |
|---------|---------|
| 学习笔记 | 教育感 + 清晰层次，知识点视觉化 |
| 会议笔记 | 商务高端，数据图表，简洁有力 |
| 技术笔记 | 暗色系，代码美化，极客风 |
| 读书笔记 | 编辑排版感，书页质感，文字艺术 |
| 通用笔记 | 自由发挥，视觉冲击优先 |

#### HTML 生成规范

参考 /mnt/skills/public/frontend-design/SKILL.md 执行，核心要求：

**视觉要求（必须全部达到）：**
- 色彩：拒绝紫色渐变白底等 AI 俗气配色；使用高级色彩系统（主色 + 强调色 + 中性色），颜色有张力
- 字体：从 Google Fonts 引入有个性的字体组合（展示字体 + 正文字体），禁用 Inter/Roboto/Arial
- 布局：非对称、网格错位、留白与密度对比；禁用千篇一律的居中卡片布局
- 动效：页面加载时元素错落入场（staggered animation）；滚动视差；hover 有惊喜反馈
- 背景：有深度的背景（噪点纹理 / 渐变网格 / 几何图形叠加），不使用纯色背景
- 细节：自定义滚动条、精致分割线、装饰性元素

**内容结构（按笔记内容灵活组合）：**
```
Hero 区：标题 + 核心主题 + 视觉冲击
内容区：各章节内容，每节有独特版式
纠错区：若有纠错，用醒目高亮样式展示
扩展阅读区：卡片式布局，附来源链接
```

**技术规范：**
- 单文件 HTML（CSS + JS 内嵌）
- 可从 cdnjs.cloudflare.com 引入外部库（如 GSAP、AOS、Prism.js）
- 响应式，但以桌面端展示效果为主
- 代码块用 Prism.js 美化

生成后保存至 /mnt/user-data/outputs/{文档标题}.html 并 present_files 输出。

---

## 参考资源

- 图片分析策略 → references/image-analysis-tips.md
- 飞书 API 备用方案 → references/feishu-integration.md
- PDF 处理 → /mnt/skills/public/pdf-reading/SKILL.md
- 各类型输出模板 → templates/summary-template.md
- HTML 设计规范 → /mnt/skills/public/frontend-design/SKILL.md
