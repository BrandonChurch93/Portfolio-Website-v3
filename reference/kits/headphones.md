# Kit · the headphones on their hook

Read `reference/kits/README.md` first. This is `src/pieces/headphones/`, a small piece of its own behind the piece contract, like the reflector and the studio light. It is one of the ten things of the desk (`BRIEF.md`, Settled, "Skills and About, the first build", item 27, and `QUALITY.md`, tests 9, 37 and 38), so read `reference/kits/desk.md` too for what every one of the ten holds to.

## What it is

- A pair of over ear headphones hanging on a hook, beside the word SKILLS at the top of the Skills section. On the page now they are an outline drawn in SVG: `src/components/lab/SkillsLab.tsx`, `data-part="phones"`, and `reference/studies/49-skills-the-desk-lit-and-the-stream-past-the-lamp.jpg` shows where they hang and how large.
- His words: he asked for "the headphones on the hook" by the title, and named AirPods Max as the feel. That is a feel, not a model: premium, metal cups, a mesh canopy for a headband, soft cushions. Nothing of it is copied, and there is no maker's mark.
- They are the site's own design, in its own metals: cups in bronze or copper with a turned or brushed face, warm dark steel arms, a dark knitted or mesh headband, dark cushions.

## What is on it

- **The cups.** Two ear cups, each a shallow machined shell with a soft edge that catches a line of light, a fine ring of perforations or a turned pattern on its face, a small crown or button on one, and a thick cushion whose weave or leather can be told from the metal. One cup is seen from outside and the other partly from inside, where the cushion and the cloth over the driver show.
- **The arms.** Telescoping stems from each cup up to the headband, with a real pivot where the cup swings.
- **The headband.** A frame with a canopy stretched across it. It is what rests on the hook, and it sags a little where it bears.
- **The hook.** Fixed to the page's own ground, as to a wall, seen face on: a small plate with two screws and a peg or a cradle standing out toward the visitor. The same family as the reflector's wall mount (`src/pieces/reflector/`).
- Fine things to find: a seam, a made up serial on the inside of the band, stitches, the slot the stem slides in.

## How it is seen

- The page's ground is a wall and the visitor looks straight at it. The headphones hang flat against it, turned a little so one cup is seen more from the side than the other and the form reads as round, not as a drawing.
- They are about 200 mm across and 240 mm tall with the band. The whole thing with its hook fills 0.72 of the host's height. On the page the host is about 190 units tall. A unit is about a CSS pixel on a 1440 wide screen.
- Narrow field of view, 20 degrees or less.
- A soft shadow on the wall behind them from the cursor's light, which moves as the light moves and fades well inside the host.
- They do not turn with the cursor. The cursor's light crosses them, and the cups' metal faces answer it.

## They swing

- They hang with their weight showing: the cups pull the stems straight, the band bears on the hook at one point, and nothing floats.
- The page swings them as a pendulum from that point: when the stream strikes the desk's lamp, and when the cursor brushes them. Export `setSwing(angle)`, the angle in radians from hanging straight, about the point where the band bears on the hook. The page works the angle out and hands it over every frame. The piece hangs true at whatever angle it is given: the whole pair turns about the hook, and the cups lag a little behind the band on their pivots, by an amount worked out from the angle and how fast it is changing, so the cups have weight. A held angle is a still.
- Export where the band bears on the hook as an `Anchor`, `HEADPHONES.hook`, measured by projecting the model's own point through the camera: the page puts the host by it.
- The stream never touches them. `setStream` does nothing here.

## What to hand back

- `src/pieces/headphones/index.ts` exporting `createHeadphones` and `HEADPHONES` (with `hook`), and `model.ts`.
- Stills: hanging straight, at three times zoom on a cup and on the hook, with the cursor's light left and right, swung to 5 degrees each way, at the page's size.
- A filmstrip of a swing: `window.__site.piece('headphones').setSwing(a)` at eight angles of a pendulum dying away.
- The six tests and tests 37 and 38, in your own plain judgement, and what is short of the bar.
