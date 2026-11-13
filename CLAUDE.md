# Brandon Church · portfolio

The third build of Brandon's portfolio. He calls it the most important thing he has ever made. The work runs across many chats, and any session can lose its memory, so everything a session needs is in this repo.

## Start here, every session, and again after a compaction

1. Read `BRIEF.md`. The rules. It is the only source of them.
2. Read `PLAN.md`. The order of the work and where it stands.
3. Read `QUALITY.md`, and open the images it lists. The bar.
4. Read the top entry of `LOG.md`. What the last session did and left unfinished.

Do not work from what you remember of these. Read them from disk.

## Who does what

- **Brandon** decides and approves. He does not arrive with the full picture. He wants a partner who brings ideas and recommendations, not someone who waits for instructions.
- **Fable** does the creative work itself: color, the stream, layout, cards, how each piece sits in the page. It does not hand these to another model.
- **Opus** builds contained 3D objects and the remaining pages late in the plan, from finished examples in this repo. Every subagent runs on Opus.

## How a piece of work goes

1. Read the brief and the quality bar for what you are about to touch.
2. Build it as real code in this repo, on its own page under `/lab` when it helps to see it alone.
3. Look at it. Take stills and filmstrips (see Commands) and open every image.
4. Judge it against `QUALITY.md`. Assume your first verdict is too kind.
5. Fix it and look again until it passes, or until you can say plainly where it falls short.
6. Show Brandon: where to open it, what is at the bar, what is not, and exactly what he is approving.
7. Write his verdict into `BRIEF.md` the moment he gives it.
8. Update `PLAN.md` and `LOG.md`, commit and push.

## Keeping the record

- **`BRIEF.md`:** when Brandon makes a ruling, write it in straight away with the date. Move items between Settled, Open and Dropped as he decides them. If something is not in the brief it is not a rule. Do not invent one, and do not carry one over from the second build.
- **`PLAN.md`:** only Brandon's approval ticks a box. Keep the "Now" section true.
- **`LOG.md`:** add an entry at the end of each piece of work, and before your context gets long. Say what was done, what he said, what is half finished, and anything the next session would otherwise have to rediscover.
- **Git:** commit and push after each piece of work so every chat sees the same repo. End commit messages with the attribution lines your session gives you.

## Where the work happens

- From Phase 2 the building is in Claude Code on Brandon's Mac, in the VS Code panel. There the screenshot scripts draw with his graphics card, so motion can be judged from filmstrips.
- The web chat is still used for planning. Its workspace draws in software, so it cannot judge motion.
- Both read and write this repo. Pull before you start and push when you finish a piece of work.
- Check which model you are. The creative work in this repo is Fable's. If you are not Fable, say so to Brandon before doing any of it.

## Working with Brandon

- Give him lists, not paragraphs.
- End every message with a clear, simple recommendation, so he never agrees to something he does not fully understand.
- He speaks in impressions. Restate what he said in exact terms (which section, what it does now, what it should do) before you build on it.
- Never show him something with "the final will be better". If it is not at the bar, keep working or say what is wrong with it.
- Do not make him critique every small detail. Give him an agreed list of what is being built and what is not.
- Ask before changing something he has already approved.
- He and Fable may recommend something that goes against a rule in `BRIEF.md`. When you do, say so in the chat in bold and name the rule, so he cannot miss it. The rule stands until he changes it. Claude Code builds to the rules as written.
- When he has to do something himself, give only the steps needed right now, as a numbered list. No "if this, then that" branches.
- For a command, say it goes in VS Code's integrated terminal and give the exact text to paste. He prefers the Claude Code panel in VS Code to the terminal when either would do.
- Do not bring up timelines or how long things will take.
- When his own browser has to be checked or operated, give that to an Opus agent.
- He rewrites the site's copy himself. Draft copy only when he asks.

## Commands

All run from the repo folder.

| Command | What it does |
|---|---|
| `npm install` | Once, after cloning |
| `npm run dev` | The site at `http://127.0.0.1:5330` |
| `npm run build` | A production build. Run it before pushing |
| `npm run typecheck` | Type check only |
| `npm run shot -- <route>` | A still of a page. Options are listed at the top of `scripts/shot.mjs` |
| `npm run strip -- <route> --times 0,1,2,3` | A filmstrip of motion. Options are at the top of `scripts/strip.mjs` |
| `npm run perf -- <route>` | Frame times over a few seconds of live running. `--cpu 4` slows the processor to stand in for a phone. Options are at the top of `scripts/perf.mjs` |

Examples:

