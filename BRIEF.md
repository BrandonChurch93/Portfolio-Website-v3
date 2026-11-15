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

- **Where it stands (Nov 13):** the stream through Work is built at `/lab/work`, and he has looked ("His first look at the build", below). The second pass on that page is agreed and built: the real card, the Sun stones and the Blades ("The second pass on the Work page", below). He has looked ("His look at the second pass", below): the stones' faces light, there is no bar over WORK, the View all work button moves, and phones wait for one pass at the end. Its account, with every call made for him, is in `LOG.md`, "The second pass on the Work page, built". Those three changes are built, and so is what the stream does when the category changes ("When the category changes", below, with its account in `LOG.md`, "The surge when the category changes, built"). He has seen neither. What was at the bar in the first build and what was not, and every call Fable made for him while building it, are in `LOG.md`, "The stream through Work, built at `/lab/work`". None of those calls is a rule. The stream's test shot is approved, and he calls it "almost certainly the finalized base" (see "The stream is the finished base" below). It is at `/lab/stream`, with a paused frame at `/lab/stream?hold`. The three small things he asked for after approving it are built, and he has looked: "All my issues have been fixed." The first round's shards are still one switch away: the switch at the foot of that page, or `/lab/stream?shards=first`. Calls Fable made for him while building are listed in `LOG.md` and are his to overturn. None of them is a rule. **Latest (Nov 13):** the third pass is built and he has looked. The fourth pass is agreed ("The fourth pass on the Work page", below) and goes to Claude Code as one round.
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
    - Work is the agreed exception (Nov 12). There the stream meets the title, the category bar, every card, both posts, the rail and the button. The rule still holds for the rest of the site.
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

**The stream through Work: the agreement for the build (Nov 12)**

Worked out in a wireframe at `/lab/work-draft` over the day. How it got there is in Open 15 and in `LOG.md`. What is settled is here.

- He agreed to the plan and to the list of rulings it needed: "Yeah, I think that plan is pretty solid." The six lines marked **His ruling** below are that list.
- **The order of the work.** The stream's route through Work is built first, in Claude Code on his Mac, with the test shot's plain card standing in for all four cards. The card's look is designed in the web chat alongside. Then the real card is dropped into the built page and he judges the two together. His question was whether to settle the card first. The reasons for this order: the stream only needs to know where each card is, and plans its route from those boxes, so a new card costs no stream work. The card's main job is how it takes the stream's light, which can only be judged once the stream is hitting it.
- **Why it has to be built to be judged.** Of the posts in the wireframe: "Yeah, this looks good." Of the rail: "Looks good in theory but I would need to see it actual rendered using our actual assets to be sure."
- **His condition.** "We need to make sure the streams look organic and not forced." Of the turn the rail replaces: it was "happening for pretty much no reason". And: "I don't mind it if the stream's actually like move naturally and kind of switch directions." In exact terms: every turn the stream makes has a cause that can be seen. It lands on something, something turns it, it runs downhill, or it is carried by the way it was already going.

**The section, top to bottom**

- The title, WORK, centered, with the raised lettering of the test shot.
- The category bar, a bar of its own below the title: Software, Games, 3D art, Photography. It is wider than the title and narrower than the grid.
- **His ruling:** four cards, in two straight rows of two, both sides mirrored, as in his sketch.
- **His ruling:** a post beside each side of the grid, level with the foot of the first row. The posts are copper studs in the buttons' metal, seen end on.
- **His ruling:** a rail under the grid, in the same metal, sloping down from each side to the middle.
- The View all work button, at the rail's low point.

**The route, the same on both sides, mirrored**

1. The stream comes down the middle, strikes WORK dead center and parts. Each side runs along the top of the title and hooks over its end, as in the test shot.
2. **His ruling:** it drops onto the category bar, runs out along its top and off its end.
3. It falls onto the top of the first row's card, toward the card's outer end, runs out along the top and is thrown off the end. "I think the first row is good how it hits the top and kind of rolls off the side."
4. It falls in a bow, meets the post, and the post turns it in.
5. It strikes the outer side of the second row's card about halfway down and leaves outward. "The second row I kind of want it to weave out and then come in and hit the middle of the two cards."
6. It falls onto the high end of the rail and runs downhill along it.
7. The two sides meet at the button. One stream goes on down from there.

- **His ruling:** this is the exception to "It also should not touch everything."

**What gets built**

- One page, `/lab/work`, that he can scroll: the section above with the real stream on this route, on a desktop and on an iPad.
- The posts and the rail as real objects with form and detail, lit by the stream and by the cursor's light. `QUALITY.md` fails a plain cylinder or bar.
- Stand ins, said plainly on the page or in the report: the test shot's card four times, a category bar in the same plate as that card, and one of the approved buttons.

**What does not get built**

- The card's real look. It is being designed in the web chat.
- **His ruling:** the top bar and the categories docking into it. They are not part of the stream and stay out of this build. Not ruled on yet (Open 17).
- The phone's route. One column has not been designed (Open 18).
- Six cards, the hero above, Skills below, or the route down the rest of the page.

**Built (Nov 12), waiting on his look**

- At `/lab/work`, by Claude Code on his Mac. The test shot at `/lab/stream` was photographed before any shared code was touched and after: 20 frozen frames agree pixel for pixel.
- He has not seen it. Nothing about it is settled until he says so.

**What stays exactly as approved**

- Everything in the stream he has approved: the core, the facets, the sparks, how many shards a strike throws, the single shard at rest, thrown shards keeping their momentum, no second wave, riding shards staying with the stream on objects, and a speed no faster than the scroll.
- The test shot at `/lab/stream`. It draws what it draws today.

**Fable's calls in this agreement. He has not ruled on them and can overturn any**

- A contact is as strong as the arrival. Falling onto a card is a full strike. Meeting the post, landing on the rail and landing on the category bar are lighter. So the section reads as one stream meeting things in turn, not as a string of equal bursts.
- Where the two sides meet at the button there is one small strike.
- The two sides match in route and never in detail, as two strikes never match.
- On a screen too narrow for two columns the page does the least: the stream parts on the title, lands on the category bar and falls past the single column on both sides. That is a stand in, not a design.
- No check-ins on the way. Claude Code works until there is a page he can scroll, as it did for the second round of the test shot.

**His first look at the build at `/lab/work` (Nov 12). Being talked through, nothing agreed yet**

- The screws: "they're just kind of not positioned coherently with one another". The post on the left "looks really good" and "I'd like the one on the right to mirror it so it's symmetrical". The ones at the foot "are just all over the place. We need to give them symmetry as well." In exact terms: the slots in the two posts and the four studs on the rails point in unrelated directions. The right side should be the mirror of the left.
- The top: "how many collisions there are at the top so close together. You barely scroll and it all just kind of happens." "This isn't an issue of everything being too close together, or at least I don't think it is. The spacing looks fine. It's just it's a lot happening all at once." And: "so many turns in a short a period of time". In exact terms: the strike on the title, the two landings on the category bar and the two on the first row all come within about 360 px of scroll, with six turns on each side.
- He also named "the stream being so close to the word work".
- He asked for Fable's honest thoughts and for no changes. Fable's answer: the landing on the category bar was Fable's own call and is the one to take out. Not agreed.
- **He took the worry about the top back (Nov 12).** "Upon further review, I actually don't mind there's so many strikes at the top because when you do it, it makes a ton of particle effects that fall all over the section, making it feel 3D. It actually looks really good." So the landing on the category bar stays, and Fable's answer above is withdrawn.
- What he does not love there: "how much of the word work is fighting for your attention". An idea, not a ruling: "I wonder if putting like a metal bar on top of it or something, maybe even one below it as well for symmetry, would look good. I'm not 100% sure."
- The strike on the second row: "It doesn't feel powerful enough. It feels like a graze." He wants it improved. The cause is not confirmed.
- The posts and the rails: "I also don't mind the 2 objects that the stream bounces off of and the 2 rails, but I wonder if we could derby some new designs and see if maybe there are some better options that would look cooler." A derby of designs is wanted.
- **The derby is at `/lab/work-objects` (Study 10), waiting on his pick.** He kept Fable on high for it: "I think that is enough effort right now for a derby of this scale." For the turning object: 1 · Knob, which is what is on the page now, redrawn. 2 · Wheel, a flywheel with a pierced web and a nut. 3 · Facet, a cut stud in a bezel. For the rail: 1 · Bar, as now. 2 · Truss, an open girder. 3 · Channel, slotted, with the stream inside it. They are drawn larger than on the page, and the stream beside them is a stand in.
- **His verdict on the derby (Nov 12):** "I didn't necessarily love any of these."
    - The rail: "the one we have now is my favorite because of its form factor". What he does not love is "the two knobs", which would "be so much cooler if they were something else".
    - What he is after, in his words: "I think you're looking at like contractual type assets. Where I'm thinking more like statues and art." Fable reads "contractual" as construction: hardware and fittings.
    - An idea, not a ruling: "Think like an ancient Egypt's styled head, or like a gargoyle head, or something cool like that's what I'm envisioning." If heads: where the posts are now they face the visitor, and "when the light hits them, their mouth and eyes turn red or something". On the rails "the faces should be on the side looking each direction". And: "Not saying I wanna go with the faces, I'm just thinking about something a lot cooler than what we have right now."
    - In exact terms: the rail's bar stays as it is. The posts and the rail's end pieces stop being hardware and become small sculptures. What they depict is not decided.
- **The city is not a reason to choose a style (Nov 12).** Fable suggested Art Deco because it would sit with the hero's city of the future. His answer: "I don't think we should consider the city. Yes we spent the time to build it but it's not like it's a masterpiece that we're building the whole site off of. That's the stream. The city is going to need a massive overhaul and the current version will probably just be shown as a draft anyways." So what goes with the stream decides, not the city.
- **A second derby, of statues, is at `/lab/work-guardians` (Study 11), waiting on his pick.** He asked for it: "I would love to see another derby." Three families, each as a mask facing out where a post stands and as a pair of heads in profile at the ends of the rail, looking outward, with eyes and mouths that light when the stream is on: 1 · Pharaoh. 2 · Gargoyle. 3 · Sun stone, a carved disc with a face at its center, and feathered serpents on the rail. They are rough reliefs written in code, drawn larger than on the page. The real ones would need real sculpts, which is Open 5.
- **His pick (Nov 12): the Sun stone, for the posts.** "By far the best one here is the Sunstone! I actually really like it though I'd hope it would be much better quality in the finalized version?" In exact terms: each post becomes a carved disc with a face at its center, ringed by tabs, glyphs and rays. What he picked is the direction. The derby's sketch is not the finished object, and the finished one is judged on the real page before it is approved.
- **No heads on the rail (Nov 12).** "As far as the poles go I don't really love any of those, none of them look good. Maybe because we're doing the faces in place of knobs the poles don't have to have heads on them." Fable reads "poles" as the rails. In exact terms: the rail keeps its bar, loses its two knobs, and does not get heads. What finishes its ends is not decided.
- **The stone's face lighting (Nov 12):** "Yes, I'm open to the lit face, but I'm curious to see it in action." So it is built on the real page for him to judge, and "Figures that light up on scroll" stays on the Dropped list until he has seen it and says so.
- **The rail's ends want decoration (Nov 12).** Fable offered a plain cap or a clean end. "I'm still hesitant to do that. I still feel like they need some type of decoration on them. Think of like a super fancy high-end curtain rod, how it has like the things on each side. Maybe something like that would work?" Those are finials. A derby of three is at `/lab/work-finials` (Study 12), waiting on his pick: 1 · Blade, a leaf shaped blade with a ridge, like a shard. 2 · Orb, a ball with a carved band and a point. 3 · Steps, square tiers like a stepped temple. Each meets the bar with the same collar. Rough, and larger than on the page.
- **Blade or Steps (Nov 12).** The Orb is out. "Could you actually put the sun stones next to the blades and the steps. I'm trying to figure out between those two. Standalone, I think the blades look the best, but you may have a point that the steps may actually look better with the Sunstone." Both are beside the stone at `/lab/work-pairing` (Study 13), each large and at the size it has on the page, waiting on his pick. Fable's read once they were side by side, not a ruling: the Blade. At the page's size the Steps read as the thread of a bolt, and Fable's earlier point that the Steps suit the stone better did not hold up.
- **His pick (Nov 12): the Blade**, for the ends of the rail. "I like the blade the best."
- **The Sun stone a little larger (Nov 12).** "I also would like to increase the size of the Sunstone, maybe just a simple 10 or 20%, to show off the beautiful detail on it. I think it would go a long way. Of course you wouldn't want to compromise the layout or the spacing between the stream and the cards. I wouldn't want it any closer." In exact terms: each stone is 10 to 20% wider than the post is now on `/lab/work`. The stream stays as far from the cards as it is today, and the layout does not change. The stream passes between the post and the card and touches the post's inner side, so the stone keeps that point of contact and grows away from the cards. Not settled: where the room comes from on an iPad, where the posts are already about 34 px from the screen's edge.

**The second pass on the Work page: the agreement for the build (Nov 13)**

- He asked for it: "Let's go ahead and write up the handoff document so this can be built into the current working work page." It was always going to be one pass: "We can update that next pass in Claude Code as well with these other updates." (Nov 12)
- It is built in Claude Code on his Mac, on the page that is there now, `/lab/work`. Everything in it has his word behind it somewhere above. This part gathers it into one list, and says which lines are his rulings, which are Fable's calls, and which are built only for him to judge.
- `QUALITY.md`, "The second pass on the Work page", is the test it has to pass.

**What gets built**

1. **The real card in place of the four stand ins.** `WorkCard` as he picked it (Cards and buttons, "His picks from the third round"): the data plate, the picture resting in bronze, the foot row, the fade, 3 degrees, leaning away, 1.5 percent, the deep edge. The four projects in `src/content/work.ts`, with the pictures that are there now.
2. **The stream meeting the real card.** Everything the stream does to the stand in, it does to the real card. It lands on the first row's card and runs out along its top. It strikes the side of the second row's card. It lights the rim and the face from where it is. What it throws bounces off the card. The card throws its shadow across the page in the stream's light. "It will light up the card and the card will react to it in certain ways."
3. **The Sun stone in place of each post.** A carved disc with a face at its center, ringed by tabs, glyphs and rays. Made new, at full quality: "I'd hope it would be much better quality in the finalized version". 10 to 20 percent wider than the post is today. It keeps the point where the stream touches it and grows away from the cards.
4. **The stone's face lighting, for him to judge.** Its eyes and mouth are dark until the stream reaches the stone, lit in the stream's colors while the stream is on it, and dark again once it has drawn back. A switch on the page turns it off, so he can see the stone both ways.
5. **Blade finials on the rail.** The rail keeps its bar and loses its studs.
6. **The right side is the mirror of the left**: the stones, and the ends of the rail.
7. **A real strike on the second row.** "It doesn't feel powerful enough. It feels like a graze." What makes it a graze is found by measurement first and said in the report. Then it is fixed.
8. **Room on an iPad held sideways.** The first build was the desktop squeezed, with the posts about 34 px from the screen's edge.
9. **A bar over WORK, behind a switch that is off when the page opens**, for him to compare with and without. His idea, not his ruling: "I wonder if putting like a metal bar on top of it or something".
10. **The frame rate with real cards on the page.** Measured, the cause found and said, and fixed. He saw it drop on `/lab/work-cards`.

**What does not get built**

- The phone's route, an iPad held upright, and any screen too narrow for two cards (Open 18). They keep the one column stand in the page has today.
- The top bar and the categories docking into it (Open 17).
- The category bar changing what the cards show. It stays a stand in, and the four cards are the Software four.
- A project's own page. "Case study" goes to that project's page on his live site for now.
- New pictures, and loops. He is retaking them. The card can already play a loop, and none exists.
- A second bar under WORK.
- Any light on the page that comes from the cursor.
- Six cards, the hero above, Skills below, or the route down the rest of the page.

**What stays exactly as approved**

- Everything in the stream he has approved, as listed under "The stream through Work".
- The route through Work: its stops and their order. The strikes at the top stay: "It actually looks really good." The landing on the category bar stays.
- The stream comes no closer to the cards than it is today. "I wouldn't want it any closer."
- The rail's bar: "the one we have now is my favorite because of its form factor".
- The card: its layout, its band, its foot row, the toned picture, his five picks and the words from his live site.
- The test shot at `/lab/stream` draws what it draws today. The approved buttons draw what they draw today wherever the stream is not on them.

**Built only for him to judge. Neither is a rule until he says**

- The stone's lit face. "Figures that light up on scroll" is in Dropped, and it stays there until he has seen this and says so. "I'm open to the lit face, but I'm curious to see it in action."
- The bar over WORK. With it on, the stream strikes the bar and not the word, which changes "hit the work title dead center, split, and run down both sides". That line stands. The bar is a switch for him to look at.

**Fable's calls in this agreement. He has not ruled on them and can overturn any**

1. The stone starts 15 percent wider, tuned by eye within his 10 to 20.
2. The stone is carved metal, the copper the posts are in now. What he picked in the derby was drawn in that metal.
3. The stone's glyphs are abstract. Glyphs of his own, one for each kind of work he does, was an idea put to him and not agreed.
4. Where the stone's room comes from: the page's outer margin first. Where that is already tight, the grid gives up the width. Never the space between the stream and the cards.
5. Two Blades, not four: one on each outer, high end of the rail, pointing outward, as on a curtain rod. The low ends beside the button are where the stream leaves the rail, and they finish with the finial's collar and no blade.
6. What carries the rail, now the studs are gone, is designed in the Blade's family so the bar does not float. Not a stud with a slot.
7. The Blade is sized against the stone, not against the bar, so the stone stays the larger thing on every screen.
8. What a full strike does to a card: the rim flares where it is struck, and the picture warms toward its own colors and settles back to bronze within about a second. He approved the second half with the card's proposal, whose line for it was: "The stream's strike lights the lip and warms the picture for a moment."
9. A card's shadow in the stream's light is the shadow he was open to: "a bigger box shadow behind it that will appear when the light source hits it". Nothing is added to make one where there is no light.
10. Two columns only where each card is at least 340 px wide, with the stream's room and the margin kept. Under that the page is the one column stand in. Today the change is at 720 px. It moves up, so an iPad held upright gets the stand in until Open 18 is designed.
11. On an iPad held sideways nothing stands nearer the screen's edge than 48 px.
12. The bar over WORK is the rail's own bar, level, a little wider than the word, with a Blade at each end. The stream strikes it dead center, parts, runs out along it and hooks over its ends. The word sits under it and is lit from above.
13. No bar under WORK. With the category bar just below, it would make three bars in a stack.
14. The section's spacing is set again for the taller card. As picked, a card is 510 px tall at 460 wide, against the stand in's 383.
15. The link reads "Case study".
16. No check-ins on the way. Claude Code works until there is a page he can scroll, as it did for the first build.

**Built (Nov 13), waiting on his look**

- At `/lab/work`, by Claude Code on his Mac. The test shot at `/lab/stream` and the approved buttons were photographed before any shared code was touched and after: 20 frozen frames of the test shot and 7 stills of the buttons agree pixel for pixel.
- He has not seen it. Nothing about it is settled until he says so. The two things built only for him to judge are each behind a switch on the page: the stones' lit faces, and the bar over WORK.
- Found while measuring, and his to rule on: "Case study" in its resting color falls to about 3.6 to 1 against the card's face when the cursor's own light pools behind it. That is the card as he picked it, on `/lab/work-cards` too, and not the stream. It was not changed. Fable recommends a lighter resting color for those two words.

**His look at the second pass (Nov 13)**

Said after scrolling it at `/lab/work`, as feedback for Claude Code. One word of his message came through garbled and is marked.

- **The stones' faces light.** "The stone faces light on looks good." In exact terms: the eyes and mouth of each Sun stone light when the stream reaches it, as built. This is the one exception to "Figures that light up on scroll" in Dropped. The switch can come off the page.
- **No bar over WORK.** "I don't want the bar above work." It is in Dropped. The stream strikes the word, as it always has.
- **The View all work button sits off center.** "I also think we should reposition the view all button. It looks like raising it up slightly or lowering the bars some would make it look more centered." In exact terms: the button stands in the pocket between the foot of the second row of cards and the V the two halves of the rail make. Today it sits low in that pocket, close over the place where the two sides of the stream meet, with much more room above it than below. It should read as centered there, by raising the button a little, by lowering the rail a little, or both.
- **A phone needs major work, and that work waits.** "One thing that needs major work is the layout and experience on mobile. The category selection for one is really bad looks, and the 2 streams do not re-intersect. Were we intentionally holding off on mobile to see what the entire [garbled: Fable reads it as layout] would look like as a whole first? That may actually be a better plan. Let's add that to the documentation to do a mobile pass when we are finished with all the sections." His ruling is under How we work, "The mobile pass".
- **Not said yet, so not settled:** the card with the stream on it. The second row's strike. The stone as an object, the Blade and what carries the rail, which the build's own account puts short of the bar. "Case study" at rest falling to about 3.6 to 1 when the cursor's light pools behind it. The calls Claude Code made for him.

**The three changes from that look, built (Nov 13)**

- On `/lab/work`, by Claude Code on his Mac. He has not seen them.
- The stones' faces light whenever the stream has reached them. The switch is gone from the page, and so is the code behind it.
- The bar over WORK is out of the page, the route and the stream's drawing.
- The View all work button is raised into the middle of the pocket between the foot of the second row and the V of the rail. The rail was not moved. That it reads as centered is Fable's eye, and his to overturn.

**When the category changes: the agreement for the build (Nov 13)**

- How it got here is in Open 20. He asked how the stream should answer a change of category, "something very realistic with its physics". Fable proposed a surge. He tried it as a wireframe at `/lab/work-surge` and picked: "I like it, let's go with surge and medium."
- In exact terms: A · Surge, taking 0.7 seconds from the bar to the button. He passed over B · All at once, and the lengths of 0.45 and 1.1 seconds.
- **His pick changes how one settled line is read.** "Its speed is capped at the user scroll rate" was said of the stream running down the page. The surge runs faster than the scroll, he was told so in bold, and he picked it after watching it. So the cap holds for the leading end, and a surge through a stream that is already there is the exception.
- It is built in Claude Code on his Mac, on `/lab/work`. The wireframe settled the order and the length and nothing else. `QUALITY.md`, "When the category changes", is the test.

**The law**

- The stream reacts only where it is. Whenever what it lies on changes, it has to land again.

**What happens, in order**

1. **The press.** Picking a category knocks the bar. The stream jumps where it rests on the bar, which is at the bar's two ends, the end nearer the press first and harder. A light contact, as the bar's always is.
2. **The surge.** From each end a swell of light and a kink in the line run down that side at a steady speed, reaching the meeting under the button 0.7 seconds later.
3. **Each stop answers as the front passes it.** The first row's card lets go. The stone's face flares. The second row's card lets go. A light burst on the rail. A small strike where the two sides meet, and the button takes the light.
4. **A card's change.** The old card drops away and is gone. The new card comes up from below, under the stream, and the stream strikes it the moment it seats: on its top in the first row, on its side in the second. It is the same strike the scroll makes, with the rim flaring and the picture warming to its own colors and settling back to bronze.
5. **Between the two cards** the stream has nothing under it. It sags where the card was and springs back at the strike. It is never left hanging in the air or cut.
6. **Where the new cards are a different height,** the stream below settles onto its new line with weight.

**What gets built**

- The category bar working: picking a category changes the four cards.
- The six steps above, on the real stream, with the real cards.
- Stand in cards for Games, 3D art and Photography, said to be stand ins on the page. At least one set is a different height from Software's, so the settle can be judged.

**What does not get built**

- Real projects for the other three categories.
- The look of the category bar. It stays the stand in it is.
- The top bar and the categories docking into it (Open 17).
- A phone, or any screen under 1100 px. There the cards change and nothing else is asked for (How we work, "The mobile pass").
- The All work page.

**What stays exactly as approved**

- Everything in the stream he has approved. Riding shards stay with the stream: only the strikes throw any. Thrown shards keep their momentum. There is no second wave.
- A card is always readable. Its new words can be read as soon as it seats.
- The card as he picked it, and what it does under the pointer.
- `/lab/stream` and the approved buttons draw what they draw today.

**Fable's calls in this agreement. He has not ruled on them and can overturn any**

1. A card's change does not stretch with the surge. In the wireframe the old card is gone in 0.09 s and the stream strikes the new one 0.18 s after the old one let go. Those are where to start, tuned by eye.
2. The old card drops about 16 px as it goes, and the new one rises about 26.
3. A surge's strike on a card is as strong as the scroll's strike at an ordinary pace. The lighter contacts keep their strengths against it.
4. The surge also runs up from the bar toward WORK and dies before it reaches the word.
5. The surge goes only as far as the stream has. Cards the stream has not reached change quietly, with no strike. If the stream has not reached the bar, nothing plays.
6. A second press cuts in: every card goes straight to the newest category, and nothing queues.
7. With reduced motion the cards change and nothing else moves.
8. A press from the keyboard is the same press. A screen reader is told which category is showing.
9. A row keeps the height of its taller card, and the section's height changes smoothly, never in a jump.
10. No check-ins on the way.

**Built (Nov 13), waiting on his look**

- At `/lab/work`, by Claude Code on his Mac. The category bar works, and a press plays the six steps on the real stream with the real cards. Games, 3D art and Photography are four stand in cards each, said to be stand ins on the page, and each set is a different height from Software's: Games shorter, 3D art a little shorter, Photography taller.
- He has not seen it. Nothing about it is settled until he says so.
- **Where the build departs from the ten calls above, and why.** Each came from fresh reviewers failing the filmstrips, and each is his to overturn:
  - Call 1: the old card is gone at 0.09 s and the strike is at 0.18 s, as written. The new card starts up at 0.08 s, not 0.05 s, and cannot be seen until about 0.125 s, so the two cards' words never show through each other and the stream has an empty place to sag into.
  - Call 2: the old card drops 34 px, not 16, and the new one rises 40, not 26. At 16 and 26 the reviewers could not see either at the page's own size and read the change as a fade.
  - Call 3: the surge strikes a card as hard as the scroll does when the page is scrolled 600 px in three quarters of a second, which is brisker than "an ordinary pace". The reviewers put the two side by side at that pace and found the surge the weaker.
  - Call 6: a later press kills the earlier surge where it is and starts again from the bar, so the cards always change from the top down. A card on its way in that cannot be seen yet becomes the newest category at the press itself. One that can already be seen is not swapped in the air: it seats, and goes again when the new front reaches it.
- Calls made while building that the agreement did not cover, none of them a rule, are listed in `LOG.md`, "The surge when the category changes, built". The ones he is most likely to have a view on: the page's rows change height without overshooting and the stream is what swings. The lighter contacts of a surge (the bar, the stones, the rail, the meeting) throw a quarter of the shards they would on a scroll, so the budget goes to the cards. A row does not start to shrink until both its taller cards have gone. The front sheds sparks as a leading end does, and the spark budget on his Mac went from 700 to 900 for it.
- The test shot at `/lab/stream`, the approved buttons and the card study were photographed before any shared code was touched and after: every still agrees pixel for pixel.
- What is at the bar and what is not, with what the fresh reviewers said in each of four rounds, is in the same `LOG.md` entry. In short, three of the thirteen tests in `QUALITY.md` are not passed: the front cannot be followed on the sides (test 2), the surge's strike has a thinner spray of sparks than the scroll's (test 4, marginal), and the stream's swing past its new line is too small to see (test 7).
- One line was added to the approved card's stylesheet: its foot keeps the height of a link even when a card has no links, which only the stand in cards lack. The four real cards draw as they did, pixel for pixel. It is here so he can say no to it.

**His look at the surge on the page (Nov 13)**

- "Everything looks really good."
- **The length changes to the long one.** "After reviewing the animation, I wish I would've went with the long one from earlier. We should give him a prompt to update that." In exact terms: the surge takes 1.1 seconds from the bar to the meeting under the button, where it took 0.7. That is the wireframe's Slow. The lines above that say 0.7 are how it stood when it was built.
- What that leaves as it is: a card's own change does not stretch with the surge, so the first row still changes about as soon after the press. The second row, the rail and the meeting come later.
- His words cover the three changes from his look at the second pass: the stones' faces always lit, no bar over WORK, and the View all work button raised to the middle of its pocket.
- Not said yet, so not settled: whether he can follow the surge's front down the sides, which the build's account says is not at the bar. The settle onto a new height, which is too small to see. The line added to the card's stylesheet so a card with no links keeps its foot. A lighter resting color for "Case study".

**Three changes to the surge and the cards, agreed (Nov 13)**

How each got here is in Open 21 to 23. `QUALITY.md`, "When the category changes", has their tests.

1. **Both sides start together.** Fable had read his question about the stagger as being about the rows. He meant the two cards of one row: "I just meant cards in the same row have a split second difference on them changing. Maybe the pulse is coming from the mouse click itself and not both of the starting points of the stream that's touching the category selection component. I actually don't think we need the toggle. I think if we position a spot on the stream where both of those pulses start, instead of the category that the user clicks, that will sync it up and fix the problem I'm having."
    - In exact terms: a press starts the surge on both sides at the same instant, each from the place that side of the stream rests on the bar, wherever on the bar the press was. The two cards of a row change together. The first row still changes before the second.
    - "The end nearer the press first and harder" is dropped. It was Fable's. There is no switch.
