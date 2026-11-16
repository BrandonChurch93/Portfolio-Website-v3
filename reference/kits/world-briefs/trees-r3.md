# Your part: the trees. Round 3

## What you own
scripts/world/parts/trees/, public/world/trees*.bin and trees*.png, src/pieces/world/parts/trees.ts, src/pieces/world/parts/trees/. Stills in shots/world/trees/ with the prefix r3-. Report: shots/world/trees/r3-report.md. Read first: shots/world/trees/r2-report.md and its two reviews, and the end of briefs/common.md ("Changed in the frame during the night").

## Where it stands
Round 2 scored 6 and 5.5. Kept: separate full crowns with near black undersides and gaps, lit on their upper right toward the moon. Each tree shaded by its neighbours nearer the moon. The range of shades from tree to tree. No sparkle. 135,888 triangles, 8 draw calls.

The plan has been put right again for you (placed.ts, to picture 9): 344 trees now. Crowns overlap the pyramid's left foot as the picture's do. Right of the spire the belt is deeper, back among the towers' feet. Behind the dunes there is one even line of crowns. And the world now keeps its warm darks, so your shade will come out warmer than you measured. Make them again and lay them over the picture first (npm run match -- --at 60,200,1260,130 --out shots/world/trees/r3-match).

## What must change, most important first
1. A STAMP REPEATED. At three times every clump has the same scalloped rosette outline with the same serrated fringe, and each crown reads as stacked paper shingles, six to eight small lumps with a lit cap on each. Make a crown of three or four large lumps with fine leaf detail inside each, from several different clump outlines (different lobe counts, scaled from 0.5 to 1.5), the leaf card about a third of its present size.
2. COLOR UNDER THE NEW LIGHT. Lit tops got more saturated as they got brighter (up to 237, 127, 54). The picture's tops are a peach (about 198, 146, 107): highlights go toward peach and pale gold, and the shade takes more red (umber, dark red brown). At the page's size every crown must not read as the same copper orange.
3. DARK STREAKS run down the shaded faces of crowns: fade or cull any card seen at a glancing angle, and check the view facing disc's sampling.
4. THEY FLOAT. Under many front crowns there is a dark blurred skirt and no trunk or root flare to be seen. Seat each front tree: a visible trunk with a flare into the ground and a contact shade that reads. The land's builder is making the ground under the belt a darker, warmer earth.
5. A RULE BROKEN. The trees sway and still cast into the moon's shadow map, which is drawn once: nothing that moves may cast a shadow from the moon. Hold the sway at zero in the depth pass.
6. THE LIGHT IN THE STREET. The trees no longer take the moon's shadow map but the paving between the belt and the towers is in the towers' shade, so the crowns look lit in a shaded street. Where a tree stands in a tower's shade (work it out when you make them: the moon's direction and TOWERS are known), store that and dim its moonlight.
