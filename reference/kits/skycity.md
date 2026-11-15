# Kit · the city in the hero

**Changed Nov 14, night.** The city no longer stands on a flat disc. It stands on the torn top of a small planet, with the planet's core showing in the tear, debris round it, and the stream coming out of the core. `BRIEF.md`, Settled, "The hero, the city at rest", items 3, 4, 7, 8, 12 and 14 to 18, and the wireframe at `/lab/hero-draft` (`src/hero/plan.ts`). What follows was written for the disc: its ground, its plan of lots and its view are what change.

Read `reference/kits/README.md` first: the bar, the colors and "The look" hold for everything here. This is `src/pieces/skycity/`, one piece with one stage, as the desk and the launch pad are (`reference/kits/desk.md`, `reference/kits/pad.md`), and each of its things is a part with a builder of its own: the ground that floats, the spire, and the towers.

`BRIEF.md`, Settled, "The hero, the city at rest", items 3 to 7 and 10, is the agreement. `QUALITY.md`, "The hero, the city at rest", tests 2, 3, 7 and 8, is how it is judged. The wireframe he approved is at `/lab/hero-draft` (scroll it): it settles where the city sits and how much of it shows, and nothing about its look. It is the first thing a visitor sees, and it is the thing he has asked for longest.

## Changed Nov 14, night: his look at the first full build

He saw the first full build and asked for three changes. `BRIEF.md`, Settled, "The hero, the city at rest", item 4, has them. **Where anything below this section disagrees with it, this section wins.**

His words:
- "The spire needs rings round it, like the old city's spire has. Look at reference/pieces/city.jpg and src/pieces/city. Use the old one as a reference. Do not bring the old model back."
- "More of our metals on the city. Gold, bronze and copper, polished and catching light, so it ties in with the cards, the stones and the buttons. Right now it is almost all grey. It still must not turn into one orange mass."
- "It is towers from rim to rim, like New York. I want it to feel like a whole small world on a floating island: a core of towers, and round it other kinds of place. Nature, gardens, farms, open ground, craft in the air, whatever you think works. None of those is required and the choice is yours. What I do not want is sameness. Any nature is in the site's colors, not green. Think a Star Trek future city with ancient Egypt flair."

What that means for every part:

