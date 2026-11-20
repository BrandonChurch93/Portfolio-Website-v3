# Brief · the palette and brush, round 4 (the final pass, Nov 20)

Read first, in this order: `reference/kits/README.md` (above all "The look"), `reference/kits/palette.md`, `reference/kits/cpu.md`, then `QUALITY.md` ("Six tests", "Fail on sight"). Open `reference/bar/pc-builder-parts.jpg` and `reference/bar/pc-builder-rig.jpg`. You own `src/pieces/palette/` and nothing else.

## Why this round

- His words, Nov 20: "The one for AI engineering is OK but the other two could definitely use a bit more love." On Nov 16, of this one: "The current design systems one doesn't look great either. Not necessarily saying I want to toss it, but it needs to be greatly improved." And: "The quality bar for full stack and design should be just as high as that one, else it will look out of place."
- It stands in the third row of Skills on the home page, Design Systems & Craft, under the CPU and the watch. The CPU is the bar. Take both at the page's size before you change anything, and put them side by side:

```
npm run shot -- "/lab/piece/cpu?size=220&label=0&ui=0&stream=1" --t 6 --lamp 0.45,0.35 --wait 1500 --png --out shots/palette/r4/cpu-220.png
npm run shot -- "/lab/piece/palette?size=220&label=0&ui=0&stream=1" --t 6 --lamp 0.45,0.35 --wait 1500 --png --out shots/palette/r4/before-220.png
npm run shot -- "/lab/piece/palette?label=0&ui=0&stream=1" --t 6 --lamp 0.45,0.35 --wait 1500 --out shots/palette/r4/before-large.jpg
```

## What is wrong with it today, as Fable sees it

1. **The board reads as smoked glass, not wood.** It is near black with a pale haze over it and a faint grain, so the page seems to show through it. A palette is a solid board of timber with a varnish on it.
2. **The paints are one peach.** A dozen dabs in the same pale orange, scattered, each a soft swirl with a dimple: they read as sweets or pastries. Nothing says these are colors in an order, which is the whole idea of the piece.
3. **Soft light where there should be form.** With the stream on, the mixing area is a round glow, and a straight bright line crosses the board from the cup to the knife and reads as a fault. `QUALITY.md` fails "a glow that reads as a ball, or soft round spots of light".
4. **The tools are thin and dark.** The brushes are two dark sticks with speckles. The knife is the best thing on it. The cup is good.
5. At the page's size (about 160 px across) it is a dark oval with orange dots. The CPU beside it is a designed object with something to find everywhere.

## The idea, sharpened: a design system is a palette, and the paints on it are a scale

Keep the palette and the brush: he picked them and wants them greatly improved, not replaced. What changes is that the paints become **an ordered scale**, the thing a design system is, and every part is made to the CPU's level of finish.

## What to make, in this order. Finish each before the next, and look at the page's size after each.

### 1. The board is timber

- A kidney shaped board of walnut, solid and opaque, a mid brown that is plainly lighter than the page's ground, so its whole outline reads at the page's size without a rim light doing the work. Its grain is figure tens of millimetres wide that follows the board (`QUALITY.md`: "the timber needs figure tens of millimetres wide to read as wood"), with a satin varnish: one broad soft band of sheen that slides across it as the cursor moves, breaking over the grain.
- Its edge is rounded and shows its thickness, worn paler where a hand holds it. The thumb hole has a chamfer that catches a line of light. It throws a soft shadow on the ground and everything on it throws a short shadow on it: the dabs, the brush, the knife, the cup. Contact shadows are what make it sit.
- Keep the stains, the chip, the tape and the stamp only if each reads as what it is at three times zoom. Cut what reads as noise.

### 2. The paints are a scale

- **Nine dabs in one even arc along the far rim, in order from dark to pale:** a near black umber, deep ember, ember, flame, copper, a hot orange, a warm gold of the palette (never yellow), pale, and a cream that is the palette's pale and not white. Same size, evenly spaced, like the steps of a color scale. From `src/config/palette.ts` and steps mixed between its colors: nothing else.
- Each dab is a real squeeze of oil paint: a coiled ridge with a peak pulled off to one side, a crisp crease where it folds on itself, a wet skin with a small sharp highlight that moves with the cursor, and a shadow on the board. Not a swirl with a dimple. Model one well and vary it (turn, lean, peak) for the rest.
- **Beside each dab a small mark in the board:** a brass pin head or an inlaid tick with a tiny stamped step number (made up: 05, 10, 20 up to 90, or 100 to 900), sharp at three times zoom, as the CPU's printed codes are. This is the "system": it is what an engineer finds when he leans in.
- **The mixing area is three or four pulled swatches,** not a blob: flat drawdowns side by side made with the knife, each a clean rectangle about 30 by 14 mm with a ridge along both sides and a ragged end where the knife lifted, in mixed steps of the scale, the last one still wet. A swatch card in paint.
- No loose crumbs of paint scattered over the board.

