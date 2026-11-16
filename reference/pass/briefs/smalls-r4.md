# The three small pieces. Round 4 of the pass: put them back, and keep three moving lines

## What you own
src/pieces/cpu/, src/pieces/reflector/, src/pieces/studio-light/ (and src/world/glint.ts if it is still needed). Stills in shots/pass/smalls/ with the prefix r4-. Report: shots/pass/smalls/r4-report.md. Read first: pass/common.md, shots/pass/smalls/r3-report.md and its two reviews.

## Where it stands
Three rounds, and every one left something worse than git on pieces Brandon has seen and built on. Round 3: the barn doors glow by a constant emitter whatever the lamp does ("lit, not painted" failed), they are still under git at five readings, the kept low left door was weakened, and the CPU's top line of marks is under git's contrast at four lamp places. Nothing of the three is committed. What is live is git's. The site as it is in git is served at http://127.0.0.1:5331 .

Fable's ruling, as for the desk: the pass stops relighting these pieces. This round takes everything back to git except three small things that only ADD a moving light, and proves it with numbers.

## What is kept (exactly these, nothing else)
1. THE REFLECTOR: the copper line that travels along its tube and knuckle with the pointer.
2. THE STUDIO LIGHT: the one tight copper line on the drum, and the narrow copper line on the yoke, that move with the pointer across the whole sweep of the screen.
3. THE CPU: the bezel's hot spot gone, ONLY if that can be had with the lid, its marks and its etch exactly as git. If not, the CPU is git's entirely.

## What goes back to git, all of it
git diff HEAD -- src/pieces/cpu src/pieces/reflector src/pieces/studio-light shows every change. Put back: the barn doors (their material, LEAF_FILL, every cap), the wall plate, the CPU's lid and its frosted etch and its near edge, the reflector's give (it went from 2.4 degrees at 9 Hz to 16 degrees at 0.9 Hz: BRIEF.md says it "gives a degree or two", and that stands), the dish, anything else. If a file ends identical to git, good.

## The proof
For each piece, on its own page (/lab/piece/<name>?size=220&label=0&ui=0 --png) at a 3 by 3 grid of lamp places, git (5331) beside yours (5330): the difference picture, and per region (for the studio light: each door, the wall plate, the drum, the yoke. For the CPU: the lid, the marks, the bezel, the board. For the reflector: the dish, the rim, the arm) the mean and greatest difference in levels. OUTSIDE the three kept things the mean difference is under 1.5 levels and nothing over 12, at all nine lamp places. Then real frames on /lab/skills?ui=0 of the pointer crossing each piece, git above and yours below: the lines move, and the strike of each piece is frame for frame git's.
State at the top of your report, for each of the three kept things: kept, or put back, with the still that shows it. If all is done, say plainly: nothing here is worse than git.
