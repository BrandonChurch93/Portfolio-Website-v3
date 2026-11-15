# Kits for the small pieces the stream strikes

Three contained 3D objects on the Skills and About page (`/lab/skills`): the CPU in its socket, the reflector, and the studio light. Each has a kit in this folder. This file holds what all three share. Read it, then your own kit.

`BRIEF.md`, Settled, "Skills and About, the first build" is the agreement these come from. `QUALITY.md` is the bar.

## The bar

- Open `reference/bar/pc-builder-parts.jpg` and `reference/bar/pc-builder-rig.jpg` with the Read tool before you model anything. Brandon made those. Your object is put beside them, and it must not be the weaker one.
- What to take from them: real form (fins you could count, traces on the board, nothing a box with a picture on it), materials you can tell apart without a label, light that lands on things, things that sit, marks that stay sharp close up.
- `QUALITY.md`, "Six tests" and "Fail on sight". Every one applies.
- The floor in this repo is the handheld: `src/pieces/handheld/` and `reference/pieces/handheld.jpg`. He likes it. Read its `index.ts` and `model.ts` for how a piece is put together here. Your object has to be plainly finer than it, since it is seen small and still has to hold up at three times its size.
- Assume your first verdict is too kind. Look for reasons to fail it.
- He means detailed, not true to a real product. No real company's mark, name or logo, and no words that read as a slogan. Marks are made up codes.

## Colors

- Only the site's palette: `src/config/palette.ts`, read with `hex('copper')` and so on. Ground near black and warm. Metal is bronze and copper, never yellow gold, never chrome or nickel white. Dark metal is a warm near black.
- Every light is ember, flame, hot or pale. Nothing white, nothing blue, nothing green, no rainbow. A hot core goes to pale gold, never to white. Check a still for any pixel bluer than it is red.

## The look: what separates one material from another here

Round after round, fresh reviewers failed things on this page for the same fault: "every material is the same sepia orange, so it looks like a tinted photo rather than several metals", while the PC Builder's parts "separate black, white, metal and light". The palette allows no white, blue or green, so hue cannot do that work. Value, saturation and finish have to, on purpose:

- **Only copper is orange, and copper is an accent.** A ring, a crown, a rim, a pad, a screw. Never more than about a quarter of what is seen of a thing. Bronze is its darker, browner neighbour and is used as sparingly.
- **Everything else is close to neutral:** a true warm black, charcoal, a warm dark steel that is plainly grey beside copper, a matte dark plastic or rubber, cloth, and pale cream for marks and legends. Sample a still: a mid tone on a neutral part has a saturation under 0.2, and one on copper over 0.55.
- **Three values in every thing:** a near black, a mid grey, and small pale glints, about (255, 227, 194) at the brightest. If a still of the thing has no near black or no pale glint, it is not lit yet.
- **Dark things are drawn by light on their edges.** That is how the PC Builder's black parts read: a crisp pale line along the top edge of each part from a light behind it, a clean highlight along a chamfer. A dark part with no edge light is a hole in the page.
- **Finish is a color here.** Matte beside satin beside polished: cloth, rubber, anodised metal, brushed metal, a polished edge, glass. Put two finishes side by side wherever two parts meet.
- **Metal reads as metal by what it reflects:** long sharp reflections that slide across it as the cursor's light moves, as on the sleeping card he approved (`src/metal/dial.ts`). A soft orange gradient is paint.
- **Light is ember, flame, hot and pale, and it is light:** it comes from a lamp, a screen, an LED or the stream, and it lands on what is next to it. A material never glows to be seen, and a lit thing never washes the whole object one orange.
- **Nothing blooms at rest,** and nothing clips past pale.
- **The tone curve.** The shared stage's curve took the same small amount off red, green and blue in the darks, which turned every warm dark into the same saturated brown whatever the material. That was the largest cause of the sepia. A piece now asks for the corrected curve once its stage is made: `trueDarks(stage.renderer)` from `src/world/tone.ts`. The desk does. Under it darks keep their own color, so a neutral material reads neutral, and anything tuned under the old curve has to be judged again: some things come out lighter, greyer or cooler than they were. Check that no pixel is bluer than it is red.
- **The white balance.** The palette's pale is a warm light, so under it a perfectly neutral grey measures as a warm one, and fresh reviewers still counted whole things as "one sepia" after the curve was corrected. A piece can now ask for a white balance as well, `balance(stage)` from `src/world/tone.ts`, which the desk does: in the darks and the mid tones the picture is balanced for that light, as a camera is in a warm room, so a neutral material reads neutral while copper, timber and the lights keep their warmth beside it. So do not correct for the warm light inside a material (a cooler albedo, a step that takes color out of reflected light): with the balance on, that goes cool. Make the material what it is.
- **Two guarantees the curve now gives.** Nothing can come out greener or bluer than it is red, and nothing can come out whiter than pale: what is too bright goes to pale gold. So a glint cannot burn white. It can still be too large or too soft: that is yours.
- **A lossless still needs `--png`.** `npm run shot` writes a JPEG whatever the file is called unless it is given `--png`, and a JPEG puts false bluish and whitish pixels beside every orange edge. Count pixels only on a still taken with `--png`.
- **A bad number blacks out everything.** A NaN in one shader (a zero length vector normalised, a division by zero at a grazing angle, an anisotropy direction parallel to the normal) spreads through the glow pass and turns the whole canvas black, while the part alone may look fine. Guard every normalise and every division.

