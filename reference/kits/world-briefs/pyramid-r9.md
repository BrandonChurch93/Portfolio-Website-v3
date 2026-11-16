# Your part: the pyramid. Round 9

## What you own
scripts/world/parts/pyramid/, public/world/pyramid.bin, src/pieces/world/parts/pyramid.ts, src/pieces/world/parts/pyramid/. Stills in shots/world/pyramid/ with the prefix r9-. Report: shots/world/pyramid/r9-report.md. Read first: briefs/pyramid-r8.md, shots/world/pyramid/r8-report.md and its two reviews, and the END of briefs/common.md (all of it).

## Where it stands
Round 8 scored 6 and 5.5, and Fable, with r8-beside-page.jpg open, puts it higher: it blazes now, and it reads as gold a jeweller made, where the picture's is a white glare. Kept: the blaze as the moon's own reflection, pale gold over three quarters of the lit face. The deep face near black at its top with one band seen at the page's size. The cap as a stone with no round spot. Long sheets, no brick, no ribbing at the page's size. The crisp reveal, the bevelled arrises, the plinth's pale lines. On palette. The cost.

## The plan changed: make it again first
A reviewer measured the dark face's left outline up to 28 pixels inside the picture's. Fable fitted the pyramid again to the picture's apex, front corner, right corner and left outline together (PYRAMID in layout.ts: x -351.4, z 357, base 180.8, tall 108.9, turn 53.2). Its dark face is broader now and its left corner about 15 pixels further left. Make it again, lay it over the picture (npm run match -- --at 200,150,330,180 --out shots/world/pyramid/r9-match), and say where each of the four points lands.

## What must change, most important first
1. A PLATEAU OF PEACH. The lit face's red is 246 to 253 from the reveal to the foot: its "fall" is only green and blue rising, a soft chroma gradient that reads as peach lacquer and "never washed pale" (QUALITY.md). It needs LIGHT AND DARK inside it: about a third of the face well under full value. The way that is true to polished metal: the face mirrors two things with a crisp boundary between them, the bright (the moon's reflection, the lit land) and the dark (the night sky above the land). Put that boundary across the face as a sharp, slightly bowed edge, so the face is two fields of value, the blaze in the lower and nearer one, and a deep saturated gold above it where it mirrors the dark sky. Then it reads as a mirror, and it beats the dunes and the obelisk as the first stop for the eye.
2. THE DEEP FACE IS THE WRONG METAL. Its hue is about 26, the palette's deep bronze: "chocolate bronze siding". It is the same gold in shade: hue 31 to 33, deep and saturated. And at three times it shows alternating tone rectangles in horizontal courses, "planks": break that rhythm or bring the tone between cells under what shows at the page's size, on both faces.
3. FEW, QUIET, SHARP. Nothing of the lit city is mirrored in the deep face, only soft smudges of trees at its foot that read as dirt. A few dim, sharp reflections: a tower's dark outline, three or four window lights, the tree line as a crisp dark band. Sharper and fewer.
4. THE CURSOR'S STREAK is a full height even bar on the deep face that reads as a third arris, bows at some pointer places (with the lamp at 0.4, 0.6 it is "a curved rib or draw error"), and cannot be seen on the lit face. Shorter, tapered at both ends, straight at every pointer place, seen on both faces. The cursor's place is given to you exactly now (world.uniforms.uPointer). Check a sweep of eight or more pointer places in real frames.
5. THE CAP's band is a horizontal rectangle with square ends that stops short of both arrises: "tape". It is the mirrored horizon: grade its width and brightness and run it out to the arrises.
6. HOLD THE FIRST PLACE. The gold obelisk straight above it on the page measures the same pale. The city's builder is told to keep the city's gold under the pyramid's this round. On your side: the lit face's heart is the one thing on the top of the world that reaches the palette's pale.

## How to look
The real page at its own size first: npm run shot -- "/lab/hero?ui=0" --t 6 --wait 9000 --scale 1. Then beside the picture, then three times, then real frames with the pointer moving.
