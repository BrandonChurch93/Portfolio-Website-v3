# Kit · the city in the hero

**Changed again at midnight on Nov 14, from his look at the first build:** the city pulls back from the edge, polished metal is used boldly, the nature area becomes a jungle out of scale on purpose, a second natural area goes on the opposite side, the mountain is dropped for a monument, and the craft are made good or removed. `BRIEF.md`, the same agreement, items 19 to 27, and tests 14 to 20. The planet under it is left alone.

**Changed Nov 14, night.** The city no longer stands on a flat disc. It stands on the torn top of a small planet, with the planet's core showing in the tear, debris round it, and the stream coming out of the core. `BRIEF.md`, Settled, "The hero, the city at rest", items 3, 4, 7, 8, 12 and 14 to 18, and the wireframe at `/lab/hero-draft` (`src/hero/plan.ts`). What follows was written for the disc: its ground, its plan of lots and its view are what change.

Read `reference/kits/README.md` first: the bar, the colors and "The look" hold for everything here. This is `src/pieces/skycity/`, one piece with one stage, as the desk and the launch pad are (`reference/kits/desk.md`, `reference/kits/pad.md`), and each of its things is a part with a builder of its own: the ground that floats, the spire, and the towers.

`BRIEF.md`, Settled, "The hero, the city at rest", items 3 to 7 and 10, is the agreement. `QUALITY.md`, "The hero, the city at rest", tests 2, 3, 7 and 8, is how it is judged. The wireframe he approved is at `/lab/hero-draft` (scroll it): it settles where the city sits and how much of it shows, and nothing about its look. It is the first thing a visitor sees, and it is the thing he has asked for longest.

## The torn world (Nov 14, late): what every builder shares

**This section is the newest. Where anything below it disagrees with it, this section wins.** The frame it describes is in the code now: `src/pieces/skycity/layout.ts`, `part.ts`, `index.ts`.

### The finished version (Nov 15): the newest, and it wins over everything below

He scrolled the first standing build on the live site. "The planet is right. What stands on it is not yet." `BRIEF.md`, Settled, "The hero, the city at rest", items 19 to 27, and `QUALITY.md`, tests 14 to 20, are the agreement and how it is judged. Read them.

**Left alone, because he likes them:** the planet's body, the torn underside, the core, the debris, the streams from the torn face, the sky, the moon, the glow, the spire's shape, the layout and his words.

**His words on what changes:**

1. "The city is too big. Keep it as dense as it is, but pull it back from the edge, about a quarter of the way in all the way round, and let two or three wedges of open land cut further in. Let bare ground show at the rim so I can see the curve of the planet."
2. "It is missing the shiny metal look. I do not see any of it. I want real polished gold, bronze and copper that reflect and catch the cursor's light, used boldly. Not orange trim on grey boxes. This is art, so you have freedom, and we could do some really cool things with it." Ideas he was given: a mirror polished cap on the pyramid, gilded rings and a gilded crown on the spire, a few whole towers clad in polished bronze, domes and roofs in copper, the veins of bright metal in the torn rock coming up through the surface, "pools of mirror polished metal where a world would have lakes".
3. "The nature area on the left has to be a dense jungle, and the scale is all wrong. This is art. It does not have to be in proportion. Make the trees big enough that anyone knows it is a jungle at a glance. The site's colors, not green."
4. "A second natural area on the opposite side, and it has to look completely different from the jungle."
5. "Scrap the mountain. Put a monument in its place, something spectacular. Not another pyramid."
6. "The flying cars look bad. Either a few craft that are designed and big enough to read as craft, or none."
7. "More kinds of building and fewer copies of the same grey block. The two blank blocks at the front of the avenue need designing or removing."

**The plan is redrawn for it** (`src/pieces/skycity/layout.ts`: read it again from the top). Where a number below disagrees with these, these win:

