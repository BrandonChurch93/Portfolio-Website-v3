# Your part: the spire. Round 4

## What you own
scripts/world/parts/spire/, public/world/spire*.{bin,png}, src/pieces/world/parts/spire.ts, src/pieces/world/parts/spire/. Stills in shots/world/spire/ with the prefix r4-. Report: shots/world/spire/r4-report.md. Read first: briefs/spire-r3.md (which still holds), shots/world/spire/r3-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", all of it).

## Where it stands
Round 3 scored 6.5 and 6. Kept: the outline and the setbacks below the ring on picture 9's lines. The ring's place and tilt. The moonlit staircase of bevels down the right side with the left in shade, at the picture's value. On palette at every scale.

It is the centre of the whole picture, the thing his name stands over, and at the page's size the pale stepped tower and the gold point both take the eye before it does.

## Changed in the plan for you
Two low blocks that stood squarely before the podium and hid its portal are moved behind the spire (placed.ts). Nothing stands before the spire's foot now but trees: the lit portal must be seen down to the trees, as the picture has it. The rock, the land and the trees are all changing this round: a black still with no stats line means a file was mid write, take it again.

## What must change, most important first
1. THE TOP IS A LIPSTICK. Above the ring you have a straight shaft and a blunt cap with a gold collar: 15 picture pixels wide at 40 down, where the picture's is 3 or 4. Open shots/world/spire/r3-match-beside.jpg: the picture's spire draws itself thin all the way up, through the ring, in one long line to the needle. Taper it continuously from the ring to the needle (a tall, fine, faceted flèche, with its lit side and its dark side, slits of light in it, small set backs that read as detail and never as a cap), and lose the collar. Finer than the picture's, never blunter.
2. THE RING IS A WIRE. At the page's size it reads as a thin hoop, about half as thick as the picture's. The picture's is a broad flat band, like Saturn's ring: its upper face is seen as a wide ellipse, its inner edge and outer edge both plain, with the tower passing through it. Make it broad (about twice its present width as seen), so that at the page's size it is a band with a face. Keep it polished gold (he asked for shiny gold: the picture's is dull bronze, ours is better), with a highlight that ROLLS across the band and is never clipped flat for long runs (yours is flat at (249, 221, 189) over a sixth of its bright gold). The far half of the band passes behind the tower and is dimmer than the near half.
3. IT SPARKLES. A row of evenly spaced bright dots runs along the front arc's upper lip, and at scale 1 the whole ring breaks into beads. The front arc's outer edge steps at three times. Find the cause and remove it (a bead finer than a pixel must fade to its mean, an edge must be filtered), then prove it with real frames of the ring as it is at the end of this round, at the page's own size, in a slow scroll (npm run live).
4. THE BODY IS THE DARKEST TOWER IN THE SKYLINE. Its fronts are (65, 47, 32) against its neighbours' 89 to 119 in red, and one flat mid brown from foot to ring, so its lit window ladder is its brightest feature. Raise the stone toward the picture's mid tone and give the body its own range of value: each stage a little different, the set backs catching the moon on their tops, coursing and flutes deep enough to change value at the page's size, the fins plainly separate from the shaft.
5. A LIT LADDER. The windows are one bright slot down the middle. Spread brighter clumps of rooms onto the set backs and the fins' faces so it reads as a lit tower with people in it. Close up the lit rooms are flat one tone squares cut into 2 or 3 pixel slits by transoms: give each room depth behind the glass (a far wall, a ceiling's falloff, something in it) and keep transoms from slicing rows to slivers.
6. THE GOLD GRILLES repeat identically at every stage and their slats alias into uneven stripes: vary them stage by stage, and give a slat enough width to draw cleanly or fade it to its mean.
7. THE RING'S ENGRAVING reads as grime: make it read as engraving where it is seen at all (three times and closer), and gone below that.

## How to look
Every draft: npm run match -- --at 560,0,260,300 --out shots/world/spire/r4-match, then npm run look -- close:spire --w 1200 --h 1600, then the real page at its own size: npm run shot -- "/lab/hero?ui=0" --t 6 --wait 9000 and --scale 1. Squint at the last: is the spire what the eye goes to first?