```
npm run shot -- /lab/piece/city --t 12
npm run shot -- /lab/piece/handheld --vp phone --lamp 0.3,0.4
npm run strip -- "/lab/piece/city?entrance=1&label=0" --opening --times 0.4,1.2,2,2.8,3.6,4.4,5.2,7
npm run shot -- /lab/buttons --hover '[data-variant="primary"]' --wait 1200
npm run shot -- /lab/work-cards --vp tablet-wide --scroll grid --wait 3500
npm run strip -- "/lab/pour?ui=0" --times 0.62,0.8,1.3,2.2,4.4,7,8,9.6
npm run perf -- /lab/pour --vp phone --cpu 4
npm run shot -- "/lab/stream?hold&ui=0"
npm run shot -- "/lab/stream?hold&ui=0&shards=first"
npm run strip -- "/lab/stream?ui=0" --times 1,1.7,2.4,2.8,3.1,3.4,4.3,6 --eval "window.__site.call('streamPlay', 150, 1250, 1, 3.4)"
npm run shot -- "/lab/work?ui=0" --scroll 1150 --t 20
npm run strip -- "/lab/work?ui=0" --times 1.45,1.6,1.75,1.9,2.1,2.4 --cols 3 --tile 1300 --eval "window.__site.call('streamPlay', 760, 1560, 1, 2)"
```

- The scripts use the dev server if it is running and start one if it is not.
- They need a browser. If one is missing they say so: run `npx playwright install chromium`.
- Images go to `shots/`, which is not committed. Copy one into `reference/` only when it is worth keeping.
- The scripts print `hardware` or `software`. `QUALITY.md` says what each can be trusted for.
- A plate fades in over about a second, and the lamp is a place on the screen, not on the page. So give a still of plates `--wait 3000`, and shoot a long page a screen at a time with `--scroll`: on a `--full` still everything below the first screen is far from the lamp and comes out dark.
- `streamPlay(fromScroll, toScroll, fromTime, toTime)` scripts a scroll of the stream's page, so a filmstrip of frozen frames can show it being scrolled. `streamPlay()` ends it.
- `streamCount(left, top, right, bottom)` counts the shards the last frame drew inside a rectangle of the stream's page, `streamList(left, top, right, bottom)` lists them with whether each was thrown and how far it is from the core, and `streamThrown()` lists every thrown shard with its place, and `streamThrown(true)` adds the share of its size each is drawn at. `streamState()` gives what the route is planned round (the boxes, the posts and the rails), every landing with its kind, its side and how far along the side it is, and where the two sides part and meet. They are how the bunching on objects, the bounce at a strike and the second wave after one were measured.
- `streamProbe(true)` starts a record of every riding shard, and `streamRiders(left, top, right, bottom)` reads it: each one's place, the share of its size shown, and what took the rest away. Recorded frame after frame, it counts the shards that vanish, reappear or jump.

## Where things are

