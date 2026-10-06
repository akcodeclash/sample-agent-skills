#!/usr/bin/env python3
"""
PostToolUse hook: warn when a SKILL.md under skills/ or mcp-servers/ is written or
edited without a ## Security section.

External-content keywords trigger the check. If none are present, the hook passes
silently — not every skill needs a Security section.
"""

import json
import sys

# Network actions and external sources only. Generic nouns ("api", "document")
# matched most skills whether or not they retrieved anything.
EXTERNAL_CONTENT_KEYWORDS = [
    "webfetch", "scrape", "crawl", "graph.microsoft.com", "exa.ai", "bing.com",
    "serpapi", "sharepoint", "onedrive",
]

def main():
    data = json.load(sys.stdin)
    tool_input = data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    # Only check SKILL.md files inside skills/ or mcp-servers/
    in_scope = (
        ("skills/" in file_path or "mcp-servers/" in file_path)
        and file_path.endswith("SKILL.md")
    )
    if not in_scope:
        sys.exit(0)

    try:
        with open(file_path) as f:
            content = f.read().lower()
    except FileNotFoundError:
        sys.exit(0)

    # Only warn if the skill mentions external content sources
    mentions_external = any(kw in content for kw in EXTERNAL_CONTENT_KEYWORDS)
    has_security_section = "## security" in content

    if mentions_external and not has_security_section:
        # Exit code 2 feeds stderr back to Claude; stdout is ignored.
        print(f"Security check: {file_path} references external content but has no ## Security section.", file=sys.stderr)
        print("Add one per docs/security/content-handling.md before proceeding.", file=sys.stderr)
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