2. **The front has power.** "I like your recommendation on the pulse needs more power. Well said." What was recommended: the front is a second leading end racing down a stream that is already there. A hard hot point. Forks of arc reaching off it. Sparks shed behind it. The riding shards flung wide as it passes and closing behind it. The core burning pale for a stretch in its wake.
    - It has to be followed by eye from the bar to the button. That is the test the first build failed.
    - It is never a soft ball of glow, and it has no color off the palette.
    - His yes makes the front a third place for the arc, after the leading end and the landings.
3. **Cards the stream has not reached are asleep.** "I like that they can look like a bronze template or something. We can make them really beautiful." And, asked to confirm: "Yes to confirm cards the stream has not reached. Looks good as well."
    - Asleep, a card is a blank of itself in bronze: its rim, its band and its picture's window are all there, unlit, with its picture and its words low. It has to be beautiful as it is, not a card turned down.
    - The stream's first strike wakes it, for good. Scrolling back up never puts a card back to sleep.
    - The cursor's light still finds a sleeping card, as it finds any metal.
    - A press changes a sleeping card for a sleeping card.
    - **This changes a settled line, and he confirmed it after being told so in bold.** "A card is always readable. The stream's strike lights it and never hides it" now reads: a card is always readable once the stream has reached it. He still judges it on the page.
    - Not committed to: the same idea for the rest of the site. "Kind of 50-50, undecided."
    - Fable's calls, his to overturn: a sleeping card under the pointer or with keyboard focus wakes for as long as that lasts, so it can always be used. With reduced motion, where the stream cannot run, and under 1100 px, every card is awake from the start. A screen reader gets every card's words at all times. The stones and the rail are left as they are: they already rest dark until the stream lights them.

4. **The strike on the Sun stone is much more powerful (Nov 13).** "I also think the strike on the Sunstone should be much more powerful. The positioning that the Sunstone sits is perfect for them to blast particles on top of the second row of cards. This would look awesome. Having particles go in there in between the two rows would really make this feel like a 3D environment."
    - In exact terms: where the stream meets each stone is a full strike. It was a light contact, at about a third of a full strike, which was Fable's call. What it throws goes inward over the gap between the two rows, comes down on the tops of the second row's cards and bounces there. On the scroll and in a surge.
    - What still holds: nothing heaps up, thrown shards keep their momentum, there is no second wave, and what the budget drops is said out loud.
    - Fable's call, his to overturn: what lands on a sleeping card bounces off it and does not wake it. Only the stream wakes a card.

5. **Where surges meet, something happens (Nov 13).** "If we have a second surge coming down the stream, what happens when that surge touches the current one? I feel like there should be an animation for that: fusing together, or having some type of interaction, a burst of energy out the end. I'm not sure, but that's definitely worth adding in there before the next working session."
    - Fable's reading, which he has not confirmed: the surge's front is a second leading end, and "the current one" is the stream's own leading end. So:
    - When the front reaches the stream's leading end, the two fuse and the end throws a burst of energy forward, out of the end: arc, sparks, its shards flung wide. Then it settles back to how it rests. The front never just stops or fades where the stream ends.
    - Where the two sides' fronts arrive under the button they fuse into one, with a burst, and one front goes on down.
    - Not changed by this: a second press while a surge is still running. The later press still cuts the earlier surge off, which was Claude Code's call.
    - Fable's call, his to overturn: the burst is light, arc and sparks. It throws no shards loose, since only a strike does that.

**The path through Work: Bolt, to try on the real stream (Nov 13)**

How it got here is in Open 24. From the path derby at `/lab/work-path`: "I looked through the four options. I think Bolt is my favorite. I'm willing to give that one a shot."

- **The builder works to a goal here, not to a drawing (Nov 13).** "Should we give him the freedom to make Bolt as good as it can be? I don't know how to word the strict criteria to give him. The plan we just made, I don't know how much thought and reasoning you put into it, and that wasn't in production, so it seems natural to explain to him what the goal is and have him work towards that, outside of super containerized rules. I'm just talking about the path here." Fable's answer: yes. The wireframe was a quick sketch on a route drawn by hand, and Fable could not judge it moving.
- **The goal, in his words:**
    - "I want it to feel powerful as you go through the site, with its angles and how it hits things and bounces."
    - "Intentional directed power choosing its next course", not "a ballerina or flowing water".
    - The power is not lost before a strike. What he minded in the path as it was: "harsher bows that look unnatural and take away the momentum of the power right before a strike".
    - "I actually like the swing. It's kind of unpredictable."
    - "The stream itself looks really powerful. I love that." Only where it goes changes.
- **What he picked, as the place to start:** E in the wireframe. Hard corners where it strikes, straight in to every strike, and a wander of short straight strokes, uneven in length and reach, on the free runs. Its shape and its numbers are a sketch. None of them is a rule.
- **What is fixed:**
    - The stops through Work and their order.
    - What the stream is: the steady core he picked, its shards and its sparks. "An arc as the whole core" stays in Dropped.
    - Riding shards stay with the stream, and it still reads as the stream, never as a neon sign, a wire or a circuit drawn on the page.
    - **The approved test shot is left alone.** The sway and the rounded turns are part of what he approved at `/lab/stream`. Bolt is for the route through Work only.
    - Today's path stays one switch away on `/lab/work`, so he can compare the two on the real stream. Fable's call. The switch comes out when he rules.
- **What the builder is free with:** everything else about the path. Where and how sharply it turns, how it comes in to and leaves each strike, what the wander is made of and whether it holds still, and every number.
- **It changes one line of the route he agreed:** "Each side runs along the top of the title and hooks over its end, as in the test shot." On Work it may now leave the end another way.
- Not in it: the lunge. It was a switch in the derby and he did not pick it.

**The third pass on the Work page (Nov 13)**

One round in Claude Code, on `/lab/work`. He had not sent either of the two prompts written earlier in the day, so this round takes in everything since his look at the surge. In the order it is built:

1. One size of card, one row of tags (Cards and buttons, "One size of card").
2. The path becomes Bolt, with today's path one switch away (above).
3. A full strike on each Sun stone, thrown onto the tops of the second row ("Three changes to the surge and the cards", item 4).
4. Cards the stream has not reached are asleep (the same, item 3).
5. Both sides of the surge start together (the same, item 1).
6. The surge's front becomes a second leading end (the same, item 2).
7. Where surges meet: the two sides' fronts fuse under the button, and the front bursts out of the stream's leading end (the same, item 5).

- Not in it: a phone or any screen under 1100 px. The lunge. The top bar. Real projects for the other three categories. New pictures.
- Its tests are in `QUALITY.md`: "When the category changes", tests 14 to 23, and "The path through Work as a bolt".

**A sleeping card is a blank, with none of its content (Nov 13)**

His look at the third pass: "the sleeping cards look really bad. I didn't actually want them to show like the content of what the card is actually going to have. Think of like a metal card, but it's completely blank. Maybe it has some designs on it. That would be cool, but I definitely don't want it to show like the content of what the card will have, like a generic placeholder that's like super shiny and smooth in our layout, without any content."

- A sleeping card shows nothing the card will hold: no picture, no relief of the picture, no words, no band, no window.
- It is a blank metal card in the card's place and at its size, smooth and shiny.
- It may carry a design. Built, Fable's call and his to overturn: a fine line cut inside the edge and a sun cut at the middle, the stones' mark.
- Still Fable's calls from before: under the pointer or with keyboard focus the card is awake and shows its content, a screen reader gets the words, and no card sleeps with reduced motion or under 1100 px.
- The first build of it, the card's own picture cast as a relief with its words in copper, is dropped.

**The third pass, built (Nov 13), waiting on his look**

- At `/lab/work`, by Claude Code on his Mac. All seven are on the page. The switch between the bolt and the path as it was is at the foot of the screen, and `/lab/work?path=now` opens on the old one.
- He has not seen it. Nothing about it is settled until he says so.
- The test shot at `/lab/stream` and the approved buttons were compared with stills from before: every still agrees pixel for pixel.
- **Where the build departs from what was written, and why.** Each is his to overturn:
  - One size of card is applied at every width, phones included, because it is the card and not the page. On a phone a title keeps two lines there, where the Software titles need them, so "a title is one line" holds from a card 265 px wide up.
  - The kink that ran with the surge is gone. The agreement's step 2 has "a swell of light and a kink in the line". On a path of straight strokes a wave in the line bends the strokes, and reviewers of the first build read it as ragged. The front is now what item 2 of "Three changes" lists, and no more.
  - The riding shards are flung wide by a front and by the burst at the leading end, as agreed. Flung, they move faster than the old measure of a jump allows (6 px in a sixtieth of a second): the furthest measured is 39 px. None vanish or appear, and at rest none jump. So `QUALITY.md`, "When the category changes", test 6 is not met as it is worded, by something the agreement asks for.
  - While a surge's front runs, the stream's core ahead of it is turned down to about a fifth, and comes back as the front passes. He asked to keep the stream's look, and for those 1.1 seconds this changes it. It is what made the front something the eye can follow: three rounds of reviewers could not pick the front out of a stream that was as bright ahead of it as behind. One number, `change.hush` in `src/stream/config.ts`, and at 0 the stream is as it was.
  - On the bolt each strike on a card and a stone is 1.2 times as hard as on the path as it was, with a brighter flash, so the strike after a straight approach is the stronger one. The path as it was is untouched.
- Fable's calls in the agreements were built as written: a sleeping card wakes under the pointer or with focus, no card sleeps with reduced motion or under 1100 px, what lands on a sleeping card does not wake it, the burst where fronts meet throws no shards, and a later press still cuts an earlier surge off.
- Calls made while building, none of them a rule, are in `LOG.md`, "The third pass on the Work page, built". The ones he is most likely to have a view on: a sleeping card is a blank of polished bronze with a line and a sun cut into it (his ruling above), and it wakes in a tenth of a second, at the strike. The bolt's strokes are fixed for a page and differ on the two sides. The budgets on his Mac went up to make room for the stones' strikes: thrown shards from 260 to 400, sparks from 900 to 1200.
- What is at the bar and what is not, with what the fresh reviewers said in four rounds, is in the same `LOG.md` entry. In short, the reviewers still fail: the bolt's top half (round the title and the bar it reads as a drawn outline), the front as a hard point, the sleeping card on a real screenshot, the waking, and the burst at the leading end.

**His look at the third pass, after the blank (Nov 13)**

Said to the web chat with Claude Code's report on the blank sleeping card. Four rulings, and two things left open.

1. **The Sun stones throw far too much, and throw it all one way.** "The sun stones are shooting way too many projectiles. We need to tone that down at least 50%, maybe slightly more. When a strike happens it's basically just like a giant handful thrown all in the same direction. They're not scattering. What I wanted was enough exploding from the sunstone that a few would find their way in there and bounce around and look really cool. It's like they're targeting that certain spot, and it's noticeable. It looks off."
    - In exact terms: a stone's strike throws a little under half of what it throws now, and it scatters as any strike does, in every direction it can go. Nothing is aimed at the gap between the rows. A few pieces get there by chance and bounce on the second row's tops. The aim was Fable's reading of "blast particles on top of the second row", and it was wrong.
2. **The two sides of the path mirror each other.** "When the path splits there's no longer symmetry between them. They take two different paths on each side, slightly different. They should actually mirror. My favorite is the one on the right. Let's make sure the left path mirrors it perfectly."
    - In exact terms: the left side's path is the right side's, flipped. This is about the path. What each side throws still differs, as two strikes never match.
3. **Bolt is for Work, from the category bar down. Nowhere else.** "I don't love what he did with the bolt before it hits work, and then after the work section. I'm OK with utilizing what we made for bolt for the work section, but I don't think I want it to be used in other sections." "The only thing I don't like about the work section in bolt right now is the way it hits the word work. I would prefer if we went back to the old way for that, and then once it drops down to the categories, then we could take on the new path."
    - In exact terms: the stream comes down to WORK, strikes it, runs along its top, goes over its ends and comes down to the category bar as it did before the bolt. From where it lands on the bar to where the two sides meet under the button, it is the bolt. Below the meeting it is as it was before.
    - This settles the trial: the bolt stays, for that stretch of Work. It is not the stream's path in any other section.
    - Fable's answers to his two questions: it is not a bad idea, since it gives the stream one rule, taut where it is striking things and loose where it is falling free. And it can be done, because the route is planned one stop at a time. The place to watch is the join on the bar.
4. **A strike no longer colors a card's picture.** "When the cards get struck on the first row, which are showing their content and not the placeholder, their image gets color as if you were hovering it. This is jarring and looks bad."
    - In exact terms: at a strike the card's rim still flares. Its picture stays as it was. Only the pointer and keyboard focus bring a picture's colors back. This takes out "the picture warms toward its own colors and settles back", which came from the card's first proposal.

Left open:

- **The blank's look.** "The placeholder does not look great. Maybe we should derby them here?" To be drawn in the web chat, where a still of metal can be judged.
- **Whether a card stays awake.** He found that a card, once woken, never sleeps again, and had thought the agreement was that a card is blank whenever the stream is not on it. What was agreed was Fable's wording, which he confirmed: "The stream's first strike wakes it, for good." He is "50-50" now: blank whenever the stream is not there "makes more sense, especially if we have a cool animation of them changing". Fable's view, not agreed: a card should sleep again when the stream draws back above it. Everything else the stream does undoes itself when the page is scrolled back up, and a card in the top two thirds of the screen would still be awake to read.
- Not answered: the stream being turned down ahead of the surge's front.

**A card sleeps again, and the change is an animation both ways (Nov 13)**

- "For the cards go back to sleep: yes. I think they should have a shifting animation for both opening and ending."
- In exact terms: a card is awake while the stream has reached it, and asleep when it has not. When the page is scrolled back up and the stream draws back above a card, that card goes back to sleep. Waking and going to sleep are each a designed change from one state to the other, not a cut and not a plain fade.
- This replaces "The stream's first strike wakes it, for good" and "Scrolling back up never puts a card back to sleep", which were Fable's wording.
- Still Fable's calls, not yet answered: under the pointer or with keyboard focus a sleeping card is awake.
- What the change looks like is not decided. It goes with the blank's design, below.

**What he wants the blank to be (Nov 13). Not decided: ideas first, then a derby in the web chat**

- "What I'm envisioning is highly mirrored metal, super reflective, but obviously like a placeholder blank card. I do want there to be some detail on it. I wasn't expecting him to put like a sun or something. I don't hate that, but I was thinking more of like, you know how a skeleton loader has like content on it, something kind of like that, but instead of it actually moving like a skeleton loader it's like etched on the card or something. I don't know. I also want you to come up with your own ideas, something creative. Let's put them here before we jump straight into the derby."
- In exact terms: a mirror finish, far more reflective than the blank that was built. Plainly a blank. Some detail, and his first thought for it is the card's layout as plain shapes, as a skeleton loader shows them, cut into the metal and still.
- **This changes a line of "A sleeping card is a blank".** That line says a sleeping card shows "no band, no window". Shapes that stand for the layout, the same on every card, are what he is now describing. A card's own picture and words still never show.
- He is holding the prompt for Claude Code until everything open is answered: "I only want to go to Claude Code once we have everything figured out that's open."
- Fable's ideas, put to him the same day. Talk only:
    - Why the built blank falls short: a mirror shows what is round it, and it was given one soft sheen on a flat brown. A mirror finish needs hard edged bands of light and dark that slide as the cursor's light moves and as the card turns.
    - A · Etched layout, his idea: the layout engraved as hairlines. It wakes as each engraved shape becomes the thing it stands for.
    - B · The mould: the same layout as shallow pockets sunk into the mirror, like a tray. It wakes as each pocket fills.
    - C · Doors: the face is two mirrored doors that meet at a fine seam with a latch at the middle. They slide apart into the rim to wake and close to sleep.
    - D · Engine turned: a mirror cut with a fine turned pattern, as on a watch dial, that throws moving bands of light. No hint of the layout. It wakes as a band of light crosses from the strike with the content behind it.
    - A small stamped hallmark, as on silver, could go on any of them in place of the sun.

**His reaction to the ideas, and his answers to what was open (Nov 13)**

- **The ideas.** "For the ideas, I really like B and A, and D sounds cool too. Let's cut C. I don't love that idea, and let's replace the C with another option."
    - In exact terms: B · The mould and A · Etched layout go to the derby as his favorites, and D · Engine turned goes with them. C · Doors is dropped. A new third idea takes its place, Fable's to choose.
- **The surge.** "Yes, the surge looks much better." Said of the surge as the third pass built it: both sides together, the front as a second leading end, the fuse under the button and the burst at the leading end.
- **A row the stream has not reached does nothing on a press.** "Because the second row goes from placeholder to their actual cards the first time the surge hits them, and they stay, they're still having that issue where they're playing that animation. We need to be sure that when the light's not touching them that they're the placeholder cards, and that animation does not play at all."
    - In exact terms: when a category is pressed, a card the stream has not reached stays a blank and does nothing. No drop, no rise, no strike, no flash, no waking. What it will show when it wakes changes with nothing to see. The surge runs only as far down as the stream has reached.
    - With cards sleeping again (above) this holds on every press, not only before a card's first strike.
- **A light off the screen, for the mirror.** "One other thing I'm open to doing is putting an artificial light source in the scene. I'm not sure how taxing that is, but one that's outside of the user's viewport that points at those cards, so the mirror effect is in full effect. I'm not sure what else we can do with them. What do you think?"
    - Fable's answer: yes, and the derby has it. A mirror shows what stands round it, so what it needs is bright things to reflect, not a light pointed at it. Those are a few long lights that stand off the screen, up and to the right, and they exist only as arithmetic in the card's own shader. Nothing is lit and nothing casts a shadow, so the cost is a few lines of work for each pixel of a sleeping card.
    - Their reflections slide as the page scrolls and as a card turns under the pointer, and the cursor's light shows in the mirror as a small bright panel of its own.
    - Not a rule until he has seen it and said so.
- **"Everything else I agree with your recommendations."** The recommendations were Fable's, on what Claude Code's reports had left unanswered. Settled by this:
    - The stream's core stays turned down ahead of the surge's front while it runs (`change.hush`).
    - "Case study" gets a lighter resting color.
    - A sleeping card still wakes under the pointer or with keyboard focus.
    - The line added to the card's stylesheet, so a card with no links keeps its foot, stays.
    - The switch between the bolt and the path as it was comes off `/lab/work`.
    - The rail's brackets and the finial are left as they are.
- **Tags: one row, however many fit in it.** "Regarding the glasses card, I see no issues with it. It's four tags that are perfectly fitting in a single row. I don't care how many tags you can fit in a single row, as long as it's one row."
- "We can go ahead and start the derby now."

**The derby of blanks (Nov 13). In front of him, nothing picked**

- At `/lab/work-blanks`, Study 17, built in the web chat. Four blanks in mirror polished bronze, each over a real card. Each has a button that wakes it and puts it back to sleep, and the page has a quarter speed switch.
    - **A · Etched layout:** the card's layout as engraved hairlines, in the places the real card has its parts. It wakes as the lines light and the mirror gives way outward from them.
    - **B · The mould:** the same layout as shallow pockets with satin floors, sunk into the mirror. It wakes as each pocket fills from its foot, then the metal between gives way.
    - **C · Facets,** the idea that replaces Doors: the face cut into flat planes like one of the stream's shards, each showing a different part of the room, with a polished line along every ridge. No hint of the layout. It wakes as the planes give way one after another.
    - **D · Engine turned:** fine turned rays round a boss at the middle, which smear the lights into fans. No hint of the layout. It wakes as a band of light crosses it from the top with the card behind.
- Going back to sleep is the same change run backwards.
- The lights off the screen are in all four: each is a gradient with one hard edge, as a photographer lights polished metal.
- What he is choosing: the blank's design, and with it the kind of change between asleep and awake. He is not approving the finished blank. This page is a study drawn by a shader of its own laid over the cards. The builder makes the picked one in the card's own plate (`src/metal/`), where it also takes the stream's light.
- Fable's judgment, from stills drawn in software at one pixel to a pixel:
    - A and B read as mirror metal and as a placeholder at once. B has more in it: satin against mirror, and a lit lip on each pocket.
    - C is the strongest mirror of the four and the least like a placeholder.
    - D is satin by its nature, the least like a mirror. Its dark fan can read as a smudge and its boss as a ring.
    - Not judged: any of the four in motion, how fine the lines are on his screen at two pixels to a pixel, and how bright a mirror sits beside the stream, since this page has no stream.
- On this page a blank stays asleep under the pointer, so the cursor's light can be seen in it. On the Work page a sleeping card wakes under the pointer, so there the cursor's light plays on a blank only from beside it.
- Stills: `reference/studies/33-work-blanks-*.jpg`.

**His pick of a blank: D · Engine turned (Nov 13)**

- "My favorite by far is option D!" Said after opening the derby at `/lab/work-blanks`.
- In exact terms: a sleeping card is the engine turned blank. Fine turned rays round a raised piece at the card's middle (the handle, below), inside the card's own polished edge, with no hint of the card's layout. It wakes as a band of light crosses it with the card behind, and goes back to sleep as the band runs back.
- Fable had recommended B · The mould, and from stills had rated D the weakest of the four. He judged them live and moving, which the web chat cannot. His pick stands.
- What the pick replaces:
    - The blank as built, with a line and a sun cut into it.
    - His first thought for it, the card's layout etched as a skeleton loader shows it, and a mirror finish over the whole face. D is satin rays inside a mirror edge. So "no band, no window" in "A sleeping card is a blank" stands again as written: a blank shows nothing of the layout.
    - A · Etched layout, B · The mould and C · Facets, which are passed over.
- Taken with the pick, not said in so many words, and his to overturn: the long lights off the screen, which he asked about and which light D in the study, and D's own change, the band of light.

**What he likes in D, and what must not be lost (Nov 13)**

Fable had told the builder to fix two things in D: a boss that "can read as a ring" and a dark fan that "can read as a smudge". He stopped the prompt before sending it. Both are what he likes.

- **The handle.** "Is that the handle you're referring to? Currently I actually enjoy how it looks 3D. I'm not opposed to making it better, but I don't necessarily want to lose the essence of it. What it looks like to me is like a handle on a swinging door on an antique china cabinet or something, some decadent handle on a piece of furniture. I really like the vibe of that."
    - In exact terms: the raised round piece at the middle of the dial stays, and it is called the handle. It reads as a turned handle on a fine piece of furniture, with real depth. It may be made richer. It is never made flatter, plainer or smaller, and never taken away.
- **The shadow.** "The smudge you're referring to, it actually looks like a shadow. The background interacts with the light much higher quality than the other three cards. That's why I chose it." "I want to keep the dark area that's obviously a shadow and improve upon it further if that's even possible. I don't want to make it worse, or possibly remove it."
    - In exact terms: the dark area that runs out from the handle and swings as the light moves stays, and it reads as a shadow. It may be deepened. It is never removed, weakened or tidied away.
    - What it is in the study, so that it is kept on purpose: not a cast shadow. The rays smear the room's lights round the dial, except where they run along the lights' bands, and there the dark of the room shows through. So it pivots on the handle as the scroll and the cursor's light move.
- **Where it can go further.** "I'm definitely open to improving it even further, by making it feel like the user is looking at something in real 3D space, because of how the interactions of the light reflect on it are hyperrealistic."
    - In exact terms: the light on the dial is why he picked it. More of that is welcome: the card reading as a real object in real space. Nothing that makes the light on it less real.

**His look at the handle as Claude Code first built it (Nov 14)**

Said to the web chat with a screenshot from his phone, while Claude Code was still working on the fourth pass. Nothing had been pushed, so the web chat has seen the screenshot and not the code.

- "He changed the center. It no longer looks like a knob for a piece of furniture. He changed it to look more like a real dial. I don't like that it's off center and not protruding more from the background. Before it felt like an object poking out of the card, which is what made it so good. Now it looks like a slight raise."
- In exact terms, three things are wrong with the handle as built:
    1. It is off center. It belongs at the dead center of the card.
    2. It barely stands off the card. In the study it read as an object poking out of the card. It has to stand at least that far off, and plainly.
    3. It reads as part of a watch dial: flat rings round a small raised middle. It has to read as a knob from a piece of antique furniture.
- What he thought he was getting, from two photographs he attached of antique cabinet knobs in aged bronze: a round head with a ring of beads at its rim and a flower in relief on its face, one with swirling petals and one a sunflower with a beaded middle, on a short stem with a flared foot. They are a shop's product photographs, so they are not in this repo, which is public.
- In exact terms: the handle is a knob of that family, designed for this site and not copied from either photograph.
- Everything else about D stands: the rays, the shadow that swings off the handle, the band of light.
- Fable's part in it, said to him: the prompt told the builder to judge the blank against a photograph of a real engine turned dial. That may be what pulled the middle toward a watch part. Not confirmed, since the builder's report has not been seen.

**The knob, built (Nov 14). He has looked: "This looks great! Great work on the card."**

- At `/lab/work`, and alone at `/lab/work-blank`. Built in answer to "His look at the handle as Claude Code first built it".
- His look (Nov 14), said to Claude Code after opening both pages: "This looks great! Great work on the card." Read as: the knob on the blank is what he asked for. He went straight on to two faults in the band of light, which are in "His look at the fourth pass", below. He did not go through the calls listed here one by one, so each is still his to overturn.
- What it is: the head of an antique cabinet knob, seen from straight in front, at the dead center of the card. A rolled rim, a ring of 30 beads, a half round moulding, and a domed face with a rosette in relief: eight broad petals with a crease down each, eight long pointed leaves behind them, a plain boss at the heart. In old bronze: dark where it is low, rubbed bright where it stands proud.
- How it stands off the card, seen head on:
  - Its own shadow on the dial. The head stands on a stem, so its shadow is the head's round shape lying clear of the head, away from the strongest light, and swings as the cursor's light and the stream move. With nothing near it lies up and to the right, along the dark wedge he picked the study for, so the wedge reads as the long end of the knob's own shadow.
  - The light across its dome and its beads: the side facing a light is lit and the far side is dark, and that follows the cursor's light too.
  - The head moves against the dial as the card turns under the pointer.
- **Calls made for him. None is a rule:**
  - The rosette's design, which is this site's own: eight petals over eight leaves, turned a little as it goes out. It copies neither photograph.
  - The head is 92 of the card's 460 units across. The study's handle was about 60.
  - The first build leaned the handle's dome toward the eye by where the card stood on the screen, which is what put it off center. That is gone. The head is drawn at the card's center and moves only when the card itself turns.
  - The turned rings round the first handle are gone. The rays run under the knob to its stem.
  - Its bronze is a little browner than the dial's, so it reads as a separate, older thing.
  - The knob draws back into the dial as the band of light comes to it, and is gone before the band is on it. It stands out again when the band has run back past it. A band that crossed it standing cut it in two.
  - With nothing near, the knob is lit from down and to the left, the side the dial's bright fan lies on. Lit from the other side its shadow fell opposite the wedge, and the two read as shadows of two lights.

**The fourth pass on the Work page: the agreement for the build (Nov 13)**

One round in Claude Code, on `/lab/work`. It takes in everything he has ruled since the third pass. He held every prompt until all of it was answered: "I only want to go to Claude Code once we have everything figured out that's open."

**What gets built**

1. **The Sun stones' strike:** a little under half of what it throws now, scattered, nothing aimed ("His look at the third pass, after the blank", 1).
2. **The left side of the path is the right side, flipped** (the same, 2).
3. **The bolt runs only from the landing on the category bar to the meeting under the button.** Above and below, the path as it was before the bolt (the same, 3). The switch between the two paths, and `?path=now`, come off the page.
4. **A strike does not color a card's picture** (the same, 4).
5. **A card is asleep whenever the stream is not on it.** It wakes at the strike and goes back to sleep when the stream draws back above it ("A card sleeps again").
6. **The blank is D · Engine turned,** made in the card's own plate and lit by long lights that stand off the screen ("His pick of a blank").
7. **The change between asleep and awake is D's:** a band of light that crosses the card with the card behind it, and runs back to put it to sleep.
8. **On a press, a row the stream has not reached does nothing** ("His reaction to the ideas").
9. **"Case study" gets a lighter resting color,** so it passes contrast with the cursor's light behind it.

**The blank is a goal. The study is the floor to beat, not a drawing to copy**

- What it has to be: an engine turned plate as a watchmaker turns a dial, in the site's bronze. Fine rays round the card's middle, the handle at the dead center, the card's polished edge round it. The handle is a knob from antique furniture, not a part of a watch ("His look at the handle as Claude Code first built it", above). The lights off the screen smear across the rays into fans, and the fans turn as the page scrolls, as the cursor's light moves beside the card, and as the stream comes near.
- Kept from the study, and only ever made better ("What he likes in D", above): the handle, with its depth, and the dark area that reads as a shadow and swings on the handle.
- Where the builder can go further: the whole card reading as a real object in real space, by how the light behaves on it.
- Fixed: nothing of the card's layout or content. The card's size and its edge. Rays about the middle, with the handle. The shadow.
- Free: how fine the rays are, a groove inside the edge, where the lights stand and how bright they are, and anything that makes the handle richer or the light more real.
- It is built in the card's plate (`src/metal/`), where it takes the cursor's light and the stream's. The study's canvas laid over the cards is not the way.

