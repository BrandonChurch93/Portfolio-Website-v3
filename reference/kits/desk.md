# Kit · the desk, and everything on, under and beside it

**Changed Nov 14.** Six things move or turn: the headphones onto the top across from the lamp, the camera with its second lens and cap, the pencil, the PC, and the Skills title onto the floor under the drawers. `BRIEF.md`, Settled, "Skills, the desk and the title changed", and `QUALITY.md` under the same name. Where this file says a place is fixed, it is fixed for everything else.

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
- **The cursor's light** is what shows form, and he loves it. It is a real light that moves with the cursor. Your part is also told where the light is over the desk (`cursor`) and where the pointer itself is (`pointer`), for a thing that answers it (the keyboard's keys).
- **Time** comes in the part's state. With reduced motion nothing loops.

## What every part must hold to

- **A finished thing alone on the screen** at three times its size on the page, and not the weaker work beside the PC Builder's parts. Real form, materials you can tell apart without a label, crisp edges that catch a line of light, short shadows where it sits, marks that stay sharp.
- **Told from a still alone:** a stranger shown one still names the thing and what it is made of.
- **No maker's mark,** and no real company's product copied. His own things (the iPad, the camera) read as his kind of thing, high end and current, with made up marks or none. **Two things are the real products' designs, on his ruling of Nov 14:** the headphones look just like AirPods Max, and the pencil looks like an Apple Pencil Pro. Neither carries a logo or a wordmark.
- **Palette only.** Lights are ember, flame, hot and pale. Metals are bronze, copper and warm dark steel. No white, blue, green or rainbow, the keyboard and the PC included.
- **Not one orange tone.** Read "The look" in `reference/kits/README.md` and hold to it: only copper is orange and it is an accent, everything else is near neutral, every thing has a near black, a mid grey and pale glints, and dark parts are drawn by light on their edges. The timber is the one large warm brown thing, so what stands on it must not be brown or orange, or it sinks into the desk.
- **Nothing crawls.** Scrolled slowly and with the cursor moving, grain, stitching, key legends, vents and grilles hold still: no sparkle, no moiré. Leave out detail finer than a pixel at the page's size and fade it in up close.
- **Cost.** The whole desk is one canvas about 1300 by 800 px on the page with ten things in it. Merge what never moves. Say your part's triangles and draw calls. Anything that moves by itself (fans, a screen, the keys' wave) must be cheap enough to draw every frame.
- **It sits.** Contact shadows under it on the mat or the timber, and its light lands on what is next to it.

## Your files

- Your part's entry is `src/pieces/desk/parts/<part>.ts`, which exports `build`, a `PartFactory`. It now wraps the rough draft's form. Replace it. Anything else of yours goes in a folder beside it, `src/pieces/desk/parts/<part>/`. Those are the only files you write.
- `build` hands back a `DeskPart` (`src/pieces/desk/part.ts`): your `group`, in the desk's millimetres, placed where the thing stands; `alone`, the middle and the reach of the thing itself, so a glow's plane does not set how it is framed; and `update(state)`, called before each frame with the time, each light's level, where the cursor's light is over the top, and whether the frame is held still. Return true from `update` only while your thing is moving by itself.
- Geometry helpers are in `src/world/build.ts` (`Builder`, `lathe`, `rbox`, `cyl`, `xf`, `at`, `seeded`). Read `src/pieces/handheld/model.ts` and `src/pieces/cpu/model.ts` for how a detailed thing is put together here.
- Do not touch the stage, `index.ts`, `layout.ts`, `part.ts` or another part. If you need something from them, say so in your report and work round it.

## Lights and cost, in particular

- The stage owns the desk's real lights and its shadows. A part may add one real light of its own at most (the PC two), made when the part is built and never added later. Turn a light down by its strength. Never hide one or set it invisible: that makes every material on the desk compile again, and the page hitches.
- Everything else that glows is emissive material and small additive planes, in the palette, dimmed by the level you are handed.
- No `transmission` on any material: it draws the whole scene a second time. Glass is a thin sheet with a clear coat's reflection and a little tint, blended.
- Textures are drawn in code on a canvas, as `src/pieces/cpu/art.ts` does, at the size they are seen. Give each mipmaps and anisotropy so nothing sparkles.
- Compile nothing after the first frame: every material and every state your thing can be in is drawn once when it is built.

