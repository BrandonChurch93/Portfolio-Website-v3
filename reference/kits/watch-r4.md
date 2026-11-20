# Brief · the pocket watch, round 4 (the final pass, Nov 20)

Read first, in this order: `reference/kits/README.md` (above all "The look"), `reference/kits/watch.md`, `reference/kits/cpu.md`, then `QUALITY.md` ("Six tests", "Fail on sight"). Open `reference/bar/pc-builder-parts.jpg` and `reference/bar/pc-builder-rig.jpg`. You own `src/pieces/watch/` and nothing else.

## Why this round

- His words, Nov 20: "The one for AI engineering is OK but the other two could definitely use a bit more love." And on Nov 16: "The quality bar for full stack and design should be just as high as that one, else it will look out of place."
- The watch stands in the second row of Skills on the home page, 60 px under the CPU. The CPU is the bar. Take both at the page's size before you change anything, and put them side by side:

```
npm run shot -- "/lab/piece/cpu?size=220&label=0&ui=0&stream=1" --t 6 --lamp 0.45,0.35 --wait 1500 --png --out shots/watch/r4/cpu-220.png
npm run shot -- "/lab/piece/watch?size=220&label=0&ui=0&stream=1" --t 6 --lamp 0.45,0.35 --wait 1500 --png --out shots/watch/r4/before-220.png
npm run shot -- "/lab/piece/watch?label=0&ui=0&stream=1" --t 6 --lamp 0.45,0.35 --wait 1500 --out shots/watch/r4/before-large.jpg
```

## What is wrong with it today, as Fable sees it

1. **It is one family of orange gold.** Case, dial, plate, bridges, wheels: every part is a tint of the same metal, so at the page's size it is two tan discs. The CPU beside it is a near black board with a few bright copper things on it, and that is why the CPU reads. This breaks the kit's own rule: "Only copper is orange, and copper is an accent. Never more than about a quarter of what is seen of a thing. Everything else is close to neutral."
2. **Nothing in it is crisp.** The dial's turned rings beat against the pixels as a moiré (rings that swim, a pale lozenge over the cartouche). The bridges' stripes are so coarse and so strong that they read as corrugated card, and the plate's perlage as cloth. The bridges are clumsy slabs: one great T. None of it says watchmaking.
3. **It is small and flat.** Two discs lying side by side, each about 75 px across on the page, where the CPU is one object 160 px across. Nothing overlaps anything, so there is no depth.

## What to make, in this order. Finish each before the next, and look at the page's size after each.

### 1. Separate the materials (the largest gain)

Re-finish the watch as a modern dark movement in an antique case. Three values, on purpose:

- **Near black, and most of what is seen:** the dial's ground, the mainplate and the bridges. A warm dark steel or blackened finish (as the CPU's board and chokes are dark), neutral beside the gold: a mid tone on it has saturation under 0.2. It is drawn by light on its edges and by its finishing, never by being lit orange.
    - The bridges' stripes (côtes de Genève) are a change of sheen across broad shallow waves, seen as soft bands of light that slide when the cursor moves. Not painted stripes, not ridges.
    - The plate's perlage is small overlapping circles of sheen, visible only where a light catches it, and absent at the page's size (leave out what is finer than a pixel there).
    - Every bridge has a polished bevel (anglage) round its whole outline that shows as one thin pale line toward the light. That line is what draws a dark bridge on a dark plate.
- **Gold, the accent, about a quarter of what is seen:** the wheels of the going train with cut teeth and spokes, the barrel's ratchet, the balance wheel with its timing screws, the chatons round the jewels, the hands, the numerals and the minute track on the dial, the crown, the bezel's coin edge. The world's gold from the palette, never yellow.
- **Pale glints, small:** the bevels, the screw heads' polished slots, the teeth tips, the hands' edges, one arc on the crystal.
- **Ember, tiny:** the jewels, deep and clear, each in its gold chaton. They are the only saturated red orange at rest.
- **The case** is bronze: darker and browner than the gold, satin on its band and polished on its bezel.
- **The dial:** a dark ground with a fine sunk centre, an applied chapter ring, raised Roman numerals in gold with a polished top, a railway minute track in pale cream, the sunk small seconds with its own ring, gold hands with a pale edge. If turned rings stay, they must be free of moiré at 220 px and at the large size with the cursor anywhere: test at `--lamp` 0.2,0.3, 0.5,0.5, 0.8,0.3 and 0.5,0.8, and at `--scale 1` and `2`. A ring pattern finer than two pixels at the size drawn is left out of that size (fade it by its own screen frequency).