**The change is a goal too**

- The band starts where the stream strikes the card and crosses away from it. Going back to sleep it runs back the way it came.
- It is light with weight, lit by the strike: the dial on one side of it and the card on the other. Never a plain fade, and never a soft wipe.
- Under the pointer or with keyboard focus a sleeping card wakes by the same change, and goes back to sleep by it when the pointer leaves.

**What does not get built**

- A phone or any screen under 1100 px.
- The blanks he passed over. A sun, a line or a hallmark on the blank.
- Anything else on the site sleeping until the stream arrives. That theme is still open (Open 21).
- A change to the surge's front, the fuse under the button or the burst at the leading end. "The surge looks much better."
- The top bar. Real projects for the other three categories. New pictures. The lunge.

**What stays exactly as approved**

- `/lab/stream` and the approved buttons, pixel for pixel.
- The card awake: the data plate, `CARD_LOOK`, one size, one row of tags.
- The stream's look, its shards and sparks, riding shards staying with it, no second wave.
- The stones' faces lit. The surge at 1.1 seconds, both sides together, with the core turned down ahead of the front.
- The rail's brackets and the finial as they are, and the line in the card's stylesheet that keeps a foot on a card with no links.

**Fable's calls in this agreement. He has not ruled on them and can overturn any**

- The band starts at the strike. In the study it starts at the top of the card, since the study has no stream. The idea as first put to him had it crossing "from the strike".
- A sleeping card under the pointer wakes by the same change and goes back to sleep by it.
- The blank and its change are given to the builder as goals, as the bolt was.
- A blank is never brighter than the stream beside it. The lights off the screen are set to suit the page, not copied from the study, which has no stream.
- Carried from before: what lands on a sleeping card does not wake it, and with reduced motion or under 1100 px no card sleeps.

**The fourth pass, built (Nov 14). He has looked at the blank and the band. The rest waits on him**

- At `/lab/work`, by Claude Code on his Mac. All nine are on the page. The blank can be seen alone at `/lab/work-blank`, Study 20, with a button on each card that wakes it and puts it back to sleep.
- His look is in "His look at the fourth pass", below: the card with the knob is great, and the band had two faults, since mended. Nothing else here is settled until he says so.
- The test shot at `/lab/stream` and the approved buttons were compared with stills from before: every still agrees pixel for pixel. The awake card's stills agree except for the words "Case study", whose color was changed on purpose.
- Fable's calls in the agreement were built as written: the band starts at the strike, a sleeping card under the pointer or with keyboard focus wakes and sleeps by the same change, no card sleeps with reduced motion or under 1100 px, and what lands on a sleeping card does not wake it. The lights were set for the page.
- **Where the build had to choose between two things he asked for.** His to overturn:
  - "The left side must be the exact mirror of the right" and "above the bar, put the path back the way it was". Before the bolt the two sides were not quite a mirror above the bar: each swayed in its own way and leaned a little differently, so that they never landed in the same instant. The build mirrors everywhere the sides are apart. So above the bar the left side is now the right side's old path, turned over, and not its own.
  - The word WORK's ink is 2 px to the right of the middle of the page, where the bar, the cards, the stones and the button stand. The left side is the right's mirror about the middle of the word while it is on the word, and about the middle of the button from the bar down, and moves from one to the other on its way down to the bar.
- **Calls made while building.** None is a rule. All are in `LOG.md`, "The fourth pass on the Work page, built". The ones he is most likely to have a view on:
  - The band of light is drawn by the card's own plate. It lies under the card's words, which are uncovered at its line, and not over them.
  - The pointer's band sets out from where the pointer came onto the card. With keyboard focus it sets out from the card's top.
  - The band takes about half a second when the stream wakes a card or leaves it, and about a third under the pointer.
  - The handle is a knob from antique furniture ("The knob, built", above). As first built it was a polished dome in turned rings, which he rejected.
  - The lights are the study's own, put at real places off the screen and run off into the room, so the shadow's line turns as the page scrolls.
  - There are two darks on the handle. The first is the one he picked: the room showing along the rays that run across the lights, a narrow wedge that slides along its line as the page scrolls. The second is new: the knob's own shadow on the dial, the round shape of its head lying away from whichever light is strongest on it. With nothing near it lies along the wedge. With the cursor's light near it lies away from that, and as the stream's leading end passes, away from that. It is what answers the cursor, and what says how far the knob stands off the card.
  - The stream's leading end lights a blank as one warm light as it comes near, which lies on the rays as a soft fan.
  - The band is a bowed front that spreads from the struck point. It is broad and hot where it starts and thins to a line by the far side, and it lights the dial's rays ahead of it.
  - While the pointer's band is crossing a card, the card behind it is whole and in its colors. They are not faded in as well.
  - A stone throws 45 percent of what it threw. The budget for thrown shards stays at 400: three quick presses still reach it.
  - "Case study" at rest is three parts the quietest text color to two parts the next one up.

**His look at the fourth pass (Nov 14): two faults in the band, and one rule**

Said to Claude Code after opening `/lab/work` and `/lab/work-blank`.

- "This looks great! Great work on the card. There are 2 other things we need to fix though."
- "If I scroll down and change the category a few times and then scroll up to where the 1st row is the placeholder cards, and then switch categories, you can see the actual cards come in even though the surge is not touching it for a split second before the animation to turn it to the placeholder plays."
- "If I scroll at normal speed I see multiple overlaps. I don't know how to explain it, but when the surge touches the side of the card, that's where the card comes into life at the starting point. I see multiple of those starting points overlapping if I scroll slightly faster."
- "On the second link that you gave me, pressing the wake button on all the cards, all of them have issues. Some of them have text that is barely visible still on the gold part while it's coming in. This shouldn't happen. Other ones have darkness that comes in on one side of the card when it's coming in."
- "I just think we need to revisit that animation and make sure it's consistent and doesn't show text is not supposed to yet until the animation passes it, and we need to make it so it only ever opens from the first spot the surge touches and can't open from multiple spots."
- "The surge" here is the stream's leading end as he scrolls, and "the placeholder" and "the gold part" are the blank.
- In exact terms, four rules for the change between asleep and awake:
    1. **A card opens from one place only: the first spot the stream touches.** There is never a second band on a card, and a card never opens from two places.
    2. **None of a card's words shows on the blank.** A word is seen only once the band has passed it.
    3. **Nothing dark comes in at a side or a corner as the band crosses.**
    4. **A press on a sleeping row never shows a card,** not for one frame. This is item 8 of the agreement, which the build did not hold to.
- He has not ruled on the rest of the fourth pass: the stones' strike, the mirror, the bolt's ends, "Case study".

**The band, mended (Nov 14), waiting on his look**

- At `/lab/work` and `/lab/work-blank`. All four were found in real frames recorded from a live page, and none could be seen in a filmstrip of frozen frames, which is how the band had been judged.
- What each was:
    1. Two starting points. A card had two bands, one for the stream and one for the pointer. His pointer rests on the page while he scrolls, so each card came under it and opened from where the pointer met it, and then the stream struck and opened it again from the strike.
    2. Words on the blank. The card's plate was drawn before the stream had set that frame's band, and the mask on the words after. So the words were uncovered one frame ahead of the band, up to about 30 px at the band's fastest.
    3. The dark side. One number in the band's light ran past what a number can hold far ahead of the band, and the card's far corner was drawn black for the first frame or two.
    4. The card that flashed. A card that is put away kept what it was when it went. Shown again in a sleeping place, it was drawn awake for one frame. And one that had been under the pointer when it went came back awake and ran a band back to sleep.
- What is built:
    - A card has one band. It belongs to the place the card stands in, and every card of that place wears it, the ones put away too.
    - Where a band sets out from is chosen only while the card is wholly asleep or wholly awake. Whatever comes or goes while it is crossing turns that one band round.
    - The plates are drawn last in a frame, after the band is set, and the words come up a little behind the band's line, in its trailing light.
    - A card that is put away is no longer under the pointer, and is drawn as its place is before it is seen again.
- **Calls made for him. None is a rule:**
    - **A pointer at rest that the page is scrolled under does not wake a sleeping card.** This narrows a line of the agreement, "Under the pointer or with keyboard focus a sleeping card wakes by the same change". A pointer that is put on a sleeping card, and keyboard focus, still wake it, by one band from where the pointer came on. Without this, a card under his resting pointer would open from the pointer and not from the stream, which is what he ruled out.
    - On a touch screen larger than a phone the stream wakes a card, and so does a tap on it (Cards and buttons, "No card lights by itself"). Before, the cards nearest the middle of the screen woke by a band of their own.
    - A card the pointer has already woken does not open again when the stream reaches it. The strike still flares its rim and throws its sparks.
    - A blank does not grow under a pointer at rest. It grows as it wakes.
    - Where a card goes back to sleep to: where the stream struck it if the stream was the last thing keeping it awake, and where the pointer came on if the pointer was.

**How it is built**

He added these while the stream was a simulated liquid. They hold for anything in the stream that is simulated: shards thrown loose, sparks.

- The simulation is stepped from the one clock (`src/world/clock.ts`) with a fixed timestep and a seed, so any frame can be frozen and shot again exactly. Each new pour takes a new seed, so no two splashes match. (Nov 11)
- A particle budget is set for his Mac and for a phone before building, and what the phone gives up is said out loud. The phone view is checked as the work goes, not at the end. (Nov 11) **Changed Nov 13:** how a phone looks and where the stream runs on it now wait for the mobile pass (How we work, "The mobile pass"). The budget for a phone is still set out loud.

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

- The city as built is not what the site is built on. "It's not like it's a masterpiece that we're building the whole site off of. That's the stream." It "is going to need a massive overhaul and the current version will probably just be shown as a draft anyways". (Nov 12)
- The opening animation as carried from the second build is "five out of 10 at best" and "definitely needs to be redone". The city itself "looks good" and "could still use some work". The city gets revisited anyway so it ties in with the stream. (Nov 12)
- An idea to revisit with the hero, not decided: his first thought was the city breaking apart into the stream as the visitor scrolls. Fable's twist, which he asked to have noted: building, not breaking. The city assembles out of the stream's facets in the opening, and the stream carries the same pieces on down the page. (Nov 12)

### Work

- One section. A centered title. No featured card.
- Categories at the top, Software first: Software, Games, 3D art, Photography. A project lives in one category only, and Brandon says which.
- Four or six items per category on the home page.
- On the home page: four, in two straight rows of two. The categories are a bar of their own below the title. (Nov 12)
- How the stream runs through the section is in The stream, "The stream through Work". (Nov 12)
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
- The cards are designed with the words they will really carry. "We should build these out with the content they're actually going to have on them. For now we can just do a placeholder image." (Nov 12)
- His idea for a card's picture, wanted but not yet designed: "My portfolio's current site does something where the images are kind of like black-and-white before you hover them. It'd be cool if we could do something similar, but with like a bronze effect or something that matches our color scheme." In exact terms: at rest a card's picture is shown in one tone taken from the palette, and under the cursor it shows its true colors. (Nov 12)
- **The card as proposed is approved as the base (Nov 12).** "No, everything in the proposal is fine." What that covers:
    - On it, top to bottom: the picture in a window sunk into the card. A small label of the kind of project and the year. The title. The description. Up to four tags. The whole card opens the project.
    - Made of: the dark plate from the stream's test shot. Metal only as accents: a thin copper bead all round, which the stream lands on and strikes, and the frame round the picture. The buttons' metal and lighting.
    - The picture rests in bronze and shows its own colors under the cursor or with keyboard focus, when the bead and the frame catch the light and the card grows a little. Where nothing hovers, the cards nearest the middle of the screen show their colors. **Changed Nov 14: only on a phone.** On anything larger no card lights by itself ("No card lights by itself", below).
    - A card is always readable. The stream's strike lights it and never hides it.
    - The derby uses the four projects on his live home page with their real words, and his real screenshots in place of a blank. Which four end up on the home page is still his to say.
- **No card lights by itself on anything larger than a phone (Nov 14).** "On mobile devices and on iPad when scrolling, the cards automatically light up with color. I understand this is probably best user experience for mobile users, but most of my testing is being done on a iPad right now, which is causing issues. Let's go ahead and remove that feature. For everything outside of mobile devices, anything bigger than a mobile device should not automatically have a card come in focus. It should have to be clicked beforehand or hovered by a mouse or an Apple pencil."
    - In exact terms: on any screen larger than a phone, a card shows its own colors only when it is tapped, or hovered by a mouse or a pencil, or has keyboard focus. Scrolling lights nothing.
    - On a phone the cards nearest the middle of the screen still light as the page scrolls. Read from "I understand this is probably best user experience for mobile users". His to overturn. The phone is designed in the mobile pass.
    - Built Nov 14, in `WorkCard.tsx`. Calls made for him, none a rule:
        - A phone is a touch screen whose shorter side is under 600 px (`PHONE_SIDE`). An iPad is not one, held either way.
        - **A finger's first tap lights a card and does not open it. A tap on a lit card opens it.** A click cannot bring a card into focus if it also leaves the page, which is how "clicked beforehand" is read. It means two taps to open a case study on an iPad, where it was one.
        - A tap anywhere else lets the card go back to rest, and a tap on another card moves the light to it.
        - A tap on a sleeping card wakes it by its band, from the edge nearest the tap, and does not open it.
        - A finger that scrolls the page lights nothing, even when it starts on a card.
        - A mouse and a pencil are as on a desktop: hovering lights the card and one click opens it.
- What he asked for with the approval (Nov 12): "Maybe you could figure out if there are any data points that could be important or nice to have that we don't, and maybe it makes sense in the layout of the card itself. Maybe you could also give me a few different variants, but only ones that are top-tier. I don't just want variants for the sake of it."
- **His verdict on the card derby (Nov 13).** Nothing on the cards changes until he says: "Let's hold up on changing anything for the moment."
    - **The layout is C · Data plate.** "When it comes to data plate, I genuinely like that one a lot."
    - **Cast and Etched are out.** "Cast and etched look really bad and are pretty much unusable." They are in Dropped.
    - **Toned is the best of the three and not loved.** "I don't necessarily love toned either. It's just better than the other ones. I think the hard part here is making the cards look good with the pictures that we're using."
    - His question, not a ruling: "Is it customary to show a picture of the project? I know it makes sense on 3D projects and stuff, but a lot of my projects are simply, here's what a dashboard looks like on this app or something."
    - **Where a click goes has to be plain.** "I see you have Live and Code, which are really nice features to be able to do that from the home page, but the main arrow that moves on hover, which is supposed to take the user to the actual expanded project or case study page, whatever the appropriate name is for it, should have that context. Maybe we could put that in the bottom right corner and it just says case study, so when you hover the card that arrow moves and lets you know this is going to take you to the case study, and then if you hover Live or Code, it goes away, giving the user context so they understand that this takes me to the live site, not the case study." In exact terms: on C the arrow beside the title has no words. He wants the words "Case study" with the arrow in the card's bottom right corner. With the pointer anywhere on the card they light and the arrow moves. With the pointer on Live, Evals or Code they go quiet and that link lights, so it is always plain which place a click leads to. The name of the page is not settled. Not built.
    - **The hover is not there yet.** "I found the hover effect to be slightly underwhelming, and I don't know if I like that line of light that moves back and forth on the cards. It doesn't look bad but it doesn't really look great either." The line is the slanted streak the cursor's light makes on the picture's glass.
    - What he expects of the stream: "We also have to consider our stream. That's going to add a lot to the card, or at least I'm hoping it is: it will light up the card and the card will react to it in certain ways. So we already have that going for it."
- **The pictures get retaken, and he leans toward loops (Nov 13).** "No matter what I need to retake pictures, so these will not be the pictures that will be used in the final version. I'm open to pictures or loops. Maybe even both, though if we had to choose one I'm leaning more loops." He asked for Fable's recommendation: both, as one thing. A card's loop is a short recording of the product in use, and its picture is that recording's first frame. The picture is what rests in bronze, what shows where motion is turned off, and what is there before the loop has arrived. Not a ruling until he says so.
- **The second round, built on his word (Nov 13).** "Go ahead and do the next round of changes now." At `/lab/work-cards`:
    - The streak of light on the picture's glass is cut. The glass throws no glare back.
    - "Case study" with the arrow is in the card's bottom right corner, as he described: lit while the pointer is on the card, quiet while it is on Live, Evals or Code, when that link lights.
    - The card is one layout, the data plate, and its picture rests one way, toned. The layouts and treatments he passed over are out of the code. Their stills are in `reference/studies/23-*`.
    - A card can play a loop. Nothing plays yet: there are no recordings.
    - Two of the stand in pictures are cropped tight, to show what one telling part at a readable size does for a card.
- **What he wants from the third round (Nov 13). Talk first:** "Before you make any changes, let's think about how we would like to update this."
    - The foot of the card: "I like the look of data plate the best, but I actually really like the border that set in has at the bottom, and then having all the links at the bottom. So Live, Code on the left and then View project on the right." In exact terms: the data plate keeps its picture and its band of bronze. Under the tags it gets the thin line Set in had, and below that line one row: Live, Evals and Code on the left, the link to the project's own page on the right. The links leave the band. Whether that link reads "Case study", as he said earlier in the day, or "View project", as he said here, is not settled.
    - The line of light again: "I don't like the animated line of light that's going through the card faces over the image, especially when I'm not even moving my mouse around them." It was cut in the second round, which went up half an hour before he wrote this. What he describes, with Set in and "View project" on screen, is the first round. What moved it while his mouse was still is the lamp, which drifts on its own when the cursor is idle.
    - **More of an object.** "What do you think about more of a 3D effect when you hover it: it scales up, and you could drag your mouse along the sides of the card to turn the perspective of it in 3D? That's kind of more like what I was envisioning for this." In exact terms: under the pointer the card grows and turns in depth, following where the pointer is on it.
    - "I'm open to additional changes as well to give it more of a 3D look, whether that means increasing the border slightly, having it turn inward to make it look like it has more 3D depth, a bigger box shadow behind it that will appear when the light source hits it."
    - What comes after: "After this next iteration, we should probably hand it over to Claude Code and have him build it onto the site so we can fine tune from there."
- **The third round, built on his word (Nov 13).** He reloaded: "Yes, that light is gone." What he asked for:
    - "For the third round, we don't have to go overboard. We can keep it pretty simple. I just want to get an idea of how much degrees it will turn and how the light will look shimmering around the card."
    - **The way the colors came back is out.** "One thing I don't like though is the animation that makes the screenshots actual color. It's like not very good. I don't like that it comes from a circle. It seems like it lags a bit." The colors spreading from the pointer are in Dropped.
    - "What I'd like to see is a few variations of that and a few variations of the different tilts or 3D effects that you propose, and then once I pick the ones I want we can do a handoff to Claude Code and have him add this to the work page."
    - The frame rate: "The frame rate is a bit low already when hovering the cards. It's probably a code issue, because I don't think we have anything too crazy on this, and it doesn't really need to be fixed because we're about to code the final version in Claude Code anyways." Not fixed here. It goes in the handoff as something to measure and find the cause of.
    - Built at `/lab/work-cards`, one card with a switch for each choice and the grid below it. **Waiting on his picks:**
        - How the picture's colors come back: A · Fade. B · Fade, with the picture coming a little closer. C · Sweep, behind a soft slanted edge from the left. D · Lights first, the picture's darks last.
        - How far the card turns under the pointer: none, 3, 6 or 10 degrees at its edge.
        - Which way it leans: the side under the pointer goes away, or comes toward the pointer.
        - How much it grows: 1.5, 3 or 5 percent.
        - The edge: the thin bead, or a wide rim that turns in to a face that sits lower and throws a shadow onto it.
    - Built as he asked at 10:43: the thin line under the tags, with Live, Evals and Code on its left and the case study on its right. The band keeps the kind of project on its left and the year on its right.
    - Fable's call, his to overturn: the link reads "Case study". He said "case study" and then "view project". "View project" could as well mean the running site, which is the confusion he raised himself.
- **His picks from the third round (Nov 13).** "These are the settings I want to go with." From the switches at `/lab/work-cards`:
    - The picture's colors come back as A · Fade: the whole picture at once.
    - The card turns 3 degrees at its edge under the pointer.
    - It leans away: the side under the pointer goes back.
    - It grows 1.5 percent.
    - The edge is Deep: the wide rim that turns in to a face that sits lower, and throws a shadow onto it.
    - `CARD_LOOK` in `src/components/WorkCard.tsx` holds them, and the study page opens on them and keeps its switches. Still: `reference/studies/26-work-card-as-picked.jpg`.
    - What he passed over is in Dropped. The amounts can still be tuned once the card is on the Work page: "have him build it onto the site so we can fine tune from there".
    - What comes next, in his words: "Let's go ahead and write up the handoff document so this can be built into the current working work page." The agreement for that build is in The stream, "The second pass on the Work page".
- **One size of card, and the Software card is it (Nov 13).** "We need to make all cards the same size. Naturally we should probably use our software development cards as the standard. Every category has a different size. This does limit and set the standard for the amount of content that could be on a card. I currently think the software development cards are pretty much perfect, with one caveat. I think we should keep one row of tags. Currently the AI glasses one breaks that and has four tags that exceed one row, and because we only have one row all the cards should shrink to accommodate this. Currently the other three cards in software engineering have this little space that can accommodate a second row of tags. We should get rid of that and set that as a standard across all categories."
    - In exact terms: at any one screen width, every card in every category is the same size. The Software card sets it: its picture, its band, a title, its description, one row of tags and its foot. The room a second row of tags takes today comes out of every card.
    - It changes "Up to four tags" in the approved base to: as many tags as fit one row.
    - What follows from it: the words are written to fit the card. The card does not grow to fit the words.
    - Fable's calls, his to overturn:
        - A card shows the tags that fit one row, in the order they are written, and no more. On the AI Glasses card that hides the fourth where the card is narrow. Which three it keeps for good is his, since the words are his.
        - His answer (Nov 13): "Regarding the glasses card, I see no issues with it. It's four tags that are perfectly fitting in a single row. I don't care how many tags you can fit in a single row, as long as it's one row." So the call above stands as a rule: one row, as many tags as fit it, and the AI Glasses card keeps its four where four fit.
        - A title is one line. At any one width the description has the same number of lines on every card, the most a Software card needs there.
        - The stand in cards for the other categories become that size. With every card one size a row never changes height, so the stream settling onto a new height, and its test, come out.
        - Claude Code measures how many characters a title, a description and a row of tags can hold, and writes it here, so he has the numbers when he rewrites the words.
    - **How much a card holds, measured on `/lab/work` (Nov 13).** A card is 341 px wide on a page 1100 wide, the narrowest that shows two columns. From 1440 wide up it is 453 px and wider, and its words grow with it, so the counts stop changing there.
        - **A title: 32 characters** to fit one line at every desktop width. From 1280 wide up it holds 36.
        - **A description: about 225 characters.** That is 4 lines of about 61 from 1440 wide up. A narrower card gets more lines, not fewer words: 5 lines of about 52 at 1194 wide, 6 lines of about 48 at 1100.
        - **A row of tags: three tags of up to 13 characters each** to show at every desktop width, or four of up to 9, or two of up to 21. From 1440 wide up a row holds three of up to 17, or four of up to 12.
        - As the words stand today: every title and description fits. Below about 1400 wide the AI Glasses card shows three of its four tags, and below about 1240 wide the Design System Extractor card shows two of its three ("Live component capture" is 22 characters).
        - On a phone a card is about 243 px wide. There a title has two lines and a description 8, and the counts are his when the mobile pass comes.
- **What a card's loop and picture need. Fable's spec, his to change:** one recording a project, of the product doing the one thing that makes it worth a look. Twice as wide as it is tall, 1600 by 800 or larger. Four to eight seconds, ending close enough to where it starts to cut cleanly. MP4, H.264, no sound. The browser zoomed in before recording, so one part fills the frame and its type reads at the card's size. The picture is the first frame, saved as an image.
- **What was in front of him at first: the card derby at `/lab/work-cards` (Study 14).**
    - How the picture rests: 1 · Toned, 2 · Cast, 3 · Etched. Fable recommends Toned. **Cast leans against "Brass is an accent on it, not the whole card"**, because the picture is the largest thing on the card.
    - The layout: A · Set in (the picture inside the card with its own frame). B · Edge to edge (the picture fills the top of the card to the bead). C · Data plate (edge to edge, with a band of dark bronze under the picture that carries the kind, the year and the links, and no footer). Fable recommends C.
    - Facts Fable added to the card, his to overturn: the year. Links straight to the running project, its public evals and its code, where it has them. The words "View project" with an arrow on A and B, an arrow beside the title on C.
    - Facts Fable left off, with the reason: a line of one measured number (it needs new words from him, and the tags already carry it). His role (it is the same on every card). How long it took.
    - Fable's calls in the build, his to overturn: the picture's window is two to one, not sixteen to nine, because his screenshots are wide and a lower window keeps the section shorter. All four years are shown as 2026.

### Skills

- The workbench is the skills piece.
- One fixed light: the desk lamp and the lit monitor. Choosing a skill never relights the desk.
- Skills are never tied to objects on the desk.
- Skills read in wide rows, not narrow columns.
    - **On the home page the rows sit under the desk (Nov 14).** "I like the content under the desk better." Said after seeing both layouts with his real words in the fuller draft. It replaces the line written that morning from his approval of the rough draft, which had the rows in a column beside the desk. The rows beside the desk are in Dropped.
- One animation for skills. Nothing is hidden behind a category.
- **The desk and the section's content come onto the page when the stream reaches them (Nov 14).** "I also want the surge to drive the appearance of these sections: it hits a certain point and my profile picture fades in and the content appears, something similar with the desk as well."
    - In exact terms: Skills is not on the page until the stream's leading end reaches a point. Then the desk appears and the section's content with it. He wrote "the surge". Fable reads it as the stream's leading end as the visitor scrolls, not the surge a change of category sends through Work, and said so to him.
    - It sets "One fixed light" above aside for the arrival only, as Fable reads it: the desk is dark until the stream reaches it, and once lit its lights are fixed and choosing a skill never relights it.
    - Where the points are, and whether things go away again when the stream draws back, are not ruled. Fable's calls are in Open 28.
- **The desk has a real desk's proportions (Nov 14).** "On the skill section, the desk looks weird. It looks very elongated. I understand this is just a rough draft, but that's something we should probably address."
    - In exact terms: the long desk in the fuller draft, about 1160 units long on legs about 220 tall, reads as stretched. The desk is to look like a real desk. How long it is, is not ruled.
- **The skills on the live site are out of date, and his résumé is the newer source (Nov 14).** "Are we limiting the number of skills we have to fit the layout? It just seems a bit lighter than what's currently on my portfolio, which, to be honest, my current portfolio is way out of date. I have much more skills now that I'm capitalizing on versus back when I originally built the portfolio. I can share my résumé with you." He shared it.
    - Nothing was cut for the layout: the live site lists 48 skills and the fuller draft carried all 48. It read lighter because the live site gives each skill a chip with an icon and the draft set them as running lines. His résumé lists 77, in six groups.
    - It changes Open 6 and Words, "His live site's content is the base", for the lists of skills: the résumé's lists are the base. Which skills the site ends up showing is his to say.
- **The desk is A · Bench (Nov 14).** "My favorite desk is option A." "I like what you did with the desk!" Picked from the three rough desks at `/lab/desk`: the joiner's bench, a thick slab on two trestles with a bronze angle over the front edge and two drawers under it. B and C are in Dropped. Fable had recommended B with C's rail.
- **What he wants of the scene on the desk (Nov 14).** "I feel like we could definitely improve on the scene quite a bit in multiple different areas." His notes, each in his words:
    - **The PC is to look higher end, like his PC Builder's.** "I wish the computer looked a bit more higher end though. Let me send you a screenshot of one from my PC Builder." The screenshot is of a build in a glass case with two chambers: three fans over the top, three in a side wall, three in the floor, one at the back, a liquid cooler with a lit ring, four sticks of memory, a graphics card with a lit bar, sleeved cables, a strip of light round the base.
    - **A large desk mat.** "The desk would benefit greatly from like a large mouse pad on it, maybe centered where the user's iPad, Apple pen, keyboard, mouse and camera are? Taking up like 80% of the desk, maybe stopping right before the monitor."
    - **An ultrawide monitor.** "Speaking of the monitor, it looks a bit small on this desk. We could probably go with an ultrawide monitor instead. It would fit really well."
    - **The left of the desk looks vacant.** "I'm hoping those fill the gap on the left-hand side of the desk. It just looks a little vacant."
    - **A wireless keyboard, and a gaming one.** "Another issue I have with the desk is the wired keyboard. Let's get rid of the wire. I use wireless. I think it looks bad." "I tend to enjoy higher end products. Think like a gaming keyboard with RGB lights going on it. Of course we could keep the RGB within our color scheme, but I think we could do something fun with it."
    - **A high end gaming mouse.** "The mouse itself looks like a very old mouse." "For the mouse, same thing. I like high end gaming mice."
    - **A better camera.** "The camera leaves a lot to be desired as well."
    - In exact terms: the things on the desk are his own kind of gear, high end and current, and each is made to the PC Builder's standard. It changes "Nothing new" in the second of the five calls below: the mat is new.
    - Lights stay in the site's colors, as he said of the keyboard and as the fourth call has it for the PC. His screenshot's reds, greens and blues are the PC Builder's own, not this page's.
