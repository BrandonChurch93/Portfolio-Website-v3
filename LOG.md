# Log

Newest first. One entry per piece of work. Say what was done, what Brandon said, what is half finished, and anything the next session would otherwise have to rediscover. Rules go in `BRIEF.md`, not here.

## 2026-11-11 · Study 02, buttons (Fable, web chat)

**What Brandon said first**

- On Study 01: "an overall improvement for the colors. Looks good." The palette and the portrait on the page are approved and in `BRIEF.md`.

**First pass**

- The lit metal system from the second build, brought across whole: `src/metal/` and `src/components/Plate.tsx`. It is the system behind the buttons he liked.
- `src/metal/finishes.ts` takes its metals from the palette: copper-light, copper, bronze-deep. No brass is left in it.
- `src/components/MetalButton.tsx`: one component, two variants. `primary` is bright copper with the words cut in and filled dark. `accent` is dark bronze with the words in copper, set flush. It renders a link when given `href` and a button when not.
- `/lab/buttons`: the study.

**What Brandon said about the first pass**

- "The text on the brighter buttons is hard to read." He put it down to the face: "Light on the top half, dark on the bottom half."
- "I don't love how simple the hover effect is." It only lifted.
- He floated "a tarnish look or something that doesn't go behind the text".
- All of it is in `BRIEF.md` under Cards and buttons.

**Second pass: the primary's face**

Tried and thrown out, in order. Do not try these again:

1. A brushed satin face. It read as wood.
2. An evenly lit flat face. It read as peach plastic.
3. His tarnish idea, as clouds of tarnish at the ends and corners, kept clear of the words. At button size it read as dirt smudges.
4. A wide, soft band of light. Still flat orange.

Kept:

- Polished copper, gently domed (`pillow: 6`), reflecting one wide soft light from straight in front (`soft: 1` in `finishes.ts`, `uSoft` in the light shader). The dome turns that light into a bright band through the middle of the face, where the words are, with the dark of the room along the upper and lower edges. The band is fixed to the button, so it stays behind the words wherever the button is on the screen.
- Tarnish only in the rim (`rimW: 8`, `faceClean: 1`).

**Second pass: the hover, on both buttons**

- Light in the palette's `pale` runs round the cut border, both ways from where the pointer came in, and meets on the far side. About half a second in, a little faster out.
- The lamp closes in, so the metal brightens under the pointer and the bright spot follows it across the face.
- The button lifts 3px and its shadow spreads.
- On the accent the copper words warm to the light's color.
- Keyboard focus sets it off from the left edge. Reduced motion shows it complete, with no run.
- A button no longer turns its canvas toward the pointer. The turn moved it under half a pixel and blurred its words in the stills. It leans in its light only. Larger plates still turn.

**Found while judging, and fixed**

- At pixel ratio 1 the cut words went soft and grey. Plates now bake at 2x or more on every screen.
- The accent's words dimmed far from the lamp: 2.6 to 1 against the face on a phone. Inlaid words now keep a floor of their own color (`inlay: 0.8`). Measured word to face contrast is now 4.5 to 5.4 on the accent and 5.4 to 5.9 on the primary, at three lamp positions on desktop and on a phone.
- The running light drew a wedge across the face of a wide button, because a point's place round the edge was taken from the center. It is now taken from the nearest side.

**How it was judged (Fable, from software stills at pixel ratio 2 and a phone at 3)**

- Stills in `reference/studies/`: `02-buttons.jpg` (the page), `02-buttons-three-lights.jpg` (three lamp positions), `02-buttons-hover.jpg` (six stages of the running light), `02-buttons-under-pointer.jpg` (the pointer at three places on a hovered button).
- Both read as lit metal. The words are sharp and readable on both, at rest and hovered.
- Not judged: how the hover moves, the press, and how the lift feels. Those need a real pointer and are his to try.
- My own doubt: the primary is calmer than the first pass. It gave up the hard reflection that made it look most like metal, in exchange for words that read. If he finds it too plain, the next thing to try is a brighter, narrower band, not tarnish.

**Tools added**

