# Your part: what broke away. Round 6: the great pieces

## What you own
scripts/world/parts/debris/, public/world/debris*.bin, src/pieces/world/parts/debris.ts, src/pieces/world/parts/debris/. Stills in shots/world/debris/ with the prefix r6-. Report: shots/world/debris/r6-report.md. Read first: shots/world/debris/r5-report.md and its two reviews, and the END of briefs/common.md.

## Where it stands
Round 5 scored 4 and 5. Kept, and not to be lost: the small and carried pieces as dark solid chips with a body and one hot edge, no confetti, nothing glossy, nothing pushed through another. Both boulders on picture 9's places. The busy middle along the stream, a clear lane, the core unhidden, dust thinning toward the foot. Slow heavy motion. On palette. 164,512 triangles, one draw call, 1.62 MB.

Fable, with r5-hero.jpg open beside r4-hero.jpg: the small pieces are better and the great pieces are worse. On the page they are black cut outs with a thin pale outline: a 530 unit plank at the left with a ruler straight edge, a stack of boxes at the right. ROUND 5 IS NOT COMMITTED. This round is the great pieces and nothing else.

## What must change, most important first
1. A GREAT PIECE IS A PIECE OF THE PLANET, AND IT HAS A LIT SIDE. On the page each great piece and each boulder shows a lit side and a dark side: the faces turned to the core or the stream glow in the hollow's own warm stone, the faces turned to the moon take a cool pale light on their top planes, the rest is near black. Round 4 had this (r4-hero.jpg) and round 5 lost it. Not an outline, not a band of even width drawn in from the edge: light that comes from which way each face is turned, so it thins and breaks with the relief.
2. NO RULER. No edge of a great piece runs straight for more than about 60 units without a notch, a step or a chip. The plank at mid left and the boxes at mid right go: break each into two or three craggy masses of different sizes, the largest close under the planet's sides, size falling with depth (reference/studies/65-* shows the order).
3. BROKEN FACES. Their faces are near featureless at three times. Real relief in the geometry: stepped secondary breaks with lit risers, scoops, crushed edges, hackle where it tore. You left the stone's gouges out because on these meshes they drew radial spokes: find why (the gouges run along a direction the mesh does not give them: hand them each face's own long axis) and put them back, or make the breaks in the mesh.
4. THE BOULDERS against picture 9: the left one a craggy many planed silhouette (it is a clean hexagon), the right one a near black mass with a JAGGED crest that burns at its upper left (it is a smooth warm band).
5. LEFTOVERS. The smooth orange gradient strip under the lower left slab ("plastic lit from below"), the round dent and the soft orange smears on the right great piece's face, an even cell mottle in the stone when the darks are lifted.
6. THE FIELD'S SHAPE. The arms round the stream do not read: gather the smaller pieces into clumps with a lead piece, along curves that can be seen on the page, and break the even band of pebbles at the lower left.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --scroll 1150 --t 6 --wait 12000) beside r4-hero.jpg: do the great pieces have form again? Then the overlay (npm run match -- --at 240,380,900,388 --out shots/world/debris/r6-match), then close:debris at three times and each boulder beside the picture's.