- **The desk as drawn in the second round is right (Nov 14).** "Yeah, everything looks good here." Its proportions stand: about 2 m long, 0.78 deep and 0.74 tall, seen from the front left and above, about 860 units wide on the page.
- **The lists of skills are the résumé's, as the second round shows them (Nov 14).** The same approval. He did not ask for any of the skills that are on the live site and not on the résumé. They stay off until he says otherwise, and the words are still his to rewrite.
- **The desk as a 3D piece: the five calls, agreed with one addition (Nov 14).** "The only thing that looked potentially off was on the desk you didn't mention the Apple pencil next to the iPad Pro. Besides that, everything looks good that you mentioned."
    1. It is made in code in this repo, as his PC Builder was.
    2. On it: the monitor, the lamp, the keyboard and mouse, his iPad Pro with the Apple Pencil next to it, and his camera. Nothing new.
    3. The desk itself: a dark timber top, a bronze front edge that carries the stream, two drawers with the knob he chose for the sleeping card.
    4. Under it: his PC Builder's case, lit in the site's ember.
    5. The headphones are their own small piece by the title, of the site's own design.
    - In exact terms, his addition: Fable's list said "a tablet". The tablet is his iPad Pro, and its pencil lies beside it.
    - Fable's call, his to overturn: the tablet and the pencil are modeled to read as his, and carry no maker's mark, as with the headphones.
    - It settles Open 5 for this piece, and "One fixed light" above gives way as Open 28 said it would: the PC is a third light, and the desk's own lights are fixed once it is lit.
- **The rows of skills are cut down (Nov 14).** "For the skill section, we have three columns. I think we can remove the second column. It doesn't really add anything, and the first column could use some work too. There's like a catchphrase that's super generic underneath each thing that can totally be removed. It doesn't add anything. I also think the category of the row should be centered with the skills. For full stack engineering, we should probably add a gaming subcategory where we go over the gaming skills that I have, and we should review the skills that we have. We don't have to keyword stuff as much as we do on our résumé and really can only list the big important ones."
    - In exact terms, five changes to each row:
        1. The middle column, the sentence of proof, goes.
        2. The line under each skill set's name goes.
        3. The skill set's name is centered top to bottom against its lists.
        4. Full-Stack Engineering gets a group for his game development skills.
        5. The lists are cut to the big, important skills. The résumé's lists are written to be matched by keyword and the site's need not be.
    - It replaces "The lists of skills are the résumé's, as the second round shows them" below. Which skills stay is his to say. Fable's first cut is in Open 30.
    - He kept the four skill sets. He did not take up Fable's idea of rows that follow a product's path, so the four stand.
- **Three skill sets. Product Leadership is cut (Nov 14).** "I wonder if we should just cut product leadership altogether. I think that's better said on the résumé and on the accomplishment section." He then spoke of "our 3 skills categories", so it is read as decided: AI Product Engineering, Full-Stack Engineering, Design Systems & Craft. Its skills leave the site's Skills section and are said in the résumé and in the accomplishments section when that comes back (Open 26).
- **No numbers on the rows, and more room between a row's groups (Nov 14).** "I think we can get rid of the numbers 1, 2, and 3 on our 3 skills categories. Next, the subcategory skill sections are a bit too close together. Maybe a bit more spacing would be better."
- **A small 3D thing in each row: his question, not a ruling (Nov 14).** "That leaves some space in the skill category sections. AI product engineering, full stack engineering, design systems and craft. I wonder if it makes sense to put a small 3D interactable object there. What do you think? It would fill the void and look pretty nicely, I think." Fable's answer is in Open 28.
- **The stream onto the desk's lamp is fine for now (Nov 14).** "I don't mind the stream on the desk lamp. I think that's fine. It may be updated later, but I'll need to see it in action to know." It is built that way, and he judges it in motion. With it, the third call's "a bronze front edge that carries the stream" becomes "a bronze front edge".
- **A derby for the small 3D things in the rows (Nov 14).** "With the 3D objects, I'd love to do a derby with them." It sets "One animation for skills" above aside for them, as Fable said in bold it would. Which three, and whether they stay, he says after the derby.
- **The stream may turn in to strike each row. His idea, to be seen (Nov 14).** "I also don't hate the idea of the stream turning slightly into the three rows as the stream comes down the page. This could have a striking effect, which makes that row visible. This would give us more strikes, more of a 3D feeling." Not a ruling. It is drawn in the fuller draft's seventh round, Open 28.
- **The stream strikes each row, and the headphones rock (Nov 14).** Asked whether the strikes at the rows and the rocking stay: "yes".
    - **What is thrown at a row's strike lands on the row's borders.** "The strike on the skill sections' 3D objects should allow the particles to fall on the borders within each skill section, so we need to treat the borders as if they're 3D objects." In exact terms: the rules over and under a row are solid things with an edge, as a card's edge is in Work. Shards thrown by a row's strike land on them, rest and fade.
    - **Nothing of a row shows before its strike, its 3D thing included.** "I kind of feel like the 3D objects should just be invisible, completely hidden, and there's just a strike that randomly happens that shows the row, and then the particles land in there and fade out. As you scroll, this happens 3 times." "I'm worried it might look weird to have 3 random 3D objects visible at the bottom of the screen." In exact terms, as Fable reads it and said to him: the strike lands on empty page where the row's thing will be, and the thing, the name and the lists come on at it. The draft already holds a row back this way. The still he saw had everything switched on.
    - **Parked, his idea, for Claude Code if the turn looks soft:** a border down the left of the rows, the same as the others and upright, so the stream bounces between it and the rows in a zigzag and does not just turn. "Not sure how good that would look though. I'm kind of 50-50 on that one. I don't think we have to build that right now. Maybe we can just build it as is, and if it looks soft that's something we could pass into Claude Code later to implement."
- **Each row's 3D thing comes to life when it is struck (Nov 14).** "We'll need some type of animation for the 3D object on the skill sections to come into life when they are struck. I don't know if it's like something that forms out of the surge or what. We can leave that up for Fable to figure out what he thinks would be appropriate. Just want to note that." What the animation is, is Fable's to design. Its proposal is in Open 28.
- **What he wants the three things to be: real things in fine detail, not simple forms (Nov 14).**
    - AI Product Engineering: "all of them seem a bit abstract, which is OK, but I think I want like some super hyper realistic CPU that kind of spins and has like a background and some other aspects to it around it or something."
    - Full-Stack Engineering: "I didn't really like any of the options you gave me. They seemed too simplified."
    - Design Systems & Craft: "I didn't really love the ones that you gave me. I'm thinking something more sophisticated. Think of, like, a painter's paint swatch, and then a paintbrush that kind of like swashes in between them or something. I'm not sure, but that's just something I'm thinking of."
    - In exact terms: each thing is a small scene made to the standard of the things on the desk, a real object with what belongs round it, not a bronze emblem. The CPU and the palette with a brush are his ideas and not yet picks. The first nine options are passed over.
- **His picks for the three things (Nov 14).** "I like option B better for AI product engineering. Option A for full stack and option A for design." From the derby at `/lab/skill-things`:
    - AI Product Engineering: the CPU in its socket, on a square of board with lit traces. Fable had recommended the CPU opened up.
    - Full-Stack Engineering: a screen with its back off.
    - Design Systems & Craft: the palette and brush.
    - The other three are in Dropped.
    - **How they come to life is not ruled.** "The only thing I'm on the fence about is the actual particle stream creating the objects. I'm worried they won't look good. I was hoping in the derby you could show me what that looks like, but the derby was too low quality." In exact terms: he has not agreed to the things being put together out of the strike's shards. The derby could not show it well enough to judge. It is proven at the bar, with the real stream, before it is settled. Open 28.
- **The PC is turned glass side out (Nov 14).** "PC turned glass side out looks good."
- **The first thing the stream strikes in About is the reflector, for now (Nov 14).** "The reflector as the first thing the stream strikes in About is fine as well. I'll have to see it in action though within Claude Code. We may fine tune that later."
- **The headphones hang on a hook, as a real pair would (Nov 14).** "One thing I do want to add to the headphones next to the skill title is like a hook they're hanging on. I want them to feel like they're hanging in 3D space on a hook like you would see in real life. I don't know if adding like a detail of when the stream passes it, they rock a little bit or something to make it seem like they're real would make sense or not, and add to the scene."
    - In exact terms: a hook is part of the headphones' piece, fixed to the page's ground, and the headphones hang from it with their weight showing. The rocking is his question, not a ruling. Fable's answer is in Open 28.
- **The headphones hang at the right of the Skills title (Nov 14).** "What if we put the headphones next to skills title to the right?" In the words' column, beside the title, not over the desk. Of the site's own design.
- **He is willing to approve the desk's design as it stands, for the real build to make much better (Nov 14).** "OK, the desk isn't bad, assuming that Claude Code is going to make this look much better. I think I'm willing to approve the current design." "As far as the desk, you don't have to keep iterating on it, because I know Fable in Claude Code is going to do a whole bunch of work to make this look a lot better. It's important to say where I think the short sides are so they can be iterated on."
    - In exact terms: what is on the desk and where it stands is agreed, as the second round at `/lab/desk` shows it. There are no more rounds of the rough draft in the web chat. The look of it is not approved: everything on the desk is made to the bar in the real build, in Claude Code, and judged there.
    - Where it falls short, in his words, for that build:
        - "The keyboard and mouse still kind of look mid. Same thing with the camera."
        - "The computer could still use a lot of work. It actually doesn't look great at all."
    - **He likes the PC being glass and see through.** "But I kinda like the idea of it being glass and see-through. Maybe if it was turned so we're seeing the side of it instead of the front?" The glass is a like. The turn is a question, not a ruling. Fable's answer is in Open 29.
- **The stream at the desk is open again (Nov 14).** "Another thing I don't love about the desk section is the actual stream that comes down kind of hits the desk in the middle. The stream is pretty noticeable and powerful, so it's gonna steal the show over the scene. Maybe it should come in at a different angle and interact with the desk differently? It running down the edge of the desk was your idea that I was 50-50 on from the beginning, not necessarily something I was wanting to 100% stick with, so I'm open to other options."
    - In exact terms: in the drafts the stream comes into Skills at the middle of the page, lands near the middle of the desk's front edge, runs the edge to the desk's near end and falls off it down the left side. He does not love the landing in the middle, and expects the stream to take the eye from the scene on the desk. He does not hold to the run along the front edge.
    - It puts one line in question: "a bronze front edge that carries the stream", in the third of the five calls above. It is not replaced until he picks a route. Fable's options are in Open 29.

### About

- A big portrait on the right that reacts to the mouse and feels like part of the page, with something like an aura.
- **Two tabs: Professional, which is the default, and Personal (Nov 14).** "I think I only want 2 options here. As far as selections under about me, what if we just did professional, which is the default, and then personal? Personal is where I could go into my overall goals and the kinds of things I want to do, where professional I can talk about my career."
    - It replaces the three tabs that stood here: about me, what I want to do, my plans for the future. They are in Dropped.
- **About's text is a placeholder for now, and is marked as one (Nov 14).** "I'm not super worried about the textual content in the about me. That's something we can come back to later. So for now, the placeholder we have there is fine, but we should definitely mark that as placeholder."
- **His portrait fades in and the content appears when the stream reaches a point (Nov 14).** His words are under Skills, above: "it hits a certain point and my profile picture fades in and the content appears". Until then About is not on the page.
- **The stream passes behind his portrait, and that is what lights him. It does not run over the tabs (Nov 14).** "I don't know if I love the surge running over the options to switch the content of the about section. I feel like that would get in the way. I also really like the idea of the surge going behind my picture and that's what makes the orange hue appear behind my picture, just like it did in examples you gave me."
    - In exact terms: the stream goes behind his portrait, and the warm light behind him comes up because it is there. It does not run along, over or through the three tabs, or anything else of About's words.
    - It replaces what was written here earlier the same day from his "everything looks good here": the stream falling between the words and him, with the tabs standing on a bar it ran along. Both are in Dropped.
    - His idea for the route, not a ruling: "I don't know if that means running the surge on the bottom of the last skill and then having it hook around behind my character or what to do there so it doesn't get in the way of the about me section. I'm open to suggestions." Fable's route is in Open 28.
- **His portrait stands beside the words, level with them (Nov 14).** "On the about section, I feel like my profile picture should be next to the content. Currently, my profile picture sits a good ways above it. I'd like it to be more centered."
    - In exact terms: in the fuller draft his head was about 330 units above the About title and the words began level with his chest. The portrait and the words are to stand side by side, centered on each other top to bottom.
- **The stream does not come in over his head (Nov 14).** "I definitely don't like the stream coming in directly over my head."
    - In exact terms: in the third round the rail ended over his head and the stream dropped from its end into the top of his hair. That is out. It still passes behind him and still stays off the tabs.
    - **His idea for the route. He asked for thoughts, so it is a direction and not a ruling.** "We could put more sun stones or 3D objects for the stream to bounce off of: one kind of where it starts to turn diagonal now, that it hits and goes more towards the right while still falling slightly, just less of a diagonal grade, and then another that it hits that makes it come in at a sharp diagonal angle, preferably right behind my left shoulder, where my trap is, in between my neck and my delt, so right in the middle of my trap, and it should go directly through my body diagonally." "We don't have to use the sun stones. We can figure out other props, maybe more office stuff that makes sense, but I don't know. What are your thoughts?"
    - In exact terms, as Fable reads it: two things for the stream to strike. The first stands at the left under the last row of skills, where the rail's high end is now, and turns the stream to the right on a slope gentler than the rail's 8 degrees. The second stands up and to the left of his portrait and turns it steeply down to the right. The stream goes in behind the shoulder at the left of the picture as it is looked at, half way between his neck and the point of that shoulder, crosses behind his chest on that same line, and comes out low at the picture's right.
    - "My left shoulder" is read as the shoulder at the left of the picture, which is his own right. The stream comes from the left, and the shoulder at the picture's right can only be reached by going over his head. Said to him, his to correct.
    - What the two things are is not ruled. Fable's thoughts are in Open 28.
- **It is his own left shoulder, which is at the right of the picture (Nov 14).** "When I was saying my left side of my trap, I meant like the left of where I'm facing, like from my first person perspective, and from that perspective you put it on the right side. But I see the confusion. You put it on the left side as a third person perspective. So if you could just make it come from the other side."
    - In exact terms: the stream goes in behind the shoulder at the right of the picture as it is looked at, half way along that trapezius, and crosses behind his chest down toward the left. It replaces Fable's reading above. The run from the first thing passes over the top of About to reach the second thing, which stands up and to the right of him.
- **The second thing is a studio light, and the glow behind him comes out of it (Nov 14).** "I noticed that the object looks like studio light. That's actually kind of brilliant. The glow coming off of my background. Can we extend that glow to look like it's coming out of the light? We don't have to completely redo the glow, as that might compromise the image, but somehow extend it so it looks like it's coming out of the light and put it to my right side?"
    - In exact terms: the spotlight stays. The warm light behind him is kept as it is and joined to the spotlight by a spread of light from its lens, so the glow reads as thrown by it.
    - "My right side" is read as the right of the screen as he looks at it, which is where a stream coming in over his own left shoulder puts the light. Said to him, his to correct.
    - He did not speak of the first thing, the reflector. It stays as drawn and is not ruled.
- **The line he drew for the stream behind him (Nov 14).** He marked up a still of the fifth round: "I drew a square where I want the light to point and the line where I want the surge to come behind my about me section's portrait." His drawing is `reference/studies/45-his-line-for-the-stream-behind-him.jpg`.
    - In exact terms: the studio light stays where the fifth round has it, at the right end of the run over About. It is aimed down and to the left along his line, about 52 degrees under level where the fifth round had 64. The stream passes close by his jaw, goes in at the side of his neck over his own left shoulder, crosses behind the whole of his chest, and comes out at the lower left of his portrait, by his other arm.
    - It replaces "half way along that trapezius" above: with the light where he wants it, a line through the middle of that trapezius cannot also cross his chest.
- **His portrait is the background of About (Nov 14).** "My favorite is having my portrait in the background." Picked from the two in the fifth round. It replaces "His portrait stands beside the words" below for where he stands: he is large, behind the section, blended into the ground. The portrait beside the words is in Dropped.
    - **The words sit even with him.** "The text isn't like properly aligned with it. The about me starts way above my head. I'd like to have that a bit more even." In exact terms: in the fifth round About's title began above the top of his head and the words ended at his chest, with half of him below them. The block of words is to be centered on him top to bottom.
    - **Nobody reads About before the full effect is in place.** "We need to make sure that the background comes in at the perfect reading of the about section. I don't want anyone to be able to read it without the full effect in place, if that makes sense." In exact terms: his portrait, the studio light's light and the glow behind him are all on before About's title, tabs and text can be read, and that happens as the section comes to where it is read on the screen. In the fifth round the words came on first, and on a quick scroll were readable for two or three seconds before the glow.
- **A variant he asked to see: his portrait as the background (Nov 14).** "Do you remember that hero we kept talking about that I wanted to use for my about me section, where it actually has my face as like the background and the cursor moves it? Can you give me a variant of that too? I still wanna keep the studio light shining on it, the position of the stream coming in from the side and illuminating the background. But I'm just curious what that would look like more like that hero I'm referring to."
    - In exact terms: the hero he means is the third look of the first derby, where his portrait was large, blended into the dark ground, and moved with the cursor. A second version of About is drawn with his portrait that way, with the studio light and the stream as in the first. Not a ruling: he is curious to see it.

**Skills and About, the first build: the agreement (Nov 14)**

One round in Claude Code. It takes in everything he ruled on Nov 14 for the two sections, which is in Skills and About above, and points to it. "I think we're all good to write the prompt. I know this is a big one and we made a lot of decisions here, so please make sure that we're not missing anything for these two sections." The fuller draft at `/lab/skills-about-draft`, in its seventh round, is the map: `src/skills-about/draft.ts` holds every place, in units of a page 1460 wide. It is a map and a floor to beat, not code to build on.

**What gets built**

*The page and the stream*

1. **One page, `/lab/skills`,** with Skills and then About under it, laid out as the draft has them.
2. **The real stream runs through both,** on a route planned from where things are on the page, by a planner of its own beside `routeThroughWork`. In order, it: comes in at the top middle, as it leaves Work. Strikes the shade of the desk's lamp. Falls on past the desk's near end. Turns in to strike the thing at the left of each of the three rows. Strikes the reflector under the last row, at the left. Runs to the right over the whole top of About, falling about 4 degrees. Strikes the studio light. Is thrown down and to the left along the line he drew, about 52 degrees under level: past his jaw, in behind him at the side of his neck over his own left shoulder, behind the whole of his chest, out at the lower left of his portrait. Falls on toward Contact.
3. **How the path moves.** Outside Work the stream sways as it falls, and "Bolt is for Work. Nowhere else" stands. Two runs are straight because he ruled them so: the run from the reflector to the studio light ("goes more towards the right while still falling slightly"), and the studio light's throw, which he drew as a straight line. The turns at the rows are strikes on a falling path.
4. **Every strike is a real strike,** as in Work: the flash, the sparks, the thrown shards.
5. **What a row's strike throws lands on the row's borders.** The rule over and under a row is a solid thing with an edge. Shards land on it, rest and fade.
6. **The stream is never drawn over him.** Behind his portrait it is hidden by his own outline, and it comes back in under him where the picture has faded away.
7. **It stays off** his head, the tabs, About's words, and everything on the desk but the lamp.
8. **What the stream brings on goes away again** when it draws back above, in the reverse order.

*Skills*

9. **The title, and the headphones at its right on a hook.** The hook is fixed to the page's ground and the headphones hang from it with their weight showing. They rock once, as a real pendulum that loses its swing, when the stream strikes the lamp, and again when the cursor brushes past them. They are made for real with the desk (item 27).
10. **The desk is made for real** (items 27 to 30). The rough bench from `/lab/desk` holds its place only until it is. It comes out of the dark a little before the stream reaches it. The stream strikes its lamp: the lamp comes on at the strike, then the tablet, the monitor, the keys and the PC, left to right, within about a second. Once lit its lights are fixed.
11. **Three rows under the desk:** AI Product Engineering, Full-Stack Engineering, Design Systems & Craft. Each row is a place for its thing at the left, the skill set's name centered top to bottom against its lists, and the lists in their groups with clear room between groups. No numbers, no line under a name, no middle column. The words are `src/skills-about/content.ts` as they stand.
12. **A thing is about 160 units across and a row about 180 tall.** The draft still draws them at 92 and shorter.
13. **Nothing of a row shows before its strike,** its thing included. At the strike the thing comes to life, then the name comes on, then the lists.
14. **The first row's thing is the CPU in its socket** (items 24 to 26). The second and third rows keep their place empty in this pass. Their strikes still land and their words still come on.

*About*

15. **His portrait is the ground of the section:** about 900 units wide, blended into the page at his left, his right and his foot, with the words over its faded left side. It leans away from the cursor, about 40 units from one side of the screen to the other. It is drawn from the sharpest cut out there is (`public/media/portrait-cut-1600.webp`, cut from `reference/portrait.jpg`).
16. **The words are centered on him top to bottom:** the title, the two tabs, the text.
17. **Two tabs, Professional first, then Personal.** The text is the live site's paragraphs as `content.ts` deals them out, under a tag that says Placeholder text.
18. **A change of tab sends a pulse** along the run from over the tab that was pressed, through the studio light and in behind him, and the words change as it passes.
19. **The reflector,** the first thing the stream strikes in About: a round reflector on an arm, made for real as a small piece. He will judge it in motion and may change it.
20. **The studio light,** made for real as a small piece: a studio spotlight on a yoke with barn doors, in the site's bronze and dark metal, at the right end of the run, aimed along his line. When the stream strikes it its lens lights.
21. **The glow behind him comes out of the studio light.** The glow itself is kept as the draft has it: "We don't have to completely redo the glow, as that might compromise the image." It is joined to the studio light by the light that the lens throws down its aim and past his shoulder.
22. **The order About comes on in.** The stream strikes the reflector and runs over the top. It strikes the studio light: the light comes on and he comes out of the dark. It goes in behind him: the glow comes up. Only then the title, the tabs and the text. No word of About can be read before that.
23. **It lands as the section comes to where it is read.** How fast the stream's leading end covers the long run over About is the builder's to set, so that at an ordinary scroll the whole effect is in place with the words in the upper half of the screen, and not a second later.

*The CPU, and how a thing comes to life*

24. **The CPU in its socket, made for real** as a piece in `src/pieces/` behind the piece contract, to the standard of his PC Builder's parts: a processor seated in its socket on a square of board, with the lever, the capacitors, the chokes and the traces round it. It is a chip running a model: the stream's light pulses in it and runs out along its traces. Every light is one of the site's colors. It is lit by the cursor's light and turns a little toward the cursor. It can be seen alone at `/lab/piece/cpu`.
25. **Three ways of coming to life, behind a switch** on `/lab/skills` and on its own page, for him to pick from in motion. He is on the fence about the first: "I'm worried they won't look good."
    - Shards: some of the shards the strike throws fly in, become the thing's parts and lock together, and its lights come on last. The rest land on the borders.
    - Band: a band of light crosses it from the strike and uncovers it, as a card in Work is woken.
    - Flash: the strike's flash lights it and its parts drop the last short way into place. No shard becomes a part.
26. **The other two things wait for his pick** of a way: the screen with its back off, and the palette and brush.

*The desk. Added the same day, on his word: "I say pass it to him and set the quality standard."*

27. **The desk and everything on, under and beside it, made for real,** as a piece in `src/pieces/` behind the piece contract, seen alone at `/lab/piece/desk` and standing in `/lab/skills`. The rough bench at `/lab/desk`, in its second round, is the basic version. What stands where is agreed and its look is not: "the desk isn't bad, assuming that Claude Code is going to make this look much better." The ten things:
    1. The bench he picked, A · Bench: a thick top in dark timber on two trestles, a bronze angle over the front edge with its screws, a stretcher, and two drawers with the knob he chose for the sleeping card. About 2 m long, 0.78 deep and 0.74 tall, seen from the front left and above.
    2. A large mat over about 80 percent of the top, stopping short of the monitor.
    3. A curved ultrawide, whose screen shows real work and is not a flat picture.
    4. A wireless gaming keyboard, lit in the site's colors, with "something fun": its keys light in a wave as the desk comes on, and the keys nearest the cursor's light glow. No cable. Of the rough: "the keyboard and mouse still kind of look mid".
    5. A high end gaming mouse.
    6. His iPad Pro with its pencil beside it, carrying no maker's mark.
    7. A camera of now: a mirrorless body with a fast lens, a second lens and a cap. Of the rough: "the camera leaves a lot to be desired".
    8. The desk lamp, made to take the stream's strike.
    9. The PC: his PC Builder's own case and parts, brought over from its code (`github.com/BrandonChurch93/PC-Desktop-Builder`, public, all of its 3D in code). The build is the one in the screenshot he sent, which looks to be its Atrium case, a showcase with two chambers and glass on the left and the front. It stands under the desk's far end, turned so its long glass side faces the front, in a bay about 520 mm wide, with the drawers moved toward the near end. Lit in the site's colors and not the PC Builder's own, its fans turning. Of the rough: "it actually doesn't look great at all, but I kinda like the idea of it being glass and see-through".
    10. The headphones on their hook by the title, their own small piece, of the site's own design. AirPods Max is the feel he named. Nothing is copied and there is no maker's mark.
    - Nothing else goes on the desk, and no phone.
28. **The standard is his PC Builder's.** `reference/bar/pc-builder-parts.jpg` and `pc-builder-rig.jpg`, and `QUALITY.md`, "What made the PC Builder work". Each of the ten is a finished thing alone on the screen.
29. **It gets there by rounds.** Claude Code iterates, with fresh reviewers each round, until every test passes. If a thing stops getting better, how it is made changes. The bar is never lowered.
30. **Its lights** are the lamp, the lit monitor and the PC, fixed once lit. It is also lit by the cursor's light, which is what shows its form.

*His second prompt, given to Claude Code with the screenshot (Nov 14)*

- "The desk is part of this round. I do not want a stand in there." The real desk goes into `/lab/skills` in place of the rough bench, at whatever stage it has reached, and he is told plainly which of its things are at the bar and which are not.
- "Iterate on it over and over until it is a masterpiece." "If a thing stops getting better, change how it is made. Never lower the bar." Opus builders, and fresh Opus reviewers each round. It keeps going until every test passes.
- Of the PC: "The computer does not look great at all. I like it being glass and see through. Turn it so its long glass side faces me."
- "The headphones by the Skills title are part of this too: their own small piece on their hook, of our own design, with no maker's mark. The same goes for the iPad and its pencil."
- **The screenshot,** as Claude Code read it. The Atrium, from the front left: a large glass panel on the long side with the main chamber behind it, and glass on the short end to its right, with the second chamber and the front ports at the far right. Three fans over the top on a radiator, one with a lit ring at the back wall, three large ones in a column in the end wall, three with lit rings in the floor under a perforated shelf. A lit heatsink beside the socket, a round pump with a lit ring and two sleeved tubes up to the radiator, four lit sticks of memory, a long graphics card with a lit bar and a lit strip under it, sleeved cables in a combed bundle, and a strip of light round the base that falls on the floor. Its colors there are the PC Builder's rainbow. Here every one of those lights is one of the site's colors. The screenshot is not in the repo.

**What is not built in this pass**

- The screen with its back off and the palette and brush.
- A border down the left of the rows for the stream to bounce off. Parked, his idea, for a later round if the turn at a row looks soft.
- Anything for a phone or a screen under 1100 px wide. It shows a plain stand in.
- The words. He writes them.
- The accomplishments section, the hero, Contact.

**Nothing in Work changes**

- He had Claude Code fix things in Work on Nov 14 while this was being planned: "I wanna make sure that that doesn't get overwritten." Whatever is uncommitted there is committed first, as it is.
- `/lab/work`, `/lab/work-blank`, `/lab/stream`, the cards and the buttons draw what they draw before this pass starts. What is added to the stream's shared code is added beside what is there.

**Fable's calls, his to overturn**

- The page's address, `/lab/skills`.
- The empty places in the second and third rows.
- The two straight runs in About, read as his rulings and not as a bolt.
- A thing at 160 units and a row at 180.
- His portrait comes on when the studio light is struck, and the words half a second after the glow.
- The words of both sections are in the page for a screen reader whether or not the stream has reached them. Keyboard focus on anything in About brings the whole of About on at once.
- With reduced motion both sections are on the page from the start, lit, and nothing waits for the stream.

