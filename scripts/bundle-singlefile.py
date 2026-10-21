#!/usr/bin/env python3
"""
Buduje samowystarczalny plik produkcyjny dist/Index.html zgodnie ze standardem
Single-File Mandate studia AM76 (zero zewnętrznych skryptów, stylów i assetów).
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODULES = [
    "src/themes.js",
    "src/chessData.js",
    "src/storage.js",
    "src/audio.js",
    "src/math.js",
    "src/pool.js",
    "src/input.js",
    "src/boardRenderer.js",
    "src/sprites.js",
    "src/uiRenderer.js",
    "src/game.js",
    "src/main.js",
]

def strip_esm_syntax(code: str) -> str:
    # Usuń instrukcje import ... from '...'; (jedno- i wieloliniowe)
    code = re.sub(r"import\s+[\s\S]*?from\s+['\"].*?['\"];?\n?", "", code)
    # Zamień export const/function/class na zwykłe deklaracje
    code = re.sub(r"\bexport\s+(const|let|var|function|class)\b", r"\1", code)
    return code

def build():
    chunks = []
    for rel_path in MODULES:
        full_path = os.path.join(ROOT, rel_path)
        with open(full_path, "r", encoding="utf-8") as f:
            raw = f.read()
        cleaned = strip_esm_syntax(raw).strip()
        chunks.append(f"  // === MODULE: {rel_path} ===\n  " + cleaned.replace("\n", "\n  "))

    bundled_js = "(() => {\n  'use strict';\n\n" + "\n\n".join(chunks) + "\n})();"

    with open(os.path.join(ROOT, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()

    single_html = html.replace(
        '<script type="module" src="/src/main.js"></script>',
        f"<script>\n{bundled_js}\n  </script>"
    )

    dist_dir = os.path.join(ROOT, "dist")
    os.makedirs(dist_dir, exist_ok=True)
    out_path = os.path.join(dist_dir, "Index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(single_html)

    print(f"[AM76 Single-File Builder] Wygenerowano: {out_path} ({len(single_html)} bajtów)")

if __name__ == "__main__":
    build()