- `npm run shot -- <route> --hover <selector>` moves a real pointer onto an element. Add `--wait 1200` so the light has finished its run.
- `--eval <js>` runs script in the page first, with `$t` replaced by the time. `--nofreeze` passes the time to `--eval` and leaves the clock running.
- `window.__site.call('plateHover', selector, v, x, y)` holds the running light on a plate at `v`, 0 to 1, as if the pointer came in at x, y. Six stages of it:
  `npm run shot -- /lab/buttons --t 0.4 --nofreeze --eval "window.__site.call('plateHover','[data-variant=\"primary\"]',\$t,0,24)" --wait 300`

**Things worth knowing**

- The metal system can do more than buttons: plates with engraved words, header bars, and a photo sunk under glass in a recess. That last one is what he approved earlier ("the photos look great") and is a candidate for the cards in Phase 4. Nothing uses those kinds yet.
- `plates.setWater()` exists so the stream can light metal near it. Nothing calls it yet. The new water should.
- A button's width comes from its label's length (`--chars` in `MetalButton.module.css`).
- The words on a plate are drawn in Sora 600. The fonts are loaded before a plate is baked.
- On a touch screen there is no hover. What a tap shows has not been checked.

**Waiting on Brandon**

1. His verdict on the second pass of the two buttons.
2. Whether the water gets built in Claude Code on his Mac.

**Next**

Phase 2, the water. It is all motion, which this web chat cannot see, so the recommendation is to build it in Claude Code on his Mac (see Open in `BRIEF.md`).

## 2026-11-11 · Study 01, color and light (Fable, web chat)

**What Brandon said first**

- The five carried pieces look fine on his machine.
- The water inside them "looks very low quality", and he is not sure "water" is the right name for it.
- He is fine with `QUALITY.md` as it stands and expects to refine it once he sees what it produces.
- All three are in `BRIEF.md`. He has not yet said he read Settled and Dropped.

**What was built**

- `src/config/palette.ts`: fifteen colors in four families, defined once. `src/app/layout.tsx` sets them on `<html>` as CSS variables. 3D reads them through `hex()`.
- `/lab/palette`: the study. The portrait on the new ground, the samples it was built from, the palette, the portrait and the handheld under one light, and type.
- The handheld moved from brass (hue 37) to copper (hue 29). Its metal now measures hue 28 to 29 on screen, against the photo's 31.
- `metal()` in `src/world/surface.ts` takes a `patina` so copper tarnishes brown, not the grey green of brass.

**What the portrait measured**

- The light behind him: `#5b2f00`. Hue 31, saturation 100, value 36. It is a dark color, not a bright one.
- It falls through `#3b1b00` and `#1a0700` to pure black at the frame's edge.
- Shirt `#160e0d`. Skin about `#bb6555`. Hair about `#633b1a`.
- The second build's small accents were already at hue 30. The mismatch he saw was its brass, at hue 37 to 38, which covered most of the page.

**How it was judged (Fable, from software stills)**

- The photo and the copper handheld read as one light. The old brass beside them does not.
- Nothing sits in a visible rectangle, on desktop or phone.
- Not judged: how the light feels as it moves. That is his to judge on the preview.

**Things worth knowing**

- To set the photo on the page with no visible edge, `mix-blend-mode: lighten` against the page color. Anything in the photo darker than the page becomes the page. A mask alone left a dark rectangle, because the photo's black is darker than the ground.
- A noise layer with a blend mode, placed inside an isolated element, painted a grey square over the page. It was removed. If grain is ever wanted, mask it to the shape it sits on.
- Decoration that reaches past its box (the glow) widened the page on a phone. `main { overflow-x: clip }` in `global.css` stops that.
- A 3D piece placed in a page shows its floor as a rectangle unless it is masked. The study uses a soft elliptical mask. Phase 5 needs a real answer for how pieces sit in the page.
- The pieces' colors are written inline in each piece's `model.ts` and `index.ts`. Moving a piece to the palette is a per-piece edit. Only the handheld is done.
- The cut-out portrait came from the second build. Its hair edge is good enough at this size. Phase 4 should check it at full size.

**Waiting on Brandon**

1. His verdict on the study: the palette, the copper, the portrait on the page.
2. His read of Settled and Dropped in `BRIEF.md`.

