# The launch pad. Round 6 of the pass: three things, and then it is committed

## What you own
src/pieces/pad/ only. Stills in shots/pass/pad/ with the prefix r6-. Report: shots/pass/pad/r6-report.md. Read first: pass/common.md, shots/pass/pad/r5-report.md and its two reviews (r5-report-review-1.md, -2.md).

## Fable's ruling on what round 5 asked
Round 5 asked the frame to choose between git's weight under the table, round 4's contrast there, or a change to the white balance. The ruling: ROUND 5'S STATE STANDS. Under the table it has git's weight and more contrast than git (cut against top 1.24 against git's 1.11), it builds from the flash to the lift, and it has fewer pale pixels on the stone than git at 0.6, 0.9, 1.1 and 1.4 s. That is not worse than git anywhere a visitor can see, and the pad is judged against git, not against round 4. The white balance is not changed. Do not rework the ignition's light again.

Do not touch: the ignition's light on the stone as round 5 has it, the plume, the burst, the clip to the stone's disc, the gate on the launch's rising age, the tower, the rocket's form, the stone before the landing and its ring by ring fill.

## The three things that are still worse than git, and only these
1. FRAME TIMES. In five of five paired runs through the ignition the new pad had more frames over 25 ms than git (22 against 0, 74 against 26, 10 against 1, 12 against 0, 33 against 23). The suspect is the ten step shadow march in the stone's shader (`cast`) and `low`. Take the march out, or cut it until paired runs are level with git, and show the pairs: the same scripted scroll onto the stone, git (http://127.0.0.1:5331) and yours, three pairs each at 1440 by 900 and at an iPad's size held sideways with ?handheld=1. If the machine is too busy to tell, say so plainly and take the march out anyway: a look that cannot be shown to be free is not kept.
2. FADE. It went from 90 to 170, which nobody asked for: the stone stays hot after the lift (105 against git's 72 at 2.4 s at an iPad's size) and that changes how the launch ends. Put it back to 90.
3. THE COLUMN OUT OF THE DECK'S HOLE is less visible than git's over the middle front leg (2,366 pale pixels against 2,952 at 0.9 s at three times). At least git's visibility at the page's size, by moving its brightest part off the leg's silhouette. Nothing else about the column changes.

## Housekeeping
Lines of 200 characters and more in fire.ts, stone.ts and stone/material.ts (the `sEmit` and `sRoomK` lines, the color line, the `steady` line) are broken up so the shader can be read. No new comments.

## The proof
At the top of your report, for each of the three: done, with the still or the table that shows it. Then real frames (npm run live) on /lab/contact from 0 to 2.6 s at 1440 by 900 and at an iPad's size, git above and yours below, with the mean under the table and the pale count per frame as round 5's tables had them: unchanged from round 5 up to the lift, and git's own fall after it. Then the stone at rest, at fills of 0.3, 0.6 and 1, and the rocket at rest, each against round 5's stills: identical. Then say plainly: nothing here is worse than git. If you cannot, say exactly what is.
