# Your part: the city. Round 9: gold that blazes, his crown with its steps, and a city of more than one material

## What you own
scripts/world/parts/towers/, public/world/tower*.bin and towers*.png, src/pieces/world/parts/towers.ts, src/pieces/world/parts/towers/. Stills in shots/world/towers/ with the prefix r9-. Report: shots/world/towers/r9-report.md. Read first: shots/world/towers/r8-report.md and its two reviews (r8-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands (round 8 is committed: git has it, so you can always get back to it)
Round 8 scored 6 and 6, and Fable kept it: the turn that shows every building's right face is ruled in. For the first time the city reads as solids with two faces, and at three times (r8-final-close-crown.png) it is close to something to be proud of. Kept, and not to be lost: the turn and the two faces. His stepped tower as it is (limestone at (147, 135, 127), straight polished reeds, a bay with depth). The carved sun disc and the gold cap. The city's directional light with its fall and the neighbour's shade at each building's foot. Every named top on picture 9. 245,314 triangles, 3 draw calls, 3 programs, 3.18 MB.

Fable, with r8-final-picture-r7-r8.jpg and r8-final-gold.jpg open (the page at its own size): two things went backward while the city went forward, and both are the gold he cares most about. They come first.

## What must change, most important first
1. HIS CROWN HAS ITS STEPS AGAIN. At the page's size the stepped crown is a pale soft cone, (223, 178, 121), where round 7's was gold with a dark line under each step and picture 9's is (144, 107, 62). Brandon approved this tower by name ("looks way better" than the picture's): it may be made better and never paler. Bring its tone back to round 7's at the page's size, each step read with a dark line under it, the reeds polished, nothing washed. Show it beside round 7's and the picture's at the page's size and at three times.
2. THE OBELISK IS THE BRIGHTEST GOLD ON THE SKYLINE. It measures (131, 107, 76) against the picture's (179, 155, 106) at 466,80 and reads as matte tan stone, weaker than round 7's. Polished METAL.gold, two faces that differ plainly (a lit one and a deep one), a gradient up its height, the moon's own reflection as a streak on the lit face. There is no bloom in the frame and there will not be: the blaze is contrast, a bright face against a deep one and a dark sky. The round 8 panel for it in r8-final-gold.jpg was empty: this time it is shown.
3. LIT FACES DO NOT CLIP. Right faces and the obelisk go to a flat cream plateau (about 250, 222, 190) with vertical smears, and windows on them stretch into bars. Roll the highlight off well below the cap, and take out or bake the per vertex term that streaks down long faces. The new broad gold sheen washes the sun disc's carving to a flat peach coin when the cursor is near: cap the sheen by the face's relief so the carving always reads.
4. MORE THAN ONE MATERIAL. Apart from the gold and his limestone the whole city is one cast tan copper clay. A stranger should be able to name bronze, glass and two or three stones: glass curtain walls on some towers that mirror the night (night.ts), the two drums banded in METAL.bronze as the picture's bright copper rings, a darker and a paler stone among the tan. Warm all of it: nothing reads as steel or blue grey. Whether his tower's limestone stays cream grey is Brandon's, so leave it exactly as it is.
5. DEPTH AT A GLANCE. At the page's size the back rows are as bright and warm as the front. Darken and cool them a little with distance until the fall from front to back reads at once, with the front row plainly the brightest.
6. WINDOWS. Lit windows come in square islands that read as pixel letters or QR codes (the dark tower right of the obelisk, the sun disc tower's shaft, his bay). Light them by floor and by tenant in horizontal runs with ragged ends, some floors dark, a few bright. Pale cornice and belt ticks dash at three times: fade a tick as it thins (common.md, thin lit edges), and do the window jambs you left.
7. THE TWINS. The two cream stepped cap towers right of the ringed drums are one design side by side: change one.

## Budget
3.3 MB and 260,000 triangles at the most, 3 draw calls, 3 programs.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000), cut to the city and laid under picture 9 and round 8 as r8-final-picture-r7-r8.jpg was. Then close:crown and close:city at three times. Then the lamp at two places over the sun disc. From across the room: a luminous city of solids in more than one material, whose gold marks are the brightest things on it.
