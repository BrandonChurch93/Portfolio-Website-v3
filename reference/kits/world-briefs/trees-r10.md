# Your part: the trees. Round 10: crowns with volume, a belt that sparkles

## What you own
scripts/world/parts/trees/, public/world/trees*.bin and trees*.png, src/pieces/world/parts/trees.ts, src/pieces/world/parts/trees/. Stills in shots/world/trees/ with the prefix r10-. Report: shots/world/trees/r10-report.md. Read first: shots/world/trees/r9-report.md and its two reviews, and the END of briefs/common.md.

## Where it stands
Round 9 scored 6 and 5.5 and is kept. Kept, and not to be lost: the carpet right of the spire, unbroken from the buildings' feet to the lip, on the picture's darks and mids. The cull that tests crowns at their drawn size, with seeds that stay the same whichever trees it keeps. No rosettes, stamped leaves, tar stumps or ruled black line. Steady frames. On palette. 89,728 triangles on the shadow frame, no new program, the atlas at 1.17 MB.

## What Fable changed in the plan for you
Three rounds of reviewers measured the same thing between the pyramid and the spire, and they were right: the picture's bank there is two crowns deep in crowns about 18 of its pixels wide, reaching toward the lip, and ours was one rank of 12. placed.ts (705 trees now) plants a second rank before the first and makes every crown there 1.45 times larger. The row behind the dunes is smaller (its crowns were about twice the picture's) and a little tighter. Make your part again from it first.
The 27 trees at 955 to 1050 across that the land's near dune hid: the land's builder has been told to keep its great dune clear of them. If they are still hidden at your end, say so with a crop.

## What must change, most important first
1. A CROWN HAS VOLUME. At three times each crown reads as flat painted cut outs stacked toward the camera: every lump a disc with its own gradient and a hard outline. Leaf clusters that stand OUT from the mass, gaps that open into a dark inside, a rim broken at the scale of a leaf. Its outline is a hard stair stepped alpha cut: a soft fringe (by coverage or a dither that does not crawl), with sky showing through it here and there.
2. THE BELT SPARKLES IN THE PICTURE AND IS DULL IN OURS. At the page's size it is a value step duller, with few bright caps. More lit caps (near 200 in red, turned toward orange: they read salmon and rose now, about (230, 159, 108)) on the tops and the moon side, and darker gaps between and inside crowns, so the band is bright points over deep rust.
3. EVERY TREE IS ONE HUE. The belt reads as one material: vary the hue from tree to tree inside the palette (some more orange, some ochre, some a deep red), keeping the darks rust.
4. CROWNS IN SHADE (left of the pale building at the right) flatten into one dark brown silhouette: keep a few lit clumps or a little fill inside so they still read as masses.
5. THE SHADE ON THE GROUND. Each tree on open paving throws a long thin hard dark streak that reads as a skid mark: shorter, softer, a ragged pool that fades.
6. THE ROW BEHIND THE DUNES reads as a dark hedge on pale sand: lighten it to the belt's own values in moonlight.
7. LOOSE ENDS. A strip of paving and low tripod forks between the front rank and the lip right of the plaza. Lone puffs on the apron before the pyramid: tie them into the bank or let them go.
8. PROOF. Hard alpha outlines are a shimmer risk and it has not been tested: real frames of a slow scroll at scale 1 (npm run live), and say what you see. And measure: npm run perf -- "/lab/hero?ui=0" with the trees and with ?trees=off, three times each.

## How to look
Every draft: THE REAL PAGE AT ITS OWN SIZE first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 9000 --scale 1, cut to the belt and enlarged twice) stacked under the same part of picture 9. Then npm run match -- --at 60,200,1260,130 --out shots/world/trees/r10-match, then close:trees and close:pyramid at three times.
