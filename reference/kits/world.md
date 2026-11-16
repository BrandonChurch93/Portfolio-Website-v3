# Kit · the hero's world, built to picture 9

Read `README.md` in this folder first: what every piece shares. This file is what every builder of the hero's world shares. Read it whole before writing anything.

## What it is

The top of a small planet torn open, with a city on it, in the hero under his words. One piece with one stage, as the desk and the pad are. It replaces `src/pieces/skycity/`, which is set aside and is not touched.

## The bar, in his words

- Picture 9 is the target: `reference/concept/09-gemini-the-whole-world-he-likes-top-and-underside-together.jpg`. "It should look exactly like this with just the couple of changes we just agreed on." (Nov 15, 20:10)
- On the study built to it: "it's still a far cry from the quality that Gemini gave us... It needs to look tremendously better. It needs to be aware of the quality level." (Nov 15, 20:47)
- For what broke away: "Does this look like something a high-end premium movie made? Does this look like something that would be in a AAA video game? If not then it's not a good enough scene." (Nov 15, 18:50)
- The tests are in `QUALITY.md`, "The hero's world, built to picture 9". Every one is judged from stills taken on his Mac, side by side with picture 9.

## Picture 9 is recreated. The study is a rough guide and nothing more

He ruled this on Nov 15 at 21:38, after seeing the first output of the build: a smooth cut planet with a box for a hollow. "It looks much more like our design versus what Gemini provided. I think what Gemini provided looks better, and I'd rather try to recreate that perfectly than our inferior version."

- **Picture 9 is the shape as well as the look.** Its outline, its proportions, where each thing is and how big, how the rock is broken. Recreate it as exactly as a live scene can.
- **Where the study and picture 9 differ, picture 9 wins.** Do not ask him first. The study (`/lab/hero-blockout`, `src/hero-blockout/plan.ts`) only tells you the units, where the page puts the world, the names of things, and roughly how big they are.
- **Do not build the study's description of the tear.** In the study the hollow is described as a smooth cave with a flat ledge and the broken pieces are added to it. Built literally that is a box. Picture 9's hollow has no flat wall, no straight edge and no box anywhere: its roof hangs in great angular slabs with a jagged lower edge, its walls are stacked broken slabs that lean in toward the core, its floor is a ragged shelf, and dark broken masses hang below each side.
- Do not carry the study's meshes or shaders into the piece. The piece imports nothing from `src/hero-blockout/`, and the study is left as it is.
- What the study got wrong, so it is not repeated: `LOG.md`, Nov 15.

## Match picture 9, every round

Keep the picture open while you work. Before judging anything else in a round, lay your still over the picture and fix what does not line up.

- Use `reference/concept/09-parts/09-the-whole-picture-at-1376.jpg`, which is 1376 by 768. The part pictures were cut from it.
- Write a small script, `npm run match`, that takes a still of the world and writes two images: the still beside the picture at the same size, and the still laid over the picture half and half. Line them up by the planet: its left rim, its right rim and the top of its lip.
- Where things are in that picture, in its own pixels, measured by eye. Check each against the picture, which wins:
    - The planet: left rim at 95 across, right rim at 1280. That width, 1185, is 1320 of the page's units.
    - The top of the land's front lip: 268 down at the middle.
    - The core: centre at 688 across and 437 down, radius 90.
    - The hollow: from 330 to 1050 across. Its roof's underside about 335 down, its floor's top about 550, its floor's underside 575 to 600.
    - The lowest rock: about 700 down, under the left mass at 330 across. The right side comes down to a point near 1040 across and 690 down.
    - The pyramid: from 255 to 475 across, its apex at 362 across and 185 down, its base about 300 down.
    - Tops of the skyline: the spire 685 across and 20 down, the gold pointed tower 475 and 70, the stepped gold crown 762 and 100, the sun disc 902 and 95, a gold cap 968 and 108, a tower 1048 and 135.
    - The dunes: from 930 to 1270 across.
    - The large crater: centre 1175 and 405, radius 55. The low crater: 1100 and 600, radius 45.
    - The knot of the cracks: 235 across and 470 down.
    - The small streams: at 385, 500, 620, 748, 812 and 1010 across.
