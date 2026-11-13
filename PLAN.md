# Plan

The checklist for the build. `BRIEF.md` holds the rules. This file holds the order and the state.

## How this works

- `[ ]` not started · `[~]` built or in progress, waiting on Brandon · `[x]` approved by Brandon, with the date
- Only Brandon's approval ticks a box.
- Every item is real code in this repo that he can open and look at.
- Items inside a phase can run side by side. A phase's gate has to pass before the next phase builds on it.
- Fable builds phases 0 to 6. Opus comes in at phase 7.
- Phases 0 and 1 were built in the web chat. From phase 2 the building is in Claude Code on Brandon's Mac.
- `QUALITY.md` is the bar for every item. `LOG.md` has the notes from each session.

## Now

- **Phase:** 3, a section at a time, starting with Work
- **Built in Claude Code (Nov 12):** the stream's real route through Work at `/lab/work`, with posts and a rail as real objects. `LOG.md` has its account, including what it judged not at the bar
- **His first look, in his words, is in `BRIEF.md`**, The stream, "His first look at the build". In short: the strikes at the top stay, he likes them. The screws need to mirror, right to left. The strike on the second row feels like a graze. The word WORK is fighting the stream for attention, and he wonders about a metal bar over it
- **His pick from the second derby (Nov 12):** the Sun stone, for the posts. No heads on the rail, which keeps its bar and loses its knobs
- **His pick (Nov 12):** the Blade, for the ends of the rail. And the Sun stones 10 to 20% larger, growing away from the cards, with the stream no closer to the cards than it is now
- **His verdict on the card derby (Nov 13):** the layout is C · Data plate. Cast and Etched are dropped. Toned is the best of the three and he does not love it: the hard part is the pictures themselves. The hover is underwhelming, and he is unsure of the streak of light on the glass. He wants "Case study" with the arrow in the bottom right corner. **Nothing changes until he says**
- **In front of Brandon:** a plan for the card's third round, talk first (`LOG.md`, Nov 13). He wants the links in a row at the foot under a thin line, and the card to be more of an object: it grows and turns in depth under the pointer, with a deeper edge. He had not yet seen the second round when he wrote. After the third round the card goes to Claude Code to be built onto the site
- **He is open to the stone's face lighting** and wants to see it in action before he rules, so it gets built on the real page
- **After his pick:** one prompt to Claude Code: the sun stones as real objects, a little larger, with a face that lights, Blade finials on the rail, a stronger strike on the second row, more margin on an iPad, a bar over WORK to compare with and without, and the card once he has picked it
- **Still to do in the web chat:** Work on a phone (Open 18). It now also covers an iPad held upright, where two columns leave each card 272 px and the card needs about 340
- **Not ruled on:** the slim top bar with the categories docking into it (Open 17). The bar over WORK
- **The wireframe** is at `/lab/work-draft`, opening on R, the layout that was agreed. It has done its job. It shows the order of the stops and nothing else
- **Where the stream is:** `/lab/stream`, approved. It must keep drawing what it draws today
- **Small things left on the stream, none blocking:** the rest of Phase 2's list below

## Phase 0 · Foundation

- [~] `BRIEF.md`: Brandon reads Settled and Dropped and corrects them
- [x] `QUALITY.md`: fine as it stands, may be refined later (Nov 11)
- [~] The workflow for any new or compacted session (`CLAUDE.md`, `LOG.md`)
- [x] Project set up and running (Nov 11)
- [x] Carried over from the second build: city, workbench, handheld, camera, rocket, the cursor light. They look fine to him (Nov 11)
- [x] Each piece opens on its own page (`/lab/piece/<name>`) (Nov 11)
- [~] Screenshot and filmstrip tools (`npm run shot`, `npm run strip`), and a frame time tool (`npm run perf`)
- [x] A preview link that updates on every push: https://portfolio-website-v3-wheat.vercel.app (Nov 11)

## Phase 1 · Color and light

Study 01 is at `/lab/palette` and Study 02 at `/lab/buttons`. Stills are in `reference/studies/`.