- **The city ends at 472 on the map** (`CITY.r`), about three quarters of the way to the torn edge, and is as dense as before: `lots()` gives about 110 lots at the same spacing, in bands out to 420 and a ragged fringe with gaps from 420 to 472, so the city does not end on a line.
- **From 472 to the torn edge is bare ground.** Nothing is built on it. It is where the planet's curve is seen, and where the tear is ground breaking.
- **Four wedges cut into the city** (`DISTRICTS`): the jungle at the left (`FOREST`, bearings 222 to 318, from 330 out), the dunes at the right (`DUNES`, 52 to 128, from 330 out), and two wedges of open ground at the front (kind `open`, bearings 28 to 44 from 330 out, and 316 to 332 from 350 out).
- **The mountains and all water are dropped.** `PEAKS` is empty and `relief` is 0 everywhere: the land is level. Where a world would have lakes there are pools of mirror polished metal.
- **The port and its crag are dropped.** In their place, at the right of the skyline: **the monument** (`MONUMENT`, and kind `monument`): a colossal Sun disc of polished gold standing on its rim, about 190 across, carved as Work's Sun stones are. **The dunes** (kind `dunes`) are the second natural area, round it: pale gold sand in great sweeping forms, with a pool of mirror polished metal among them.
- **The jungle is far out of scale on purpose:** its trees are as tall as the buildings beside them, 70 to 170.
- **The parts** (`part.ts`): `ground`, `spire`, `towers`, `temple`, `gardens` (the jungle), `dunes`, `monument`, `craft`, and under the world `tear`, `core`, `debris`, which are finished and not to be touched.

**Polished metal, which every part on top of the world now shares.** This is the largest change, and he has asked for it three times.

- **It is a mirror, not a color.** A polished metal is `metalness` 1 and a `roughness` of 0.05 to 0.2 on a standard material, and it looks polished only because it reflects bright things beside dark things. It is never made bright with emissive, a flat pale color or a gain in a shader: that is the "orange trim" he rejected.
- **The stage gives it things to reflect** (`ROOM` in `index.ts`): the moon, small and very bright. The city's glow in the sky behind. Three long pale strip lights, overhead and at each side, which draw the bright hard edged lines that make a curved thing read as polished. Darkness between. And the cursor's light, whose highlight slides over polished metal as the cursor moves: that is test 15.
- **Pass every metal material through `polished()`** (`src/pieces/skycity/polish.ts`), after your own changes to its shader: `polished(material)`. It adds the cursor's light as a lit panel that polished metal reflects: a soft edged disc of pale light, about 100 units across on a flat mirror that faces the visitor, which slides over the metal as the cursor moves. The panel stands close in front of whatever it lights, so a face turned away from the visitor shows it when the cursor is a little to the side the face is turned to: moving the cursor past a curved or carved thing runs the light across it. It shows only on what is metal and smooth (it has faded out by a `roughness` of 0.34), so it is safe on a material that is metal in some places and stone in others. This is how test 15's sliding reflection is met: check yours with `--lamp` in two places.
- **So shape it to catch them.** A flat polished face reflects one thing and reads as a flat color. A curved or facetted one (a dome, a cylinder, a fluted column, a bevelled edge, a ring, a faceted cap) carries a bright line that moves. Give polished metal curvature, bevels and facets.
- **Three metals a stranger can tell apart:** gold (pale and bright, between the palette's `copper-light` and `hot`), copper (redder, the palette's `copper`), bronze (dark and brown). A highlight on any of them is pale, not orange.
- **Used boldly:** whole things made of it, not lines of it. A building clad in it, a dome, a great disc, a pool.
- **A pool of mirror polished metal** is a level face of `roughness` about 0.03 with a slightly domed, rippled or hammered surface, so it carries the moon as a bright path and the glow as a warm sheet. It reflects the room and not the things beside it: that is accepted.

### His second look (Nov 14, late): the newest, and it wins over everything below

He saw working stills of the world mid-rebuild. "It's coming along." Then:

- "It looks like the city isn't dense enough. You think of a city from Star Trek or Star Wars, the city is ultra dense. Also don't like how spread out the buildings are."
- "You can really see the grade of the planet, which I think we agreed to make it not such a rounded dome. It should be circular, and when you scroll down, you should have the realization that this is a piece of a planet, but it doesn't have to be so round."
- "I think we have too much forest surrounding it. I just wanted there to be like a nature area, not that it was completely covered and surrounded by nature. I think we should make the city bigger and utilize a lot of the space that's currently being tied up with the nature."
- "The nature area should honestly look like a national forest, not something that is desert like, think of like a jungle. I wouldn't even hate like small mountains somewhere as well to give it more 3-D depth, even if that's outside the forest. Water sources would be interesting as well. In Star Wars, the Star Trek, you often see flying vehicles."

