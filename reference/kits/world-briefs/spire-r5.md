# Your part: the spire. Round 5

## What you own
scripts/world/parts/spire/, public/world/spire*.{bin,png}, src/pieces/world/parts/spire.ts, src/pieces/world/parts/spire/. Stills in shots/world/spire/ with the prefix r5-. Report: shots/world/spire/r5-report.md. Read first: briefs/spire-r4.md (which still holds), shots/world/spire/r4-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", all of it: the moon is lower and stronger now).

## Where it stands
Round 4 scored 7 and 6: the nearest part to the bar. Kept: the outline from needle to podium within about 3 pixels of picture 9, with the flèche on the picture's taper ("the most elegant line in the city"). The ring's place, tilt and broad band, free of beads. The moonlit staircase of ledges and finials down the right side with the left in shade. On palette.

## Decided by Fable, since both reviewers asked
ONE CITY, TWO STONES THAT BELONG TOGETHER. The towers' stone is being brought back this round to the pale, nearly neutral limestone Brandon approved on the stepped tower (lit piers about (150, 138, 124), saturation 0.17), under the rule "only metal and light are saturated: every stone sits at a saturation of 0.15 to 0.35". The spire is the city's oldest and tallest building, in a darker stone, as picture 9 has it: a warm grey brown granite. But at half the value of the tower beside it and a warmer hue it reads as "a different material dropped into the city". So: its stone comes down to the same rule (saturation 0.2 to 0.35, no orange), and up in value: its moonlit faces about two thirds of the limestone's (about (104, 92, 80) to (120, 106, 92)), its fronts about (78, 66, 56), its shade darker. Darker than its neighbours, plainly of the same world.
The trees that cut the podium off at its doors are taken out (placed.ts): the portal runs down to the paving now.

## What must change, most important first
1. THE WINDOWS SPELL LETTERS. The lit windows in the central strip come in contiguous blobs that read as glyphs at the page's size (a "2", an "L", an "S"): a noise threshold showing. Light them as a building is lit: whole floors, and short runs of a floor, across the strip, with varied warmth and a few single rooms. And each pane is one flat tile: a room behind the glass (a far wall, a floor line, the frame's shadow on it).
2. THE RING IS BRASS, AND ALMOST PLASTIC. A smooth satin gradient that mirrors nothing, mean (120, 87, 48) at the page's size, an unornamented hoop. He asked for shiny gold. Polished gold mirrors: the lit city below as a warm band on its underside and inner face, the night above as near black on its top, a narrow hard sheen from the moon where the band turns to it, and the tower's own shadow where the ring passes behind the shaft, with the ring's shadow lying across the shaft. Segment joints every so often round it, as a thing that was made.
3. ONE BAND AT THE PAGE'S SIZE. At scale 1 the ring's face is darker than its edges and the edges break into dashes on the diagonals, so it reads as two thin wires, and the inner lip steps with a short dotted bright run on the far right arc. Filter the edges, lift the face.
4. THE CURSOR'S GLINT on the ring cannot be seen in real frames. A small, bright, moving highlight on the band that is plainly seen as the pointer crosses, and does not clip into a long flat line. The moon stays the fixed light.
5. CLEAN CG. The flèche's faces, the fins and the podium are one smooth tone at three times. Course joints, value from course to course, weathering: dark streaks under ledges and finials, a darker band at the podium's foot, stone that differs block to block. As much to find as the stepped tower's coursed piers.

## How to look
Every draft: npm run match -- --at 560,0,260,300 --out shots/world/spire/r5-match, npm run look -- close:spire --w 1200 --h 1600, then the real page at its own size and at --scale 1. Real frames of the pointer crossing the ring.
