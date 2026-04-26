#!/bin/bash
# Compile each top-level sample and capture exit code + output
set +e
cd /home/bryan-maclee/scrmlMaster/scrmlTS

OUTDIR=docs/audits/.scope-c-audit-data
mkdir -p "$OUTDIR/logs"
RESULTS="$OUTDIR/results.tsv"

# Header: file<TAB>exit<TAB>warn_codes(comma)<TAB>err_codes(comma)<TAB>first_err_line
printf "file\texit\twarn_codes\terr_codes\tfirst_err_line\n" > "$RESULTS"

count=0
for f in samples/compilation-tests/*.scrml; do
  base=$(basename "$f")
  log="$OUTDIR/logs/$base.log"
  timeout 30 bun run compiler/src/cli.js compile "$f" > "$log" 2>&1
  ec=$?
  count=$((count+1))
  if [ $ec -eq 124 ]; then
    printf "%s\t124\t\t\tTIMEOUT\n" "$base" >> "$RESULTS"
    continue
  fi
  warn_codes=$(grep -oE 'W-[A-Z0-9]+-[0-9]+' "$log" | sort -u | paste -sd, -)
  err_codes=$(grep -oE 'E-[A-Z0-9]+-[0-9]+' "$log" | sort -u | paste -sd, -)
  first_err=$(grep -m1 -E '^(error|Error)' "$log" | head -c 200 | tr '\t' ' ')
  printf "%s\t%s\t%s\t%s\t%s\n" "$base" "$ec" "$warn_codes" "$err_codes" "$first_err" >> "$RESULTS"
done

echo "DONE - processed $count files"
wc -l "$RESULTS"
