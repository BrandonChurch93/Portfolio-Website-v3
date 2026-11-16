#!/bin/sh
# The skin's crops for a round, each beside picture 9, from the lossless whole still see.sh writes: the pale tear, the
# knot, the dark side's slab, the large crater; and the knot at three times from the close still.
#   sh scripts/world/parts/skin/crops.sh <name>
O=shots/world/skin; R=$1; C=scripts/world/parts/skin/crop.mjs
node $C $O/$R-whole.png 1 1020,280,140,220 --by 4 --out $O/$R-z-tear.jpg
node $C $O/$R-whole.png 1 180,430,110,90 --by 6 --out $O/$R-z-knot.jpg
node $C $O/$R-whole.png 1 230,290,180,190 --by 4 --out $O/$R-z-slab.jpg
node $C $O/$R-whole.png 1 1100,340,150,160 --by 4 --out $O/$R-z-crater.jpg
node $C $O/$R-whole.png 1 1060,440,200,200 --by 3 --out $O/$R-z-palelow.jpg
node scripts/world/parts/skin/cut.mjs $O/$R-close-left.jpg 560,520,420,300 $O/$R-z-knot3.png 2.5
