#!/bin/sh
# The regions the skin is held to picture 9 by, measured on a lossless whole still (see.sh writes one):
#   sh scripts/world/parts/skin/regions.sh <name>
O=shots/world/skin
node scripts/world/parts/skin/topic.mjs $O/$1-whole.png 1 $O/$1-topic.png >/dev/null
node scripts/world/parts/skin/measure.mjs $O/$1-topic.png 1150,320,100,30 1100,300,60,120 1125,395,20,40 1120,450,40,40 1150,395,25,30 1225,375,15,15 1080,560,25,25 130,330,80,120 150,520,60,60 290,325,20,15 282,365,12,30 215,455,40,30
node scripts/world/parts/skin/pixel.mjs $O/$1-topic.png 1150,320,100,30 1100,300,60,120 130,330,80,120 290,325,20,15
