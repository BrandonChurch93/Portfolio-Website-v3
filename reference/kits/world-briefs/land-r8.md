# Your part: the land. Round 8: dunes that are crescents of real sand

## What you own
scripts/world/parts/land/, public/world/land.bin and land-*.png, src/pieces/world/parts/land.ts, src/pieces/world/parts/land/. Stills in shots/world/land/ with the prefix r8-. Report: shots/world/land/r8-report.md. Read first: shots/world/land/r7-report.md and its two reviews (r7-report-review-1.md, -2.md), and the END of briefs/common.md (About 07:15: the plan's trees changed, 648 now, and your land bakes their shade: make it again from placed.ts as it is).

## Where it stands (round 7 is committed and live: git has it, so you can always get back to it)
Brandon's words on the dunes lead every round: "The dunes are still not good enough, the shadows aren't hitting it right to make it look realistic and they need to be a lot taller."
Round 7 scored 6.5 and 5.5 and Fable kept it: on the page it is plainly better than round 4. Kept, and not to be lost: the tall dunes, none capped (the great dune 58). Knife sharp crests between a lit back and a warm near black face, five times darker. Sand that runs from apricot to pale gold. Floor ripples in three sizes that bend round the toes and do not crawl in real frames. The rim with no scallops, on picture 9's within a few pixels. The lip of broken stone. The row seen in the saddle. One draw call, 93,524 triangles, land.bin 1.0 MB.
FABLE'S RULING, again, since a reviewer asked: the dunes stand as tall as they do. His word is over the picture's height.

## What must change, most important first
1. A DUNE IS A CRESCENT. Open shots/world/ref/dunes-he-likes.png (his own picture: do not commit it). In it each dune is a crescent whose two horns come forward and down to the floor, wrapping a hollow that faces partly toward the viewer, so the dark face is framed by lit sand on both sides. Ours are tall peaks with the dark face turned to the left, and the great dune's bright crest turns straight down at its right end into a vertical rolled lip: "a curled sheet", "a breaking wave". Reshape at least the two front dunes and the great one: bring each brink down to the floor along a forward horn. Heights stay.
2. NO DOTTED CREST. Single bright orange specks remain along the great dune's summit and along the small front left dune's crest and the outline of its slip face (the reviewers' z-crest.png and z-seam.png). Fade the lit crest band by its width on screen. Take real frames of a slow scroll and show none.
3. SAND, NOT SATIN. The lit backs are airbrushed smooth over their top half and every crest has the same glossy rolled lip, so the dunes read as satin or curled paper. Carry fine sand texture and faint wind streaks up the backs to the brink, and vary the lip. The slip faces are one flat value (luminance sd 0.8 to 2.3 across the great dune's face) and too red (blue over red 0.10 against 0.23 in his picture): real lee side structure (grain flow lobes, crest notches with slumps, sharp edged chutes), a darker and more neutral brown, still near black. The small front left dune's face is only 2.7 times darker than its back: five, as the others.
4. A DESERT, NOT FIVE HILLS. The ground between the dunes is flat rippled floor. Smaller crescents and swells at several scales between them, as picture 9's desert has, so the great dunes have something to be great beside.
5. NO RULED LINES. The shelf under the row of trees with its straight edge (give it a dune's back with a crest), the straight edged band across the pale dune behind, the right front dune's ruler straight crest. Nothing in sand reads as a cut plane.
6. STRAY LIGHT AND SHEETS. A saturated orange glow at the right front dune's foot. A cool grey sheet with a near white sliver under the sand at the desert's front left lip (hide each part in turn with ?only= to find whose it is, and say). Nothing white, nothing grey.
7. THE CITY'S FLOOR. At the page's size the front strip is a flat grey brown band and the pyramid's court a greyer flat rectangle, with large camouflage blotches on the ground seen alone: real slab paving whose joints catch the moon, warm, that takes light.
8. COST. The close view measured 60 to 98 ms a frame against 16.7 with the land off, on a busy machine. Say what the shader costs a pixel now (how many texture reads and loop steps), and bring it down if anything in it marches.

## Budget
1.3 MB for land.bin, 100,000 triangles, 1 draw call.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000) cut to the dunes and laid beside round 7's (shots/world/land/r7-2-beside-r4-page.jpg has it at the right) and his picture. Then close:dunes at three times. Then real frames of a slow scroll past the dunes. It is kept only if it is plainly better than round 7 at the page's size.
