# 飞书文档集成指南

本文档详细说明如何接入飞书文档，供 note-summarizer Skill 参考。

---

## 一、快速判断：我需要哪种方案？

```
我是个人用户，文档在个人网盘里
  → OAuth 模式（feishu-docx --auth-mode oauth）

我是企业用户，文档在企业知识库/共享文档里
  → Tenant 模式（企业自建应用）

我不想配置 API，只想粘贴文档内容
  → 让用户直接粘贴，作为纯文本处理
```

---

## 二、飞书 URL 结构解析

### 常见 URL 格式

```
https://{tenant}.feishu.cn/{type}/{token}?{params}

{tenant}  = 企业标识（如 company、bytedance 等，或直接是 www）
{type}    = 文档类型
{token}   = 文档唯一标识（document_token）
```

### 文档类型对应关系

| URL 中的 type | 说明 | API 类型 |
|--------------|------|----------|
| `docx` | 新版飞书文档（主流） | docx API |
| `docs` | 旧版飞书文档 | doc API |
| `wiki` | 知识库页面 | wiki API |
| `sheets` | 电子表格 | spreadsheet API |
| `base` | 多维表格（Bitable） | bitable API |

### Token 提取示例

```
URL: https://company.feishu.cn/docx/PqRsTuVwXy123456
Token: PqRsTuVwXy123456

URL: https://www.feishu.cn/wiki/AbCdEfGhIjKl?from=...
Token: AbCdEfGhIjKl（忽略 ? 后的参数）
```

---

## 三、feishu-docx 工具详解

GitHub: https://github.com/leemysw/feishu-docx  
PyPI: `pip install feishu-docx`

### 安装
```bash
pip install feishu-docx --break-system-packages
```

### Tenant 模式（企业内部应用）

适合：企业共享文档、知识库、团队空间

**前提：需在 [飞书开放平台](https://open.feishu.cn/app) 创建"企业自建应用"**

所需权限（在应用后台→权限管理中开启）：
- `docx:document:readonly` — 读取文档
- `wiki:wiki:readonly` — 读取知识库
- `drive:drive:readonly` — 读取云盘文件

```bash
# 配置（一次性）
feishu-docx config set --app-id cli_xxx --app-secret xxx

# 导出文档
feishu-docx export "https://xxx.feishu.cn/docx/TOKEN"

# 指定输出文件
feishu-docx export "https://xxx.feishu.cn/docx/TOKEN" --output /tmp/note.md

# 导出知识库页面
feishu-docx export "https://xxx.feishu.cn/wiki/TOKEN"
```

### OAuth 模式（个人授权）

适合：读取个人文档或无法为应用开权限的场景

```bash
# 配置 OAuth 模式
feishu-docx config set --app-id cli_xxx --app-secret xxx --auth-mode oauth

# 触发授权（会打开浏览器）
feishu-docx auth

# 导出（自动使用缓存的 user_access_token）
feishu-docx export "https://xxx.feishu.cn/docx/TOKEN"
```

### 导出结果格式

导出后得到一个 Markdown 文件，结构示例：
```markdown
# 文档标题

正文内容...

![图片描述](https://open.feishu.cn/open-apis/drive/v1/medias/xxx/download)

| 表头1 | 表头2 |
|-------|-------|
| 数据1 | 数据2 |
```

**注意：** 图片链接需要 access_token 才能访问，直接 fetch 会返回 401/403。

---

## 四、直接调用飞书 API

若不使用 feishu-docx，可直接调用飞书开放平台 API。

### Step 1：获取 tenant_access_token

```python
import requests

def get_tenant_token(app_id: str, app_secret: str) -> str:
    resp = requests.post(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret}
    )
    return resp.json()["tenant_access_token"]
```

### Step 2：获取文档内容（新版 docx）

```python
def get_docx_content(token: str, access_token: str) -> dict:
    # 获取文档基本信息
    doc_resp = requests.get(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{token}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    # 获取文档块内容
    blocks_resp = requests.get(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{token}/blocks",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"page_size": 500}
    )
    return {"doc": doc_resp.json(), "blocks": blocks_resp.json()}
```

### Step 3：wiki 节点文档

```python
def get_wiki_content(wiki_token: str, access_token: str) -> dict:
    # 先获取 wiki 节点信息（找到对应的 obj_token）
    node_resp = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"token": wiki_token}
    )
    node = node_resp.json()["data"]["node"]
    obj_token = node["obj_token"]
    obj_type = node["obj_type"]  # docx or doc
    return {"obj_token": obj_token, "obj_type": obj_type}
```

---

## 五、飞书图片的处理策略

飞书文档中的图片通常是私有 URL，格式如：
```
https://open.feishu.cn/open-apis/drive/v1/medias/{file_token}/download
```

### 处理方式（按优先级）

1. **使用 feishu-docx 下载图片**（最简单）：
   ```bash
   feishu-docx export "URL" --output /tmp/note/ --download-images
   ```
   图片会被下载到本地，Markdown 中引用本地路径。

2. **使用 access_token 直接下载**：
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        "https://open.feishu.cn/open-apis/drive/v1/medias/FILE_TOKEN/download" \
        -o /tmp/image.png
   ```

3. **无法访问时的降级**：
   - 从 alt 文字推断图片内容
   - 从上下文（前后文字）推断图片内容
   - 标注 `[飞书图片：{alt或"未知内容"}，无法直接访问]`

---

## 六、常见错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `99991663: tenant_access_token invalid` | App Secret 错误或 token 过期 | 检查凭证，重新获取 token |
| `230001: document not found` | Token 不存在或无权限 | 检查文档是否开启共享，或为应用添加成员权限 |
| `7: auth failed` | 应用未开通相应 API 权限 | 在开放平台→权限管理中申请权限 |
| `Wiki 404` | Wiki token 和 docx token 混淆 | 使用 wiki API 先获取 obj_token |
| 图片 403 | 图片 URL 需鉴权 | 携带 access_token 下载 |

---

## 七、飞书开放平台快速创建应用

1. 访问 https://open.feishu.cn/app
2. 点击「创建企业自建应用」
3. 填写应用名称（如 "Note Summarizer"）
4. 进入「权限管理」，开启：
   - 获取文档基本信息
   - 获取文档内容
   - 查看知识库（若需读取 wiki）
5. 进入「版本管理与发布」，发布应用
6. 记录 App ID 和 App Secret
