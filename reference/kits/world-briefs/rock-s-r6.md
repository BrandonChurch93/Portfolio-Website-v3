# Your part: the torn rock round the core, sculpt S. Round 6: the picture's own pattern of light, and edges with bite

## What you own
scripts/world/parts/rock-s/, public/world/rock-s.bin and one new small file public/world/rock-s-light.png (or .bin), shown with ?rock=s. src/pieces/world/parts/rock.ts and src/pieces/world/parts/rock/ (the stone, its curve), with the same hard rule: the page without ?rock=s, and the debris, draw exactly what they draw now, proved at the end with a PNG difference. Stills in shots/world/rock-s/ with the prefix s6-. Report: shots/world/rock-s/s6-report.md.
Read first: reference/kits/world-briefs/rock-s.md (Brandon's words and the bar) and rock-s-r4.md (sheets, the measured colors), then shots/world/rock-s/s5-report.md with its two reviews, and open s5-final-beside.jpg, s5-page-beside.jpg, s5-final-close.jpg and shots/world/rock-s/f/grid.jpg (Fable's own trial: picture 9 top left, then S as it is, then with the bounce's knee at 0, more power, a slower fall and a paler core: none of them changes what it is).

## Where it stands, told plainly
Five rounds: 4, 5, 5, (4 was cut off), 5. Round 5 is in git as a7cf39c. It is one solid cave of broad sheets, its outline is the picture's and its hue at each brightness is the picture's. And on the page it is DULL: a soft, even, dusty tan pocket where picture 9 is hard light and hard dark, bright gold planes cut by black, and where the live rock (the old sculpt, confetti though it is) is at least vivid. Fable will not put a dull rock on the page Brandon calls the coolest part of his site. Changing the frame's light was tried (the grid): it does not help, so do not ask for it and do not wait for it.
Why it is dull, from the reviews' numbers: the light is in the wrong places as well as too even. S lights faces where the picture is black ((870, 470) 75 against 5, (1000, 420) 48 against 9, (545, 470) 46 against 16) and underlights the picture's great lit planes ((495, 360) 68 against 120, (820, 380) 83 against 123). Lit faces have half the picture's crisp edges (0.21 of lit pixels on a strong edge against 0.38) and less local contrast (0.147 against 0.197). 41 percent of the rock is under luma 15 against 30, 11 percent at 15 to 30 against 23, and 1.2 percent is over 150 against 3.8.

## This round has two halves. Do the first, show it, then the second

### 1. The picture's large pattern of light, laid on S as a soft map
Five builders have tried to make the ball's light fall where the picture has it by moving rock, and each fixed three places and lost three. So take the large pattern from the picture itself, as a matte painter lights a set from a painting, and keep every small thing S's own.
- The view never moves, so a place on the rock is a place in the picture (the layout's own mapping: `fromPicture` and its inverse in src/pieces/world/layout.ts, the same one npm run match uses). Make a small map over the hollow, about 4 picture pixels to a texel, of HOW MUCH BRIGHTER OR DARKER THE PICTURE IS THAN S, AT A LARGE SCALE ONLY: the picture's luma and S's own rendered luma (taken with the map off), each blurred the same amount (start at a radius of about 14 picture pixels: wide enough that no edge, crack or texture of the picture comes through, only its masses of light and dark), divided, and held between about 0.25 and 3. Leave out of the picture what is not rock (the ball and its halo, the lines of light, the loose boulders, the land and the skin) and fill those places smoothly from round them.
- In the stone for sculpt S, read the map where the fragment is on the screen (from its own world place through the fixed view, so it holds at any canvas size and under any scroll) and multiply what the core and its bounce give by it. The moonlit crust is left alone. Then take S again and make the map again from the new stills, two or three times, until S's blurred luma and the picture's agree within a tenth everywhere in the hollow. Show the two blurred pictures side by side and their difference for each pass.
- What must be true after it: at the page's size, squinting, S's masses of light and dark ARE the picture's. And it is still S: put the picture and S side by side at three times and no edge, crack or mark of the picture can be found in S. If one can, the blur is too small.
- The numbers above and round 4's rings should now land by themselves. Give the tables.
- It costs one small texture and one lookup, in a material that is drawn once and kept (src/pieces/world/kept.ts). The strip under the ball that is drawn live reads it too.

### 2. Edges with bite, and what fails on sight at three times
With the large light right, what is left between S and the picture is crispness, and it is in the form:
- BREAK THE BROAD FACES. A face is not one smooth sheet of kraft paper: it has two or three planes that meet at a hard crease and differ in tilt by 10 to 25 degrees, a few spalls and pits 1 to 3 units across (uneven in size, gathered in places, absent in others), and a chipped lip. Aim for the picture's share of lit pixels on a strong edge (0.38) and its local contrast (0.197), measured the way review 2 of round 5 measured them: give the before and after.
- SHEET ENDS: no pinking shear. Where a sheet broke it has one or two large angular notches of different sizes and a corner knocked off, not a row of fine even teeth.
- No ruled stripes on sheet ends anywhere (the block up and left of the ball, the roof's teeth, the left stacks: they read as plywood) and take out the dead straight upright groove at about hollow 520, 380 to 530.
- THE FLOOR: its underside hangs in lobes to picture 595 to 615 down (it runs straight at 568 from 560 to 830 across, and is flat to 3 px over 150 px at one place), and it is a dark bedded shelf, not a pile of tan blocks.
- THE ROUNDED DUSTY ROSE BOULDER at picture 925 to 1005 across, 405 to 480 down: the picture has a black void with a few lit edges there. Cut it into angular sheets turned from the ball, or take it out.
- THE ROOF'S FRONT: not a grid of flat flagstones with straight seams, and the roof's teeth over the ball no brighter than the picture's.

## Budget
6.5 MB, 600,000 triangles, one draw call, one program, the curve's texture and the map's.

## Sound enough to go live
Real frames of a slow scroll with no shimmer. Kept and not kept the same picture. The frame's time by the core the same as with the old rock. The map must not show as a square, a seam or a halo anywhere, at any browser zoom or window size: take stills at 1440 by 900, 1920 by 1080 and with ?handheld=1 at 1180 by 820.

## How to look
As the first brief has it, at the page's size first. The first image of your report is picture 9's hollow at the left and yours at the right. The second is the real page with the live rock at the left and S at the right (npm run shot -- "/lab/hero?ui=0&rock=s" --scroll 700 --t 6 --wait 12000 beside the same without rock=s). Answer harshly: is S now as vivid as the picture, light against dark? Beside the live rock, would Brandon take S at a glance?
