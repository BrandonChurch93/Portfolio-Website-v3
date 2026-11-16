# The launch pad. Round 5 of the pass: one thing left, the ignition's build

## What you own
src/pieces/pad/ only. Stills in shots/pass/pad/ with the prefix r5-. Report: shots/pass/pad/r5-report.md. Read first: pass/common.md, shots/pass/pad/r4-report.md and its two reviews.

## Where it stands
Round 4 scored 6 and 6 and closed what it was asked to: the tower and the rocket's form are byte for byte git's, no fire is drawn over the sky, the burst no longer plays as the rocket settles back, the pale flood on the stone is gone, the plume is one smooth column with its throat and diamonds. ONE thing is still worse than git, and both reviewers and the builder say so. When it is closed the pad is committed. The site as it is in git is served at http://127.0.0.1:5331 .

Do not touch: the plume, the burst at the bell, the clip to the stone's disc, the gate on the launch's rising age, the tower, the rocket's form, the stone before the landing and its ring by ring fill.

## The one thing
IN MOTION, AT THE PAGE'S SIZE, THE IGNITION HAS LESS WEIGHT THAN GIT'S. From about 0.3 s to the lift almost nothing changes on the pad: the mean luminance under the table sits flat at 90 to 105 where git's climbs from 95 to 129, and the frames at 0.5, 0.9 and 1.2 s cannot be told apart. BRIEF.md, Contact, item 22: "Its fire is in the stream's colors, and it lights the stone." It must BUILD from the flash to the lift, and at every moment be at least git's under the table in real frames, while keeping what round 4 won (fewer pale pixels on the stone than git, the cuts brighter than the plate tops). How:
- Heat that SPREADS: from the column's strike on the boss outward through the cuts and the ring edges, a ring further every few tenths of a second, the innermost cuts near pale by the lift. You have 500 to 1,300 pale pixels of headroom under git at each time: spend them in the cuts.
- Tops stay dark UNDER THE TABLE too: at two times the cuts and the plate tops there are one light peach wash. Darken the tops locally so the carving's contrast holds where the light is strongest.
- The column out of the deck's hole is hidden by the middle front leg at the page's size: widen it or let its splash spread on the stone in front of the leg as a ring of heat that can be seen.
- The burst at 0.1 s reads as the deck's ring plate turning pale: it is fire leaving the bell's mouth.
- No soft orange wash on the plate tops right of the table at 1.1 s: flame runs in the cuts.

## And one housekeeping thing, before it can be committed
The pad's diff adds about 120 lines of comments (one line in index.ts is over 200 characters). The repo's rule is almost no comments: keep only a line that gives a reason someone could otherwise undo, and take the rest out.

## The proof
Real frames (npm run live) on /lab/contact from 0 to 1.6 s at 1440 by 900 and tablet-wide, git above and yours below at the same times, and the mean luminance under the table for each frame of both as a table: yours at or above git's at every time, and rising. The pale count on the stone at 0.6, 0.9, 1.1 and 1.4 s, yours under git's. Then say plainly at the top of your report: nothing here is worse than git. If you cannot say it, say what is.
