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

- **Phase:** 3 has begun, a section at a time, starting with Work. Phase 2's test shot is approved and he calls the stream "almost certainly the finalized base" (Nov 12). Its small items below stay open and block nothing
- **In front of Brandon:** three wireframe layouts for the Work section at `/lab/work-draft` (Study 09). A · Frame is his idea as he described it, B · Steps is his idea with the stream landing on each card, C · Middle is one stream winding down between the columns. Fable recommends C. `BRIEF.md`, Open 15, says where each meets the settled rules
- **What he is choosing:** where the stream goes through Work, and with it whether the rows are straight or the right column sits half a row lower. Nothing else on that page is for approval: not the cards' look, not the spacing, not the phone, not how many cards are struck
- **After his pick:** the card's look, here in the web chat. Then the stream's real route through Work, in Claude Code on his Mac
- **He is on his iPad for now, with no mouse.** Anything that needs the cursor is confirmed when he is home
- **Where the stream is:** `/lab/stream`, built in Claude Code on Brandon's Mac. `LOG.md` has each round's account
- **Small things left on the stream, none blocking:** the rest of Phase 2's list below. A real phone and a real iPad

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
- [~] After the approval: the lone shard at rest drops off the far end again, and riding shards on the title and the card stay with the stream, with none vanishing, reappearing or jumping. Built, waiting on his look

After he says the shot looks incredible, and not before:

- [ ] Lighting what it passes beyond the test page: the metal buttons, a 3D piece
- [ ] Passing in front of some things and behind others
- [ ] A real phone and a real iPad

Set aside, kept as records: the molten metal test shot at `/lab/pour`, its looks at `/lab/pour-looks`, and the three rough ideas at `/lab/stream-ideas`.

**Gate:** Brandon says it looks incredible. If it cannot get there, we rethink before any layout is built around it.

## Phase 3 · The home page, composed around the stream

- [~] Layout sketches to choose from · Work: three wireframes at `/lab/work-draft`, waiting on his pick (Nov 12)
- [ ] The spacing system
- [ ] Hero
- [ ] Work
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
