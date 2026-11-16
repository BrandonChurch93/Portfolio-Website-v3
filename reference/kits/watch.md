# Kit · the pocket watch, opened

Read `reference/kits/README.md` first, then `reference/kits/cpu.md` whole: this piece keeps the CPU's contract word for word (the `Struck` contract in `src/world/struck.ts`, `setStream(on, since)`, `setLife(way, age)` with its three ways, an exported strike `Anchor`, a fixed height of its world framed, a clear ground, drawing only when something changed). Read `src/pieces/cpu/` as the worked example, and its stills at the page's size: that is the bar. This is `src/pieces/watch/`.

## What it is, and his words

- An antique pocket watch lying open on its back: the dial up on the hinged front, and beside it, swung open, the case back with the whole movement showing. It stands at the left of the second row of skills, Full-Stack Engineering, and is what the stream strikes to wake that row.
- The idea: front end and back end in one object. The dial is what a person reads. The movement is what makes it true.
- Brandon picked it on Nov 16 from three options, after turning down a monitor with its back off: "I do not like the idea of having another computer component there." And of all three rows' things: "The quality bar for full stack and design should be just as high as that one [the CPU], else it will look out of place." He builds things and looks closely. A watch that could not run is a watch he will not believe.
- It belongs to the site's own metal: the engine turned blank and the antique cabinet knob of the sleeping cards (`src/metal/dial.ts`), the Sun stones. Open those in `/lab/work-blank` before you start.

## What is on it

Model each as a real part at real sizes in millimetres. The case is about 50 mm across. Lay the two halves side by side, joined at the hinge, about 105 mm across in all.

- **The front half: the dial.** A bronze case with a coin edged bezel and a domed crystal. A dial engine turned in rings (guilloché) with an applied chapter ring, Roman numerals in relief, a railway minute track, a sunk small seconds dial at six with its own turning, blued style hands in the site's dark with a polished edge (cathedral or Breguet hands), a maker's cartouche with made up words. The crown and its bow at twelve, with fluting.
- **The back half: the movement.** A full plate or three quarter plate movement: the mainplate with perlage (overlapping circles), bridges with Geneva stripes and bevelled, polished edges, jewels in gold chatons with blued screws, the going train (centre, third, fourth and escape wheels, each with its spokes and teeth cut, meshing), the barrel with its ratchet and click, the balance wheel with its timing screws, the hairspring as a real spiral, the balance cock engraved with scrollwork and its regulator with an index, the pallet fork and escape wheel under it. Engraved made up serial and words on a bridge.
- **The case back's inside**: polished, with hallmarks and a scratched service mark, seen in the hinge's shadow.
- **A short length of chain** from the bow, a few real links running off toward the row's border.
- **Its metals.** Bronze and copper cases, gold chatons and wheels in the world's gold (never yellow), steel parts in the site's dark with a polished bevel, jewels as deep ember. Nothing silver, nothing blue, nothing white.

## How it is seen

- From above and the front left, about 50 degrees up and about 28 degrees round, narrow field of view (20 degrees or less), as the CPU is: the things are one family.
- The pair's silhouette is about 0.73 of the host's height across at its widest, centred on the host's middle, with a soft contact shadow.
- It turns a little toward the cursor, about 5 degrees each way, eased, with weight. It is lit by the cursor's light: the guilloché, the Geneva stripes, the perlage and every bevel must answer it as the cursor moves, as a real watch flashes when it is tilted.
- At the page's size (a 220 unit host) it reads at a glance as an opened pocket watch: a dial and a movement. Check there first, every draft, beside the CPU.

## The stream in it

- The stream meets it at its left most point in the picture, at the middle of the host's height. Export that as `WATCH.strike`.
- `setStream(on, since)`: it runs. The balance swings, the escape wheel steps, the train turns at its true ratios, the seconds hand sweeps on the dial, and light runs through it: the jewels glow from inside, the stream's light travels the train from the barrel to the balance wheel by wheel, the numerals on the dial light in turn. Uneven, alive, never a loading bar. The light is physical: it colors the plates beside a lit jewel and the underside of the balance.
- With `on` at 0 and the thing alive it is stopped: a still watch under the cursor's light.
- Motion by uniforms and transforms only: never rewrite a geometry's buffers each frame.

## Three ways of coming to life

`setLife(way, age)` exactly as the CPU's kit says, with `LIFE` exported: `shards`, `band`, `flash`. For `flash` the parts stand a short way off their seats (the bridges lifted, the wheels above their pivots, the hands off the dial, the case back half closed) and drop home with weight, the last being the balance, which starts to swing.

## Budgets

Under 110,000 triangles, 14 shader programs at the most, a first frame under 160 ms on his Mac.

## What to hand back

- `src/pieces/watch/index.ts` exporting `createWatch`, `WATCH` (with `strike`) and `LIFE`, and its model files. One line added to `src/pieces/load.ts`, and `'watch'` added to `PIECES` in `src/config/site.ts` beside `'cpu'`, so `/lab/piece/watch` serves it. Nothing else outside your folder.
- Stills: at rest, at three times zoom on the movement and on the dial, running under the stream, with the cursor's light left and right, and at the page's size beside the CPU's (`/lab/piece/cpu?size=220&label=0&ui=0`). A filmstrip of each of the three ways and one of it running.
- Do not touch `src/components/lab/SkillsLab.tsx`, `src/skills/` or the stream: Fable puts it in the page.
