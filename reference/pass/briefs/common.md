# What every builder on the section pass is told

Brandon asked for "one more pass ... the whole entire website section by section. figure out where you can make improvements on the 3D assets, overall user experience, animations, user interface, micro interactions". A critic looked at each section and a second reader checked every proposal against his rulings. The whole list is reference/pass/findings.md. You are given a few of its items, for ONE 3D piece, to make.

## Read first
- QUALITY.md: the two questions, the six tests, "Fail on sight", "How to judge", and the section about your part of the page. Open the images it lists for your piece.
- BRIEF.md: grep for your piece and your section under "## Settled" and read every line about them, and "## Dropped". BRIEF.md is the only source of rules. What he has ruled may not be changed, and your brief says which rulings stand over each item.
- reference/pass/findings.md: your section.
- CLAUDE.md's "Where things are" row for your piece, and the kit it was built from in reference/kits/ if it has one.

## Hard rules
- Change only the files your brief names. Nothing else in the repo: not the page's layout, not the stream, not the content, not another piece.
- An item marked "needs his word first" in the findings is NOT yours to build, however good it looks.
- Keep what the findings call strongest in your section exactly as it is. Take stills of it before you change anything and again at the end, and show them side by side in your report.
- NEVER run npm run build, npm run dev, next build or next dev, and never kill or restart a server. A dev server is shared on port 5330 by a dozen builders: the repo's scripts use it by themselves. Never write into .next.
- Commit nothing, push nothing, stash nothing, reset nothing.
- Colors are the palette's only (src/config/palette.ts). No white, no blue, no yellow gold. Nothing blooms at rest. No soft round spots of light.
- Every animation reads time from the one clock (src/world/clock.ts), so a frame can be frozen for a still.
- Safari ends a page for memory. A buffer rewritten every frame costs 100 MB or more there whatever its size: anything that moves, moves by uniforms, textures or instance attributes set once. A piece draws only when something changed.
- The line of light that runs down the site is the stream. Never call it anything else, in code or in words.
- TypeScript strict. Almost no comments: one only where it explains a reason someone could otherwise undo. Each constant defined once. No em dashes in comments or documents.
- The machine is busy: one browser at a time. A still that comes out black or with a part missing usually means another builder's file was mid write: take it again.

## How to look (read the tops of the scripts for their options)
- npm run shot -- <route> ... : a still. Your piece alone is at /lab/piece/<name> (?size=<px> draws it at the size it has on a page, ?only=<part> where a piece has parts). In place: the section's own page, and /lab/whole?ui=0 scrolled to it.
- npm run strip -- <route> --times ... : a filmstrip under a frozen clock.
- npm run live -- <route> ... : real frames of something that changes on a press, a scroll or the pointer. Anything that answers the cursor or the stream is judged from these, not from a filmstrip.
- npm run perf -- <route> : frame times. Hold what the piece held before you began: measure before and after.
- Judge at the page's size first, then at three times.

## Your report
Write it to the file your brief names. Lists, plain words. For each item: what it was (a still), what it is now (a still), whether it is at the bar and what is still short, said harshly. Then what you measured (frame times before and after, triangles, programs, textures), every file you changed, and anything you need from the page or the frame. Your final message is at most twelve lines: the three stills to open first, your verdict, the largest shortfalls.
