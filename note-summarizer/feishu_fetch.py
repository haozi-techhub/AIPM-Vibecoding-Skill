#!/usr/bin/env python3
"""
feishu_fetch.py — 通过飞书开放平台 API 拉取文档并转为 Markdown

用法:
    python3 feishu_fetch.py --url "https://xxx.feishu.cn/docx/TOKEN" \
                            --app-id cli_xxx --app-secret xxx \
                            --output /tmp/note.md

支持:
    - 新版文档（/docx/）
    - 旧版文档（/docs/）
    - 知识库页面（/wiki/）

依赖: requests（标准 pip 包）
"""

import argparse
import json
import re
import sys
import os

try:
    import requests
except ImportError:
    print("请先安装依赖: pip install requests --break-system-packages")
    sys.exit(1)


FEISHU_BASE = "https://open.feishu.cn/open-apis"
LARK_BASE = "https://open.larksuite.com/open-apis"


# ─── URL 解析 ────────────────────────────────────────────────────────────────

def parse_feishu_url(url: str) -> dict:
    """
    解析飞书/Lark URL，返回 {domain, type, token}
    支持格式:
      https://{tenant}.feishu.cn/{type}/{token}
      https://{tenant}.larksuite.com/{type}/{token}
    """
    pattern = re.compile(
        r'https?://(?P<tenant>[^/]+\.(?:feishu\.cn|larksuite\.com))'
        r'/(?P<type>docx|docs|wiki|sheets|base)'
        r'/(?P<token>[A-Za-z0-9_-]+)'
    )
    m = pattern.search(url)
    if not m:
        raise ValueError(f"无法识别的飞书 URL 格式: {url}\n"
                         f"支持格式: https://xxx.feishu.cn/docx/TOKEN")

    is_lark = "larksuite.com" in m.group("tenant")
    return {
        "tenant": m.group("tenant"),
        "type": m.group("type"),
        "token": m.group("token"),
        "base_api": LARK_BASE if is_lark else FEISHU_BASE,
    }


# ─── 认证 ────────────────────────────────────────────────────────────────────

def get_tenant_token(app_id: str, app_secret: str, base_api: str) -> str:
    """获取 tenant_access_token"""
    resp = requests.post(
        f"{base_api}/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret},
        timeout=10
    )
    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"获取 token 失败: {data.get('msg')} (code={data.get('code')})\n"
                           f"请检查 App ID 和 App Secret 是否正确。")
    return data["tenant_access_token"]


# ─── 文档块解析（新版 docx）──────────────────────────────────────────────────

BLOCK_TYPE_MAP = {
    1: "page",       # 文档
    2: "text",       # 文本
    3: "heading1",   # 标题1
    4: "heading2",   # 标题2
    5: "heading3",   # 标题3
    6: "heading4",
    7: "heading5",
    8: "heading6",
    9: "heading7",
    10: "heading8",
    11: "heading9",
    12: "bullet",    # 无序列表
    13: "ordered",   # 有序列表
    14: "code",      # 代码块
    15: "quote",     # 引用
    17: "todo",      # 待办
    18: "divider",   # 分割线
    19: "image",     # 图片
    22: "table",     # 表格
    24: "file",      # 文件
    27: "callout",   # 高亮块
}

def extract_text_runs(text_element: dict) -> str:
    """从 text_element 提取纯文本"""
    result = []
    for run in text_element.get("elements", []):
        if "text_run" in run:
            result.append(run["text_run"].get("content", ""))
        elif "equation" in run:
            result.append(f"${run['equation'].get('content', '')}$")
    return "".join(result)


def block_to_markdown(block: dict, depth: int = 0) -> str:
    """将飞书文档块转换为 Markdown"""
    btype = BLOCK_TYPE_MAP.get(block.get("block_type"), "unknown")
    indent = "  " * depth

    if btype == "page":
        title = extract_text_runs(block.get("page", {}).get("elements", [{}])[0]) if block.get("page") else ""
        return f"# {title}\n" if title else ""

    elif btype == "text":
        text = extract_text_runs(block.get("text", {}))
        return f"{indent}{text}\n" if text.strip() else "\n"

    elif btype.startswith("heading"):
        level = int(btype.replace("heading", ""))
        text = extract_text_runs(block.get(btype, {}))
        return f"{'#' * level} {text}\n"

    elif btype == "bullet":
        text = extract_text_runs(block.get("bullet", {}))
        return f"{indent}- {text}\n"

    elif btype == "ordered":
        text = extract_text_runs(block.get("ordered", {}))
        return f"{indent}1. {text}\n"

    elif btype == "todo":
        text = extract_text_runs(block.get("todo", {}))
        done = block.get("todo", {}).get("style", {}).get("done", False)
        checkbox = "[x]" if done else "[ ]"
        return f"{indent}- {checkbox} {text}\n"

    elif btype == "code":
        code_data = block.get("code", {})
        lang = code_data.get("style", {}).get("language", "").lower()
        text = extract_text_runs(code_data)
        return f"```{lang}\n{text}\n```\n"

    elif btype == "quote":
        text = extract_text_runs(block.get("quote", {}))
        return f"> {text}\n"

    elif btype == "divider":
        return "---\n"

    elif btype == "image":
        img = block.get("image", {})
        token = img.get("token", "")
        alt = img.get("alt_text", "图片")
        # 图片需要鉴权访问，生成带 token 的说明
        return f"![{alt}](feishu-image://{token})\n"

    elif btype == "callout":
        text = extract_text_runs(block.get("callout", {}))
        emoji = block.get("callout", {}).get("emoji_id", "💡")
        return f"> {emoji} {text}\n"

    else:
        # 未知类型，尝试提取文本
        for key in ["text", "content", "elements"]:
            if key in block:
                try:
                    text = extract_text_runs(block[key] if isinstance(block[key], dict) else {"elements": block[key]})
                    if text.strip():
                        return f"{text}\n"
                except Exception:
                    pass
        return ""


