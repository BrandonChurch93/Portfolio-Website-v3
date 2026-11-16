# Your part: the spire. Round 8: one solid gold band, on a tower that can be read

## What you own
scripts/world/parts/spire/, public/world/spire*.{bin,png}, src/pieces/world/parts/spire.ts, src/pieces/world/parts/spire/. Stills in shots/world/spire/ with the prefix r8-. Report: shots/world/spire/r8-report.md. Read first: shots/world/spire/r7-report.md and its two reviews, and the END of briefs/common.md.

## Where it stands
Round 7 scored 7 and 6.5, the best of any part of the world. Kept, and not to be lost: the placement (tip 688, 11 against the picture's 685, 11, the stages, the ring's ends and tilt). The ring as a traced solid with true cover, a clean outline at scale 1 and 2, a lit inner face on the far arc, the tower mirrored dark where the front arc crosses it. The needle, the courses, the gold finials and trim. The stone as a warm dark brown of the city's family. The palette. 53,800 triangles, 0.54 MB.

## What must change, most important first
1. THE TOWER IS A BLACK CUT OUT ON THE PAGE. Its stone's luminance is mostly 27 to 40, against the glow behind it at 55 and the city round it at 89. It is the landmark his name stands over: bring the stone to one step under its neighbours (about 60 to 75) with a lit side toward the moon and a shaded side, so its stages, fins and courses can be read at the page's own size.
2. THE RING IS TWO PALE LINES WITH A DARK MIDDLE at the page's size (its profile across: 74, 160, 97, 74, 114, 156, 185, 144, 94), and its median is 118 beside the stepped crown's 164: tan brass, not gold. Bring the body up and the catch line down until it reads as ONE solid band of the crown's own gold, its median within 20 of the crown's, with the catch line still its brightest run.
3. THE DOTS ARE REAL. A row of dark dots along the ring's lower outer rim and its right end is in lossless stills (r7-rv1-x3-bead-x4.png, review2-x3-ringedge-x8.png): the bead and the arris. Fade them by fwidth well above two and a half pixels, or take the bead off below about four pixels. And the reflection on the ring's top face comes out as stair stepped bands: average what it mirrors over a pixel's footprint, as the normal already is.
4. NO LIGHT PASSES BETWEEN THE RING AND THE TOWER. Polished gold throws a warm catch on the shaft and the fins it crosses, and the lit tower shows in the ring: without it they are two things lit apart.
5. LIT FLOORS. The window strip is dimmer than the picture's (its 90th percentile 73 against 100): clumps of brightly lit floors, so it reads as a tower with people in it and not a dim amber stripe.
6. THE FOOT. The podium's stone is "smeared paint" (blotched stains, a faint grid, even vertical stains over horizontal joints like plaid), the louvre plaque and the gold frieze over the doors are one to two pixel barcodes that will shimmer, the fins' slot windows a uniform ladder: crisp coursed stone like the stepped tower's, stains with a source and an edge, the plaque in a recessed frame, slots that vary. The court: the lobby's warm light on the paving before the doors, a step shadow, the kerb whole at its left end.
7. PROOF. Record the page lossless while it scrolls and while the cursor crosses the ring (npm run live with PNG frames if it has them, or stills a pixel of scroll apart) and show that nothing on the ring or the plaque crawls.

## How to look
Every draft: the real page at its own size first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 9000 --scale 1, cut to the spire and enlarged three times): can the tower be read, and is the ring gold? Then npm run match -- --at 560,0,260,300 --out shots/world/spire/r8-match, then close:spire at three times.
