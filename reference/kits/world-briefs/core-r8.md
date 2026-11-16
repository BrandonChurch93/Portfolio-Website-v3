# Your part: the core. Round 8: one object from the ball to the stream

## What you own
src/pieces/world/parts/core.ts and src/pieces/world/parts/core/. Stills in shots/world/core/ with the prefix r8-. Report: shots/world/core/r8-report.md. Read first: shots/world/core/r7-report.md and its two reviews, and the END of briefs/common.md (the last entry is what Fable changed on the page's side for you).

## Where it stands
Round 7 scored 5.5 and 5.5. Kept, and not to be lost: the ball's place, size and radial profile on picture 9 almost value for value, with a hard edge and no haze. The neck's measured taper and clean edge. The face with no lanes and no repeating tile. A set off with nothing popping. 7 calls, 7 programs, uniforms only.

## What Fable did on the page's side, as you asked
All three things you named were the page's, and are changed (src/stream/: shownAt, the core's shader, the last pass):
- The dashed line at the ball's foot is gone: a hidden stretch with no ease was drawn at its very start, as you guessed.
- The page's stream is taken up by LIGHT now, not at its whole strength: its heart comes on over about 7 units from 221 under the foot, and its strands (the braid) over the 34 units after that, as they do at the top of any page.
- The page takes the stream's light (its glow on the ground) only from 221 down, all of it by 291. Nothing of the page's is laid over your neck above 221.
So between 221 and about 260 the page's stream is still coming on. YOUR NECK HAS TO CARRY THROUGH IT: run your tip on from 221 at the ribbon's heart width, fading out between about 228 and 262, so the two cross with no dim gap and no doubled line. Look at it on the real page at scrolls 760, 1000 and 1150 and at 3 times, and tune the fade until you cannot find the join.

## What must change, most important first
1. ONE OBJECT. Above 221 the neck is "a smooth opaque cream rod with nothing inside it", and below it the stream is a braided core with shards riding it. Over the neck's last 80 to 100 units bring up the stream's own character INSIDE it: fine fibres that begin faint and gather, in the stream's own colors and at the stream's own pace (read src/stream/shaders.ts, coreFrag, for the twist and the fibres), so the braid is already forming before the page takes over. No sheath, no licks: anything flame shaped fails.
2. THE FOUR ROCK LUMPS ARE WRONG, AND ONE IS A FAULT. In every hero still one sits edge on across the beam as a brown washer or a drum with stripes of light on it (shots/world/frame/join-1000-cut.jpg at t 8), and at t 9 one cuts the beam in two. Take them off the beam's front altogether. If the core carries pieces, they are small broken chips of the planet's stone that pass BESIDE and BEHIND the neck, each dark with one hot edge toward the light, never a gem, never a disc, never across it. None is better than these.
3. THE BAND at the ball's edge is about three times the picture's width for the radius, with a grimy ochre to brown falloff inside it, worst at the foot. A narrow deep orange band with a crisp outer edge.
4. THE FACE at three times is a flat two tone mottle ("lichen", "camouflage"). Fine grain that is told apart by LIGHT: sharp small bright points and facets that change as the cursor moves (world.uniforms.uPointer), over the same profile. Do not lose the profile.
5. BEFORE THE STREAM SETS OFF the drop at the foot is "a smooth balloon teat" that the page's resting end covers with forked sparks. Make it read as light gathering at the foot: a short bright bead that swells and draws down slowly, on the clock.

## How to look
Every draft: the real page at scrolls 620, 760, 1000 and 1150 (npm run shot -- "/lab/hero?ui=0" --scroll 1000 --t 8 --wait 12000 --scale 3 --png), cut to the beam from the ball's foot to 320 under it. Then real frames of a slow scroll through 600 to 1200 (npm run live). Then close:hollow for the ball. The test: one stream of light from the ball to the foot of the screen, and nobody can say where the world's part ends and the page's begins.