# ─── 文档获取（新版 docx）────────────────────────────────────────────────────

def fetch_docx(token: str, access_token: str, base_api: str) -> str:
    """获取新版飞书文档内容，转为 Markdown"""
    headers = {"Authorization": f"Bearer {access_token}"}

    # 获取所有块（分页）
    all_blocks = []
    page_token = None
    while True:
        params = {"page_size": 500}
        if page_token:
            params["page_token"] = page_token

        resp = requests.get(
            f"{base_api}/docx/v1/documents/{token}/blocks",
            headers=headers,
            params=params,
            timeout=15
        )
        data = resp.json()

        if data.get("code") != 0:
            raise RuntimeError(f"获取文档块失败: {data.get('msg')} (code={data.get('code')})\n"
                               f"请确认应用已获得文档读取权限，且文档已对应用开放共享。")

        all_blocks.extend(data.get("data", {}).get("items", []))
        has_more = data.get("data", {}).get("has_more", False)
        page_token = data.get("data", {}).get("page_token")
        if not has_more:
            break

    # 转换为 Markdown
    lines = []
    for block in all_blocks:
        md = block_to_markdown(block)
        if md:
            lines.append(md)

    return "\n".join(lines)


# ─── 知识库 wiki 处理 ─────────────────────────────────────────────────────────

def resolve_wiki_token(wiki_token: str, access_token: str, base_api: str) -> tuple[str, str]:
    """将 wiki token 解析为实际文档 token 和类型"""
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(
        f"{base_api}/wiki/v2/spaces/get_node",
        headers=headers,
        params={"token": wiki_token},
        timeout=10
    )
    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"获取 wiki 节点失败: {data.get('msg')}\n"
                           f"请确认 wiki 权限已开启。")

    node = data["data"]["node"]
    return node["obj_token"], node["obj_type"]  # obj_type: "docx" 或 "doc"


# ─── 主函数 ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="飞书文档转 Markdown")
    parser.add_argument("--url", required=True, help="飞书文档 URL")
    parser.add_argument("--app-id", required=True, help="飞书应用 App ID")
    parser.add_argument("--app-secret", required=True, help="飞书应用 App Secret")
    parser.add_argument("--output", default=None, help="输出 Markdown 文件路径（默认打印到 stdout）")
    args = parser.parse_args()

    print(f"[feishu_fetch] 解析 URL: {args.url}", file=sys.stderr)

    # 解析 URL
    info = parse_feishu_url(args.url)
    doc_type = info["type"]
    token = info["token"]
    base_api = info["base_api"]

    print(f"[feishu_fetch] 文档类型: {doc_type}, Token: {token}", file=sys.stderr)

    # 获取访问令牌
    print("[feishu_fetch] 正在获取 access token...", file=sys.stderr)
    access_token = get_tenant_token(args.app_id, args.app_secret, base_api)

    # Wiki 需要先解析 obj_token
    if doc_type == "wiki":
        print("[feishu_fetch] Wiki 文档，正在解析实际 token...", file=sys.stderr)
        token, doc_type = resolve_wiki_token(token, access_token, base_api)
        print(f"[feishu_fetch] 实际文档类型: {doc_type}, Token: {token}", file=sys.stderr)

    # 获取文档内容
    print("[feishu_fetch] 正在获取文档内容...", file=sys.stderr)
    if doc_type == "docx":
        markdown = fetch_docx(token, access_token, base_api)
    else:
        raise NotImplementedError(f"暂不支持文档类型: {doc_type}（仅支持 docx 和 wiki）\n"
                                  f"建议使用 feishu-docx 工具: pip install feishu-docx")

    # 输出
    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(markdown)
        print(f"[feishu_fetch] ✅ 已导出到: {args.output}", file=sys.stderr)
        print(f"[feishu_fetch] 文档长度: {len(markdown)} 字符", file=sys.stderr)
    else:
        print(markdown)


if __name__ == "__main__":
    main()
