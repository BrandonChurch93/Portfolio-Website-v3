# Your part: the core. Round 5: the root of a beam

## What you own
src/pieces/world/parts/core.ts and src/pieces/world/parts/core/. Stills in shots/world/core/ with the prefix r5-. Report: shots/world/core/r5-report.md. Read first: shots/world/core/r4-report.md and its two reviews, and the kit's "One scene, one story" (reference/kits/world.md), which Brandon gave after round 4 was briefed.

## The story this round serves (his words)
"The core is the source of the stream that goes through the site. The stream has particles in it that are sharp and jagged. It's meant to be implied that these jagged particles are pieces of the exploded planet. So we'll need to tie the core in with the stream, so it looks like a legitimate source for the stream, also, doubling as the planet's core, the stream essentially is just a beam of energy being shot out of core so the stream has to perfectly tie into it."
So the neck is NOT a drop about to fall (round 4's brief said that: it was wrong, and it goes). It is the root of a beam: energy gathering at the ball's foot and leaving with force.

## What the frame now gives you
- PartState.stream = { on, since } (part.ts): on is 0 before the page's stream has set off from the core and rises to 1 over half a second once it has. since is the seconds since it set off. In the lab (/lab/piece) there is no page stream: on stays 0 and a plain line stands in.
- The page's stream no longer draws its own core for its first 40 units below the ball's foot and takes it up over the next 60 (STREAM.hero.hand in src/stream/config.ts). That stretch is yours.
- Round 4's ?neck=stream state can now be driven by state.stream.on.

## Fable's verdict on round 4 (reviewers: 5.5 and 4.5)
Kept: the ball's place, size, hard edge and band, never white, nothing outside the ball, everything from the clock.
What must change, most important first:
1. THE JOIN, ON THE PAGE. Judge only on /lab/hero (npm run shot -- "/lab/hero?ui=0" --scroll 480, 620, 760, 900, each --t 6 --wait 3000, with --png for close crops, and real frames with npm run live across the moment it sets off). The beam must be one thing from the ball's foot to the stream: the same width where they meet, the same light, the stream's own braided strands beginning inside your neck, no pale tube with an orange line pasted in it, no step, no doubled line, no olive or khaki. Before the stream has set off the root is quiet: a short bright gathering at the foot, whole, nothing cut off, no spike and no icicle. As it sets off the root brightens and the beam leaves.
   At the moment the rock's floor under the ball covers the root on the page (another builder is cutting a lane for the beam): say in your report exactly what lane you need (how wide, from where to where), and judge with ?only=core on the hero if you must.
2. THE NECK IS THE STREAM'S MATERIAL. Round 4's is "a smooth, ungrained, vector clean spike: a third material that matches neither the ball's grain nor the stream's braid". Give it the stream's braided core (strands that weave, a hot pale spine, read src/stream/shaders.ts for how the stream draws its core and make the same look in your own code) growing out of the ball's band of orange, so ball, root and stream are one body of light.
3. THE SHARDS ARE PIECES OF THE PLANET, CAUGHT BY THE BEAM. Round 4's eleven read as dirt on the face (4 to 9 pixel dark specks) and as a different family from the stream's riders. Take them off the bright face: none may cross in front of the middle of the ball. Let a few larger ones (the size and the lighting of the page's own riding shards: pale lit, with a bright edge toward the ball) hang and turn slowly round the LOWER part of the ball and the root, drawn in toward the beam and down it, so a visitor reads: pieces of the planet are being pulled into the beam. Fewer is better than busy.
4. THE BALL IS A BODY OF LIGHT, NOT A DECAL. At the page's size it matches the picture and is "a flat decal with no sense of a sphere", and at three times its grain is "cream camouflage, cork, sandstone". Make it better than the picture: the grain flows very slowly round the ball as on a turning sphere (slower at the edge, where it is foreshortened), there is depth in it (a brighter layer under a moving skin), and at three times zoom the facets are crisp planes told apart by light with small glints, and they visibly, slowly move.
5. Measure as before, and keep the face's color and the band within a few levels of round 3's.
