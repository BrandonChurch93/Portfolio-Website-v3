# Your part: the spire. Round 10: a ring worth looking into, and a top that belongs to the tower

## What you own
scripts/world/parts/spire/, public/world/spire.bin and spire-windows.png, src/pieces/world/parts/spire.ts, src/pieces/world/parts/spire/. Stills in shots/world/spire/ with the prefix r10-. Report: shots/world/spire/r10-report.md. Read first: shots/world/spire/r9-report.md and its two reviews (r9-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands (round 9 is committed: git has it, so you can always get back to it)
Round 9 scored 7 and 6.5, the best of any part, and Fable kept it. Kept, and not to be lost: the outline and the placement, on picture 9's lines to a pixel or two (the tip, the stages, the shoulders, the ring's lobes, tilt and crossing). The stone and its light: a moonlit right edge, a darker left, light rising up each stage, coursed stone with figure. Both reviewers call it the finest building in the city and better than the picture's. The window strip as lit floors with rooms behind the panes. The ring as one gold at every size with true darks and no white. Fable's ruling on what you asked: the darker fronts (45 to 55) and the darker podium stand. 51,880 triangles, 4 draw calls, 4 programs, 1 texture, 0.53 MB.

## What must change, most important first
1. THE RING IS A PLAIN HOOP. One smooth tan to gold gradient with one catch line and nothing in it, at every size, plainer than the stepped crown beside it. Give it built relief that breaks the highlight into runs and holds something at three times: a slight crown or dish across its top face, reeded or stepped bands round its outer face that each catch the horizon line differently, a few segment joints, an inlay. It answers the cursor's glint plainly (now 3.4 levels on average). At the page's size its body is the crown's gold (the crown is 188, 132, 69 at saturation 0.63: the ring is 141, 109, 75 at 0.47 and reads as a cream band on the warm sky), and its left lobe is one band and not two thin lines.
2. WHERE THE RING CROSSES THE SHAFT it lies pale on pale, because its own light lightens the stone right there. A thin contact shadow under the front arc, its edge or underside darker at the crossing, and its light on the tower turned down until the arc plainly stands in front. The light it throws must not read as a glow.
3. THE TOP. The cone above the ring is a plain stepped octagon with one slit window a stage: none of the fins, finials or gold the tower below has, and it is the part seen against open sky. Carry the tower's language up it. The mast is washed to cream (240, 189, 124, saturation 0.24) and is a plain cone with one collar: METAL.gold with darker faces as the finials have, a fluted base, a second collar or a finial ball.
4. THE WINDOW STRIP is one lattice of identical panes for its whole height. Vary the mullion rhythm stage by stage, pair and triple the panes, deeper spandrels, blind panels. At the page's size the lit runs still read as amber smudges round a dark hole: fix that there, not at three times.
5. THE STONE'S FLECKS are sprinkled evenly over every face, a grunge overlay. Tie weathering to form: streaks under setbacks and finials, soot low and in corners, cleaner exposed right faces.
6. SMALL THINGS. The gold frieze over the doors aliases into a barcode at three times: fade the reeds to their mean below about two pixels a reed, or make them fewer and wider. The back arc's outer edge and catch line show stair steps at nine times.

## Budget
56,000 triangles, 4 draw calls, 4 programs, 1 texture, 0.6 MB at the most.

## How to look
Every draft: npm run match first, then the real page (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000) cut to the spire at the page's size and twice it beside round 9's (r9-hero-s2-x2.png), then close:spire at three times, then two lamp places over the ring. From across the room: the tallest and finest thing in the city, crowned by a ring of gold that is itself worth looking into.
