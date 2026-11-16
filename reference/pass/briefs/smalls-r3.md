# The three small pieces (the CPU, the reflector, the studio light). Round 3 of the pass: keep four gains, put the rest back

## What you own
src/pieces/cpu/, src/pieces/reflector/, src/pieces/studio-light/ (and src/world/glint.ts if round 1 or 2 made it for these). Stills in shots/pass/smalls/ with the prefix r3-. Report: shots/pass/smalls/r3-report.md. Read first: pass/common.md, shots/pass/smalls/r2-report.md and its two reviews, pass/smalls-r2.md.

## Where it stands
Round 2 scored 6.5 and 6.5, and both reviewers again found things WORSE than git, so nothing of these three is committed. What is live is git's. The site as it is in git is served at http://127.0.0.1:5331 .

## Kept from rounds 1 and 2 (both reviewers), and not to be touched again
1. The studio light's lower barn door with the lamp low and left: a deep bronze sheet with its pressed panel and tight lit lines on the rolled edge and the hinge pins.
2. The copper line that travels along the reflector's tube and knuckle with the pointer, seen at 220 px.
3. The studio light's yoke and drum catching a line that moves with the pointer, where git held still (see 3 and 4 below for what is wrong with them).
4. The CPU's frosted copper etch, and the bezel's bloom spot gone.

## Put back or fixed, in this order. Each ends plainly better than git in real frames, or exactly as git
1. THE CPU'S LID IS WORSE THAN GIT. It is now a dark mirror crossed by a broad diagonal band that dims the top line of marks ("QX9 7480K"), and its upper half goes near black at common lamp places (0.3, 0.4 and 0.7, 0.6). QUALITY.md: "A reflection never puts its light and dark edge behind words." Put the lid's base back exactly as git has it (its even copper). If anything is added it is a clear coat with ONE tight highlight that never dims a mark. Prove it: the lid at nine lamp places (a 3 by 3 grid over the piece), git beside yours, and the contrast of the top line of marks against the lid at each: never under git's.
2. THE STUDIO LIGHT'S DOORS ARE DARKER THAN GIT with the lamp up and to the right (luminance 12 against git's 18 at lamp 0.62, 0.3: black silhouettes). Ease the cap on their reflected light so deep bronze still takes the room and the lamp in its own color. Measure the door region at the same nine lamp places: never under git's by more than one level.
3. THE WALL PLATE turns into an even pale tan flat square when the pointer is near the light's top (mean 100, 63, 34 against git's 50, 27, 8): the "lit board" fault again. Its face is as git's. A glint only on its bevel and its screws.
4. THE YOKE'S GLINT is a broad pale tan grey sheen over most of its top bar and reads as silver at three times: one narrow line, tinted to the palette's copper. THE DRUM'S glint is a wide band on the clear coat's pale sheen with the lamp low: a line. And with the pointer in the left 60 percent of the screen the drum shows no moving line at all in real frames on the page: make it move there too.
5. THE REFLECTOR'S GIVE at its strike shows on its own page and is lost on the real page under the stream's flash: make it read in place (real frames on /lab/skills), without making it a wobble.
Not this round: the dish's halo (his ruling), the CPU's near edge line.

## The proof
For every item: git above, yours below, at the page's size, from real frames on /lab/skills?ui=0 (npm run live with --move across the piece), and the nine lamp places on each piece's own page (/lab/piece/<name>?size=220&label=0&ui=0 with --lamp x,y and --png). Then frame times, fairly: build nothing in the repo. Take them on the dev server with only your files swapped in and out (git stash is NOT allowed: copy the git versions of your three folders to a scratch folder with git show, and swap by copying), three runs each way, with the lamp sweeping across About.
State at the top of your report, for each kept thing and each of the five: kept, fixed, or put back as git, with the still that shows it.
