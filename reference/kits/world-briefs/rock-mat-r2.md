# Your part: the rock's material. Round 2

## What you own
src/pieces/world/parts/rock.ts, src/pieces/world/parts/rock/, scripts/world/parts/rock-material/, public/world/rockmat-*.png. Stills in shots/world/rockmat/ with the prefix r2-. Report: shots/world/rockmat/r2-report.md. Read first: briefs/rock-mat.md (round 1's brief, which still holds), shots/world/rockmat/r1-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", both parts).

## Where it stands
Round 1 scored 4 and 4.5. Fable's own look at shots/world/rockmat/r1-close-left.jpg: cut card with rice grains on it. Kept: on palette, no seams across broad faces, the per face frame, one shared stone for the tear and for what broke away, the ?stone=0 switch, the cost.

## What Fable changed under you (do not undo, build on it)
- THE COLOR. Picture 9's hollow is a deep, saturated red brown, and yours was a pale peach tan. That was mostly the frame: the core's light is now 16 (was 24), the fill on the rock is warm and stronger, and the stone's own color is LIGHT.stone in layout.ts, which light.ts exports as stone(). STONE.own in your stone.ts is now stone(). Your other stone colors (pale, red, dark, chip, dust, hot) were chosen round the old one: choose them again round this one. Targets, measured in the picture: lit faces (108 to 150, 55 to 91, 30 to 53). The very brightest, right beside the core, about (190, 120, 70). Mid masses about (70, 40, 24). Inside one lit face the brightness varies by 50 to 58 levels, where yours varied by 22: large stains, beds and strokes inside a face.
- THE STREAM'S LIGHT. It is the frame's now: world.uniforms.uStream in light.ts (x how much of the stream is there, y how far under SOURCE its end has run). Take your own strength switch out and use it: light nothing below y, multiply by x. It did not show at all at your default: on the floor's edge and the stubs beside the beam it must plainly show, warm, when x is 1 (the lab).

## What must change, most important first
1. NOTHING MAY READ AS WOOD. Faces seen edge on show wood grain or marble swirls from the face plane mapping (proved by ?stone=0). Fade the detail by the grazing angle or by how stretched a pixel's footprint is, or map those faces from three axes.
2. THE GOUGES ARE RICE. One family of small almond slivers, evenly scattered, at random angles: confetti, and it repeats. Replace them: a FEW long, ragged, bold dark strokes that follow the slab's beds, gathered near its edges and its breaks, varying ten times in length, with most of each face left clean. Where a stroke is deep it has a lit lip on the side toward the core.
3. NO NET OF CRACKS. The hairlines are ruler straight, turn sharply and close into polygons (fail on sight, and they read as the mesh's own triangle edges). Few, wandering, tapering, never closed. If the lines are the mesh's creased triangles showing through your edge finder, do not find edges that way on a face that is flat.
4. NOT BENT COPPER. A thin bright line on every convex edge, roughness 0.6 and one tone to a face make it read as folded card or metal. Stone is matte: roughness 0.85 and up on a clean face, no sheen line. An edge is chipped: a ragged band 1 to 4 units wide, paler and rougher, broken along its length, with small bites out of it. The sculptor is being asked to store each vertex's distance to its face's outline in light.w (the spare number): use it when it is there (it is 255 when it is not), and until then widen what you find.
5. REAL GRAIN. Close up it is crumpled foil with nothing granular under it. Picture 9's stone, in shots/world/ref/hollow-left-large.jpg, is a sandstone: fine even grains, pits, thin beds that show as lines on a slab's broken side (strata), a mottle of paler and darker patches. Put strata on the sides of slabs: thin parallel layers, some proud, some cut back, which is what tells a visitor it is rock that split.
6. THE DARK MASSES. They now take a warm fill. Check that they read as slabs with form, a deep warm brown, never grey and never flat black: the picture's are about (60, 35, 22) with detail in them.
7. DUST AND RUBBLE on what faces up: the floor's top, ledges. Paler, flatter, with small grit that casts into itself.
8. Say in your report whether the dotted stipple the reviewers saw on faces at the top left of the core is still there with ?stone=0, and where exactly (picture pixels), so Fable can find whether it is the moon's shadow map or the mesh.

## How to look
As round 1, with the prefix r2-. And lay it beside the picture every draft: npm run match -- --at 250,240,860,480 --out shots/world/rockmat/r2-match. The sculpt under you is changing (rock-r round 2 is being written now): judge the stone, and say what you need from the sculptor.
