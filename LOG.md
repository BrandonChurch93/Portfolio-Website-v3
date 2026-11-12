# Log

Newest first. One entry per piece of work. Say what was done, what Brandon said, what is half finished, and anything the next session would otherwise have to rediscover. Rules go in `BRIEF.md`, not here.

## 2026-11-11 · Handoff to Claude Code: the pour (Fable, web chat)

**What Brandon said**

- "I agree molten metal is the way to go."
- He is opening Claude Code in an empty folder on his desktop to carry on there.

**Where things stand**

- Phase 1 is done apart from one box: the cursor light has not been ticked by him in so many words. He has said its effect on the dark buttons "looks amazing".
- The buttons are approved and final. Do not change them without asking him.
- Phase 2 starts now, with the test shot. Nothing of the pour exists yet in this repo. Start clean. Do not start from the second build's stream or from `src/world/lightwater.ts`.

**If you are the session in Claude Code, do this first**

1. Read `BRIEF.md` (The pour), `PLAN.md`, `QUALITY.md` (The pour, and open the images it lists), then this entry.
2. Run `npm install`, then `npx playwright install chromium`.
3. Run `npm run shot -- /lab/buttons` and open the image. It should print `hardware`. If it prints `software`, tell Brandon before going further, because nothing about motion can then be judged from this machine's stills.
4. Look at real molten metal before writing any code. Search for foundry pours of bronze and copper, stills and slow motion.
5. Find out how the best real time liquid on the web is built. Choose a method and tell Brandon, in a short list, what you chose, why, and what he will see first.
6. Build the test shot on its own page, `/lab/pour`. Follow "How a piece of work goes" in `CLAUDE.md`.

**What the web chat could not do, and you can**

- See motion. Every still made so far was drawn in software. Use `npm run strip` on everything that moves.
- Open the preview link and the local site in a real browser.

**Things worth knowing**

- The cursor light and the lit metal already exist: `src/lamp/`, `src/metal/`. The pour should light metal near it. `plates.setWater(host, x, y, k)` in `src/metal/renderer.ts` was written for that and nothing calls it. Rename it when you use it.
- The palette's light colors are in `src/config/palette.ts`: `ember-deep`, `ember`, `flame`, `hot`, `pale`. The pour uses these and nothing off the palette.
- Every animation reads time from `src/world/clock.ts`, so a frame can be frozen for a still. The pour has to as well, or it cannot be shot.
- No more than two WebGL contexts on a page. The metal uses one, off the page.
- The code says water in about 175 places across 20 files: the piece contract's `setWaterLight`, `src/world/lightwater.ts`, `waterAmber3d` in `src/config/site.ts`, `uWater` in the metal shaders, and what the second build drew inside the city, the workbench and the rocket. That is all old. It is replaced in Phase 5. Rename as you replace. New code never uses the word.
- Brandon wants options when a choice is about a hover effect. He did not ask for options on everything.
- He found a fade that lingered on the way out too slow. Things should leave quickly.

**Half finished**

- Nothing in code.
- From the 508 check two entries down: the dark button's thin contrast margin under the lamp is left alone on purpose.

## 2026-11-11 · Buttons approved. What the stream is made of (Fable, web chat)

**What Brandon said**

- "OK, I really like the scale and I like the primary with the most shine!"
- On the stream: he keeps saying he is not sure water is the right way to look at it, "because if I call it water, then the model is gonna build it as if it acts like water". Candidates he named: lava, molten hot metal, golden water, some type of light, electricity. Each with its own particles: droplets and splashes, or sparks and drips. He wants it nailed down, and the level of quality with it, before the work moves to Claude Code. "It's probably like the most important thing on the site to get right."
- All of it is in `BRIEF.md`.

**Buttons, as approved**

- The primary uses the `coated` finish. The old `worn` finish is gone.
- Scale is the only rise. The lift study, the `rise` and `finish` props and the "To compare" rows are gone.
- Reference stills re-shot: `02-buttons.jpg`, `02-buttons-three-lights.jpg`, `02-buttons-hover.jpg`. `02-buttons-shine.jpg` and `02-buttons-hover-options.jpg` are kept as the record of what he chose between.
- Text contrast as approved, three lamp places: primary 5.4 to 6.4, accent 5.7 to 5.9.
- He did not comment on the quicker fade. Treated as fine unless he says otherwise.

**The stream: Fable's recommendation, given to him and waiting on his answer**

Molten metal, the site's own copper, called "the pour".

