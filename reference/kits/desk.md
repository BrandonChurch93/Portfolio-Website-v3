# Kit · the desk, and everything on, under and beside it

Read `reference/kits/README.md` first: the bar, the colors, how to look at a thing, what not to do. This file holds what every builder of the desk shares. Each thing then has a few lines of its own at the foot.

`BRIEF.md`, Settled, "Skills and About, the first build", items 27 to 30, is the agreement, and the lines under "### Skills" above it carry Brandon's own words on each thing. `QUALITY.md`, the same heading, tests 29 to 42, is how it is judged.

## What it is

- The desk in the Skills section of the home page, as one 3D piece: `src/pieces/desk/`. It opens alone at `/lab/piece/desk` and stands in `/lab/skills`.
- **The rough bench at `/lab/desk` is the basic version.** Open it, and open `reference/studies/43-desk-a-second-round.jpg` and `43-desk-a-second-round-close.jpg`. What stands where is agreed and must not move. Its look is not approved: every thing on it is made again, to the standard of his PC Builder's parts (`reference/bar/pc-builder-parts.jpg`, `pc-builder-rig.jpg`). His words: "the desk isn't bad, assuming that Claude Code is going to make this look much better."
- Its code is `src/desk-drafts/desks.ts` (sizes and places: `DESK`, `MAT`, `SCREEN`, `BAY`, `PLACES`), `materials.ts` and `scene.ts`. Read them for the sizes, the view and the lights. Lift what is good. Do not build on top of a rough form: a better version is made new.

## The piece and its parts

- The desk is one piece with one stage. Each thing on it is a **part**: one file in `src/pieces/desk/parts/`, which you own, behind the small contract in `src/pieces/desk/part.ts`. You build your part's group in millimetres, in the desk's own frame, and hand back what the desk needs to drive it. You do not touch the stage, the camera, the other parts or `index.ts`.
- **The desk's frame:** millimetres. The top's surface is y = 0. The desk is 2000 long (x from -1000 to 1000), 780 deep (z from -390 at the back to 390 at the front edge) and 740 tall (the floor is y = -740). The visitor stands at +z, to the left, and above: the view is from 24 degrees round to the left and 30 degrees up, with a narrow field of view.
- **Where your thing stands is fixed** (`PLACES`, `MAT`, `SCREEN`, `BAY` in `src/desk-drafts/desks.ts`, as changed in `src/pieces/desk/layout.ts`). Its size is the real thing's size.
- **Seen alone:** `/lab/piece/desk?only=<part>` shows your part by itself, framed close, at about three times its size on the page, on the same stage and under the same lights. That is where it has to be a finished object. `/lab/piece/desk` shows the whole desk, where it has to sit with the rest. `?lights=0` shows it before the stream has reached the desk, lit only by the room and the cursor.
- **Lights.** The desk's own lights are the lamp, the lit monitor and the PC, fixed once lit. The page brings them on, left to right, as the stream strikes the lamp. Your part is handed a level from 0 to 1 for the light it belongs to (`lights` in the part's state) and must look right at 0, at 1 and at every level between: at 0 it is a finished unlit object, lit by the room and the cursor's light.
- **The cursor's light** is what shows form, and he loves it. It is a real light that moves with the cursor. Your part is also told where it is over the desk, for a thing that answers it (the keyboard's keys).
- **Time** comes in the part's state. With reduced motion nothing loops.

## What every part must hold to