The plan is redrawn for it (`src/pieces/skycity/layout.ts`: read it again from the top). Where a number below disagrees with these, these win:

- **A shallow cap.** `PLANET` is curved to a radius of 1400 and kept to 28 degrees: about 1320 across, only about 165 tall. `HEART` is 310 under the top. The torn edge is between about 622 and 684 on the map, and the broken margin begins at 600 (`MARGIN`).
- **So the world is seen nearly edge on.** The top of the dome is no longer a face seen from above. What a visitor sees is what stands up, in layers one behind another, with the ground between as thin slivers. Height, outline and depth are everything. At the edge of the city things lean out about 23 degrees, at 300 out about 12.
- **The city is ultra dense and covers most of the top.** `lots()` gives about 230 lots, 30 to 44 across, a few units apart, in four bands out to 600, the tallest 215 (`TALLEST`) near the spire and lower toward the visitor so each row shows over the one in front. Roads are 10 wide: canyons. The spire is 280 (`SPIRE`).
- **One nature area** (`FOREST`, and kind `forest` in `DISTRICTS`): bearings 222 to 318, from 330 to 600 on the map, at the left of the world. In it `relief` gives hills up to 26 tall and five small mountains (`PEAKS`) up to 118 tall, behind and beside the temple. Everywhere else the land is level.
- **The temple quarter** is at bearings 262 to 292, 330 to 470, inside the forest's edge. **The port** at 66 to 106, 300 to 470, in the city. **The way to the spire** at -8 to 8, 150 to 600, a canyon through the city.
- **Flying vehicles, plainly seen:** lanes of traffic between the towers and a few larger craft.

### His look at the frame (Nov 14, late), which changes what follows

He saw the frame with the old disc still on it, and said:

- "There should be no platform anymore. The top of the sphere is the planet where the city should reside."
- "The city also looks similar, it's what you had before, like you added this onto the existing design... the old design won't work here. This is a three-dimensional design. We have an entire sphere to cover."
- "The sphere is a bit rounder than I would've hoped."
- "I like that you added a pyramid, but overall the ground looks way more like a space station, and the ring and everything to the right look really bad."
- "The city also looks really small. That should not be the case."
- "I think the nature scenes should look much more like a national forest than a farm."

Then, on what "real" means:

- "This is the most important one on the entire site, so it has to look the absolute best! Think Star Wars, alien landscape, but familiar. Ultra realistic in the sense of it looks like an actual real object the user is looking at, something from a high production movie or AAA video game. Not hyperrealistic in the sense of what you're looking at, you would actually see in the real world, as this is a futuristic sci-fi city."
- **So the bar is the finish of a high production film or a AAA game:** real weight, real light, real materials. It is not that the scene could exist. Ask your reviewers: "is this a frame from a high production film or a AAA game, or is it cheap, amateur, low poly or a toy? What gives it away?" A reviewer who says film or AAA game has passed it.
- **The look is an alien landscape that is familiar,** as a Star Wars world is: landforms a visitor knows (ridges, mesas, forest, river, rock) made strange by their scale, their shapes and their light. Monumental, worn, lived in.

What that changes, for everyone:

- **The dome is flatter:** `PLANET` is now a radius of 748 kept to 62 degrees, so about 1320 across and 400 tall. `HEART` is no longer the sphere's middle: it is a fixed place, 540 under the top. Use `HEART`, never `-PLANET.r`.
- **The ground is land, not a deck.** Soil, rock, hills. Nothing on it may read as a space station: no platform, no wall round the world, no decks of plating, no rings of evenly spaced lights. Outside the city the land rises in hills and ridges: `relief(x, z)`, up to 38 tall, and `seat`, `lift` and `bend` already stand things on it.
- **The city is large.** `lots()` now gives few, large buildings, 42 to 76 across and up to 185 tall (`TALLEST`), in three bands out to 440 on the map. The spire is 240. The city fills the crown of the dome from one side of the screen's skyline to the other.
- **Round the city is a wild forest,** as a national forest is: `DISTRICTS` has two stretches of `forest`, from 470 out to 700, and no gardens and no farms.
- **The pyramid stays** and the temple quarter moves in, to 290 to 470 on the map at the left of the skyline, so it shows at rest on every screen. **The port is designed again from nothing,** at 290 to 470 at the right of the skyline: no ring, nothing on thin masts or stalks.
- **The broken margin** begins at 700, and the torn edge is between about 729 and 809.