**The first build, as built (Nov 14). In front of him. Nothing in it is approved.**

At `/lab/skills`, Study 25, built in Claude Code by Fable. The reflector, the studio light and the CPU were each made by an Opus builder from a kit (`reference/kits/`), with Fable judging: four rounds for the reflector, three for the studio light, and three for the CPU. Items 1 to 26 are built. Items 27 to 30, the desk, joined the round while this was being built and are not: the desk on the page is still the rough bench. What follows is where it departs from what is written above, the calls made for him, and what is not at the bar.

*Where it departs from a line above. Each was said to him in bold.*

1. **The stream runs faster than the scroll on two runs.** From the reflector to the studio light it takes 0.3 seconds, and from the studio light to behind his shoulder 0.26, however slowly the page is scrolled. It goes against The stream, "On the site it moves no faster than the visitor scrolls". Item 23 gave the builder the first run. The second is Fable's. Carried at the scroll's pace, at 600 px a second the words came on after About's title had left the screen.
2. **Thrown by the studio light, the stream's leading end runs ahead of the scroll,** by 15.5 percent of the screen's height, about 140 px on a screen 900 tall, until it is under his portrait. Everywhere else its end rests two thirds of the way down the screen. Same reason.
3. **The words come on the moment the glow is whole,** 0.26 seconds after the stream goes in behind him, where "Fable's calls" above has them half a second after the glow. The gate he asked for stands: no word shows until his portrait, the studio light's light and the glow are all whole.
4. **Behind him the stream is not drawn at all,** from just inside his outline at his neck to the foot of his portrait, where it is drawn again from nothing over about 70 units, as it is where it begins. Item 6 has it "hidden by his own outline". It still is, at his neck, and its light still rims him there. Shown through his fading picture lower down, it came back along a straight cut across his shirt, which a fresh reviewer failed, and then as a pale line with no color.
5. **The studio light has no cable.** The kit asked for one. Inside the room the light has at the screen's right edge it could only be a stub, so it was dropped.

*Fable's calls in the build, his to overturn*

- **The route.**
    - It comes straight down the middle of the page, as it leaves Work, until 150 units above Skills, and bows from there to the lamp.
    - It strikes the top of the lamp's shade on its upper left, so what it throws goes up and to the left, away from the desk. That strike is lighter than a card's (0.7 of one), keeps half the sparks while the stream lies on it and throws a single shard a quarter as often, so the desk keeps the eye.
    - Its leading end never comes to rest within 22 units above a thing it is about to strike: it goes on and strikes. Resting just short, it sat on the lamp's shade throwing sparks with the lamp dark.
    - At each row it turns in from 62 units above the row's middle to 62 below, and meets the thing 6 units short of its left most point, so its core lies against the thing and not over it. The CPU is met at its near left corner, which is a little above the middle of the board as it is seen, so the CPU stands that much higher and the board sits in the middle of its row.
    - A row's strike faces up and a little to the right, the way the stream is going, so what it throws goes into the row. Nothing is aimed at a border: the pieces fall, and a row's borders are solid, so they land on the border under the row.
    - A shard landing on a row's border keeps under half its usual bounce (0.45 of it), so it comes to rest there and fades. At the usual bounce most were still in the air when their time ran out, and about one in five came to rest on a border.
    - In the studio light the stream goes in at the barrel's upper left side and comes out at the middle of the lens, about 50 px away on a 1440 wide screen. Between the two it is not drawn.
- **What the stream is never drawn over.** The monitor, the mat with everything on it, the PC, the block of About's words, and his outline. A shard whose place is over one of those is not drawn. What the lamp, the reflector and the studio light throw is also let fall less far than what a row throws (60, 24 and 12 units against 150), so it does not rain on the desk, the words or him.
- **How he hides the stream.** His portrait is drawn over the stream, and under it his own outline, filled with the page's ground and a copy of the light behind him, covers the stream. So the stream is cut exactly at his outline and leans with him.
- **The rows' borders are bronze rails the stream draws,** 6 px thick at a 1440 wide screen, in the metal of Work's rail. A row's two borders run out from the stream's side over a third of a second at its strike. The border under a row is the border over the next.
- **When things come on, after the strike or the cue that brings them.**
    - The desk comes out of the dark over 0.8 seconds, from when the stream is 170 units short of the lamp. The lamp is on in the frame of the strike, then the tablet from 0.2 seconds, the monitor from 0.4, the keys from 0.55 over half a second, which is what their wave needs to be seen crossing, and the PC from 0.9, all on by 1.3 seconds.
    - A row: its thing from the strike, its name from 0.4 seconds to 0.7, its lists from 0.58 to 0.94.
    - About: the studio light's light over 0.3 seconds and his portrait over 0.36 from the light's strike, the glow over 0.26 from when the stream goes in behind him, then the title, the tabs and the text 0.05 seconds apart, all whole 0.3 seconds later.
    - Everything goes away again in the reverse order, at the same pace.
- **The headphones** rock about 5 degrees when the lamp is struck and up to 6 when the cursor brushes them, the way the cursor was going, once a little over a second, and are still again in about three.
- **A change of tab.** The old text goes in a sixth of a second, the pulse takes 0.46 seconds from over the tab to behind him, and the new text comes in as it passes, about 0.3 seconds after the press. Pressed while the stream is not behind him, the text just changes.
- **The tone curve of every 3D thing on this page.** The shared stage's curve took the same small amount off red, green and blue in the darks, which turned every warm dark into the same saturated brown whatever it was made of. That was the largest cause of the sepia the reviewers kept failing. The desk, the reflector and the studio light now use the same curve without that step (`src/world/tone.ts`), and the CPU and the headphones are being moved to it. The older pieces (the city, the handheld and the rest) are untouched. The reflector and the studio light look a little different for it: their steel reads as grey steel beside the bronze.
- **At the lamp the stream leaves to the left, nearly level,** and clears the whole lamp before it falls beside the rows. The new lamp's arm and foot are below and to the left of its shade for that.
- **The look of every 3D thing on this page.** Three things running were failed for reading as one orange tone. The rule now given to every builder (`reference/kits/README.md`, "The look"): only copper is orange and it is an accent, everything else is near neutral, every thing has a near black, a mid grey and pale glints, dark parts are drawn by light on their edges, and metal reads as metal by long reflections that slide with the cursor. The desk's lamp and room lights are the palette's pale, where the rough's were a deeper orange.
- **A row's thing is drawn over the stream.** What its strike throws passes behind the thing and lands on the border under the row. Drawn under the stream, the CPU spent the first half second of every way beneath a cloud of the stream's own shards.
- **The switch for the CPU's three ways** is at the foot of the screen. Pressing a way while the stream is on the first row strikes the row again, so the three can be compared in place.
- **The page.** A board 1460 units wide, drawn as wide as the screen up to 2400 px. Type has a least size, so on a screen 1100 wide the lists are 13 px and not 10. There is most of a screen of empty page above Skills and below About, since nothing stands above or below them yet.
- **The small pieces are mounted when the page opens,** not as they come near, so none is being built as the stream reaches it.
- **The reflector's dish** shows the cursor's light moving the other way to the cursor, as a hollow dish does. Struck, it gives a degree or two on its arm.

*What is not at the bar, plainly*

- **The desk. All ten things are made new and on the page, in their second rounds. None has been passed by a fresh reviewer yet: three kinds of reviewers are judging this round.** The rough draft's forms are out of the piece.
    - The bench and the mat, the lamp, the monitor, the keyboard and the mouse, the iPad and its pencil, the camera with its second lens and cap, the PC brought over from his PC Builder's code, and the headphones as their own piece on their hook.
    - What each builder says is still short, in its own words: the PC's inside is mostly dark between its lit parts and its radiator barely shows from above. The mouse shows mostly its back from the visitor's side. The keyboard's glow under the pointer is faint at the page's size. The mat measures a little warmer than the rule for a neutral part. The monitor's depth is plain up close and less so at the page's size. The lamp's inner face cannot be seen from the page's view, so its being on rests on its vents, its rim and its pool of light.
    - Measured on a production build with all of it in: the desk's first frame takes about a tenth of a second once the system has its shaders cached, 296 draw calls and about 1.6 million triangles a frame across every pass. A first visit on a cold cache has not been measured again since the parts were cut down.
- **Test 8, the desk is what is looked at. Failed by a fresh reviewer on the rough desk.** Since then the lamp is made new with its arm and foot below and to the left of its shade, and the stream leaves the shade to the left, nearly level, so it no longer crosses the lamp. Whether the desk now holds the eye at the strike is with the fresh reviewers.
- **The CPU. Fresh reviewers failed it on its second, third and fourth rounds. What is on the page is its fifth, made again by a new builder, with a fresh reviewer now.**
    - The fault that failed it as a thing three reviews running, every material one sepia orange, was mostly the tone curve (above). Under the corrected curve the new builder has a brushed steel plate, a brushed copper lid with a dark etch, a charcoal board with cream legends, plated mounting holes, a layered cut edge and a lever with its hook.
    - The three ways are made again. Shards uses the stream's own shard mesh and shader: the board is 36 jagged tiles that lock together from the struck corner, and each large part arrives as one shard. Band cuts along the eye's rays with a hot line on the cut. Flash lets every part go at once.
    - What its builder says is still short: no crisp rim line along each part's top edge, the mask is charcoal and not near black, a crest of light at the page's size is a short blocky dash, and the first third of a second of Shards reads as a burst more than a stream.
- **The second and third rows strike empty places,** as item 14 agreed. A reviewer who was not told read them as strikes on nothing.
- **Scrolled at 900 px a second,** About's title has left the top of the screen by the time the last of the text is whole. The text itself is still in the upper half.
- **The studio light.** The lower left leaf of its barn doors is close to one flat brown. It throws no shadow on the wall behind it. No cable.
- **The reflector.** Its give on its arm when struck is too small to see at the page's size. The arm's wear is thin.
- **Test 25 at its strictest.** With the processor slowed four times, 3 of 802 frames took over 25 ms, the worst 41. At full speed, none.
- **Not checked:** a real iPad, a real phone, a 4K screen, a screen reader read aloud, Safari itself.

*Measured, in a live page, on a screen 1440 by 900*

- **Nobody reads About early.** A word showing before his portrait, the studio light's light and the glow were all whole: 0 frames of 371 at 300 px a second, 0 of 261 at 600, 0 of 224 at 900, and 0 of 173 after a flick.
- **Where About's title is on the screen when the last of the text is whole.** At 300 px a second, 290 px down. At 600, 76 px down. At 900 it has already left the top of the screen, 168 px above it, with the text still in the upper half. After a flick of 1500 px, the text is whole 0.8 seconds after the page comes to rest.
- **Nothing of a row before its strike.** 0 frames for each of the three rows, of 182.
- **What a row's strike throws.** Of about 78 thrown shards in the rows, up to 19 lie on a border at once, 0.8 seconds after the scroll stops, and they fade there. The rest are in the air, or were thrown to the left of where the borders begin and fall down the margin. In real frames the pieces can be seen lying along the border under each row.
- **Off the things it must stay off.** In every frame of a scroll from top to foot, 331 frames at 500 px a second and 185 at 900, no shard riding or thrown is drawn over the monitor, the mat, the PC, his outline, the tabs or About's words.
- **It goes away again.** Scrolled back up at 600 px a second: the text, the tabs and the title go first, then the glow, then his portrait and the studio light's light, then the last row. Nothing turned back on its way out. Rocked 60 px each way across the studio light's strike seven times, nothing flickered.
- **Frame times, with the whole new desk and the fifth CPU in, on a production build.** The whole page scrolled down and back up at 450 px a second: 808 frames, none over 25 ms. With the processor slowed four times: 3 of 801 over 25 ms. A fresh reviewer is measuring it again, with a first visit and WebKit.
- **Work is as it was.** 51 of 52 stills taken before and after are the same pixel for pixel: 19 of 20 of `/lab/work` and `/lab/work-blank`, all 21 of `/lab/stream`, the 7 of the buttons and the 4 of the card study. The one that differs is Work with reduced motion, which also differs from itself when it is taken twice from the code as it was.

### Contact

- A rocket launch, not a rocket flying through space.
- Nothing depends on a visitor sending a message.
- He likes having something at the bottom that ties the page together.
- **What Contact holds (Nov 14).** "If you look at my current portfolio add a functional contact form. I also give them a way to easily copy my email if needed. I can also provide my phone number right there as well. And I also don't hate putting my location either but I'll leave those up to you. Most important links is a calendar link so they can schedule a meeting with me immediately. Next we should have links for we could put a link to my LinkedIn there as well, but that's probably already going in the footer right?"
    - In exact terms, as Fable reads it: his live site's Contact has a working form (a name, an email, a message), a link that copies his email address and a link to book time on his calendar. The new Contact has all three.
    - **The calendar link is the most important link in the section.** A visitor can book a meeting with him at once. It is the section's primary button and it comes first.
    - **A way to copy his email address stays.**
    - **A working contact form stays.** It replaces Fable's recommendation in Open 7, which was no form.
    - Read beside "Nothing depends on a visitor sending a message": the form is there and it works, and nothing else on the page waits for it. The launch plays whether or not anyone writes.
    - **His phone number and where he lives are left to Fable.** Fable's calls, which he can overturn: no phone number on the page, and one short line that says where he is based and his time zone. The reasons are in Open 31.
    - **LinkedIn.** He asked whether it is already going in the footer. Fable's answer: yes, in the footer with GitHub and the résumé, and not repeated in Contact. Not a ruling until he says so.
- **His verdict on the first wireframe: no (Nov 14).** "I do not love what you did with the contact section. I think all of the content should be on the left-hand side or potentially the right since the about me section has content to the right. I'm not sure to be honest, but I don't like the content being separated. I feel like we should have one section of content and then we should have the rocket maybe slightly off to the side, part of the background, maybe? I'm not sure." "I don't like that the stream hits the tip of the rocket. Your last proposal that we did I signed off on: it went to a pool that filled the bottom of energy and then the rocket blast off from that thing. That was a much better design than what you have here." "The issue I have with the content on the left right now is the layout just looks horrible. It's a mess. The rocket being positioned in the center is kind of tough. It would either need to sit below or on top of the contact form for this to work, or slightly off to one side with the content form laying slightly over the top of it so you can still see what's happening behind the form. I'm not sure. Let's take a moment to brainstorm together. What do you think, and don't just go with the options I'm giving you. Let's really think about the best user experience and user interface possible for the scenario."
    - In exact terms:
    - **All of Contact's content is one block.** It is not split by the rocket. Which side it stands on he is not sure of.
    - **The stream does not strike the rocket.** It runs into a pool at the foot of the rocket, the pool fills with the stream's energy, and the rocket launches from the pool. He counts this as already signed off. The record had it as Fable's recommendation (Open 12) and as drawn in the page sketch (Open 25), where nothing was ruled. His word now settles it.
    - The left column as drawn "just looks horrible. It's a mess."
    - Where the rocket stands is open, in his words: off to one side, perhaps part of the background, below the form, or with the form laid slightly over it so what happens behind can still be seen. None of these is picked.
    - He asked to brainstorm before anything more is built, and for Fable's own thinking and not only his options. What Fable put to him is in Open 31.
- **A derby of the three arrangements (Nov 14).** "Can you actually just make a derby with these three options so I can see them?" He had pressed A in the sketch and stopped it before it was answered, so nothing is picked. In exact terms: A · Beside, B · Behind and C · Below are each drawn on `/lab/contact`, behind a switch, with the one block, the pool and the rocket launching from it. He picks from what he sees.
- **A is the arrangement, if the rocket stays (Nov 14).** "I agree. If we go with the rocket ship, A is the best option. That being said, does the rocket actually fit the rest of the aesthetic here? The work section is giving like ancient wonder vibes, where the skill section is giving more modern technological vibes. We haven't done our accomplishment section yet. That could be used to bridge a gap. We haven't used our card coverings anywhere else. Kind of wish we would use it at least in one more spot. Not saying we have to do it on the contact section if it doesn't make sense. Anyways, I'm open to other 3D objects that aren't rocket ships. I don't hate the rocket ship, and I guess it is like, for going through technological achievements, it's the grand finale I guess."
    - In exact terms: A · Beside is picked on the condition that the piece is the rocket. Whether it is the rocket is open again, by his own question. "A rocket launch, not a rocket flying through space" stands until he changes it.
    - He would like the sleeping card's covering, the engine turned blank with its knob, used in at least one more place. Not a ruling that it is Contact.
    - He reads the page as moving from ancient wonder (Work) to modern technology (Skills), with the accomplishments section as a possible bridge, and the rocket as the finale of that. Fable's answer is in Open 31.
- **Yes to drawing the Sun stone pool and the sleeping plate (Nov 14).** "Yes, let's go ahead and draw them out now. If I like the design, I will cut you up into max mode and have you do a higher fidelity representation of what this could look like." In exact terms: the rocket stays for now, in arrangement A. The pool is drawn as a Sun stone laid flat and the Contact plate as the engine turned blank that wakes by the band, both on `/lab/contact`, for him to judge. Neither is approved until he has seen it. If he likes it, a higher fidelity version follows in the web chat before Claude Code.
- **His look at the third round (Nov 14).** "I like the contact form, but let's have the card appear when the stream hits the pool beneath the rocket. We also need to make sure that when the user scrolls and the stream hits the pool, it's in the optimal position to both view the animation and the contact form with no issues. Instead of book a call, I rather be upfront with the user. They should know they're going to my Calendly link next. The copyable email, do you think we should cut that? Or just turn it into a button that's our secondary, saying copy my email? I don't really see the point of it if they can just send me an email here. Most of the time no one's gonna contact me for my portfolio, to be honest. I'm also in Boise, Idaho. Next, the subheader next to contact, that can probably be removed or put on top. I don't know what would put here that would actually benefit the user."
    - In exact terms:
    - **He likes the plate.** The one plate with the form, asleep as the blank, stays.
    - **The plate wakes when the stream lands on the pool under the rocket,** not when the stream passes the plate's top.
    - **At the moment the stream lands, the screen holds all of it:** the rocket, the stone and the whole plate, with nothing cut off. This is a rule for the build on every size of screen that can hold it.
    - **The calendar button says where it goes.** A visitor knows the next thing they see is his Calendly page.
    - **He is in Boise, Idaho.** The line for where he is based reads from that.
    - **The small tag beside the title goes.** It was Fable's label saying the words were stand ins, not a part of the design, and he read it as a subheader. Nothing takes its place: he sees no line there that would help a visitor.
    - **The email: his question, not a ruling.** Cut it, or make it the secondary button, "Copy my email". "A way to copy his email address stays" above is his own line from earlier the same day and stands until he cuts it. Fable's answer is in Open 31.
- **His look at the fourth round: yes (Nov 14).** "Looks great, let's go with your recommendations and yes, you're cut up. Go ahead and build the higher fidelity mode."
    - In exact terms, what "your recommendations" covers, each as Fable had put it to him:
    - **The email stays, as the secondary button, "Copy my email".** This answers his question above.
    - **No phone number on the page.**
    - **LinkedIn, GitHub and the résumé go in the footer** and are not repeated in Contact. Whether CodePen and YouTube stay there was a question to him and not a recommendation, so it is still open.
    - **The fourth round's design stands:** arrangement A, the one plate asleep as the blank and woken when the stream lands, the Sun stone under the rocket lighting from its rim in on the clock, the rocket launching when the boss lights, and the screen seated for the landing.
    - **A higher fidelity version is built in the web chat next,** before anything goes to Claude Code. It is for the look: the stone as a real relief, the plate as the real blank, the rocket in the page's bronze.
- **How far the higher fidelity version goes (Nov 14).** "Just emphasize I don't want you to build the finalized product, you're just building a more higher fidelity than the mockup you just provided. Claude Code will build the finalized polished version."
    - In exact terms: the web chat's version is a step up from the outline wireframe, enough to show what the section could look like. It is not held to the bar and is not the build. Claude Code makes the finished plate, stone, rocket and launch, from this as its basic version (How we work, the workflow ruling).

### 3D pieces

- The more 3D the better. The pieces do not all follow the city. Each has its own idea.
- Each kind of work can have its own piece.
- Carried over from the second build: the city, the workbench, the handheld (he really likes it), the camera (he is happy to keep it) and the rocket.
- He looked at the five carried pieces on his own machine and they look fine to him. (Nov 11)
- He wants the PC from his PC Builder animated somewhere visible on the site. Not in the hero, and not as the piece for the work section.
- **The handheld, the camera and the PC are cut from the home page's design, and kept (Nov 14).** "Regarding the layout, we no longer need the camera and game, and PC graphics. As of now they are to be preserved but cut from the design."
    - In exact terms: the handheld, the camera and the PC have no place on the home page. Nothing is deleted: the handheld and the camera stay in `src/pieces/` as carried, and the PC stays in its own project.
    - "As of now" is his wording. It sets the line above about the PC aside for now, and Open 3 with it.
- **The 3D work is made new for this design, not recolored (Nov 14).** "The 3D work itself needs to be redone to fit our new design, not just recolored." He said it of the desk, while Skills and About were being planned.
    - In exact terms: the workbench is designed and built again for this page. Moving the carried model onto the new palette is not enough.
    - It changes "they look fine to him" above for the workbench. Fable reads it as holding for each carried piece as its section comes up. He has not said so piece by piece. The city he had already said needs "a massive overhaul".
    - His ideas for what the new desk holds are Open 28. With them he offers the PC a place again, under the desk: "we can put the PC under the desk". Not a ruling until he approves the proposal there.
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
- **What Skills and About say is to be talked through (Nov 14).** "As far as the content of the skill section and the about section, that's probably something that we should discuss. Did you take a look at my résumé earlier? What did you think?" Fable's answer, and what is his to decide, is Open 30.

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
- **The mobile pass (Nov 13).** Phones are designed in one pass, after every section is finished: "Let's add that to the documentation to do a mobile pass when we are finished with all the sections." His reason: the phone is better judged once the whole page can be seen. In exact terms:
    - Until that pass, a screen too narrow for a section's layout shows a plain stand in. On Work that is every screen under 1100 px wide, which takes in an iPad held upright.
    - A stand in is not designed, not polished and not shown to him for approval. What he saw of it on Work is why: the category bar "is really bad looks" and the two sides of the stream never meet again.
    - The pass covers every section together: the layout, the category bar, and the stream's route on one column.
    - Fable's recommendation, not agreed: the phone's speed is still measured as each section is built, so nothing is made that a phone cannot run. That is a cost check and needs no design.
- **If the next pass of Skills and About looks good, it goes to Claude Code, and he and Fable plan the next section (Nov 14).** "Everything looks good on the next pass, I think I'm ready to hand it off to Claude Code to start building, and me and you can start planning on the next section."
- **A basic version is made in the web chat, and Claude Code iterates on it until it is a masterpiece. That holds for 3D pieces too (Nov 14).** "Why didn't we include the desk in the prompt? That's how we worked this whole time. We make a basic version here, and then he iterates on it over and over again until it's a masterpiece. What changed that workflow? I say pass it to him and set the quality standard."
    - In exact terms: Fable had held the desk back for a kit to be written in the web chat, and put a rough stand in in its place. Nothing had changed the workflow, and he was right. A 3D piece goes to Claude Code with its rough draft, his rulings on it and a quality standard, in the same round as the section it stands in. Claude Code writes whatever kits its own builders need.
    - **The web chat's next section is Contact.** "What I wanted to do with you was go ahead and start working on the contact section next."
- When something is ready to show him: run a production build, commit, push to `main`, and give him the live link. He is often on his iPad, which cannot open localhost. (Nov 11)
- **The whole page is sketched before the next section is refined (Nov 14).** His words: "I'd like for you to sketch out the remaining scenes for the big 3D objects. We can just put a simple placeholder for now, but what I'd like to do is go from hero all the way down to footer. Then the plan will be to go section by section, probably doing the hero last." "This is why I want to get this in place, so I can look at everything as a whole. We may completely redo an entire section after you do this. Everything is up for refining."
    - In exact terms: one rough sketch of the home page from the hero to the footer, with stand ins for the big 3D pieces. Then each section is refined the way Work is being refined, starting with the one after Work, the hero last.
    - He said go the same night: "Let's go with your recommendation." "Go ahead and create the plan and build the sketch!" It is at `/lab/home`, and what is in it is Open 25.
    - Fable's conditions, which the sketch is built to: the sketch settles layout and where the stream goes, not look or motion. Stand ins are drawn at each piece's true size and outline. The hero is sketched first even though it is built last. No phones.


## Open

Each line has Fable's recommendation where there is one. None of these are rules yet.

1. **The headline and eyebrow.** The live site says "AI Product Engineer" and "Designer · Engineer · Founder". He is unsure about "Founder".
2. **The software piece.** There is no 3D piece for software yet.
3. **Where the PC animation goes.**
4. **A new 3D art piece** to replace the sculpture. Recommendation: wait until he has 3D art to show.
5. **Imported models.** The second build wrote every model in code. Recommendation: allow real models (Blender, his own sculpts) wherever they look better.
6. **What the skills rows say.** Recommendation: start from the four competencies on his live site.
7. **Contact.** **Decided Nov 14: a calendar link first, a way to copy his email, and a working form** (Settled, Contact). What follows is how it stood. Recommendation: links, a copy email button and Calendly. No form.
8. **A "how this is made" switch** on the 3D pieces. Recommendation: decide when the pieces are in the page.
9. **The résumé.** A page, or only the download button.
10. **The project page design.**
11. **Which projects show** in each category on the home page.
12. **What ties the bottom of the page together.** **Decided Nov 14: the stream runs into a pool at the foot of the rocket, the pool fills, and the rocket launches from it** (Settled, Contact). What follows is how it stood. Recommendation: the stream ends by feeding the rocket's launch.
13. **The rocket as built.** He has not judged it yet.
14. **Whether the site has to meet Section 508** (WCAG 2.0, levels A and AA). He asked whether the buttons do, out of curiosity. Recommendation: yes, checked as each part is built, because the engineers who read the site will check. The buttons' results are in `LOG.md`.

15. **His ideas for the sections, now that the stream exists.** Rough drafts in his words, none decided: "This is just stuff I'm thinking of, it might not look good." (Nov 12)
    - Work: the stream "hits work and then splits and then it goes down each of the sides and then it hits the side of the project cards as they load in so it's timed perfectly", "going down each side, symmetrical framing".
        - **Decided Nov 12.** What came of this is in Settled, The stream, "The stream through Work". The lines under the Work item below are how it got there, kept as history.
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
            - S takes A's straight rows and B's landings, and it breaks no rule about where the stream goes. Fable recommended it.
        - **His pick, and his condition (Nov 12).** Looking at the still of S beside B, with S on the left: "I like option a the best, but we need to make sure the streams look organic and not forced." Fable reads "option a" as the left one, S · Your sketch, because that is the picture he marked up. He has not confirmed that reading. In exact terms, the condition: every turn the stream makes needs a cause that can be seen, such as something it lands on, something that turns it, or its own momentum.
        - **His idea for the turn inward (Nov 12), a question and not a ruling:** "what if we added one of those background 3d objects I mentioned like 2 metal cylinders giving the stream a reason to turn into the center of the 2 row of cards". He marked a spot beside each side, level with the foot of the first row.
            - Drawn the same day as **P · With posts**, beside S in the switch. The stream is thrown off the end of the first card, falls in a bow, meets a post standing just outside it, and is turned in toward the side of the card below. The discs are stand ins.
            - Where it meets the record: `QUALITY.md` fails "a plain box, cylinder or cone where a real object has form", so the real posts have to be objects with form and detail. He said himself that background objects need the whole site to feel like one 3D world. And it is two more things the stream touches.
            - Fable's suggestion, not agreed: make them turned studs in the same copper as the buttons, seen end on and set into the page, so they belong to the interface's metal and not to a new world.
            - Turns in S and P that still have no cause: the sweep in to the button at the foot. In S, also the swing out and the turn in, which is what the posts answer.
        - **His verdict on the posts in the draft (Nov 12):** "Yeah, this looks good." He did not correct the reading that "option a" was S. The posts as real objects are not designed yet.
        - **The foot (Nov 12).** "The last hook though below the 2nd row of cards is still kind of weird and happening for pretty much no reason. I don't mind it if the stream's actually like move naturally and kind of switch directions, but that's too much. What do you propose?" In exact terms: below the second row the stream turns sharply from falling outward to running in toward the View all work button, and nothing there makes it turn. He accepts changes of direction that have a cause.
            - Fable's proposal, drawn the same day as **R · With a rail** beside P in the switch. Not agreed. After the second row the stream only falls. It lands on the high outer end of a thin rail under the grid that slopes down to the middle, and runs downhill along it. The two sides meet on the button at the low point. The rail is the shelf he raised earlier, tilted so that downhill is the cause. It hangs from a small stud at each end, in the posts' metal.
            - It is one more object on each side for the stream to touch, and like the posts it has to be a real object with form, not a plain bar.
            - His verdict on the rail (Nov 12): "Looks good in theory but I would need to see it actual rendered using our actual assets to be sure." So the wireframe has gone as far as it can. The rail and the posts are judged next as real objects with the real stream.
        - **What comes next is not decided (Nov 12).** "We still haven't decided on the card design yet. Should we settle that first before handing this over to Claude code or continue with the stream interaction first with Claude code and finish the cards afterwards?" Fable's answer: the stream's route first in Claude Code, with the test shot's plain card standing in for all four, and the card designed in the web chat alongside. Not agreed yet.
