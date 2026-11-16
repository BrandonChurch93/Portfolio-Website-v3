# Your part: the skin. Round 9: light round the knot, a pale tear on the picture's line, crust that is stone

## What you own
scripts/world/parts/skin/, public/world/skin.bin and skin-map.bin, src/pieces/world/parts/skin.ts, src/pieces/world/parts/skin/. Stills in shots/world/skin/ with the prefix s9-. Report: shots/world/skin/r9-report.md. Read first: shots/world/skin/r8-report.md and its two reviews (r8-report-review-1.md, -2.md), and the END of briefs/common.md. The rock is still in its seventh round: make your part again from public/world/rock-r.bin as it is when you start and before your last stills, and say which you made it against.

## Where it stands (round 8 is committed: git has it, so you can always get back to it)
Round 8 scored 6 and 6 and Fable kept it. Kept, and not to be lost: every place on picture 9 (the knot's junction at 222, 477 against 222, 478, every arm, the large crater near 1164, 426, the low crater, the rimmed middle craters, the outline). The knot as a hard Y cleft with no blob. The per place moon shadow with no stair steps. The warmer pale side. The NIGHT fix that keeps the core's light on faces turned from the moon. The palette. One draw call, one program, 129,759 triangles, 2.63 MB.

## Fable's ruling on what you asked
THE KNOT HAS LIGHT ON THE ROCK ROUND IT. Round 7's soft blob failed because it was a spot of light drawn over the rock. Round 8 took all of it away, and at the page's size the knot is dimmer than the picture's (median 11 against 54). The picture has a warm light about 25 to 30 pixels across ON THE ROCK round the knot: put it back as light that falls on the rock and is broken by the rock's relief (brighter on faces turned to the cleft, gone in the pits and behind steps), never as a soft disc. Grade the heart itself from pale gold at its middle to orange at its walls: it is a flat clipped plateau of 253, 225, 192 about 38 pixels wide at three times, with a lower edge that cuts from 176 to 23 in one pixel. Some of its light lies on both lips. Carry the hot arm the last 9 pixels to about 259, 466.

## What must change, most important first
1. THE PALE TEAR IS ON THE PICTURE'S LINE AND IN PIECES. It sits 20 to 40 picture pixels too far left on a nearly vertical line at about 1058 across. The picture's leans: about 1100, 320 under the sand, then 1085, 1080, 1072 and 1060 down to 460. And it is one strip of even cream light, a rope: separate lit chunks of thick crust with dark gaps, each lit by the way it faces. (The rock's builder owns the rock behind it: say exactly what you moved, in picture pixels.)
2. THE CRUST IS STONE. The dark side's slab and the two blocks under it are pinkish plaster grey with the same dashed dark zigzag on each, like stitching, at low contrast (p95 125 against 160). One stone (stone() in light.ts), hard fracture faces, crisp dark pits, grit, a bright top edge, no repeated line. The line of blocks down the dark tear is still a dark column.
3. THE ARMS at three times are cream ribbons of even width with a dark outline: painted lines. Width that varies along each arm, the near wall lit and the far wall dark across the cleft's depth, no even outline.
4. THE PALE SIDE'S MARKS. The small pits are one stamped teardrop at one turn and one density (Swiss cheese): vary shape, size, age and direction, and cluster them round the large craters. Flat dark polygons with straight edges sit on the crust beside the tear like decals: real pits with a rim, a wall and a floor, or gone. The lip's relief is smeared into horizontal dark wavy streaks.
5. THE LARGE CRATER has a soft even rim like something turned on a lathe, a blurred inner shadow and a dark stain on its floor from the stored bounce: a crisp lit lip, a hard black crescent on the wall away from the moon, slumps and terraces at its lower right, an even floor.
6. THE DARK FACE is flat color at three times: a few broad fracture planes and shallow steps that catch the night's fill, more than hairlines, without lifting its darks.

## Budget
3 MB for both files, one draw call, one program.

## How to look
Every draft: npm run match on the right side and the left side first, then the regions' numbers, then close:right and close:left at three times, then the real page (npm run shot -- "/lab/hero?ui=0" --scroll 700 --t 6 --wait 12000) beside round 8's (s8-final-page-beside.jpg has it at the right).
