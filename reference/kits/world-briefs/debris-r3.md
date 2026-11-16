# Your part: what broke away. Round 3

## What you own
scripts/world/parts/debris/, public/world/debris*.bin, src/pieces/world/parts/debris.ts, src/pieces/world/parts/debris/. Stills in shots/world/debris/ with the prefix r3-. Report: shots/world/debris/r3-report.md. Read first: briefs/debris.md and briefs/debris-r2.md (which still hold), shots/world/debris/r2-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", both parts).

## Where it stands
Round 2 scored 5 and 5. Kept: the torn great pieces (blocks, notches, steps, opened cracks, clinging rubble). The composition: arms round the stream, clumps lower down, thinning toward the foot, hung up against the planet's underside in families. The right boulder's place and size. Slow motion in families, with no pops. All 1,397 planned pieces. On palette. One stone with the hollow.

## His words, again, because this part carries the story
"The debris field is super important." "The stream has particles in it that are sharp and jagged. It's meant to be implied that these jagged particles are pieces of the exploded planet." "The debris field decor, and the wreckage under the planet all have to cohesively look like they belong." His test: a high end film, or a AAA game.

## What changed in the frame (build on it)
- The stone is a red brown now (LIGHT.stone) and the fill on rock is warm and stronger. Your light shares were set against the old ones: measure again.
- THE STREAM'S LIGHT IS THE FRAME'S: world.uniforms.uStream in light.ts (x how much of the page's stream is there, y how far under SOURCE its leading end has run, in units). Your main line's light must be multiplied by x and must light nothing below y. The six small streams are always there. In the lab it is all there.
- CLOSE has `debris` now: npm run look -- close:debris.
- The rock's sculptor is being asked to lift the floor over the left boulder to the picture's. Until that lands, bring the left boulder to the picture's place by standing it nearer the viewer.

## What must change, most important first
1. THE LIGHT IS THE FAULT. Every piece is a mid rust orange all over. Picture 9's pieces are bodies of warm near black, with light only where it belongs. Measured on the overlay: your right boulder's median is (38, 13, 3) against the picture's (10, 8, 3), your left (50, 19, 5) against (13, 12, 5). Make it so:
   - A body at rest is about (15 to 20, 12 to 14, 5): a warm neutral black, red over green under 1.6.
   - A thin burning edge and the face behind it, on the side that sees the core, falling away fast with distance from the core. Pieces far down get almost none.
   - A hot near side on the pieces beside the stream's lane, from the stream itself (by uStream), which the reviewers could not see at all on the real page.
   - A thin pale gold rim at the upper right of a piece, the moon's, where the planet does not shadow it. If the planet's shadow covers the field (it is behind and to the right, so the left of the field and the far low pieces should be clear of it), work that out when you make it and store it: a piece in the planet's shadow has no rim.
   - So the field reads in depth: near black shapes, picked out by three lights, against the dark.
2. THE NAMED BOULDERS are the darkest and largest things under the planet. The left one to the picture's 370 to 470 across and 580 to 690 down, with its lit upper left shoulder. Dim or move the large flat lit slab under the right boulder (about picture 786 to 885, 681 to 764) and the one at the lower left. Leave dark space between each boulder and the planet's rock.
3. NO CAMOUFLAGE, NO CORK. The bright blotchy mottle on lit faces reads as hammered foil. The stone's marks read as cork pores and a leopard mottle on pieces this small. Leave the stone's marks out on what broke away and give faces fine fracture relief of your own: flake scars, sharp chipped edges, hackle lines radiating from an impact point. No soft clay bevels.
4. THE MIDDLING AND SMALL PIECES are still one tone low poly prisms and tiles. Make them by the great pieces' torn method, cheaper: chipped, broken edged, each with a dark side and a lit edge.
5. THE LANE. An empty column 160 units wide with near mirror wings either side reads as a parted chevron. Keep the rule (nothing in front of the stream, nothing large touching it) and fill the column BEHIND the stream with pieces at several depths, darker as they go back. Break the left and right symmetry: the picture's field is lopsided.
6. THE DUST. Take the even sprinkle out of the open dark. Dust trails its family and the lane, and nowhere else.
7. THE CARRIED SHARDS ARE THE POINT OF THE STORY and read as orange flecks. Nearest the stream the planet's smallest fragments ARE the stream's shards: the same facets, the same dark copper, the same size on the page as the stream's own riding shards (look at the real stream on /lab/hero, scrolled, and match what it carries). Further from the lane they are stone chips of the same shapes. A visitor should not be able to say where the planet's pieces end and the stream's begin.
8. COST. The world is over its triangle budget. Hold this part to 300,000 triangles drawn.
9. PROVE THE MOTION in real frames (npm run live) at the page's size, on /lab/hero scrolled to the field.

## How to look
npm run match -- --at 250,520,880,248 --out shots/world/debris/r3-match first, every draft. Then the page: npm run shot -- "/lab/hero?ui=0" --scroll 1100 --t 8 --wait 4000. If a still comes out black with no stats line, another builder's file was mid write: wait and take it again.
