# Your part: the trees. Round 5

## What you own
scripts/world/parts/trees/, public/world/trees*.bin and trees*.png, src/pieces/world/parts/trees.ts, src/pieces/world/parts/trees/. Stills in shots/world/trees/ with the prefix r5-. Report: shots/world/trees/r5-report.md. Read first: briefs/trees-r4.md (which still holds), shots/world/trees/r3-report.md and r4-report.md with all four reviews, and the END of briefs/common.md ("Changed in the frame during the night", all of it).

## Where it stands, plainly
Round 3 scored 6.5 and 6. Round 4 scored 5 and 5.5: it went DOWN. What round 4 gained is kept: one light for a crown (lit and rimmed on its upper right, a dark umber underside, no frosted cap on every lump), darks and mids within a few levels of the picture, the front row brought nearly to the ground with its own shade, on palette. What round 4 LOST, in both reviewers' words: "a soft felt ball with no clumps, gaps or limbs, and less structure than round 3", "one even felt like stipple of cards with hard stair stepped edges and visible round discs". Round 3 had the structure: three or four great lumps of small leaves that read at three times. THIS ROUND PUTS THE TWO TOGETHER: round 3's form under round 4's light.

## The plan changed again: make them again first
385 trees. Fable laid round 4 over the picture off a ruled grid (shots/world/grid-belt-a.jpg and grid-belt-b.jpg):
- Every crown is a quarter larger (the picture's crowns overlap into one mass, ours were 0.7 to 0.85 of their size).
- Left of the spire, 470 to 650 across, the picture's belt is ONE row of crowns hard against the city's feet, with bare pale rock before it out to the lip. What stood on that rock is gone.
- Right of the spire the belt is three and four crowns deep and climbs between the towers' feet to about 228 down.
- The dunes are twice as tall now by his word, and a pale dune stands behind the line of twelve crowns at the far right. That line must be seen: after the land's new file lands, look at it on the real page. If the sand hides it, say exactly by how much, in units, so Fable can lift the row.

## What must change, most important first
1. FORM AND LIGHT TOGETHER. Each crown: three to five clumps with dark gaps between them through which the dark heart, a limb, or the sky is seen. Each clump has a lit top and a shaded foot, but the crown is still lit as ONE thing (its upper right toward the moon, its lower left in umber shade): a clump on the shaded side is dim all over, not capped. A broken leafy fringe on the outline: leaves and sprays standing proud, not a smooth scalloped ball. No round discs facing the viewer, no stair stepped card edges at three times (filter the leaf cards' edges, or cut them finer).
2. THE RIMS ARE TOO HOT. The brightest five percent in the trees measures (224, 146, 92) at saturation 0.59 against the picture's (186, 136, 99) at 0.47: about 40 levels over in red, salmon and pink. Bring the lit tops to a tan highlight, greener against red.
3. THE TRUNKS are short dark flared pegs like mushroom stems, and the roots and low limbs cost 80,000 triangles and are barely seen. Either a bole a stranger reads as a trunk (tapering, leaning, bark, a root flare that dips into the ground) where it is seen, which is almost only the front row, or take the cost out. Budget for the part: 150,000 triangles drawn.
4. THE LINE BEHIND THE DUNES shows as dark umber shapes against the black sky with no lit tops, where the picture's are lit tan balls. They are lit from the viewer's side by the night's soft light (NIGHT.front in night.ts, which what stands on top of the world takes in full): make sure that row takes it, and that it ends where the picture's ends (1174 across).
5. A WOOD, NOT A HEDGE. At the page's size, right of the spire, it must not read as near identical crowns at even spacing. Use the plan's sizes (8 to 19 now), mix the four crown shapes by place, and let the tallest stand over their neighbours.
6. THE GROUND. The trees stand "on a tabletop": pale cracked paving with a camouflage blotch edge. The land's builder has been asked twice for dark earth under the belt and is on the dunes this round. So lay your own shade: under the whole canopy a broad soft near black pool on the ground (it is shade, and it is yours), darkest between crowns, so the belt roots in the dark as the picture's does.
7. SHIMMER is untested: real frames at the page's own size in a slow scroll (npm run live), and say what you see.

## How to look
First: npm run match -- --at 60,200,1260,130 --out shots/world/trees/r5-match. Then npm run look -- close:trees --w 1800 --h 1200 beside round 3's and round 4's close stills. Then the real page at its own size: npm run shot -- "/lab/hero?ui=0" --t 6 --wait 9000 and --scale 1.
