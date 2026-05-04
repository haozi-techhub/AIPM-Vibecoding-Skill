#!/usr/bin/env python3
"""
scan_notes.py — 扫描笔记目录，统计文件和图片信息

用法:
    python3 scan_notes.py <directory> [--extensions md,txt,pdf,html]

输出 JSON:
    {
      "directory": "/path/to/notes",
      "total_files": 12,
      "files": [
        {"path": "...", "size_kb": 12.3, "extension": "md", "image_count": 3},
        ...
      ]
    }
"""

import os
import re
import sys
import json
import argparse


SUPPORTED_EXTENSIONS = {"md", "markdown", "txt", "pdf", "html", "htm"}

IMAGE_PATTERN = re.compile(
    r'!\[.*?\]\(.*?\)'           # ![alt](url)
    r'|!\[\[.*?\]\]'             # ![[obsidian]]
    r'|<img\s[^>]*src=["\'][^"\']+["\']',  # <img src="...">
    re.IGNORECASE
)


def count_images_in_text_file(filepath: str) -> int:
    """快速统计文本类笔记中的图片引用数"""
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return len(IMAGE_PATTERN.findall(content))
    except Exception:
        return 0


def scan_directory(directory: str, extensions: set[str]) -> dict:
    if not os.path.isdir(directory):
        return {"error": f"目录不存在: {directory}"}

    files = []
    for root, dirs, filenames in os.walk(directory):
        # 跳过隐藏目录
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for filename in sorted(filenames):
            ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            if ext not in extensions:
                continue
            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, directory)
            size_kb = round(os.path.getsize(filepath) / 1024, 1)

            img_count = 0
            if ext in {"md", "markdown", "txt", "html", "htm"}:
                img_count = count_images_in_text_file(filepath)

            files.append({
                "path": filepath,
                "relative_path": rel_path,
                "extension": ext,
                "size_kb": size_kb,
                "image_count": img_count
            })

    total_images = sum(f["image_count"] for f in files)

    return {
        "directory": os.path.abspath(directory),
        "total_files": len(files),
        "total_images": total_images,
        "extensions_found": list({f["extension"] for f in files}),
        "files": files
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="扫描笔记目录")
    parser.add_argument("directory", help="笔记目录路径")
    parser.add_argument(
        "--extensions",
        default=",".join(SUPPORTED_EXTENSIONS),
        help=f"要扫描的文件扩展名，逗号分隔（默认: {','.join(SUPPORTED_EXTENSIONS)}）"
    )
    args = parser.parse_args()

    exts = {e.strip().lstrip('.').lower() for e in args.extensions.split(',')}
    result = scan_directory(args.directory, exts)
    print(json.dumps(result, ensure_ascii=False, indent=2))