- **The plan is redrawn** (`layout.ts`). Towers stand only in the core, out to the second boulevard, and in a low town behind it. Round the core are the places in `DISTRICTS`, each a stretch of ground between two bearings and two distances: the way to the spire (`procession`), the hanging gardens (`gardens`), the port (`port`), the wild far side (`wild`), the temple quarter (`temple`) and the terraced fields (`farms`). `districtAt(x, z)` says which a point is in. `lots()` now gives about 150 lots.
- **Six parts, six builders:** the ground, the spire, the towers, and three new ones: `temple` (the temple quarter and the way to the spire), `gardens` (the gardens, the farms and the wild ground: all of the city's nature) and `port` (the port, and every craft in the air).
- **The view decides what matters.** The city is seen from straight in front and 4.5 degrees up, so the ground is nearly edge on and a flat thing on it is a thin line. A place is what stands up from it. The left flank (the temple quarter) is seen in outline at the left of the skyline and the right flank (the port, and the gardens toward the front) at the right: those two outlines, falling from the core to the rim, are where "a whole small world" is read, and they must be nothing like each other or like the core. What lies toward the visitor (the way to the spire, the front of the gardens, the farms) is seen low in front of the towers' feet and must not hide them: keep it under about 40 units there. At rest on the page only what stands above the rim shows, and the lower third of the city is under the foot of the screen.
- **The metals.** Polished gold, bronze and copper are used freely, as the cards' beads, the Sun stones and the buttons use them: `copper`, `copper-light`, `bronze` and `bronze-deep` in `src/config/palette.ts`, and for gold a polished metal at the palette's own hue between `copper-light` and `hot`, never a yellow brass. Polished means it is drawn by what it reflects: long sharp reflections that slide as the cursor's light moves, a pale glint on an edge, a dark side. Whole things may be metal now: a clad tower, a dome, a pyramid's casing, a ring, a roof. What still holds: **it is never one orange mass, and its materials can be told apart.** So metal sits against things that are not metal (dark glass, pale warm stone, near black structure, dark foliage, water), the three metals differ from one another in value and finish, and no single tone covers more than about a third of what is seen. "Only copper is orange, and copper is an accent" in the README's "The look" no longer limits the city.
- **The flair of ancient Egypt, in a Star Trek future.** Not a theme park and not a copy of anything: the forms and the confidence of it. Battered walls that lean in as they rise, pylons flanking a gate, obelisks with bright caps, stepped and smooth pyramids, long colonnades, processional ways, great seated or standing figures reduced to pure geometry, sun discs, wings, cartouche shaped panels filled with abstract marks like the Sun stone's glyphs (`src/stream/stone.ts`: no real hieroglyphs, no letters). Set in a future that is clean, sweeping and optimistic: rings, saucers and pods, long cantilevers, glowing lines, craft that drift. The two meet everywhere, in every part: a pyramid whose capstone floats, an obelisk that is a mast, a pylon gate that is a hangar door.
- **Nature in the site's colors.** No green anywhere. Foliage is copper, bronze, amber and umber, as a forest is in a late autumn evening, with pale gold where light catches it. Water is dark and reflects the lights over it. Earth and stone are warm greys and sand.
- **No sameness.** Within a part, no two neighbours alike. Between parts, each place has its own outline, its own height and its own kind of light.
- **What every fresh reviewer said of the first build still stands and is still yours to fix:** "a game or CG render, not a photographed model". No rooms behind the windows, no bevels on edges, glass that reflects too little, materials that are hard to tell apart close up, rock that reads as stacked slabs.

### The three new parts

**The temple quarter and the way to the spire (`parts/temple.ts`, `parts/temple/`).** `DISTRICTS`: `temple`, at the left of the skyline, and `procession`, on the page's center line from the front of the rim to the spire's plaza. In the quarter: one great thing that owns the left of the skyline (a pyramid about 110 to 140 tall cased in polished metal with a capstone that is lit, or something as strong: yours to design), and round it a precinct with a different outline from every side: a pylon gate, a colonnaded hall, obelisks, courts, a causeway. Its light is its own kind: few, low and warm, lamps along a causeway, a lit capstone, light from inside a hall between columns. The way to the spire is seen straight along its length, so it is two rows of things flanking the center line and getting closer together toward the spire: obelisks, plinths, braziers, a long dark pool between them that reflects the spire. Nothing on it may stand in front of the spire's foot or over the place the main fall leaves the rim (the front of the rim at x = 0), and nothing over about 40 units within 250 of the rim.

**The gardens, the farms and the wild ground (`parts/gardens.ts`, `parts/gardens/`).** `DISTRICTS`: `gardens` (front right, out to the right flank), `farms` (front left) and `wild` (the far side). The gardens are hanging gardens: terraces of stone stepping down toward the rim, each planted, with groves of trees in several kinds and heights (not one tree repeated: tall slender ones, spreading ones, low clipped ones), water stepping down between them, a pavilion or a conservatory of bronze and glass, lit paths. The farms are terraced fields in bands of different crops, seen edge on as steps of different tones, with what stands on a farm: windcatchers, a silo that is an obelisk, an irrigation ring. The wild ground is hardly seen and is made cheaply: rock, a few groves, standing stones. Instance the trees. Their light is its own kind too: path lights low among the trees, light under water, a glow inside the conservatory.

**The port and the craft in the air (`parts/port.ts`, `parts/port/`).** `DISTRICTS`: `port`, at the right of the skyline. Where craft land and leave: pads held out on stalks or cantilevers at several heights, a docking ring, hangars with pylon shaped doors, a control mast, cranes and gantries, docked craft of two or three kinds, cargo. Its outline is open and reaching where the temple's is solid. All the craft in the air over the whole city are yours as well: a few on slow courses in and out of the port, one large one docked or holding off the rim, small ones crossing behind the spire. From the clock alone, never visibly looping, still when `still` is set, and none crossing in front of where his words are (above y = 480). The towers' builder is taking the craft out of its part and keeping the cars and the beacons.

## His words

- "The city is made again from nothing. A futuristic sci-fi city that looks like a real object, not a drawing and not the old model."
- "Hyper realistic, and when I say hyper realistic, I mean something that looks like it's real, not necessarily something that's realistic in the real world."
- "It feels alive", "like when you see a city off in the distance, you can see the glow going into the sky."
- The second build's city (`src/pieces/city/`, `reference/pieces/`) is not kept and is not a model for this one. Do not read it for its look.
- Its falls are the stream's own light and are drawn by the stream, not by you. The glow behind it and the night sky are the page's.

## What it is

- **A city of the future on ground that floats:** a disc of land 1320 units across with a rim, and rock under it that comes down to a keel under the middle. A spire 420 units tall stands at the middle on a plaza. Towers stand in four bands between ring boulevards, tallest near the spire and falling toward the rim, with avenues running out from the plaza and parks in some of the bands.
- **It is seen as a skyline:** from straight in front and 4.5 degrees up, from far away. The ground is nearly edge on, so the front rim, the fronts and sides of the towers, their tops against the sky, and the rock's front are what is seen. At rest on the page only what stands above the rim shows: the rim and the rock come up as the page is scrolled.
- **It looks like a real model of a real place,** photographed at night: not a drawing, not a low polygon toy, not a field of grey boxes with yellow dots. Think of an architect's presentation model made at great expense, or a miniature shot for a film: every tower a designed building with a top, a base, setbacks, a structure that can be read, glass that reflects, and lit rooms seen through it.
- **It passes "The look":** near neutral, in three values. Warm near black and charcoal masses, dark glass, steel and stone that are plainly grey, pale glints on edges. Copper and bronze only as accents: a crown, a band, a mullion line, a dome. Its lights are the palette's (ember, flame, hot, pale). It is never one orange mass, and nothing in it is blue, green or white.
- **It is alive, cheaply:** lit windows in patterns that read as rooms and floors, not noise. Small lights that move or blink slowly: beacons on the tall tops, a few lines of traffic on the boulevards and avenues, a lift climbing the spire, craft drifting between towers. Everything that moves is worked out from the clock alone (`t` in the state), costs almost nothing, never visibly loops, and holds still when `still` is set.
- **The cursor's light falls on it:** a light the stage owns, which throws the only shadows. Glass and metal answer it with reflections that slide as it moves.

## The frame, which is not yours to change

- `layout.ts` holds every size and place, in units: one unit is a CSS pixel on a screen 1460 wide. The middle of the ground's top is the origin, x to the visitor's right, y up, z toward the visitor. `GROUND`, `SPIRE`, `PLAZA`, `RINGS`, `ROAD`, `AVENUES`, `PARKS` and `FALLS` are the plan of the city. `lots()` gives every place a tower stands, the same on every call: the ground's builder and the towers' builder both read it, so streets, plots and towers agree.
- `part.ts` is the contract: a part builds a group in units and has an `update` that is handed the state (`t`, `cursor`, `still`). `index.ts` is the stage: the view, the lights and the cursor's light. One unit is the same number of pixels whatever the host's height.
- The stage has these lights and a part adds none: the cursor's light, which throws the only shadows and draws its shadow map only when it moves. The room, which is reflected and not lit. A dim light from the sky. What a part lights by itself it lights with its own materials. A city lit by ten thousand windows cannot have ten thousand lights: the windows are emissive, and the light they throw on the street, the next tower and the ground is drawn into the materials (a glow at a tower's foot, a wash on the ground), not computed.
- No area lights anywhere (`RectAreaLight`).
- It draws on a clear ground. Nothing may lay a haze over the whole canvas that shows it as a rectangle: bloom from anything bright does that, so keep the brightest things small.
- If something in `layout.ts`, `part.ts` or `index.ts` should change, do not change it: say exactly what and why in your report. The plan in `layout.ts` may move for a good reason.

