# Your part: the trees

## What you own
scripts/world/parts/trees/, public/world/trees*.bin and trees*.png, src/pieces/world/parts/trees.ts (replace the place holder, keep `build`), src/pieces/world/parts/trees/. Stills in shots/world/trees/. Report: shots/world/trees/r1-report.md.

## What it is
The belt of trees along the city's front, and the few among the buildings: TREES in placed.ts (x, z, size which is about half the crown's width, a number of its own, a turn), each standing on ground(x, z). Leave out any with within(x, z) < size: the tear took that ground. Their places are the layout and are exact. Pictures: reference/concept/09-parts/09c-the-skyline.jpg and 09d (the russet crowns at the towers' feet), the whole picture. The kit: "One kind, full round crowns in autumn colors, in a belt along the city's front." At the bar when: "Crowns are soft and full, darker inside and beneath."

## What Fable wants built
- One kind of tree, in the palette's autumn: copper, bronze, ember and a few toward flame and pale gold, each tree its own shade, never green. A short dark trunk with a few limbs, and a crown that is a real crown: built of many clumps of leaf, so its outline is broken and soft, with depth inside it (darker within and beneath, lit on the side toward the moon, which is behind the world to the viewer's right, and rimmed with a thin warm light where the city's windows are behind it).
- At the page's size a crown is about 16 pixels across: the belt must read as a soft mass of separate crowns, each a little different in size, shade and shape, one tree told from the next. At three times zoom a crown shows its clumps and leaves and its trunk, and is not a ball, a blob or a card.
- They stand on the ground: a soft shadow under each, and where crowns touch they shade each other.
- Leaves may move a very little in a slow air, by uniforms only (never by rewriting buffers), and are still when state.still is true.

## How
Three or four tree models made by your script (leaf clumps as small shaped cards or shells with a stored map of leaves written by your script, sorted so they do not flicker, cut out with alpha to coverage or alpha test so nothing sparkles), each given its stored light (how open each place is, darker inside), drawn many times with a transform, a shade and a phase for each tree as instance attributes that never change. lit(m, { key, baked: true, core: false }). Budget: 200,000 triangles drawn in all, 2 shader programs, 2 draw calls a model, 8 MB of textures. Nothing may shimmer when the page scrolls: check at --scale 1 and 2.

## First look, every round
npm run match -- --at 60,200,1260,130 --out shots/world/trees/match: the belt sits where the picture's does. Then npm run look -- only:trees, and the whole.
