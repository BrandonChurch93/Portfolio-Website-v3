# Your part: the trees. Round 12: round 10's color on small separate heads

## What you own
scripts/world/parts/trees/, public/world/trees.bin and trees-leaves.png, src/pieces/world/parts/trees.ts, src/pieces/world/parts/trees/. Stills in shots/world/trees/ with the prefix r12-. Report: shots/world/trees/r12-report.md. Read first: shots/world/trees/r11-report.md and its two reviews (r11-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands, told plainly
What is live and in git is ROUND 10: an autumn wood in orange, ochre, rust and deep red. Round 11 was not kept. Your working files are round 11's, and round 11 is also on the branch kept/held-0650 (git show kept/held-0650:<path>). git show HEAD:<path> is round 10.
Fable, with shots/world/trees/r11-before-after-page-2.jpg open (picture 9, round 10, round 11 at the page's size): round 11 won the form the brief asked for (one soft head to a tree, lit above, dark beneath, a pale rim at the upper right) and lost round 10's color. Its heads are a dusty pale rose (saturation 0.33 to 0.45) and too large, 1.3 to 1.6 times the picture's, so the belt reads as a row of cotton balls beside a gold city. The picture's trees are small, dark and orange brown. Neither round is plainly better than the other, so round 10 stays live.
The land's working files changed three times under you last round: they are round 4's again (the tall dunes that are live) and will not be capped for the row, so some of the row behind the dunes stays hidden. That is ruled and is not yours to fix.

## What must change, most important first
1. ROUND 10'S COLOR, KEPT. Each tree its own autumn hue, saturated: lit tops near (190, 135, 100) and never a pale cream peach (round 11's top 5 percent is 224, 161, 116), mids a dark rust (the picture's right of the spire is 83, 36, 16 where round 11 is 111, 60, 30), darks a deep red brown (44, 13, 3 to 66, 26, 8, which round 11 has right). Measure the saturation of the lit tops and keep it over 0.55.
2. SMALL SEPARATE HEADS. One head to a tree, as round 11 has, at the picture's size: 12 to 15 picture pixels across (GATHER.size back to 1 or under). More of them and smaller, with dark between. Vary size, height and shape tree to tree, so the belt does not read as one head repeated ("an egg carton").
3. LIT BY DIRECTION. Round 11's lumps are pale at the top and dark at the foot whichever way they face, so the crowns read as painted. Light each lump by the way it faces: the moon's pale rim on the upper right, the front light, a dark underside. The fade by height is a small share of it.
4. A CROWN HAS AN INSIDE at three times: leaf clusters at real depths that shade each other, holes with the night through them, leaf edges and not card edges, no straight card cut under a lump. And the crown's shade lies on the ground under it, where a viewer can see it, at its true length.
5. THE BANK between the pyramid and the spire stands about 20 units too tall with heads 20 to 25 picture pixels across where the picture has a low row of small trees (crown tops near 248 down, ours 230). Size is yours (item 2). If trees still stand too high after that, list them by index in your report: the plan is Fable's.
6. Take real frames of a slow scroll at scale 1 and 2 (npm run live): round 11 measured 0.32 percent of tree pixels changing by 20 levels on a 3 pixel scroll. Say whether anything crawls and take it out.

## Budget
80,000 triangles, 20 draw calls, the atlas no larger than it is.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000), cut to the belt and laid under picture 9 and round 10 as r11-before-after-page-2.jpg was. Then close:trees at three times. It is kept only if it is plainly better than round 10 at the page's size: say so yourself, with the two side by side.
