# Your part: the pyramid. Round 6

## What you own
scripts/world/parts/pyramid/, public/world/pyramid.bin, src/pieces/world/parts/pyramid.ts, src/pieces/world/parts/pyramid/. Stills in shots/world/pyramid/ with the prefix r6-. Report: shots/world/pyramid/r6-report.md. Read first: briefs/pyramid-r5.md (which still holds), shots/world/pyramid/r5-report.md and its two reviews, and the END of briefs/common.md ("Changed in the frame during the night", all of it).

## Where it stands
Round 5 scored 6 and 5.5. Kept: its place and size on picture 9. The capstone as its own stone with a reveal that reads at the page's size. The pale line on the front arris and the right outline. The face toward the moon brighter from foot to cap. On palette, hue 32, no banding.

Changed in the frame for you: PYRAMID.x is 2.5 units further right (your base corners are now at 257 and 474 across, on the picture's 255 and 475: make it again). The trees are cleared off the right base corner. GLINT is exported from src/pieces/world/light.ts (import it from there, not from the stage).

## What Fable sees, beside the picture
Open shots/world/pyramid/r5-beside-page.jpg. The picture's pyramid is two things and nothing else: one face BLAZING pale gold almost to its edges, one face a deep even gold, a thin dark line under a bright cap. It stops the eye from across the room. Yours is a tidy brown pyramid in six tiers with stripes on it. The reviewers' words: "satin or paint", "racing stripes", "a stack of six tiers", "a lampshade", "a dark hat".

He asked for more than the picture: "shiny gold metals", "these objects are real in 3D space", "lighting and shadows used to the advantage". So it must blaze AND be lit by the world's own light, not painted.

## The idea for this round: the blaze is the moon's own reflection
Work it out and you will find the world already gives it to you. The moon is behind the world and to the right (MOONWARD in layout.ts). The viewer looks from the front, six degrees down. The half way direction between the two is within a few degrees of the normal of the pyramid's right face. So on a gold that is polished but not a perfect mirror, the moon's highlight lands on that face and spreads across it. That is the picture's blaze, and it is real: it will be brightest where the face's own normal is nearest the half way direction and fall off toward the face's edges by itself.

So:
1. THE LIT FACE BLAZES BY THE MOON. Give the gold a broad highlight from the moon itself (a real specular lobe from the moon's direction and its color, the roughness of a polished but hand worked face, about 0.25 to 0.35), so the right face is pale gold over most of its area, at or near pale at its heart and falling to a rich mid gold at its far edges. Not a stripe, not a bank with a hard diagonal edge, nothing parallel to the arrises. Take the painted bright field out.
2. PLATES MAKE IT REAL. The face is clad in plates. No two real plates lie in quite the same plane: give each plate a tilt of its own of a fraction of a degree (from the plate's own number, steady across it), so the blaze breaks into a mosaic of plates, most ablaze, some a step dimmer, a few dark, with a hairline of shadow at each joint and a bright catch on a plate's upper chamfer. That is what tells a stranger it is polished metal, and it is what is better than the picture. Fine courses and plates of differing length, as you have. But NOT six equal tiers: turn the band joints right down until each face reads as one plane first and courses second.
3. THE CAP SHINES. It is a single polished stone: its moon side at least as bright as the blazing face under it, its other side as the body's other side. No picture frame of pale bevel round dark panels.
4. THE OTHER FACE IS THE DEEP ONE. It is turned from the moon and mirrors the night and the city: a deep, warm, near black gold (hue 26 to 30, redder in its darks, never olive or khaki), in which low down a broken band of small warm lights shows, the city's lit windows mirrored and stretched a little by the plates, and above it the dark of the sky. Remove the dashed stripe and the long streaks.
5. ONE PALE LINE. Keep the pale line on the front arris, where the two faces meet, and let it vary along its length. Quiet the lines on the left outline, the right outline and the cap's borders to almost nothing, unevenly: every edge outlined reads as a drawing.
6. THE CURSOR'S LIGHT is a second, smaller highlight of the same kind as the moon's, which slides over the plates as the pointer moves and lights each plate by its own tilt, so plates catch it one after another. Crisp, not a soft oval. It can only be judged live: take real frames (npm run live) with the pointer moving across it.
7. ITS OWN SHADOW AND ITS GROUND. It stands on the land in moonlight: its shadow lies on the ground to its left front, and the land's pale strip at its foot is mirrored faintly in the lowest course of both faces.

## The numbers
The lit face's mean about (235, 200, 140) at its heart, its far edge about (150, 105, 55). The deep face about (60, 36, 16), with lights in it up to (230, 170, 90). No pixel whiter than pale, nothing bluer or greener than red, no soft round spot anywhere.

## How to look
Every draft: npm run match -- --at 200,150,330,180 --out shots/world/pyramid/r6-match, and npm run look -- pyramid --beside shots/world/ref/pyramid-large.jpg --out shots/world/pyramid/r6-page.jpg. Then at the page's own size on the real page: npm run shot -- "/lab/hero?ui=0" --t 6 --wait 9000 --scale 1. Squint at that one: does it stop the eye as the picture's does?
