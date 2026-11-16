# Your part: the city. Round 6

## What you own
scripts/world/parts/towers/, public/world/towers-city*.{bin,png}, public/world/tower-step*.{bin,png}, src/pieces/world/parts/towers.ts, src/pieces/world/parts/towers/. Stills in shots/world/towers/ with the prefix r6-. Report: shots/world/towers/r6-report.md. Read first: briefs/towers-r5.md, shots/world/towers/r5-report.md and its two reviews, and the END of briefs/common.md (all of it: the moon is lower and stronger, and the last entry is about your own shader fault).

## Where it stands
Round 5 scored 6 and 6.5. Kept: HIS STEPPED TOWER, back to round 1's limestone (lit piers (147, 135, 126)) with its chamfered coursed piers, its base with doors and its six fluted gold tiers. Every named top within 6 pixels of picture 9. The variety of designs with no two neighbours alike. The Sun disc's carving. Windows that hold still under scroll. 3.97 MB, 327,858 triangles.

## Fable takes back half of a rule
Round 5's brief said: every stone at a saturation of 0.15 to 0.35. On the real page, over the hero's warm glow, the result reads as "cool pewter", "silver grey", and the city no longer reads as picture 9's one warm brown mass. Both reviewers and Fable's own look agree. So:
- HIS STEPPED TOWER STAYS PALE LIMESTONE, exactly as it is. It is the one pale building, and it reads as special for it.
- EVERY OTHER STONE GOES WARM, toward the picture's: browns and tans, hue 22 to 30, saturation 0.4 to 0.6, in five or six depths from a mid tan to a deep red brown, with a few near black glass ones. Darker than they were in round 4, so the lit windows carry.
- GOLD IS TOLD FROM STONE BY LIGHT, NOT BY HUE: gold blazes (4 below), stone does not. Copper and bronze stay the accents they are.
Judge the stone on the real page (/lab/hero), never on black.

## The plan changed: make the city again first
The left end stood 10 to 15 pixels low with sky between its buildings: there every top is 11 pixels higher and every building a sixth wider (placed.ts). And the low buildings that stood before the row of trees between the pyramid and the spire are moved back behind it.

## What must change, most important first
1. CAMOUFLAGE. The lit windows read as rust stains or camouflage blobs at the page's size and at scale 1: large irregular orange patches on the stepped tower's bay, the disc's tower and others. Round 5 asked for whole floors in clumps and it went too far. What a city at night has: most of each face dark, lit rooms fine and scattered, a floor or a few rooms in a row here and there, never a lit patch wider than a few windows or taller than two floors. Round 1's dark bay with single rooms was nearer.
2. EVEN LIGHT, TOP TO FOOT. The buildings are lit the same from roof to street, with little cast shadow. The moon is low and behind them now: tall buildings throw long shadows across lower ones, tops catch the moon and are paler, and the feet are warm from the street (shopfronts and lamps bleeding up the lowest storeys). Each building has a gradient.
3. THE MOON'S LINE is one even (248, 211, 173) stripe down whole chamfers, and roof edges clip past pale. It falls off along its length (brightest where the chamfer faces the moon squarely), and nothing goes past (255, 227, 194).
4. GOLD IS DIMMER THAN THE PICTURE'S. The crown's brightest tenth is 137 to 161 against 224, and it reads as "matte caramel or cardboard" at three times: flat tiers, nothing changing across a face, no blaze on the reeds. The obelisk has only a thin strip lit (middle brightness 75 against 125). The gold cap is mostly dark. The pyramid and the pale tower outshine every gold top. Each gold thing: a bright face (to the hot light's cap) beside a near black one, with the moon's own reflection carrying the bright one, as the pyramid does this round.
5. NEVER PLAINER. The obelisk lost its flutes to hide a shading fault you could not find. Find it (it is very likely the fault in common.md's last entry, or a normal that is not unit after your reed lookup) and put the flutes back.
6. THE GOLD CAP at 969 across is now "a fat swelling bulb, a candle flame". The picture's is a slim pointed cap with a needle that swells only a little: bring it back toward slim, and give its lathe enough rings (about ten hard horizontal bands show across its bulb through the moon's highlight) or take its normals from the profile itself.
7. THE SUN DISC's toothed rim gives a ragged gear outline at the page's size and it stands on a visible stalk. A round rim with the carving inside it, seated on its tower's top.
8. The drums and the water tower read as toy cylinders: seams, bands let in, weathering.

## How to look
First: npm run match -- --at 60,0,1260,330 --out shots/world/towers/r6-match. Then THE REAL PAGE at its own size and at --scale 1, stacked under the picture: that is where the stone and the windows are judged. Then close:crown and close:city. Real frames of a slow scroll.
