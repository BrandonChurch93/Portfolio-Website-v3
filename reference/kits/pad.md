# Kit · the launch pad in Contact

Read `reference/kits/README.md` first: the bar, the colors and "The look" hold for everything here. This is `src/pieces/pad/`, one piece with one stage, as the desk is (`reference/kits/desk.md`), and each thing on it is a part with a builder of its own: the Sun stone, the launch table with the tower, and the rocket with its fire.

`BRIEF.md`, Settled, "Contact, the first build", items 16 to 24, is the agreement. `QUALITY.md`, "Contact, the first build", tests 12 to 18, is how it is judged. The wireframe he approved is at `/lab/contact-draft` (scroll to its foot, and `?launch=2.3` holds it mid launch): it settles what stands where and in what order things happen, and nothing about the look.

## His words

- "The stone is the Sun stone from Work laid flat, and it lights from its rim in to the rocket."
- "The rocket fits this page. Not a white rocket."
- "A rocket launch, not a rocket flying through space."
- Of the carried rocket, which is the basic version for the form: he does not hate it, and it is "the grand finale" of a page that goes from ancient wonder (Work, the Sun stones) to modern technology (Skills, the desk). The stone under the rocket is where the two meet.
- No smoke. Drawn in the wireframe it read as smears.

## The frame, which is not yours to change

- `layout.ts` holds every size and place, in units: one unit is a CSS pixel on a screen 1460 wide. The stone lies flat with the middle of its top face at the origin, x to the visitor's right, y up, z toward the visitor. `part.ts` is the contract: a part builds a group in units and has an `update` that is handed the state. `index.ts` is the stage: the view, the lights, the floor, and what the page tells the pad.
- It is seen from straight in front and 10 degrees up, from far away, so the stone is about a sixth as deep as it is wide and the rocket is seen nearly side on. One unit is the same number of pixels whatever the host's height: a taller host shows more sky.
- The state a part is handed each frame (`PartState`): `fill`, how far the stone is lit, 0 at its rim to 1 at its middle. `launch`, the seconds since the stone became full. `burn`, how hard the engine burns, and `climb`, how far the rocket has risen, which both follow from `launch`. `stream`, what the stream is doing where it lands. `cursor`, where the cursor's light is. `still`, when nothing may loop or drift.
- **Everything is worked out from the state alone.** A held `fill` or `launch` is the same picture every time, and a `launch` that runs back brings the rocket down and puts the arms back. No part keeps a clock of its own or remembers the frame before.
- The stage has these lights and a part adds none: the cursor's light, which throws the only shadows. The room, which is reflected and not lit. A cone of light from the stone's middle shining up, which comes on with `fill` and lights the table, the tower and the rocket from below. A light at the engine, which comes on with `burn` and climbs with the rocket. What a part lights by itself it lights with its own materials (emissive, and its own shader). If a part truly needs a light, say so in your report with where and why.
- No area lights anywhere (`RectAreaLight`): their tables alone hold a first visit for a tenth of a second.
- It draws on a clear ground. The floor under the stone is the stage's and takes shadow from the cursor's light.
- The stage moves the rocket's group up by `climb`. The rocket's part builds itself standing on the table and never moves its own group.
- If something in `layout.ts`, `part.ts` or `index.ts` should change, do not change it: say exactly what and why in your report. Sizes in `layout.ts` are the wireframe's and may move a little for a good reason.

## What each thing is

### The stone (`parts/stone.ts`, `parts/stone/`)

