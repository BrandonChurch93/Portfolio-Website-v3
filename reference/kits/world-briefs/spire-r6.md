# Your part: the spire. Round 6

## What you own
scripts/world/parts/spire/, public/world/spire*.{bin,png}, src/pieces/world/parts/spire.ts, src/pieces/world/parts/spire/. Stills in shots/world/spire/ with the prefix r6-. Report: shots/world/spire/r6-report.md. Read first: briefs/spire-r5.md, shots/world/spire/r5-report.md and its two reviews, and the END of briefs/common.md (all of it).

## Where it stands
Round 5 scored 7 and 6: still the nearest part to the bar. Kept: the outline, the ring's place and tilt, all within about 3 pixels of picture 9. The Art Deco build ("finer in form than the stepped tower"). The ring's palette gold at the page's size with the tower mirrored in it close up. The darker warm granite, with the moonlit staircase of ledges down the right. Windows lit by floors. On palette.

What the frame did for you: the cursor's place is given to every part now (world.uniforms.uPointer, PartState.pointer: see common.md), as you asked. The city round you is going warm again this round (every stone but the pale stepped tower's), so your granite, at saturation 0.3 to 0.36, will be "the coolest, least saturated thing in the skyline": warm it a few points with the city (toward 0.45), keeping it the darkest mass.

## What must change, most important first
1. THE RING SHIMMERS AND STEPS. At scale 1 its silhouette saw tooths and crawls from frame to frame, with dark speckle inside the band and dashes along both edges. Close up: broken dashed scratch marks on its face at the left end, a stippled dotted rim highlight, a fragmented streak where the tower's reflection crosses the shaft. Give its edges coverage from the shader's own derivatives (or more samples), and filter the reflection march and the plate joints so nothing breaks up below a pixel. Prove it with real frames at scale 1 in a slow scroll: one continuous gold band that does not move.
2. A HEAVY BAND, IN TWO TONES. At the page's size the ring is one tone and one width, where the picture's band shows its flat top and its inner face as two tones. Darken the inner face and the underside beside the lit top, so it reads as a thick flat band. At three times bring up what only shows at seven: the mirrored tower, a crisp horizon line across the band, and one hard narrow sheen on the bead.
3. THE CURSOR'S GLINT is a soft spot. With uPointer it can be right in any host: a crisp spark that travels round the band as the pointer crosses.
4. LIT BY A SOFTBOX. The piers measure 70 against 84 from left to right, and the uplit podium is brighter on the wrong side. The moon is low, behind and to the right: a crisp rim on every right hand edge and set back, the faces toward the visitor darker, a contact shadow under each set back and pinnacle, and the podium's uplight warm from below and within.
5. RULED GRAPH PAPER. The coursing is a fine, even, printed grid and the weathering does not read at three times. Vary a joint's strength and the courses' pitch block by block, fade joints on lit faces, and make the streaks under ledges and the grime at the podium's foot plain.
6. THE WINDOW STRIP still makes rune like shapes at scale 1 and its windows merge into blocks: finer windows, or filtered to warm bands of stipple at the page's size. The two bands of vertical fin slats read as "a glitch stripe": make them louvres.
7. THE GOLD FINIALS on the shoulders are "squeezed, melted teardrops on spikes" at seven times: cast forms with a collar, a bulb, a spike and crisp mouldings. And the bare stepped court disc with ruled radial lines at the foot: real paving, kerbs or steps with shadow.

## How to look
npm run match -- --at 560,0,260,300 --out shots/world/spire/r6-match, close:spire, the real page at its own size and at --scale 1, and real frames at scale 1 of a slow scroll and of the pointer crossing the ring.
