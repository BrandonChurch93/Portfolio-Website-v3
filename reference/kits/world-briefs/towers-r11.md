# Your part: the city. Round 11: his stepped tower, remade. This round is that one building

## What you own
scripts/world/parts/towers/, public/world/tower*.bin and towers*.png, src/pieces/world/parts/towers.ts, src/pieces/world/parts/towers/. Stills in shots/world/towers/ with the prefix r11-. Report: shots/world/towers/r11-report.md. Read first: BRIEF.md, Settled, Hero, "Our tower is better than the picture's" and under it "Released (Nov 16)". Then shots/world/towers/r10-report.md (the round before yours, if it is there) and r9-report.md, scripts/world/parts/towers/step-form.mjs whole, and the END of briefs/common.md.

## Brandon's words, this morning, with a close screenshot of the tower on the live site
"You can update this first building we did now, it doesn't look as good as the rest."
His screenshot is shots/world/ref/stepped-tower-his-screenshot-nov-16.png (do not commit it: open it first and keep it beside every draft). The tower is TOWERS[STEP]: the one with the stepped gold crown, right of the spire, the first building made for this world. Until today it was kept exactly as he approved it on Nov 15, and every round was told not to touch it. That is lifted. What stands: a part is never made plainer.

## What is wrong with it, as Fable sees it in his screenshot
Beside the city as it now is, it is the flattest and the coldest thing on the skyline.
- THE PIERS are two flat slabs of pale grey (147, 135, 127, blue over red 0.86) with fine courses and no relief: no shadow line anywhere on them, one value from foot to cornice. From across the room the shaft is a grey door frame.
- THE BAY is a flat dark panel with small square windows lit at random on a grid: a QR code. No depth, no floors, no rooms.
- THE CROWN is the good part and sits on the shaft as a hat on a box: the shaft ends in a flat cornice and the crown starts narrower.
- It has one face. Every building round it now shows a lit side and a warm front.

## The tower as Fable has designed it. Build this
FIXED, since they are picture 9's layout and the overlay must still hold: its place, its footprint (38 by 36), its height (168.2 with the point over it), and the outline of the five gold tiers, the lantern and the point (S.tiers, S.lantern in step-form.mjs). At the page's size its silhouette above 126 units does not change.
KEPT, since they are what he liked on Nov 15: pale stone piers, a bay of windows between them, a fluted stepped gold crown with its cornices and its point.

1. THE STONE IS WARM. A cream travertine in the city's own light, the palest stone in the city and plainly stone: on the face toward the moon (the visitor's right) about (205, 172, 132), on the front about (150, 118, 88), in shade a warm brown. Blue over red under 0.66 everywhere on it. Never grey, never white. Coursing stays, faint.
2. THE PIERS HAVE RELIEF AND CLIMB. Each corner pier is a bundle and not a slab: a proud corner buttress with two pilasters stepping back from it toward the bay, three reveals deep, each return catching the moon on its right lip and holding shade on its left. Two shallow flutes run the full height of each pier's face. Deco is vertical: no belt courses across the piers.
3. THE SHAFT STEPS IN TO MEET ITS CROWN. Over the top fifth the piers set back in three shoulders (at about 100, 112 and 120 units up, in by about 1.2, 1.4 and 1.6), each shoulder with a sloped stone weathering and a small gold beaked cap at its corner, in the language of the spire's buttress caps (read src/pieces/world/parts/spire/ and scripts/world/parts/spire/ for how those are made). The shaft arrives at the crown's first tier at that tier's own width, so the crown is the top of the tower and not something set on it. The cornice, the parapet and the urns become the last shoulder.
4. THE BAY HAS DEPTH, FLOORS AND ROOMS. Set back about 3.4 units behind the buttress faces. Four slender bronze fins divide it into five tall window strips (none down the middle: a fin there read as a seam). Between storeys, dark bronze spandrels with a small relief. The windows are lit by floor and by tenant in runs of three to eight storeys with dark runs between, so at the page's size the bay is bands of warm light of different strengths and not a scatter of squares. Two double height floors, at about 50 and 92 units up, are lit brighter the bay's full width under a thin gold lintel. At three times there are rooms behind the glass, as the spire's bays have. The bay's own light spills warm onto the inner returns of the piers.
5. THE BAY'S HEAD. Under the last shoulder the bay ends in a stepped head, three steps like the crown turned upside down, filled with a gold sunburst grille. It is the one place the tower's two materials meet, and it says what the crown is about to do.
6. THE CROWN IS LIT, AND ITS LANTERN BURNS. The five tiers stay as they are in form. Their faces toward the moon are bright polished gold with the moon's streak, their fronts a deeper gold, and there is a dark line under every cornice (round 9 has this: keep it). The lantern under the point is lit from inside through its slots, warm, the brightest small thing on the tower, with its light on the top tier's cap. No glow drawn round it: there is no bloom in this world.
7. TWO FACES. The right face is plainly paler than the front, with a bright vertical edge at the corner between them, contact shade under each shoulder, and the shade of its neighbour low on it.

## What it must do at each size
- AT THE PAGE'S SIZE it is about 38 pixels wide and 168 tall. What must read there: cream piers with a lit right edge. The bay as bands of light with two brighter floors. Shoulders stepping into a gold crown. A point of light at the top. If the relief vanishes into one flat cream at that size, deepen it until a shadow line survives: check on the real page, not only close.
- AT THREE TIMES (his screenshot is about that) it is the building a person would pick as the best in the city after the spire.
- Thin lit edges fade as they thin (common.md): no dashes, no crawl. Take real frames of a slow scroll.

## Do not touch
Every other building, unless one fails on sight in your own stills (say so and leave it for the next round). The crown's outline. The plan (placed.ts).

## Budget
The tower may take up to 14,000 triangles more than it has. The city stays at 3 draw calls, 3 programs and 1 texture, and towers-city.bin under 3.4 MB. Make both files again: the city's (city.mjs) and the tower's own (step.mjs).

## How to look
First, before you change anything: his screenshot, and the same crop of the page as it is now, side by side (r11-0-before.jpg).
Every draft: the tower alone (/lab/piece/world?only=towers&towers=step, and &top=1), then close:crown at three times beside his screenshot at the same crop, then the real page (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000) cut to the tower with its neighbours at the page's size and at twice it, then npm run match to show the crown's tip has not moved (764, 96 in the picture).
Your report opens with one image: his screenshot at the left, yours at the right, the same crop and size. Would he say it now looks as good as the rest? Answer that yourself, harshly.
