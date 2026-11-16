# Your part: the rock's material. Round 5

## What you own
src/pieces/world/parts/rock.ts, src/pieces/world/parts/rock/, scripts/world/parts/rock-material/. Stills in shots/world/rockmat/ with the prefix r5-. Report: shots/world/rockmat/r5-report.md. Read first: briefs/rock-mat-r4.md (which still holds), shots/world/rockmat/r4-report.md and its two reviews, briefs/rock-r4.md (the sculptor is cutting every plate into knapped sub faces this round: its file changes under you), and the END of briefs/common.md (all of it: the darks changed in the frame, see the last entry).

## Where it stands
Round 4 scored 5 and 4.5. Kept: the color beside the core on the picture's ((105, 57, 26) against (105, 59, 28)). Nothing ships for the stone: the grain is made in the page from a seed. One program. On palette. Round 3's holes, slashes, hair, wax drips, record arcs and lavender roof are gone and must not come back. The debris can wear the stone (stoneShader with grain only).

## What Fable changed for you (both reviewers and you asked)
The rust in the darks was the frame's: the stored bounce is now half as colored and lifted, and the fill's tint is nearly neutral. The faint diagonal hatch on lit slabs was the moon's shadow map: its bias is raised. Measure your darks again before anything else, and STOP adding shade darkening of your own to faces turned from the core: with the new bounce they are to be a deep warm brown, never black, and the hollow needs its middle tones (it had 31 percent near black against the picture's 18, and 16 percent between brightness 40 and 120 against 28).

## What must change, most important first
1. PLYWOOD. Every broad lit face carries horizontal bed tone steps at a constant pitch, which reads as plywood or corrugated card and fails on sight. Beds are rare: one or two irregular partings to a face, at varying spacing and angle, broken, each a small stepped ledge with a lit lip. Nothing at a constant pitch anywhere.
2. RICE AGAIN. The crack strokes are near equal dark dashes scattered evenly over every lit face: "rice grains", "pencil shavings". Open shots/world/ref/hollow-left-large.jpg and look at what the picture's lit faces carry: chunky DARK GOUGES and scars that cover about a fifth of a face, clustered along its grain and eating into its edges, connected into ragged runs, with clean stone between. Build those. A tilted normal shows almost nothing under the core's head on light (you found that): make them as darkening (a floor the light does not reach) with a lit far lip.
3. ONE CLEAN ORANGE. Between the marks a lit face is one flat saturated orange ("pumpkin": your brightest band is (222, 131, 65) against the picture's (202, 137, 80)), and a shadowed mass is a flat painted polygon. Ease the lit stone toward peach tan at its top end, and put low frequency tone in every face: stains, patches 15 to 25 percent lighter or darker, redder stains (the picture has 26 percent of its lit stone at hue 12 to 16, yours 6).
4. FOLDED PAPER. The sculptor's facets meet at clean lines. On every convex edge that faces the light a pale, broken, chipped bevel of varying width. In every concave crease a darker band of dust. Neither shows at three times now. Use the stored distance to a crease when the file has it.
5. LOOSE ENDS. The floor's silhouette has a pale torn paper outline. A dotted sparkle runs along polygon edges on the dark right mass. The moonlit roof slab and a grey patch under the floor read as a second, featureless material: they are the same stone under the moon, with the same grain and marks.

## How to look
Every draft beside the picture: npm run match -- --at 250,240,860,480 --out shots/world/rockmat/r5-match, then close:hollow at three times and cut the same boxes the reviewers measured, then the real page scrolled to the hollow.
