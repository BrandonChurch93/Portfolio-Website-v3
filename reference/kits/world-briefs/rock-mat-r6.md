# Your part: the rock's material. Round 6: clean stone, a few scars, and dust where plates meet

## What you own
src/pieces/world/parts/rock.ts, src/pieces/world/parts/rock/, scripts/world/parts/rock-material/. Stills in shots/world/rockmat/ with the prefix r6-. Report: shots/world/rockmat/r6-report.md. Read first: shots/world/rockmat/r5-report.md and its two reviews, briefs/rock-r5.md (the sculptor is carving a smooth cave round the core and a few great slabs THIS ROUND: its file changes under you, and your stone has to carry both), and the END of briefs/common.md (the darks of the underside changed in the frame: a weak bounce falls away to near black now).

## Where it stands
Round 5 scored 5 and 4.5. Kept, and not to be lost: the lit color (peach tan beside the core, a redder brown on grazing faces, on the picture's numbers, no pumpkin). No plywood, no banding, no rice, no tile repeat seen, nothing off the palette. Stable under scroll. One stone for the hollow and the moonlit roof. One program, one draw call, nothing shipped. Gouges worked out only where light reaches.

Fable, with r5-page-hero.jpg open: the stone is the right color and the wrong pattern. At the page's size every lit wall is a dappled camouflage of blots of one size. Picture 9's lit faces are mostly CLEAN, with a few long dark scars and deep shade where plates meet. This round is restraint.

## What must change, most important first
1. A LIT FACE IS ABOUT EIGHTY PERCENT CLEAN STONE. Cut the separate marks on lit faces by about three quarters. What is left is mostly LONG THIN DARK SCARS that follow the slab's own layering (the sculptor's great slabs will have laminations along their length: run with them), connected, of different lengths, never a blot, never a square or a rhombus. Their spacing is never even: a low frequency mask leaves whole plates clean and packs the scars along edges and partings.
2. THE CAVE ROUND THE CORE will be one smooth concave surface lit as a soft gradient. On it the stone is at its cleanest: fine grain and a slow roll of tone only, no scars at all within about half a radius of the ball, a few beginning toward its lip.
3. DUST AND SHADE WHERE PLATES MEET. Creases and the joins between plates have no darkening, so the rock reads as stacked card. In every concave crease and where two plates meet: a band of deeper, redder shade several units wide, strongest in the corner. This, not the scars, is what gives the picture's rock its depth.
4. A SCAR IS CUT, NOT STAMPED. Each has a floor and walls lit by where the core is: a hard dark edge one or two pixels wide on the side away from the core, a bright lip only on the edge facing it. No soft halo, no drop shadow band, no pale outline copied from the shape.
5. CLEAN STONE IS STILL STONE AT THREE TIMES. Between the scars it is "smooth peach paper" and the sculpt's triangles show through. Pixel scale grain (a sand grain normal and a little albedo jitter), pitting, a few hairline cracks, a faint sparkle in the sheen, and a tone that rolls across each face. No bright speck on a dark face: a pit cannot be brighter than the face it is in.
6. THE DARK MASSES (the roof at the left, the right side, the floor's underside) are smooth brown panels showing their triangles: the same grain and a few scars at low strength, seen only as far as the light there shows them.
7. THE CHIPPED BEVEL runs as an even pale rim along plate silhouettes ("a die cut paper halo"): break it far more often, thin it along silhouettes, and keep any lit chip at least a unit and a half wide or fade it (common.md on dashed edges).
8. HUE. 96 percent of the stone lies between 20 and 28 degrees. The color comes from the light: push the bounced darks and the cuts redder (12 to 16 degrees), and the moonlit roof a greyer tan.
9. FAULTS. Beside the stream's neck the floor has a flat peach patch with no grain (246, 169, 84), a dashed dark seam across it and a straight horizontal step in tone across two faces (review2-z-seam.jpg). The run pattern breaks at nearly coplanar creases.
10. COST. Frame times were 17 to 29 ms against 20 to 23 without the stone, on a shared machine: measure three times each way and say what the stone costs. It must not cost a frame.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --scroll 700 --t 6 --wait 12000) beside the same part of picture 9: is a lit face mostly clean? Then npm run match -- --at 240,250,900,400 --out shots/world/rockmat/r6-match, then close:hollow at three times.