### 2. Make the movement watchmaking

- Replace the one great T of a bridge with real bridges: a barrel bridge, a train bridge with a sweeping edge, a balance cock with its regulator, each a shaped plate with countersunk screws and jewels in chatons along the train's line. Three or four pieces with open plate between them, so the wheels show beneath: the centre, third, fourth and escape wheels must be countable, meshing, with spokes.
- The balance is the star: a gold wheel with its screws, a hairspring you can see as a spiral at the large size, under an engraved cock. It is what moves most when the stream is on.
- Engraved made up words and a serial on the barrel bridge, sharp at three times zoom, as the CPU's etch is. No real maker's name.

### 3. Give it size and depth

- Today the pair lies flat, 0.73 of the host's height across, and each half is half of that. Recompose it so each half is drawn larger and one overlaps the other: the half with the dial lies flat at the front right, and the half with the movement stands up from the hinge behind it and to its left, opened to about 105 to 120 degrees and facing the visitor, so the movement is seen nearly square on and the dial as an ellipse in front of it. Its shadow falls on the table and across the dial's case. The whole silhouette stays inside 0.78 of the host's height both across and down, centred on the host's middle. Aim for each disc at least 0.5 of the host's height across as drawn.
- If the standing half cannot be made to look right, keep the halves flat and overlap them (the dial's case lying over the edge of the other's) at the same sizes. Say which you did and why.
- The chain stays inside the silhouette's box.
- **The anchor moves with the silhouette.** `WATCH.strike` is its left most point in the picture at the middle of the host's height: measure it again by projection, to a hundredth of a host height at any host size, and report the number.
- The three ways of coming to life and the running train must still work on the new arrangement. Check each with a filmstrip.

## What must not change

- The contract, word for word: `createWatch`, `WATCH`, `LIFE`, `setStream`, `setLife`, the clear ground, drawing only when something changed, `freeze`, reduced motion.
- The budgets: under 110,000 triangles, 14 shader programs, a first frame under 160 ms. Motion by uniforms and transforms only: never rewrite a geometry's buffer each frame (Safari holds 100 MB for one). Report `stats()`.
- The palette: nothing bluer than it is red, nothing white, nothing yellow. Count on a `--png` still.

## How to judge it, honestly

- First and every time: the page's size, beside the CPU's still, in one image (`shots/palette/beside.mjs` shows how one was made, or write your own). Ask which is the weaker thing. Then the large size, then three times zoom on the movement and on the dial.
- Then the real page, where the stream's light is beside it: `npm run shot -- "/lab/skills?ui=0" --scroll 560 --t 20 --wait 2500` (read `CLAUDE.md`, Commands, for what `--t` does here), and crop the row.
- With the stream on and off, and with the cursor's light left, right and low.
- A filmstrip of it running, and one of each of the three ways.
- Assume your first verdict is too kind. If a part is not better than before at the page's size, put it back.

## The shared server and the rules of the round

- A dev server is running on port 5330 and is shared with another builder and with Fable: do not start another, do not stop it, do not run `npm run build`. Check types with `npx tsc --noEmit` (two errors in `.next/dev/types/routes.d 2.ts` are an iCloud duplicate and not yours).
- Touch nothing outside `src/pieces/watch/`. Do not commit or push. Do not edit the record. Put your stills in `shots/watch/r4/`.
- Almost no code comments, no em dashes, TypeScript strict.

## Your report (your final message, since nothing else of yours is read)

- What you changed, in a short list, and which of 1, 2 and 3 are done, part done or not done.
- The paths of: before and after at the page's size beside the CPU (one image), after at the large size, three times on the movement and on the dial, the real page's row, the running filmstrip, the three ways.
- The six tests, each passed or failed, told plainly, and what is still short of the CPU and why.
- `WATCH.strike` as measured, triangles, programs, first frame, frame time.
