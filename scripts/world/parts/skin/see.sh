#!/bin/sh
# The skin's looks for a round, all in the whole world as the page draws it: the whole world at the page's size (kept
# lossless for measuring), the overlay on picture 9 for each side, and each side at three times the page's size.
#   sh scripts/world/parts/skin/see.sh <name> ["a=1&b=2"]
set -e
R=$1; Q=${2:-}
O=shots/world/skin
node scripts/world/look.mjs whole --scale 1 --png --q "$Q" --out $O/$R-whole.png | grep -E "ERROR|stats" | cut -c1-200 || true
node scripts/world/match.mjs --still $O/$R-whole.png --at 990,250,300,460 --out $O/$R-match-right >/dev/null
node scripts/world/match.mjs --still $O/$R-whole.png --at 90,250,300,460 --out $O/$R-match-left >/dev/null
for s in right left; do node scripts/world/look.mjs whole --scale 1 --q "close=$s${Q:+&$Q}" --out $O/$R-close-$s.jpg | grep -E "ERROR" || true; done
