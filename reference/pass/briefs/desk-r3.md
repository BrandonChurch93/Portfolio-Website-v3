# The desk. Round 3 of the pass: put it back, and keep two things

## What you own
src/pieces/desk/ only (and src/world/tone.ts ONLY if round 1 or 2 changed it for the desk: put that back). Stills in shots/pass/desk/ with the prefix r3-. Report: shots/pass/desk/r3-report.md. Read first: pass/common.md, shots/pass/desk/r2-report.md and its two reviews.

## Where it stands
Two rounds, and each made things worse on a piece Brandon has approved and whose look at the page's size the critics called "Strongest, do not touch". Round 2's reviewers found, against git: the PC's glow on the floor cut to a thin line, a jagged dark fringe along the top's underside in WebKit, the left half of the desk 10 to 14 levels lighter and washing the keyboard and mouse, the tablet's shadow on the mat gone, dotted shadow noise on the mat inside the lamp's pool, a pale soft patch on the front left corner. Nothing of the desk is committed. What is live is git's.

Fable's ruling: the pass stops trying to relight this desk. This round takes everything back to git except two things that both reviewers found plainly better, and proves it with numbers.

## What is kept (exactly these, nothing else)
1. THE KEYBOARD'S CUT EDGE as warm satin, and the spill written without the pointer's heat (TRAIL at its 40 mm reach): no white line, and no pale halo by the keyboard in WebKit or Chromium. (The halo was in git too.)
2. THE FLOOR WHOLE OVER THE DESK'S FOOTPRINT, so the front left foot stands on lit floor with its leg's shadow and the desk's shadow crosses the word. ONLY if, with everything else back as git, it differs from git nowhere but there. If keeping it needs any other change to the floor's falloff, put the floor back as git too and say so.

## What goes back to git, all of it
git diff HEAD -- src/pieces/desk shows every change. Put back: the lamp's pool (its cone, its aim, its strength, deskLamp.shadow.radius and POOL), the rim light from behind before the strike (and anything added for it: lights, programs, src/pieces/desk/room.ts if nothing else needs it), the floor's falloff apart from item 2, the PC's glass edges, the PC's glow on the floor, the mat, the headphones, the mouse, the tablet, the keys' lift. If a file ends identical to git, good.

## The proof
The site as it is in git is served at http://127.0.0.1:5331 . Take the same stills from it and from the dev server (http://127.0.0.1:5330): /lab/skills?ui=0 at scrolls 330 and 560 with --t 20 --wait 3000, at 1440 by 900 (scale 2) and tablet-wide, with --lamp 0.5,0.5 and --lamp 0.2,0.3, all with --png. And the desk before the strike (?lights=0 on /lab/piece/desk). For each pair write the difference picture and print, per region (floor, top left, top right, mat, keyboard, PC, word), the mean and the greatest difference in levels. OUTSIDE the two kept things the mean difference must be under 1.5 levels and nothing over 12. Then the same pair in WebKit at the iPad's size (scripts/mem.mjs and scratch tools/wkcheck.mjs show how WebKit is opened): no fringe along the top's underside. Then real frames of the strike (npm run live) from both: the order and timing of the lights is git's.
State at the top of your report, for each of the two kept things: kept, or put back, with the still that shows it.
