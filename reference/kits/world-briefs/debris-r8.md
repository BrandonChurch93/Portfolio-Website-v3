# Your part: what broke away. Round 8: rock at three times, and a rim of moonlight

## What you own
scripts/world/parts/debris/, public/world/debris*.bin, src/pieces/world/parts/debris.ts, src/pieces/world/parts/debris/. Stills in shots/world/debris/ with the prefix r8-. Report: shots/world/debris/r8-report.md. Read first: shots/world/debris/r7-report.md and its two reviews (r7-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands (round 7 is committed and live: git has it)
Brandon's words: the debris field is "super important", one scene, and his test is a high end film or a AAA game.
Round 7 scored 4 and 4.5 and Fable kept it, since on the page it beat round 4: heavy masses in the hollow's own red brown stone, lit only by the moon, the core and the stream, slow heavy motion with families together, a clear lane, one draw call. The rock is round 8 now and will not change under you this round, and there is NO rock wall under the hollow's floor: make your part against public/world/rock-r.bin as it is.

## What must change, most important first
1. AT THREE TIMES IT IS ROCK, NOT CUT BLOCKS. Every great piece and boulder is a convex chunk of 6 to 12 flat planes with noise laid over them: "rock that is faceted" fails on sight. The faceting is in the mesh, so mend it in the mesh. Fable's ruling on the budget, which you asked for: take triangles from the 1,440 shared small models (they are specks at the page's size: a third as many triangles each is enough) and spend them on the great pieces and the two boulders, so each silhouette has bites, lumps and broken lips 5 to 20 units across and no face is one plane. debris.bin may go to 2.4 MB and the field to 185,000 triangles.
2. A RIM OF MOONLIGHT. The moon on the great pieces was cut to 0.025, so they have no outline against the dark, and round 4's rims read better at the page's size. Every piece has a pale moonlit rim on its upper right edges (the moon is behind the world and to the right), broken by its relief, with the body staying near black. No light from anywhere that is not the moon, the core or the stream.
3. THE TWO BOULDERS to picture 9 (r7-boulders.jpg and npm run match): the left one a lumpy mass with a warm lit right flank, not a box. The right one a craggy thick wedge with a lit lip, not a plate with cubes on it.
4. ONE STONE ON EVERY FACE. G1's moonlit faces go grey (blue over red 0.33 to 0.41) beside warm ones at 0.18: hold every face to the stone's hue. The small pieces by the lane are flat shaded gems with saturated orange faces (226, 100, 28): grain inside each face, lit faces toward tan. Spot noise that reads as cork or leopard spots goes: breaks that follow the stone's beds. No cubes on faces, no square or diamond dark pockets (G0, G1).
5. THE FIELD'S SHAPE. The middling pieces close into a ring round an empty hole by the stream, and a row of broad evenly lit orange tops makes a band across the middle (the brightest rock in the field). Arms that sweep down and out from under each side with open dark between, no broad plane square to the stream, mass densest up under the planet, a thinning tail below.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --scroll 1000 --t 9 --wait 12000 and --scroll 700) beside round 7's, then close:debris at three times (the left cluster and the right great piece), then real frames (npm run live) for the motion. It is kept only if it is plainly better than round 7 at the page's size AND passes as rock at three times: say so yourself, harshly, with the pairs side by side.