- [x] Palette built from the portrait: ground, light, metal, text (`src/config/palette.ts`) (Nov 11)
- [x] The portrait set on the new background, looking seamless (Nov 11)
- [x] One carried piece moved to the new palette as a test: the handheld, brass to copper (Nov 11)
- [x] Type in the new palette (Nov 11)
- [~] The cursor light: it shifts the light behind the portrait, crosses the handheld's metal and lights both buttons
- [x] Primary and accent buttons: polished copper under a clear coat with cut words, and dark bronze with copper words. Under the cursor the cuts and words catch its light and the button grows (`src/components/MetalButton.tsx`) (Nov 11)

**Gate:** the portrait, the metal and the stream read as one light.

## Phase 2 · The stream, on its own

`BRIEF.md`, The stream, has the agreement. `QUALITY.md`, The stream, has the test it has to pass.

- [x] What it is made of: shards riding round a core of light, the core a smooth wave of light. He picked it from two sketches at `/lab/stream-core` (Nov 11). The shards are abstract facets in a solid and a clear material (Nov 12)
- [x] The agreement for the finished version (Nov 11)
- [x] The test shot, first round, at `/lab/stream`: "I think we nailed this", with changes asked for (Nov 12)
- [x] The test shot, second round and its fixes: jagged facets in two materials, no bunching on objects, fewer thrown at a strike, an occasional shard at rest, thrown shards that keep their momentum, no second wave. "This is good to move on with" (Nov 12)
- [x] After the approval: the lone shard at rest drops off the far end again, and riding shards on the title and the card stay with the stream, with none vanishing, reappearing or jumping. "This looks great! All my issues have been fixed" (Nov 12)

After he says the shot looks incredible, and not before:

- [ ] Lighting what it passes beyond the test page: the metal buttons, a 3D piece
- [ ] Passing in front of some things and behind others
- [ ] A real phone and a real iPad

Set aside, kept as records: the molten metal test shot at `/lab/pour`, its looks at `/lab/pour-looks`, and the three rough ideas at `/lab/stream-ideas`.

**Gate:** Brandon says it looks incredible. If it cannot get there, we rethink before any layout is built around it.

## Phase 3 · The home page, composed around the stream

- [x] Work's layout, chosen from wireframes at `/lab/work-draft`: his own sketch on straight rows, with a post beside each side and a rail at the foot. The posts and the rail are still to be judged as real objects (Nov 12)
- [ ] Layout sketches for the other sections
- [ ] The spacing system
- [ ] Hero
- [~] Work · the stream's real route with the posts and the rail, at `/lab/work` (Claude Code)
- [~] Work · the card's look (web chat). The layout is picked: C · Data plate. The picture, the hover and the case study link are open
- [ ] Work · the category bar, and the top bar it may dock into
- [ ] Work · on a phone
- [ ] Work · the whole section, with the real card in it
- [ ] Skills
- [ ] About
- [ ] Contact and the bottom of the page
- [ ] The stream's full route down the page
- [ ] Phone, tablet, desktop and 4K

**Gate:** Brandon approves the whole page as one composition.

## Phase 4 · Components

- [ ] Project card
- [ ] Category switch
- [ ] Section titles
- [ ] Nav and footer
- [ ] The portrait: big, on the right, reacting to the mouse
- [ ] About tabs
- [ ] Skills rows

## Phase 5 · The pieces in the page

- [ ] Every piece moved to the new palette
- [ ] The city, with the opening using the whole screen
- [ ] The workbench, sitting in the page and not in a box
- [ ] The rocket
- [ ] The handheld and the camera in their categories
- [ ] The PC animation
- [ ] The software piece
- [ ] The stream touching the pieces, replacing what the second build drew inside the city, the workbench and the rocket. The code's old names go with it (`LOG.md`, 2026-11-11)
- [ ] The workbench and the rocket brought up to the bar (see `LOG.md`, 2026-11-11)

## Phase 6 · Words and pictures

- [ ] Copy brought over from the live site for Brandon to rewrite
- [ ] The project list, with Brandon's category for each
- [ ] Pictures and video for every project
- [ ] One project page designed and approved

## Phase 7 · The remaining pages (Opus)

- [ ] A short handoff written from the finished home page
- [ ] The All work page
- [ ] Every project page, from the approved one
- [ ] The résumé
- [ ] The not found page

## Phase 8 · Finish (Opus, checked by Fable)

- [ ] Speed on every screen size
- [ ] Keyboard, screen reader and reduced motion
- [ ] Every page on phone, tablet, desktop and 4K
- [ ] Brandon's final look
- [ ] Launch on brandonchurchportfolio.com
