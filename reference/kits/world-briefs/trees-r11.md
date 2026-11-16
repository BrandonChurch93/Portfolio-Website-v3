# Your part: the trees. Round 11: one soft head to a tree, in the moon's light

## What you own
scripts/world/parts/trees/, public/world/trees.bin and trees-leaves.png, src/pieces/world/parts/trees.ts, src/pieces/world/parts/trees/. Stills in shots/world/trees/ with the prefix r11-. Report: shots/world/trees/r11-report.md. Read first: shots/world/trees/r10-report.md and its two reviews (r10-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands (round 10 is committed: git has it, so you can always get back to it)
Round 10 scored 6 and 5 and Fable kept it: the flat salmon cut outs are an autumn wood now. Kept, and not to be lost: each tree's own hue (ochre, orange, rust, deep red), which the picture does not have and is better for. The shade each lump lays on the crown behind it, and the sprigs that break the outline. A belt that is perfectly steady under a scroll at the page's size. The carpet's values from its darks to its upper quartile on picture 9's. Nothing off the palette. 90,056 triangles, 20 draw calls, the atlas 1.37 MB.

Fable, with r10-before-after-page-2.jpg open (picture 9, round 9, round 10 at the page's size): the color is right and the form is popcorn. The picture's tree is ONE soft round head, lit above and dark beneath, with dark between it and the next. Ours is a heap of small bright lumps, so the eye counts lumps and not trees.

## The plan is Fable's, and two things in it are being put right
Both reviewers: the belt is missing from about 940 to 1060 across where the picture has an unbroken row of large crowns before the dunes, and each side of the spire the bank climbs between the buildings to their mid height where the picture's is one low even row with the buildings standing clear above it. Those are placed.ts and the land's dunes, not yours. placed.ts may change while you work: make your part again from it before every still you judge, and say in your report which trees are still hidden by land in front.

## What must change, most important first
1. ONE HEAD TO A TREE AT THE PAGE'S SIZE. Fewer, larger lumps, and less contrast between the lumps of one crown when it is drawn small, with a shade over the whole crown from a lit upper side to a dark underside. Dark between trees. Count trees, not lumps, from across the room.
2. THE MOON'S LIGHT. Every crown is lit evenly on its top and face by the frontal light, and none has the moon's pale rim on its upper right silhouette against the dark fronts behind it. The moon is behind the world and to the visitor's right: a pale rim there, a dark underside, the same light the buildings behind them have. The lit tops are a hot saturated orange (blue over red 0.31 against the picture's 0.53): bring them toward pale tan and peach, and keep rust and deep red for the shade. Between the pyramid and the spire the bank is a value step dark (mids 85 against 118): lift it. The pyramid's gold face does light the crowns beside it in the picture: a warm pale light from the pyramid's side on the crowns within about 60 units of it is yours to add.
3. A CROWN HAS AN INSIDE. At three times every lump is a flat card with a crisp even outline (stair stepped alpha, leaf texels smeared to blobs), nothing dark behind it and no sky through it: "painted foliage on a stage flat". Leaf edges and not card edges, the inside of the crown going dark between lumps, a few holes with the night through them, a trunk and a branch or two seen.
4. SHADOWS OF TRUE LENGTH. A tree on the lit paving throws a shadow under half its true length (SHADE reach 2.6) under a moon 22 degrees up, where everything else throws one two and a half times its height: a soft dappled shadow of true length, with no skid marks, and the trunk meeting the ground.

## Budget
95,000 triangles and 20 draw calls at the most, the atlas no larger than it is.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --t 6 --wait 12000), cut to the belt and laid under picture 9 and round 10 as r10-before-after-page-2.jpg was. Then close:trees at three times. Then real frames of a slow scroll (npm run live) to show nothing crawls. From across the room: a row of separate soft heads in autumn colors, in the same moonlight as the city behind them.
