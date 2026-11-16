# The launch pad. Round 3 of the pass: the fire, and only the fire

## What you own
src/pieces/pad/ only. Stills in shots/pass/pad/ with the prefix r3-. Report: shots/pass/pad/r3-report.md. Read first: pass/common.md, shots/pass/pad/r2-report.md and its two reviews (r2-review-1.md, r2-review-2.md), and pass/pad-r2.md.

## Where it stands
Round 2 scored 5.5 and 6, and both reviewers found things made WORSE than git again, so nothing of the pad is committed yet. What is live is what is in git.

KEPT from round 2, by both reviewers, and not to be touched again this round:
- the stone near black before the landing, lighting ring by ring with its flare (LOOK.dark, LOOK.flare), its carving readable at ignition (LOOK.tops)
- the tail's length tied to the climb (TAIL, tail()), the rocket hidden by where its fire's foot is, so no fire hangs with no rocket
- the hard edged shock diamonds on a throat line
- the rims and bands lighting in steps from the foot (READY)
- the arms reaching the skin at rest

## The rule, a third time
Each thing below ends plainly better than it is in git, shown side by side in REAL frames at the page's size (npm run live on /lab/contact, git on top, yours below, the same times), or it is put back exactly as it is in git. "Mixed" is put back. The site as it is in git is served at http://127.0.0.1:5331 for the comparison.

## What must change, in this order
1. THE PLUME'S BODY READS AS SMOKE, and "No smoke" is in the agreement (BRIEF.md, Contact, the first build). Below the last diamond it is blotchy clumps with dark holes, cauliflower edges and falling flecks. Open shots/pass/pad/r2-cmp-launch.png: git's body (top row) is one smooth luminous column, and that is the base to go back to. On that smooth body, and nothing more:
   - a pale hot band down the throat between the diamonds, falling to flame and then ember toward the rim
   - flame TONGUES at its edges: long thin streaks that lick down and out and thin to nothing, moving on the clock
   - a foot that thins and darkens with distance until it is gone
   No clump, no hole, no fleck, no puff, at the page's size or at three times.
2. IGNITION IS WEAKER THAN GIT from 0.5 to 1.4 seconds, flat where git's builds. It must be at least as strong as git's in every real frame at the page's size, and better in kind:
   - a hard pale burst AT THE BELL'S MOUTH, held about 0.15 seconds (not a two frame warm haze over the sky)
   - a short pale jet that is seen past the deck
   - the light on the deck and the stone growing from the flash to the lift, the heat in the stone's cuts with the plate tops dark
   - no pale haze sheet across the front of the table, and no soft round halo on the sky round the bell
3. AT LIFT, 1.4 to 2.0 seconds, the plume is shorter and dimmer than git's: at least git's length and brightness.
4. THE ARMS' SWING reads at the page's size as the arms getting shorter. It must read as a swing about a hinge, with its settle.
Not this round: the rocket's body and fins.

## How to look
For every item: real frames (npm run live -- /lab/contact with the launch, and /lab/piece/pad?size=860&wide=800 with its Launch button), every frame from 0 to 3.5 seconds for ignition, git above and yours below at the same times, at 1440 by 900 and at tablet-wide. Then three times zoom on the plume at 1.6, 2.4 and 3.2 seconds. Then npm run perf on /lab/contact, yours against git's, one after the other.
