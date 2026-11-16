# Kit · the screen with its back off

Read `reference/kits/README.md` first, then `reference/kits/cpu.md` whole: this piece keeps the CPU's contract word for word (the `Struck` contract in `src/world/struck.ts`, `setStream(on, since)`, `setLife(way, age)` with its three ways, an exported strike `Anchor`, a fixed height of its world framed, a clear ground, drawing only when something changed). Read `src/pieces/cpu/` as the worked example. This is `src/pieces/screen/`.

## What it is

- A desktop monitor seen from behind and a little to one side, with its back cover taken off. It stands at the left of the second row of skills, Full-Stack Engineering, and is what the stream strikes to wake that row.
- Brandon picked it on Nov 14 from a rough derby (`reference/studies/48-*`, "a screen with its back off"). His words for all three things: real things in fine detail, not simple forms, "at the standard of my PC Builder's parts, in our colors only". Rows two and three have stood empty since, and on Nov 16 he said so: "the one for full stack engineering, and design systems and craft are missing."
- The idea: front and back in one object. The front is an interface, the back is what runs it.

## What is on it

Model each as a real part at real sizes in millimetres. A 27 inch panel is about 610 by 360 mm: build this one smaller, about 320 by 200, so its parts read at the page's size.

- **The panel, from behind.** The stamped steel tray of the panel with its ribs and screw bosses, the edge of the glass and the bezel seen from the back, a strip of light leaking round the panel's rim where the backlight is.
- **The boards.** A main board in the middle (a scaler chip under a small heat sink, a row of ports along its lower edge: two HDMI, a DisplayPort, USB, a barrel jack), a power board beside it (a transformer, three or four large capacitors, an inductor, a fuse, a heat sink fin), a thin driver board along the top edge, a small button board at one lower corner.
- **The cables.** A wide flat ribbon from the main board up to the driver board, a twisted pair to the backlight, a thin ribbon to the button board. Each with its connector seated, a kink where it turns, and a tape tab holding it down.
- **The stand.** A short neck and a hinge at the lower middle, cut off cleanly under the hinge (no foot: the row's border is under it).
- **A sliver of the front.** It is turned far enough that the lit edge of the front shows down one side: the screen is on, and what it shows is warm rows of an interface, read only as light.
- **Its metals.** Dark steel tray, boards in the site's dark with copper traces and pads, bronze heat sinks and shields, copper coils. Nothing green, nothing silver, nothing blue.

## How it is seen

- From behind, about 24 degrees round to the left and 8 degrees above, narrow field of view (20 degrees or less).
- Its silhouette is about 0.73 of the host's height across, centred on the host's middle, with a soft contact shadow under the hinge.
- It turns a little toward the cursor, about 5 degrees each way, eased, with weight. It is lit by the cursor's light: the tray's ribs, the heat sinks' fins and the solder joints must answer it.

## The stream in it

- The stream meets it at its left most point in the picture, at the middle of the host's height. Export that as `SCREEN.strike`.
- `setStream(on, since)`: power comes up. Light runs from the power board along the traces to the main board, up the ribbon to the driver board, and the leak round the panel's rim rises to full, in ember to flame to hot, pale only at the crest. Uneven, in bundles, never a loading bar. The light is physical: it falls on the tray beside a lit trace and on the undersides of the cables.
- With `on` at 0 and the thing alive it is a still object with a faint standby light.

## Three ways of coming to life

`setLife(way, age)` exactly as the CPU's kit says, with `LIFE` exported: `shards`, `band`, `flash`. For `flash` the parts stand a short way off their seats (the boards off their bosses, the ribbon unplugged, the tray's screws out) and drop home with weight.

## Budgets

Under 60,000 triangles, 12 shader programs at the most, a first frame under 120 ms on his Mac. Uniforms and textures only for what moves: never rewrite a geometry's buffer each frame.

## What to hand back

- `src/pieces/screen/index.ts` exporting `createScreen`, `SCREEN` (with `strike`) and `LIFE`, and `model.ts`. One line added to `src/pieces/load.ts` for it (read that file again right before you edit it: another builder is adding a line of their own).
- It shows alone at `/lab/piece/screen` (and `?size=220&label=0&ui=0` at the page's size).
- Stills: at rest, at three times zoom on the main board and the power board, lit by the stream, with the cursor's light left and right, at the page's size beside the CPU's (`/lab/piece/cpu?size=220&label=0&ui=0`). A filmstrip of each of the three ways and one of the power coming up.
- Do not touch `src/components/lab/SkillsLab.tsx`, `src/skills/` or the stream: Fable puts it in the page.
