# Your part: the pyramid. Round 14: polished, not painted

## What you own
scripts/world/parts/pyramid/, public/world/pyramid.bin, src/pieces/world/parts/pyramid.ts, src/pieces/world/parts/pyramid/. Stills in shots/world/pyramid/ with the prefix r14-. Report: shots/world/pyramid/r14-report.md. Read first: shots/world/pyramid/r13-report.md and its two reviews (r13-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands (round 13 is committed: git has it, so you can always get back to it)
Round 13 scored 6 and 5.5 and Fable kept it: at the page's size (shots/world/pyramid/r13-beside-page.jpg: round 12, round 13, picture 9) the wedge is gone and the whole lit face is bright gold. Kept, and not to be lost: the clean split between the faces (lit about 0.95, deep about 0.30) with nothing cast across the lit one. The capstone: a crisp dark reveal, a pale lip along its foot, a pale line on its arris, two faces that differ. The one pale gold line down the front arris. Hue 32 to 35, no yellow, no white, nothing clipped over an area, no banding. The cursor's streak on the deep face. The place, the mesh, the cost (23,508 triangles, 2 calls, 2 programs, no textures, 0.14 MB).

Fable, with that still open: beside the picture ours is satin gold PAINT. The picture's face is a mirror in a glare: it runs from a blaze near white gold at its lower right, along the arris and the foot, to a deep gold at its upper left, and that run is what says polished metal. Ours is one value (0.86 to 0.98 over nine tenths of it) with no edge inside.

## What must change, most important first
1. THE LIT FACE HAS A RUN AND AN EDGE IN IT. Both reviewers, in the same words: one long, crisp feature inside the glare that reads at the page's size and slides with the cursor. The glare itself is a lobe, strongest low and toward the arris, falling to deep gold toward the upper left corner (the picture's own run, about three to one across the face, never to brown). In it one sharp edged thing a mirror would show: a clean dark band of night sky over a bright horizon, or the soft dark uprights of the towers behind the visitor. No hotspot (round 11's mistake) and no wedge (round 12's): a broad run with one crisp edge.
2. THE DEEP FACE IS DEEP SATIN GOLD, NOT KHAKI. It is a flat brown band (value 0.20 to 0.39) with nothing mirrored above its foot. Give its body a soft mirrored gradient: the city's warm glow low, the night above. The mirrored crowns at its foot are grey taupe lumps that read as rocks or pinecones at three times and as a band of brown lumps at the page's size, and they float a course above the foot: either they are unmistakably the trees (round, the real crowns' orange times gold, seated on the foot line, each meeting its own tree) or they go, and the face mirrors the city's lit windows, blurred.
3. TAKE OUT WHAT READS AS A GLITCH. The mirrored skyline at the lit face's foot is a ragged stair stepped stripe that breaks at every sheet seam and cannot be seen at the page's size: one continuous antialiased silhouette that reads at the page's size, or nothing. The dark line between the lit face and the foot course breaks into dashes along the whole front foot (common.md, thin lit edges): fade it as it thins or make it a unit and a half wide.
4. THE SHEETS. At three times the upright joints are staggered row to row as brick is laid, with jumps of about 20 levels between neighbours: long sheets, joints that run through from course to course, and jumps of a few levels.
5. THE CURSOR ON THE LIT FACE. It does not answer the cursor at all (a lamp at 0.31, 0.91 gives the same still as none). A sharp glint that slides, read from world.uniforms.uPointer. The still scripts hold the lamp with --lamp x,y: if the world's pointer does not follow that, say so in your report and show real frames (npm run live) instead.

## Budget
As it is: 2 calls, 2 programs, no textures, 0.14 MB.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000), cut to the pyramid and laid beside round 13's and picture 9's as r13-beside-page.jpg was. Then close:pyramid at three times. Then three lamp places. From across the room a stranger says "polished gold", not "gold paint".
