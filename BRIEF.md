# Brief

Brandon Church's portfolio, third build. This file is the only source of rules for the project.

## How to read this

- **Settled** means Brandon said it. Do not change it without him.
- **Open** means nobody has decided. A guess is never a rule.
- **Dropped** means he cut it. Do not bring it back.
- Anything not written here is the builder's choice and can change at any time.
- When Brandon makes a ruling it is added here the same day, with the date.
- All dates are 2026.

## What this is

- It replaces brandonchurchportfolio.com.
- In his words it is "by far the most important thing I've ever made".
- **Who reads it:** people he is interviewing with, mostly engineers. They have already read his résumé and came to see the work. Nobody finds the site on their own.
- So the site never repeats the résumé. It shows the work and says what a résumé cannot.
- The front door is a software engineering and design portfolio. Games, 3D art and photography show up inside Work, like a bonus.
- It has to scale: new projects, new categories, video, screenshots and very high resolution photography.

## The bar

- A new level, not an improvement. At or above his PC Builder. `QUALITY.md` spells the bar out.
- He read `QUALITY.md` and is fine with it as it stands. He expects it may need refining once he sees what it produces. (Nov 11)
- It does not look like anyone else's portfolio.
- World class on a phone, an iPad, a desktop and a 4K screen.
- 3D is hyper detailed. He means detailed, not true to a real place. Nothing janky.
- He does not care how long it takes.

## Settled

### Color

- The site is built to complement his portrait (`reference/portrait.jpg`) so the photo looks seamless in the page. Dark and warm. (Nov 10, restated Nov 11)
- The accent may sit slightly off the photo as long as it complements it. The yellow gold brass of the second build did not. (Nov 11)
- The palette built from the portrait is approved: copper and bronze in place of brass, with the ground, light and text colors in `src/config/palette.ts`. "An overall improvement for the colors. Looks good." (Nov 11)
- The portrait set straight on the page, melting into the background, is approved as shown in Study 01. (Nov 11)

### Type

- Sora for display with a firm headline weight, Inter for body, JetBrains Mono for labels. (Nov 10)

### The cursor light

- The cursor is a light. It falls on things across the whole site and shows their 3D form. This was his favorite idea from the first look round. (Nov 10)

### The pour

