# Your part: the spire. Round 11: round 10, with nothing off the palette and no stepped rim

## What you own
scripts/world/parts/spire/, public/world/spire.bin and spire-windows.png, src/pieces/world/parts/spire.ts, src/pieces/world/parts/spire/. Stills in shots/world/spire/ with the prefix r11-. Report: shots/world/spire/r11-report.md. Read first: shots/world/spire/r10-report.md and its two reviews (r10-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands, told plainly
Round 10 scored 7 and 6.5 and is the better spire: the ring is the crown's gold at the page's size, the front arc plainly stands in front of the shaft, and the top carries the tower's language. It is NOT committed, for one reason: the ring draws stray pixels off the palette on its rim. Pure red (161, 0, 0) and (111, 1, 1), yellow (231, 171, 0), and pure yellow (234, 204, 1) in the cursor's spark, even with no lamp. They go with ?spirering=0. Anything off the palette fails the part on sight, however small. What is live and in git is round 9. Your working files are round 10's, and round 10 is also on the branch kept/held-0650.

## What must change, in this order. The first is the whole reason for the round
1. NOTHING OFF THE PALETTE, PROVED. Find the cause, do not mask it. Where to look first (both reviewers): the ring's color is weighed by its cover raised to RING.gamma, and the catch line and the spark are added AFTER that, so on the rim a pixel can carry more color than cover, and a channel can go under nothing or over the rest (src/pieces/world/parts/spire/materials.ts, the lines after "Drawn with its color already weighed by its cover"). No channel of the ring's light may be negative or not a number, and no pixel's color may be more than its cover. The proof: the real page at scale 1 and 2 as PNG, with no lamp and with the lamp at three places on the ring, and a count over the spire's box of pixels where green is under 8 percent of red or blue is over green: none.
2. THE RIM IS NOT STEPPED. Both long silhouettes of the band show stair steps at the page's own size (scale 1 and 2, the front arc and the right lobe). Ease the cover's ramp, apply the gamma only where the ring lies over sky, and do not brighten a half covered pixel.
3. THE RING AT THE PAGE'S SIZE is a smooth satin hoop with its relief averaged away, and its 28 even segments read as a dashed rhythm along the front arc. A dark underside and inner face against a lit top. Segments of uneven length whose joints notch the outline. And it mirrors what is beside it: the tower's lit bays as soft streaks on its inner and top faces.
4. THE FLECHE is five plain tapered stone trapezoids, plainer than the tiers under it: deeper flutes or chevrons, ribbed arrises, a gold course at each step, detail that grows toward the tip. The narrow pier windows beside the shaft are an even ladder of lit slots: group them and darken some floors. The window strip is darker than round 9's (60 against 71): bring it back up.
5. Take real frames (npm run live) while the page scrolls and the cursor crosses the ring, at scale 1 and 2: the pinnacles are about one unit and the joints are thin. Fade whatever twinkles (common.md, thin lit edges).

Fable's ruling on the stone: the spire's warm stone stands. The stepped tower's pale limestone beside it is Brandon's own approved tower and is his to change.

## Budget
56,000 triangles, 4 draw calls, 4 programs, 1 texture, 0.6 MB at the most.

## How to look
Every draft: the count of item 1 first. Then npm run match, the real page cut to the spire at the page's size and twice it beside round 10's (r10-hero-s2-x2-ab.jpg), close:spire at three times, two lamp places over the ring.
