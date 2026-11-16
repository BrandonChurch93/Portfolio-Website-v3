# Your part: the land. Round 7: round 4's dunes, kept, and made better where they are weak

## What you own
scripts/world/parts/land/, public/world/land.bin and land-*.png, src/pieces/world/parts/land.ts, src/pieces/world/parts/land/. Stills in shots/world/land/ with the prefix r7-. Report: shots/world/land/r7-report.md. Read first: shots/world/land/r6-report.md and its two reviews (r6-report-review-1.md, -2.md), shots/world/land/r4-report.md, and the END of briefs/common.md.

## Where it stands, and a ruling
Brandon's words on the dunes, which lead every round: "The dunes are still not good enough, the shadows aren't hitting it right to make it look realistic and they need to be a lot taller."
Round 4 answered them and is what is live and in git: tall dunes with knife crests between a bright flank and a deep dark one. Round 5 lost that. Round 6 put the light back and capped the great dune at about 42 units so that the row of trees behind could be seen whole: beside round 4 on the page (shots/world/land/r6-22-beside-r4-page.jpg) it is a lower, flatter desert with ragged dotted crests, and Fable did not keep it. It is on the branch kept/land-r6 (git show kept/land-r6:<path> reads any file of it), and YOUR WORKING FILES ARE ROUND 4'S AGAIN, as git has them.

FABLE'S RULING, which you asked for: his word that the dunes are a lot taller stands over the picture's row of trees. No dune is capped for the row. The tallest stands about 60 units as round 4's does. The row behind is seen where the dunes leave it room, through a saddle between two of them, and may be partly hidden: say in your report which of its trees can be seen.

## Start from round 4 and change only these, most important first
1. NO DOTTED CRESTS, EVER. Round 4's crests are clean and stay clean. Round 6's frayed into a comb of bright teeth along D and B that showed as a dotted line at the page's size, and three tries to fade them failed. Whatever you add, a crest is one clean line that cannot shimmer: fade the lit back's light by the crest's width on screen (common.md, thin lit edges). Round 4 has one fault of this kind already, a faint dotted outline on the largest dune's dark face (shots/ship/0545-hero-700.jpg on this machine, at the right): take it out.
2. A SLIP FACE IS A SCOOPED BOWL, NOT A FLAT BROWN. Darkest right under the crest, lifted toward the toe and the horns by what bounces off the lit floor, with soft avalanche chutes, and still near black: his "deep hollow face in full shadow". Round 6's dark flanks were four to six times darker than the lit backs on every dune: keep that ratio.
3. CAST SHADOWS. Each crest throws a long shadow across the lit sand beyond it (the moon is 22 degrees up: two and a half times the crest's height), as dark as the slip face that throws it, with a soft far edge. Open lit sand between dunes for the shadows to lie on.
4. THE SAND'S COLOR RUNS. The lit sand is one apricot everywhere (green over red 0.67). The brightest backs and crests run to pale gold, about (220, 170, 110), green over red near 0.77, as picture 9's, picture 4's and his own picture do.
5. THE RIM. Under the dunes the sand's skirt on the planet's side reads as icing dripping down a cake (regular scallops over a pale line, in the same still). Round 6 had the rim right, with no curb and no trough: bring that, with the sand coming down to meet the stone at its own level, and no raised rolled band like a pie crust.
6. THE CITY'S LIP AND FLOOR. The lip is neat courses of small bricks with a moulding under grey crazed paving: the planet's broken stone with chipped edges and rubble, as picture 9 has it, and real slab paving with joints that catch the moon, warm and not grey.
7. RIPPLES are one wavelength and one wander everywhere, a texture laid on: bunch and turn them round each horn, thin them toward crests, more than one scale.
8. THE PALE DUNE BEHIND THE ROW spans about 1078 to 1142 across with its top at 225 down in picture 9, with a gap of sky right of the row. No flat cut shoulder and no vertical seam on it.

## Budget
Round 6's file was 1.12 MB where round 4's is 2.73: bring that saving with you. 1.3 MB for land.bin at the most, 100,000 triangles, 1 draw call. The close view measured 32 to 51 ms a frame against 17 with the land off: find what costs it and say.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000) cut to the dunes and laid beside round 4's (shots/world/land/r6-22-beside-r4-page.jpg has it at the left). Then close:dunes at three times. Then real frames of a slow scroll past the dunes (npm run live): nothing on a crest crawls. From across the room: his tall dunes, each a bright back and a deep scooped hollow, throwing long shadows on open sand.