## What a part may cost

The first time a visitor's browser draws the desk it compiles every shader program in it, and with all nine parts in their first round that took about eight seconds, most of it programs: 112 of them, about 90 of which were the parts' own. Each different material that changes its shader (`onBeforeCompile`), or turns on a different set of features, is another program. So each part has a budget, measured alone:

```
node -e "" && npm run shot -- "/lab/piece/desk?only=<part>&label=0&ui=0" --t 4 --wait 4000 --eval "console.log(JSON.stringify(window.__site.piece('desk').stats()))" --out shots/desk/<part>/stats.jpg
```

`stats()` gives `programs` (the empty stage alone has 21), `first` (the milliseconds the first frame took), `calls` and `triangles` (what the last pass drew). The shot script prints the page's console.

| Part | Programs over the stage's 21 | Triangles built | First frame alone |
|---|---|---|---|
| bench | 3 | 60,000 | 400 ms |
| mat | 1 | 5,000 | 300 ms |
| lamp | 4 | 30,000 | 400 ms |
| monitor | 5 | 40,000 | 400 ms |
| keyboard | 4 | 36,000 | 400 ms |
| mouse | 2 | 10,000 | 300 ms |
| tablet | 4 | 15,000 | 400 ms |
| camera | 5 | 60,000 | 400 ms |
| pc | 8 | 150,000 | 600 ms |

- **How to stay inside it.** Materials that differ only in color, roughness or metalness share one program, so make them plain materials with no shader change and let the numbers differ. Put what varies across a surface (brushing, knurl, weave, grain, wear) into one patched material per kind, driven by uniforms, attributes or a small texture, and use it for every such surface in your part. Lit things share one emissive material with the color and level as uniforms or vertex colors.
- **Nothing is built at the first frame.** No environment map made per material, no texture drawn at first use: everything is ready when `build` returns.
- **Shadows cost a second drawing of everything that casts one.** Only the large forms cast: turn `castShadow` off on small parts, fine detail and anything inside the PC's case.
- If a budget cannot be met without losing what makes the thing good, say which and why in your report. Do not quietly go over.

## How to look at it

All from the repo folder. A dev server is already running on port 5330 and is shared with the other builders: do not start another, do not stop it, do not run `npm run build`. Check types with `npx tsc --noEmit`. Another builder's part may be broken for a minute while they work: if the whole desk fails to load, look at your part alone and try the whole again later.

```
npm run shot -- "/lab/piece/desk?only=<part>&label=0&ui=0" --t 4 --wait 2500 --out shots/desk/<part>/alone.jpg
npm run shot -- "/lab/piece/desk?only=<part>&label=0&ui=0" --t 4 --wait 2500 --scale 2 --out shots/desk/<part>/close.jpg
npm run shot -- "/lab/piece/desk?only=<part>&label=0&ui=0&lights=0" --t 4 --wait 2500 --out shots/desk/<part>/unlit.jpg
npm run shot -- "/lab/piece/desk?only=<part>&label=0&ui=0" --t 4 --wait 2500 --lamp 0.15,0.3 --out shots/desk/<part>/lamp-left.jpg
npm run shot -- "/lab/piece/desk?label=0&ui=0" --t 4 --wait 3000 --out shots/desk/<part>/whole.jpg
npm run shot -- "/lab/piece/desk?size=808&label=0&ui=0" --t 4 --wait 3000 --out shots/desk/<part>/page-size.jpg
npm run live -- "/lab/piece/desk?only=<part>&label=0&ui=0" --scale 1 --ms 2000 --every 6 --max 16 --cols 8 --tile 300 --out shots/desk/<part>/live.jpg
```