## What each thing is

### The ground (`parts/ground.ts`, `parts/ground/`)

- The disc of land, its rim, and the rock under it. The rim is architecture, not a pie crust: a made edge with a wall, terraces or a promenade, piers, lights along it, and six places where a fall leaves it (`FALLS`, across the front): a spout or a channel cut in the rim at each, dark until the stream is there. The stream draws the falls themselves.
- The rock under it: real rock, cut and layered, with structure let into it (ribs, anchors, the housings of whatever holds a city in the air), coming down to a keel under the spire, where the main fall leaves: a mouth there, made for it. It is seen from the front and a little above, lit from the cursor's light and from the city above. It must not be a smooth cone.
- The city's floor: the plaza round the spire, the ring boulevards and avenues with their own lights, plots under every tower (`lots()`), and the parks: trees, water, lit paths, a dome or a pavilion. Seen nearly edge on, so what matters is what stands up from it and what glows on it.
- The light the city throws on its own ground, drawn into the ground.

### The spire (`parts/spire.ts`, `parts/spire/`)

- The tallest thing, on the center line, 420 units tall on a foot about 40 across: the one building every visitor looks at, with the stream's main fall directly under it. Not a cone. A designed tower of the future: a structure that can be read (a core, ribs or a lattice, rings or decks at intervals, a taper with breaks in it), a lit crown and a needle, an observation level, a base that meets the plaza with steps, arches or buttresses.
- Its lights are the city's signature: a line of light up it, rings, a beacon at the tip that breathes slowly. A lift that climbs it.
- It must hold up alone at three times the page's size beside `reference/bar/pc-builder-parts.jpg`, and still read as one clean needle at the page's size.

