# Your part: the torn rock, measured from picture 9 (sculpt R)

## Why this brief exists
Two sculptors traced picture 9's rock by hand as lists of flat polygons. Both failed the same way: "a collage of cut cardboard", "a wall of rubble filling a window", flat plates of one size, no depth, straight torn edges. Their work is in scripts/world/parts/rock-a/ and rock-b/ (read rock-b/trace.mjs: its 55 traced masses with depths are useful to you as a rough guide to how deep things are) and their stills are in shots/world/rock-a/ and rock-b/. Do not continue their method.

Fable is changing the method. The view of this world never moves: the world scrolls with the page as one picture. So the rock does not have to be right from any other side. It has to be right from this one, and it has to be a real surface that the world's real lights fall on. So build it as a RELIEF IN THE CAMERA'S SPACE, MEASURED FROM THE PICTURE ITSELF by a script: every slab, edge, gap and gouge of the picture's rock lands where the picture has it because the script read it from the picture, not because someone typed its corners.

## What you own
scripts/world/parts/rock-r/ (everything: the script that measures the picture, its stored measurements, the make script) and public/world/rock-r.bin. No TypeScript. Stills in shots/world/rock-r/. The page draws your rock when its address has rock=r (src/pieces/world/parts/rock.ts, not yours, draws the meshes `break` and `skin` of public/world/rock-<letter>.bin in one plain pale material by their stored light). Add --q "rock=r" to every look and match.

## Your pictures
reference/concept/09-parts/09-the-whole-picture-at-1376.jpg is the source: you read its pixels. Also 09a and 09h in the same folder, and the enlargements shots/world/ref/grid-hollow.jpg, grid-under.jpg (ruled grids), hollow-large.jpg, hollow-left-large.jpg, hollow-right-large.jpg, hollow-floor-large.jpg. Study them.

## What to build, step by step

1. READ THE PICTURE. A script of yours loads the picture's pixels (Playwright is installed: draw the image to a canvas in a page and read it back, as scripts/world/match.mjs and grid.mjs do. Or decode the JPEG another way that needs no new dependency). Work in linear light.

2. SAY WHAT EACH PIXEL IS. Make a mask of the picture, by polygons you trace with the grid tool plus what can be measured: (a) torn rock, which is yours: the roof's front face under the land's lip, the whole hollow, the floor, the hanging masses each side, down to the ragged lowest outline about 700 down. (b) The planet's own outer surface at the far left (the dark cracked side, left of a ragged torn edge near 290 to 300 across) and far right (the cratered side, right of a ragged torn edge near 1000 to 1040 across): not yours to detail, it is the `skin`. (c) The land and everything on it, above the lip: not yours. (d) Open air: outside the planet, and under the floor between about 470 and 830 across. (e) Things in front of the rock that must be painted out of your reading: the core (688, 437, radius 90) and its stream, the five thin small streams, and the two loose boulders floating free (about 370 to 470 and 820 to 960 across, 580 to 690 down), which belong to another part. Where one of these covers rock, fill the hole from the rock round it.
   The torn edges and the lowest outline are ragged in the picture: take them from the picture, never as straight lines.

3. FIND THE FACETS. The picture's rock is made of faces: broad lit faces, smaller ones, dark gaps between them. Divide the rock's pixels into facets along the picture's own edges (strong changes of brightness), merging what is one face: perhaps 1,500 to 4,000 facets, from great faces 150 pixels across to chips of 4. Smooth and straighten each facet's outline so edges are crisp runs with corners, not pixel stairs, and never ruler straight over a long run.

4. GIVE EVERY FACET A DEPTH AND A TILT, so that the world's own light makes it as bright as the picture has it.
   - A rough guide to depth first (z, toward the viewer): the core is at z 150. The land's lip is at lip(x) in layout.ts (265 at the middle, 480 at x -235, 394 at x 238) and the roof's front face hangs from it. The cave wraps the core like a funnel: its back wall straight behind the core is about 100 to 150 units behind the core's middle, and its walls come forward as they go out. The great masses left of about 480 across and right of about 900 are nearer the viewer, z 300 to 480. The floor's front edge is about z 230 to 280. rock-b/trace.mjs has a depth for 55 named masses.
   - The lights are known exactly (scripts/world/lib/plan.mjs light(), and the formulas in scripts/world/lib/bake.mjs: coreIrradiance, moonIrradiance). A face's brightness is the rock's color (ALBEDO in scripts/world/lib/rock.mjs) times the light that reaches it. So for each facet solve for the tilt of its plane that makes it as bright under the core as the picture has it, choosing the tilt that still faces the viewer, and keep neighbours from tearing apart more than their difference in brightness asks.
   - A facet that is nearly black in the picture is a gap: set it far back (100 to 250 units behind its neighbours) so it is a real hole that the light does not reach, and the facets round it get real thin edges standing over it.
   - A facet lit pale and cool at the top of the roof is lit by the moon, not the core.
   - Then check it with the real baker (it gives every vertex the share of the core it sees and the light that has bounced) and correct the tilts and depths two or three times, until what the world's light gives matches the picture facet by facet. Print the mean error.

5. MAKE THE MESH. A surface over the rock's pixels at two or more samples to a pixel where the picture has detail, each sample at its facet's depth, with real walls where neighbouring facets differ in depth (those walls are the slabs' thin edges: give them a slight batter and broken runs, not a perfect extrusion along the line of sight). Use fromPicture(px, py, z) to put each sample in the world. Close it behind so it is a solid that blocks light. Join it to the planet's body: the `skin` (the smooth outer surface and the flat top, from shell() and dome() in layout.ts, cut at your traced torn edges and at the lip) and the land's underside. Nothing may come nearer the core's middle than CORE.r + 16, and nothing may stand between the core and the viewer.

6. LIGHT IT AND WRITE IT with the same steps makeRock uses (creased normals, bake with light(), simplify with the light as attributes, pack as `break` and `skin` with normal, light and bounce). Budget: 650,000 triangles in `break`, a file under 20 MB.

7. THEN MAKE IT BETTER THAN THE PICTURE. The picture is 1376 pixels wide, so what you measure from it runs out at about one unit. At three times zoom on the page a unit is six device pixels. So once the measured relief matches, add what the picture cannot hold, in the same character: chips along the edges, a second generation of small breaks, hairline steps where a layer sheared, small stones lying on what faces up. Faces stay clean and broad: no noise, no dimples.

## The first look of every round
npm run match -- --q "rock=r" --at 250,240,860,480 --out shots/world/rock-r/match-hollow, and the whole with no --at. By construction your outlines should sit on the picture's to within two or three pixels: if they do not, the mapping is wrong, fix that first. Then squint at match-hollow-beside.jpg: the pattern of bright faces and black gaps must be the picture's.
Then npm run look -- hollow --q "rock=r" --out shots/world/rock-r/page.jpg and npm run look -- close:hollow --q "rock=r" --w 1800 --h 1200 --out shots/world/rock-r/close.jpg.

## What will make it fail
- Looking like a photograph pressed into clay: soft, lumpy, embossed. Faces must be planes with crisp edges.
- A depth so shallow it reads as a painted wall. Gaps must be real holes with real edges over them, in four or five layers from the lip to the back wall.
- Straight torn edges, a box, a flat wall, a cut line along the bottom.
- Stair steps or the grid it was made on showing at three times zoom.
- Being no better than the picture close up.

## Report
Full report to shots/world/rock-r/r1-report.md. Say in it, for Fable to tell Brandon plainly, exactly what is read from the picture and what is made by rule.
