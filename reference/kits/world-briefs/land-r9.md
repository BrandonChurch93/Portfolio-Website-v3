# Your part: the land. Round 9: round 7's desert, with crescents that keep it pale

## What you own
scripts/world/parts/land/, public/world/land.bin and land-*.png, src/pieces/world/parts/land.ts, src/pieces/world/parts/land/. Stills in shots/world/land/ with the prefix r9-. Report: shots/world/land/r9-report.md. Read first: shots/world/land/r8-report.md and its two reviews (r8-report-review-1.md, -2.md), r7-report.md, and the END of briefs/common.md.

## Where it stands, told plainly
Brandon's words on the dunes lead every round: "The dunes are still not good enough, the shadows aren't hitting it right to make it look realistic and they need to be a lot taller."
What is live and in git is ROUND 7, and your working files are round 7's. Round 8 was not kept and is on the branch kept/land-r8 (git show kept/land-r8:<path>). Open shots/world/land/r8-6-beside-r7-page.jpg (round 7 left, round 8 right, at the page's size): round 8 made real crescents at three times, and on the page the dark faces grew to 45 percent of the desert against picture 9's 17 (near black 42 percent against 1.5), so the desert went dark, and a black comb of about 25 saw teeth stands at the foot of the great dune's face. Fable's ruling, which round 8 asked for: THE DESERT STAYS PALE. Dark faces are a fifth of the desert's area at the most, at the page's size.

## What is asked, most important first
1. NOTHING FLIPS FROM PIXEL TO PIXEL. Find first what makes a comb or a speck: a march over the height grid (the moon's ray, landClear, the crest search, SLUMP or LOBE) whose answer flips between neighbouring pixels. Round 7 has 176 specks along the great dune's near horn and at summits, and round 8's comb is the same fault grown. Fade every lit or dark term across a seam by its width on screen (fwidth, over a pixel and a half) and never by a test. Show a count of specks before and after, and real frames of a slow scroll (npm run live) with nothing crawling. This alone is worth the round.
2. CRESCENTS THAT KEEP IT PALE. His own picture is shots/world/ref/dunes-he-likes.png (do not commit it): small crisp crescent bowls on a pale plain. From round 8 bring the horns that come forward and down to the floor, on the two front dunes and the great one, with each dark face SMALLER than round 7's, not larger: shorter, or turned less toward the visitor. Heights stay (the great dune about 58). No curled lip at the great dune's right end.
3. A FIELD AND NOT FOUR HILLS. Picture 9 has seven or eight bowls in two or three ranks going back with pale floor between. Add small crescents and swells between and behind the great ones, with open lit sand for the cast shadows to lie on.
4. CRESTS are a knife edge with no width in the middle of each crescent, drawn without stair steps at the page's size (round 8's were a rounded pale fillet two to three pixels wide).
5. THE RIPPLES are one wiggly pattern at one spacing, contour lines close up: asymmetric, branching, bunched round the horns, thinned toward crests. The raised band with a grey trough along the front right rim goes.
6. THE CITY'S FRONT STRIP between the pyramid and the desert is one flat grey brown band with a ruler clean edge: broken warm stone ground with relief and a ragged lit lip, slabs whose joints and faces vary under the moon.
7. THE SHELF under the row of trees gets a dune's back with a crest in place of a straight cut edge.

## Budget
1.3 MB for land.bin, 100,000 triangles, 1 draw call. Say what the shader costs a pixel (texture reads and loop steps): the close view measured 60 to 68 ms a frame under load against 16.7 with the land off.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000) cut to the dunes and laid beside round 7's, with the share of the desert box (960 to 1240 across, 255 to 295 down in the picture's pixels) that is dark. Then close:dunes at three times, then real frames. It is kept only if it is plainly better than round 7 at the page's size.