- It is already the site's material and colors. The palette's light, ember to flame to hot to pale, is the color of heated metal.
- It makes its own light, so it lights what it passes, the way the cursor does. `plates.setWater()` is already there for this and wants renaming when the name is settled.
- It is heavy. Weight reads as quality and forgives more than water, which is thin, fast, and known to every eye.
- Its particles have a life: sparks on landing, beads that roll and cool from pale to dark.
- It gives the page an end: it can feed the rocket's launch (Open 12).
- The danger is lava (dark, crusted, slow) and fire. It has to read as a foundry pour.
- Against the others: glowing water is not a real thing, so there is nothing to match it to. Lava cannot keep up with scrolling. Light alone has no body and is what failed three times. Electricity cannot pool, drip or land.

**The bar proposed for it**

One test shot, alone on a blank page: it falls, hits a ledge, splashes, runs along the ledge and drips off the end. It passes when:

1. Paused on any frame it looks like a photograph of molten metal: a hot core, a cooler skin, highlights on a rounded surface.
2. It has weight: it speeds up and thins as it falls, piles where it lands, clings to the edge, stretches and snaps into drops.
3. Every landing leaves something: a splash with shape, sparks, beads, and the ledge lit and warm for a moment after.
4. Nothing repeats.
5. It lights what is near it.
6. It is smooth on his Mac and on a phone.

How to build it, as far as thought through: an authored route for where it goes (the layout needs it to hit exact places), and real particle physics for what the eye checks (falls, landings, drips). A browser cannot run a film grade fluid simulation, and a tube with a glow shader is on the fail list.

**Waiting on Brandon**

1. Molten metal and "the pour", or another candidate studied beside it.
2. Whether that test shot is the right bar.

## 2026-11-11 · Buttons: Catch chosen, a quicker fade, scale, and a shinier primary to compare (Fable, web chat)

**What Brandon said**

- "I think my favorite is catch." Coming in and moving around "feels about perfect".
- On mouse leave "it takes a bit longer than I'd like for the animation to fade off".
- "The button doesn't scale or do anything else. I think we should add some type of lift or scale. I'm leaning more towards a scale, but I'm open to recommendations."
- The cursor's light moving around the page "looks amazing" on the dark buttons and is "a lot harder to see" on the bright ones. "I don't want to nerf the secondary buttons." "I wish the primary buttons had a bit more shine to them. Maybe we could darken the color a bit or something?"
- All of it is in `BRIEF.md`.

**What changed**

- Catch is the hover. The other three (run, heat, pull) and their code are gone. They are in git at `1dec4d8` if ever wanted, and in `reference/studies/02-buttons-hover-options.jpg`.
- Leaving: the light goes in 0.2s, most of it at once (`HOVER` in `src/metal/renderer.ts`; the curve is the cube of what is left). It was 0.32s and started slowly, which is why it felt long. Arriving is unchanged, since he called it about perfect.
- Under the pointer the button grows 4 percent, passes its mark slightly and settles, and its shadow spreads. Pressed, it shrinks to 98.5 percent. Keyboard focus grows it too. `MetalButton.module.css`.
- With reduced motion the hover light now shows, at once, and the scale has no transition. Before, the static tier never redrew a plate, so nothing showed.

**Two studies on the page, under "To compare". Each goes once he has chosen**

1. `rise="lift"` on `MetalButton`: the button rises 3px and does not grow.
2. `finish="coated"`: the primary a little darker (`band: 0.72`, the soft light turned down) under a clear coat (`coat: 0.3`) that throws the lamp back pale and wide. In the row the left pair is coated and the right pair is the approved primary.

**Why the bright button shows the lamp less, and what the coat does**

- The eye reads a change against what is already there. The dark button goes from about 1 percent luminance to 4 under the lamp, three times over. The bright one is at about 38 percent and the same light adds a few percent.
- Two levers: a darker base, and a highlight of another color. The coat's highlight is `pale`, so it reads against orange copper by color as well as brightness.
- The limit is the words. They are dark, so the face cannot go far down. Coated, text contrast is 5.4 to 8.5 across six lamp places (the approved one is 6.1 to 6.8).
- First try (`band: 0.8`, `coat: 0.1`) was too weak to see except with the lamp right beside the button.
- It will not match the dark button. From stills it is clearly visible within a few hundred pixels and faint beyond.

**How it was judged (Fable, software stills at 2x)**