## The contract

- A piece is a folder in `src/pieces/<name>/`: `index.ts` exports its factory and its constants, `model.ts` builds it. You own that folder and nothing else. A place holder `index.ts` is there now. Replace it, and keep the names it exports.
- It keeps `Piece` in `src/world/piece.ts`, and `Struck` in `src/world/struck.ts`, which is what the stream does to it. Read both. `setWaterLight` is an old name: make it do nothing.
- It draws on the shared `Stage` (`src/world/stage.ts`): one renderer, the studio environment, the post chain, and the cursor's light as a real spot light (`stage.lamp`).
- Helpers for building geometry are in `src/world/build.ts` (`Builder`, `lathe`, `rbox`, `cyl`, `xf`, `at`, `seeded`). Work in millimetres under a root scaled by 0.001, as the desk does (`src/desk-drafts/desks.ts`).
- It is registered already: `/lab/piece/<name>` opens it alone, and `window.__site.piece('<name>')` reaches it from a script.

## How it sits in the page

- **No rectangle.** The canvas is clear wherever the object is not. No `scene.background`, no fog, no floor that reaches the canvas's edge. The page shows through, and other things on the page are drawn under and over your canvas.
- Glows are additive on a clear ground, so a glow sprite or the bloom of a lit part lays its light on the page. That is wanted.
- A shadow or a glow must never end at the canvas's edge. Keep the object inside the middle 80 percent of the host's height, and give the canvas a CSS mask that fades its outer rim to nothing.
- **It frames a fixed height of its world.** Whatever the host's width and height, the object is the same size against the host's height and stands at the same place from the host's middle. Wider hosts only add empty room at the sides. The kit says how large the object is against the host's height.
- **Anchors.** The page puts your host so that the point the stream meets your object at lies on the stream's route. So `index.ts` exports where those points are drawn, as `Anchor`s: across and down from the host's middle, in host heights. Measure them by projecting the model's own points through the camera at rest. Do not read them off a picture by eye. They must hold to within a hundredth of a host height at any host size.
- The cursor's light is `stage.lamp`. `setLamp(x, y)` gives the cursor as shares of the host, and they run well outside 0 to 1 when the cursor is elsewhere on the page. The light must still come from the right side then. Move the cursor from one side of the screen to the other and the highlights and shadows must cross the object.
- It turns a little toward the cursor only where its kit says so.

## What the stream does to it