### 3. The tools

- **One brush, made well, and it is the largest thing after the board.** A round sable about 230 mm long lying across the lower half and out over the edge: a long turned handle in a deep lacquer with a band of copper lacquer near its end and a stamped size, a seamless ferrule in polished brass or copper with two crimp rings (the piece's brightest metal, and its copper accent), hairs gathered to a point and loaded with the hot color, a bead of wet paint where the tip rests on the board. It throws a shadow on the board along its whole length and the ferrule mirrors the cursor's light as a long sharp streak.
- A second, smaller flat brush only if it adds: otherwise cut it.
- **The palette knife:** a polished blade that mirrors, a cranked neck, a ferrule, a wooden handle. Paint on its edge.
- **The cup:** keep it, as a brass dipper clipped to the rim with oil in it that mirrors the light.

### 4. The stream in it

- The dabs light in turn along the arc from the strike, dark end first, each in its own color from inside, each coloring the board right beside it and the underside of whatever lies over it. At the page's size this is a scale lighting step by step, and it should be a pleasure to watch. Then the swatches, then the loaded tip of the brush.
- No straight bright line across the board, no round glow, nothing that washes the board one orange. A lit dab is a small bright thing with a tight pool of its color on the wood.
- With the stream off it is a still object under the cursor's light, and has to look finished like that.

## What must not change

- The contract, word for word: `createPalette`, `PALETTE`, `LIFE`, `setStream`, `setLife`, the clear ground, drawing only when something changed, `freeze`, reduced motion.
- How it is seen (about 50 degrees up, 28 round, narrow lens) and its size: the silhouette about 0.73 of the host's height across, centred. If its outline changes, measure `PALETTE.strike` again by projection and report it.
- The budgets: under 50,000 triangles (ask in your report if the dabs need more: up to 70,000 is acceptable if you say what it bought), 10 shader programs, a first frame under 120 ms. Uniforms and textures for what moves: never rewrite a geometry's buffer each frame.
- The palette: nothing bluer than it is red, nothing white, nothing yellow. Count on a `--png` still.

## How to judge it, honestly

- First and every time: the page's size, beside the CPU's still, in one image (`shots/palette/beside.mjs` shows how one was made, or write your own). Ask which is the weaker thing. Then the large size, then three times zoom on the dabs, the swatches and the ferrule.
- Then the real page, where the stream's light is beside it: `npm run shot -- "/lab/skills?ui=0" --scroll 760 --t 20 --wait 2500` (read `CLAUDE.md`, Commands), and crop the row.
- With the stream on and off, and with the cursor's light left, right and low.
- A filmstrip of the dabs lighting, and one of each of the three ways.
- The three values, measured on a `--png` still: a near black, a mid brown that is the wood, and small pale glints near (255, 227, 194).
- Assume your first verdict is too kind. If a part is not better than before at the page's size, put it back.

## The shared server and the rules of the round

- A dev server is running on port 5330 and is shared with another builder and with Fable: do not start another, do not stop it, do not run `npm run build`. Check types with `npx tsc --noEmit` (two errors in `.next/dev/types/routes.d 2.ts` are an iCloud duplicate and not yours).
- Touch nothing outside `src/pieces/palette/`. Do not commit or push. Do not edit the record. Put your stills in `shots/palette/r4/`.
- Almost no code comments, no em dashes, TypeScript strict.

## Your report (your final message, since nothing else of yours is read)

- What you changed, in a short list, and which of 1 to 4 are done, part done or not done.
- The paths of: before and after at the page's size beside the CPU (one image), after at the large size, three times on the dabs, the swatches and the ferrule, the real page's row, the lighting filmstrip, the three ways.
- The six tests, each passed or failed, told plainly, and what is still short of the CPU and why.
- `PALETTE.strike` as measured, triangles, programs, first frame, frame time.