- It matches when the planet's outline, the lip, the hollow's outline, the core, the pyramid and each named tower sit where the picture has them to within about a hundredth of the planet's width.
- A live scene will not match the picture grain for grain. Outline, place, proportion, light and color can match, and must.
- Show him the side by side and the overlay every time you show him anything.

## The four changes from picture 9, and no others

1. The dunes are in picture 9's place and size, and as good as picture 4's (`reference/concept/04-*`): a sharp crest, and a hollow face in full shadow.
2. What broke away is made new: much more of it, floating close under the planet, one scene caught in the planet's gravity.
3. The hero's own moon is the one light that shapes the world. It is fixed. The cursor is a glint on polished metal and nothing else.
4. Gold is at the palette's hue. Picture 9's yellower gold is not copied: `QUALITY.md` fails yellow gold on sight.

Two things in the study are Fable's and not in picture 9. He has been told and has not ruled: two of the great loose pieces carry a piece of the city, and a line of light runs under gold and bronze crowns. Keep them out of the slice.

## Rules that stand

- **Made in code, not in Blender** (`BRIEF.md`, Hero, "The target so far", item 12). No model made by hand in another tool and no photograph is brought in. A file that a script in this repo writes is made in code.
- Colors are the site's: no blue, no green, no white. Hot parts go to pale gold.
- The view never moves. The world scrolls with the page.
- Nothing that moves may cast a shadow from the moon: its shadows are drawn once.
- Safari's memory rule in `CLAUDE.md` holds here as everywhere. `npm run mem` before he is given a link.
- The light that falls from the core is the stream. Never call it anything else.
- No opening. No sky and no moon in the piece: the sky and the moon are the page's (`src/hero/sky/`).

## How it is made

The study stops where it does because everything in it is made in the browser as the page opens, lit only by direct light, and was looked at seven times in software. None of that binds you. What follows is how the jump is expected to be made. Use something better if you can show it is better.

1. **Geometry is made ahead, by scripts in this repo, and shipped as files.** A script under `scripts/world/` writes each part's mesh to `public/world/`. So the rock can be many times finer than a mesh made at load could be, with real fracture, chipped edges and rubble, and the page loads it and does not make it.
2. **The light is worked out once.** The moon and the core never move, so what reaches each point of the rock and the city from them, directly and after one bounce, and how shut in each point is, can be worked out by a script and stored with the mesh. That is what gives picture 9 its soft shadow where rocks meet and its orange light carried across the hollow. At run time add only what must be live: the moon's own shadow map, drawn once, the glint, and what moves.
3. **Fine detail is made in code and stored.** Maps for the rock's small breaks, the sand's ripples and the walls' relief are written by scripts, small and compressed, and not worked out per pixel on every frame.
4. **Each part has its own builder.** An Opus builder per part, from this kit and that part's picture, with Fable judging every round side by side. No part is added to the world until Fable has passed it.

## The piece and its parts

- `src/pieces/world/`, one piece behind `src/world/piece.ts`, with one stage. Its parts are in `parts/`, each in its own file and folder, behind a contract in `part.ts` like the desk's: a group in the world's units, and an `update` handed the time and the core's level.
- `layout.ts` holds the plan. Units are the page's: one is a CSS pixel on a board 1460 wide. The origin is the top of the planet under the spire, x to the visitor's right, y up, z toward the visitor.
- It exports what `src/hero/board.ts` and `src/hero/stage.ts` read from the old piece (`drawn`, `CORE`, `SOURCE`, `VENTS`), so the hero can take the new world by changing an import. Do not put it on `/lab/hero` or `/lab/whole` until he approves it.
- `/lab/piece/world?size=1520&wide=1460` shows it at the page's size. `?only=<part>` shows one part alone and close.
- A part none of which is on the screen is not drawn and not told the time.

The parts, each with the picture it is judged against in `reference/concept/09-parts/`:

