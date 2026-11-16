#!/bin/sh
# The skin's looks for a round: the whole world at three times the page's size (lifted clear of the rock's own plain
# surface while that is still drawn), and from it each side close and closer, each beside picture 9.
#   sh scripts/world/parts/skin/see.sh <round> [more for the address]
set -e
R=$1; Q=${2:-}
O=shots/world/skin
node scripts/world/look.mjs whole --scale 3 --q "skinlift=1$Q" --out $O/$R-whole3.jpg | grep -E "ERROR|look:" || true
C="node scripts/world/parts/skin/crop.mjs $O/$R-whole3.jpg 3"
$C 980,270,320,440 --by 3 --out $O/$R-right.jpg
$C 80,290,240,440 --by 3 --out $O/$R-left.jpg
$C 1030,340,170,150 --by 5 --out $O/$R-right-zoom.jpg
$C 1040,520,150,160 --by 5 --out $O/$R-right-low.jpg
$C 170,430,110,90 --by 6 --out $O/$R-left-zoom.jpg
$C 230,300,80,140 --by 6 --out $O/$R-left-edge.jpg