- `setStream(on, since)`. `on` is how much the stream is on it, 0 to 1, and comes up and dies smoothly: the page hands it over every frame. `since` is the seconds since the stream's leading end struck it, and is large when it has not.
- Light the object from the point it is struck at, in the stream's colors, by `on`. At the strike itself (`since` under about a third of a second) it flashes brighter and settles. The stream itself is drawn over your canvas by the page: do not draw a stream, sparks or shards of your own, except where your kit says so.
- With `on` at 0 the object is still there, lit by the room and the cursor, and has to look as if it belongs on the page with nothing touching it. The CPU is the exception: its kit says when it is on the page at all.

## Drawing

- Draw a frame only when something changed: the cursor's light moved, `setStream` or `setLife` changed, the host changed size, or something in the object is moving by itself. Do not draw every frame for nothing. Stop when the host is off the screen.
- Read time from `src/world/clock.ts`. `freeze(t)` holds the piece at a time, and a held frame must always be the same picture.
- With `prefers-reduced-motion`, and on the `static` tier, nothing loops and nothing drifts. Lights hold steady.
- A small canvas gets the screen's full density. Check the edges at three times zoom: no stair steps on a slanted edge, no shimmer in fine parts when the cursor moves. Leave out detail finer than a pixel at the page's size.
- Cost: this object is one of five 3D canvases on its page. Keep its triangles and its draw calls modest (merge what never moves), one shadow casting light besides the cursor's, and say in your report what one frame costs (`stage.frameMs`).

## How to look at it

All from the repo folder. A dev server is already running on port 5330 and is shared with other builders: do not start another, do not stop it, and do not run `npm run build`. Check types with `npx tsc --noEmit`.

```
npm run shot -- /lab/piece/<name> --t 4 --out shots/<name>/rest.jpg
npm run shot -- /lab/piece/<name> --t 4 --scale 3 --out shots/<name>/close.jpg
npm run shot -- /lab/piece/<name> --t 4 --lamp 0.1,0.2 --out shots/<name>/lamp-left.jpg
npm run shot -- /lab/piece/<name> --t 4 --eval "window.__site.piece('<name>').setStream(1, 2)" --out shots/<name>/lit.jpg
npm run strip -- /lab/piece/<name> --times 0,0.05,0.1,0.2,0.4,0.8 --eval "window.__site.piece('<name>').setStream(1, \$t)" --out shots/<name>/strike.jpg
```

- `/lab/piece/<name>` fills the screen with the piece, which is about four times its size on the page. `?size=220` draws it in a host that many pixels tall, which is what a visitor sees: the kit gives the height. At that size its outline must still say what it is. `?label=0` and `?ui=0` hide the page's label and buttons.
- The page has a Strike button for any piece the stream strikes, and for one that comes to life a switch between the three ways and a quarter speed switch (`src/components/lab/PieceLab.tsx`). `?way=band&at=0.4` holds it that many seconds after its strike, and `?stream=1` opens it with the stream on it. Press Strike in a real window and watch it move: a filmstrip is frozen frames.
- Open every image you take with the Read tool. Never judge something you have not looked at.
- Put a still beside `reference/bar/pc-builder-parts.jpg` and ask which is the weaker work.
- The scripts print `hardware` or `software`. On this Mac it is hardware.

## What not to do

- Do not touch anything outside your folder. If you need a change in shared code (`src/world/`, `src/config/`), say so in your report and work round it.
- Do not commit, push, or edit `BRIEF.md`, `PLAN.md`, `LOG.md`, `QUALITY.md` or `CLAUDE.md`.
- Almost no code comments. Keep one only when it explains a reason someone could otherwise undo. No em dashes in comments or anywhere. TypeScript strict. Each constant defined once.
- The line of light and shards is called the stream. Never water.

## Your report

- The stills you took, by path, and what each shows.
- The six tests, each passed or failed in your own judgement, told plainly. What is short of the bar and why.
- The anchors as measured, the triangle count, the draw calls and the frame time.
- Anything you needed from shared code.