| Part | Picture | What it is | At the bar when |
|---|---|---|---|
| `rock` | `09a`, `09h` | What is left of the planet: the thick roof with its jagged lip, the hollow about two thirds of the planet's width, its walls of great angular slabs, the floor under the core, the hanging masses each side, the open bottom | Broken faces have breaks of every size down to what a pixel shows, edges are chipped and never ruler straight, loose rubble lies on ledges, and no face reads as clay, as wood grain or as a net of cracks |
| `core` | `09a` | A ball of the stream's light hanging free in the hollow, pale gold at its middle and deep orange at its hard edge, with a fine grain that moves slowly | Clear, with no haze round it, never white, and its light on the rock round it falls away with distance |
| `skin` | `09e`, `09f` | The planet's own outer surface where it survives: dark at the visitor's left with cracks lit from inside, pale and cratered at the right under the moon | Cracks are cut into the rock and their light lies on the rock beside them. Craters have a rim, a floor and a shadow, a few large and a few small, with smooth dusty ground between |
| `land` | `09c`, `09g` | The top: paving, the belt of dry grass, the desert and its dunes | Dunes hold change 1, with ripples that show close up. Nothing is a flat color |
| `pyramid` | `09b` | Large, at the front left edge, a corner toward the visitor, polished gold, on a low court | Its two faces differ, the brighter toward the moon. It is shiny and it is not a mirror. Its courses are fine and do not sparkle |
| `spire` | `09c` | The tallest thing, on the center line, with one thin gold ring near its top tilted as Saturn's is | A person can name what it is built of |
| `towers` | `09c`, `09d` | About 118 buildings. The ones that make picture 9's skyline are named in the plan (`MARKS`): the tall tower with a gold point, the stepped gold crown, the gold sun disc carved as the site's Sun stones are, the gold caps. The rest are a set of about twelve designs, used many times and never two alike side by side | No building is a box with windows on a grid. Windows have depth behind the glass and differ in brightness. The city is warm and lit, as picture 9's is |
| `trees` | `09c` | One kind, full round crowns in autumn colors, in a belt along the city's front | Crowns are soft and full, darker inside and beneath |
| `streams` | `09h` | The stream from under the core, with a neck where it leaves, and five small streams from the torn rock, thin, of differing length and brightness | Stand ins in the piece until the page's own stream is joined: say so plainly in what he is shown |
| `debris` | `09h` | Change 2. Four kinds in the plan, each with how it will move (`plate`, `whirl`, `drift`, `tumble`), in families that share a motion | His test for it, above. Shaped and weathered rock, not faceted solids. On his Mac its motion has weight in a filmstrip |

## What the world may cost

Starting budgets, Fable's, to be measured on his Mac. Change one only with a measurement, and write it in `LOG.md`.

- Triangles: 2,000,000 for the whole world on a desktop, 700,000 with `?handheld=1`.
- Shader programs: 14.
- Textures and stored light: 96 MB of GPU memory on a desktop, 40 MB handheld.
- The page with the world on it holds under 1000 MB of GPU in `npm run mem`, alone and with `--walk`.
- `npm run perf` holds the screen's rate with the stream running.
- Opening the page: the world's files are loaded, never built, and no step holds the page (`slice()` in `src/world/build.ts`).

## The slice comes first

Before anything else is built, three things are built to full finish, as proof that the method reaches the bar:

1. `rock` and `core`: the hollow with its roof, walls and floor, and the core in it.
2. `pyramid`.
3. One of `towers`: the stepped gold crown.

Everything else is shown as plain dark shapes in its place, so the slice is seen where it belongs.

Then stop. Show him the overlay on picture 9 first. Then, for each of the three, a still at the page's size and one close, each beside its picture from `reference/concept/09-parts/` in one image, kept in `reference/studies/`. Say what is at the bar and what is not. Build nothing more until he answers. If the slice is not tremendously better than the study, say so and propose a change of method: do not go on.

## How to look at it

- On his Mac the scripts draw with his graphics card. Take stills as often as you like, and open every one.
- Put the still and its picture side by side at the same size before judging. Judge at the page's size and again at three times zoom.
- Send a shot's output to a file and search it for ERROR: a shader that does not compile leaves a still with parts missing.
- `npm run match` is the first look of every round: see "Match picture 9, every round".
