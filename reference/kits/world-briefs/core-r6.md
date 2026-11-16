# Your part: the core. Round 6

## What you own
src/pieces/world/parts/core.ts and src/pieces/world/parts/core/. Stills in shots/world/core/ with the prefix r6-. Report: shots/world/core/r6-report.md. Read first: briefs/core-r5.md (which still holds), shots/world/core/r5-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", all of it).

## Where it stands
Round 5 scored 5.5 and 5. Kept: the ball's place, size, band and face tone at the page's size (on picture 9 to a pixel). The root drawn with the page's own fibre recipe, color and clock, on the page's own heart line. A set off with nothing popping.

A stranger's words, which Fable agrees with after looking at the real page: "a flat printed disc with a thin wire coming out of it", "the beam reads as one more thread". And his own words, which this part exists for: "the stream essentially is just a beam of energy being shot out of core so the stream has to perfectly tie into it."

## What Fable changed on the page for you (it is done, build on it)
1. The hero's route is dead straight for its first 280 units under the core's foot, then takes up its sway (STREAM.hero.straight, `after` in wander). Your root and the page's line are one line there.
2. The page's own core is not drawn for the first 20 units and is taken up by 90 (STREAM.hero.hand is [20, 90] now). That taking up narrows the page's ribbon, which showed as a zigzag beside your thin root. It will not be changed in the stream's shader. Instead it is HIDDEN INSIDE YOUR NECK: see 1 below.
3. The world is told how far the leading end has run: PartState.stream.long, in units under SOURCE (and world.uniforms.uStream, x on, y long). Use it in place of working it out from the reading line.
4. The rock is being rebuilt as thick blocks this round, with a clear lane for the beam: nothing within 16 units of the line down from SOURCE nearer than z 132, and a lit shelf behind it. It will change under you. `?core=over` still draws you over the rock when you need to see the join before the lane lands.
5. npm run look waits longer now for the whole world. A black still with no stats line means a builder's file was mid write: take it again.

## What must change, most important first
1. THE NECK. Picture 9's neck is about a fifth of the ball's width where it leaves (36 to 40 units), a broad cream body of light that flares smoothly out of the foot like a drop about to fall, and is plainly the widest, brightest line under the planet. Yours is a hairline a tenth of that, thinner than the small streams. Build the picture's neck, as the root of the beam:
   - At the foot: 36 to 40 units wide, flaring into the ball's band with a smooth curve on each side (a fillet, the band turning down into the neck), never a starburst, a spike or rays.
   - It tapers as it falls: by about 90 units down it is still three or four times the page's ribbon, and it comes down to the page's ribbon's own width by about 220 units, where it is given over, fading out by about 260. A long, even taper: a beam shot down with force that draws itself thin, not a rod of one width with parallel edges.
   - Its body is the stream's light: a cream to pale gold heart, hot then flame at its edges, the stream's own fibres running in it (your recipe, widened), denser and braided toward the taper so that by the time it is the ribbon's width it IS the page's ribbon, fibre for fibre.
   - Where it overlaps the page's ribbon (20 to 260 units down) it is at least as bright as the ribbon at every pixel the ribbon covers, down to about 150 units: that is what hides the page's ribbon being taken up inside it. Prove it at three times on the real page at scrolls 620, 760 and 900: no second line, no zigzag, no step.
   - It only reaches as far as the leading end has (stream.long), with the page's leading end at its tip. Before the stream sets off (stream.on 0) the foot holds a short, quiet drop of the same light, 12 to 20 units, gathered and steady: the picture's drop about to fall. No brown lobe under it, no comb of fingers.
   - No haze: nothing soft or round floats round the ball or the neck. Its edges are the stream's edges.
2. A SPHERE, NOT A DISC. Nothing says the ball is round. The band is an even ring and the face is equally bright out to it. Without changing its mean color at the page's size by more than a few levels: let light fall toward the limb over a wider band (the picture's own limb darkens over about 8 percent of the radius, cream to gold to orange), make the grain cells of several sizes that foreshorten toward the edge, move the granulation slowly so it is seen to turn, and let the hottest region sit a little off centre toward the viewer's upper left. At three times the face must not be two flat tones in crisp blotches ("terrazzo", "camouflage"): each cell has its own gradient, a brighter heart and a darker lane round it, like the granulation of a star.
3. ITS LIGHT ON THE WORLD IS THE FRAME'S, but say what you see: with the neck built, look at the floor's lip and the lane walls beside it on the real page, and tell Fable in your report what the rock near the beam needs.
4. THE SHARDS. Six same sized crumbs in one clump at the lower right for the first 18 seconds add nothing at the page's size. They are pieces of the planet being drawn into the beam (the story: the stream's shards are pieces of the exploded planet). Spread their comings round the lower half from the first second, vary their size three times over, and let each one be seen plainly to be taken by the neck and carried down it. Prove it with real frames over a minute (npm run live).
5. HIS SCREEN. At scale 2 the band is 7 to 9 levels darker than the picture and the face grainier. Judge at scale 2: that is what he sees.

## How to look
Every draft: npm run match -- --at 560,320,260,330 --out shots/world/core/r6-match, then the join on the real page at three times: npm run shot -- "/lab/hero?ui=0" --scroll 760 --t 6 --wait 22000 --png (and 620, 900), cut round the foot, beside shots/world/ref/core-large.jpg. Then real frames across the set off as in round 5. Then npm run perf -- "/lab/hero?ui=0" --scroll 700.
