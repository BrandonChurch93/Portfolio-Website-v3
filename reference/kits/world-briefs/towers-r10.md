# Your part: the city. Round 10: light that has a direction, and gold that is gold

## What you own
scripts/world/parts/towers/, public/world/tower*.bin and towers*.png, src/pieces/world/parts/towers.ts, src/pieces/world/parts/towers/. Stills in shots/world/towers/ with the prefix r10-. Report: shots/world/towers/r10-report.md. Read first: shots/world/towers/r9-report.md and its two reviews (r9-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands (round 9 is committed: git has it, so you can always get back to it)
Round 9 scored 6.5 and 6 and Fable kept it: under picture 9 at the page's size (r9-final-picture-r7-r8-r9.jpg) it is the first city with the picture's mood, dark masses with warm windows, and more than one material. Kept, and not to be lost: his stepped crown as it is now (straight reeds, a dark line under each step, gold at round 7's tone) and his limestone untouched. The carved sun disc. The variety of silhouettes. Every named top within 6 picture pixels. Glass, travertine, granite and copper. Lit faces that do not clip. 234,846 triangles, 3 draw calls, 3 programs, 1 texture, 3.13 MB. Fable's ruling on what you asked: copper for the drums' bands stands.

## What must change, most important first
1. THE CITY HAS A LIGHT DIRECTION. Both reviewers: every tower is lit evenly from the front in one warm brown, both faces of a corner the same value, so the city reads as painted and not lit. The moon is behind the world and to the visitor's right. Faces toward it are markedly paler than faces away, each corner has a bright vertical edge, roofs and setbacks catch a rim, there is contact shadow at the feet and under setbacks, and a tower shades the one behind it. Round 8 had two faces by value and lost the mood, round 9 has the mood and lost the two faces: this round has both.
2. THE OBELISK IS GOLD. It is cream (248, 211, 161, blue over red 0.65 against the city gold's 0.45 to 0.52), one flat value at the page's size, matte as plaster close up. Keep its value and bring its hue to METAL.gold, the same gold as the pyramid's lit face under the same light (173, 116, 46 lit, read src/pieces/world/parts/pyramid/ for how it is lit): a mirror streak on the lit face that reads at the page's size, a gradient across its width, a deep second face, a pyramidion with four faces and not a cone.
3. GLASS THAT IS GLASS. The curtain wall towers are a dark grid of tiles whose lit panes are ragged blotches crossing the mullions (camouflage, leopard spots at the page's size). Light whole panes or runs along a floor, and give the glass a reflection of the night and of the lit city as a gradient up each face (night.ts).
4. THE BRIGHT ACCENTS. The drums' copper bands are matte dull stripes where the picture's are the brightest accent right of the crown: a rolling highlight on each band, and the two drums not near twins. The sun disc at the page's size is a pale beige coin on which the lamp changes nothing: a bright gold rim and a darker carved face, and an answer to the cursor that can be seen. The shaft's stone fins cut its lit windows into glyphs. The city's brightest accents fall short of the picture's (p99 195 against 221).
5. HIS CROWN AT THREE TIMES. The reeds wobble and kink (the ripple bends each reed's reflection: run it across the reeds only) and the tiers' corner faces show triangular facets (split the normals at the corners). Nothing else about his tower changes.
6. ORDINARY WALLS at three times are flat matte planes with a window grid: a change of value up the face, light under each cornice, a reveal at every window. Take real frames of a slow scroll (npm run live on /lab/hero) and say whether the pale ticks on narrow piers crawl.

## Budget
3.3 MB and 260,000 triangles at the most, 3 draw calls, 3 programs.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000), cut to the city and laid under picture 9 and round 9 as r9-final-picture-r7-r8-r9.jpg was. Then close:crown, close:city and close:spire at three times. Then the lamp at two places over the sun disc.