### His words

- "The city no longer stands on a flat floating disc. It stands on the top of a small planet that has been ripped in half."
- "The ground is the top of a little planet: a dome, a bit less than half a sphere, curved side up. The world is on the curved top. It is art, so everything on it is far bigger than it would be on a real planet. That gives you a lot of room to make it big, varied and grand."
- "The underside is torn, not cut. It has to look like the planet was ripped in half: jagged, broken, its layers showing. No flat base and no clean edge."
- "In the torn face I can see the planet's core: a real 3D thing, burning and moving. Our stream comes out of the core. The core is where the stream begins, so it has to be the same light as the stream, not lava."
- "Streams of that same light also leave the torn face at several other points."
- "Debris round the torn underside: pieces of the planet, from big slabs down to small shards. Some orbiting slowly, some holding still with one face to the core, some tumbling. A lot of variation, so it feels like the planet really was destroyed halfway. The smallest pieces should match the shards in the stream."
- "The bar: this is the best 3D object on the whole site. I want a visitor to feel they are looking at a real thing that was photographed. Hyper realistic, even though nothing like it exists."
- "I want the whole surface of this world covered in detailed 3D art, with nothing bland or empty on it."
- The three changes before it all still hold: rings on the spire, gold, bronze and copper used freely, and a small world with many kinds of place, not towers from edge to edge. A Star Trek future city with the flair of ancient Egypt. Nature in the site's colors, never green.

### The frame

- **Units** are as before: one a CSS pixel on a screen 1460 wide. **The origin is the top of the dome,** where the spire stands. x to the visitor's right, y up, z toward the visitor. The core is straight down from it: `HEART`, 540 under the origin.
- **The planet** (`PLANET`): its top is curved to a radius of 748 and kept round to 62 degrees. So the dome is about 1320 across at its torn edge and about 400 tall. The spire is 240 (`SPIRE`), down from 420.
- **The plan is a flat map laid over the dome from its top.** A place on the map is so far to the right of the top and so far toward the visitor, measured along the ground. `RINGS`, `AVENUES`, `DISTRICTS`, `lots()` and every place a part already knows are places on this map, unchanged. Three functions put the map on the dome:
    - `seat(x, z, up, spin)` is the matrix that stands something, built upright at the origin, on the ground at a place on the map. Use it for everything that stands: a tower, a tree, a column, a statue, a craft's pad. **Everything stands straight out from the ground under it,** so the skyline fans.
    - `lift(x, y, z)` is a place on the map, at a height above the ground there, as a point of the frame. Use it for what moves: a craft's path, a car on a road.
    - `bend(geometry)` lays a geometry built flat on the map over the dome. Use it for what lies on the ground: a floor, a road, a wall, a terrace, a field. Not for what stands tall, which would spread as it rises.
- **A shader that works something out from where a point is** (a plan drawn per pixel, a height, a fade) must be given the map's own coordinates as an attribute before the geometry is bent. In the frame, y is no longer height above the ground.
- **The torn edge** is `EDGE.at(bearing)`: how far out on the map the ground reaches at a bearing. It is ragged, between about 729 and 809. The ground above and the torn rock below both end exactly on it.
- **The broken margin:** from `MARGIN` (700 on the map) out to the torn edge the world is damaged.
- **The core** (`CORE`, `HEART`, `SOURCE`): a ball 150 in radius at the planet's middle. `coreLevel(t)` is how bright it burns. The stage hands it to every part each frame as `s.core`.
- **The torn underside** hangs no lower than `TEAR.low`, and is torn back round the core into a hollow `TEAR.hollow` across, open toward the visitor.
- **The vents** (`VENTS`): six points of the frame where streams of the stream's light leave the torn face. The stream draws them. The tear makes the places.
- **What broke away** lies inside `DEBRIS`: no lower, no further out, no higher.
- **The view** (`VIEW`) is from straight in front and 4.5 degrees up, from far away, and it never moves. The world scrolls with the page. `drawn(x, y, z)` says where a point of the frame is drawn in the host.