| Path | What |
|---|---|
| `BRIEF.md`, `PLAN.md`, `QUALITY.md`, `LOG.md` | The record |
| `reference/` | The portrait, the bar, the rejected second build, the pieces as carried, stills of each study, and photographs of the real things a study borrowed from, with credits |
| `src/pieces/` | The 3D pieces, one folder each, behind the contract in `src/world/piece.ts` |
| `src/world/` | Shared 3D code: the stage, materials, the clock, quality tiers |
| `src/lamp/` | The cursor light. One lamp, read by everything that is lit |
| `src/stream/` | The stream. Its test shot is at `/lab/stream`, and `/lab/stream?hold` opens it with the frame held. The same stream runs through the Work section at `/lab/work`. `route.ts` plans where it goes from where things are on the page: `buildRoute` for the test shot, `routeThroughWork` for Work, with any number of landings, round posts, sloping rails and the two sides meeting again, `sim.ts` steps what flies (the leading ends, sparks, thrown shards, arcs), `shards.ts` makes the shard meshes, which are facets, `shaders.ts` and `renderer.ts` draw it, `config.ts` holds its constants and budgets, `stream.ts` puts it on a page. `shards-first.ts` and `shaders-first.ts` are the first round's copper leaf and glass, kept one switch away: `/lab/stream?shards=first`, or the switch at the foot of that page |
| `src/stream-core/` | The sketch of the stream Brandon picked, at `/lab/stream-core`: shards of copper and glass riding a core of light. Panel A, the wave of light, is his pick and the floor to beat. Panel B is the arc he passed over. A reference: do not build on it or change it. `?reach=0.5` sets how far the stream has run |
| `src/stream-facets/` | A quick study at `/lab/stream-facets`: two looks for the stream's shards, cut and jagged, circling one line of light. Click a panel to strike it |
| `src/components/lab/WorkLab.tsx` | The stream through the Work section, at `/lab/work`: the title, the category bar, four cards in two rows, a post beside each side, a rail under the grid and the button at its low point. The page only lays these out. The stream reads where they are and plans its route (`routeThroughWork`), and draws the posts and the rail itself in the buttons' metal (`postFrag` and `railFrag` in `src/stream/shaders.ts`, lit by code shared with `src/metal/shaders.ts`). The cards, the category bar and the button are stand ins. `?ui=0` hides the label |
| `src/work-objects/` | A derby at `/lab/work-objects`: three designs for the turning object and three for the rail, each a height worked out per pixel and lit as the posts and rail on the Work page are, with a line standing in for the stream. `?stream=0` opens it with the stream off. Brandon did not love any of them. `guardians.ts` is the second derby, at `/lab/work-guardians`: statues in place of hardware, three families (Pharaoh, Gargoyle, Sun stone), each as a mask facing out and as heads in profile at the ends of the rail, with eyes and mouths that light when the stream is on. Rough reliefs written in code, to choose a direction from. He picked the Sun stone for the posts and no heads for the rail. `finials.ts` is the third derby, at `/lab/work-finials`: three finials for the ends of the rail's bar, Blade, Orb and Steps. `pairing.ts` is at `/lab/work-pairing`: the sun stone beside the rail with the Blade and with the Steps, each large and at the page's size, for him to choose between the two |
| `src/components/lab/WorkDraft.tsx` | A wireframe of the Work section at `/lab/work-draft`: layouts round a line that stands in for the stream and follows the scroll, with a category bar and a top bar the categories dock into. P and R are in the switch at the foot of the screen: P is Brandon's own sketch of how the stream meets the cards with a post beside each side that turns the stream in, and R adds a sloping rail under the grid that carries it to the button. `?v=a`, `b`, `s`, `p`, `r` or `c` opens one, and `?whole` draws the whole line for a still. R is the layout that was agreed. It shows the order of the stops for the real route at `/lab/work` and nothing else: a sketch, not something to build on |
| `src/stream-ideas/` | An earlier study at `/lab/stream-ideas`: three rough ideas (threads, copper leaf, ink). Its `route.ts` and `gl.ts` are used by the sketch above. Set aside |
| `src/pour/`, `src/pour-looks/` | The stream's first attempt, as molten metal, at `/lab/pour` and `/lab/pour-looks`. Set aside and kept as a record |
| `src/hooks/` | `window.__site`, present only with `?hook=1`. The screenshot scripts drive pages through it. `__site.call(name, ...)` runs a tool a module registered, such as `plateHover` |
| `src/components/PieceView.tsx` | Puts a piece in a page |
| `src/metal/`, `src/components/Plate.tsx` | Lit metal for the interface: one hidden WebGL context draws every plate from a height field. A project card is one of its plates (`kind="card"`, `finish="card"`): a copper bead round a dark face, a picture in a sunk window over a band of dark bronze. `CARD` in `mask.ts` holds a card's design sizes |
| `src/components/MetalButton.tsx` | The primary and accent buttons |
| `src/components/WorkCard.tsx`, `src/content/work.ts` | The project card and the projects on it, with the live site's own words and screenshots (`public/media/work/`). The card's words are in the page, over its plate. One layout, the data plate he picked: a picture that rests in bronze, a band of bronze with the kind, the year and the links, and "Case study" in the corner. A project's `picture.loop` is a short video that plays in place of the picture while the card is awake. None exists yet: Brandon is retaking the pictures. The study is at `/lab/work-cards` |
| `src/app/lab/` | Pages for looking at one thing alone |
| `src/config/palette.ts` | Every color, defined once. The interface gets them as CSS variables, 3D as numbers |
| `src/styles/tokens.css`, `src/config/site.ts` | Type, spacing and other constants, each defined once |
| `scripts/` | The screenshot tools |

Every push to `main` deploys to https://portfolio-website-v3-wheat.vercel.app, which is where Brandon looks at the work on his own machine.

The second build is at https://github.com/BrandonChurch93/Portfolio-Website-v2. Its code can be read for ideas and lifted from when Brandon asks for something it had. Its kit and its rules do not apply here.

## Code and writing

- TypeScript strict. React function components with CSS Modules.
- Three.js is used directly, and GSAP drives motion. Every animation reads time from the one clock in `src/world/clock.ts`, so a frame can be frozen for a screenshot.
- Each constant is defined once and imported.
- Almost no code comments. Keep one only when it explains a reason someone could otherwise undo.
- No em dashes in anything the site shows or in these documents. Use a period, a comma or an interpunct (·).
- This repository is public. Do not commit anything private.
- The line of light and shards that runs down the site is called the stream. Never call it water, in a document, a comment, a name in code or anything the site shows, and do not call it the pour, which was its name while it was going to be molten metal. Old code still says water in many places, and the set aside studies keep the name pour. Rename the old code as you replace it.

## When compacting

Keep: the phase and item you are on, what is changed but not committed, what Brandon last said, and the rule that the first thing to do afterwards is read `BRIEF.md`, `PLAN.md`, `QUALITY.md` and the top of `LOG.md` again.
