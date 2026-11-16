# The launch pad. Round 4 of the pass: three things put back, three faults closed, then it is committed

## What you own
src/pieces/pad/ only. Stills in shots/pass/pad/ with the prefix r4-. Report: shots/pass/pad/r4-report.md. Read first: pass/common.md, shots/pass/pad/r3-report.md and its two reviews, pass/pad-r3.md.

## Where it stands
Round 3 scored 6 and 6. The fire is at last plainly better than git, and both reviewers say so. Nothing is committed because three things are still worse than git or break the agreement. This round closes those and touches nothing else. The site as it is in git is served at http://127.0.0.1:5331 .

KEPT, by both reviewers, and not to be touched:
- the plume as one smooth column joined to the bell: the pale throat, countable diamonds, streaks, no clumps, holes, flecks or halo (PLUME, STREAK, CAP), at least as bright as git at lift
- the hard burst at the bell's mouth, held about 0.15 s, with the sky staying black (FLASH, FIRE.flash)
- the stone dark until the landing and lighting ring by ring, the readying in steps (READY), the tail tied to the climb (TAIL, tail()), the fire leaving with the rocket

## Put back exactly as git has it
1. THE TOWER'S ARMS (parts/tower.ts and its model: DRAW, swung, and anything else changed for them). Swung out they are plain dark boxes with flat copper squares for the rest of the visit, where git shows lattice trusses folded against the tower. A visible hinge needs Brandon's word and is not this round's. git show HEAD:<path> for each file, and prove it with a still pair that differs nowhere on the tower.
2. THE ROCKET'S FORM: round 1's changes to the fins, the fairing and the hatches in parts/rocket/form.ts and model.ts were never judged. Put both files back as git (keep only what the kept fire needs from them, and say exactly what that is).

## Close these three
3. THE STONE AT IGNITION IS A PALE SUNBURST, from 0.5 s to the lift: 30,093 pixels over luma 200 at 1.1 s against git's 12,341, the carving washed out. Contact's agreement, item 17: "The light runs in what is cut into it. It does not flood the stone one color." The heat is in the cuts and the rings, the plate tops stay dark, the carving reads. Fewer pale pixels on the stone than git at every time, with more contrast between cut and top. And no flat pale bar under the deck: a narrow column out of the deck's hole that splashes.
4. FIRE HANGS IN THE SKY. From 0.8 to 1.6 s orange tongues are drawn past the stone's far rim at both ends (r3-rv2-floating-tongue-x3.png). Clip the stone's fire (lick in fire.ts) to the stone's disc. Nothing of it over black sky.
5. THE BURST PLAYS AGAIN as the rocket settles back down when the page is scrolled up. It fires only while the launch's age is rising.
If time is left after those five, and only then: the plume's edge at three times (streaks that waver and taper, tongues joined at their roots, no thin dark line beside a tongue), and ignition that keeps building after the flash (it jumps to about 95 at 0.07 s and sits flat to 0.6 s where git climbs).

## The proof
Real frames (npm run live) on /lab/contact, git above and yours below at the same times, from 0 to 3.5 s and of the scroll back up, at 1440 by 900 and tablet-wide. The count of pixels over luma 200 on the stone at 0.6, 0.9, 1.1 and 1.4 s, yours against git's. A still pair of the tower at rest and after the launch.
State at the top of your report, for each of the five: put back, closed, or not, with the still that shows it. If all five are done, say plainly: nothing here is worse than git.
