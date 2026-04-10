#!/usr/bin/env python3
"""
apply-r21-feature-patches-fixup.py
Fixes two missed patches from apply-r21-feature-patches.py.
Run AFTER apply-r21-feature-patches.py:
  python3 scripts/apply-r21-feature-patches.py
  python3 scripts/apply-r21-feature-patches-fixup.py

Patches fixed:
  R21-AM-002h-fix  §6.7.13 -> §6.7.14 reference in <poll> section (correct anchor)
  R21-AM-005-fix   E-TYPE-081, W-MATCH-003 added to §18.15 error table
"""

import sys
import os

SPEC_PATH = "compiler/SPEC.md"

if not os.path.exists(SPEC_PATH):
    print(f"Error: {SPEC_PATH} not found. Run from project root.")
    sys.exit(1)

with open(SPEC_PATH, "r", encoding="utf-8") as f:
    content = f.read()

change_count = 0


def apply(label, old, new):
    global content, change_count
    if old not in content:
        print(f"  MISS  {label}: old text not found in SPEC.md")
        print(f"        Expected snippet: {repr(old[:120])}")
        return
    count = content.count(old)
    if count > 1:
        print(f"  WARN  {label}: old text appears {count} times — applying first occurrence only")
    content = content.replace(old, new, 1)
    change_count += 1
    print(f"  OK    {label}")


# R21-AM-002h-fix: The <poll> section cross-ref to §6.7.13 Alternatives
# The poll section has: "optional properties (see Alternatives, §6.7.13).\n\n#### Syntax"
# (not "If a future revision determines that <request>" which was the wrong anchor)
apply(
    "R21-AM-002h-fix §6.7.13 -> §6.7.14 in <poll> section",
    "optional properties (see Alternatives, §6.7.13).\n\n#### Syntax\n\n`<poll>`",
    "optional properties (see Alternatives, §6.7.14).\n\n#### Syntax\n\n`<poll>`",
)

# R21-AM-005-fix: Add E-TYPE-081 and W-MATCH-003 to §18.15 error table.
# The §18.15 table ends with W-MATCH-001, followed by a blank line and ### 18.16.
apply(
    "R21-AM-005-fix add E-TYPE-081 and W-MATCH-003 to §18.15 error table",
    "| W-MATCH-001 | Wildcard `_` arm is unreachable (all variants already covered) | Warning |\n\n### 18.16 Literal Match Arms",
    "| W-MATCH-001 | Wildcard `_` arm is unreachable (all variants already covered) | Warning |\n"
    "| E-TYPE-081 | `partial match` in rendering or lift context | Error |\n"
    "| W-MATCH-003 | `partial` applied when all variants are already explicitly covered | Warning |\n\n"
    "### 18.16 Literal Match Arms",
)

print(f"\n{'=' * 60}")
print(f"Applied {change_count} fixup patches to {SPEC_PATH}")

if change_count < 2:
    print(f"WARNING: Expected 2 fixup patches; got {change_count}.")
    print("         Some patches may have missed. Check MISS messages above.")
    print("         Note: if the main script already applied these, they may not be needed.")
else:
    print("All fixup patches applied.")

with open(SPEC_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n{SPEC_PATH} written.")