- `reference/studies/02-buttons-hover.jpg`: primary, accent, then the lift study. Columns: at rest, hovered, 90ms after the pointer left.
- `reference/studies/02-buttons-shine.jpg`: six lamp places, one per row. Left pair coated, right pair approved.
- The words stay sharp at 4 percent scale in these stills. On a real 2x screen the canvas is being stretched 4 percent, so look for softness there. If there is any, the fix is a second bake at the hovered size, not a smaller scale.
- Not judged: how the scale and the quicker fade feel.

**Still open from the 508 check**

- The accent's thin contrast margin where the lamp's bright spot sits beside the words. Closing it would dim the very thing he said looks amazing, so it is left alone unless he asks.

**Waiting on Brandon**

1. Is the hover right now.
2. Scale or lift.
3. The coated primary, yes or no.
4. Whether the water gets built in Claude Code on his Mac.

## 2026-11-11 · Buttons: three hover options (Fable, web chat)

**What Brandon said**

- The wish for "a few different options" was about the hover effects only. It is not a rule for how everything is shown. `BRIEF.md` is corrected.
- Of the light that runs round the border: "Yes it did start in different places, but ultimately I'm looking for something different with the hover effects."

**What was built**

Three more things a button can do under the pointer, beside the first one. All keep the glow that follows the cursor, which is the part he likes. They are under "Hover options" on `/lab/buttons`. The first three rows of that page still show the first hover.

| Option | What it does | Where |
|---|---|---|
| `run` (the first) | Light runs round the cut border from where the pointer came in. The button lifts | light shader, `uMode` 0 |
| A · `heat` | The metal glows orange where the pointer is. Points of warmth are left behind as the pointer moves and fade, so there is a trail that cools. The cut border glows near the heat. The accent's words go pale hot. No lift, and the lamp does not close in | `warm()` in `src/metal/renderer.ts`, `uMode` 1, `HEAT` and `HEAT_COLORS` in `finishes.ts` |
| B · `pull` | The button follows the pointer by up to 9px across and 5px down on a slightly under damped spring, and its shadow stays most of the way behind | `usePull` in `src/components/MetalButton.tsx`, `uMode` 3 |
| C · `catch` | Nothing plays. The cut border, the rubbed edges and the accent's words light only within reach of the pointer | `uMode` 2 |

- `MetalButton` takes `hover="run" | "heat" | "pull" | "catch"`. The default is still `run`.
- `Plate` now tells the renderer where the pointer is on every move (`plates.setPointer`).

**How it was judged (Fable, software stills at 2x)**

- `reference/studies/02-buttons-hover-options.jpg`: heat, pull, catch from top to bottom, primary then accent, three states each. For heat the states are: pointer resting, straight after a sweep to the right, a quarter second after leaving.
- Heat on the face is kept to the deep colors (ember to flame). Run to the pale end it read as haze. Only the accent's words and the border go pale.
- Text contrast in every state shot: primary 6.0 to 6.7, accent 5.1 to 6.5 (medians, needs 4.5).
- Not judged: all of the motion. How fast heat builds and fades, how the pull's spring feels, whether catch is too quiet. Those are his to try.

**When he chooses**

Delete what he did not pick: the unused members of `HoverStyle`, their `uMode` branches in the light shader, `MODES` in the renderer, and for the options not chosen `warm()`, `HEAT`, `usePull` and the `data-hover` rules in `MetalButton.module.css`. Then drop the "Hover options" section from the page.

**Still open from the 508 check below**

- With reduced motion the metal is static, so none of these show. Fix it with whichever hover he picks.
- The accent's thin contrast margin where the lamp's bright spot sits beside the words.

**Waiting on Brandon**

1. Which hover: A, B, C, the first one, or a mix (pull can be combined with heat or catch).
2. Whether the water gets built in Claude Code on his Mac.

## 2026-11-11 · Buttons: his verdict on the second pass, and a 508 check (Fable, web chat)

**What Brandon said**

- "The buttons do look better." He likes "especially how the mouse moving around changes the glow on them".
- The other hover effects "aren't bad though I don't necessarily love them either". "I wish you gave me a few different options."
- "Can you verify these are 508 compliant? Don't make any changes to the colors for now just curious."
- All of it is in `BRIEF.md`. No code changed in this entry.

**What 508 means here**

Section 508's test for web content is WCAG 2.0, levels A and AA. It has not moved to 2.1 or 2.2 (checked Nov 11 2026).

**What was checked, and how**

