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

### The stream

- **Where it stands (Nov 12):** the stream's test shot is approved, and he calls it "almost certainly the finalized base" (see "The stream is the finished base" below). It is at `/lab/stream`, with a paused frame at `/lab/stream?hold`. The three small things he asked for after approving it are built, and he has looked: "All my issues have been fixed." The first round's shards are still one switch away: the switch at the foot of that page, or `/lab/stream?shards=first`. Calls Fable made for him while building are listed in `LOG.md` and are his to overturn. None of them is a rule.
- It is the most important thing on the site. "It's probably like the most important thing on the site to get right." (Nov 11)
- It is called the stream, which is his own word for it. It is never called water, in anything written for a model or shown to a visitor. His reason: "if I call it water, then the model is gonna build it as if it acts like water". It is not called the pour either: that was its name while it was going to be molten metal. (Nov 11)

**What it is**

- He picked A, the wave of light: "This was a tough decision, as they are both really good. But I'm gonna go with option A." (Nov 11)
- In exact terms (Fable's restatement, Nov 11): the stream has a core of light that is always there and gives it substance. Many small shards belong to that core: they ride round it and are lit by it. Sparks come off it. Its leading end is its brightest and most active part.
- What he liked in it and what it still needs, in his words (Nov 11):
  - "What I liked about copperleaf was the fact that it was many particles."
  - In its most polished version he pictures "some type of light or fluid or something to make it just seem like it has some substance to it".
  - "I don't want anything to feel like it's 1 million moving parts necessarily. I want there to be like a steady stream or light wave or something", with "a glow behind it" and "particle effects coming off of it".
  - A picture he offered without committing to it: "a line of electricity and at the very end of that line is always like an animated like spark going off and there's sparks going off around it".
  - "I'm thinking of something that has energy and power."
  - Threads was "too much of a solid". Ink "has the same issues": "it's too plain".
- Of the further ideas Fable described (Nov 11): scales would be "too plain", and he does not want bearings or parts. "Prism's, however, sounds really cool. It might actually be better than Copperleaf."
- What he is looking for now, in his words: "less something realistic in terms of what would make sense and more of something abstract that doesn't have a secret meaning that looks really cool with hyper detailed graphics". This is why molten metal was set aside. (Nov 11)

**Where it goes and what it does on the page**

He said these while the stream was still going to be a liquid. They all still hold. Where his words describe a liquid ("bounce off and drip down"), the agreement below says what that means for shards.

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
- What the second build drew inside its pieces (the city's falls, the desk's edge, the rocket's flume) "looks very low quality". The stream replaces all of it. (Nov 11)
- It does not move fast. On the site its speed is "capped at the user scroll rate", and "it should be a smooth experience". He said this when the look study ran at a real falling speed and "everything is just moving too fast". (Nov 11)

**The agreement for the finished version**

- Fable proposed it and he accepted it whole: "I like all your recommendations." (Nov 11)
  - **What it is:** a steady wave of light with many shards riding round it and sparks coming off it. (It said "copper and glass shards" until Nov 12. His verdict below replaced that.) The arc appears only at the leading end and at the landings.
  - **Where it is built:** Claude Code on his Mac, with Fable, because only hardware can show motion.
  - **What gets built:** one test shot, alone on a blank page, on the sketch's route: down, parting on a title, landing on a card, running off its end.
  - **What does not get built:** the route down the whole site, the layout, and anything touching the 3D pieces. Those wait until he says the shot looks incredible.
  - **How he judges it:** two check-ins only. A paused frame first, then the same shot moving.
  - **Carried over from the sketch:** a mix of two kinds of shard, about its density, and speed tied to his scroll.
  - **Better than the sketch:**
    1. Shards are real objects with thickness and facets, in the warm palette only, no rainbow. (Until Nov 12 this also said copper reflects like the buttons and glass bends the core's light. His verdict below replaced that: nobody has to be able to name a material.)
    2. The core is a body of light with depth, not drawn lines.
    3. The stream lights what it passes: the page, and the title and card edges.
    4. The leading end is the hero moment: more energy the faster he scrolls, settling when he stops.
    5. Landings have shape and weight: shards scatter, bounce and spill off the edge.
    6. Motion has weight, never visibly loops, and retracts cleanly when he scrolls back up.
    7. Shards near the cursor flash and turn toward it.
    8. The phone has a stated budget: what it keeps and what it gives up.
  - **The name:** it is called the stream, as he calls it. "The pour" meant molten metal and is retired. It is still never called water.
  - **How the sketch is used:** Claude Code is given the sketch at `/lab/stream-core`, its code, its stills and the log's notes as a working reference and the floor to beat. The finished version is built new, in its own folder, not on top of the sketch. The sketch stays as it is so the two can be opened side by side. "I'm in complete agreement with you." (Nov 11)

**His verdict on the test shot, and what changes (Nov 12)**

Said after the first night's build at `/lab/stream`, with both check-ins live. The second round was built to this the same day and is waiting on his verdict.

- "This is coming together. Awesome. I'm really loving the way it's coming together." And: "I think we nailed this and we build everything else off of this stream."
- The strikes are his favorite part: "when it crashes the ground or in this case the word work, particles actually fly off of them and bounce around like it actually struck the ground, which is awesome. I definitely don't want to lose that effect." In exact terms: shards must still blast off and bounce at a strike. That protects the effect, not the code. He does not want it frozen: "I also don't wanna hinder him from pushing it further."
- Sparks, on scroll and at a strike: "I think they're perfect", "the balance is really good". No changes asked. Improvements are allowed.
- Shards on the straight runs: the number "looks OK". At a strike: "pretty spot on". Where the stream lies along or hooks over an object, such as the top of WORK and its corners, there are too many and they bunch: "it just looks like more on places where the stream is hooking or grabbing a 3-D object". He called it nitpicky and does not want the number cut by much overall.
- The shards stop being copper leaf and glass. "The particles look abstract. There's no way to look at and be like oh yeah that's glass and a copper leaf. Nobody will ever get that." What matters to him: "there's something with substance there in the stream and when it hits the ground, they fly off and bounce around." This replaces the agreement's lines about copper and glass, and the test that a shard must read as one or the other.
- There are still two kinds, a solid one and a clear one, because the contrast between dark and bright gives depth. They are one family of shapes in two materials: "Same family shapes, two materials."
- The shape is facets, with five to eight flat faces, in many sizes. "I like the facets idea, we can go with." He passed over hexagons, thin plates and panes, and chips of the letters.
- The facets' look is the jagged one, as reworked: panel B at `/lab/stream-facets`. "Yes the re-worked jagged was my favorite." Sharp pieces with three or four needle points and flat faces, the larger ones notched, nothing on the surface, the detail only in the light. On size, his words about the first try: "I don't like how some of them are really big", and he likes a range of sizes without the oversized ones. He passed over A, the chunky cut look. The study is a rough sketch of shape only, and he knows it. (Nov 12)
- How that was reached, so it is not repeated: he first wondered aloud about "sharp jagged pieces", and Fable wrote that in as a ruling before he had made one. "I was just making conversation." A question from him is not a ruling.
- He likes the raised lettering of WORK and how the stream plays on it. Once the stream is finished he wants the components and the layout approached again "with this component always in mind". Fable's reading, which he agreed with: every element on the site is a surface that the stream and the cursor light, and nothing else has a glow of its own.

**His verdict on the second round (Nov 12)**

Said after scrolling the second round at `/lab/stream`, with the facets in. The three changes below were built the same day and are waiting on his look.

- "It's really good! And everything honestly looks good." The bunching is "much better". "The actual particles themselves look really good." The facets stay.
- A strike throws a few too many: "on a strike a bit too many particles explodes out". How much to cut: "I feel like 50% is probably too much", "maybe 25% less?" In exact terms: about a quarter fewer shards thrown when a leading end arrives at the title or the card. Nothing else about the strike changes.
- At a landing, while the page is not being scrolled, shards keep flying out. "I do like the periodic piece flying down and bouncing every now and then, but it shouldn't be like a constant stream of things flying out of the stream." In exact terms: at rest a landing throws a single shard now and then, at uneven intervals, never a steady flow.
- A thrown shard keeps its own momentum, and the flow never turns it round. He saw shards thrown left on the card land short, then get carried right across it and off the far end: "a mysterious force pulls them off to the right side". Agreed with Fable (Nov 12): one thrown with enough force clears the near edge and falls, which he likes "a lot". One that lands short skids a little the way it was going, stops, and fades within about a second. One thrown the way the stream runs can still ride along and spill off that end. The same on the title. Nothing heaps up.

**His verdict on the three changes (Nov 12)**

- "Everything is pretty much perfect now across the board minus one thing." At a strike "the density is now perfect and everything looks super realistic, except for the very end of the animation".
- The one thing, in his words: "there's like a sloshing effect". "A lot of the particles are going straight up in the air", and "these ones that go straight up fall straight down, so what happens is after the strike there's this beautiful explosion and then once it ends, there's a bunch of particles that kinda just get pushed off the right side of the card all at once". On WORK the same: after it ends "a bunch of particles get shot out both sides".
- He is not sure of the cause, and says so: "what if it's not the particles going straight up? What if it's the particles that are on the stream that don't get blasted at all." "Once that's finished, there's like this waterfall effect where it just ejects all the particles currently on the stream at that point." "I don't know the cause."
- In exact terms: a strike must be one burst that dies away. After the burst there must be no second wave of shards leaving the ends of the title or the card together. What causes the second wave is not known and has to be found before it is fixed.
- The fix is approved, and with it the stream's test shot: "This looks great to me. If there is any improvements to be made, it'll be very tiny ones, but I think for right now this is good to move on with." The cause turned out to be thrown shards that had come back down being carried off the ends by the flow, not the shards riding the stream. (Nov 12)
- The single shard thrown at rest drops off the far end again. The fix had made it skid, stop and fade like the rest. "Yes, I would like to bring that back." For that one shard only, without bringing the wave back. Built the same day, waiting on his look. (Nov 12)
- Two faults he found looking closely (Nov 12). Their causes were found and fixed the same day, and the fix is waiting on his look (`LOG.md`, top entry):
  - Shards fade out too abruptly. "The particles fade out pretty abruptly. It's not as smooth as I like it to be." He remembers them fading in and out more gently before and is not sure whether that changed.
  - Some shards jump as they appear. "When they fade in, not all of them, but some of them kinda like glitch and teleport for the first moment that they appear, and it looks really bad. Not a smooth, premium experience."
  - In exact terms: every shard arrives and leaves by a smooth fade, and none changes place in the moment it appears.
  - Where it happens, once he had looked again: not on the straight runs, which look "actually amazing". "It only happens around the word work when the stream splits", and "the same thing happens around the card area". There "things disappear and reappear. It's like some of them are always in that state of falling and disconnecting from the stream even outside of the strike".
  - His rule, which settles it: "Everything should stay a part of the stream unless there is a strike, of course not counting that one single particle that should blast off every few seconds." In exact terms: where the stream lies on the title or the card, a riding shard stays with the stream exactly as it does on a straight run. It does not vanish, reappear, fall or drift off. Only a strike, and the one shard thrown at rest, take shards off the stream.
- Found and fixed the same day, and waiting on his look (`LOG.md`, top entry). The cause, by measurement: thrown shards that had come back down onto the surface were being carried along it by the flow and off its ends together. The shards riding the stream were not part of it. The flow no longer moves a thrown shard at all.
- A note on the line above that says one thrown the way the stream runs "can still ride along and spill off that end": since this fix it spills off that end only if its own momentum takes it there. That is how Fable fixed the fault, not a ruling of his, and it is his to overturn.

**The stream is the finished base (Nov 12)**

- After the fix for shards vanishing and jumping on objects, and the lone shard dropping off the end again: "This looks great! All my issues have been fixed." "This is almost certainly the finalized base with pretty much all the polish."
- It may still be tweaked: "we might have to tweak it slightly to accommodate some of the new ideas I already have in my head for the upcoming sections". He is ready to move on.
- Riding shards now go faster where there are fewer of them: on an object, down the stem above the title, and where the stream strikes. Claude Code flagged that as his to overturn. He saw it and raised no objection.

**How it is built**

He added these while the stream was a simulated liquid. They hold for anything in the stream that is simulated: shards thrown loose, sparks.

- The simulation is stepped from the one clock (`src/world/clock.ts`) with a fixed timestep and a seed, so any frame can be frozen and shot again exactly. Each new pour takes a new seed, so no two splashes match. (Nov 11)
- A particle budget is set for his Mac and for a phone before building, and what the phone gives up is said out loud. The phone view is checked as the work goes, not at the end. (Nov 11)

**How it got here**

Kept so nobody walks the same road twice. Nothing in this list is a rule now.

- A stream of molten metal runs down the whole site. "I agree molten metal is the way to go." (Nov 11)
- It is called the pour. The name is Fable's and he has not objected. It is never called water, in anything written for a model or shown to a visitor. His reason: "if I call it water, then the model is gonna build it as if it acts like water". (Nov 11)
- It is the site's own copper, melted: it glows in the palette's light colors, ember to flame to hot to pale. It looks like a foundry pour: bright, clean and quick, throwing sparks and beads. It never looks like lava (dark, crusted, slow), fire (flames) or water (thin, clear). (Fable's recommendation, which he agreed to, Nov 11)
- The first thing built is one test shot, alone on a blank page: it falls, hits a ledge, splashes, runs along the ledge and drips off the end. Nothing is built around the pour until he says that shot looks incredible. `QUALITY.md` says what the shot has to show. (Fable's proposal, Nov 11. He went ahead on it without objecting.)
- How the test shot is built, which he said "Go" to (Nov 11): a real particle fluid simulated side on in the flat plane of the page, with gravity, cohesion and adhesion. Only the route is planned. The particles are merged into one rounded body and lit per pixel. Each particle carries a temperature that sets its color on the palette. Its glow lights the ledge and the page, and the ledge keeps a fading heat mark. The test page has two controls: pour again, and slow motion.
- His verdict on the first test shot (Nov 11). The material is still liquid metal: "the idea here that we're going with is liquid metal". What he saw was not it:
  - "I definitely don't like how it puddles."
  - "The mainstream is blasted back multiple times due to this puddling", and from "the way the particles can bounce backwards and hit the stream, pushing it back".
  - "Instead of looking like a refined beautiful hot liquid metal, this looks more like mud splashing around and puddling up."
- In exact terms: the metal must not heap up where it lands, nothing it throws may knock the falling stream off its line, and the whole of it has to read as refined, not as a mess. (Fable's restatement, Nov 11)
- He wants something special about the stream itself. "Think like how plasma looks that liquid metal color, but with shiny stuff all in it, or maybe something else. I'm open to options." (Nov 11)
- His verdict on the three looks at `/lab/pour-looks` (Nov 11): "I think the best looking one is A, but if being honest it's still about a 5.5/10." And: "Maybe the Liquid Metal isn't the right direction."
- He asked for nothing more to be built until he had talked it through. He then asked for sketches twice (the next lines). (Nov 11)
- Three rough sketches of abstract ideas are at `/lab/stream-ideas`: Threads, Copper leaf and Ink. He asked for them rough: "they don't have to be super high res. I just need to get a general idea. Once I choose a general idea, we can work really hard in building that one out really well." (Nov 11)
- He picked Copper leaf: "I already know I wanna go with the middle option." (Nov 11)
- He asked to see a core of light with shards two ways: "I'd like to see your recommendation. and then I'd like to see the same thing, but instead of the smooth light, can we go with the arc? I like to compare the two." And: "let's keep it simple for now, and the next iteration will go ultra high quality." Both are at `/lab/stream-core`. (Nov 11)
- Before the finished version is built: "I think we need a plan and a concise agreement before we do the handoff to Claude to build it." (Nov 11)

### Hero

- The floating future city: a made up city, a spire at the center, parks, a Star Trek feel. The model from the second build is kept.
- The city sits along the bottom of the screen with the text above it. The model never goes behind the text.
- The opening uses the whole screen with nothing cut off at the top or bottom. The city builds itself in the middle, then moves down as the text comes in.
- At rest the text sits about a third of the way down. On a desktop it is fine if half the city or a little more shows.
- He wants camera movement and a real moment of awe.
- No PC parts in the hero.

- The opening animation as carried from the second build is "five out of 10 at best" and "definitely needs to be redone". The city itself "looks good" and "could still use some work". The city gets revisited anyway so it ties in with the stream. (Nov 12)
- An idea to revisit with the hero, not decided: his first thought was the city breaking apart into the stream as the visitor scrolls. Fable's twist, which he asked to have noted: building, not breaking. The city assembles out of the stream's facets in the opening, and the stream carries the same pieces on down the page. (Nov 12)

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
- He and Fable are free to change course: "me and you have the freedom to pivot and recommend new things". When Fable recommends something that goes against a rule agreed here, it is laid out plainly in the chat, in bold, naming the rule: "they need to be explicitly laid out here in the chat maybe even bold so I make sure I see them". The rule stands until he changes it. Claude Code builds to the rules as written: "Claude code is our executioner." (Nov 12)
- Before the full build of the page there is a final pass over what is already approved, because the stream may change it: "now that we have the stream in place, I may want to update things we've already talked about like the buttons". (Nov 12)
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
12. **What ties the bottom of the page together.** Recommendation: the stream ends by feeding the rocket's launch.
13. **The rocket as built.** He has not judged it yet.
14. **Whether the site has to meet Section 508** (WCAG 2.0, levels A and AA). He asked whether the buttons do, out of curiosity. Recommendation: yes, checked as each part is built, because the engineers who read the site will check. The buttons' results are in `LOG.md`.

15. **His ideas for the sections, now that the stream exists.** Rough drafts in his words, none decided: "This is just stuff I'm thinking of, it might not look good." (Nov 12)
    - Work: the stream "hits work and then splits and then it goes down each of the sides and then it hits the side of the project cards as they load in so it's timed perfectly", "going down each side, symmetrical framing".
    - The 3D pieces: "it'd be really cool if the stream hits that section of the screen, and then the actual art comes into life from that like it's the catalyst and the animation opens and closes for that 3-D object based on the stream's positioning".
    - The look of the site updated to work with the stream, "like the card we just used in the demo". "I love how the stream hit it." "We also need to exactly figure out what the cards will look like."
    - The stream as the reason things arrive: "I feel like the stream could be used to give life to each of the page and play part onto why these sections and potentially some of the individual components are coming on screen."
    - A wilder idea he is less keen on: 3D objects in the background, such as a shelf, for the stream to bounce off. He sees that it would need the whole site to "feel coherently 3-D and part of the same world", which could mean "revisiting pretty much everything that's locked in".
    - **Work, drawn three ways as wireframes** at `/lab/work-draft` (Study 09), waiting on his pick. A · Frame is his idea as he described it. B · Steps is his idea with the right column half a row lower and the stream landing on each card. C · Middle is one stream winding down between the columns. Where each one meets the settled rules:
        - A runs straight down both sides for the whole section, against "It never runs straight down", and draws a box round the section, against the quality bar's "nothing boxed".
        - B breaks no rule about where the stream goes.
        - C changes "hit the work title dead center, split, and run down both sides": the two sides close again under the title. It leans on "It can run through the middle of a section to make a layout that breaks the usual pattern".
        - All three touch every card, which sits against "It also should not touch everything". If he picks one, he rules on that too.
        - Fable recommended C.
        - His lean after scrolling them (Nov 12): "I think my favorites are one and two." That is A and B, the two that keep both sides. He has not picked between them, and C is not his lean. Not decided.
        - His worry about both: the section takes up a lot of the screen, so a visitor among the cards "will have to scroll up pretty significantly to take a look at the categories". He wondered about "reducing the cards" and is not sure how to fix it. In exact terms: the category row is far above the lower cards, and getting back to it is a long scroll. Being talked through, nothing agreed.
        - Still no pick (Nov 12): "It's still hard for me to choose between the two." He wants the look of the section settled further first. The category row in the draft is "really squished at the top" and "I don't really love the way that looks". On pinning the categories: "I don't know how I feel about an overlay of the categories going on top of the cards", unless they pin to the top into a nav bar. He asked what the standards are and what would look best. Whether the site has a top bar at all is not in this brief yet.
        - **The draft's second round (Nov 12), drawn for him to judge. None of it is a ruling.** He turned Fable up to build it after Fable recommended it. He has not said yes to any part. At `/lab/work-draft`, with A and B in the switch:
            - The stream hooks over WORK alone, as in the test shot. The categories are a bar of their own below it, with room, each a full tap target.
            - Fable's call, his to overturn: the stream lands on the category bar, runs off its ends and goes on to the cards, so the bar wakes the way a card does. That is two more things touched, which leans further against "It also should not touch everything".
            - A slim top bar, hidden while the hero is on screen. Once the category bar has scrolled off the top, the four categories show in the top bar beside the section's name, and leave when Work is left. Tapping one there swaps the cards and brings the first row back. Nothing floats over the cards. The top bar is new to this brief, and what else lives in it is not being decided here.
            - Four cards to a category, which the brief already allows.
            - C is out of the switch, since it is not his lean, and still opens with `?v=c`.
        - **His sketch of how the stream meets the cards (Nov 12).** He drew it and said: "I think the first row is good how it hits the top and kind of rolls off the side, but the second row I kind of want it to weave out and then come in and hit the middle of the two cards." And: "Don't take it too literal."
            - In exact terms, from the drawing: on the first row nothing changes. The stream lands on top of the card near its outer corner and rolls off the side. From there it does not stay against the card. It swings out wide, widest about where the two rows meet, then comes back in on a slant and strikes the outer side of the second row's card about halfway down, and leaves outward again. Both sides do the same, mirrored.
            - Built the same day at `/lab/work-draft`, as he drew it: **S · Your sketch**, on straight rows with the two sides mirrored, so the cards wake in pairs. B · Steps has the same second row with its right column half a row lower. His drawing had straight rows, and that may be the drawing tool's mirror and not a choice, so both are there to compare. It is not a ruling on straight rows.
            - Not taken from the drawing: there the stream runs off the bottom corners. In the draft it comes back in to the View all work button.
            - S takes A's straight rows and B's landings, and it breaks no rule about where the stream goes. Fable recommends it. Not decided.
16. **The order the sections are worked in.** He wants them taken one at a time: "my idea should go section by section". Work is first: he asked for its rough draft ("I would love to see a rough draft", Nov 12). The order of the rest is not agreed. Fable's list is in `LOG.md`.

## Dropped

- Shards that have to read as copper leaf and as glass. They are abstract facets in a solid and a clear material (Nov 12)
- Hexagons, thin plates and panes, and chips of the letters as the shape of the shards. He picked facets (Nov 12)
- Chunky cut facets with detail on their surface. He picked the jagged look (Nov 12)
- The client work section
- The process section
- The "More rooms" section and the separate room pages
- A featured or flagship card
- Whole brass plates as cards
- The faint channel drawn ahead of the stream
- Molten metal as what the stream is made of. Agreed and then set aside for a core of light with shards (Nov 11)
- Water, golden water and lava as what the stream is made of (Nov 11). Light and electricity were dropped the same day and came back when he asked to see a core of light and an arc
- Threads and Ink as what the stream is. He picked Copper leaf (Nov 11)
- Scales, bearings and parts as what the stream is (Nov 11)
- An arc as the whole core of the stream. He picked the wave of light. The arc stays where A has it, at the leading end (Nov 11)
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