- **The Work stones' own carving, laid flat.** `src/stream/stone.ts` is the carving: a face at its center inside a raised ring, a ring of twenty glyphs, a ring of sixteen plates, four great rays and four lesser, and a rim, cut in a few flat levels with upright walls. It is baked there into two pictures by a shader (`STONE_BAKE`), which the stream's renderer does in `carve()` in `src/stream/renderer.ts`, and lit by `stoneFrag` in `src/stream/shaders.ts`, in the buttons' copper. Use the same carving code and not a copy of it: your factory is handed the pad's renderer so you can bake the same pictures. Take a still of one on its own page to hold yours beside: `npm run shot -- "/lab/work?ui=0" --scroll 1150 --t 20 --png --out <path>`, the stone is at the lower left.
- **A real disc of metal 640 across and 13 thick,** its top face at y = 0, with real relief: walls that catch the cursor's light and throw small shadows into the channels, and an edge with a made profile. It is seen at 10 degrees, so it is about 110 pixels deep on the screen: at that size the rings must still be told apart (test 12), and beside the Work stone it must plainly be the same carving in the same metal.
- **Dark until the stream lands,** lit only by the room and the cursor's light.
- **It lights from its rim to its middle, ring by ring, with `fill`:** `STONE.rings` are the rings. The light runs in what is cut into it, the channels and the cut edges, in the stream's colors (ember, flame, hot, and pale only as a small core). It is never a disc of one color: lit, the carving can still be read, and nothing clips past pale (test 14). The middle is the last to light.
- **Where the stream lands** (`LAND`, on the outer band at the right): `stream.since` is the seconds since the strike, for a flash there, and while `stream.on` is up that place is a little brighter than the rest of the band.
- **Full, with the stream on it, it is alive:** the light in the channels moves a little, slowly, and never loops visibly. With `still` it is one picture.
- **The fire lands on it:** the stage's engine light does that. Make sure the stone under it does not burn to a flat white patch.
- **Its middle:** whether it keeps the Work stone's face under the table or is a plain boss is yours to show him, so make both and give a still of each (a query, `?boss=plain`, read by your part).

### The table and the tower (`parts/table.ts`, `parts/tower.ts`, and their folders)

- **The launch table:** a steel deck on legs that stand on the stone round its boss, with the opening under the engine that the fire goes down through, hold downs where the rocket's feet stand, and the things a real one has that can be found on a second look: plate seams, bolts, a rail, steps, pipes. `TABLE` has its envelope. Once the rocket has gone it stands empty on the lit stone and must hold up as a thing by itself.
- **The tower:** a steel lattice on the table's left end, as tall as the rocket, with three arms that reach the rocket at the heights in `TOWER.arms`, a lamp at its top, and what a second look finds: a ladder, a lift's rails, lines running up to the arms. The lattice is seen at about 60 pixels wide: its members must not shimmer or turn to fuzz (`QUALITY.md`, "Nothing sparkles or bands").
- **The arms draw back** when the launch is `LAUNCH.arms` seconds in, over about half a second, each swinging or sliding clear of the rocket, worked out from `launch` alone.
- **Lit from below** by the stone as it fills. The lamp at the top is a small pale light that is on from the start.
- Nothing of the pad goes dark while the rocket is in the air.

### The rocket and its fire (`parts/rocket.ts`, `parts/rocket/`)

- **Made new.** `reference/pieces/rocket.jpg` and `src/pieces/rocket/` are the carried rocket: take its form (two stages, an interstage band, a pointed nose with a spike, fins, a bell) and how a piece is put together here, and none of its white paint. `ROCKET` has its envelope: 538 units tall from the mouth of its engine, 62 across, fins reaching 71 from its axis.
- **Not a white rocket.** It fits this page: a warm near black and charcoal body, satin graphite panels beside brushed dark steel, copper only as bands and small fittings, pale only as glints and small marks. It is drawn by light on its edges and by long reflections that slide as the cursor's light moves, as the PC Builder's black parts are. Its outline says rocket at the page's size (test 15), and alone at three times that size it is not the weaker work beside `reference/bar/pc-builder-parts.jpg` (test 16).
- What a second look finds: panel seams and rivets, an interstage ring with vents, hatches, a made up code or number (no word, no name, no real mark), fins with a made edge, a bell with its ribs and its plumbing.
- **It lights from its foot up as the stone fills** (`FUEL`): its lower stage at 0.4, its upper stage at 0.62, its nose at 0.84. Small lights: seams, ports, a line up its side. In the stream's colors.
- **The launch, from `launch` alone:** at 0 the engine lights, low. By `LAUNCH.lift` it is at full thrust and the rocket leaves the table (the stage lifts it). It climbs out of the top of the screen and is gone by about `LAUNCH.end`.
- **The fire:** a plume in the stream's colors, a small pale core going to hot, flame and ember at its edge, as long as `burn` makes it, alive from the clock and one picture with `still`. No smoke. It must never be cut off by the edge of the canvas, and it must not lay a haze over the whole canvas that shows the canvas as a rectangle: look for that rectangle in every still of the launch.