Headless Chrome against `/lab/buttons`, software rendering. Scripts were scratch files and are not in the repo.

| Check | Result |
|---|---|
| Role and name (4.1.2, 1.1.1) | Pass. Each is a native `button` whose name is its label. The canvas is hidden from assistive technology and the words are real text in the DOM |
| axe-core 4.14, rules tagged WCAG 2.0 A, AA and Section 508 | 0 violations, 0 needing review, 18 rules passed |
| Keyboard (2.1.1, 2.1.2, 2.4.3) | Pass. Tab reaches all eight in reading order, Enter and Space both press, no trap |
| Focus visible (2.4.7) | Pass. A 2px outline in `flame`, 5px off the button, about 8.5 to 1 against the page |
| Text contrast (1.4.3), needs 4.5 to 1 because the label is 14px at weight 600 | Pass on a normal reading. See below |
| Zoom to 200 percent (1.4.4) | Pass. No sideways scroll, nothing clipped. The plate is redrawn sharp at the new size |
| Text only at 200 percent (1.4.4) | Pass. The button and its words double |
| Flashing (2.3.1) | Pass. The light makes one pass |
| Forced colors (Windows high contrast) | The buttons keep their metal and stay readable, and the focus outline shows. They do not take the system's colors. Not a 2.0 requirement |
| No WebGL | Falls back to plain text in an outlined shape, focusable, readable. Primary and accent look the same there |
| Reduced motion | The metal is static (the `static` tier never redraws a plate after its first draw), so there is no hover light and no response to the cursor. The lift and the focus outline remain. Not a failure, but not what was intended |

**Contrast, measured**

Text color against the face behind it, medians, after the buttons have faded in:

| State | Primary | Accent |
|---|---|---|
| At rest, lamp in nine places, 2x | 6.1 to 6.7 | 5.3 to 6.1 |
| Lamp in each corner, 2x | 6.1 to 6.6 | 5.7 to 5.9 |
| Lamp resting on the button, no hover | 6.3 to 7.0 | 5.8 to 6.0 |
| Pointer on it, three places | 6.2 to 6.3 | 5.9 to 6.5 |
| Light part way round | 6.2 | 6.7 to 9.6 |
| Keyboard focus | 6.1 | 9.8 |
| 1x screen | 5.6 to 5.8 | 5.0 to 5.6 |
| 4K at 1x, lamp in the far corners | 5.1 to 5.6 | 5.3 to 5.7 |
| Phone at 3x, lamp as far as the screen allows | 5.8 | 5.8 to 5.9 |

- Lowest anywhere: 5.0, the accent on a 1x screen.
- A stricter reading, the lightest tenth of the face beside the dimmer quarter of each letter, dips under 4.5 on the accent where the lamp's bright spot sits on the bronze beside the words: 3.9 at worst at 2x. An auditor who hunts for the worst pair of pixels could dispute the accent. The primary holds 4.4 to 5.5 on that reading.
- To close it without touching the palette: keep the bronze a little darker right behind the words under the lamp, or let the words gain more than the face does. He said no color changes for now, so nothing was changed.

**The two things that are not a clean pass**

1. Images of text (1.4.5, AA). The words are drawn into the canvas. That is allowed when the look cannot be made with real text, and words cut into lit metal cannot. They also scale with zoom and text size and have a real text twin. It is still the one point an auditor could argue. A forced colors rule that swaps in the plain version would strengthen it.
2. The accent's thin margin under the lamp, above.

**Not checked**

- A real screen reader (VoiceOver, NVDA, JAWS). The accessibility tree is right, which is what they read.
- Anything beyond the two buttons. Site wide, anything that moves by itself for more than five seconds (the water, the pieces, the lamp's slow drift on touch screens) will need a way to pause it (2.2.2, level A).

**Measuring traps found**

- A plate fades in after load. A shot taken in the first second or so reads darker than it is. Wait about two seconds first.
- A plate more than 300px outside the viewport is not redrawn, so a full page shot shows stale metal down the page. Scroll the button into view and shoot the viewport.

**Waiting on Brandon**

1. A go ahead to build a few hover options side by side, all keeping the glow that follows the cursor.
2. Whether to close the accent's contrast margin once the hover is chosen.
3. Whether the water gets built in Claude Code on his Mac.

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
- Keyboard focus sets it off from the left edge. With reduced motion the metal does not redraw at all, so there is no light (see the entry above this one). The button still lifts and the focus outline still shows.
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
