# 飞书发布配置

面试复盘文档通过 lark-cli 发布到用户的个人知识库。

---

## lark-cli 配置

- appId: `cli_a9435e5237791bd7`
- 用户身份: `ou_5da0d913f87478995aed2900a576b9f4`
- 始终使用 `--as user` 确保文档归属用户

## 发布目标

- 目标空间：`my_library`（用户个人知识库）
- 文档标题格式：`面试复盘 - {公司名} - {YYYY-MM-DD}`

## 发布流程

### Step 1：创建文档（首段内容）

```bash
lark-cli docs +create \
  --title "面试复盘 - {公司名} - {YYYY-MM-DD}" \
  --wiki-space my_library \
  --markdown "{第一段内容：复盘概览+JD}" \
  --as user
```

返回值中提取 `doc_id` 用于后续追加。

### Step 2：分段追加

```bash
lark-cli docs +update \
  --doc "{doc_id}" \
  --mode append \
  --markdown "{后续段落内容}" \
  --as user
```

重复执行直到所有段落追加完毕。

### Step 3：验证

```bash
lark-cli docs +fetch --doc "{doc_id}" --as user
```

检查内容完整性和格式渲染。

## 话术库更新（另一份常驻文档）

复盘文档之外，Phase 8 Step 8.3 还要更新跨面试常驻的「我的面试话术库」。它和复盘文档的发布方式不同：

- 复盘文档：每场**新建** + `append` 分段。
- 话术库：**同一份**文档持续累积，用"读全库 → 内存合并 → `--mode overwrite` 整体写回"，这样才能把同一道题的多家原话合并到一个条目下；纯新增条目也可 `append`。
- 库的定位（doc_token）、结构、归一化与去重规范，全部见 [`talk-track-bank.md`](talk-track-bank.md)。
- 覆盖写回前务必先完整 `fetch` 旧库，确保合并后条目只增不减。

## Lark Markdown 限制

在编写内容时必须遵守以下限制，否则API会报错：

### callout 内支持的元素

- 文本（段落、加粗、斜体、链接）
- 列表（有序、无序）
- 代码块

### callout 内不支持的元素（会导致API报错）

- 表格 → 移到callout外面
- 分割线（---）→ 删除或移到callout外面
- 标题（#/##/###）→ 移到callout外面
- 嵌套callout → 不支持

### 其他注意事项

- `---` 不能出现在markdown内容的最开头（会被CLI解析为flag）
- 代码块用 ` ```plaintext {wrap} ``` ` 格式可以自动换行
- 表格列对齐用 `|---|` 即可，不需要精确对齐

## 错误处理

| 错误 | 处理方式 |
|------|---------|
| 认证过期 | 运行 `lark-cli auth login --scope "wiki:node:read docx:document:write"` |
| callout内不支持的元素 | 将表格/分割线移到callout外面后重试 |
| 内容过长导致超时 | 拆分为更小的段落分别追加 |
| lark-cli完全不可用 | 降级：保存为本地文件 `/Users/haozi/Documents/面试备战/interview recording/面试复盘_{公司}_{日期}.md` |

## 已有文档参考

- 复盘模版（格式参考）：wiki token `N5XOw61BkiMrgTkCGnPcb6n8ngf`
- 面试QA Personal：wiki token `T9zHwqexkiXZvPkQJ8kcA5OwnIf`
- 面试复盘父节点：wiki token `PZ3fwJbbDiCLMlklwzKcGSP4n5e`
- 详细复盘参考：wiki token `PeAud6kDPocuEXxG9ozcnBoonef`