### The towers (`parts/towers.ts`, `parts/towers/`)

- A tower on every lot from `lots()`: about 350 of them, 56 to about 300 units tall, 22 to 38 across. They are the mass of the city and most of what is seen.
- **Not boxes.** A family of building types, each designed (setbacks, crowns, fins, sky bridges, podiums, a few round or faceted ones), varied by the lot's `seed` so that no two neighbours match and the skyline has rhythm: clusters, gaps, a few landmarks. Instance them: one geometry per type, drawn many times.
- **Windows that read as rooms:** floors and bays, some lit and some dark, warm in different strengths, a few whole floors lit, never a random speckle and never a perfect grid of equal dots. At the page's size a tower is 20 to 40 pixels wide, so a window is about a pixel: the pattern must hold still when the page is scrolled and the light moves (`QUALITY.md`, "Nothing sparkles or bands"). Work the windows out in the shader from the tower's own coordinates and fade them to their average before they are finer than a pixel.
- Glass that reflects the room and the cursor's light, edges that catch a pale line, tops with plant, masts and beacons.
- The small life between them: traffic as moving points of light along the boulevards and avenues, a few craft in the air. Cheap, from the clock alone.

## What a part may cost

The city's canvas is as wide as the screen, and a frame on his Mac is 8 ms. `window.__site.piece('skycity').stats()` reports what it cost.

| Part | Shader programs over the stage's own | Triangles drawn | First frame, alone |
|---|---|---|---|
| Ground | 4 | 150,000 | 300 ms |
| Spire | 3 | 60,000 | 300 ms |
| Towers | 4 | 200,000 | 300 ms |
| Temple | 3 | 60,000 | 300 ms |
| Gardens | 3 | 80,000 | 300 ms |
| Port | 3 | 50,000 | 300 ms |

Triangles are the model's own, as built, not what `stats()` reports across every pass.

- Share materials: one program draws many things when they differ only by a uniform, an attribute or a texture. Towers are instanced.
- Throw shadows only from what is large enough to matter: the shadow map draws everything that casts again.
- No task of your build longer than about 16 ms: yield between the pieces of your build (`pause` in `src/world/build.ts`).
- A surface worked out in a shader leaves out detail finer than a pixel, and so does geometry.

## How to look at it

- The dev server is at `http://127.0.0.1:5330`, and the scripts start one if it is not running. Three builders share the city: if another part's file is briefly broken, wait and take the still again.
- The whole city at the page's size, a pixel to a unit: `npm run shot -- "/lab/piece/skycity?label=0&ui=0&size=840&wide=1440" --t 4 --wait 2500 --scale 1 --png --out shots/hero/<name>.png`. `--scale 2` is what a visitor's screen draws. `--lamp 0.3,0.6` moves the cursor's light.
- One part alone: `/lab/piece/skycity?only=spire&label=0&ui=0` (`ground`, `spire`, `towers`). Close: `--scale 3`.
- For anything that moves, real frames: `npm run live` (options at the top of `scripts/live.mjs`).
- Always `--png`, always `--t 4`.
- Open every image. Assume your first verdict is too kind. Each round, show stills to fresh Opus reviewers who are told nothing of what you hope to hear: one shown the whole city at the page's size and asked what it is, whether it looks like a real model or a drawing, and what looks least finished. One shown your part close beside `reference/bar/pc-builder-parts.jpg` and asked which is the weaker work and why.
- If a way of making a thing stops getting better, change how it is made.

## What to hand back

- Your part's files, type checking clean (`npx tsc --noEmit -p .`). Do not commit, stash, reset or discard anything, and do not run `npm run build`.
- Stills: alone, close, with the cursor's light in two places, in the whole city at the page's size and at twice it, and real frames of anything that moves.
- What it cost, from `stats()`.
- The tests that are yours, in your own plain judgement, the reviewers' words, and plainly what is still short of the bar.
