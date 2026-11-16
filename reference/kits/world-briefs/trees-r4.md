# Your part: the trees. Round 4

## What you own
scripts/world/parts/trees/, public/world/trees*.bin and trees*.png, src/pieces/world/parts/trees.ts, src/pieces/world/parts/trees/. Stills in shots/world/trees/ with the prefix r4-. Report: shots/world/trees/r4-report.md. Read first: briefs/trees-r3.md (which still holds), shots/world/trees/r3-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", all of it).

## Where it stands
Round 3 scored 6.5 and 6: the best part of the world so far. Kept: the rebuilt crown (three or four great lumps of small leaves, each lump card turned, mirrored and picked again per tree, no stamp at three times). The glance fade with no streaks and no sparkle. The sway kept out of the moon's shadow pass. Trees dimmed in the shade of a building or the pyramid. On palette. The cost.

## The plan changed under you: make them again first
Fable planted the trees again to picture 9 where both reviewers measured the belt short (scripts/world/placed.mjs, placed.ts): 406 trees now.
- Right of the spire, 700 to 960 across, the belt is two or three crowns deep and climbs between the towers' feet to about 223 down, with crowns from 0.7 to 1.4 of the usual size.
- A knot of trees between the towers at 960 to 1050 across.
- Before the pyramid's left foot, 252 to 336 across, the belt is two or three crowns deep and covers the foot of the gold.
- Behind the dunes, one even line of twelve full crowns, 1063 to 1174 across.
- The dunes are being made about twice as tall this round, by Brandon's word tonight. The line behind them must still be seen over the sand: when the land's new round lands (public/world/land.bin changes), look at that line on the real page and say in your report if it is hidden.
- The scripts no longer start a second dev server beside a busy one (your report's tool fault): fixed in scripts/lib.mjs.
Lay them over the picture first: npm run match -- --at 60,200,1260,130 --out shots/world/trees/r4-match.

## What must change, most important first
1. ONE CROWN, ONE LIGHT. Every lump carries its own pale frosted cap, so a crown reads as cotton wool puffs or stacked cut out cards. Light each crown as one mass: its upper right lit and rimmed toward the moon, its lower left in shade, a dark underside and a dark heart seen through the gaps. The crown's own ball normal and how shut in a place is must lead, and a lump's own ramp only break it up.
2. THE COLOR IS SATURATION, NOT LEVEL. Measured on crowns alone the picture is only 10 to 15 percent brighter than yours, and far less red. Yours: mids (79, 33, 12), darks (43, 13, 3): brick. The picture's: darks about (50, 16, 5) to (77, 30, 9), mids about (90, 42, 19) to (111, 57, 27), tops about (190, 138, 100). Lift the green and the blue of the shade and bring the saturation down, so the belt reads amber, tan and peach with umber shade, with whole trees that differ: some paler and yellower, some deep red brown.
3. THEY STAND ON A BOARD. The paving under and between the crowns is as pale as open paving, and the front row throws almost no shade. Two things: a cast shade from each front tree as long as its crown is wide, lying away from the moon, on whatever is under it. And ask in your report for what you need from the land under the canopy (the land's builder was told last round to make the ground under the belt a darker, warmer earth: say whether it has).
4. THE TRUNK reads as a candlestick, a faceted grey cone with flat root fins, and turns the front row into lollipops. A tapering bark bole that leans a little, two or three limbs seen in the gaps under the crown, roots that dip into the ground. Under the front row show less of it: the picture's crowns come nearly to the ground.
5. THE OUTLINE. Every lump shares one bitten, scalloped silhouette. Break it with leaves and sprays that stand proud, the odd gap, a lean, a crown taller than it is wide beside one that spreads.
6. VARIETY AT THE PAGE'S SIZE. Squint at the real page: the belt must read as a wood of different trees, large and small, not a hedge of equal balls. Use the plan's sizes (they vary more now) and vary the crown's shape with them.

## How to look
After the overlay: npm run look -- close:trees --w 1800 --h 1200, then the real page at its own size: npm run shot -- "/lab/hero?ui=0" --t 6 --wait 9000, and --scale 1. If a still comes out black with no stats line, another builder's file was mid write: take it again.