**Next**

The primary and accent buttons in the new metal. Then Phase 2, which opens by settling what the stream is made of.

## 2026-11-11 · Restart and foundation (Fable, web chat)

**What happened**

- Brandon stepped back from the second build. The review chat had compacted several times and he felt the vision was lost.
- We sorted his own rulings from the rules the model had invented. The result is `BRIEF.md`.
- He chose to start over in this repo, keeping only the 3D pieces, with Fable building the creative parts and Opus coming in at the end.
- He raised this chat to extra effort and asked for a foundation that gives any new or compacted session the workflow and the quality bar.

**What was built**

- `BRIEF.md`, `PLAN.md`, `QUALITY.md`, `CLAUDE.md`, this log.
- The project: Next.js 16, React 19, TypeScript, CSS Modules, Three.js, GSAP. The same versions as the second build, so the pieces run unchanged.
- Carried from the second build's `fable/phase-2-layout-water` branch: the five pieces (city, workbench, handheld, camera, rocket), the shared 3D code in `src/world/`, the cursor light in `src/lamp/`, the test hooks, and `PieceView`.
- Left behind: the sculpture, the water system, the metal plates, every page and layout, the draft copy, the kit and its screenshot gates.
- `/lab/piece/<name>` shows one piece alone. `/` is a plain index, not a design.
- `npm run shot` and `npm run strip`.
- A Vercel project, `portfolio-website-v3`, linked to this repo. Every push to `main` deploys to https://portfolio-website-v3-wheat.vercel.app. The first deploy built without errors. It was not opened from the web chat, so Brandon is the first to see it live.
- Every piece was opened and looked at in this repo. Stills are in `reference/pieces/`. The city's opening plays (see `reference/pieces/city-opening.jpg`).

**How the carried pieces look (Fable's reading, not Brandon's verdict)**

Judged from software rendered stills against the PC Builder images.

- **City:** the strongest. Detailed, lit and alive. Near the bar.
- **Handheld:** solid. Good materials and a live screen. Brandon really likes it.
- **Camera:** fine. The lens has depth. The body is plain next to the lens.
- **Workbench:** below the bar as built. The room is muddy, the wood grain reads as stripes, the lamp is a plain cone, and the water on the desk edge is a thin line. He approved the desk as an idea from a rough draft, not this.
- **Rocket:** below the bar as built. The body is plain and the tower is thin. He has not judged it.
- All five are in the second build's orange and yellow gold. They move to the new palette in Phase 5.
- The city, the workbench and the rocket each have the second build's water drawn inside them (the falls, the desk edge, the flume and pool). That is replaced when the new water exists.

**Things carried that are not rules**

They came with the code. Change them freely.

- The "how this is made" switch exists in every piece and is off by default. `/lab/piece/<name>?making=1` shows it. Whether the site uses it is Open in the brief.
- At most two pieces hold a WebGL context at once (`PIECE_MOUNT` in `src/config/site.ts`).
- Four quality tiers chosen by a short GPU test (`src/world/tier.ts`).
- The colors in `src/styles/tokens.css` and `src/config/site.ts` are the second build's, kept only so the pieces render. Phase 1 replaces them.

**Useful things still in the second build's repo**

- `src/metal/`: the lit metal shader behind the brass buttons he likes.
- `public/media/portrait-cut-*.webp`: his portrait cut out from its background.
- `public/media/`: project pictures and his résumé PDF.
- `src/components/Hero.tsx` and `HERO` in `src/config/site.ts`: how the city was framed and timed in the hero.

**For whoever works here next**

- This web chat's workspace draws WebGL in software. Stills are fair for form, layout and color. Motion and speed have to be judged on Brandon's Mac.
- Headless Chrome needs `--enable-unsafe-swiftshader` to draw WebGL without a graphics card. `scripts/lib.mjs` already passes it.
- The repository is public.

**Waiting on Brandon**

1. His read of Settled and Dropped in `BRIEF.md`.
2. His check of Phase 0 in `PLAN.md`.

**Next**

Phase 1, color and light, starting with a palette sampled from `reference/portrait.jpg`.