### What the view means for your part

- **Only the front half of the world is ever seen.** What stands on the far side shows only where it rises over the crown. Spend nothing there.
- **The limbs are the skyline.** At a bearing near 90 (the visitor's right) and 270 (the left), things stand out sideways against the sky, in outline, all the way down to the torn edge.
- **The face toward the visitor is seen from above.** At bearings near 0, from about 250 out on the map to the torn edge, the ground faces the camera more and more squarely, until near the edge it is seen almost straight on, like a wall, with what stands on it pointing at the visitor. This is the largest surface of the world on the screen, and it is where "nothing bland or empty" is won or lost: its floor, its roofs and its tops are what is seen.
- **At rest only the crown shows:** the spire and the ground down to between 106 and 167 under the top, by the screen, which is out to about 400 on the map at the limbs on the shortest screen and about 510 on a common one. The rest comes up as the page scrolls, and then it is close to the middle of the screen with nothing competing with it.

### The stage's lights, which are not yours to change

- **It is night.** The world reads by its outline against the glow behind it, by the edges the moon catches, and by what glows in it. The side away from the moon is dark, and what is further from the eye sinks toward darkness (the scene has fog, in the page's own ground color).
- **The moon,** from the visitor's right and only a little in front (`MOONWARD` in `layout.ts`, defined once: read it there), strong: the key light. It rakes across the world, so right hand faces and tops are lit and faces toward the visitor are in shadow. Its shadows are real and are drawn once, when the world is built. **So nothing that moves may cast a shadow** (`castShadow = false` on it), or it leaves a stain. Everything that stands still casts and receives.
- **The cursor's light,** which moves, with its own shadows drawn when it moves. It is an accent and not the key: it shows the visitor what the night hides, where he points.
- **The core's light:** a light at `HEART` in the stream's hot color, flickering with `coreLevel`. It lights the torn rock and what broke away.
- **The room,** reflected, and a very dim sky light. No part adds a light of its own. A part that added a moonlight of its own takes it out.

### What the stage does for a part

- A part none of which is on the screen is not drawn and its `update` is not called. `s.seen` gives the heights of the frame the screen shows, for a part that wants to do less.
- `s.core` is the core's brightness now. `s.still` is as before.

### The nine parts

| Part | What it is now |
|---|---|
| `ground` | The top of the dome out to the torn edge: its floor everywhere no other part has one, the streets and squares of the core, the roads out to the edge, and the broken margin with what is cracked, leaning and fallen |
| `spire` | As it was, 240 tall, on the top of the dome |
| `towers` | The city: few, large buildings on the crown, the tallest 185 |
| `temple` | The temple quarter and its pyramid at the left of the skyline, and the way to the spire |
| `gardens` | The forest: a wild forest over hills, all round the city. The part keeps its old name |
| `port` | The port at the right of the skyline, designed again from nothing |
| `tear` | The torn underside: the planet's inside in section, its layers, its veins of metal, the hollow round the core, the vents |
| `core` | The planet's core: a 3D thing of the stream's own light |
| `debris` | What broke away: slabs to shards, orbiting, holding still to the core, tumbling |

### What a part may cost now

| Part | Programs | Triangles | First frame |
|---|---|---|---|
| ground | 5 | 220,000 | 60 ms |
| tear | 4 | 220,000 | 60 ms |
| core | 4 | 40,000 | 20 ms |
| debris | 3 | 90,000 | 30 ms |
| the rest | as below | as below | as below |

### How to look at it now

- **The world in the hero:** `npm run shot -- "/lab/hero?ui=0" --wait 6000 --out shots/hero/<name>.jpg`, and `--scroll 400`, `700`, `1000`, `1300` for the rest of it, a screen at a time.
- **One part alone:** `/lab/piece/skycity?only=tear&label=0&ui=0`, close with `--scale 3`.
- **The piece at the page's size:** `/lab/piece/skycity?label=0&ui=0&size=1255&wide=1460`.
- Many builders share one dev server. If a page will not load, another builder's file is half written: wait and try again. Do not start or stop a server.

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