- **A finished thing alone on the screen** at three times its size on the page, and not the weaker work beside the PC Builder's parts. Real form, materials you can tell apart without a label, crisp edges that catch a line of light, short shadows where it sits, marks that stay sharp.
- **Told from a still alone:** a stranger shown one still names the thing and what it is made of.
- **No maker's mark,** and no real company's product copied. His own things (the iPad, the pencil, the headphones, the camera) read as his kind of thing, high end and current, with made up marks or none.
- **Palette only.** Lights are ember, flame, hot and pale. Metals are bronze, copper and warm dark steel. No white, blue, green or rainbow, the keyboard and the PC included.
- **Nothing crawls.** Scrolled slowly and with the cursor moving, grain, stitching, key legends, vents and grilles hold still: no sparkle, no moiré. Leave out detail finer than a pixel at the page's size and fade it in up close.
- **Cost.** The whole desk is one canvas about 1300 by 800 px on the page with ten things in it. Merge what never moves. Say your part's triangles and draw calls. Anything that moves by itself (fans, a screen, the keys' wave) must be cheap enough to draw every frame.
- **It sits.** Contact shadows under it on the mat or the timber, and its light lands on what is next to it.

## Rounds

- Build, look, judge against the bar assuming your first verdict is too kind, fix, look again. Several rounds before you hand back.
- Hand back the README's report, for your part: stills alone at rest and lit, at three times zoom, in the whole desk at the page's size, with the cursor's light at two places, and what is still short of the bar.
- Fresh reviewers judge each round from stills alone. If a thing stops getting better, how it is made changes. The bar is never lowered.

## The things

Each builder has one or two of these. His words are from `BRIEF.md`.

- **The bench and the mat.** A · Bench, which he picked: a thick top in dark timber on two trestles, a bronze angle over the front edge with its screws, a stretcher, and two drawers with the knob he chose for the sleeping card (`knob` in the rough, and `src/metal/dial.ts` for the knob's design). The drawers move toward the near end to make a bay about 520 mm wide for the PC under the far end. A real desk's proportions: "It looks very elongated" was his word on an earlier one. The mat covers about 80 percent of the top and stops short of the monitor: stitched edge, a hide or cloth surface that takes the cursor's light softly.
- **The lamp.** A desk lamp at the left back corner, made to take the stream's strike on the top of its shade. Struck, the shade reads as lit by the stream, and then the desk reads as lit by its own lamp: the pool of light on the mat and the tablet is the lamp's.
- **The monitor.** A curved ultrawide, 38 inches. "The screen shows real work, with depth to it. It is never a flat lit picture": an editor and a running thing, layered behind the glass, in the site's colors, that lights the desk in front of it.
- **The keyboard and the mouse.** "The keyboard and mouse still kind of look mid." "I use wireless. I think it looks bad" of a cable. "Think like a gaming keyboard with RGB lights going on it. Of course we could keep the RGB within our color scheme, but I think we could do something fun with it." "I like high end gaming mice." A wireless gaming keyboard with no cable: its keys light in a wave as the desk comes on, and the keys nearest the cursor's light glow. Every light one of the site's colors.
- **The iPad and its pencil.** His iPad Pro with its pencil beside it, carrying no maker's mark.
- **The camera.** "The camera leaves a lot to be desired." A camera of now: a mirrorless body with a fast lens, a second lens and a cap.
- **The PC.** "The computer could still use a lot of work. It actually doesn't look great at all." "But I kinda like the idea of it being glass and see-through." It is his PC Builder's own case and parts, brought over from that project's code, not a new model: `github.com/BrandonChurch93/PC-Desktop-Builder` (public, all 3D in code, the same version of three.js). The build is the one in the screenshot he sent: a glass case with two chambers, which looks to be its Atrium, with three fans over the top, three in a side wall, three in the floor, one at the back, a liquid cooler with a lit ring, four sticks of memory, a graphics card with a lit bar, sleeved cables, and a strip of light round the base. It stands under the desk's far end, turned so its long glass side faces the front. Lit in the site's colors and not the PC Builder's own, its fans turning. The whole build has to read through the glass at the page's size.
- **The headphones on their hook.** Their own small piece by the Skills title (`src/pieces/headphones/`, behind the piece contract, like the three small pieces in this folder's other kits), of the site's own design. AirPods Max is the feel he named: nothing is copied and there is no mark. The hook is fixed to the page's ground as to a wall. They hang with their weight showing, and the page swings them: the piece takes an angle and hangs true at it.
