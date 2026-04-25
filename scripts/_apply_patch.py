#!/usr/bin/env python3
"""Apply a search/replace patch to a file. Usage:
    _apply_patch.py FILE OLD_FILE NEW_FILE
where OLD_FILE contains the literal text block to match (must be unique
in FILE) and NEW_FILE contains the replacement. Both OLD_FILE/NEW_FILE
are read raw (no trailing newline trimming). Exits 0 on success, 1 if
match is missing or non-unique.
"""
import sys
from pathlib import Path

if len(sys.argv) != 4:
    print("usage: _apply_patch.py FILE OLD_FILE NEW_FILE", file=sys.stderr)
    sys.exit(2)

target, old_path, new_path = (Path(p) for p in sys.argv[1:])
text = target.read_text()
old = old_path.read_text()
new = new_path.read_text()

count = text.count(old)
if count == 0:
    print(f"ERROR: no match for OLD in {target}", file=sys.stderr)
    sys.exit(1)
if count > 1:
    print(f"ERROR: {count} matches for OLD in {target} (must be unique)", file=sys.stderr)
    sys.exit(1)

target.write_text(text.replace(old, new, 1))
print(f"OK: patched {target}")