16. **The order the sections are worked in.** He wants them taken one at a time: "my idea should go section by section". Work is first, and within Work the stream's route is built before the card is finished (Settled, "The stream through Work", Nov 12). The order of the rest is not agreed. Fable's list is in `LOG.md`. **Nov 14:** after the accomplishments derby he said: "let's work on the skills and about section together since they will be [stacked] on top of each other", and asked for Fable's thoughts. He wrote "attack on top of each other". In exact terms: Skills and About are designed as a pair, in one piece of work, because one sits directly on the other. Fable agrees. Fable's proposal with it, not agreed: the stream comes into Skills at the middle of the top, where it leaves Work, so the pair holds with or without a section between, and whatever accomplishments becomes takes the stream at the middle and gives it back at the middle. Not started. **Agreed Nov 14:** "Your recommendation is sound." Skills and About are worked on as a pair, the stream comes into Skills at the middle of the top, and a wireframe of the pair comes first. Nothing is built until he has heard Fable's proposal and approved it: "Once I hear your proposal and approve we can build." The proposal is Open 28.
17. **The slim top bar, with the categories docking into it.** Drawn in the wireframe at `/lab/work-draft`: hidden during the hero, and once the category bar has scrolled off, the four categories show in it beside the section's name. He would accept the categories pinned into a bar at the top and does not want them floating over the cards. He has not ruled on the bar. Recommendation: yes.
18. **Work on a phone.** **Decided Nov 13: it waits for the mobile pass** (Settled, How we work). What follows is how it stood. One column. Its route for the stream, and whether posts and a rail have any place there, are not designed. Recommendation: sketch it in the web chat next to the card, while the two column route is being built. It now covers every screen too narrow for two real cards side by side with the stream's room beside them, which takes in an iPad held upright (Nov 13).
19. **The card's look.** "We still haven't decided on the card design yet." To be designed in the web chat. Settled so far is under Cards and buttons. He asked on Nov 12 whether to settle it now, so it goes into the next pass in Claude Code with the stones and the finials, and said yes. He approved Fable's proposal as the base the same night (Settled, Cards and buttons). Still open: which way the picture rests and which layout, from the derby at `/lab/work-cards`. Also open, and his to supply: the Design System Extractor's live link, the year of each project if 2026 is wrong for any, and which four projects go on the home page. **Nov 13:** the layout is settled as C · Data plate, Cast and Etched are dropped, the streak of light is cut and the case study link is named in the corner. Still open: his word on the second round. The hover, which he found underwhelming: Fable's answer is the loop and the stream's strike, and neither can be judged until there are recordings and the card is on `/lab/work`. The page's name, "Case study" for now. His to supply: a recording for each project, the Design System Extractor's live link, the year of each project if 2026 is wrong for any, and which four projects go on the home page. **Nov 13, later:** how the card answers the pointer is settled by his picks from the third round. How it takes the stream is judged on `/lab/work` once the second pass is built.

20. **What the stream does when the category changes.** **Decided Nov 13: the surge, at 1.1 seconds** (first 0.7, changed once he had seen it on the page). What is settled is in The stream, "When the category changes". What follows is how it got there. His words (Nov 13): "I think we should also figure out how the stream animation reacts to categories being changed. I'm thinking something very realistic with its physics. What do you propose?" Fable's proposal, put to him the same day. Talk only, nothing built, not agreed:
    - The law: the stream reacts only where it is, and whenever what it lies on changes, it has to land again. Nothing plays where there is no stream.
    - The press: choosing a category is a blow on the bar at the place that was pressed. The stream lying on the bar jumps there, with a small burst of shards and sparks, as a light contact.
    - The surge: a swell of light runs out along the stream from that place, both ways, and on down each side. The side nearer the press gets it first.
    - Each card lets go as the surge reaches it, and the new card comes up under the stream. The stream strikes it the moment they meet: a strike on the top in the first row, on the side in the second, each with the flare on the rim and the picture warming to its own colors for a moment. First row, then second, because that is the order the surge reaches them.
    - Where the new cards are a different height, the stream below settles onto its new line with weight. It is never cut from one line to the other.
    - Riding shards stay with the stream throughout. Only the strikes throw any.
    - The whole of it is over in well under a second, the new cards' words can be read at once, and a second press cuts in cleanly.
    - With reduced motion the cards change and nothing else moves.
    - Passed over: the stream drawing back up to the bar and running down again. It is the most literal, and it makes the visitor wait.
    - **Against a settled line, said to him in bold:** the surge runs faster than the scroll, and "its speed is capped at the user scroll rate". Fable reads that line as being about the leading end. His to say.
    - It is motion, so it can only be judged built, on his Mac.
    - **A correction to the press (Nov 13).** The stream does not lie along the whole bar. It rests on the bar's two ends. So the press knocks the bar, and the stream jumps where it rests, at both ends, the end nearer the press first and harder. The surge runs down from there.
    - **He asked to see it (Nov 13).** "So your recommendation is the surge? Can you make a derby, a simple one showing that off. To do that right the animation will need to be long enough to appreciate it but fast enough where it doesn't feel slow to the user. Seems tough to pull off."
    - **The derby is at `/lab/work-surge` (Study 15), waiting on his pick.** A wireframe of the section with a line standing in for the stream. A · Surge, at three lengths from the bar to the button: 0.45, 0.7 and 1.1 seconds. B · All at once: the bar is knocked and all four cards change together, with nothing travelling. It plays at real speed or a quarter of it, and shows the whole section or the section at its real size.
    - What the sketch leaves out: cards of different heights, so the stream settling onto a new line is not in it. The real stream, its shards and its light.

21. **What is there before the stream arrives.** His words (Nov 13), after trying the surge on the page: "There's one thing that looks horrible about this and that's the second row, because when you select the categories the stream isn't far enough down to touch the cards, so their whole part of the animation just doesn't fit at all." "One of them is just hiding the cards that the stream isn't touching, which makes me wonder: should we basically hide the entire site unless the stream is [touching it], maybe not everything but a lot of the content. If we did that here we might want to make that a theme throughout the site, but I'm not 100% sure if that's something I want to commit to or not. Kind of 50-50, undecided. Haven't fully thought it out yet." He asked to brainstorm. Nothing is decided.
    - In exact terms: with the category bar on a tall screen, the second row of cards is in view and the stream's leading end, which rests two thirds of the way down the screen, has not reached it. A press changes those two cards with no surge and no strike, beside a first row that got both. That was Fable's call 5 in "When the category changes", and it is what looks wrong.
    - Fable's read of the cause: the stream moves with the scroll, and a press changes all four cards at once. Whatever is lit and readable ahead of the stream has to be changed without it.
    - Fable's proposal, talk only, not agreed: **asleep, not hidden.** What the stream is going to touch rests unlit until it gets there, as the stones and the rail already do: a card is a dark plate with its words low, the cursor's light can still find it, and the stream's first strike wakes it for good. A press then changes a sleeping card for a sleeping card, which shows almost nothing. Scrolling back up never puts anything back to sleep. With reduced motion, or where the stream cannot run, everything is awake.
    - His idea as he said it, hidden until reached: the card is not there at all until the stream arrives, and arrives the way a card does in the surge, coming up under the stream and being struck. It makes the scroll and the press one event. It leaves the lower third of the screen empty as he scrolls, and leaves the stones and the rail standing alone ahead of the cards.
    - For the whole site, Fable's suggestion: the rule would be "what the stream touches wakes when it touches it, and what it does not touch is simply there", so text is never held back. Not to be committed to until he has seen it on Work.
    - **Either way goes against settled lines, said to him in bold:** "A card is always readable. The stream's strike lights it and never hides it", and the test that a card "is never dark waiting for the stream".
    - How to judge it: a switch on `/lab/work` with three settings, as now, asleep and hidden. It is motion, so it is built on his Mac.
    - **Decided Nov 13: asleep.** Settled in The stream, "Three changes to the surge and the cards". The theme for the whole site is still open.
    - **Decided since (Nov 13):** a card sleeps again when the stream draws back, and the blank is D · Engine turned. The stream, "A card sleeps again" and "His pick of a blank".
    - **The theme for the rest of the site: Fable's call, section by section, to be seen in a sketch of the whole page (Nov 14).** "I don't know. I'd have to see it in action to really be sure." "I can leave that up to you. What do you think, a mix? Do it where you think appropriate? I can't imagine it being a huge change to swap out." Not committed to. He decides once he can see the whole page.
    - Fable's answer: a mix. What the stream strikes and wakes is each section's main object, about one a section. Words a visitor has to read, the hero and his portrait never sleep. Each thing wakes in its own way, not as a copy of the cards' blank. The sketch carries a switch, all awake, the mix, all asleep, so he can judge it over the whole page.
    - **His answer (Nov 14): "Let's go with your recommendation."** The mix is what the sketch at `/lab/home` opens on, with Nothing and Everything one press away. He decides the theme once he has scrolled it.
    - **His lean (Nov 13): asleep, as something beautiful.** "I like that they can look like a bronze template or something. We can make them really beautiful." In exact terms: a card the stream has not reached is not hidden. It rests as a blank of itself in bronze, and the stream wakes it. It gets built for him to judge. The settled lines it goes against stand until he has seen it and says so. The theme for the whole site is still not committed to.
    - **Nov 14, for Skills and About:** ruled. Each is brought onto the page by the stream (Settled, Skills and About). Whether the whole site works this way is still his to say.
22. **Whether the cards change one after another or together.** **Decided Nov 13: both sides start together, and no switch.** Fable misread his first message as being about the rows. Settled in The stream, "Three changes to the surge and the cards". What follows is how it stood. His words (Nov 13): "The card switching is staggered, which makes me believe the actual animation is staggered too. I'm curious why this was chosen. I'm assuming the idea was to have it slightly staggered so the particle effects, explosions, would be more noticeable or more theatrical. However, this makes the cards not on the stream look really bad, and maybe the ones on the stream could look better if that wasn't the case. I'm not 100% sure. Maybe we could add in a button to toggle that on and off, to sync it up or something, so I can see both results."
    - Why it is staggered, as Fable told him: it is what the surge is. Each card changes when the front reaches it, the first row before the second and the side nearer the press before the other. He picked that over "All at once" in the wireframe. The reason was cause, not show. The cost is the one he saw: a card the stream has not reached waits for a front that never comes to it.
    - Fable's proposal, not agreed: a switch on `/lab/work`. One way is as now. The other: all four cards change at the press, and the surge still runs down and strikes each card as it passes.
23. **The surge's front needs more power.** **Decided Nov 13: Fable's proposal below.** Settled in The stream, "Three changes to the surge and the cards". His words (Nov 13): "I don't love the way the pulse looks. It's not noticeable enough, and I don't know if you want to make it fatter or add some type of new thing to it, like a little color or some type of ball with lightning surrounding it shooting through the stream. I'm open to anything by the way, those are just things I tossed out, but I feel like it needs to be more noticeable. It needs to have more power to it."
    - Fable's proposal, not agreed: the front is a second leading end, racing down a stream that is already there. A hard hot point, forks of arc reaching off it, sparks shed behind it, the riding shards flung wide as it passes and closing behind it, and the core burning pale for a stretch in its wake. Every part of that is already in the stream he approved, at its own leading end.
    - What it must not be, from his own earlier verdicts: a soft ball of glow, or a color off the palette. Both fail on sight in `QUALITY.md`.
    - **Against a settled line, said to him in bold:** "The arc appears only at the leading end and at the landings."
24. **The stream's path.** **Decided Nov 13: Bolt, as a trial on the route through Work.** Settled in The stream, "The path through Work: Bolt". What follows is how it got there. His words (Nov 13): "The next thing that I really don't love currently is the trajectory of the streams. The strikes feel really good on really good lined up places, but the stream still kind of curves and bends in a way that seems unnatural. And the goal here isn't to keep it 100% natural, like water falling in a perfect stream with gravity. I don't know the properties of this material that we built. All I can say is I want it to feel powerful as you go through the site, with its angles and how it hits things and bounces, and currently it's a bit wavy, which takes away that powerful feeling. The stream itself looks really powerful. I love that. It's just the path of it currently could be heavily adjusted."
    - In exact terms: between the things it touches the stream sways from side to side, falls in bows, and rounds its turns. He wants straight, driven runs and hard angles where it hits and bounces. The stream's own look is not in question.
    - Fable's proposal, not agreed: a path of ricochets. Free runs are straight, with no sway. A contact is a hard corner: it arrives straight, strikes at a point and leaves straight at an angle that answers the one it came in at. Where it lies on something it runs dead straight and breaks off the end. The stops through Work and their order stay as they are.
    - The risk, said to him: a straight glowing line with sharp corners can read as a neon sign or a wire, which fails on sight. The runs are straight like something thrown, not ruled, and it is the body of the stream, its shards and its strikes that keep it from being a tube.
    - **Against what is approved, said to him in bold:** the sway and the rounded turns are part of the test shot he approved at `/lab/stream`. Fable's suggestion is to try the new path on `/lab/work` only, behind a switch, and leave the test shot as it is until he has ruled.
    - **His answer (Nov 13): not a ricochet, and it needs a derby.** "What you're recommending is a big deviation that will have to be derby compared to what it currently is versus what it would look like, and probably a hybrid variation." "My initial thoughts are I actually like the swing. It's kind of unpredictable. It's just it feels like the current path has these harsher bows that look unnatural and take away the momentum of the power right before a strike." "I don't necessarily want everything straight and ricochet bouncing off the walls. I just want to increase the feeling of those strikes when they do happen and make it so the power doesn't feel like it's being lost." "Instead of something bowing in a half circle to change directions, it'd be cool if it kind of went up a little bit to a point and then blasted downwards, still swinging a little bit kind of like it is now. But instead of it moving like a ballerina or flowing water, it's like intentional directed power choosing its next course."
    - In exact terms: the wander of a free run stays. What goes is the round bow where the stream changes course, and any curve in the last stretch before a strike. A change of course becomes a rise to a point and a drive off the other way. The stream comes straight in to a strike.
    - **The derby is at `/lab/work-path` (Study 16), waiting on his pick.** A wireframe, on the surge study's stage. A · As now, the page's route redrawn by hand. B · Ricochet, straight runs and hard corners. C · Point and blast, his description: it wanders on a free run, comes dead straight in to every strike, and where it changes course it ramps up to a point and drives off. The stream can be run down each or dragged down by hand, and today's path can be shown dashed underneath.
    - What Fable saw in the stills, and told him: in C the turned up points at the ends of the title, the bar and the first row sit one above another, and at rest the three together read a little like the eaves of a pagoda. B reads cleanest and nearest to a neon outline.
    - **His verdict on the first three (Nov 13):** "I definitely don't like the point shoot, but honestly ricochet is not bad. I feel like both the one we're using now and ricochet are pretty good with one another, about the same level. I'm hoping to hear other ideas though. What do you think would look good?" C is in Dropped. A and B stand level. Nothing is picked.
    - **Two more, added to the derby the same day, waiting on his pick.** D · Swing and strike: B's hard corners with the swing he likes put back on the long free runs, dying away before every strike, so it arrives and leaves straight. Fable recommends it: it is the two he rates level, joined, and it answers what he said was wrong. E · Bolt: B's corners with a wander made of short straight strokes that change side unevenly.
    - **One more idea, as a switch on the same page: the lunge.** Over the last stretch before a strike the leading end runs ahead of the scroll and lands it. The path does not change. **It goes against "its speed is capped at the user scroll rate", said to him in bold.**

