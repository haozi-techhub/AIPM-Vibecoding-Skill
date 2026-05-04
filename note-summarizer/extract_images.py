#!/usr/bin/env python3
"""
extract_images.py — 从 Markdown 文件中提取所有图片引用

用法:
    python3 extract_images.py <note_file.md>

输出 JSON 格式:
    [
      {"type": "path", "value": "./images/screenshot.png", "alt": "截图"},
      {"type": "url",  "value": "https://...", "alt": "示意图"},
      {"type": "base64", "value": "data:image/png;base64,...", "alt": ""}
    ]
"""

import re
import sys
import json
import os

def extract_images_from_markdown(filepath: str) -> list[dict]:
    """从 Markdown 文件提取所有图片引用"""
    if not os.path.exists(filepath):
        print(json.dumps({"error": f"文件不存在: {filepath}"}))
        sys.exit(1)

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    base_dir = os.path.dirname(os.path.abspath(filepath))
    results = []
    seen = set()

    # 标准 Markdown 图片语法: ![alt](url)
    md_pattern = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
    for match in md_pattern.finditer(content):
        alt, src = match.group(1), match.group(2).strip()
        if src in seen:
            continue
        seen.add(src)

        if src.startswith("data:image"):
            results.append({"type": "base64", "value": src, "alt": alt})
        elif src.startswith("http://") or src.startswith("https://"):
            results.append({"type": "url", "value": src, "alt": alt})
        else:
            # 相对路径，转为绝对路径
            abs_path = os.path.normpath(os.path.join(base_dir, src))
            results.append({"type": "path", "value": abs_path, "alt": alt, "exists": os.path.exists(abs_path)})

    # HTML img 标签（有时出现在 Markdown 中）
    html_pattern = re.compile(r'<img\s[^>]*src=["\']([^"\']+)["\'][^>]*(?:alt=["\']([^"\']*)["\'])?[^>]*>', re.IGNORECASE)
    for match in html_pattern.finditer(content):
        src = match.group(1).strip()
        alt = match.group(2) or ""
        if src in seen:
            continue
        seen.add(src)

        if src.startswith("data:image"):
            results.append({"type": "base64", "value": src, "alt": alt})
        elif src.startswith("http://") or src.startswith("https://"):
            results.append({"type": "url", "value": src, "alt": alt})
        else:
            abs_path = os.path.normpath(os.path.join(base_dir, src))
            results.append({"type": "path", "value": abs_path, "alt": alt, "exists": os.path.exists(abs_path)})

    # Obsidian 嵌入语法: ![[image.png]]
    obsidian_pattern = re.compile(r'!\[\[([^\]]+)\]\]')
    for match in obsidian_pattern.finditer(content):
        src = match.group(1).strip()
        if src in seen:
            continue
        seen.add(src)
        # Obsidian 图片通常在同目录或附件目录
        for candidate in [
            os.path.join(base_dir, src),
            os.path.join(base_dir, "attachments", src),
            os.path.join(base_dir, "assets", src),
            os.path.join(base_dir, "images", src),
        ]:
            if os.path.exists(candidate):
                results.append({"type": "path", "value": candidate, "alt": src, "exists": True})
                break
        else:
            results.append({"type": "path", "value": os.path.join(base_dir, src), "alt": src, "exists": False})

    return results


def summarize_stats(images: list[dict]) -> dict:
    stats = {"total": len(images), "by_type": {}}
    for img in images:
        t = img["type"]
        stats["by_type"][t] = stats["by_type"].get(t, 0) + 1
    return stats


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 extract_images.py <note_file.md>")
        sys.exit(1)

    filepath = sys.argv[1]
    images = extract_images_from_markdown(filepath)
    output = {
        "file": filepath,
        "stats": summarize_stats(images),
        "images": images
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
