# Your part: the trees. Round 6

## What you own
scripts/world/parts/trees/, public/world/trees*.bin and trees*.png, src/pieces/world/parts/trees.ts, src/pieces/world/parts/trees/. Stills in shots/world/trees/ with the prefix r6-. Report: shots/world/trees/r6-report.md. Read first: briefs/trees-r5.md (which still holds), shots/world/trees/r5-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", all of it: the moon is lower and stronger, so every crown's own shadow is longer).

## Where it stands
Round 5 scored 6 and 5.5. Kept: the crown at three times (three to five lumps of leaf sprigs, a lit upper right, an umber foot, dark gaps and a dark heart, one light over the whole crown, no ring, disc or seam). The dark pool at the front row's feet. On palette. The cost (134,564 triangles, inside the budget). No shimmer at the page's size.

## The plan changed again: make them again first
384 trees. From the two reviews, by Fable in placed.ts:
- Between the pyramid's right foot and the spire the picture has one continuous front row of 12 to 14 crowns standing BEFORE the city's feet. Low buildings stood in front of where that row is: every one of them is moved back behind it, and the row is planted (35 crowns at 255 to 265 down).
- Right of the spire the canopy climbs the buildings' feet further.
- About one crown in nine is half as large again, so the belt is not a row of beads. Sizes run from about 8 to 28 now: your models must hold up across that range.
- Nothing stands on the pyramid's front apron.

## SEAT EVERY TREE ON THE REAL GROUND
The dunes are being made about 60 units tall this round by Brandon's word, and the row behind them is buried: "the dune crests stand up to 28 pixels over the crown tops", "lone tufts poking over the crests, which read as cut off". The plan seats a tree on its own older, lower ground (ground() in layout.ts). The land that is DRAWN is the land builder's: src/pieces/world/parts/land/field.ts holds its height (it imports nothing, so you can read it from both your make and your shader side: find the function that gives the sand's height at a place on the map, and ask in your report if it is not exported as you need it). Seat every tree on that surface: a tree on a dune stands on the dune. Then the row behind the dunes stands on the pale dune's own slope behind the front crests, and is seen. If after that a crown is still mostly hidden by a crest in front of it, say where and by how much: Fable will move the row.
The land's file will change during your round: make the trees again at the end against the land as it then is, and say so.

## What must change, most important first
1. BEADS. At the page's size the belt reads as "a row of even, one size orange beads, each with one lit cap", "equal orange bubbles". Picture 9's reads as a canopy. The plan's sizes vary more now. On your side: let neighbouring crowns' lumps overlap and merge into one mass with a broken outline, vary a lump's size two to three times within a crown, merge some lumps, and let sky holes and a limb or two show in the gaps.
2. THE SAME GRADIENT ON EVERY LUMP. Each lump has the same baked bright top and dark foot and the same smeared stipple: "sponge pom poms". A lump's light comes from where it is on the crown (the crown is one lit thing) and from its own leaf clusters, not from one ramp stamped on all of them.
3. CARDS. Straight edged pale card slivers and one pixel stepped alpha edges show inside crowns at three times and are plain at nine. Break or turn the cards so no straight edge or flat pale facet faces the view, and dither the cut or use alpha to coverage.
4. COLOR. More contrast and more orange than the picture: the brightest five percent is (215, 143, 97) against the picture's (186, 136, 99), the upper mids (158, 95, 59) against (139, 83, 51), the darks (30, 11, 3) against (47, 14, 4). Lower the tops' value and saturation TOGETHER (mixing toward pale made them frosty and pink), and lift the darks a little. Left of the pyramid the belt is "uniform dark brown peas with few lit tops": that side is as moonlit as the rest.
5. THE TRUNK is "a smooth dark plastic tube with a flared foot". Bark, a real taper, two or three forks reaching up into the crown. It is seen in the front row and through the gaps: where it is never seen, leave it out.
6. THE SHADE ON THE SAND where the belt meets the dunes is a dark wedge from your shade card: soften it, and with the moon lower let a front tree's shade lie longer, away from the moon.

## How to look
First: npm run match -- --at 60,200,1260,130 --out shots/world/trees/r6-match. Then close:trees and close:dunes. Then the real page at its own size and at --scale 1. Real frames of a slow scroll.