- A part alone is already drawn at about three times its size on the page, and the canvas draws at up to two device pixels to a CSS pixel. So the close still is `--scale 2`: at 3 it is only enlarged, and shows stair steps that are not in the model.
- Add `--png` (and a `.png` name) for a still you are going to count pixels on. Without it the file is a JPEG whatever it is called.
- `--t 4` holds the clock, so a still is always the same picture. For anything that moves by itself (fans, the screen, the keys' wave), also take real frames with `npm run live`, whose options are at the top of `scripts/live.mjs`.
- `?size=808` draws the desk in a host as tall as it is on the page at a 1440 wide screen. That is what a visitor sees. Your thing has to say what it is at that size.
- Open every image you take with the Read tool. Never judge something you have not looked at.
- Put your close still beside `reference/bar/pc-builder-parts.jpg` and `reference/studies/43-desk-a-second-round-close.jpg`, and ask which is the weaker work.

## Rounds

- Build, look, judge against the bar assuming your first verdict is too kind, fix, look again. Several rounds before you hand back.
- Hand back the README's report, for your part: stills alone at rest and lit, at three times zoom, in the whole desk at the page's size, with the cursor's light at two places, and what is still short of the bar.
- Fresh reviewers judge each round from stills alone. If a thing stops getting better, how it is made changes. The bar is never lowered.

## The things

Each builder has one or two of these. His words are from `BRIEF.md`.

- **The bench and the mat.** A · Bench, which he picked: a thick top in dark timber on two trestles, a bronze angle over the front edge with its screws, a stretcher, and two drawers with the knob he chose for the sleeping card (`knob` in the rough, and `src/metal/dial.ts` for the knob's design). The drawers move toward the near end to make a bay about 520 mm wide for the PC under the far end. A real desk's proportions: "It looks very elongated" was his word on an earlier one. The mat covers about 80 percent of the top and stops short of the monitor: stitched edge, a hide or cloth surface that takes the cursor's light softly.
- **The lamp.** A desk lamp at the left back corner, made to take the stream's strike on the top of its shade. Struck, the shade reads as lit by the stream, and then the desk reads as lit by its own lamp: the pool of light on the mat and the tablet is the lamp's. The top of its shade is a fixed point (`SHADE` in `layout.ts`) and its foot is fixed (`PLACES.lamp`). The stream comes down onto the shade from the upper right of the screen and leaves to the left. The carried lamp's stem looped up on that side, and the stream's core was drawn across it. So on the screen nothing of the lamp stands higher than the top of its shade, and nothing of it is further left than its foot: the arm comes up to the shade from below and behind.
- **The monitor.** A curved ultrawide, 38 inches. "The screen shows real work, with depth to it. It is never a flat lit picture": an editor and a running thing, layered behind the glass, in the site's colors, that lights the desk in front of it.
- **The keyboard and the mouse.** "The keyboard and mouse still kind of look mid." "I use wireless. I think it looks bad" of a cable. "Think like a gaming keyboard with RGB lights going on it. Of course we could keep the RGB within our color scheme, but I think we could do something fun with it." "I like high end gaming mice." A wireless gaming keyboard with no cable: its keys light in a wave as the desk comes on, and the keys nearest the cursor's light glow. Every light one of the site's colors.
- **The iPad and its pencil.** His iPad Pro with its pencil beside it, carrying no maker's mark.
- **The camera.** "The camera leaves a lot to be desired." A camera of now: a mirrorless body with a fast lens, a second lens and a cap.
- **The PC.** "The computer could still use a lot of work. It actually doesn't look great at all." "But I kinda like the idea of it being glass and see-through." It is his PC Builder's own case and parts, brought over from that project's code, not a new model: `github.com/BrandonChurch93/PC-Desktop-Builder` (public, all 3D in code, the same version of three.js). The build is the one in the screenshot he sent: a glass case with two chambers, which looks to be its Atrium, with three fans over the top, three in a side wall, three in the floor, one at the back, a liquid cooler with a lit ring, four sticks of memory, a graphics card with a lit bar, sleeved cables, and a strip of light round the base. It stands under the desk's far end, turned so its long glass side faces the front. Lit in the site's colors and not the PC Builder's own, its fans turning. The whole build has to read through the glass at the page's size.
- **The headphones on their hook.** Their own small piece by the Skills title (`src/pieces/headphones/`, behind the piece contract, like the three small pieces in this folder's other kits), of the site's own design. AirPods Max is the feel he named: nothing is copied and there is no mark. The hook is fixed to the page's ground as to a wall. They hang with their weight showing, and the page swings them: the piece takes an angle and hangs true at it.
