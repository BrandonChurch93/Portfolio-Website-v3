#!/bin/sh
# The skin's looks for a round, all in the whole world as the page draws it: the overlay on picture 9 for each side,
# a still at the page's size (kept lossless for measuring), and one at three times the page's size with each side,
# the knot and the crust cut from it beside picture 9.
#   sh scripts/world/parts/skin/see.sh <round> ["a=1&b=2"]
set -e
R=$1; Q=${2:-}
O=shots/world/skin
node scripts/world/look.mjs whole --scale 1 --png --q "$Q" --out $O/$R-whole.png | grep -E "ERROR|look:|stats" | cut -c1-260 || true
node scripts/world/match.mjs --still $O/$R-whole.png --at 990,250,300,460 --out $O/$R-match-right | grep -c match: >/dev/null
node scripts/world/match.mjs --still $O/$R-whole.png --at 90,250,300,460 --out $O/$R-match-left | grep -c match: >/dev/null
node scripts/world/look.mjs whole --scale 3 --q "$Q" --out $O/$R-whole3.jpg | grep -E "ERROR|look:" || true
C() { node scripts/world/parts/skin/crop.mjs $O/$R-whole3.jpg 3 "$@"; }
C 990,270,300,430 --by 3 --out $O/$R-right3.jpg
C 80,290,240,420 --by 3 --out $O/$R-left3.jpg
C 1100,330,150,150 --by 6 --out $O/$R-crater.jpg
C 1000,290,110,410 --by 3 --out $O/$R-crust-right.jpg
C 230,300,80,340 --by 3 --out $O/$R-crust-left.jpg
C 170,420,120,100 --by 6 --out $O/$R-knot.jpg
C 1080,520,180,180 --by 4 --out $O/$R-low.jpg