## What a part may cost

The pad's canvas is nearly as large as the screen, and a frame on his Mac is 8 ms. `window.__site.piece('pad').stats()` reports what it cost.

| Part | Shader programs over the stage's own | Triangles | First frame, alone |
|---|---|---|---|
| Stone | 3 | 120,000 | 300 ms |
| Table and tower | 4 | 80,000 | 300 ms |
| Rocket and fire | 5 | 80,000 | 300 ms |

- Share materials: one program draws many things when they differ only by a uniform or a texture.
- No task of your build longer than about 16 ms: the pad is built while the visitor is scrolling the section above it. Yield between the pieces of your build (`pause` in `src/world/build.ts`).
- A surface worked out in a shader leaves out detail finer than a pixel, and so does geometry: nothing may shimmer when the page is scrolled slowly.
- Throw shadows only from what is large enough to matter.

## How to look at it

- The dev server is at `http://127.0.0.1:5330`, and the scripts start one if it is not running. Three builders share the pad: if another part's file is briefly broken, wait and take the still again.
- The whole pad at about the page's size, a pixel to a unit: `npm run shot -- "/lab/piece/pad?label=0&ui=0&size=860&wide=800" --t 4 --wait 2500 --png --out shots/pad/<name>.png`. Add `&fill=0.6` to hold the stone part lit, `&launch=1.6` to hold the launch, `--lamp 0.3,0.6` to move the cursor's light, `--scale 3` for three times.
- One part alone: `/lab/piece/pad?only=rocket&label=0&ui=0` (`stone`, `table`, `tower`, `rocket`).
- The order of the launch, as a filmstrip of held frames: `npm run strip -- "/lab/piece/pad?label=0&ui=0&size=860&wide=800" --times 0.1,0.4,0.8,1.1,1.6,2.2,3,4 --cols 4 --tile 700 --eval "(() => { const p = window.__site.piece('pad'); p.setFill(1); p.setLaunch(\$t); })()"`. The same with `setFill(\$t / 2.4)` for the stone lighting.
- Real frames, for anything that moves: the page has a Launch button. `npm run live` (options at the top of `scripts/live.mjs`).
- Always `--png`, always `--t 4`: a JPEG puts false bluish pixels beside every orange edge, and under a held clock the stage draws only when something changed.
- Open every image. Assume your first verdict is too kind. Each round, show stills to fresh Opus reviewers who are told nothing of what you hope to hear: one shown the whole pad at the page's size and asked to name what is there, one shown your part close beside `reference/bar/pc-builder-parts.jpg` and asked which is the weaker work and why.
- If a way of making a thing stops getting better, change how it is made.

## What to hand back

- Your part's files, type checking clean (`npx tsc --noEmit -p .`). Do not commit, stash, reset or discard anything, and do not run `npm run build`.
- Stills: alone, close, with the cursor's light in two places, in the whole pad at the page's size, and for anything that changes with `fill` or `launch`, a filmstrip and real frames.
- What it cost, from `stats()`.
- The tests that are yours, in your own plain judgement, the reviewers' words, and plainly what is still short of the bar.