25. **The whole page, sketched (Nov 14). In front of him. Nothing in it is ruled.** At `/lab/home`, Study 18, built in the web chat on his word (How we work, "The whole page is sketched").
    - What it is: a wireframe of the home page from the hero to the footer. A line stands for the stream and its leading end follows the scroll. Grey bars stand for words, which are his to write. The 3D pieces are outlines at the size and place they would have, and his portrait is the real cut out. A switch sets what sleeps until the stream arrives (Nothing, A mix, Everything), another shows or hides the notes, and a third lays the whole page out on one screen.
    - What it is for: the order of the sections, where each thing sits and how large, where the stream goes and what it meets, and how much of the page sleeps. It is not for look, motion, words or the design of any piece.
    - **Changed on his word the same night (Nov 14).** He cut the handheld, the camera and the PC from the design (Settled, 3D pieces). The sketch now goes from Work straight into Skills, and what follows is the sketch as it stands. His two questions about it are Open 26 and 27, each behind a switch on the page.
    - **The stream's route, top to bottom.** Every sideways move has something carrying it:
        1. It leaves the lip of the city and falls to WORK.
        2. Through Work as built and ruled.
        3. The two sides meet under the button, and one stream falls to the desk.
        4. It lands on the desk's front corner, runs down the desk's front edge, is thrown off the far corner and falls down the left margin.
        5. It lands on the high end of a rail at the left of About and runs across the page on it, behind his shoulders. It is thrown off the low end at the right.
        6. It falls down the right margin onto the rocket's flume, runs into the pad, and the rocket lifts. The page ends there.
    - **Each section, and where it comes from:**
        - **Hero.** As the brief has it: words a third of the way down, the city along the bottom with a little over half of it showing. The stream starts at the city's lip, so it first shows after about half a screen of scrolling. The idea of the city assembling out of the stream's facets is not drawn.
        - **Work.** As built.
        - **Between Work and Skills.** Nothing, as the page opens. The handheld and the camera stood here in the first round and he cut them. An accomplishments strip can be switched in (Open 26).
        - **Skills.** The workbench at the left, seen from its other side so its front edge runs down to the left. The title and a few lines at the right, with the four rows of skills under them, beside the desk, as the page opens. The rows across the page under the desk are one press away (Open 27). The PC stood under the desk in the first round and he cut it.
        - **About.** The title, the three tabs and the text at the left, his portrait at the right. A rail like Work's runs across the whole section from high at the left to low at the right and passes behind his shoulders, clear of his head. The light behind him is the stream on that rail. The rail is new and is Fable's proposal.
        - **Contact.** The title, a few lines, a copy email button, a Calendly button and links at the left (Open 7's recommendation, no form). The rocket on the center line of the page, under the city, with its tower at its left and the flume coming in from the right. The stream ending in the launch is Open 12's recommendation.
        - **The footer.** A line and his name.
        - **The top bar.** Slim, hidden during the hero, with the four sections in it (Open 17, not ruled). The categories docking into it is not drawn.
    - **What sleeps in A mix:** the cards, the desk's lamp and screens, and the rocket. The Sun stones' faces light when reached, as settled. Words, the hero and his portrait never sleep. Everything also dims each section's words and his portrait until the stream is there. Nothing leaves all of it on.
    - **Against a settled line, said to him in bold:** Skills, "One fixed light: the desk lamp and the lit monitor." In A mix the lamp and the screens are dark until the stream lands on the desk.
    - **It would change two things he has accepted:** the workbench and the rocket are each drawn from their other side, and he looked at the carried pieces as they are and they look fine to him.
    - **A new thing that would need designing as an object in its own right:** the rail in About, which fails on sight if it looks placed there only to steer the stream.
    - For whoever builds from it: the longest free fall is the rail's end to the flume, about 470 units.
    - Fable's proposed order for refining, after Work: Skills, then About, then Contact and the footer, then the hero last, as he said.
    - Stills: `reference/studies/35-page-sketch-*.jpg` are the sketch as it stands. `34-page-sketch-first-round-*` show the three pieces he cut.

26. **An accomplishments section after Work (Nov 14). His idea, not ruled. Set aside by him the same day, after the derby.** "We should go straight into the skills section after work or add an accomplishments section, note big companies too with logos I've worked with and big career stuff like how many projects I've built and so on."
    - In exact terms: either Work is followed by Skills, or a section sits between them with the marks of the big companies he has worked with and a few career figures, such as how many projects he has built.
    - On the sketch: off as the page opens, and one press away at `/lab/home` (After Work · Accomplishments). Drawn as four figures and four marks either side of the stream, with no title. The stream passes between them and touches nothing.
    - **Against a settled line, said to him in bold:** What this is, "the site never repeats the résumé. It shows the work and says what a résumé cannot." The people who read the site have already read his résumé, and companies and counts are what a résumé holds.
    - Fable's recommendation: go straight into Skills. If he wants the proof on the page, keep it to one quiet strip with no title, as drawn, and not a section of its own.
    - His to settle if it goes in: which companies, whether each lets its mark be used, and figures he can stand behind in an interview. Words has the live site's "twelve years" and "40+ clients" down as needing correction.
    - **His first thought for its layout (Nov 14). Talk only, nothing drawn or decided:** "I was thinking long diagonal cards, maybe a 3D image in each. But that's just one of many possibilities. What are your thoughts on some good options?"
    - Fable's options, put to him the same night:
        - A · His idea, as a stair: three long plates stepping down the page on a slant, words level inside them. The slant is what carries the stream, which lands on the high end of each and runs off the low end.
        - B · Struck medals: each accomplishment a medal in bronze with a beaded rim and its figure in relief, a blank until the stream strikes it. Company marks as small stamps under them. Relief in the cards' own metal, not new 3D pieces.
        - C · A maker's plate: one long engraved plate, like the data plate on a machine, with the figures in engraved fields and the marks stamped along its foot.
        - Passed over by Fable: figures that count up, which every template has, and a shelf of 3D trophies, which is four new pieces to bring to the bar.
    - Said to him: a 3D image in each card is a new piece each, the same week he cut three. A slant here sits one section above the rail that slants across About.
    - Fable's recommendation: B, with C as the quiet one, and all three drawn on the sketch for him to choose by looking.
    - **His answer (Nov 14): "No on C. A and B are fine but I want at least 2 more options."** The maker's plate is passed over. A and B stand as options, not picks.
    - Four more from Fable, the same night. Talk only:
        - D · Drawer fronts: long level plates stepping down the page on a diagonal, like the fronts of an antique cabinet's drawers. Each has a knob of the blank's family at one end and an engraved label. The other reading of his "long diagonal cards".
        - E · Tags on Work's rail: no section at all. Small engraved plaques hang under the rail that already ends Work, and each swings and lights as the stream runs over it. It would change the foot of Work, which is built.
        - F · Stamped bars: long cast bars of bronze lying a little askew, each stamped with a figure, with the companies' marks as hallmarks. The bar itself is the 3D.
        - G · Numerals in WORK's letters: the figures as large lit letters like the WORK title, with the stream striking one as it passes. The marks in a quiet row under them.
    - Fable's recommendation: draw A, B and E.
    - **His answer (Nov 14): "No on E. No on F. No on G."** Tags on Work's rail, stamped bars and numerals in WORK's letters are passed over. Left standing as options: A · the stair of slanted plates, B · struck medals, D · drawer fronts. Nothing is picked.
    - **His question the same night:** "What about the logo cloud, what were your thoughts on that?"
    - Fable's answer, talk only: not as a cloud. A row of grey logos is the most common block on the web, and other companies' marks bring their own colors, which the palette cannot take. The marks go in as one material: stamped into bronze in a single row, each catching the cursor's light, under whichever of A, B or D he picks. A cloud needs four to six marks to read as one, so with two or three each gets its name and one line instead. Only companies he may name in public go in.
    - **His answer, and the derby he asked for (Nov 14):** "Let's go with your recommendation and start a derby, this should include multiple layout options for that section, card options for the content, and multiple options for the logo section layout and design."
        - In exact terms: he accepts the marks as one material and not as a cloud of grey logos. He wants to choose by looking: several layouts for the section, several designs for the card an accomplishment sits on, and several layouts and designs for the companies' marks.
        - Asking for the derby is not a ruling that the section goes in. The line it goes against stands until he changes it.
    - **The derby, built the same night. In front of him, nothing picked.** At `/lab/accomplishments`, Study 19, built in the web chat. Everything on it is bronze relief, in the palette's copper, lit by the blanks' long lights, one wide soft light in front, and the cursor. It is in three parts:
        - **1 · The layout.** Each is the whole section at the page's size, with a line for the stream, which comes in at the middle of the top where it leaves Work.
            - A · Slanted plates: three long plates, each tipped the other way from the one above, with everything on them leaning with the plate. The stream lands on the first, runs along the top of each and drops off its low end onto the next. The marks are one bar under them. The stream leaves at the left.
            - B · Struck medals: four medals either side of the stream, a line or two of words outside each. The stream bounces between them as a bolt, striking the near shoulder of each. Its last stroke lands on the marks, which are two bars at the foot, runs along them and drops between the two. The stream leaves at the middle.
            - D · Drawer fronts: four level fronts stepping down the page on a diagonal, each with a label holder and a knob. The stream lands on a front, runs to its end and drops onto the next. The marks are one bar in the corner the stair leaves open. The stream leaves at the far left.
        - **2 · The card.** One accomplishment, closer: a plate plain and a plate with a picture in relief at its end (his "3D image in each", as relief and not as a new 3D piece), a medal with a beaded rim and a medal with a wreath, the blank a medal is before the stream reaches it, a drawer front with a label holder and a knob, and one with the figure cut into the panel and a ring that hangs from a boss.
        - **3 · The marks.** Struck into one bar. Raised on a token each. Hallmarks, small and close on a narrow band. Named, for two or three companies: a small plate with the name and one line beside it. And the cloud he asked about, as tokens at three sizes, so he can see it against the rows.
        - Two switches at the foot of the screen: the finish (Polished, or Antique: a dark patina with the high points rubbed bright) and the stream's line (on or off). `?finish=antique`, `?stream=0` and `?ui=0` open it on those.
    - What on it is a stand in, said on the page: every figure but 10 years is shown as 00. The four things counted (years, projects, clients, products) are stand in labels. The marks are made up shapes and none is any company's. Grey bars stand for words. A line stands for the stream.
    - Fable's calls in the build, his to overturn:
        - A is a switchback and not a stair in one direction. A stair of long plates that carried the stream one way would run off the page: the stream comes in at the middle.
        - On A everything leans with the plate. Fable had said "words level inside them". Level words on a slanted plate read as a mistake once drawn.
        - A has three plates and B and D have four. A fourth plate makes A taller than Work's grid.
        - Where the stream leaves is different in each, so its fall into Skills is redrawn for whichever he picks.
    - Fable's recommendation: **B · Struck medals, the beaded medal, the marks struck into one bar, Polished.** B is the one the stream shapes most, a medal reads at a glance, and nothing else on the page is round.
    - What is not at the bar, said to him: nothing moves, so nothing is struck or woken. The stream is a line. B's first stroke comes in on a slant with nothing drawn to cause it. On a screen with one pixel to a point, the reflections in the tightest bevels still shimmer a little.
    - **His verdict on the derby (Nov 14): not what he pictured. The section is set aside.** "I think we're misaligned on this section, I was envisioning something with more textural content and not badges. Let me put some more thought into this and let's skip this section for now and come back."
        - In exact terms: none of the three layouts, the cards or the marks is picked, and none carries forward. He pictures the section as mostly written content, not as medals, tokens or other badges. He wrote "textural". Fable reads it as textual, and said so to him.
        - He is thinking about it and brings it back himself. Nothing more is designed for it until he does.
        - Where it goes when it comes back, in his words: "the accomplishment section will bridge the gap between them and Work", where "them" is Skills and About. So the order is Work, accomplishments, Skills, About.
        - The page at `/lab/accomplishments` stays up as a record.
        - What Fable took from it: he was asked which layout and never what the section says. The first question when it comes back is what the words are.
27. **The rows of skills beside the desk, as the mirror of About (Nov 14). His question. Decided the same day, twice: beside the desk from the rough draft, then under the desk once he saw both with his real words** (Settled, Skills). "Should we mirror the about section with the 3D desk object? And have the skills on the right side of it?"
    - In exact terms: About is words at the left and his portrait at the right. Skills would be its mirror: the desk at the left, and the title with the rows of skills at the right of it.
    - On the sketch: this is how `/lab/home` opens (Skills rows · Beside the desk). The rows across the page under the desk are one press away.
    - **Against a settled line, said to him in bold:** Skills, "Skills read in wide rows, not narrow columns." Beside the desk each row is about 490 units wide and runs to two lines. Under the desk each is 1160 wide and one line. They are still rows, one skill set to a row, and not pillars side by side.
    - Fable's recommendation: yes, beside the desk. It is shorter by about 190 units, the desk and the words read as one thing, and with the rail between them Skills and About answer each other across the page. The rule stands until he changes it.
28. **Skills and About as a pair: his ideas for the desk, and Fable's proposal (Nov 14). Put to him. Not approved, nothing built.**
    - His ideas, in his words: "we can increase the length of the desk to match the length of the skills content better, we can put the PC under the desk, and even hang a pair of headphones on the background near the skills section, think AirPods Max."
    - In exact terms, as Fable reads them, said to him:
        - The desk and what is round it grow to the size of the block of skills beside them: a longer desk, the PC standing under it, and a pair of over ear headphones hanging on the page's own ground above it, near the title.
        - "Length" could also mean a desk as wide as the rows with the rows under it. The wireframe carries both, behind a switch.
        - The headphones are of the site's own design. AirPods Max is the feel he named, and another company's product is not copied.
    - **Fable's proposal. The workshop, then the person who works in it, joined by the stream.**
        - **Skills.** At the left, the desk scene, as tall as the skills beside it: the headphones on a hook on the page's own ground, the long desk, the PC under the desk at its near end. At the right, the title, a few lines and the four rows, with the live site's four competencies as their words.
        - The stream comes in at the middle and lands on the desk's near corner, over the PC. The lamp and the screen come on and the PC starts. It runs the desk's front edge to the left and is thrown off the far corner, down the left side.
        - One animation for skills: the four rows come on one after another as the stream runs the desk. No row is tied to a thing on the desk.
        - **About.** The title, the three tabs and the text at the left, his portrait at the right, large, answering the cursor. A rail of Work's own family, the same bar with its Blade ends, runs from high at the left to low at the right behind his shoulders. The stream on it is the light behind him. It is Work's rail again, not a new object.
        - Changing a tab sends a pulse along that rail, as a change of category sends a surge through Work. For the build, not the wireframe.
        - The stream leaves at the right, toward Contact.
    - **What would be built first, if he approves:** a wireframe of the two sections at the page's size at `/lab/skills-about`, Study 21. The desk scene as outlines at its true size, his real portrait, the live site's words, and a line for the stream that follows the scroll. Two switches: the rows beside the desk or under it, and the desk asleep until the stream lands or always lit. Not in it: the look, motion, the 3D itself, phones.
    - **The desk as a 3D piece comes after the wireframe**, as its own piece of work: the wireframe fixes its size, its angle and what stands on, under and above it. Then drafts of the desk, his pick, and the build. `CLAUDE.md` gives contained 3D objects to Opus, with Fable designing and judging.
    - Fable's ideas for the new desk, none agreed: a front edge made to carry the stream, a band of bronze like the rail. Drawers with the knob he chose for the sleeping card. The PC lit in the site's own ember.
    - **Against settled lines, said to him in bold:**
        - Skills, "Skills read in wide rows, not narrow columns": the rows beside the desk (Open 27).
        - Skills, "One fixed light: the desk lamp and the lit monitor": the PC is a third light, and a desk asleep until the stream lands is dark at first. Fable's suggestion if he wants both: the line becomes "the desk's own lights are fixed, and choosing a skill never relights it".
        - 3D pieces, the PC "cut from the home page's design": it comes back for the PC only.
        - `QUALITY.md`, fail on sight, "any white, blue or rainbow": the PC Builder's lights are blue and purple. Under this desk they are the palette's.
    - **His answer (Nov 14): two changes, and go.** "What if we put the headphones next to skills title to the right? I also want the surge to drive the appearance of these sections: it hits a certain point and my profile picture fades in and the content appears, something similar with the desk as well. If that sounds good, you're welcome to build the rough draft." Both changes are in Settled, Skills and About.
    - **The rough draft, built on his word (Nov 14). In front of him. Nothing in it is picked.** At `/lab/skills-about`, Study 21, built in the web chat. A wireframe of the two sections at the page's size: a line for the stream whose leading end follows the scroll, the desk scene as outlines, his real portrait, and grey bars for most words.
        - What the stream does, in order: comes in at the middle. As it nears the desk, the desk comes out of the dark. It lands on the desk, and the lamp, the screen and the PC come on and the title and headphones appear. It runs the front edge and the four rows come on one after another. It is thrown off the far corner and falls down the left side. It lands on the rail, and About's words appear and his portrait fades in. It passes behind his shoulders and the light behind him comes up. It leaves at the right.
        - Three switches at the foot of the screen: the rows beside the desk or under it, everything appearing with the stream or all showing, and the numbers on the drawing on or off. `?rows=under`, `?appear=all`, `?notes=0`, `?whole` and `?ui=0` open it on those.
        - Rows under it draws the other reading of "the length of the desk": a desk as long as the rows are wide, the title and headphones over its right half, the PC under its far end, and the stream landing on the middle of its front edge.
        - The words: the four competencies' names and the line under each are his live site's, as they stand. The live site's About is one block with no tabs, so About's text is grey bars under the brief's three tabs.
    - Fable's calls in the build, his to overturn:
        - The desk comes out of the dark a little before the stream lands, 170 units above it, so the stream has something to land on. Its lights and the words wait for the landing.
        - About's words and his portrait come on where the stream lands on the rail, at the section's left. The light behind him waits until the stream is behind his shoulders.
        - Everything goes away again when the stream draws back above its point, as a card goes back to sleep.
        - The rail is on the page from the start, like Work's.
        - The headphones, the PC and the desk are plain outlines, none of them a design.
    - What is not in it, said to him: the look, motion, the 3D, phones. A tab change is not drawn.
    - What it showed: along the desk's front edge the stream's end travels much further than the page scrolls, because the edge is nearly level. The four rows come on within about 90 units of scroll.
    - Stills: `reference/studies/38-skills-about-*.jpg`.
    - **His verdict on the rough draft (Nov 14): "This looks good."** Fable had recommended keeping the rows beside the desk and the appearing as drawn, things going away again on the way back up included. Both stand.
    - **What he asked for next, the same message:** "I think we can go ahead and start working on that 3D piece. We can also make a higher fidelity draft as well with actual content. This will give me an idea on the animations, timing, surge, everything else before we hand it over to Claude Code for a major refinement."
        - In exact terms: the desk starts being planned as a 3D piece. And a fuller draft of the two sections is made in the web chat, with the real words in place of grey bars and the animations and their timing roughed in, for him to judge before Claude Code refines the sections for real. "Surge" is again read as the stream bringing things on.
    - **The fuller draft, built on his word (Nov 14). In front of him. Nothing in it is picked.** At `/lab/skills-about-draft`, Study 22, built in the web chat. The same pair, with his live site's words in place of the grey bars and the motion roughed in.
        - The words: the four competencies whole, as the live site has them: the name, the line under it, the sentence of proof, and the lists under their labels (Building, Proving and so on). About's four paragraphs are the live site's, dealt out under the brief's three tabs by Fable: the second and third under "About me", the first under "What I want to do", the fourth under "My plans for the future". "Twelve years" and "40+ clients" are shown as they stand and named on the page as down for correction.
        - What moves: the title and the headphones come on. The desk draws itself out of the dark as the stream nears, and its lamp, its screen and the PC's fans come on where it lands. Each row of skills comes on with a rule that runs out from the stream's side, then its words a beat apart. About comes on in two beats: his portrait and the title where the stream lands on the rail, then the tabs, the words and the light behind him as the stream passes his shoulders. A change of tab sends a pulse down the rail and the words change as it passes. Everything goes away again when the stream draws back.
        - Switches at the foot of the screen: the rows beside the desk or under it, full or half speed, and Play again for Skills and for About. `?rows=under`, `?speed=half`, `?whole` and `?ui=0` open it on those.
        - Fable's calls in the build, his to overturn:
            - **A row comes on when the stream's leading end is level with it**, not as the stream runs the desk, which is what the proposal said. With his real words the third and fourth rows are below the screen while the stream is on the desk, so they would have come on unseen.
            - About in two beats, as above. In the rough draft the words came on with his portrait, while most of them were still below the screen.
            - The stream's leading end is held to a top speed along its line, so a nearly level run can be watched. The desk's front edge takes about half a second at a quick scroll and the rail about two thirds of one, and the end falls behind the scroll and catches up.
            - With the rows beside it the desk stands 280 units lower than in the rough draft, against the upper rows.
            - Type sizes and spacing are a first pass.
        - **What it showed, plainly:**
            - **His real words stand more than twice as tall as the grey bars did.** Beside the desk a skill set is about 250 units tall and the four are about 1170, against a desk scene about 470 tall. It leaves the left side empty for about 400 units over the desk and about 450 under it, with only the stream there. The section is 1500 units tall.
            - Under a long desk each skill set is one band 152 tall, in three columns: the name and its line, the sentence, the lists. The four are about 610 tall and the section is 1530. So beside the desk is no longer the shorter layout, which was one of Fable's reasons for it.
            - Under the desk the stream falls down the rows' left edge, so each band comes on right beside it. Beside the desk the third and fourth rows come on at the right while the stream is at the far left.
            - Under the desk is his own first idea as he wrote it: "increase the length of the desk to match the length of the skills content better". A desk can be made as long as the rows are wide. It cannot be made as tall as a column of them.
            - What under the desk loses: Skills is no longer the mirror of About. The stream lands on the middle of the desk's front edge, not on a corner. The long desk's right half needs things of its own to stand on it.
        - **Fable's recommendation, against a settled line, said to him in bold:** the rows go under a long desk. It goes against Skills, "On the home page the rows sit beside the desk (Nov 14)", which Fable had recommended from the grey bars. It is the older line as written: "Skills read in wide rows, not narrow columns." The rule stands until he changes it, and the draft opens on the rows beside the desk.
        - The pick sets the desk's size, so it comes before the three rough desks: about 590 units wide beside the rows, about 1160 under them.
        - What is not in it, said to him: the look, the 3D, the stream itself (still a line), phones. Motion was not judged in the web chat, which draws in software: what was checked is the order things come on in, where the screen is when they do, and that they go away again.
        - Stills: `reference/studies/39-skills-about-draft-*.jpg`.
    - **His verdict on the fuller draft (Nov 14).** Four things, each in Settled, Skills and About: the rows go under the desk. The long desk "looks weird. It looks very elongated." His portrait "should be next to the content", "more centered". And the skills are out of date on the live site, with his résumé as the newer source, which he shared.
    - **The second round, built on his word (Nov 14). In front of him. Nothing in it is picked.** The same page, `/lab/skills-about-draft`.
        - **The desk.** Worked out from real sizes and not plotted by eye: 2 m long, 0.78 deep, 0.74 tall, seen from the front left and above with nothing vanishing, 400 units to a metre. About 860 units wide and 620 tall with what stands on it, against the first one's 1160 long on legs 220 tall. Four legs, the PC under its far end, and a monitor, a lamp, a tablet, a keyboard and mouse, a notebook and a mug on it. Its front edge runs down to the left at about 12 degrees, the slope of Work's rail. The stream lands a little right of the middle of that edge. Still outlines, and what stands on it is not a design.
        - **The skills.** The résumé's 77, word for word, in its six groups under his four skill sets: AI Engineering and AI Evaluation & Safety under AI Product Engineering. Full Stack under Full-Stack Engineering. Frontend & Design and Accessibility under Design Systems & Craft. Client & Product under Product Leadership. Which group goes under which set is Fable's call. Each set's name and the two lines beside it are still the live site's.
        - On the live site and not on the résumé, his to keep or let go: Three.js, motion design, typography and layout, information architecture, Vercel, data pipelines, AI observability, context engineering, workshop facilitation, hiring and mentorship, zero-to-one launches. The résumé he shared is the one aimed at forward deployed roles.
        - A row is as tall as its words now, read off the page, so the four are 258, 168, 217 and 168 units tall. A skill never breaks across two lines.
        - **About.** The title and the tabs stand on a level bar, and the words hang under it. The stream falls down the left of the rows, lands on the bar's left end and runs along it under the tabs. A change of tab sends a pulse along the bar from the tab that was pressed. The bar is the tabs' own, as the category bar is Work's.
        - Two ways for the stream to pass him, behind a switch (`?about=behind` opens the second):
            - **Beside him**, which the page opens on. The bar is as long as the words. The stream falls off its end between the words and his portrait, where he is looking, and goes on down the middle of the page toward Contact. His portrait is centered on the words.
            - **Behind his shoulders.** The bar runs on across the page behind him, as the rail did in the rough draft. His shoulders are about 58 percent of the way down the picture, so with the bar there his head stands about 95 units higher than centered.
        - **It changes something he approved in the rough draft, said to him in bold:** the sloping rail behind his shoulders is a level bar, and as the page opens the stream no longer passes behind him. Fable recommends beside him, since centered is what he asked for.
        - What comes on, in order: About's title where the stream lands on the bar, the tabs and the words as it runs under them, his portrait as it leaves the bar's end, the light behind him as it falls beside him.
        - Gone from the page: the rows beside the desk and their switch.
        - What is not right yet, plainly: the bar is level, so the stream crosses it in about half a second however slowly the page is scrolled. The right side under his portrait and the left side under a short tab's words are empty. The lamp's head is a box.
        - Stills: `reference/studies/41-skills-about-draft-2-*.jpg`.
    - **His verdict on the second round (Nov 14): "Yeah, everything looks good here."** The stream beside him, the desk's proportions and the résumé's skills are in Settled. So are the five calls on the desk, with the Apple Pencil added beside his iPad Pro.
    - **His second thoughts on About (Nov 14), in Settled, About:** the stream is to pass behind his portrait, which is what lights him, and to stay clear of the tabs. He asked for a route.
    - **The third round, built on his word (Nov 14). In front of him.** The same page, `/lab/skills-about-draft`. Fable's route, which is his own idea given something to carry it:
        - Work's rail comes back as the line between Skills and About. Its high end is at the left under the last row of skills, where the stream comes down beside the rows. It slopes down to the right at about 8 degrees and ends over his head.
        - The stream lands on the rail's high end, runs it, falls off its end and drops behind his portrait. It is not seen behind him. The light behind him comes up as it passes, and it comes out under him where the picture has faded away, and goes on down toward Contact.
        - The title, the tabs and the words hang under the rail's high end. The stream is never on them. The tabs are plain, with a lit line under the one that is chosen.
        - His portrait stands beside the words as before, with its top just under the rail's low end.
        - What comes on, in order: About's title where the stream lands on the rail, the tabs and words as it runs over them, his portrait as it nears the rail's end, the light behind him as it drops behind his head.
        - A change of tab still sends a pulse: down the rail from over the tab that was pressed and in behind him. Fable's call, his to cut if that too is in the way.
        - Gone from the page: the level bar the tabs stood on, the stream between the words and him, and the switch between the two.
        - What is not right yet, plainly: the rail's 8 degrees is gentler than Work's 12, so the stream covers its 940 units in about 0.8 seconds on a quick scroll and falls behind the page. Under a short tab's words the left side is empty.
        - Stills: `reference/studies/43-skills-about-draft-3-*.jpg`.
    - **His verdict on the third round (Nov 14), in Settled, About:** "I definitely don't like the stream coming in directly over my head." He gave a route of his own, two things for the stream to strike, and asked for thoughts on what the two things are.
    - **The fourth round, built on his word (Nov 14). In front of him. Nothing in it is picked.** The same page. His route, drawn:
        - The first thing stands at the left under the last row of skills, where the stream comes down. The stream strikes it and runs to the right, falling 4 degrees, for about 560 units. There is no rail under it.
        - The second stands over the gap between the words and his portrait, about 80 units under the top of About. The stream strikes it and is thrown down to the right at 58 degrees.
        - It goes in behind his shoulder at the left of the picture, 29 percent of the way across his portrait and 54 percent of the way down: half way between the side of his neck and the point of that shoulder, measured off the picture's own outline.
        - It crosses behind his chest on the same line, about 300 units, comes out under him where the picture has faded away, and falls on toward Contact.
        - It clears his face by about 100 units, the end of the tabs by about 140, and the words by more.
        - What comes on, in order: About's title at the first strike, the tabs and words and then his portrait as the stream runs over them, the light behind him as it goes in behind his shoulder. A change of tab sends a pulse along the run, through the second thing and in behind him.
        - Gone from the page: the rail and its Blade ends.
    - **Fable's thoughts on what the two things are, which he asked for. Not agreed.**
        - Not more Sun stones. A stone carries a face, and a lit face beside his own competes with it. A stone also throws the stream as a ricochet, and a ricochet that lands exactly behind a shoulder looks arranged.
        - Not loose things from an office. Nothing holds them up on the page, and the desk a screen above is already the office.
        - **Fable's pick: the two things that steer light on a portrait set.** A round reflector, which bounces it, and a spotlight on a yoke with barn doors, in the site's bronze and dark metal, which the stream goes into and which throws it where it is aimed. His portrait is lit the way a studio portrait is lit, with a warm light behind the sitter at the shoulder, and a spotlight makes that literal: the stream is the light behind him. It is about him as well, since photography is one of the kinds of work the site shows.
        - It gives the page one idea from Skills down: the stream switches each thing on. The desk's lamp (Open 29), the spotlight on him, and at the foot of the page the rocket's engine (Open 12).
        - Each is a contained 3D piece, made new. The draft draws them as outlines.
    - What is not right yet, plainly: the band between the last row of skills and About's title is about 270 units of nearly empty page. Under a short tab's words the left side is still empty. The line reads as landing on his shoulder until the real stream is seen drawn behind his portrait. Motion is not judged here.
    - Stills: `reference/studies/44-skills-about-draft-4-*.jpg`.
    - **His verdict on the fourth round (Nov 14), in Settled, Skills and About:** the shoulder he meant is his own left. The studio light is "kind of brilliant", and the glow behind him is to come out of it. Two tabs, Professional and Personal. The rows of skills lose their middle column and the line under each name, the name is centered against its lists, Full-Stack Engineering gets a game development group, and the lists are cut to the big ones. About's text is a placeholder and is marked as one. He asked to see his portrait as the background, as in the first derby's third look.
    - **The fifth round, built on his word (Nov 14). In front of him.** The same page.
        - **The route.** From the first thing the stream runs to the right over the whole top of About, falling 4 degrees, about 1,230 units, and passes about 130 units over his head. The studio light stands up and to the right of his portrait. It throws the stream down to the left at 64 degrees, to go in behind his own left shoulder, 72 percent of the way across his portrait and 54 percent down. It crosses behind his chest and comes out under him.
        - **The light.** The glow behind him is as it was. The studio light throws a soft spread of light from its lens, down its aim and past his shoulder, which runs into the glow. The spread comes on when the stream strikes the studio light, and the glow when the stream goes in behind him.
        - **Two tabs,** Professional first. The live site's paragraphs are dealt out as they stand, two to each, under a tag that says Placeholder text.
        - **The rows.** A name and its lists, the name centered against them. Four rows now stand about 400 units tall together, where they stood about 640.
        - **The lists, Fable's first cut, his to change:** 58 skills, down from 77. Kept: the big ones. Gone: the doubles and the keywords (as "Generative AI" beside "LLMs", "JavaScript" beside "TypeScript", "HTML5", "CSS3", "REST", "GitHub Actions" beside "CI/CD"). New: Game Development under Full-Stack Engineering, as Unreal Engine, Unity, C++, C#, Three.js and Blender, from what he has said of his game work. Three.js was not on the résumé's list. `src/skills-about/content.ts` holds them.
        - **His portrait behind the section, behind a switch.** `?portrait=back`. His portrait 900 units wide where it was 580, blended into the ground at its left, its right and its foot, with the words over its faded left side. It moves with the cursor about three times as far. The studio light, the stream and the glow are as in the first, scaled to it.
        - **Changed the same hour to the line he drew** (Settled, About, "The line he drew"): the studio light stays where it is and throws the stream at 52 degrees, in at the side of his neck 47 percent of the way down his portrait, behind the whole of his chest, and out at the lower left by his other arm. The stills are of this.
        - Fable's calls, his to overturn: the first thing is still the reflector. His portrait comes on a third of a second after About's title and not when the stream reaches him, since the run to him is long.
    - What is not right yet, plainly:
        - **The run over the top of About is long and nearly level.** On a quick scroll the light behind him comes up about a second and a half after About's title. `QUALITY.md`, "A nearly level run outruns the scroll". How the stream's end moves along it is for the real build to judge.
        - On his line the stream passes about 15 units from his jaw before it goes in behind his neck. That is as he drew it.
        - The spread of light is a blurred shape. It shows where the light goes and is not a look.
        - Motion is not judged here.
    - Stills: `reference/studies/45-skills-about-draft-5-*.jpg`.
    - **His verdict on the fifth round (Nov 14): "Almost perfect."** In Settled, Skills and About: his portrait is the background, the words sit even with him, nobody reads About before the full effect is in place, Product Leadership is cut, the numbers go, and a row's groups stand further apart. He asked what Fable thinks of a small 3D thing in each row.
    - **The sixth round, built on his word (Nov 14). In front of him.** The same page.
        - **About.** His portrait behind the section is the only one. The block of words is centered on him top to bottom: the title starts about level with his brow, where it started above his head.
        - **The order About comes on in.** The stream strikes the first thing and runs over the top. It strikes the studio light: the light's spread comes on and he comes out of the dark. It goes in behind him: the glow comes up. Half a second after that the title, then the tabs, then the text. Nothing of About's words is on the page before then. By the scroll, that is when the line two thirds of the way down the screen reaches his neck, which puts the title in the top third of a screen 900 px tall.
        - **Skills.** Three rows. No numbers. A row's groups are 20 units apart where they were 8. Each name is on one line.
        - **A stand in for a small 3D thing beside each name,** 92 units across: joined points, a stack of plates, a block made of blocks. Outlines that mark a size and a place. Not designs, and not agreed.
    - **Fable's answer on a small 3D thing in each row, which he asked for. Not agreed.**
        - Yes, with four conditions. One to a row and three in all, made as one family in the site's bronze. Lit by the cursor's light and turning a little toward it, which is the site's own signature. About 90 units across, so the desk stays the piece of the section. Each stands for its skill set and for nothing on the desk.
        - What each could be, as a start for a derby: for AI Product Engineering, points joined by rods with a light that passes between them. For Full-Stack Engineering, a stack of plates that fans open under the cursor. For Design Systems & Craft, a block made of smaller blocks that comes apart and closes.
        - What it costs: three more contained pieces to make to the bar, and three more things drawn on a section that already has the desk. The frame rate is measured with them in.
        - **Against a settled line, said to him in bold:** Skills, "One animation for skills." Three things that answer the cursor are more than one. The line stands until he changes it.
    - What is not right yet, plainly:
        - **The stream's end has about 1,700 units of line to cover from the first thing to his neck, and it is held to a speed.** On a quick scroll About's words come on a second or more after the section is in place. Slowly scrolled, they come on as he ruled. How fast the end runs the level stretch is for the real build to set.
        - The three stand ins are plain outlines and say nothing of the look.
        - Motion is not judged here.
    - Still: `reference/studies/46-skills-about-draft-6.jpg`.
    - **His verdict on the sixth round (Nov 14): "Everything else looks really good though. I'm pretty pleased with the way this is turning out."** With it, in Settled, Skills: the lamp is fine for now, a derby for the 3D things, a hook for the headphones, and his idea of the stream striking each row.
    - **The seventh round, built on his word (Nov 14). In front of him.** The same page. Two things added:
        - **The stream strikes each row.** Beside the rows it no longer falls straight. At each row it turns in about 60 units, strikes the small thing at the row's left end, and turns back out. The row comes on at its strike. Three more strikes, one a row.
        - **A hook for the headphones.** A plate on the page's ground with a peg, and the band over the peg. When the stream strikes the lamp the headphones rock on the peg and settle, about 5 degrees at first, over about three seconds.
    - **Fable's answer on the rocking, which he asked for. Not agreed.**
        - Yes, small and once. A thing that hangs and never moves reads as a picture of one.
        - On the route as it stands the stream does not pass them: it comes down at the left and they hang at the right. So what sets them off is the strike on the lamp, as a knock that runs through the scene, and in the real build the cursor brushing past them as well.
        - It is made as a real pendulum that loses its swing, not a loop.
    - **Fable's thought on the strikes at the rows:** they are worth having only with the 3D things. The stream then strikes a thing in each row and that thing wakes the row, as the Sun stones do in Work. Without the things it would be striking the end of a line.
    - What is not right yet, plainly: the turn in at each row is a zigzag drawn by hand. Whether three strikes close together read as strikes or as a wobble waits for the real stream. Motion is not judged here.
    - Still: `reference/studies/47-skills-about-draft-7-the-rows-struck.jpg`.
    - **His verdict on the seventh round (Nov 14), in Settled, Skills:** the strikes at the rows and the rocking stay, what is thrown lands on the rows' borders, nothing of a row shows before its strike, the PC is turned, and the reflector is fine for now. Nothing in Skills and About as drawn is left unruled but the three small things themselves.
    - **The derby of the three small things: what was put to him before it is built (Nov 14). Nothing picked.** He asked what the stand ins are, said he is unsure of the middle one, and asked for several options for each row.
        - What all three share: one family in the site's bronze, about 90 units across, lit by the cursor's light and turning a little toward it, hidden until the row's strike, and a silhouette that reads at that size.
        - **AI Product Engineering.** The stand in is points joined by rods. Options: A1 · Lattice, the stand in made real, with a light that passes from point to point. A2 · Core, a cut solid of the stream's own facets holding a point of its light, lit from inside at the strike. A3 · Iris, a ring of bronze blades like a lens's aperture that opens at the strike and follows the cursor. Fable's pick: the Core.
        - **Full-Stack Engineering.** The stand in is a stack of plates, a pun on the word, and the weakest of the three: Fable agrees with him. Options: F1 · Gear train, three meshed gears on a plate that turn together with the cursor. F2 · Dovetail, two pieces of bronze locked by a joiner's dovetails, which part a little and close at the strike. F3 · Column, a turned post in rings of different metals, the stack done as an object, of a kind with the knob and the finials. Fable's pick: the Gear train, and the plates dropped.
        - **Design Systems & Craft.** The stand in is a block made of smaller blocks. Options: D1 · Blocks, the stand in made real, which comes apart and closes. D2 · Dividers, a draughtsman's pair that opens and closes with the cursor. D3 · Swatches, a fan of metal leaves in the site's own colors that fans open at the strike. Fable's pick: the Dividers.
        - Thought of and left out: nested rings round a core, which is the orrery he passed over. Anything with a face, which would compete with the Sun stones and with him.
    - **His answer (Nov 14), in Settled, Skills:** he wants real things in fine detail. A hyper realistic CPU for the first row, nothing he liked for the second, a painter's palette with a brush as a thought for the third. The nine above are passed over.
    - **The second set, put to him (Nov 14). Nothing picked.**
        - **What changes with real things, said to him:** fine detail needs room. At 92 units a chip's pins are finer than a pixel. Fable's proposal: each thing about 160 units across, and each row about 180 tall to hold it. Every light and every paint is one of the site's own colors (`QUALITY.md`, fail on sight, "any white, blue or rainbow").
        - **How each comes to life at its strike, Fable's proposal:** it is assembled from the strike. Some of the shards the strike throws do not scatter. They fly in, turn into the thing's parts and lock together, and the thing's own lights come on last. The rest land on the row's borders and fade, as he ruled. Scrolling back up takes it apart again.
        - **AI Product Engineering, the CPU.** Fable's view: yes. It is concrete, it is his own ground as a PC builder, and it answers the PC under the desk. One change: made as a chip that runs a model, with the stream's light pulsing through its die. Options: C1 · In its socket, on a square of board with the lever, the capacitors and the traces round it, where the strike seats it and light runs out along the traces. C2 · Opened up, with the lid lifted off and the die, the base and the contacts standing apart in layers, turning slowly, the die lit from inside. C3 · On the wafer, as one lit die on a slice of wafer in copper and gold, the others dark. Fable's pick: C2.
        - **Full-Stack Engineering.** Options: S1 · A screen with its back off, where the front is an interface and the cursor turns it to show the boards, the chips and the cables behind. S2 · A key switch opened up, the cap, the stem, the spring, the housing and its lit board standing apart, of a kind with the keyboard on the desk, which presses at the strike. S3 · A tower in section, one of the hero's towers cut open, the street at the top of the stack and the vault at the foot, its floors lighting one after another. S4 · A server pulled half out of its rack, the lit face in front and the cable loom behind. Fable's pick: S1, which says front and back without a word.
        - **His answer (Nov 14): "All right, let's go with all your recommendations for the skill sections. Let's go ahead and do the derby, please, so I can see them in action. Can you also include the surge coming in and striking them so I can see how you're proposing the assembling animation happens."** Read as: the larger size, each thing assembled from its strike, and a derby of two for each row. It is at `/lab/skill-things`, below.
        - **Design Systems & Craft.** Options: P1 · His, a painter's palette with dabs of wet paint in the site's own colors and a brush that sweeps between two and leaves the blend. P2 · A case of draughtsman's instruments, the dividers, the ruling pen and the compass in a fitted tray, whose lid opens at the strike. P3 · A set of samples, chips of the site's own materials (the bronze, the copper, the desk's timber, the mat's hide) fanned out under a brass loupe. P4 · A curve with its handles, a drawn curve made as a bronze rod with two handle arms that the cursor pulls. Fable's pick: P1, his own.
    - **The desk as a 3D piece: five calls put to him, with Fable's pick for each. Answered Nov 14: all five agreed, with the pencil added** (Settled, Skills). How it is made: in code in this repo, as his PC Builder was, or modeled through Blender on his gaming PC and loaded as a file (Open 5). What sits on it: the monitor, lamp, keyboard and mouse, a tablet and his camera, nothing new. The desk itself: a dark timber top, a bronze front edge that carries the stream, two drawers with the knob he chose. The PC under it: his PC Builder's case brought over, lit in the site's ember. The headphones: their own small piece by the title, the site's own design. Fable's pick is the first of each. After his answer: three rough desks to choose from. His `3d-asset-playbook` skill is the method.

29. **The desk as a 3D piece: three rough desks (Nov 14). In front of him. Nothing in it is picked.** At `/lab/desk`, Study 23, built in the web chat on his word: "everything looks good that you mentioned", after Fable had said the three rough desks came next.
    - What it is for: choosing the desk's direction. Each is built rough in 3D, in code, at the size and from the side the fuller draft draws it: 2 m long, 0.78 deep, 0.74 tall, seen from the front left and above.
    - The same in all three, from the five agreed calls: a dark timber top, a bronze front edge that carries the stream, two drawers with the knob he chose for the sleeping card, and the PC under the far end.
    - **A · Bench.** A joiner's bench. A slab 64 mm thick on two trestles, a stretcher at the back held by bronze wedges, a bronze angle screwed over the front edge, two drawers side by side in a case hung under the slab.
    - **B · Bureau.** An antique writing table. A top 30 mm thick in a bronze rim with cast corners, a frieze with two drawers each in a bronze bead, tapered legs with bronze collars and shoes, a rosette on each front leg block.
    - **C · Rail.** Made like Work's hardware. A slab cut to a knife edge on two frames of flat steel bar, Work's own rail standing off the front edge on six posts with a Blade at each end, two drawers one over the other in a steel case.
    - A switch draws a plain line for the stream: down onto the front edge a little right of the middle, along it to the near end, and off. It rides the angle on A, the rim on B, the rail on C. Off when the page opens.
    - The view can be dragged round, and a button puts the page's view back.
    - Stand ins, said on the page: the monitor, lamp, keyboard, mouse, iPad with its pencil, camera, lens and cap are the carried workbench's, moved onto a longer top. They are made new with the desk. The PC is a plain case with three fans, standing in for his PC Builder's.
    - Fable's recommendation: B, with C's rail and Blades in place of the front run of its rim. The knob he chose is an antique one and belongs on B. B has the most to find close up. And the stream then rides the same rail it rides in Work.
    - What is not right yet, plainly: these are rough. No joinery, no wear, no end grain, plain drawer fronts, and the timber is one first pass of a shader. The frames on C are thin and read weakly from the page's view. The PC's inside is a few glowing shapes. The stream's line is a wire, which `QUALITY.md` fails for the real stream: it is there to show which edge is ridden and nothing else.
    - Not judged: how it runs on his machine and on an iPad. The web chat draws in software, where one frame takes seconds.
    - What comes after his pick: the desk is designed in full and built as a piece in `src/pieces/`, with the things on it made new. `CLAUDE.md` gives the building of a contained 3D object to Opus, from a kit, with Fable designing and judging. His `3d-asset-playbook` skill is the method.
    - Stills: `reference/studies/42-desk-*.jpg`.
    - **His pick and his notes (Nov 14), in Settled, Skills:** the desk is A · Bench. The PC is to look like his PC Builder's, the top gets a large mat and an ultrawide, the keyboard is wireless and a gaming one lit in the site's colors, the mouse a gaming one, the camera better.
    - **The second round, built on his word (Nov 14). In front of him.** The same page, `/lab/desk`, now the bench alone, with the scene on it roughed in:
        - **The mat.** Dark hide with a line of copper stitching, 1600 by 478 mm, 80 percent of the top's length, from near the front edge back to just short of the monitor's foot. The iPad, pencil, keyboard, mouse and camera stand on it.
        - **The ultrawide.** 38 inches, 900 mm across, curved, on a neck and a flat foot. Its screen is drawn shapes for an editor and the city: a stand in.
        - **The keyboard.** A 75 percent board with no cable: a dark metal case, dark caps with six in copper, a dial, a mark on every cap lit from under it, and a wave of the site's light that crosses the keys. Lines of light along its foot, and a glow on the mat round it.
        - **The mouse.** A low sculpted shell, a lit wheel, two thumb buttons, a line of light round its foot.
        - **The PC.** Laid out after his screenshot, in the site's colors: a glass case with two chambers, three fans behind the front glass, three in the floor, one at the back, a cooler with a lit ring, four sticks of memory, a graphics card with a lit bar and fins, sleeved cables, a line of light round the foot. Larger than the first: 290 wide, 476 tall, 470 deep.
        - Still the carried workbench's, as stand ins: the lamp, the iPad with its pencil, the camera with its lens and cap. The camera he found wanting is not changed in this round.
        - B and C are out of the page and the code. Their stills are `reference/studies/42-desk-*`.
    - **His PC Builder's code was read (Nov 14).** `github.com/BrandonChurch93/PC-Desktop-Builder`, public. Its 3D is all written in code on the same library as this site: six cases and forty three parts, about 7,600 lines for the cases, parts, materials and lights. So the real PC can be brought over as it is, with its lights set to the site's colors, and not modeled again.
    - **What Fable proposes is built for real, for him to agree. Nothing here is ruled.**
        1. The bench as picked, in full: joinery, end grain, wear, the bronze angle and its screws, the two drawers and the knob.
        2. The mat, as above.
        3. The ultrawide, with a screen that shows real work and is not a flat picture.
        4. The keyboard, as above. The fun in it, Fable's idea: when the stream lands on the desk the keys flare outward from the landing, and the keys nearest the cursor's light glow.
        5. A gaming mouse.
        6. His iPad Pro with the pencil beside it, carrying no maker's mark.
        7. A camera of now: a full frame mirrorless body with a fast lens, a second lens and a cap.
        8. A desk lamp, made new.
        9. His PC Builder's own case and parts, the build in his screenshot, brought over from its code and lit in the site's colors, with its fans turning.
        10. The headphones, their own small piece by the title.
        - Not built: anything else on the desk, and a phone.
        - How: a kit for an Opus builder in Claude Code on his Mac, which builds the piece into `src/pieces/` behind the piece contract, with Fable as partner and judge. `CLAUDE.md`, Who does what.
    - What is not right yet in the second round, plainly: every new thing is a rough form. The keyboard's caps are plain boxes and its marks plain bars. The mouse is one shell. The PC cannot be read part by part at the page's size. The mat is featureless. The lit screen is a flat picture, which `QUALITY.md` fails in anything finished.
    - Stills: `reference/studies/43-desk-a-second-round*.jpg`.
    - **His verdict on the second round (Nov 14), in Settled, Skills:** the design is agreed for the real build, with no more rounds of the rough draft. Short of the bar, in his words: the keyboard, the mouse and the camera "look mid", and the computer "doesn't look great at all". He likes the PC being glass, and asked whether it should be turned to show its side. He does not love the stream landing in the middle of the desk and running its front edge.
        - He did not take the list of ten above item by item. Fable reads his approval as covering it, since each thing he named as short is on it. Said to him, his to correct.
    - **Fable's answer on the PC: yes, turn it.** A quarter turn, so the long glass side faces the front. The whole build is then read through one pane: the cooler, the memory, the card and the column of fans. Front on, as the second round has it, the fans are what is seen and the build is behind them. It needs a bay about 520 mm wide under the desk in place of 290, so the drawers move toward the near end. The fuller draft's outline now draws it turned.
    - **Fable's options for the stream at the desk, which he asked for. Not agreed.**
        - **Onto the lamp. Fable's pick.** The stream comes down to the left of the screen, strikes the top of the lamp's shade and falls on past the desk's near end, touching nothing else. The lamp comes on at the strike, then the tablet, the monitor and the PC, left to right, within about a second. The stream touches the scene at one point at its edge and is gone, and what the visitor watches is the desk coming on. It keeps "One fixed light: the desk lamp and the lit monitor": the lamp lights the desk, and the stream lights the lamp. Nothing on the desk moves. The lamp is made to take the strike.
        - Past the desk, touching nothing. The stream falls down the left and the desk comes on as it passes. The quietest, and nothing explains why the desk wakes.
        - Along the front edge, as it was. He does not love it.
        - Thought through and not drawn: through the glass PC, which would fill with the stream's light. The PC would have to move to the desk's near end, where the trestle stands in front of it, and the stream would come out under the desk in the middle of the rows of skills.
        - The fuller draft at `/lab/skills-about-draft` opens on the lamp, with a switch back to the front edge.
        - If he picks the lamp, the bench keeps its bronze angle as part of the desk, and the third call's "a bronze front edge that carries the stream" becomes "a bronze front edge".
    - **For the kit, from his words:** everything on the desk is made to the bar, and the things he named are where the rough draft is furthest from it: the keyboard and the mouse, the camera, and the PC most of all. The PC's glass stays.
30. **What Skills and About say (Nov 14). He asked for Fable's read of his résumé. Nothing here is ruled, and the words are his.**
    - His words are in Settled, Words: "that's probably something that we should discuss".
    - Fable's read, said to him:
        - The résumé makes one argument, and it is the positioning line in Settled, Words, almost word for word: he takes a product from the first conversation with a client to production, and proves it with evaluation.
        - Evaluating and red teaming frontier models is now a large part of it. On the site it is one list under AI Product Engineering, and the live About, written in July, does not mention it.
        - The site's Skills makes a different argument: four pillars named in July, with the résumé's six groups poured into them.
    - **For Skills, two things to decide:**
        - The shape of the rows. Keep the four pillars, or cut the rows along the path a product takes through him: understand it, design it, build it, prove it. The same lists in four rows, and the section then says his positioning without a sentence of copy. Fable's pick: the path. It would change Open 6 and what he approved in the second round, the résumé's six groups under his four skill sets.
        - The length. The 77 are the résumé's list, which is written to be matched by keyword. Some pairs say one thing twice, as "Generative AI" beside "LLMs" and "AI Agents" beside "Agentic AI". To an engineer reading the site they read as padding. Fable's suggestion: the résumé's list less its doubles, about 60, still more than the live site's 48.
    - **For About:**
        - The three tabs are his structure, and the live text was not written for them. Dealt out, the first tab has two paragraphs and the other two have one each. Each tab needs its own text.
        - To be put right in the text as it stands: "Twelve years" and "40+ clients" (Settled, Words), the tense of the line about his studio, and no mention of the evaluation work.
        - What the résumé cannot say is what About is for: why he builds, what he wants to do, what he plans.
    - One thing above both sections: the résumé's title and the hero's "AI Product Engineer" are different (Open 1). The hero is worked last, and the title still decides how Skills and About are worded.
    - He rewrites the copy himself. Fable drafts only if he asks.
    - **His answer (Nov 14), in Settled, Skills and About:** the four skill sets stay, each row is cut to its name and its lists, the lists are cut to the big ones with a game development group added, and About has two tabs with placeholder text for now. He did not take up rows that follow a product's path. Fable's first cut of the lists is in Open 28, the fifth round. Which skills stay, and the words of both tabs, are his.

    - **The derby of six, built on his word (Nov 14). In front of him. Nothing picked.** At `/lab/skill-things`, Study 24, built in the web chat. Rough 3D, two things for each row, the recommended one on top:
        - AI Product Engineering: the CPU opened up (a lid, a lit die, its base and its contacts standing apart, turning), and the CPU in its socket on a square of board with lit traces.
        - Full-Stack Engineering: a screen with its back off, which the cursor turns right round, and a tower in section with lit rooms on six floors.
        - Design Systems & Craft: a palette with six paints in the site's colors and a brush that sweeps a blend, and five samples of the site's materials fanned out under a loupe.
        - **The strike, on every one:** a line for the stream runs in from the upper left and strikes beside the thing. Shards fly out. One for each part flies out and home and becomes that part, a beat apart. The thing's lights come on last. The other shards fall to the row's border and fade. The whole of it takes about two seconds.
        - Pressing a thing strikes it again. Strike all and half speed are at the foot of the screen. `?at=1.05` holds every strike at that many seconds for a still.
        - What is not right, plainly: these are boxes, rods and discs. None has the detail he asked for, and a rough cannot show it. The paints look pale because they mirror the room. The screen's front cannot be seen in a still. The line for the stream is a flat strip. How the assembly feels in motion was not watched: the web chat draws in software.
        - Stills: `reference/studies/48-skill-things-*.jpg`.
    - **His verdict on the derby (Nov 14), in Settled, Skills:** the CPU in its socket, the screen with its back off, the palette and brush. He is on the fence about the things being made out of the strike's shards, and found the derby too low in quality to show it. He asked whether to go on to Claude Code for a polished example or dial it in here first.
    - **Fable's answer, put to him: go to Claude Code, and prove it on one thing first.** The web chat draws in software and has only a flat strip for the stream, so another round here would be another stand in. In Claude Code the real stream and its shards run on his graphics card. One thing is built first, the CPU in its socket, to the bar, on a page of its own, with three ways of coming to life behind a switch, for him to judge in motion: put together from the strike's shards as proposed. Uncovered by a band of light that crosses it from the strike, as a card in Work is woken. Or lit by the strike's flash with its parts dropping the last short way into place, and no shards turned into parts. The other two things are built after he picks.

31. **Contact and the footer: a wireframe (Nov 14). He turned the first round down. A second is put to him in words, and nothing of it is built.** At `/lab/contact`, Study 26, built in the web chat on his word that Contact is next.
    - **His verdict on the first round (Nov 14), in Settled, Contact:** no. The content is one block and not split by the rocket, the stream runs into a pool the rocket launches from and does not strike its nose, and the left column was a mess. The page still shows the first round until the second is drawn.
    - **What Fable put to him the same day, as a brainstorm. None of it is ruled:**
        - What the section is for, in this order: book time with him in one press. Copy his email or write a few lines without the page fighting it. End the page.
        - Fable's read of why the first round failed: the rocket cut one job in two, so the eye had to cross it to get from the calendar button to the form. The left column was five kinds of type with nothing holding them together. A strike on the nose left the stream ending in mid air, and had nothing to do with a launch. A pool has a reason: it is what the rocket burns.
        - **For any layout:**
            1. One block, in the order his live site already uses: the calendar button and his email on one row, "or send a message", the form, then the line for where he is based. One width and one left edge.
            2. The block is one plate, of the same family as the Work cards. A solid edge lets it lie over the scene. The launch's light falls on its rim and not behind words someone is typing. It ties the foot of the page to Work.
            3. The pool is the foot of the page: long and shallow, along the bottom. The stream falls into it. It fills over the last stretch of scroll and is full at the foot of the page, which is when the rocket goes. After the launch it stays lit. It is the page's last picture, with the footer under it.
            4. The rocket stands in the pool at one side and is never behind words.
        - **Three arrangements:**
            - A · Beside. The block at one side, the rocket at the other, both over the one pool, the block's lower edge lying over the pool's end. The launch and the thing he wants a visitor to do are on the last screen together. For the short time the launch runs, the two share the eye.
            - B · Behind. The rocket large, as the ground of the section, with the block laid partly over it. The most depth. It covers half of a piece made to be looked at, puts a launch behind a form, and repeats what About does with his portrait.
            - C · Below. The block centered as his live site has it, and under it the launch as a band of its own across the whole page, the rocket on the center line under the city. Nothing competes with the form and the page ends on the launch alone. The page is a screen longer, and when the rocket goes the form is above the screen.
        - **Fable's pick: A, with the block at the right and the rocket at the left.** The stream leaves About under the lower left of his portrait, so it falls into the pool beside the rocket with nothing carrying it. About has its words at the left and him at the right, so the two sections do not repeat each other.
        - The pool also answers what he had not answered, whether the rocket launches once or every time: the pool drains as the stream draws back, and the rocket is on it again by the time it fills. Fable's proposal.
    - **The derby he asked for is built (Nov 14), second round, same page.** A switch at the foot of the screen sets A · Beside, B · Behind or C · Below. In all three:
        - The block is one plate in his live site's order: the calendar button, his email with a copy button, "or send a message", the form, the line for where he is based.
        - The stream falls into a long pool at the foot of the section. The pool fills as the page is scrolled on and is full at the foot of the page. The rocket lights from its foot up as the pool fills, and launches from the pool when it is full.
        - After the launch the pool stays lit, with the stream still falling into it. Scrolling back up drains the pool and brings the rocket back down.
        - The block and the title come on as the stream passes the block's top. The rocket and the pool come up as the stream nears the pool.
    - **Where each had to give, plainly:**
        - A: nothing had to. The stream falls between the rocket and the block and touches neither. The rocket is drawn a little larger than the carried one's outline, 538 units tall, so it stands as tall as the block.
        - B: the title could not stand over the rocket, so it is inside the plate, smaller. The tower is behind the plate and only its top shows. The stream had to lean about 100 units to the left to land clear of the table.
        - C: the block is in the middle, so the stream passes behind it, as it does behind a card in Work, and the title is inside the plate. The rocket could not stand on the center line, because the stream comes out from under the block there. It is about 100 units to the right. The section is 1390 units tall against A's 830.
    - What is not right, plainly: outlines, a line, a flat panel for the plate and an oval for the pool. How it moves cannot be judged in the web chat. The pool dims while the rocket burns and reads as nearly empty in a still.
    - Stills: `reference/studies/51-contact-*.jpg`.
    - **Does the rocket fit, and what Fable answered (Nov 14). Put to him, nothing ruled:**
        - Yes, if it is made of the page's own metal. A white aerospace rocket would not fit. A rocket in the bronze and copper of the Sun stones and the buttons, riveted and engine turned, is the same world one age on. The page then runs ancient, modern, next: the stones, the desk, the launch.
        - The bridge Fable proposes: the pool is a Sun stone laid flat. A great carved disc in the ground, whose rings and glyphs fill with the stream's light from the middle outward. The fill he asked for becomes the stone lighting ring by ring, and the rocket launches from the oldest thing on the page.
        - The covering's second place: the Contact plate. It sleeps as the engine turned blank with its knob, and wakes by the band of light when the stream reaches the section, as a card does. A pointer or keyboard focus wakes it too, as on a card.
        - Other pieces Fable weighed, each of which goes against the settled line "A rocket launch": a lighthouse, which is an ancient wonder and means a signal, with a quieter ending than a launch. An orrery that the pool sets turning, which fits Work's world and says nothing about reaching him.
        - Fable's pick: keep the rocket, in the page's metal, on a Sun stone pool, with the blank on the plate.
    - **Drawn on his yes (Nov 14), third round, same page.** Arrangement A only. B and C are out of the code, and their stills are `reference/studies/51-contact-*.jpg`.
        - The plate sleeps as the engine turned blank: rays round a knob. When the stream passes its top a band of light crosses it from the corner nearest the stream, the knob draws back ahead of the band, and the form is behind the band. Moving the pointer onto the plate, or tabbing into it, wakes it too. It goes back to sleep when the stream draws back.
        - The pool is a Sun stone laid flat under the rocket: a disc with six rings, studs, ticks and rays cut into it, and a boss at its middle that the rocket's table stands on. The stream lands on its outer band.
        - **It lights from the rim in, not from the middle out as Fable had told him.** The stream lands at the rim, so its light has to travel in to the rocket. The boss is the last to light, and that is when the rocket goes. The page says so.
        - The plate no longer lies over the pool. The stone is round and is seen whole, 60 units clear of the plate.
        - Scrolled back up, the stone goes dark from the middle out before the rocket has landed. It is the stone draining, and it is his to say whether that reads.
    - What is not right, plainly: every part is outline. The stone's carving is a few rings and marks and nothing like the Sun stones in Work. The blank is drawn lines and a drawn knob, not the lit metal of a card. The lit stone is flat color.
    - Stills: `reference/studies/52-contact-*.jpg`.
    - **Fourth round, after his look (Nov 14), same page:**
        - The plate wakes when the stream lands on the stone. Its band sets out from its lower left corner, the corner nearest the landing.
        - **How the screen is seated for the landing.** In this section the stream's end is read from a fixed distance above the foot of the screen, not from two thirds of the way down it. It lands when the foot of the stone is 78 units above the foot of the screen. From the title's top to the stone's foot is 671 units, and the page ends 22 units after the landing. Measured on six screens (1440 by 900, 1366 by 768, 1440 by 790, 1920 by 1080, 1720 by 1300, 1180 by 820): at the landing, and again at the end of the page, the title, the whole plate, the rocket and the stone are inside the screen on every one.
        - Because the page has almost run out by then, the stone no longer fills with the scroll. Once the stream is on it, it lights from its rim to its middle by itself in 2.4 seconds, and then the rocket goes. Fable's call, his to overturn.
        - The footer is 100 units, down from 230, so the end of the page does not push the title off a small screen.
        - "Book on Calendly" on the primary button, his live site's words. "Copy my email" as the secondary button, with no address shown. "Boise, Idaho · Mountain Time" under the form. The tag beside the title is gone.
    - **Fable's answer on the email: keep it, as the secondary button.** The form and the button serve different people. Someone he is interviewing with will often rather write from their own mail, where they have a copy and can add people. A form on a portfolio is the path people trust least. It costs one button. His to cut.
    - **For whoever builds it:** a screen too short to hold 671 units cannot show all of it at once. Under about 700 px tall at a desktop's width, the title leaves the top before the stream lands. What happens there is not designed.
    - Stills: `reference/studies/53-contact-*.jpg`.
    - **What follows is the first round as it was drawn.** It is no longer on the page.
    - **What it holds, from his words (Settled, Contact):** a calendar button first, a way to copy his email, and a working form. Nothing waits for a message.
    - **Fable's calls on what he left open, each his to overturn:**
        - No phone number. Everyone who reads the site already has his résumé, which carries it. A number on a public page is collected by machines and called by strangers, and this repo is public too. The calendar button does what a number is for.
        - One short line for where he is based and his time zone. It tells someone booking a call what hours he keeps, and it is where he can say he would move for the right role. The wording is his. The wireframe shows "City, State · Mountain Time" as a stand in: no place is written in the repo until he gives the line.
        - LinkedIn, GitHub and the résumé go in the footer and are not repeated in Contact. Contact keeps to the three ways to reach him. The live site's footer also links CodePen and YouTube. Whether those stay is his to say.
    - **The layout, Fable's proposal:** the rocket and its tower in the middle of the page, between two columns. At the left: the title, a line, the calendar button, his email address with a button that copies it, and the line for where he is based. At the right: the form (a name, an email, a message, a send button). The launch table stands on the footer's top edge, so the ground the rocket stands on is the line the footer hangs from.
        - Why the middle: the stream leaves About about 40 units left of the center line, so it falls onto the rocket with nothing needed to carry it sideways. The stream begins on the center line too, at the city's lip.
        - Passed over: the rocket at one side and every word at the other. The stream would have had to be carried across the page, over the words.
    - **What the stream does, Fable's proposal. It takes up Open 12:**
        1. The rocket, the tower and the table stand dark. They come up as the stream nears.
        2. The stream falls from under his portrait and strikes the spike on the rocket's nose. It is the one thing it strikes in the section. The words of both columns come on at the strike.
        3. Its light runs down the rocket: the nose, the upper stage and the lower stage light in turn.
        4. It reaches the engine and the engine lights. The tower's arms draw back. A second later the rocket lifts, and climbs the way the stream came down.
        5. Under the rising rocket the stream is its flame. Once the rocket has gone the stream falls on to the empty table and burns there. The page ends on that.
        6. Scrolling back up, the rocket comes back down the stream and lands, the flame goes out, and the section goes dark again. Not ruled. It is what everything else on the page does: what the stream brings on goes away when it draws back.
    - **The form** shows what it says once a message has gone: "Message sent", as the live site has it. Sending a message changes nothing else on the page. In the wireframe it sends nothing.
    - **Not decided, for the build:**
        - How the form sends. The live site posts to a form service straight from the page, with nothing running on a server. Recommendation: keep that, since it works today and asks nothing of him. When sending fails the form says so and points to his email address.
        - The address the copy button copies, and the calendar link. The live site's are known. Neither is written in this repo until he says which to use.
        - What the rocket looks like. Fable reads "the 3D work is made new for this design" (Settled, 3D pieces) as holding for the rocket. He said it of the desk and has not said it of the rocket. The wireframe's outline follows the carried rocket's proportions: about 470 units tall, with its tower at its right.
        - How far up the page the rocket is followed, and whether it is seen crossing the foot of About.
    - **For whoever builds it:**
        - The stream has to reach the engine before the page runs out. The leading end is read two thirds of the way down the screen, so the last third of the last screen is under it. The engine stands 352 units above the foot of the page. That is enough on a screen 900 tall and not on a taller one. The wireframe slides the reading line down the screen over the last half screen of scroll.
        - At the strike, on a screen 900 tall, the top two thirds of both columns are on the screen. The email row, the line for where he is based and the send button are just under it, and are already on when they are scrolled to.
        - While the rocket is in the air nothing of the pad goes dark, however far the stream has drawn back. On a quick scroll up the rocket was still coming down onto a pad that had gone dark.
    - **It leaves out something the carried rocket has:** a flume coming in from the left, which the page sketch (Open 25) brought the stream in along. Here the stream comes in from above and there is no flume. He called what the second build drew inside its pieces, the flume among them, very low quality (The stream).
    - What is not right, plainly: it is outlines and a line. The launch is a few shapes and a glow. Nothing of how it moves can be judged in the web chat. After the launch the middle of the section holds the stream, the tower and a small flame, and whether that is enough of an ending is his to judge once it moves.
    - Stills: `reference/studies/50-contact-*.jpg`.

## Dropped

- Shards that have to read as copper leaf and as glass. They are abstract facets in a solid and a clear material (Nov 12)
- Hexagons, thin plates and panes, and chips of the letters as the shape of the shards. He picked facets (Nov 12)
- Chunky cut facets with detail on their surface. He picked the jagged look (Nov 12)
- The client work section
- The process section
- The "More rooms" section and the separate room pages
- A featured or flagship card
- Whole brass plates as cards
- A card's picture cast as a relief in metal, or etched as lines (Nov 13)
- A streak or spot of the cursor's light on a card's picture (Nov 13)
- A metal bar over WORK, or under it. "I don't want the bar above work" (Nov 13)
- A card's colors coming back as a circle spreading from the pointer (Nov 13)
- Doors as the sleeping card: two mirrored doors that meet at a seam with a latch. "Let's cut C. I don't love that idea" (Nov 13)
- For the sleeping card's blank: the card's layout etched as hairlines, the layout as a mould of pockets, a face cut into facets, and a line and a sun cut into polished bronze. He picked the engine turned dial (Nov 13)
- A change of course that rises to a point and drives off, C in the path derby. "I definitely don't like the point shoot" (Nov 13)
- Cards of different sizes, and a second row of tags on a card (Nov 13)
- The rows of skills in a column beside the desk, as the mirror of About. He picked the rows under the desk (Nov 14)
- In About: the stream falling between the words and his portrait, and the tabs standing on a bar the stream runs along. He wants it behind his portrait and clear of the tabs (Nov 14)
- For the desk: B · Bureau, an antique writing table, and C · Rail, a knife edged slab on steel frames with Work's rail along the front. He picked A · Bench (Nov 14)
- All four cards changing at once when the category changes, with nothing travelling. A surge of 0.45 or 0.7 seconds. He picked 0.7 from the wireframe, saw it on the real page, and changed to 1.1 (Nov 13)
- For the card: its colors coming back as a sweep, lights first, or with the picture coming closer. The card leaning toward the cursor. The thin bead as its edge. He picked the fade, leaning away and the deep edge (Nov 13)
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
- Figures that light up on scroll. The Sun stones' faces are the one exception: he saw them lit and said they look good (Nov 13)
- The "laid back, fun to try" voice
- Three hovers for the buttons: light running round the border, Heat and Pull. He chose Catch (Nov 11)
- The second build's kit, its screenshot gates and its voice rules. None of them apply here.
- For the rows of skills: the CPU opened up, a tower in section, and samples under a loupe. He picked the CPU in its socket, the screen with its back off, and the palette and brush (Nov 14)
- In About: his portrait as a figure beside the words. He picked his portrait as the background (Nov 14)
- In Skills: Product Leadership as a fourth skill set, and the numbers on the rows (Nov 14)
- In About: three tabs (about me, what I want to do, my plans for the future). He wants two, Professional and Personal (Nov 14)
- In About: the stream going in behind the shoulder at the left of the picture. He meant his own left (Nov 14)
- In the rows of skills: the sentence of proof in a middle column, and the line under each skill set's name. "It doesn't add anything." (Nov 14)
- In About: the rail ending over his head, with the stream falling off its end into the top of his head. "I definitely don't like the stream coming in directly over my head." (Nov 14)
- In Contact: the content in two columns either side of the rocket. "I don't like the content being separated." (Nov 14)
- In Contact: the stream striking the spike on the rocket's nose. It runs into a pool the rocket launches from (Nov 14)

## Reference

- Live site: https://www.brandonchurchportfolio.com
- Second build: https://github.com/BrandonChurch93/Portfolio-Website-v2 (`main` is the Opus build, `fable/phase-2-layout-water` is the review branch)
- Second build preview: https://portfolio-website-v2-lake.vercel.app
- Colors measured from the portrait: the glow behind him is about `#5a2e00` at its brightest and `#270f00` as it falls off, fading to near black. The second build's brass was `#e6b866`, which is yellower and much paler.
