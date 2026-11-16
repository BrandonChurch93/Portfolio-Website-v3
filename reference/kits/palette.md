# Kit · the palette and brush

Read `reference/kits/README.md` first, then `reference/kits/cpu.md` whole: this piece keeps the CPU's contract word for word (the `Struck` contract in `src/world/struck.ts`, `setStream(on, since)`, `setLife(way, age)` with its three ways, an exported strike `Anchor`, a fixed height of its world framed, a clear ground, drawing only when something changed). Read `src/pieces/cpu/` as the worked example. This is `src/pieces/palette/`.

## What it is

- A painter's wooden palette lying flat with a brush laid across it. It stands at the left of the third row of skills, Design Systems & Craft, and is what the stream strikes to wake that row.
- Brandon's own thought on Nov 14 ("a painter's palette with a brush"), picked from the rough derby (`reference/studies/48-*`). His words for all three things: real things in fine detail, not simple forms, "at the standard of my PC Builder's parts, in our colors only". Rows two and three have stood empty since, and on Nov 16 he said so.
- The idea: a design system is a palette. The paints on it are the site's own colors, in order.

## What is on it

Model each as a real part at real sizes in millimetres. The palette is about 300 by 220.

- **The palette.** A kidney shaped board of dark walnut about 5 mm thick with a thumb hole, its edge rounded and worn pale where a hand holds it, grain that follows the board, old stains and scrapes, a chip out of one edge.
- **The paints.** Along the far rim, a row of squeezed dabs in the site's palette from dark to pale (ember deep, ember, flame, hot, pale, bronze, copper: `src/config/palette.ts`, nothing else), each a real blob with a peak and a skin, and in the middle a mixing area where two of them are drawn into each other with knife strokes, thick enough to catch light on its ridges.
- **The brush.** A round sable brush lying across the lower half and over the edge: a turned wooden handle with a worn lacquer, a crimped brass ferrule with its two crimp lines, hairs that come to a point and are loaded with the hot color, a bead of paint where the tip rests.
- **A palette knife** beside the mixing area: a thin bronze blade with a cranked neck and a wooden handle, paint on its edge.
- **Its metals and woods.** Walnut, brass and bronze, paint with a wet sheen on the fresh dabs and a matte skin on the old stains. Nothing green, nothing blue, nothing white.

## How it is seen

- From above and the front left, about 50 degrees up and about 28 degrees round, narrow field of view (20 degrees or less), as the CPU is: the three things are one family.
- The palette's silhouette is about 0.73 of the host's height across, centred on the host's middle, with a soft contact shadow.
- It turns a little toward the cursor, about 5 degrees each way, eased, with weight. It is lit by the cursor's light: the wet paint's highlights, the ferrule and the grain must answer it.

## The stream in it

- The stream meets it at its left most point in the picture, at the middle of the host's height. Export that as `PALETTE.strike`.
- `setStream(on, since)`: the paints light from inside, one dab after another along the rim, each in its own color, and the light runs along the knife strokes of the mixing area and up the loaded hairs of the brush. Uneven, never a loading bar. The light is physical: each lit dab colors the wood beside it and the underside of the brush.
- With `on` at 0 and the thing alive it is a still object: wet paint under the cursor's light.

## Three ways of coming to life

`setLife(way, age)` exactly as the CPU's kit says, with `LIFE` exported: `shards`, `band`, `flash`. For `flash` the brush and the knife stand a short way over the board and the dabs are small, and they settle and swell home with weight.

## Budgets

Under 50,000 triangles, 10 shader programs at the most, a first frame under 120 ms on his Mac. Uniforms and textures only for what moves: never rewrite a geometry's buffer each frame.

## What to hand back

- `src/pieces/palette/index.ts` exporting `createPalette`, `PALETTE` (with `strike`) and `LIFE`, and `model.ts`. One line added to `src/pieces/load.ts` for it (read that file again right before you edit it: another builder is adding a line of their own).
- It shows alone at `/lab/piece/palette` (and `?size=220&label=0&ui=0` at the page's size).
- Stills: at rest, at three times zoom on the paints and on the ferrule, lit by the stream, with the cursor's light left and right, at the page's size beside the CPU's (`/lab/piece/cpu?size=220&label=0&ui=0`). A filmstrip of each of the three ways and one of the paints lighting.
- Do not touch `src/components/lab/SkillsLab.tsx`, `src/skills/` or the stream: Fable puts it in the page.
