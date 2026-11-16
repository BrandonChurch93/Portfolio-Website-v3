# Your part: the land. Round 4: his dunes

## What you own
scripts/world/parts/land/, public/world/land*.bin and land*.png, src/pieces/world/parts/land.ts, src/pieces/world/parts/land/. Stills in shots/world/land/ with the prefix r4-. Report: shots/world/land/r4-report.md. Read first: briefs/land-r2.md and land-r3.md (which still hold for everything but the dunes' size), shots/world/land/r2-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", all of it).

Round 3 was stopped part way by Fable, because Brandon spoke again. Its work is in your files as it stood (the dunes at up to 30 units, a pale dune behind the tree line, the sand rolled over the rim): read all of it, make it, and take stills before you change anything.

## His words, about one hour apart, looking at the live site
First: "I think the sand dunes should be taller."
Then, after the dunes had been made about twice as tall: "The dunes are still not good enough, the shadows aren't hitting it right to make it look realistic and they need to be a lot taller."

So this round is two things, and they are the whole of it until both are right.

## 1. A LOT TALLER
- The tallest dunes stand about 60 units: as tall as a mid sized building beside them. Most stand 35 to 50. The small ones between them 15 to 25. The pale dune behind the tree line at the back right is among the tallest and is seen well over the crowns.
- A dune is a hill: a third to a half as tall as it is wide. With crests this high the dunes are few and great: five to seven of them fill the desert, overlapping, each climbing the back of the next, with little flat floor left between. The desert's skyline against the night is their crests.
- Keep his shape language, which he chose (shots/world/ref/dunes-he-likes.png: keep it open): a long sinuous knife crest, a broad convex back, a steep slip face. And picture 9's places: the desert's outline, and the great dark faces at about 1020 to 1080, 1100 to 1165 and 1195 to 1215 across (shots/world/grid-right.jpg is the picture there under a ruled grid).
- The steep side of a dune is the angle sand rests at, about 33 degrees (PROFILE.slip 0.66). Do not make them taller by making them steeper than sand can stand: make them wider at the base where they need it, and let them overlap.
- The twelve trees behind the dunes (placed.ts) stand on the plan's own older ground. If your sand now buries or hides them, say exactly where and by how much in units: Fable will lift the row. The buildings at the desert's edge keep their feet clear.

## 2. THE SHADOWS
What he saw, and Fable agrees: a pale plain with dark crescents let into it. Nothing threw a shadow ON anything. The dark of a slip face was one flat value with a hard outline all round, like a sticker. The lit sand was one value everywhere. So nothing said where the light was.

What the frame has done for you: THE MOON IS LOWER NOW, about 22 degrees over the world's right shoulder (MOONWARD in layout.ts is [0.86, 0.36, -0.28], and LIGHT.moon.power is 3.2). At that height a crest throws a shadow about two and a half times as long as the dune is tall. A 50 unit dune throws 125 units of shadow: across the floor and up the back of the next dune. Your make and your shader both hold the moon's direction: make sure both read the new one (a still Fable took after the change showed your dunes unchanged, so something of yours has the old direction stored).

What is wanted, all of it from that one light, behind the world and to the visitor's right:
- EVERY DUNE HAS A LIT SIDE AND A SHADED SIDE, and they are the same sides on every dune. The slopes that face right and back are in moonlight. The slopes that face left and toward the visitor are in shade. Turn the dunes so that both are well seen from the front: a crest running roughly away from the visitor, with moonlight on its right flank and shade on its left, shows the most form.
- LIT SAND IS NOT ONE VALUE. It is brightest where a slope faces the moon squarely, falls off smoothly as the slope turns away (it is the cosine of the angle to the moon: let it show), and is dim on flat sand, which the low moon only grazes. So a lit flank is a gradient from a bright shoulder under the crest to a dimmer foot.
- CAST SHADOWS. From each crest a long shadow lies to the left across the floor and climbs the next dune, its edge sharp near the crest that throws it and a little softer far from it. Where it falls on ripples its edge is broken by them. This is what he has not seen at all and what will make the height read. Your own ray through the dune field (landSun) can carry it: make it run far enough.
- SHADE IS DEEP AND ALIVE. Not one flat near black. In shade the sand is lit by what the lit sand beside it throws back (warm, strongest near a bright slope, falling off into the hollow) and a little by the night. So a shaded face is darkest in its deepest hollow and lifts toward its edges, and the sand's own ripples and grain are still seen in it, faintly.
- THE CREST LINE is a thin bright line of sand catching the moon along the knife edge, where the lit flank ends and the shade begins.
- The values he chose still hold where the moon strikes squarely and in the deepest shade: lit sand about (213, 157, 100) to (229, 175, 110), deepest shade about (48, 22, 9).

## What else, after those two
3. Clean at three times: no serrated row of pixels along a toe, no brush stroke grooves, no ragged dark tails off a horn, no specks.
4. The sand rolls over the planet's shoulder in a ragged scalloped lip, never a tray with a dark band of one thickness under it, and never overhanging the skin with a slot. The skin's builder is told to keep his top under your edge everywhere: say in your report exactly where your lower edge is.
5. The rest of land-r3's list (the turned down front edge as real broken stone, the paving varied by district, the ripples varied and bent round the dunes, sand drifting over the flags at the city's edge, the front strip pale stone, the cost on an iPad) only once 1 and 2 are right. Say plainly which you reached.

## How to look
Every draft: npm run look -- close:dunes --w 1500 --h 800 beside shots/world/ref/dunes-he-likes.png, then the overlay npm run match -- --at 880,160,420,170 --out shots/world/land/r4-match-dunes, then the REAL PAGE AT ITS OWN SIZE, which is where he looked: npm run shot -- "/lab/hero?ui=0" --t 6 --wait 9000 and --scale 1, cut to the desert. Ask of the last one, before anything else: from across the room, are these tall dunes in low moonlight, with long shadows? If a stranger would say "a flat beach with marks on it", it is not done.
