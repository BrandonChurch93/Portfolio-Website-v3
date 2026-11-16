# Your part: the spire. Round 3

## What you own
scripts/world/parts/spire/, public/world/spire*.bin and spire*.png, src/pieces/world/parts/spire.ts, src/pieces/world/parts/spire/. Stills in shots/world/spire/ with the prefix r3-. Report: shots/world/spire/r3-report.md. Read first: shots/world/spire/r2-report.md and its two reviews.

## Where it stands
Round 2 scored 6 and 6.5. Kept: the outline from podium to needle (one taper, three swept shoulders, the needle: on the picture's to 2 or 3 pixels), the turned gold metalwork (finials, mast with collars, needle), the ring's gold hue, warm granite, no stipple at scale 1, the palette, the cost.

The plan is put right for you: SPIRE.ring.up is now 0.68 (the ring was 7 pixels high and doubled on the overlay), and the low hall that hid the portal (TOWERS[78]) now stands behind the spire. Make it again and lay it over the picture first (npm run match -- --at 560,0,260,300 --out shots/world/spire/r3-match).

## What must change, most important first
1. THE MOON MUST MODEL THE TOWER. It draws only a detached line one or two pixels wide beside each fin, with a dark gap from the fin's face: "wires beside a dark tower". The picture lays a pale band two to three of its pixels wide down the right face of every fin. The moon is behind the spire and to the viewer's right, so a face has to be turned for it: give each fin's right outer corner a real splay or broad bevel of 20 to 30 degrees that this view can see, joined to the fin's face, so the right side of the whole tower is a lit plane from foot to needle, and the left is in shade.
2. THE RING IS A BAND OF POLISHED GOLD. It reads as a thin satin tan hoop, half of it one flat value, mirroring nothing. Make it a broad flat band whose inner and outer edges both show, with its rolled outer bead, a darker underside, a top face that mirrors the night (dark, changing round the ellipse) and one narrow hard highlight where it turns to the moon. It answers the cursor (lit's glint: true reads the frame's uGlintAt). The engraving shows at three times zoom and never stipples below.
3. THE TOP. Above the ring it is a four sided taper from about 83 down in the picture up to 40. The picture has a straight shaft about 13 pixels wide running up to about 48 and only then pointing. Carry the square shaft higher through the ring and shorten the lantern's taper, and break the lantern's read as a dark cone at the page's size.
4. RELIEF. The fin fronts and the plain square shaft between the top shoulders and the lantern have nothing to find at three times zoom: fluting, carved panels, set back piers. The shoulders are rounded domes that read as pale blobs at the page's size: make them crisp faceted slopes.
5. THE WINDOWS. A two column ladder of large square panes that reads as a checkerboard, coarser than the stepped tower's fine field. More columns of smaller panes, reveals that cast shadow, lit rooms sparse and bright, fading to a warm wall below two pixels.
6. THE PODIUM'S ROOF LEDGE is cream (up to 245, 215, 181) and pulls the eye: bring it into the granite family.
7. MEASURE WHAT HAS NOT BEEN: real frames of a slow scroll and a cursor pass (npm run live) for crawl on the ring and the windows, and npm run perf -- "/lab/piece/world?only=spire&label=0&ui=0".
8. Judge on the hero, under his name: npm run shot -- "/lab/hero?ui=0" --t 6 --wait 3000 --out shots/world/spire/r3-hero.jpg.