- A stream of molten metal runs down the whole site. "I agree molten metal is the way to go." (Nov 11)
- It is called the pour. The name is Fable's and he has not objected. It is never called water, in anything written for a model or shown to a visitor. His reason: "if I call it water, then the model is gonna build it as if it acts like water". (Nov 11)
- It is the site's own copper, melted: it glows in the palette's light colors, ember to flame to hot to pale. It looks like a foundry pour: bright, clean and quick, throwing sparks and beads. It never looks like lava (dark, crusted, slow), fire (flames) or water (thin, clear). (Fable's recommendation, which he agreed to, Nov 11)
- It is the most important thing on the site. "It's probably like the most important thing on the site to get right." (Nov 11)
- It comes off the hero city and runs through the whole site.
- It moves down the page with the visitor as they scroll.
- It never runs straight down. It moves around sections and content.
- It shapes the layout. It can run through the middle of a section to make a layout that breaks the usual pattern, as long as the page is still easy to use.
- Things he has named for it to do:
  - hit the work title dead center, split, and run down both sides
  - land on top of a card, bounce off and drip down
  - hit the desk and run off the side
  - interact with some of the 3D objects
  - pass behind his portrait at an angle, never straight into his head
- It is not a gimmick that touches a couple of things. It also should not touch everything. (Nov 10 and Nov 11)
- It has to feel real: a splash with shape and weight, believable physics, particles riding with the flow.
- Its particles come from what it is. For molten metal he named sparks and drips. (Nov 11)
- Nothing is drawn ahead of it to show where it will go.
- No permanent grid floor behind the page.
- It has to look incredible.
- The first thing built is one test shot, alone on a blank page: it falls, hits a ledge, splashes, runs along the ledge and drips off the end. Nothing is built around the pour until he says that shot looks incredible. `QUALITY.md` says what the shot has to show. (Fable's proposal, Nov 11. He went ahead on it without objecting.)
- What the second build drew inside its pieces (the city's falls, the desk's edge, the rocket's flume) "looks very low quality". The pour replaces all of it. (Nov 11)
- How the test shot is built, which he said "Go" to (Nov 11): a real particle fluid simulated side on in the flat plane of the page, with gravity, cohesion and adhesion. Only the route is planned. The particles are merged into one rounded body and lit per pixel. Each particle carries a temperature that sets its color on the palette. Its glow lights the ledge and the page, and the ledge keeps a fading heat mark. The test page has two controls: pour again, and slow motion.
- His verdict on the first test shot (Nov 11). The material is still liquid metal: "the idea here that we're going with is liquid metal". What he saw was not it:
  - "I definitely don't like how it puddles."
  - "The mainstream is blasted back multiple times due to this puddling", and from "the way the particles can bounce backwards and hit the stream, pushing it back".
  - "Instead of looking like a refined beautiful hot liquid metal, this looks more like mud splashing around and puddling up."
- In exact terms: the metal must not heap up where it lands, nothing it throws may knock the falling stream off its line, and the whole of it has to read as refined, not as a mess. (Fable's restatement, Nov 11)
- He wants something special about the stream itself. "Think like how plasma looks that liquid metal color, but with shiny stuff all in it, or maybe something else. I'm open to options." (Nov 11)
- The simulation is stepped from the one clock (`src/world/clock.ts`) with a fixed timestep and a seed, so any frame can be frozen and shot again exactly. Each new pour takes a new seed, so no two splashes match. (Nov 11)
- A particle budget is set for his Mac and for a phone before building, and what the phone gives up is said out loud. The phone view is checked as the work goes, not at the end. (Nov 11)

### Hero

- The floating future city: a made up city, a spire at the center, parks, a Star Trek feel. The model from the second build is kept.
- The city sits along the bottom of the screen with the text above it. The model never goes behind the text.
- The opening uses the whole screen with nothing cut off at the top or bottom. The city builds itself in the middle, then moves down as the text comes in.
- At rest the text sits about a third of the way down. On a desktop it is fine if half the city or a little more shows.
- He wants camera movement and a real moment of awe.
- No PC parts in the hero.

### Work

- One section. A centered title. No featured card.
- Categories at the top, Software first: Software, Games, 3D art, Photography. A project lives in one category only, and Brandon says which.
- Four or six items per category on the home page.
- A View more button goes to an All work page with the same categories, showing everything. There are no separate pages for games, photography or 3D art.
- 3D art stays visible while we build and is hidden before launch if he has nothing to show.
- Photography is one category. He picks the photos. Boudoir is never named as its own category.

### Cards and buttons

- A card is a card: picture, title, description and tags. Brass is an accent on it, not the whole card.
- Keep the tags and the text. The second build lost them.
- The second build's spacing was far too cramped.
- He likes the second build's brass buttons, the Download PDF one most. He wants a primary and an accent, and both react to the light.
- On the first copper buttons (Nov 11): the words on the bright one are hard to read, because its face is light on the top half and dark on the bottom half, right behind the words. He wants a face that makes sense and does not put that split behind the text, and floated a tarnish look. He also does not love how simple the hover was (the button only lifted).
- On the second pass (Nov 11): "The buttons do look better." He likes "especially how the mouse moving around changes the glow on them". The other hover effects (the light running round the border, the lift, the accent's words warming) "aren't bad though I don't necessarily love them either". The hover is not settled.
- "Don't make any changes to the colors for now." He said it when asking whether the buttons are 508 compliant. (Nov 11)
- The hover is Catch: the cut border, the edges and the words light only where the cursor is near. "I think my favorite is catch." Coming in and moving around "feels about perfect". (Nov 11)
- Still to fix on Catch, in his words: on mouse leave "it takes a bit longer than I'd like for the animation to fade off", and "the button doesn't scale or do anything else. I think we should add some type of lift or scale. I'm leaning more towards a scale". (Nov 11)
- The cursor's light as it moves around the page "looks amazing" on the dark buttons and is "a lot harder to see" on the bright ones. "I don't want to nerf the secondary buttons." "I wish the primary buttons had a bit more shine to them." He floated darkening the bright button a little and asked whether that would look off. (Nov 11)
- Under the cursor the button grows a little. "I really like the scale." (Nov 11)
- The bright button is the shinier one: a little darker, under a clear coat that shows the cursor's light crossing it. "I like the primary with the most shine!" (Nov 11)

### Skills

- The workbench is the skills piece.
- One fixed light: the desk lamp and the lit monitor. Choosing a skill never relights the desk.
- Skills are never tied to objects on the desk.
- Skills read in wide rows, not narrow columns.
- One animation for skills. Nothing is hidden behind a category.

### About

- A big portrait on the right that reacts to the mouse and feels like part of the page, with something like an aura.
- Tabs: about me, what I want to do, my plans for the future.

### Contact

- A rocket launch, not a rocket flying through space.
- Nothing depends on a visitor sending a message.
- He likes having something at the bottom that ties the page together.

### 3D pieces

- The more 3D the better. The pieces do not all follow the city. Each has its own idea.
- Each kind of work can have its own piece.
- Carried over from the second build: the city, the workbench, the handheld (he really likes it), the camera (he is happy to keep it) and the rocket.
- He looked at the five carried pieces on his own machine and they look fine to him. (Nov 11)
- He wants the PC from his PC Builder animated somewhere visible on the site. Not in the hero, and not as the piece for the work section.
- Video and photos never compete with 3D.

### Words

- His live site's content is the base. It is better than the second build's drafts.
- The tone is serious: he wants to better humanity, work on cutting edge technology and push design. It is not a sales pitch. Fun is mentioned only on a project where fun was the point.
- He rewrites the copy himself. Claude drafts in his voice only when he asks.
- No em dashes anywhere on the site.
- He has ten years of experience, almost eleven. The live site's "twelve years" and "40+ clients" lines get corrected.
- How he wants to be positioned: someone who takes a product from zero to done (meets the client, understands the problem, designs it, builds it, tests it with users, ships it), works well with teams, and has spent countless hours evaluating, red teaming and improving frontier AI models. (Nov 10)
- Project pages hold video, click through screenshots, clear live and code links, more detail, and the year.
- Python stays on the site.

### How we work

- Fable builds the creative parts and Brandon approves each one. Opus builds contained 3D objects and the remaining pages at the end.
- The work runs across many chats, and any chat can lose its memory. So the repo carries everything a new or compacted session needs: the rules, the plan, the quality bar and a log. (Nov 11)
- The plan is a checklist worked phase by phase. Several items can be in progress at once. (Nov 11)
- Everything he approves is real code in this repo.
- Nothing is approved as "fine if the final is better". If it is not at the bar when he sees it, it is not done.
- He is told exactly what he is and is not approving at each step.
- The building happens in Claude Code on his Mac, with Fable, from Phase 2 on. Planning can still happen in the web chat. Both read and write this repo. (Nov 11)
- Every message to him ends with a clear, simple recommendation.
- When something is ready to show him: run a production build, commit, push to `main`, and give him the live link. He is often on his iPad, which cannot open localhost. (Nov 11)

## Open

Each line has Fable's recommendation where there is one. None of these are rules yet.

1. **The headline and eyebrow.** The live site says "AI Product Engineer" and "Designer · Engineer · Founder". He is unsure about "Founder".
2. **The software piece.** There is no 3D piece for software yet.
3. **Where the PC animation goes.**
4. **A new 3D art piece** to replace the sculpture. Recommendation: wait until he has 3D art to show.
5. **Imported models.** The second build wrote every model in code. Recommendation: allow real models (Blender, his own sculpts) wherever they look better.
6. **What the skills rows say.** Recommendation: start from the four competencies on his live site.
7. **Contact.** Recommendation: links, a copy email button and Calendly. No form.
8. **A "how this is made" switch** on the 3D pieces. Recommendation: decide when the pieces are in the page.
9. **The résumé.** A page, or only the download button.
10. **The project page design.**
11. **Which projects show** in each category on the home page.
12. **What ties the bottom of the page together.** Recommendation: the pour ends by feeding the rocket's launch.
13. **The rocket as built.** He has not judged it yet.
14. **Whether the site has to meet Section 508** (WCAG 2.0, levels A and AA). He asked whether the buttons do, out of curiosity. Recommendation: yes, checked as each part is built, because the engineers who read the site will check. The buttons' results are in `LOG.md`.
15. **What makes the pour special.** His words are in The pour, above. Fable's four ideas (Nov 11), none chosen yet:
    - Flecked: fine bright flakes ride inside the metal and flash as they tumble, like the copper flakes in goldstone glass.
    - Sun metal: the surface crawls with bright cells and darker seams, with white hot threads drifting through it, like the surface of the sun. A landing throws up a loop that falls back, not a spray.
    - Mirror: a skin so polished the cursor's light slides along it as a glint, with the glow showing through where the metal is thin.
    - Sparkler: the body stays plain and smooth, and fine branching sparks drift off its whole length, like a Japanese hand sparkler.
    - Recommendation: Sun metal carrying flecks, which is what he described, with the cursor's glint on top. Decide from moving studies side by side, not from words.

## Dropped

- The client work section
- The process section
- The "More rooms" section and the separate room pages
- A featured or flagship card
- Whole brass plates as cards
- The faint channel drawn ahead of the stream
- Water, golden water, lava, light alone and electricity as what the stream is made of. It is molten metal (Nov 11)
- A permanent grid floor
- Skills tied to desk objects, and skills in narrow pillars
- The game board and the orrery
- The sculpture as built
- A gallery with his work on walls
- Figures that light up on scroll
- The "laid back, fun to try" voice
- Three hovers for the buttons: light running round the border, Heat and Pull. He chose Catch (Nov 11)
- The second build's kit, its screenshot gates and its voice rules. None of them apply here.

## Reference

- Live site: https://www.brandonchurchportfolio.com
- Second build: https://github.com/BrandonChurch93/Portfolio-Website-v2 (`main` is the Opus build, `fable/phase-2-layout-water` is the review branch)
- Second build preview: https://portfolio-website-v2-lake.vercel.app
- Colors measured from the portrait: the glow behind him is about `#5a2e00` at its brightest and `#270f00` as it falls off, fading to near black. The second build's brass was `#e6b866`, which is yellower and much paler.
