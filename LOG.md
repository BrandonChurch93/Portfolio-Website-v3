# Log

Newest first. One entry per piece of work. Say what was done, what Brandon said, what is half finished, and anything the next session would otherwise have to rediscover. Rules go in `BRIEF.md`, not here.

## 2026-11-12 · The Blade picked, the stone a little larger, and a proposal for the card (Fable, web chat)

**What Brandon said**

- "I like the blade the best."
- "I also would like to increase the size of the Sunstone, maybe just a simple 10 or 20%, to show off the beautiful detail on it." The layout and the spacing between the stream and the cards must not be compromised: "I wouldn't want it any closer."
- "Yes, I'm ready for the card. Before we get to work on it, what exactly do you propose? We should build these out with the content they're actually going to have on them. For now we can just do a placeholder image."
- His live site shows its pictures black and white until hovered. "It'd be cool if we could do something similar, but with like a bronze effect or something that matches our color scheme."

**What Fable proposed for the card. Talk only, nothing built, none of it a rule**

- What is on it, top to bottom: the picture in a 16 by 10 window sunk a little into the card. A small label of the kind of project and the year. The title. The description from his live site. Up to four tags. The whole card is the link, with a small arrow in the lower corner.
- What it is made of: the dark plate from the stream's test shot, which he liked. Metal only as accents: a thin copper lip all round, which is what the stream lands on and strikes, and the bezel round the picture. The buttons' metal and lighting.
- His bronze idea as three states. At rest the picture is in bronze tones. Under the cursor, or with keyboard focus, it shows its true colors, the lip catches the light as the buttons do, and the card grows a little. On a touch screen, where nothing hovers, the card nearest the middle of the screen shows its colors.
- A card is always readable. The stream's strike lights the lip and warms the picture for a moment. It does not hide a card until the stream arrives.
- The one thing a derby should settle is how the picture is made bronze: 1 · Toned, the picture's lights and darks mapped onto the copper and bronze, under the bright button's clear coat so the cursor's light crosses it. 2 · Cast, the picture as a shallow relief in metal. 3 · Etched, the picture as engraved lines. Fable expects Toned to win. Cast leans against "Brass is an accent on it, not the whole card", and was said to him in bold.
- Content for the derby: the four on his live home page today (Proactive UI for AI Glasses, Ask the Claude Docs, Design System Extractor, Generative UI for GitHub) with their real descriptions and tags. Which four end up on the home page is his call and does not change the design.
- Pictures: his real screenshots are in the second build's public repo (`public/media/` there: `glasses`, `claude-docs`, `dse`, `genui`). Fable proposed using them in place of a blank, because a bronze effect cannot be judged on a blank.

**For the build, found while reading the page**

- The stream passes between the post and the card and touches the post's inner side (`reference/studies/18-work-post-turns-the-stream.jpg`). So a larger stone keeps that point of contact and grows away from the cards. On an iPad that takes room the posts do not have: they are about 34 px from the screen's edge. It goes in the same prompt as the iPad's margins.

**Half finished**

- His answer on the proposal. Then the card derby at `/lab/work-cards`, when he turns Fable up. Then the one prompt for Claude Code.

## 2026-11-12 · Blade or Steps, beside the sun stone (Fable, web chat)

**What Brandon said**

- "Could you actually put the sun stones next to the blades and the steps. I'm trying to figure out between those two. Standalone, I think the blades look the best, but you may have a point that the steps may actually look better with the Sunstone."
- "Should we go ahead and figure out what the finalized versions of the cards will look like? We can update that next pass in Claude Code as well with these other updates."

**What was built**

- Study 13 at `/lab/work-pairing` (`src/work-objects/pairing.ts`, `src/components/lab/WorkPairing.tsx`): the sun stone beside the rail, once with Blade finials and once with Steps. Each is drawn large, and again at the size it has on the page: the stone as wide as `--post` on `/lab/work`, the bar 18 px thick.
- `STATUES` in `guardians.ts` and `FINIAL` in `finials.ts` are exported so the pairing draws the same stone and the same finials as the derbies.
- Still: `reference/studies/22-work-pairing.jpg`.

**What Fable saw, and told him**

- Large, the Steps read as the weights on a barbell. At the page's size they read as the thread of a bolt, which is the hardware he turned down in the first derby. The Blade keeps a clean outline at both sizes.
- Fable had said the Steps might suit the stone better. Side by side that did not hold up, and Fable said so.
- At the page's size the stone is about 70 px across, so its glyphs are texture and only the face and the rings read. Worth knowing before the real stone is built.
- On an iPad the post is narrower (about 50 px) while the rail keeps its 18 px, so either finial comes out as large as the stone or larger. The stone should stay the bigger thing. For the build: a larger stone, or finials sized against the stone, not against the bar.

**Half finished**

- His pick between the two. His answer on the card. Then the prompt for Claude Code, when he turns Fable up.

## 2026-11-12 · The Sun stone picked, and a derby of finials (Fable, web chat)

**What Brandon said**

- "By far the best one here is the Sunstone! I actually really like it though I'd hope it would be much better quality in the finalized version?" For the posts.
- The heads on the rail: he does not love any, and "the poles don't have to have heads on them".
- The lit face: "I'm open to the lit face, but I'm curious to see it in action."
- The rail's ends: not plain. "Think of like a super fancy high-end curtain rod, how it has like the things on each side."

**What Fable told him about quality**

- What he picked is the direction, and nothing is approved until the finished stone is on the real page. The sun stone is rings, glyphs and rays, so it can be made at full quality in code, with no imported sculpt. An idea put to him, not agreed: glyphs of his own in the rings, one for each kind of work he does.

**What was built**

- Study 12 at `/lab/work-finials` (`src/work-objects/finials.ts`): the page's bar with a finial at each end, seen from the side. Blade, Orb, Steps. Each begins with the same collar of a ring, a neck and a ring.
- Still: `reference/studies/21-work-finials-derby.jpg`.

**Half finished**

- His pick of a finial. Then the prompt for Claude Code, when he turns Fable up.

## 2026-11-12 · A second derby: statues in place of hardware (Fable, web chat)

**What Brandon said**

- Of the first derby: "I didn't necessarily love any of these." The rail's bar is his favorite as it is. The knobs are what he does not love. "I think you're looking at like contractual type assets. Where I'm thinking more like statues and art." He floated an Egyptian head or a gargoyle: facing out where the posts are, in profile at the ends of the rail looking each way, with eyes and mouth that light when the stream hits. Not a decision.
- Fable suggested Art Deco to sit with the hero's city. He set the city aside: it "is going to need a massive overhaul", and the site is built on the stream, not on it. "I would love to see another derby."

**What was built**

- Study 11 at `/lab/work-guardians` (`src/work-objects/guardians.ts`), on the first derby's canvas and lighting (`HEAD`, `SHADE` and `mountObjects` are now shared from `objects.ts`).
- Three families: Pharaoh, Gargoyle, Sun stone. Each is a mask worked out as a height from simple shapes, and a head in profile cut from an outline of a dozen or so points. On the rail the bar is the page's own, and the heads sit at its ends looking outward.
- Eyes and mouths are openings. They are dark with the stream off and take the stream's colors with it on.
- Still: `reference/studies/20-work-guardians-derby.jpg`.

**To know**

- A whole page of it is too slow for this workspace's software drawing: a full page still timed out. Each statue is skipped outside its own bounds, and stills are taken a screen at a time.
- The heads on the rail are drawn about eight times the bar's half thickness so they can be read. On the page they would be much smaller, which is a question for whichever family he picks.
- These are sketches of a direction. A face written in code will not hold up enlarged. Open 5, real models, is the way to make the real ones, and "Figures that light up on scroll" is on the Dropped list, which he would be bringing back.

**Half finished**

- His pick.

## 2026-11-12 · His first look at `/lab/work`, and a derby of posts and rails (Fable, web chat)

**What Brandon said**, all of it in `BRIEF.md`, The stream, "His first look at the build"

- The screws point every way. The left post is right, the right should mirror it, and the rail's studs should mirror each other.
- First: too much happens at the top in a short scroll. Then, on a second look: "I actually don't mind there's so many strikes at the top", the shards they throw make it "feel 3D. It actually looks really good." Fable had answered that the landing on the category bar should come out. That answer is withdrawn.
- "How much of the word work is fighting for your attention." He wonders about a metal bar over it, and maybe one under.
- The strike on the second row "feels like a graze".
- He wants a derby of other designs for the posts and the rails.

**What was built**

- Study 10 at `/lab/work-objects` (`src/work-objects/objects.ts`): one canvas, six designs, each a height worked out per pixel with its slope taken by differences, lit by a copy of the Work page's own lighting for its posts and rail (`fitting` in `src/stream/shaders.ts`), with the buttons' room and highlights from `src/metal/shaders.ts`.
- The turning object: Knob (as now, redrawn), Wheel, Facet. The rail: Bar (as now, redrawn), Truss, Channel.
- A switch turns the stand in stream on and off. The lamp is the site's own, so on an iPad it drifts and leans to the last tap.
- Still: `reference/studies/19-work-objects-derby.jpg`, stream on at the left, off at the right.

**To know**

- The metal's numbers are linear and have to be encoded at the end. Drawn raw they come out dark red.
- The two marked "as now" are redrawn from the description in the entry below, not drawn by the page's shader. They are close, not the same.
- A wide glow clipped by its tile shows the tile as a box. The glow fades toward the tile's edges.

**Fable's thoughts for the next prompt to Claude Code, none agreed**

- The second row's strike: the entry below says the line from the post to the card is steep, so the stream meets the side at a shallow angle. That may be why it reads as a graze. Not confirmed. Ask for the cause first.
- A bar over WORK would change what the test shot does, where the stream strikes the word itself. It has to be shown with and without before he rules.
- On an iPad the posts are about 34 px from the screen's edge.

**Half finished**

- His pick from the derby. Then the prompt.

## 2026-11-12 · The stream through Work, built at `/lab/work` (Fable, Claude Code on Brandon's Mac)

**What Brandon said**

- The handoff prompt in the entry below. "Work without check-ins until there is a page I can scroll."
- He has not seen it. Nothing here has his verdict.

**What was built**

- **The page.** `/lab/work` (`src/components/lab/WorkLab.tsx`): the title, the category bar, four cards in two rows, a post beside each side, a rail under the grid, the button. The page only lays these out. The stream reads where they are and plans its route from them.
- **The stream can now run any route of this kind.** `routeThroughWork` in `src/stream/route.ts`, beside the test shot's `buildRoute`. New to the stream: any number of landings on either side, each with its own strength. Round posts and sloping rails as things it can meet, beside boxes. The two sides meeting again and going on as one. Falls drawn as throws, bent by their own weight. Thrown shards and sparks bouncing off posts and rails.
- **The posts and the rail are drawn by the stream's renderer**, in front of the light, the way the title and the card are (`postFrag`, `railFrag` in `src/stream/shaders.ts`). They are lit by the buttons' own code: the room and the highlight functions are now exported from `src/metal/shaders.ts` and used by both.
  - A post, from its edge inward: a rim turned down and milled like a coin's, a flat land, a ring cut in and filled with enamel as the buttons' border is, a dish, a boss with a slot. Turned on a lathe, so its highlights run in rings.
  - The rail: a round bead along the top that the stream lies on, a web set back and brushed along its length with one enamel line, a smaller bead along the foot. It is carried on a stud at each end, set low so its top is level with the rail's.
- **The button is lit by the stream** once the two sides have met under it (`plates.setStream`, which was `setWater` from the second build and is renamed).
- Stills: `reference/studies/18-work-*.jpg`.

**The route as built, and what causes each turn**

1. Down the middle, strikes WORK, parts. As the test shot.
2. Along the title's top and over its end. As the test shot.
3. Onto the category bar: it comes down leaning outward and lands a little in from the bar's end. Cause: the bar. Runs out and off the end. Cause: the end.
4. Onto the top of the first row's card, out along it and thrown off the end. Cause: the card, then its end.
5. Falls in a bow to the post. A throw: the turn stands halfway out to the post.
6. Meets the post on its shoulder, on the side toward the cards, and comes off it inward. Cause: the post. A point burns where it touches, for as long as the stream is there.
7. Runs straight in to the side of the second row's card and strikes it a little above halfway. Comes off outward. Cause: the card's side. A point burns there too.
8. Falls onto the high end of the rail, turns and runs downhill. Cause: the slope.
9. Off the rail's low end beside the button it keeps going the way it was, the two sides pass under the button and meet each other below it. Cause: the way each was going, and the other side.
10. One stream goes on down.

- **Weakest, and why:**
  - **The meeting.** It happens in the air about 60 px under the button, not on the button. The stream has to get from two rails to one line, and the only things there to turn it are its own momentum and the other side. The wireframe had the line arrive at the button's ends and leave from under it, which a stream with a body cannot do without passing through the button.
  - **The landings on the bar and on the first card are short**: about 80 and 100 px of run. There is no more room: from the title's end to the post is 480 px on a 1440 screen, shared between the hook, two landings, two throws and the swing out to the post.
  - **The turn at the post is about 35 degrees.** The post is level with the foot of the first row and the strike is halfway down the second, so the line between them is steep.

**Strikes**

- Strength, against a full strike: title 1, card top 1, card side 0.8, category bar 0.3, post 0.3, rail 0.3, the meeting 0.2 (`work.contact` in `config.ts`).
- Thrown in one steady scroll down the whole section, at about 420 px a second: title 21, each card top 35 and 37, each card side 29 and 27, each bar end 10 and 11, each post 9 and 10, each rail 10 and 9, the meeting 3.
- The two sides are the same route. They differ in: how far each leans onto a landing (so they do not land in the same instant), the number each landing throws, every shard and spark, and the sway of the free runs.
- At rest, the single shard each landing throws: 56 in a minute over all twelve landings. A 900 px screen holds three to five landings, so about one every two to three seconds on screen, as on the test shot.
- A shard thrown by a strike is let fall 430 units below where it was thrown and then goes (`work.fall`). Without it, what the card tops throw fell the whole height of the section down both margins. The test shot has no such limit.

**Measured**

| | |
|---|---|
| `/lab/stream` before and after | 20 frozen frames, desktop, tablet, phone, wide, low tier, both looks, scrolled down and back up: every pixel the same, and every shard's place the same number for number. The before set was taken twice first, and the two agreed, so a frozen frame is repeatable. The reduced motion still differs in 4 pixels of 5 million by one step, which is its cursor light: it is not frozen. The two before sets differed there by 747 |
| Every shader the test shot and the buttons use | Letter for letter what it was, apart from the buttons' light uniform being renamed from water to stream |
| Riding shards on the Work route, 1440 wide, recorded 30 times a second | On the title, the bar, both rows, both posts, both rails and under the button: 0 vanished, 0 appeared, 0 jumped. The furthest any moved in a thirtieth of a second: 5.6 px. On free runs the knots thin and gather them over 1.2 s or more, as on the test shot |
| The same at 834 wide | 0, 0, 0. Furthest 5.0 px |
| Riding shards with their center inside a card, the bar, the button, a post or a rail | 0 in any frame, both widths |
| Frame time, scrolling the whole page down and up without stopping | 16.7 ms every frame, none over 25 ms, on desktop and at iPad size. The stream's own work on the processor: 1.8 ms |
| WebKit at 1194 by 834 and 834 wide | Draws, no errors |

**The budget for two full sides, out loud**

- Unchanged from the test shot: 55 riding shards to every 100 units of route, 260 thrown shards in the air, 700 sparks, on his Mac.
- What the Work route uses: about 3,200 riding shards on the whole route, of which about 720 are on a 900 px screen at once. 158 thrown shards at most in a scroll. Sparks reach 594 to 663 of the 700 in a fast scroll through several strikes, so a few are dropped at the peak. Nothing else comes near its limit.

**Reviewed**

- **Three fresh Opus reviewers of the pictures. All three failed it.** Two on the first build, one after the fixes.
  - Fixed after the first two: the turn at the post was a 15 degree kink (the stream now reaches its widest at the post and turns about 35 degrees, with a burning point). The stream hugged the side of the second row's card (the posts and the rail's high ends are further out, so the weave is about 115 px wide). The rail's top highlight was blown out and read as the stream lying across its face. The lighter contacts were as loud as the heavy ones. Thrown shards rained down both margins. The button was not lit. The posts crowded the screen's edge on an iPad.
  - **What the third still failed, and has not been fixed:** the rail reads as a fluted bar between two studs, without brackets or other form. The meeting is in the air below the button. The landings on the bar and the first card are corner grazes. The iPad view is cramped, with the posts about 34 px from the screen's edge. The posts and rail were a duller brown than the buttons (brightened since, not reviewed again). In the filmstrips every stop shows the same crackle of the leading end, so the difference in strength reads less than the counts say.
  - One finding was a misreading: shards "bouncing off nothing" beside each post are the fan the post throws, bouncing off the side of the first row's card.
- **One Opus reviewer of the code.** It found that the single stream after the meeting was never drawn: a not-a-number in the tail's points, which every picture before it had hidden because the leading end happened to sit at the meeting. Fixed, and the tail is in every measurement above. Also fixed from it: on a phone the landing on the bar was drawn in the air beside the bar, old WebGL programs were not freed when the layout changed, the buffer for forks of arc was sized for the test shot, and squares in the new shaders were taken with a power function that some phones leave undefined for negative numbers.
  - Left from it: the studs at the rail's ends are drawn but nothing bounces off them, and they cast no shadow.

**Fable's own judgment**

- **At the bar:** that every turn but the meeting is at something that can be seen. The posts as objects, enlarged. The strikes on the card tops and sides. Riding shards on every new object. Speed. The test shot untouched.
- **Not at the bar:** the rail as an object. The meeting. The iPad view, which is the desktop one squeezed. The posts beside the PC Builder: they have form, but one small part does not carry the weight a whole rig does.
- **Not proven:** whether the whole figure reads as a stream meeting things or as a lit outline round the grid. Reviewers of stills read it as an outline. It was his sketch, and he judges it moving.

**Calls made for Brandon. Each is his to overturn**

1. The two sides meet under the button, not on it, and the button sits above the gap between the rail's two low ends.
2. The rail is in two halves with a gap in the middle. Its high ends stand under the posts.
3. The posts are level with the foot of the first row, their centers just below its bottom edge. Their size: 72 px across on a desktop.
4. The stream strikes the second row's card at 46 percent of the way down its side, not 50.
5. The title is a little smaller than on the test shot (92 px against 104 on a 1440 screen), to give the landings room.
6. The stand in card is 460 by 383 on a desktop, taller than the test shot's. The grid is 960 wide.
7. A point of light burns where the stream touches a post or the side of a card. It is new, and it is only on this page.
8. The button takes the stream's light. That changes how an approved button looks while the stream is under it: warmer. Its colors are not changed.
9. The strengths of the contacts, listed under Strikes. The agreement named which are lighter. The numbers are Fable's.
10. The limit on how far a thrown shard falls.
11. On a phone: the stream parts on the title and falls past the bar and the single column on both sides, close to the screen's edges. It does not land on the bar, because the fall comes down past the bar's end. That is less than the stand in the agreement describes.
12. The metal is the buttons' copper, darker than the bright button: aged, not coated. A bright surface shows light less, and these have to show the stream's.

**Not checked**

- A real iPad and a real phone.
- The page with a real card in it.
- Reduced motion beyond one still, which draws.

**Things the next session would otherwise rediscover**

- **Take the leading end past the thing you are checking.** With the screen 2300 or 2600 px tall the leading end sat exactly on the meeting, and a stream that ended there looked the same as one that had only got that far.
- **A fold toward the open side needs both sides.** A shard with an object on each side was thrown from one side of the core to the other whenever the nearer one changed. It is now held off each, kept inside the other's room, and the two weighed by how shut each is.
- **A turn reads as caused when three things are true:** the line is at its widest or narrowest there, it changes direction by 30 degrees or more, and something happens at the point. A 15 degree kink beside a post reads as passing it.
- **Tight turns throw riding shards round fast.** Under about 30 units of radius at the end of a top, the ones on the outside moved 7 to 10 px in a thirtieth of a second.
- A frozen frame of the stream is repeatable to the pixel, so a refactor can be proven by photographs. `scratchpad` tools are not in the repo: the method is to save PNGs of a fixed list of frozen frames with `streamList` and `streamThrown` dumped beside each, twice before and once after.
- A stream that fails to start now says so in the console. Before, an error in the first build was swallowed.
- `half` is a reserved word in GLSL.

**Half finished**

- Nothing is uncommitted. Waiting on his look.

## 2026-11-12 · Handoff to Claude Code: the stream through Work (Fable, web chat)

**What Brandon said**

- Of the rail: "Looks good in theory but I would need to see it actual rendered using our actual assets to be sure."
- "We still haven't decided on the card design yet. Should we settle that first before handing this over to Claude code or continue with the stream interaction first with Claude code and finish the cards afterwards?"
- To Fable's answer, the stream first with the card alongside, and to the six rulings that needed his yes: "Yeah, I think that plan is pretty solid." "Go ahead and update the documentation and give me the handoff prompt."

**What changed in the record**

- `BRIEF.md`, The stream: a new part, "The stream through Work: the agreement for the build". It has the section top to bottom, the route in seven steps, what is built and what is not, what stays as approved, and Fable's own calls set apart from his rulings.
- `BRIEF.md`: Work is written in as the exception to "It also should not touch everything". Work's settled lines gain four cards in straight rows and the category bar. Open gains 17 (the top bar), 18 (Work on a phone) and 19 (the card's look).
- `QUALITY.md`: his verdicts on the wireframes, his sketch, the posts, the hook and the rail are in the table. Two lines are added to the fail list. "The stream through Work" is a new set of nine tests.
- `PLAN.md`: Now, and Phase 3's Work is split into its parts. Phase 2's last waiting item is ticked on his words, "All my issues have been fixed".

**What the real stream cannot do yet, as far as Fable can tell from reading `src/stream/`. Check before believing it**

- `buildRoute()` in `route.ts` takes one title and one card and makes two sides, of which only the left lands on anything. The route through Work needs many stops on each side.
- Its landings are of three kinds: a strike, a land and a lip. Nothing yet meets a side face, a round post or a slope.
- The two sides part and never meet again. Step 7 needs them to meet and go on as one.
- What a strike throws bounces off boxes. The posts are round and the rail slopes.
- The posts and the rail are new objects in the page. `src/metal/` draws the buttons' metal from a height field, which may be the way to make them.

**The prompt Brandon was given**

```
Pull main, then read BRIEF.md, PLAN.md, QUALITY.md and the top entry of LOG.md from disk, as CLAUDE.md says.

Build the stream through Work: the real stream running through the Work section, on a new page at /lab/work. BRIEF.md, The stream, "The stream through Work" is the agreement: the section, the route, what is built and what is not. QUALITY.md, "The stream through Work", is the test it has to pass.

Hold to these:
- /lab/stream is approved and must draw what it draws today. Take stills of it before you touch shared code, and compare after.
- Every turn the stream makes needs a cause that can be seen. If you cannot make one look caused, do not force it. Say which turn and why in your report.
- The posts and the rail are real objects in the buttons' metal, lit by the stream and by the cursor. A plain cylinder or bar fails.
- The wireframe at /lab/work-draft?v=r gives the order of the stops and nothing else. Do not build on its code or copy its look.
- Do not design the card, the top bar or the phone's route. Those are being decided in the web chat. Use the stand ins the agreement names.
- Where the agreement lists something as Fable's call, build it and list it in your report as mine to overturn.

Work without check-ins until there is a page I can scroll. Then run a production build, commit, push, and confirm the deploy is ready.

Report in lists: the link, what is at the bar, what is not and why, every call you made for me, and exactly what I am approving. End with one clear recommendation.
```

**For the web chat, next**

- The card's look, then Work on a phone. Both while Claude Code builds.
- A push from here and a push from Claude Code can cross. Pull with a rebase before every commit.

**Half finished**

- The build itself. Nothing from this session is uncommitted.

## 2026-11-12 · A rail for the foot of Work, proposed and drawn (Fable, web chat)

**What Brandon said**

- Of the posts: "Yeah, this looks good."
- Of the foot: "The last hook though below the 2nd row of cards is still kind of weird and happening for pretty much no reason. I don't mind it if the stream's actually like move naturally and kind of switch directions, but that's too much. What do you propose?"

**What was weighed**

- Letting the two sides fall on out of Work and meet in the next section. It removes the hook, but it only moves the question to Skills, and Work would end with nothing closing it.
- A second pair of posts to turn the sides in. The button is some 400 px in and only 150 px down, which is too flat for anything thrown to reach, so it would still need something to carry it.
- A rail that slopes down to the middle. Downhill is the plainest cause there is, it is one object, and it is the shelf he raised himself. This is the one drawn.

**What was built**, in `plan()` in `src/components/lab/WorkDraft.tsx`

- **R · With a rail**, `?v=r`, which opens first. P is beside it. S is out of the switch and opens by `?v=s`.
- After the strike on the second row's card the stream bows out and down and lands on the rail 34 px in from its high end. The rail drops about a ninth of its length, at most 64 px, to the side of the button. The stream lies on it the way it lies on a card's top, and the two sides meet on the button.
- The rail is a line with a small stud at its high end, faint until the stream lands. Stand ins.
- Still: `reference/studies/17-work-draft-rail-at-the-foot.jpg`, R on the left and P on the right.

**Half finished**

- His verdict on the rail.

## 2026-11-12 · Posts that turn the stream in, drawn for Brandon to see (Fable, web chat)

**What Brandon said**

- "I like option a the best, but we need to make sure the streams look organic and not forced." He sent the left half of the last still, which is S, with a scribble beside each side at the foot of the first row. Fable reads "option a" as S. Not confirmed.
- "What if we added one of those background 3d objects I mentioned like 2 metal cylinders giving the stream a reason to turn into the center of the 2 row of cards."

**What was built**, in `weave()` in `src/components/lab/WorkDraft.tsx`

- **P · With posts**, `?v=p`, which opens first. S is beside it in the switch. A and B are out of the switch and still open by `?v=a` and `?v=b`.
- A post stands just outside each side, 34 px above the foot of the first row's card. The stream no longer runs down that card's side. It leaves the end of the card's top with the way it was going, bows down like something thrown, touches the post's inner face and is turned in, then bows in to strike the side of the second row's card halfway down as in S.
- The post is a disc with rings, faint until the stream reaches it. It is a stand in and says so on the page.
- The stage's side padding is wider in P so the posts have room on an iPad held upright. The post's size and the swing are worked out from the room there is.
- Still: `reference/studies/16-work-draft-with-posts.jpg`, P on the left and S on the right.

**How it reads**

- The turn in now has a cause, and so does the swing out: the stream is thrown off the card's end. The line is harder than S's, with a sharp turn at the post. It reads as two bounces, post then card.
- The sweep in to the button still has no cause in either.

**Half finished**

- His verdict on the posts, and his word on what "option a" meant.

## 2026-11-12 · Brandon's sketch of the stream and the cards, built (Fable, web chat)

**What Brandon said**

- He drew the Work section with the stream in red and sent it. "I think the first row is good how it hits the top and kind of rolls off the side, but the second row I kind of want it to weave out and then come in and hit the middle of the two cards." "Don't take it too literal."
- He has not given a verdict on the second round's top bar, the category bar or the landing on it. In his drawing the stream does step out at the category bar on its way down.

**The drawing, read closely**

- A title, a wider bar under it, and four cards in two straight rows. It was drawn with a mirror down the middle, so both sides match.
- The stream comes down the middle, parts on the title, runs down its sides, steps out at the bar and slants out to the first row.
- It meets each first row card on top, right at the outer corner, and rolls off the side.
- It bows outward as it goes down, widest near the foot of the first row, and stays out past the gap.
- It then slants in and touches the outer side of the second row's card a little below halfway, and slants out again and off the bottom of the page.
- "Hit the middle of the two cards" is read as the middle of each card's side, which is what the drawing shows. It is not the gap between the two cards.

**What was built**, in `weave()` in `src/components/lab/WorkDraft.tsx`

- After the first card's corner the stream leaves the side after about 54 px and swings out as far as the margin allows, up to 84 px, by the foot of that card.
- For every card after the first it holds wide to just above the card, slants in to strike the outer side at the card's middle, and slants out again to a little below its foot. The strike is a sharp turn, so it reads as a bounce.
- **S · Your sketch** is new: straight rows, both sides mirrored, the cards waking in pairs. It opens first. `?v=s`.
- B · Steps has the same second row, with its right column half a row lower as before.
- The landing on the first card now holds at every width. On an iPad held upright the category bar is as wide as the grid, and the stream used to miss the top of the first card and strike its side.
- Still: `reference/studies/15-work-draft-his-sketch-and-steps.jpg`, S on the left and B on the right.

**How it reads**

- S makes one clear figure: shoulders at the title and the bar, out round the first row, in at the waist of the second, and in to the button. It has A's symmetry without A's straight runs, and B's landings without B's uneven foot.
- B's foot is still its roughest part.

**Half finished**

- His pick: S, A or B. The top bar and the landing on the category bar are still his to rule on.

## 2026-11-12 · The Work draft, second round: a category bar, a top bar, four cards (Fable, web chat)

**What Brandon said**

- His favorites are A and B. "It's still hard for me to choose between the two."
- The section is tall, and the categories end up a long scroll above the lower cards.
- The category row was "really squished at the top". He does not want the categories as an overlay on top of the cards, unless they pin into a nav bar at the top.
- He asked what the standards are and what would look best. Fable recommended a roomier category row, a slim top bar the categories dock into, and four cards, and he turned Fable up to build it. He has not ruled on any of it.

**What was built**, all in `src/components/lab/WorkDraft.tsx` and its styles

- The stream hooks over WORK alone. The first round had drawn the hook round the title and the categories together, which is what squeezed them.
- The categories are a bar of their own: a plate the width of 46rem with four equal tabs, each over 44 px tall. It is faint until the stream lands on it, like a card.
- **Fable's call:** the stream drops from the ends of the title onto the category bar, runs along its top and off its ends, then goes on. Title, bar and grid step wider each time, so the stream steps out with them. On a screen too narrow for that it passes the bar's ends without landing.
- A slim top bar, fixed, 3.5rem tall. It stays hidden until the hero block is half off the screen. When the category bar has scrolled under it, the four categories fade into its middle beside the word Work, and they leave when the foot of Work reaches the top. Tapping one there swaps the cards and scrolls the first row back to 128 px from the top. Under 1100 px wide the section links give way to the categories, and under 700 px the name does too and the row can be swiped.
- The categories work. Each shows four stand in cards named for it.
- Four cards, not six.
- The layout switch moved to the foot of the screen, since the top now belongs to the top bar. It holds A and B. C still opens with `?v=c`.
- Stills: `reference/studies/14-work-draft-two-layouts.jpg` and `14-work-draft-category-bar-and-top-bar.jpg`.

**Measured at 1440 by 900**

- From the title to the button: about 1415 px in A, about 1720 px in B. The first round was about 1800 and 2180.
- On an iPad held upright, A's whole grid and button fit on one screen below the top bar.

**Checked**

- Live, with the clock running, at iPad upright and at phone width: scrolled down in steps, the categories docked, a tap on Games in the top bar swapped the cards and brought the first row to 128 px. No errors.
- The top bar was 86% solid at first and card titles showed through it. It is 94% now.

**What is not right yet**

- The phone is still only roughed in: one column with both sides at the screen's edges, and the category bar swipes.
- B's foot, where the left side sweeps a long way in to the button under the short column, is its roughest part.
- What else lives in the top bar is a stand in.

**Half finished**

- His verdict on this round: A or B, the top bar, and the stream landing on the category bar.

## 2026-11-12 · The Work section, drawn three ways (Fable, web chat)

**What Brandon said**

- "I would love to see a rough draft." He is on his iPad for a few hours with no mouse, so anything that needs the cursor is confirmed when he is home.
- "I feel like the stream could be used to give life to each of the page and play part onto why these sections and potentially some of the individual components are coming on screen."
- A wilder idea he is less keen on: 3D objects in the background, such as a shelf, for the stream to bounce off. It would need the whole site to feel like one 3D world. In `BRIEF.md`, Open 15.
- A new rule for how we work, in `BRIEF.md` and `CLAUDE.md`: he and Fable may pivot, and anything Fable recommends against an agreed rule is laid out in the chat in bold. Claude Code builds to the rules as written.
- He has not seen the draft yet.

**What was built**

- Study 09 at `/lab/work-draft` (`src/components/lab/WorkDraft.tsx`): a wireframe of Work with a hero block above and a Skills block below, so the line has somewhere to come from and go to. A switch at the top, which stays on screen, picks the layout. `?v=a`, `b` or `c` opens one directly, and `?whole` draws the whole line for a still.
- The line stands in for the stream. Its leading end is held 62% of the way down the screen and follows the scroll, and it goes back when the page is scrolled up. A card is faint until the line reaches it, then lights from the side it was struck on. Nothing is drawn ahead of the line.
- The route is planned from where the title, the categories, the cards and the button really are, like the real stream's `route.ts`, so it holds at any width. How far the line has run goes by height on the page, as the real route's `floor` does, so a run across a card's top is covered at once.
- **A · Frame.** His idea as he described it: parts on WORK, runs straight down both sides of a plain two column grid, lights the side of each card as it passes, and the two sides meet on the View all work button.
- **B · Steps.** His idea made to land. The right column sits half a row lower. Each side drops from the title onto the top of its first card, as on the card in the test shot, runs off the end and down the side, swings off the foot and lands on the top corner of the next. The cards wake one at a time, left then right. The two sides sweep in to the button.
- **C · Middle.** One stream. The two sides close again under the categories, and the stream winds down the gap between the columns, landing on the inner top corner of each card in turn, left then right, and ends on the button.
- Still: `reference/studies/13-work-draft-three-layouts.jpg`, the three side by side with the whole line drawn.

**How each one reads, looked at whole**

- A reads as a bottle drawn round the section: a border. Its two rails run straight for three screens, which the brief rules out, and the cards wake in pairs with nothing landing on them.
- B keeps his framing and gives each card a landing. It is the fullest of the three. It needs wide margins: on an iPad held upright the swings reach the edge of the screen, and the real stream is far wider than this line.
- C is the most graceful line of the three and puts every strike in the middle of the screen, beside the card it wakes. Its shape is close to a timeline with alternating cards, which is a common pattern, and it leaves a gap of about 160 px between the columns, so the cards are narrower than in B.
- One stream is what a phone will have room for whichever is picked, so C is the only one whose idea is the same on every screen.

**Tried and cut before showing him**

- A fourth layout, Ledges: the stream landed on top of every card, ran the whole length of it and fell off the end, out along one row and back in along the next. The idea is the test shot's own motion. Drawn, it put a bracket round every row and the stream on every edge of every card. It read as a maze. The first landing in B is what was kept of it.
- C first had a straight line down the middle with short spurs to each card. The real stream has no spurs, and it read as a circuit. The winding line replaced it.
- The same switchback, with one column, may still suit the phone: the stream crossing in the gaps between cards costs almost no width. Not drawn.

**What is not right yet, and he is told**

- The phone. One column is only roughed in for all three, and none should be judged there.
- Motion. This workspace draws in software, and the line is not the stream. He judges the feel on his iPad.
- Every name, picture and tag is a stand in. Nothing on the page is for approval except the route.

**Notes for the next session**

- No blur filters in the sketch. A blur over a line three screens long, redrawn on every scroll frame, is slow on an iPad, and a filter on a perfectly upright line draws nothing because its box has no width. The glow is three wide strokes.
- The dashes that reveal each line are set from script on each path, not through a CSS variable inside `calc()`, to be safe on Safari.
- The half row for B and C is measured from the cards and written to `--half` on the stage, so it is exact at any width.
- A 404 in the browser's console on every page is the missing favicon, not this page.
- Stills in `reference/studies/` are numbered in the order they were saved, which is no longer the study's number. This one is 13.

**Fable's recommendation to him**

- C, said in bold as a change to a settled rule ("split, and run down both sides"), with B as the choice if he wants the two sides kept. Also in bold: A breaks "It never runs straight down", and all three touch every card against "It also should not touch everything".

**What he said after scrolling it (Nov 12)**

- "I think my favorites are one and two." A and B. No pick between them yet.
- The section is tall, and the categories end up a long scroll above the lower cards. He wondered about reducing the cards. He asked to talk it through with nothing changed.
- Measured on the draft at 1440 by 900: from the title to the button is about 1800 px in A and about 2180 px in B, two screens and more. A row of cards with its gap is about 500 px. With four cards instead of six it would be about 1300 px in A and about 1680 px in B, so fewer cards alone still leaves the categories off screen from the second row.

**Half finished**

- His pick between A and B, and what to do about the height. Then the card's look, then the real route in Claude Code.

## 2026-11-12 · Riding shards stay with the stream on objects, and the lone shard drops off again (Fable, Claude Code on Brandon's Mac)

**What Brandon said**

- The test shot is approved. These three are in `BRIEF.md`, The stream, at the end of "His verdict on the three changes".
- "Bring back the drop for the single shard thrown at rest. It should be carried off the far end and fall, as it did before the last fix. That one shard only. The second wave must not come back."
- "Where the stream lies on the title, where it parts, and on the card, riding shards disappear and reappear, and some look as if they are always falling away from the stream even when there is no strike. On the straight runs they are right. My rule: every shard stays part of the stream unless there is a strike. The only exception is the single shard thrown at rest. Find the cause before you change anything, and tell me what it was. Then fix it so a riding shard on an object stays with the stream just as it does on a straight run. Keep the lower count on objects that I approved, but reach it without any shard popping out or in."
- "No shard may change place in the moment it appears, and every shard that arrives or leaves does so by a smooth fade. Check it by recording each riding shard across the title and the card and counting how many vanish, reappear or jump. It should be none."
- "Change nothing else."
- He has not looked at the result yet.

**What was found**, before anything was changed

Every riding shard was recorded thirty times a second for thirty seconds with the page still and both leading ends well clear (`streamProbe`, `streamRiders`): where it was drawn, how much of its size it had, and what had taken the rest away.

| Where | Vanished | Appeared | Jumped over 6 px in a frame |
|---|---|---|---|
| Round the title | 302 | 523 | 169, of 6 to 141 px |
| Round the card | 219 | 211 | 83, of 6 to 149 px |
| A straight run | 17 | 15 | 0 |

- Half of them went or came in under a fifth of a second. That is the abrupt fade.
- **Three causes, all of them Fable's own from the second round, when the shards were thinned on objects.**
  1. **Thinning by hiding.** The lower count on an object was reached by hiding a share of the shards there. Which ones were hidden also depended on which side of the core each was on as it circled, so a shard blinked out and back in as it went round. 299 of the 302 vanishes at the title and 398 of the 523 appearances were this.
  2. **Turning a shard back off the nearest face.** A shard that would have been inside the title or the card was put back outside it, off whichever face was nearest. At a corner the nearest face changes from the top to the side, and the shard was moved from one to the other in a single frame. Every jump was this: 167 of the 169 at the title went from the top face to a side face.
  3. **Half of each side waited for the parting.** The stem carries the shards of both sides, so half of each side's were hidden on the stem and faded in where the stream parts. 124 appearances at the title were this.
- "Always falling away from the stream" was the first two together: a shard near a corner shrinking away, and one moved from the top face down the side.

**The fix**, in `src/stream/route.ts` and `fillShards` in `src/stream/stream.ts`

- **Nothing takes a riding shard out of the stream any more.** It rides the whole of its side, round and round.
- **Fewer on an object, by riding faster, not by hiding.** Where there are to be fewer shards to a length of route, each rides through faster, so they come further apart (`Branch.ride`, `along()`). `shards.thin` is the share fewer: 0.4, which measures the same as the 0.44 it was when the hiding had a soft edge. `shards.hook` went from 70 to 100 to keep the corners at his count, now that the extra thinning on the inside of a turn is gone.
- **Before the parting, the same.** The stem carries what both sides will, so each side's shards ride it at twice the speed, and nothing has to appear where it parts.
- **Kept off objects without moving at once.** Each point of the route knows how much room there is to each side before an object (`Branch.roomA`, `roomB`): the true room, made to change slowly along the route and never more than the truth. A shard with less room on one side than it would swing swings out on the open side both times, and with a little less room, a little. Its place never changes at once.
- The knots and the fade at a leading end go by how far a shard has ridden, so each takes as long as it did where shards ride faster. The twist round the core still goes by distance along the route, so the rope of shards is wound as tightly as before, on the stem too.

**The lone shard at rest** (`now()`, `throwShard()` and `moveLoose()` in `sim.ts`)

- The single shard a landing throws at rest carries a mark. Once it has stopped bouncing, and only if it is going the way the stream runs, the flow carries it along the surface and off the far end, where it falls, as before the last fix (`loose.carry`, `loose.skip`, `loose.spill`). One thrown against the stream still skids, stops and fades.
- Followed for two minutes at rest (`streamThrown(true)`): of 52, 45 went off an end and fell, and the 7 that ended on a surface had all been thrown against the stream.
- It lives four seconds (`loose.lone`) and its life is set once, as the flow takes it. Before, it could be shrinking away when the flow took it and grow back.
- Shards thrown by a strike are not carried. The second wave has not come back: leaving each end in the two seconds after the burst, 5, 1, 0 and 4, where the last fix measured 5, 1, 0 and 5.

**The count he asked for**, the same recording after the fix

| Where | Vanished | Appeared | Jumped | Furthest any moved in a thirtieth of a second |
|---|---|---|---|---|
| On the title: its top, the parting, both corners | 0 | 0 | 0 | 5.6 px |
| On the card: the landing, its top, its end | 0 | 0 | 0 | 5.4 px |
| On the title, phone layout | 0 | 0 | 0 | 4.1 px |
| On the card, phone layout | 0 | 0 | 0 | 3.6 px |

- "On" is within 50 units of the object, which is as far as the route counts as lying on it or hooking round it. 815 shards passed through the title's zone in the thirty seconds and 418 through the card's.
- No riding shard has its center inside the title or the card: none at rest in 45 frames down the page, none in any frame of a fast scroll, on desktop or on the phone layout. The build before this one measures the same.
- On the runs coming up to the title and the card, and on a straight run, the knots still thin and gather the shards as they always have: 1 to 9 went or came in thirty seconds, each over one to two and a half seconds. That is the straight run's own behavior, which he said is right.
- Where a leading end rests on an object, shards reach it and shrink into it over about a second, as at any leading end. That is the end of the stream, not a shard leaving it. While a leading end moves fast, shards appear behind it as it passes. That is the leading end too, and unchanged.

**The count on objects**, shards to every 100 px of route at rest, as he approved it then now: title top 23.5 and 21.6, now 21.6 and 24.4. Title corners 24.9 and 25.2, now 24.3 and 26.4. Where it parts 21.7, now 21.1. Card top 25.8, now 24.1. The landing bend 29.2, now 26.2. Straight runs and the stem above the title measure the same on the build before this one and on this one (34 and 33, 38 and 37).

**Reviewed**

- One fresh Opus reviewer read the change, told to find how a riding shard could still vanish, reappear or jump, and what else had changed. It confirmed the placement is continuous and that only the lone shard is carried. It found four things, all acted on:
  1. With nothing turning shards back off a face, some could swing into the title or the card: near corners, on the phone, and when flung wide at a leading end. That first version leaned shards to the open side by a blend that was not exact. It was replaced by the room to each side described above, and the count inside objects is the check.
  2. The twist round the core had been stretched to half as tight on the stem. It goes by distance along the route again.
  3. The carried shard could grow back after shrinking. Fixed as above.
  4. The record of riding shards was not remade when the page was rebuilt. Fixed.
- Its list of what else changed is the next section.

**Checked**

- Speed while scrolling without stopping: 16.7 ms every frame, none over 25 ms, on desktop, tablet, the phone view slowed four times and the low tier phone view slowed six times.
- WebKit at iPad and phone size: draws, no errors. Reduced motion: a still, as before.
- No thrown shard is turned round (0 of 82). The strike throws what it did.
- Not checked: a real phone and a real iPad.

**What this changes that he did not ask for. Each follows from the fix, and each is his to overturn**

1. **Shards ride faster where there are fewer of them.** On an object about 1.7 times as fast as on a straight run. Down the stem above the title twice as fast, and for a short stretch where it strikes the title about three times. What goes into a stretch of stream has to come out of it: fewer to a length means faster, and one stem feeding two sides means the stem runs at twice the speed. The number of shards on the stem is the same as before. The only other ways are the ones he saw as faults: hiding shards, or having them appear where it parts.
2. A shard near an object keeps to the open side from about 110 units before the object to about 110 units after it. That is the stretch over which the room to each side is made to change slowly.
3. On an object a shard swings out and back on the open side with a rounded turn at the surface. It used to be turned back off the surface sharply.
4. Where the knots sit along the stream has moved, because they now go by distance ridden, and they are longer on the stem. How strong they are is the same.
5. There are fewer riding shards in all, because none is hidden any more, and which shard rides which side has been dealt again.
6. The single shard at rest lives four seconds if it never lands, where it lived 1.3 to 2.6.

**Things the next session would otherwise rediscover**

- Riders have no state, so a rule that shows or hides one from where it is this frame will flicker whenever that place wobbles. To have fewer somewhere, change how fast they pass, not which ones show.
- What goes into a stretch of stream has to come out. Fewer to a length means faster. One stem feeding two sides runs at twice the speed or carries twice the shards.
- Putting a point back outside a box by its nearest face jumps at every corner, and the true room to one side of a route jumps where an object ends. Squeeze the room so the first few units count for most, take the least of its neighbours, then their average: the result changes slowly and is never more than the truth.
- A blend toward the open side that only looks at whether an object is near lets shards into it wherever the blend is partial. The reviewer caught that. The room has to be measured.
- Record every shard and count. `streamProbe(true)` then `streamRiders(left, top, right, bottom)` gives each rider's place, the share of its size shown, and what took the rest. The first table took one run and named all three causes.
- The live site is the build before the push, so the same script against it gives the before for anything the old build can report.
- A threshold of 6 px in a thirtieth of a second for a jump is close to how fast shards really move where it strikes the title (5.6 px). The old jumps were up to 149 px.

**Half finished**

- Nothing. Waiting on his look.

## 2026-11-12 · After the stream: his ideas for the sections, and the order (Fable, web chat)

**What Brandon said**

- The stream is "almost certainly the finalized base". He is ready to move on.
- He wants to go section by section, with rough drafts in the web chat, and a final pass over approved things such as the buttons before the full build. His ideas for Work, the 3D pieces and the cards are in `BRIEF.md`, Open 15. He was clear they are not decisions.

**What Fable proposed. Not agreed yet**

- The page top to bottom: hero, Work, Skills, About, Contact.
- Start with Work, not the hero: the stream's test shot is already Work's title and a card, the card is needed before any other section can be drawn, and his clearest idea is about Work. The hero comes later, with the city tied in and the opening redone.
- First a rough draft of the Work section here, then the card's look, then on down the page.

**Half finished**

- Nothing. He had Fable turned down for this talk. No sketches yet.

## 2026-11-12 · The stream's test shot is approved (Fable, web chat)

**What Brandon said**

- On the fix for the second wave: "This looks great to me. If there is any improvements to be made, it'll be very tiny ones, but I think for right now this is good to move on with."
- It is in `BRIEF.md`, The stream, and both test shot boxes in `PLAN.md` are ticked on his words.

**Where that leaves things**

- The stream at `/lab/stream` is the base everything else gets built from. He said so earlier today.
- What comes next is not decided. `PLAN.md`, Now, has Fable's recommended order.
- One small thing left for him to rule on: whether the lone shard at rest should drop off the end again.

**Half finished**

- Nothing.

## 2026-11-12 · The second wave after a strike: found and fixed (Fable, Claude Code on Brandon's Mac)

**What Brandon said**

- His verdict on the three changes is in `BRIEF.md`, The stream: "Everything is pretty much perfect now across the board minus one thing."
- "The burst at a strike looks right. But once it has finished there is a second wave: a group of shards leaves the right end of the card all at once, like a waterfall, and the same off both ends of the title. A strike should be one burst that dies away."
- "I do not know the cause, so find it before you change anything. Measure which shards make up that second wave. They may be thrown shards that came back down, or shards riding the stream that were never thrown, or something in how shards are handed back to the stream after a strike. Tell me what you found."
- "Then fix that cause. Keep everything else about the strike: the number thrown, the bounce, the skid and fade for ones that land short, and the single shard at rest. Check it by counting the shards that leave each end in the two seconds after the burst has finished, before and after your fix."
- He has not looked at the fix yet.

**What was found**, before anything was changed

Every shard was followed through both strikes of the same scripted scroll, sixty times a second. Thrown shards by their own number (`streamThrown`), and the ones riding the stream by counting them in the zone just past each end (`streamList`).

- **It was thrown shards that had come back down.** Of the 80 thrown at the two strikes, 58 landed back on the surface and then left an end. Only 8 flew straight off an end. 11 faded on a surface.
- The 58 left at about 400 px a second, between 0.6 and 2.1 seconds after the strike, at the height of the surface. That is the speed the flow carried a landed shard at. At the card, 29 of the 43 thrown went off the right end that way.
- **It was not the shards riding the stream.** Past the card's right end they appear as the leading end goes by and then hold steady at 72 to 79. At most 4 were flung wide of the core, for a moment, as the leading end passed. None left.
- **Nothing is handed back to the stream.** A thrown shard is never turned back into a riding one. It fades.
- The cause in one line: once a thrown shard stopped bouncing, the flow sped it up and carried it to the end of the surface. Most of a burst comes back down on the surface, so most of it reached the end in the same second and poured off together. That carrying was Fable's own addition in the second round, to clear thrown shards off an object quickly.

**The fix**, in `moveLoose` in `src/stream/sim.ts`

- The flow no longer moves a thrown shard at all. One that has stopped bouncing keeps its own momentum: it skids the way it was going, stops, and fades within 0.9 seconds. It is the rule the ones that landed going against the stream already followed, now for all of them. One still moving when it reaches the end of a surface goes off it and falls.
- Untouched: the number thrown (37 at the title and 43 at the card on this scroll, before and after), the launch, the bounce, the skid and fade (`loose.skid`, `loose.fades`), the sparks, and when and how hard the single shard at rest is thrown.
- `loose.carry`, `loose.skip` and `loose.spill` are gone from `config.ts`. Nothing uses them.

**The count he asked for**: shards leaving each end in the two seconds after the burst has finished. The burst is taken as finished 0.9 seconds after the strike, when the last shard that flies straight off an end has gone.

| End | Before | After |
|---|---|---|
| Title, left | 11 | 5 |
| Title, right | 7 | 1 |
| Card, left | 0 | 0 |
| Card, right | 23 | 5 |

- The most leaving one end in any half second after the burst: 13 before (the card's right end), 5 after (the title's left end).
- Thrown shards that landed and then left an end, at any time: 13, 16, 2 and 29 before. 5, 6, 2 and 9 after. The ones that still leave do it on their own momentum, at 85 to 330 px a second, within 0.7 seconds of landing: a shard that came down near the end and skidded or bounced off it.
- On a faster scroll, after the fix: 7, 4, 0 and 5.
- Thrown shards that end by fading on a surface: 11 before, 49 after. On the card's top after the strike on it there are 12 at half a second, 20 from 0.75 to 1.25 seconds, 14 at 1.5, 4 at 2 seconds and none by 2.5, beside about 27 riding. They are spread along it where they came down, and nothing lies still for more than 0.88 seconds.
- No thrown shard is turned round (0 of 82).
- Stills: `reference/studies/11-stream-after-the-burst-before-and-after.jpg` is the one to open first. `11-stream-strike-paths-one-burst.jpg` is every thrown shard's path after the fix. `10-stream-strike-paths.jpg` is the same plot before it, with the bundles pouring off the ends. `11-stream-strike-card.jpg` and `11-stream-strike-title.jpg` are the filmstrips, `11-stream-rest-paths.jpg` forty seconds at rest.

**Checked**

- One fresh Opus reviewer, given his words, what was found, the counts, the path plots before and after and the filmstrips. It passed the cause as fitting the plots, the burst as unchanged arc for arc, no new fault, and the single shard at rest. It passed the second wave as gone on the plots, and said the rendered filmstrips of the card looked the same before and after.
- So the ends were filmed after the burst, before (the live site, still the old build) and after, at the same moments. Frame for frame they do look alike: a group moving together does not show in one frame, and a few of the burst's own shards are still falling past each end in both. What shows it is `reference/studies/11-stream-after-the-burst-before-and-after.jpg`: only the paths taken in the two seconds after each burst. Before, thick bundles run along both tops and pour off the ends. After, they are gone.
- A shard that ends in mid-air shrinks to nothing over the last three tenths of its life, so none blinks out.
- Speed while scrolling without stopping: 16.7 ms every frame, none over 25 ms, on desktop, the phone view slowed four times and the low tier phone view slowed six times.
- WebKit at iPad and phone size: draws, no errors.
- Not checked: a real phone and a real iPad.

**One thing this changes that he did not ask for. His to overturn**

- The single shard at rest is thrown exactly as before, at the same uneven gaps, and still bounces. But it used to be carried along and off the far end, where it fell. Now it skids, stops and fades like any other, unless its own momentum takes it over an edge. In forty seconds at rest none left an end. Taking the push away from a strike's shards and leaving it on this one would mean two rules for the same thing, so it follows the one rule. If he misses the piece dropping off the end, that one shard can be carried again without bringing the wave back.
- This also narrows a line in the brief, that one thrown the way the stream runs "can still ride along and spill off that end". It now does so only on its own momentum. `BRIEF.md` says so beside that line.

**Things the next session would otherwise rediscover**

- To find which shards do something, follow them one by one. `streamThrown` gives each thrown shard its own number, so a path can be built for each across frozen frames, and `streamList` gives every drawn shard with whether it was thrown. The answer here was in the first table: 58 of 80.
- A thrown shard's first frames are within a few pixels of the surface it was thrown from. Counting "has touched the surface" from its birth marks every shard as landed. Count a landing only once it has been in the air and is coming down.
- Clearing something away by sweeping it all one way at one speed makes it arrive together. That is a second event. Letting each thing end where it is does not.
- A group of things moving together does not show in a still, or in two stills side by side. Plot the paths over the stretch of time in question.
- The live site is the build before the one being worked on, until the push. The same script run against it and against the dev server gives a true before and after.

**Half finished**

- Nothing. Waiting on his look at the strike.

## 2026-11-12 · Thrown shards: fewer at a strike, one now and then at rest, each keeps its momentum (Fable, Claude Code on Brandon's Mac)

**What Brandon said**

- His verdict on the second round is in `BRIEF.md`, The stream. In short: "It's really good!" The facets stay and the bunching is fixed.
- "Three small changes to the stream."
  1. "A strike throws a few too many shards. About a quarter fewer when a leading end arrives at the title or the card. Change nothing else about the strike."
  2. "At rest, a landing should throw a single shard now and then, not a steady flow. Start from one every three to six seconds per landing, at uneven gaps, and tune it by eye."
  3. "A thrown shard keeps its own momentum. The flow must never turn it around." One with enough force clears the near edge and falls. One that lands short skids a little the way it was going, stops, and fades within about a second. One thrown the way the stream runs can still ride along and spill off that end. The same on the title. Nothing may heap up.
- He has not looked at the result yet.

**What was built**, all in `src/stream/sim.ts`, with the numbers in `loose` in `config.ts`

1. **A quarter fewer at a strike.** `loose.burst` is the fewest thrown and how many more at full speed: 4.5 and 52, where it was 6 and 70. On the same scripted scroll the title threw 50 and now throws 37, the card 59 and now 43. The sparks, the flash, the arcs, the speed and the bounce are untouched.
2. **One shard now and then at rest.** The steady rate is gone. Each landing counts out its own gaps from the start of time, each gap a hash of its number, between `loose.now` of 3 and 6 seconds (`gap()` and `now()`). Because the gaps are counted from zero, the same moment still always throws the same shard, so a frozen frame is repeatable. Measured over 30 seconds at rest: the title's gaps were 3.9, 3.0, 3.4, 5.1 and 5.6 seconds, the card's 5.3, 4.0, 3.2, 5.1, 4.0 and 5.1. The two landings do not fall into step.
   - Tuned by eye: it is thrown a little harder than the old trickle (`loose.toss` 0.45, was 0.25), so the one piece is worth watching: it rises about 70 pixels, bounces once or twice, and goes.
3. **A thrown shard keeps its own momentum** (`moveLoose`). When it is too slow to bounce:
   - going the way the stream runs, it rides along with the flow and off that end, as before
   - going against it, it skids the way it was going (`loose.skid`), stops, and is gone within 0.9 seconds (`loose.fades`)
   - a bounce can no longer flip which way it is going either
   - one thrown hard enough against the stream still clears the near edge and falls. That needed no change.
   - Checked by following every thrown shard through both strikes with `streamThrown`: of 82, none went back more than 12 pixels against the way it set out. 6 skidded to a stop and faded on a surface, 3 cleared the card's left edge and fell, 67 left off an end, 6 were still in the air when the count ended. The longest any lay still before it was gone was 0.83 seconds.
- Stills: `reference/studies/10-stream-strike-paths.jpg` (every thrown shard's path through both strikes), `10-stream-rest-paths-one-minute.jpg` (a minute at rest), and the two strike filmstrips `10-stream-strike-title.jpg` and `10-stream-strike-card.jpg`. The plot from before the change is `09-stream-facets-thrown-paths.jpg`.

**Checked**

- One fresh Opus reviewer, given his three asks, the plots before and after, the filmstrips and the numbers. It passed all three and found nothing else broken. Its one note, that the gaps at rest were only mildly uneven, was acted on (see below).
- Speed while scrolling without stopping: 16.7 ms every frame, none over 25 ms, on desktop, tablet, the phone view slowed four times and the low tier phone view slowed six times.
- WebKit at iPad and phone size: draws, no errors. Reduced motion: unchanged, nothing flies.
- Not checked: a real phone and a real iPad.

**Calls made for Brandon. Each is his to overturn**

1. The gaps at rest are drawn evenly from the whole of three to six seconds. `loose.now` holds the two ends.
2. The single shard at rest is thrown harder than the old trickle was. `loose.toss` is the number.
3. A shard that lands going against the stream is gone 0.9 seconds after it settles. He said "about a second".

**Things the next session would otherwise rediscover**

- The hash in `rand.ts` mixes numbers that follow one another poorly. Gaps hashed from 0, 1, 2 came out nearly even, and seven shards in a row keyed 100000, 100001 and so on mostly went left. `scatter()` in `sim.ts` spreads a count across the whole range before it is hashed. Use it for anything keyed by a small running count.
- A rate turned into events by adding it up each step gives evenly spaced events. For uneven ones, count the gaps out from the start of time and keep where you are, and set that again in `settle()`.
- `life = Math.min(life, age + seconds)` shortens a life once and then leaves it, because the age grows. Written with `=` it would push the end away for ever.

**Half finished**

- Nothing. Waiting on his look at the strike and the landings at rest.

## 2026-11-12 · The stream's test shot, second round: facets (Fable, Claude Code on Brandon's Mac)

**What Brandon said**

- He was away for this session: "Work straight through until it is finished and live, without waiting for me. Where a decision would be mine, make the call you would recommend, write it in LOG.md, and keep going."
- Four changes, from his verdict in `BRIEF.md`: the shards rebuilt as jagged facets in a solid and a clear material, the first round's shards kept one switch away, about a quarter fewer shards where the stream lies along or hooks over an object, and more presence at the size of the whole page.
- "Keep the strike. Shards blasting off and bouncing is my favorite part. Make it better if you can see how, but do not lose it. The sparks are right as they are. Do not change the core, the leading ends, the scroll or the cursor beyond what this needs."
- Nothing below has his verdict yet.

**What was built**

- **The shards are facets** (`src/stream/shards.ts`). Each is the tightest skin round a small body and three or four points pulled far out of it, one further than the rest, so every point ends in a needle and no piece is the same on both sides. A notched piece has a second lobe grown out of the same body at a slant. 24 kinds in three sizes: a small one keeps more body, a large one is more needle. The shape is taken from panel B of `/lab/stream-facets` and built new, without three.js.
- **One family of shapes in two materials** (`SOLID_FRAG` and `CLEAR_FRAG` in `src/stream/shaders.ts`). 45 in every 100 are clear.
  - Solid: every face is a flat mirror of dark metal. The core is a line, so a face shows none of it or all of it: it is dark until it turns to the light, and then the whole face flashes.
  - Clear: what is behind it shows through, dimmed and shifted by each face. It holds light through its body, each face its own amount and most in the middle of a face, and every edge is a step brighter than the body beside it.
  - Nothing is drawn on a surface. What there is to find is in the light: a hairline where the bevel between two faces catches the core, and a glint on the points. Each vertex carries the bevels of its face's three edges for this.
- **The first round's shards are one switch away.** `/lab/stream?shards=first`, or the switch at the foot of the test page, which swaps the two where they stand without moving the scroll. Their meshes and shaders are in `shards-first.ts` and `shaders-first.ts`.
- **Fewer shards on objects**, and the cause.
  - Per length of route the count was the same everywhere, about 36 to every 100 px. On an object the shards cannot go round the far side of the core, so every one of them rode the one open side: twice as thick on the ground. They were also folded back off the surface into seven tenths of the room, the two sides both carried their full number where they part, the inside of each turn squeezed them together, and a knot could sit on an object.
  - Now: a share of them is taken away along an object and where the stream hooks round one (`shards.thin`, `shards.hook`), the rest ride wider (`shards.spread`), each side brings in its second half only as the two draw apart, the inside of a turn is thinned by how tight it is, and there are no knots within reach of an object (`route.calm`).
  - Measured with `streamCount`, shards to every 100 px of route at rest, first round then now: straight runs 36 and 37 (unchanged). Title top 36 to 24 and 33 to 22. Where it parts 35 to 22. Title corners 35 to 25 and 37 to 25. Card top 42 to 26. The bend where it lands on the card is 29 now and was not measured before.
  - At rest each landing throws half as many as it did (`loose.trickle`). They landed on the bend and stayed in the count there. The number thrown when a leading end arrives is unchanged.
- **The strike**, kept and pushed a little (`sim.ts`, `moveLoose`).
  - A bounce keeps more of the fall (`loose.bounce` 0.58, was 0.46), a different share each time, and leaves a little sideways, as an uneven piece would. They are thrown a tenth faster.
  - A thrown facet that has stopped bouncing is carried along the surface by the flow, quickly, and off the end, where it falls and fades. In the first round it faded where it lay, on top of the object. That was part of the bunching.
  - `streamThrown` lists every thrown shard, and a plot of their paths (`reference/studies/09-stream-facets-thrown-paths.jpg`) shows the fan, the bounces and the spill off both ends of the title and the end of the card.
- **A little more presence on a wide screen**, from heat alone: the heart of the core is a third hotter, and the page takes a little more of its light (`GLOW.more` in `renderer.ts`). It scales with the width of the screen (`presence` in `config.ts`): a phone gets none of it, because the stream is already large against a phone's screen. The clear facets add to it: they glow, where the first round's glass was mostly outline. A wider glow and more light in the body of the ribbon were both tried and both taken back out: see the reviews.
- **So the core is not hidden:** the knots along a free run are a little gentler (`shards.wave`), and shards pass across the face of the core quicker than they pass its sides (`shards.aside`). Facets are solid, and a knot of them at full strength hid the core.
- Stills are `reference/studies/09-stream-facets-*.jpg`.

**Budget**

| | Mac (high) | Phone (mid) | Slow phone (low) |
|---|---|---|---|
| Shards to every 100 units of route | 55 | 38 | 26 |
| Thrown shards in the air | 260 | 120 | 60 |
| Sparks | 700 | 300 | 160 |
| Pixel density, up to | 2x, 9.6M pixels | 3x, 3.8M pixels | 1.5x, 1.7M pixels |
| Fibres in the core | 9 | 7 | 7 |

- Unchanged from the first round but for one line: a clear facet takes one sample of what is behind it on every tier. The first round's glass took three on the Mac. Three read as noise inside a facet.
- Measured (`npm run perf`, hardware, the page scrolled up and down without stopping): 16.7 ms every frame, none over 25 ms, on desktop, 4K, tablet, the phone view slowed four times and the low tier phone view slowed six times. The stream's own work on the processor peaks at about 1.5 ms on desktop and 3.8 ms on the slowest phone setup.
- WebKit at iPad size and phone size: draws, no errors, both looks.
- Not measured, as before: a real phone and a real iPad.

**Calls made for Brandon. Each is his to overturn**

1. The switch swaps the shards and nothing else. Both looks get this round's thinning on objects, strike and presence, so the two are compared like for like.
2. On an object there are about a third fewer shards per length of route, not the quarter he named: 35 in 100 fewer on the title's top, 38 where it parts, 30 at its corners, 39 on the card's top. The bar asks that they lie no thicker on the ground there than on a straight run, and by the measure it takes a third, with them riding four tenths wider, to get there. `shards.thin` is the number: at 0.38 it measured his quarter.
3. Each landing throws half as many at rest. The burst when a leading end arrives is untouched.
4. A facet near the cursor turns half way toward it, not all the way as a leaf did (`shards.face`). Turned all the way it showed only its broadest face, flat on, and a patch of them read as paper.
5. The facets are a little thicker than the sketch's, a notched piece shares one body, and fewer are notched (`NOTCHED` in `shards.ts`). In the sketch's own proportions reviewers read the thin ones as folded paper and the notched ones as two pieces. The handoff said to drop the notch if it read as two. It is kept, rarer.
6. Sizes: a facet reaches from 4.5 to 17 pixels from its center on a desktop, the same as the first round's shards. It is mostly points, so it covers less.
7. The core's design is untouched. On a wide screen its heart is a third hotter, and that is the only thing done to it. How much presence that buys is modest. The next step would be a paler, more plainly braided core at page size, which means changing the core he approved, so it is left for him.
8. The leading ends, the scroll rules, the sparks, the route and the lighting of the title and card are unchanged.

**Reviewed, and failed each time**

Fresh Opus reviewers, stills and filmstrips only, told to find reasons to fail it against `QUALITY.md` as it now stands, and told plainly that no shard has to read as a named material. Four rounds, eight reports. All eight failed it overall. The last change has not been reviewed.

- **Round 1, three reviewers.** Passed: the strike, the cursor, the phone, reduced motion, the light on what it passes. Failed: the clear facets as wire outlines, some with garbled pixels inside. Thin pieces as folded paper. The core as a neon line at page size, made worse by a wider glow added for presence. Clumps at the parting and the title's corners. Knots of facets hiding the core. One reviewer failed it for racing along the title and the card: that is the first round's rule that the end may run up to 1.8 times the scroll along a level stretch, which he asked not to be changed.
- **Round 2, two reviewers,** after the glow was taken back out, the clear material rebuilt, the pieces thickened and the knots calmed. Passed: palette, phone, reduced motion, the scroll back up, the bounce and spill of the strike. Failed: the clear facets as a flat fill inside an outline. The pieces now too blunt, near regular pyramids. Notched pieces as two stuck together. Objects still about a third thicker on the ground than a straight run. Thrown shards crowding the card for a second and a half after a strike.
- **Round 3, two reviewers,** after the shapes went back to needles, the clear material became a lit body, objects were thinned to a third fewer and thrown shards were swept off sooner. The motion reviewer failed it narrowly: the title top, the parting, the strike and the leading end passed, a knot remained at the bend where the stream lands on the card, and thrown shards still rattled along the card. The stills reviewer failed it: some pieces as origami, the two materials not far enough apart, notched pieces as two, the shards as dark specks at page size.
- **After round 3:** the solid was made darker with a harder flash, the clear given bright edges again over a glowing body, the pieces thickened a little, notches made rarer, hooks round objects thinned, the resting trickle halved and thrown shards carried off faster.
- **Round 4, one reviewer, all eleven conditions.** Ten passed: a shard as a solid object with the two materials told apart (with a flaw: the clear facets' lit ridges read as folds in paper), the core at zoom, the light on what it passes, the leading end, the landings and the bunching, the motion, the cursor (weakly), the palette, the phone and the speed, reduced motion. One failed, and with it the round: beside the sketch at page size. The presence had come from more light in the body of the ribbon, which thickened the core into a smooth orange band and hid the fibres the first round had.
- **After round 4, and not reviewed since:** the extra light in the ribbon's body was taken out, so the core's fibres are as they were in the first round and only its heart is hotter. A clear facet's bright edge now runs round its outline only. A ridge between two faces that both look at the eye lights only where it catches the core.
- **What no round passed:** at the size of the whole page the reviewers read the core as a neon outline and prefer the sketch's pale braided core. That is the core he approved, and it is a question for him, not a change made here.

**Fable's own judgment**

- At the bar: the strike, with the bounce and the spill now measured and not just seen. The two materials at three times zoom, which read as dark metal and as lit amber and are told apart at a glance. The title top and the card top, which are no thicker than a straight run by measure. The phone. The speed.
- Not at the bar, or not proven: whether a notched piece reads as one piece when it tumbles, which stills cannot settle. Small random clumps still form on any run, because the shards are placed by chance. Edges step at four times zoom, which is the limit of four samples to a pixel. At page size on a wide screen it has only a little more presence than the first round, and the sketch's core is still the paler, more braided one.
- The reviewers judge stills. He judges it moving. The first round failed eight reviews and he said it was nailed. The reviews above are reported as they came, not argued with.

**Half finished**

- Nothing. Waiting on his verdict: facets or the first round's shards, whether the bunching on objects is gone, whether the strike is still his favorite part.

**Things the next session would otherwise rediscover**

- A value given to each corner of a triangle is not the value in the middle of it. The distance from a facet's center, sent per corner to light its points, lit whole faces whose three corners were all tips. It is worked out per pixel now (`tipAt`).
- Adding two warm lights walks the color toward yellow once red is full. The clear facets join what shows through them and what they hold by keeping the brighter, as the light buffer does.
- More glow is not more presence. A wider, stronger halo made the core a neon tube at page size, and more light in the body of the ribbon hid its fibres and made it a band. Heat reads as presence: a paler center.
- The cursor's light is small. A flat face mirrors it only when lined up almost exactly, so its highlight has to be narrow or every facet turned to it goes pale at once.
- To compare how thick the shards lie in two places, count them against the length of route through each place (`streamCount` returns it), not against the width of the box drawn round it. Where the stream parts, two sides and the run above them are all in one box.
- The shape has a narrow window. The sketch's proportions with its thin depth read as folded paper. More body read as blunt pyramids. Long needles on a small body read as slivers with no faces. What is there now is the sketch's proportions, one point longer than the rest, a little more depth.
- A `for` loop over strings of flags in zsh does not split them into words. The perf runs for the other screen sizes silently ran as desktop until each was written out.
- A production build run while the dev server is up can leave duplicate files such as `routes.d 2.ts` in `.next/types`, and the type check then fails on them. Delete the duplicates.

## 2026-11-12 · Brandon's verdict on the test shot, and the handoff for the second round (Fable, web chat)

**What Brandon said**

- All of it is in `BRIEF.md`, The stream, under "His verdict on the test shot, and what changes", and two lines at the end of Hero. Read those first. In short:
  - "I'm really loving the way it's coming together." "I think we nailed this and we build everything else off of this stream."
  - The strike is his favorite part: shards blasting off and bouncing. Keep it. He does not want it frozen either: "I also don't wanna hinder him from pushing it further."
  - Sparks, on scroll and at a strike, are right as they are.
  - Too many shards, bunched, only where the stream lies along or hooks over an object. About a quarter too many there, by his eye. Straight runs and strikes are right.
  - The shards stop being copper leaf and glass. Two materials, solid and clear, in one family of shapes: facets.
  - The opening animation is 5 out of 10 and the city needs work. Both come later.
- He looked at it on his own machine, moving. He had not found the sparks at a strike until he scrolled fast.

**What changed in the record**

- `QUALITY.md`, The stream: the shards are described as facets in two materials. Test 1 no longer asks for a shard to read as copper or as glass. Test 6 now covers bunching. The fail list has bunching and a strike with nothing thrown. The verdict table has his verdict and its lesson.
- All eight reviews last night failed the shot mainly on materials he does not look for. That was the bar's fault, and mine. Reviewers now get told that no shard has to read as a named material.

**If you are the session in Claude Code, this is the second round**

1. **Rebuild the shards as facets, in the jagged look he picked.** It is the right hand panel at `/lab/stream-facets`. Open it, strike it, and read `jagged()` in `src/stream-facets/facets.ts` for how its shapes are made: a small core with three or four points pulled far out so each ends in a needle, larger pieces made of two of those fused at an angle, small pieces given more body, and every piece scaled so none reaches further than its size allows.
   - The sketch settles the shape only. Its lighting and bounce are stand-ins: yours are better. Build the shapes new in `src/stream/shards.ts`.
   - Sizes: a range, most of them small, none oversized. About the footprint the shards have now.
   - Nothing on the surface. The detail is in the light: every face its own tone, edges crisp enough to catch a hairline of light, points that glint. What fails is a toy: faces all one tone, soft edges, rounded lumps.
   - One thing Fable could not check in a still: whether a notched piece reads as one piece or as two stuck together when it tumbles. Look at that in motion and drop the notch if it reads as two.
2. **Two materials on the same shapes.** Any facet can be solid or clear. Solid: dark until a face turns to the light, then the whole face flashes. Clear: carries the light through, glows inside, brightest on its edges. Keep the color coming only from how a shard is lit. Find the mix by eye, starting from what it is now.
3. **Keep the first round's shards one switch away**, for example `/lab/stream?shards=first`, so he can put the two side by side. He loves what he has. If the facets are not plainly better, he needs to be able to see that for himself.
4. **Thin the shards where the stream lies along or hooks over an object**: the top of the title, its two corners, the top of the card. About a quarter fewer there, evenly spaced, no clumps. Leave the straight runs and the number thrown at a strike as they are. Find the cause before turning a number down. Two guesses from reading your log, not your code: each landing keeps throwing a few shards while the page is still, and the two sides' riders overlap where they part.
5. **The strike stays.** Thrown shards are the same facets. They must still blast off and bounce. Make it better if you can see how: your own reviewers noted that no filmstrip frame caught a bounce, and a chunky facet should show its weight better than a leaf did.
6. **Sparks: no changes asked.** Leave them unless you can plainly better them without changing their balance.
7. **More presence at the size of the whole page**, where you and your reviewers found the sketch still punchier. Not at the cost of anything in this list.

**Do not**

- Touch the core, the leading ends, the route, the title and card lighting, the scroll rules or the cursor, beyond what the list above needs. He likes all of it.
- Start on the city, the opening, the layout or any component. They are noted in the brief for later.

**Showing him**

- One check-in this time, the shot moving, with the paused frame beside it. A production build, pushed, the live link, and the switch to the first round's shards.
- Fresh Opus reviewers first, judging against `QUALITY.md` as it now stands.
- Say what is at the bar, what is not, and exactly what he is approving: facets or the first round's shards, and whether the bunching is gone.

**A mistake to know about**

- Brandon wondered aloud whether the facets should be "sharp jagged pieces, kind of low poly". Fable wrote that into the brief and the bar as his ruling and put it in a prompt. He had not ruled: he was asking. It was taken back out, and the two looks were built as a quick study for him to choose from. A question from him is not a ruling.

**After he tried the two looks (Nov 12)**

- "I think I like the jagged ones", B, more. But "I don't like how some of them are really big", he likes A's sizing more while still liking a range of sizes, and he "was also hoping they'd be a bit more jagged".
- Panel B was reworked to that and A left alone: B's pieces now reach no further than A's at the same size, each has three or four needle points, larger ones are two splinters fused at an angle so the outline has a notch, and small ones keep more body so they still flash. He has not judged the reworked B yet, so the look is still not a ruling.

- His verdict on the reworked B: "Yes the re-worked jagged was my favorite." It is in `BRIEF.md` now.

**Half finished**

- Nothing. The prompt for this round went to Brandon to paste.

## 2026-11-12 · The stream's test shot (Fable, Claude Code on Brandon's Mac)

**What Brandon said**

- He was asleep for this session and said so: "Work straight through both check-ins in the handoff without waiting for me." "Where a decision would be mine, make the call you would recommend, write it in LOG.md, and keep going. I will judge both check-ins when I am back."
- Nothing below has his verdict yet.

**The sketch in motion, seen for the first time (hardware, live frames of panel A)**

Works:

- At rest it is alive without being busy: sparks drop steadily from both leading ends and both landings, and the shards drift.
- Coming down, each leading end throws a wide plume of sparks and the shards flare out round it. It reads as the front of something with energy.
- Reaching the title, the one line spreads both ways along the top and reads as parting.

Does not work:

- Scrolling back up sheds as many sparks as coming down, and leaves plumes hanging in the air under the retreating ends. It reads as leaking, not as drawing back.
- The landing on the card is not an event. The end turns the corner and nothing is thrown.
- The core is the same width and brightness everywhere and nothing travels along it. Zoomed out it reads as a neon outline of the route.
- Shards come and go at the leading end by changing size. They do not read as thrown.
- Every spark is the same blunt dash, the same length, in an even fan.
- At three times zoom the shards are flat tan and grey squares and small triangles, the fine lines of the core are wire, and each leading end is a soft ball.

**The real things, looked at before any of the look was built** (`reference/stream/`, with credits)

- **Light trails.** A long exposure of a swung lamp is a ribbon of many fine strands lying side by side. It burns out to a flat pale band where they overlap and feathers into single hairs at its edges. Nothing in it has one width for long.
- **Metal leaf.** Flakes are angular and torn, not round. Up close the leaf is crinkled into small facets, and a facet is either blown out or dark, with little between. That jump is what reads as metal.
- **Broken glass.** On a dark ground the body of a shard is invisible. What shows is its edges, as thin bright lines of uneven strength, and a faint sheen on a face. Shards are thin plates with points.
- **Caustics.** Light thrown by glass is bright curves with cusps, never soft spots.
- **Grinder sparks.** Long, hair fine, nearly parallel streaks from one point, dense at the source, some bursting into short forks at their ends.
- **Arcs.** A white hot root and many hair fine filaments that branch, thin and fade.

**The method, and why**

- **Shards are real meshes**, made once from a seed (`shards.ts`): copper leaf is a thin torn sheet with slight folds, glass a thin plate with slanted broken edges. Sixteen kinds, drawn as instances with multisampling. A flat card can never show a face, an edge and a lit side.
- **Each is lit per pixel by the core as a long line of light.** What a mirror shows of a line is a band across the face, which slides as the shard turns. A point light gave spots and read as paper. The copper takes the buttons' metal values from `src/metal/finishes.ts`.
- **Glass redraws what is behind it.** Everything else is drawn into a texture first, and each splinter samples it shifted by its own faces. The split is kept to flame and hot.
- **The core is a ribbon of fibres that turns as it runs** (`coreFrag`). Flat on, it is a wide soft band. Edge on, it gathers to one fierce line. This came third: a line with a glow read as a neon tube, and loose crossing strands read as a tangle of wire.
- **Everything that glows is an amount of light**, joined by keeping the larger, and colored once by `ramp()`. Kept from the sketch.
- **One blur chain gives three lights** (Jimenez's 13 tap down, tent up): the glow that hugs the core, a wide light for the page, and a close light with a steep falloff for what the stream touches.
- **The title is real page text.** Its letters are drawn into a distance field (`titleField` in `stream.ts`, using `src/metal/edt.ts`) and lit as raised shapes. The DOM text stays for readers and is made transparent once the stream is drawing. Any heading can be lit this way.
- **The canvas is laid over the page and rides with it**, a little taller than the screen, so what it draws stays locked to the page during a fast scroll.
- **What flies is simulated** (`sim.ts`): 120 fixed steps a second from the one clock, every random choice a hash of a counter. `settle()` runs it forward from nothing, so a frozen frame at a time and a scroll position always draws the same.
- **Where it goes is planned** (`route.ts`) from where the title and the card really are.

**Budget**

| | Mac (high) | Phone (mid) | Slow phone (low) |
|---|---|---|---|
| Shards to every 100 units of route | 55 | 38 | 26 |
| Shards drawn at once, about | 800 | 550 | 380 |
| Thrown shards in the air | 260 | 120 | 60 |
| Sparks | 700 | 300 | 160 |
| Pixel density, up to | 2x, 9.6M pixels | 3x, 3.8M pixels | 1.5x, 1.7M pixels |
| Glass | three samples, warm split | one sample | one sample |
| Fibres in the core | 9 | 7 | 7 |

- This differs from what Brandon was told before building. The phone keeps its full 3x density, because at 2x the reviewers found it soft. The shard counts are higher on every tier.
- Measured (`npm run perf`, hardware): 16.7 ms every frame on desktop and on the phone view with the processor slowed four times, none over 25 ms. The stream's own work on the processor is 1.4 ms on desktop and 2.2 ms on the slowed phone.
- Not measured: a real phone's graphics chip. The canvas is multisampled and that is the part most likely to cost there.

**Calls made for Brandon while he slept. Each is his to overturn**

1. The stand in title is the word WORK in wide spaced capitals. Capitals give the stream one level line to lie on.
2. How big the stream is: its sheath of shards is about 75 pixels across on a desktop, and shards run from about 8 to 34 pixels. The sketch's ran from 3 to 15, too small to show a face. `scale` in `src/stream/config.ts` sets it.
3. The leading end rests two thirds of the way down the screen. It goes down the page no faster than the page was just scrolled. Along the title or the card, where the route runs sideways, it may go up to 1.8 times as fast. Held strictly to the scroll's speed there, it fell behind and then crept for two and a half seconds after the scroll stopped, which both reviewers read as sliding. `head.across` in `src/stream/config.ts` is the allowance. Set to 1 it is strict again.
4. The stream lies on the title and the card, and they are drawn in front of its light, so a surface cuts the core off cleanly. It was first run 15 units above them and reviewers read that as hovering.
5. The turns of the route are thrown curves with unequal reaches, not arcs of one radius, which read as a neon sign.
6. A held frame is opened with `?hold`. It scrolls itself to the place, freezes the clock and leaves the page free to scroll and zoom.

**Check-in 1 · a paused frame**

- Pushed. Open `/lab/stream?hold`. Stills are in `reference/studies/07-stream-*.jpg`, with `07-stream-beside-sketch.jpg` beside the sketch.
- Three rounds of two fresh Opus reviewers, told to find reasons to fail it against `QUALITY.md`, the sketch, the PC Builder and the photographs. All six reports failed it overall.
  - Round 1 failed everything: a neon tube, copper as paper or bark, glass as amber tiles, a weak leading end, the stream hovering over the card, an unlit title.
  - Round 2, after the first rebuild: the card's lighting passed. Copper read as low poly rock, glass as empty outlines, the core as a tube inside a tangle of strands.
  - Round 3, after the second rebuild: the leading end passed with both. Still failing: copper as mottled camouflage, glass as outlines or flat fills, the fibres as a cable on the phone, the title not warmed, a round ball at the hot point.
- After round 3 the copper's facets were made finer with a tight glint, the glass body dimmer, the fibres uneven and crowded to the middle, the title warmed, the round ball removed, and the brightness lifted. That state has not been reviewed.
- Fable's own judgment. At the bar: the leading end, the light on the title and the card, the landing, the color. Better than the sketch at three times zoom. Not at the bar: the glass, which still reads mostly as bright outlines, and whether the copper reads as leaf. At the size of the whole page the sketch is still the brighter, punchier picture.
- A fault found by testing in WebKit and fixed: the light was invisible there. WebKit discards any color brighter than its own alpha, so the light now carries an alpha and is laid over the page, not added.

**Check-in 2 · the same shot moving**

- Open `/lab/stream` and scroll. Filmstrips are in `reference/studies/`: `07-stream-scroll-down.jpg`, `07-stream-scroll-back-up.jpg`, and single frames of the two landings, `07-stream-parting.jpg` and `07-stream-landing.jpg`.
- **Scrolling down.** The leading end keeps to its place on the screen. Its energy rises with the speed of the scroll: more sparks, longer arcs, the shards flung wider. It settles in about two seconds after the scroll stops.
- **The two landings.** Where a leading end strikes the title or the card there is a flash, a fan of thrown shards and a burst of sparks, more of each the faster it arrived. Thrown shards fall, bounce, skitter along the surface with the flow and spill off its end. None comes to rest. At rest each landing still throws a few a second.
- **Scrolling back up.** The leading ends draw back along the route with no burst. They are at their resting place about a second after the scroll stops.
- **The cursor.** Shards within about 170 units turn their faces to it and flash. A finger or a pen puts the light where it touches.
- **Reduced motion.** A still that follows the scroll: the core, the shards, and one fixed crackle of arc at each leading end. Nothing flies.
- **Speed** (`npm run perf`, hardware, while the page is scrolled up and down without stopping): 16.7 ms every frame, none over 25 ms, on desktop, wide, 4K, tablet, the phone view with the processor slowed four times, and the low tier phone view slowed six times. The stream's own work on the processor peaks at 1.8 ms on desktop and 2.1 ms on the slowed phone.
- **WebKit**, the engine of his iPad and of every iPhone browser: loads and draws at iPad size both ways round and at phone size, with no errors.
- **Not done:** a real phone and a real iPad. `PLAN.md` has that after his verdict.
- **Reviewed** by two fresh Opus reviewers from filmstrips and single frames. Both failed it overall.
  - Passed by both: shards near the cursor flash and turn, the reduced motion still, the phone view.
  - Passed by one each: the leading end, and the landings, both narrowly.
  - Failed by both: the leading ends crept for seconds after the scroll stopped. The draw back up lagged the scroll, then closed after it stopped. At the size of the whole screen it was not plainly better than the sketch, thinner and dimmer. The paused frame's faults again: a neon read at page size, copper as mottled paper.
  - Also noted: the energy stopped rising above a middling scroll speed, the resting end was dim after drawing back, and no frame at filmstrip size showed a shard bounce.
- **Changed after that review, and not reviewed since:** the leading end's speed rule (call 3 above), so it now settles within about half a second of the scroll stopping, down or up. Its energy keeps rising to a faster scroll. The resting end is hotter. Thrown shards are larger. The whole stream is a little larger and brighter (`scale` 1.25).
- **Fable's own judgment of the motion.** At the bar: the parting on the title and the landing on the card at speed (`07-stream-parting.jpg`, `07-stream-landing.jpg`), the leading end's energy, the cursor. Open: whether the motion of the shards along the core has enough weight, which a filmstrip cannot show and only he can judge in his browser.

**Things the next session would otherwise rediscover**

- Page coordinates are y down, so a mesh wound counter clockwise is clockwise on screen. The shards are drawn with `frontFace(CW)`.
- A point light on small tumbling facets is almost never mirrored to the eye. A long line is, which is why `coreBand()` works from the plane that holds the shard and the line.
- `sin(s / k)` has a wavelength of two pi times k. Strands with k of 64 to 170 ran side by side for hundreds of pixels and read as wire.
- Riding shards are placed by formula from the time and the leading ends, so they need no state. Only sparks, thrown shards and arcs are stepped.
- `npm run strip` with `streamPlay` gives a repeatable filmstrip of a scroll. See the example in `CLAUDE.md`.
- Wikimedia limits requests: two sessions searching at once both got empty answers.

## 2026-11-11 · Handoff to Claude Code: the stream (Fable, web chat)

**What Brandon said**

- On the two sketches: "This was a tough decision, as they are both really good. But I'm gonna go with option A."
- On the agreement for the finished version: "I like all your recommendations."
- On giving you the sketch as a reference and building new: "I'm in complete agreement with you. I am ready for the handoff."

**Where things stand**

- What the stream is, and what its finished version has to have, are settled. Both are in `BRIEF.md`, The stream. Read The agreement there twice.
- The test it has to pass is in `QUALITY.md`, The stream.
- Nothing of the finished stream exists yet. `src/stream/` and `/lab/stream` are yours to start.
- The documents were renamed in this entry's commit: it is the stream now, not the pour. The set aside studies keep their old names.

**If you are the session in Claude Code, do this first**

1. Pull. Read `BRIEF.md`, `PLAN.md`, `QUALITY.md` (open every image it lists) and this entry.
2. Check which model you are and tell Brandon. This is Fable's work.
3. Run `npm run shot -- /lab/stream-core` and open the image. It should print `hardware`. If it prints `software`, tell Brandon before going further.
4. Watch the sketch move. You are the first model that can. Take filmstrips of `/lab/stream-core` at rest and with `?reach=` stepped from 0.2 to 0.9, and write down in this file what in its motion works and what does not.
5. Look at the real things, as `QUALITY.md` says, before writing any code.
6. Choose your method. Tell Brandon in a short list what you chose, why, and the budget for his Mac and for a phone with what the phone gives up. Do not wait for a reply. Carry on.
7. Build the test shot. Follow "How a piece of work goes" in `CLAUDE.md`.

**The test page**

- `/lab/stream`: a page a few screens tall, empty but for a stand in title and a stand in card, placed so the route is the sketch's: down from the top, parting on the middle of the title, both sides round its ends, the left side landing on the card, running along its top and off its end, both sides carrying on down.
- The stream follows the page's own scroll. Its leading end stays near one height on the screen as the page moves, eased, and never moves faster than the scroll. At the top of the page it has already come a little way down, so the first screen is not empty. Scrolling back up draws it back.
- Above its leading end the stream stays where it has run.
- A finger scrolls this page. Do not take touch away from scrolling the way the sketch's panels do.
- How big the stream is on a real page is yours to find: big enough that a shard shows its faces, small enough that it never crowds what a visitor would be reading beside it. In the sketch the sheath of shards is about a tenth of a panel wide, the shards run from about 3 to 15 pixels across, and there are about 750 to each side. He agreed to "about its density". Say what you chose.

**The two check-ins. He judges nothing in between**

1. **A paused frame.** A link that opens with the frame held, the stream about two thirds of the way down the route. On a held frame the cursor still moves the light and nothing else moves. He is approving the look: the core, the copper, the glass, the light on the page and on the title and card, the leading end at rest, the color. He is not approving any motion. Send it with stills at three times zoom and one still beside the sketch's.
2. **The same shot moving.** Scrolling down and back up, the leading end gaining and losing energy, both landings, sparks, shards turning toward the cursor, the phone view, reduced motion, and the numbers from `npm run perf`. This is the one where he says whether it looks incredible.

- For each: a production build, commit, push, the live link, what is at the bar, what is not and why, and exactly what he is approving. Write his verdict into `BRIEF.md` when he gives it.
- Before each, have fresh Opus reviewers judge the stills, as the last session did. If they fail it, fix it or say so plainly. Do not show him something they failed as if it had passed.
- If a decision in between is his to make, ask it as one short question with your recommendation.

**What the web chat could not do, and you can**

- See motion. Every still of the sketch was drawn in software. Nobody but Brandon has seen it move.
- Open the live link and the local site in a real browser, and try WebKit, which is what his iPad runs.

**Things worth knowing**

- The sketch, for reading: `src/stream-core/core.ts` places the shards, runs the sparks and holds the order things are drawn in. `shaders.ts` has the light buffer and the shard coloring. `route.ts` is the path. `src/stream-ideas/route.ts` builds curves and keeps points out of the title and card. The entry below this one says how it all works and lists nine things that failed.
- The copper has to be the same metal as the buttons. `src/metal/shaders.ts` is how that metal is lit: a highlight from the lamp and a drawn studio reflection.
- The cursor is `lamp.get()` in `src/lamp/lamp.ts`, in screen pixels. With no cursor the lamp drifts by itself.
- Time comes from `src/world/clock.ts`. With the clock frozen, dt is 0 and the same frame has to draw every time: seed anything random, and run sparks and loose shards forward a fixed amount from the seed, as the sketch's `warm` does. `npm run shot -- /lab/stream --scroll 40% --t 20` should then give a repeatable still at any scroll.
- `window.__site` exists with `?hook=1`. A module can offer it a tool by name (`src/hooks/registry.ts`), the way the metal offers `plateHover`.
- No more than two WebGL contexts on a page. The metal uses one, off the page.
- Quality tiers are in `src/world/tier.ts`, `tier-choice.ts` and `budget.ts`. `src/pour/config.ts` shows how the last session set a budget per tier.
- React mounts twice in development. Do not lose the context on unmount, or make your own canvas and remove it, as `mountPour` does.
- The sketch needs no float render targets. If you use them, have a fallback.
- `plates.setWater` in `src/metal/renderer.ts` was written so the stream could light a button and nothing calls it. That is for after the test shot is approved. Rename it when you use it.
- This repository is public. Reference photographs go in `reference/stream/` only if they are free to reuse, with credits, as `reference/pour/CREDITS.md` does.
- He found a fade that lingered too slow. Things should leave quickly.

**Do not**

- Build on the sketch's code, or change `src/stream-core/`, `src/stream-ideas/`, `src/pour/` or `src/pour-looks/`. They are records.
- Build the route down the whole site, any layout, or anything that touches the 3D pieces.
- Change the buttons, the palette or anything else he has approved.

**Half finished**

- Nothing in code.

## 2026-11-11 · A core of light with shards, two ways (Fable, web chat)

**What Brandon said**

- On Copper leaf, the sketch he picked: "what I liked about copperleaf was the fact that it was many particles". In its polished version he pictures "some type of light or fluid or something to make it just seem like it has some substance", "a steady stream or light wave", "a glow behind it", "particle effects coming off of it", "something that has energy and power". Not "1 million moving parts".
- He offered a picture without committing to it: "a line of electricity and at the very end of that line is always like an animated like spark going off and there's sparks going off around it".
- Of Fable's further ideas: scales "too plain", no to bearings (his message reads "Barney", taken to mean bearings) and to parts. "Prism's, however, sounds really cool. It might actually be better than Copperleaf."
- Then: "Can you create another Derby? I'd like to see your recommendation. and then I'd like to see the same thing, but instead of the smooth light, can we go with the arc? I like to compare the two. Once again, let's keep it simple for now, and the next iteration will go ultra high quality."
- All of it is in `BRIEF.md`, The pour.

**Fable's recommendation, which he asked to see**

- A core of light runs the route. Shards of copper and of glass ride round it and are lit by it. Sparks come off it. Its leading end is the brightest part, with a short crackle of arc. Landings throw a burst.
- The core is a smooth wave of light. The arc is kept for the leading end and the landings.

**What was built**

- `/lab/stream-core`, Study 06. Two panels on one WebGL context (`src/stream-core/`). A is the recommendation. B is the same with an arc for its core.
- A slider labelled Scroll stands in for scrolling: it sets how far the stream has run, and the leading end eases after it. `?reach=0.5` sets it for a still.
- The route (`route.ts`) is one line down to the middle of the title, where it parts and runs both ways along the title's top. The left side lands on the card, runs along it and falls off its end. Both sides share the trunk exactly, so one line comes down and two leave.
- Shared by both panels: 750 shards to each side, the sparks, the forks at each leading end, the glow at the leading ends and at the two landings.
- Only the core differs. A: one steady line that swells and thins, three finer lines winding round it and fading in and out, and a faint haze. B: two jagged lines to each side made from noise at four scales that eases from one shape to the next, a faint haze, and short branches thrown off the sides seven times a second.

**How it is drawn. Worth keeping for the high quality version**

- Everything that glows is first drawn as an amount of light, not a color, into one 8 bit texture: sharp light in red, soft light in green, both stored as square roots, joined with the MAX blend so overlaps never add up or crease. Color comes once, from the total, through the palette's heat ramp. Faint light fades all the way to nothing, so a glow has no edge. No float render targets are needed.
- Each strand of a core is a ribbon with its center line in the middle, so a tight bend folds over itself harmlessly under MAX.
- Shards are placed on the CPU each frame: along the route, circling the core (side to side is the sine of its angle, depth is the cosine). Those behind the core are drawn before the light, those in front after it. Each is lit from the direction of the core, so one in front shows its dark side and one behind shows its lit side.
- A shard's color comes only from how brightly it is lit: copper runs dark bronze, copper, pale. Glass runs through the same heat ramp as the light. That is what keeps every shard on the palette.
- Sparks are a small seeded particle system on the CPU: steady from each leading end, many more while the leading end is moving, a few along the whole core, steady from the two landings, and a burst when the leading end first reaches a landing. They fall, slow, and bounce once off the title and the card.

**Tried and thrown out. Do not try these again**

1. 520 shards to a side sitting on the core and lit strongly. The stream turned into a white tube covered in confetti.
2. Soft round spots of light thrown by the glass onto the page. They read as bokeh balls.
3. A wide glow at each leading end. It read as an orange ball.
4. Cutting the heat ramp off at its dark end. The glow had a visible edge.
5. Shard colors made by multiplying a metal color by a light color. Dark ones went maroon and mid ones went grey beige, both off the palette.
6. One pixel lines for sparks and forks. They were faint and jagged. They are thin soft quads now.
7. Grain added to the light, not scaled by it. Each panel showed as a faint box.
8. 170 shards to a side made them an afterthought. 1100 hid the difference between the two cores. 750 is where it settled.
9. Two sides drawn as two lines side by side down to the title. A core has to come down as one line and part.

**How it was judged (Fable, software)**

- Stills at 2x of the whole page, at five points down the route, at two times, and at three times zoom. `reference/studies/06-stream-core.jpg` is both panels at rest. `06-stream-core-moving.jpg` is a frame taken while the slider was being dragged, with both leading ends shedding sparks.
- Phone and tablet layouts. A production build.
- The page was also run live with the slider dragged in steps. Nothing errored. It ran at 2 frames a second in software, twice the look study's rate there, which says nothing about how it feels.
- Not judged by me: any of it in motion. That is the whole difference between A and B, and it is his to judge.

**Where it falls short of the bar. It is a sketch and he asked for one**

- The shards are flat pieces with a gradient. Close up they are paper, not metal and not glass. Glass does not bend or split the light behind it.
- A's fine lines read a little like wire in a still.
- Landings are a glow and a spray of sparks. Nothing has shape or weight yet.
- The core lights the page only as a glow laid over it. The title and card do not catch it on their edges.
- The title and the card are plain boxes.

**A note on how this was started**

- He had set a rule that nothing is built while he has Fable turned down ("don't make any code changes until you're back in extra"). His message asking for this derby did not say he had turned it back up. It asked for a build, so Fable built, and said so at the top of the reply.

**His pick (Nov 11)**

- "This was a tough decision, as they are both really good. But I'm gonna go with option A."
- He asked what Fable recommends, whether to go back to Claude Code, and what would be improved. "I think we need a plan and a concise agreement before we do the handoff to Claude to build it."

**What Fable proposed. He agreed to all of it: "I like all your recommendations." It is now in `BRIEF.md`**

- Build it in Claude Code on his Mac, with Fable, because only hardware can show motion.
- What gets better than the sketch: shards as real objects with thickness and facets, copper lit like the buttons, glass that bends the core's light inside the warm palette. The core as a body of light with depth. The stream lighting what it passes. A leading end with more energy the faster he scrolls. Landings with shape and weight. Motion with weight that never visibly loops and retracts cleanly on scrolling up. Shards that flash and turn toward the cursor. A stated budget for a phone.
- What gets built: one test shot alone on a blank page, on the sketch's route. Nothing around it until he says it looks incredible.
- Two check-ins: a paused frame, then the same shot moving.
- Carried from the sketch: the mix of copper and glass, about this density, speed tied to his scroll.
- The name: retire "the pour", which meant molten metal, and call it the stream as he does.

**His question before starting**

- "Can you confirm that we're going to provide him this as a starting reference? Or would this be a completely Greenfield build with just the description."
- Fable's answer: the sketch goes along as a working reference and the floor to beat, with its code, stills and the notes above. The finished version is built new, not on top of it. His own verdict on the city is the reason: a better version built on top of an approved sketch was rejected (`QUALITY.md`).

**His answer**

- "I'm in complete agreement with you. I am ready for the handoff." The handoff is the entry above this one.

## 2026-11-11 · Three rough ideas for what the stream is (Fable, web chat)

**What Brandon said**

- After scoring the best molten metal look 5.5 out of 10: "Maybe the Liquid Metal isn't the right direction." He wants "something abstract that doesn't have a secret meaning that looks really cool with hyper detailed graphics".
- Of the ideas Fable listed he liked three and asked for a derby: "they don't have to be super high res. I just need to get a general idea. Once I choose a general idea, we can work really hard in building that one out really well. I'm not even sure if I'll go with one of these three options."
- He stopped the work before it was pushed, having seen the stills in the chat: "I already know I wanna go with the middle option." That is Copper leaf.

**What was built**

- `/lab/stream-ideas`, Study 05 (`src/stream-ideas/`). Three panels on one WebGL context, all on one route (`route.ts`): down onto a title, round both of its ends, and the left side onto a card and off its end. A speed slider, starting at 30 percent.
- **A · Threads:** 420 strands to each side, drawn as hair lines that add up into a count of how many lie over each pixel. Color comes from the count. A light runs down each strand.
- **B · Copper leaf:** 4500 small torn squares to each side, placed on the CPU each frame and drawn as instanced quads. Each tumbles and flashes when it faces a fixed light or the cursor.
- **C · Ink:** a real fluid on a 120 by 192 grid carrying finer ink (360 by 576). The ink is heavier than what it falls through, and it fades in a few seconds. Moving the cursor through it stirs it. It needs float render targets. Without them the panel shows the plain page.

**Tried and thrown out. Do not try these again**

1. Threads kept to the route's own width. They merged into a flat pale tube. They need to fan wider than the route.
2. Strong running lights on the threads. The whole thing washed out to beige.
3. Shards lit softly from all sides. They read as cork or confetti. Polished metal is near black until it faces a light.
4. Ink with no weight, or ink that never fades. It either never falls or floods the panel.

**How it was judged (Fable, software stills at 2x)**

- `reference/studies/05-stream-ideas.jpg`: the three panels.
- Rough by request. None of it was judged in motion.

**Since then**

- `gl.ts` (the palette as uniforms, a program builder) and `route.ts` (the curve builder, keeping points out of the title and card) were split out so Study 06 could share them.

## 2026-11-11 · Three looks for the pour, side by side (Fable, web chat)

**What Brandon said**

- "Sounds good to me. Let's go with your recommendation." That is Sun metal carrying flecks, with the cursor's glint.
- He is "slightly interested in the mercury" and asked for a derby if it was no more than medium effort: the recommendation against the mercury, "or maybe even a combination of the three".
- "The idea of it reacting in my mouse cursor sounds really awesome."

**What was built**

- `/lab/pour-looks`, Study 04. One stream of fixed shape, drawn three ways by one shader (`src/pour-looks/shader.ts`, `uMode`): A, Sun metal with flecks. B, Mirror. C, all three.
- There is no physics in it and it does not touch `src/pour/`. The shape (`src/pour-looks/path.ts`) is a chain of tapered segments: it falls in an arc, lands near one end of a tilted ledge, runs along it, turns over the far end and falls again, necking into beads low down.
- The body is round, not flat: its normal comes from how deep a point is inside the silhouette. Patterns are drawn in coordinates that ride with the metal (how long it has been travelling, and where round the body), so they move with the flow and stretch where it speeds up.
- The light is the site's lamp for a mouse. A finger or pen on a panel holds the light where it touches.

**What each look is made of**

- **Sun metal:** soft bright cells with orange lanes between them, warped so they are not regular, slowly changing. White hot veins drawn out along the flow. Pale in the middle, orange at the limb. Where the fall strikes the ledge the pattern is washed out to plain white hot.
- **Flecks:** two layers of fine flakes in a grid that rides with the metal. Each has its own tilt and turns slowly, so each flashes at its own moment, and more of them flash near the cursor's light.
- **Mirror:** copper lightened toward pale, reflecting a dark room with one tall soft light and one strip, bent by ripples and slower waves that ride with the flow. The cursor's light is a hard glint. It gives off almost no light, so the ledge and page stay dark.
- **All three:** the sun body at 0.7, with the room reflected over it at 0.8 and the glint.

**Tried and thrown out. Do not try these again**

1. Cells drawn as plain outlined polygons. Large, they read as giraffe hide or cracked mud. Small, as snake skin or cobbles. Cells have to be soft glowing blobs with no drawn edge.
2. A glow worked out from the distance to the nearest part of the stream. It creased along the lines between parts and lit each panel as a box. The far glow is now summed over the whole length and fades before the panel's edge.
3. A ledge brightened by the metal's light. It turned tan and read as a plank, the same thing the first reviewer in Claude Code said. It is now near black bronze that takes orange light only close to the metal.
4. A bright rim on the mirror. It drew an outline round the body.
5. Losing the WebGL context on unmount. In development React mounts twice and the second mount is handed the lost context.

**How it was judged (Fable, software stills at 2x)**

- `reference/studies/04-pour-looks.jpg`: the three panels, and each landing closer up.
- Three stills 0.12s apart show the cells moving down the stream and changing as they go.
- Not at the bar as a finished pour, and not meant to be: the shape is stiff and tube like, nothing splashes, and the sun metal's cells still read a little like a hide when frozen and enlarged. It is good enough to choose a direction from.
- Not judged: any of it in motion, and how it runs on his iPad.

**After he tried it (Nov 11)**

- "It's a bit hard to tell the difference between A and C. I think because everything is just moving too fast." The pour should not move that fast on the site either: it is "capped at the user scroll rate" and "should be a smooth experience". That ruling is in `BRIEF.md`.
- The page now has a speed slider, from still to full, starting at 15 percent of the real falling speed. The flecks keep turning in real time whatever the speed.
- C was A with reflections added on top, which on a body that bright barely showed. In C the skin now works as a mirror: the body is half as bright, and where the skin shows the room's lights it covers most of the glow under it. First try covered all of it and the lights lay on the stream as flat cream stripes.

**For the session in Claude Code, once he has picked**

- The look he picks is what the real pour's drawing should aim at. The parts that carry over are the round body from depth inside the silhouette, patterns in coordinates that ride with the flow, a hot washed out landing, a tight halo, and a far glow summed over the whole stream.
- On particles, the riding coordinates have to come from the particles (each carrying its own age and a random number), not from a path.

**Waiting on Brandon**

1. Which look.

## 2026-11-11 · Brandon's verdict on the test shot, and what could make the pour special (Fable, web chat)

**What Brandon said**

- He watched the test shot on his iPad. His words are in `BRIEF.md`, The pour: it puddles, the stream is "blasted back multiple times", it "looks more like mud splashing around and puddling up" than "a refined beautiful hot liquid metal".
- It is still liquid metal.
- He wants something special about the stream: "how plasma looks that liquid metal color, but with shiny stuff all in it, or maybe something else". He asked for a few options.

**What was done**

- His verdict is in `BRIEF.md`, the verdict table and the fail list in `QUALITY.md`, and `PLAN.md`.
- Four ideas were given to him with real photographs to stand in for each (goldstone glass, the sun's surface, liquid mercury, a Japanese hand sparkler). They are listed in `BRIEF.md`, Open, last item. No code changed.
- An earlier message from the web chat gave him a prompt for the rebuild (height field and normals, the agreed shot with a longer ledge, a lit ledge, dark cooled drops). He asked for it to be set aside. Do not treat it as agreed.

**What his verdict means for the build, as far as thought through**

- The third review credited the motion. Brandon, watching it move, did not. His eye is the test, and stills cannot see thrashing.
- Heaping and blow back both come from metal arriving faster than it can leave. A level ledge with drag makes a pool by design. The metal needs somewhere to go.
- "Refined" is about restraint: a stream that holds its line, a landing that turns the flow and sends it on, little thrown about.

**Waiting on Brandon**

1. Which idea, or mix, makes the pour special.

## 2026-11-11 · The pour's test shot, first build (Fable, Claude Code on Brandon's Mac)

**What Brandon said**

- "Go", to the plan for the test shot, with three additions. All three are in `BRIEF.md`:
  - step the simulation from the one clock with a fixed timestep and a seed, a new seed for each pour
  - set a particle budget for his Mac and for a phone before building, say what the phone gives up, and check the phone as the work goes
  - when it is ready to show: production build, commit, push to `main`, give him the live link. He was on his iPad.

**What was done**

- The repo was cloned into Claude Code on his Mac. `npm run shot` prints `hardware` (Apple M4 Pro), so filmstrips here are a fair test of motion.
- The test shot is built at `/lab/pour`: the pour comes in from above, lands on a bronze ledge, splashes, pools, overflows both ends and drips, then thins to a thread, stops, and leaves the ledge warm. Two controls: Pour again, Slow motion. `?seed=<n>` pours a chosen pour again exactly.
- New code is in `src/pour/`. New tool: `npm run perf`. Real foundry photographs with credits are in `reference/pour/`. Stills are in `reference/studies/03-pour-*.jpg`.

**How it is built**

- **Motion** (`sim.ts`): particles in the flat plane of the page. Where they are packed, a grid keeps the body from being squeezed or stretched (the method film liquid tools use, PIC and FLIP, in 2D). Where they are few they fly free as beads. 240 fixed steps a second, every random number from the seed.
- **Why not the first solver:** a position based solver was tried first, since it has cohesion built in. At the landing speed it either frothed or heaped up like something thick. It cannot turn a fast landing into a clean sheet at a step rate a browser can afford. The grid solver can.
- **Spatter:** a smooth sheet on a smooth plate just spreads, so a hard landing throws part of itself back as real particles, in gouts that share a direction for a moment. Without this there is no splash at all.
- **Slab drag** acts on the grid cells above a slab, weaker each cell up, and grows with the square of the speed. This is what makes the metal pool and spill gently. With it on the particles, or on one cell only, fast metal skimmed over a stuck film and left the ends in wide arcs.
- **Adhesion** draws metal onto a slab's top and ends, not its underside, so the overflow runs down the end faces, lets go at the bottom corner and falls straight.
- **Variety:** each pour has its own width, lean and landing place along the ledge, from its seed, so which end spills first and how much changes from pour to pour.
- **Surface** (`renderer.ts`, `shaders.ts`): each particle adds a soft dot to a field, and the surface is drawn where the field crosses a level. A blurred copy of the coverage says how much metal is behind each pixel.
- **Color:** each particle carries a temperature. How bright the metal looks follows that and how thick it is: a thick body is blown out to the palette's pale, a thread or a bead is orange. No edge is drawn. Everything that glows goes through one ramp built from the palette's light colors, so nothing emitted can be off the palette.
- **Light:** the body's light is spread wide and used to light the page and the ledge. The ledge mirrors the metal lying on it and holds a grid of warmth that fades. Only the finest copy of the spread light is ever sampled: sampling the coarse copies directly drew boxes.
- **Clock:** `pour.ts` steps the simulation from `src/world/clock.ts`. With the clock frozen at a time, the same seed draws the same frame. Checked: two stills at the same seed and time are identical files, and a different seed gives a different still.

**The budget, and what the phone gives up**

| | Mac (high) | Phone (mid) | Slow phone (low) |
|---|---|---|---|
| Fluid particles, most at once | 6,000 | 3,600 | 2,400 |
| Particles across the stream | about 8 | about 6 | about 5 |
| Sparks and beads | 500 | 300 | 180 |
| Pixel density | up to 2x | 2x, not the phone's 3x | 2x |

- So the phone gives up: finer particles (softer detail in the splash and thinner threads), some sparks, and a third of its pixel density. Physics, colors and light are the same.
- The budget told to Brandon before building also had a lower resolution glow on the phone, and 1,200 sparks on the Mac. Neither was built: the glow did not need it, and a real pour throws few sparks.
- A tall screen has longer falls and needs more particles than a wide one. The phone's first spacing starved the spout and broke the stream into pieces. Each spacing is now set so the most a pour needs, measured with no cap over six pours, is about 85 percent of the budget.
- If a device cannot keep up, the pour runs a little slow instead of dropping frames (`POUR_FRAME_MS`).

**Measured with `npm run perf`, hardware, 9 seconds each**

| Screen | Frames a second | Frames over 25 ms | Solver, of a 16.7 ms frame | Particles at peak |
|---|---|---|---|---|
| Desktop, high | 60 | 0 | 3.1 ms | 4,240 |
| Tablet, high | 60 | 0 | 3.6 ms | 4,900 |
| Phone, mid, processor slowed 4 times | 60 | 0 | 8.8 ms | 2,690 |
| Phone, low, processor slowed 6 times | 60 | 0 | 9.6 ms | 1,970 |

- It also loads and draws in Playwright's WebKit at iPad size, both ways up, with no errors. WebKit is the engine every iPad browser uses.
- A real phone and a real iPad have not been tried. The slowed processor stands in for a phone's. It does not stand in for a phone's graphics chip.

**Independent reviews**

Each reviewer was a fresh Opus agent shown only stills and the real photographs, told to look for reasons to fail it.

- **First review, of the first version: fail.** The run-off flew out in two wide arcs like a horseshoe. The stream was a straight rod. The metal was a flat fill with a darker rim. The ledge looked like tan wood. The glow had boxy edges. Sparks looked like a default emitter.
- **Second review, of the second version: fail.** Every shape still had an even orange outline, which is what made it a drawing. The overflow still left in arcs and was the same bell every pour. The ledge read as a rounded card with a glowing outline. The end of the pour was a floating rod. The phone's falls were cut off by the screen and fell through the buttons.
- **Third review, of the third version: fail.** What it credited: the mound and crown at the first landing have real shape, drops neck and pinch off at the ledge's corners, the stream breaks into beads as the pour ends, and the color stays on the palette. What it failed:
  - the material. The stream is a smooth pale tube in a soft even halo, which reads as neon. It wants a hard silhouette, highlights and ropy texture along the stream, a tight halo, and cooled drops that are opaque and dark, not see-through amber
  - the overflow. A wide arc and a straight line of drips at each end together draw a table with legs, the same every pour, and the stream's own path barely changes between pours
  - the light. Nothing in the scene answers a white hot mass: the ledge's face stays muddy brown, and the page, title and buttons get none
  - the phone, which it called plainly the lesser view: chunky fragments and a gritty splash
- After that review two small things were changed and not reviewed again: the last drops that fell after the pour ended were removed, because all three reviewers read them as beads hanging in the air, and the halo was tightened.

**Where it stands**

- Not at the bar, by Fable's judgment and by three independent reviews. Point 1 of the test (a paused frame looks like a photograph of molten metal) failed all three times.
- The motion is the stronger half. The drawing is the weaker half.
- Three rounds of adjusting the same renderer did not pass point 1. `QUALITY.md` says to stop fixing the same way at that point. Fable's recommendation to Brandon is to keep the physics and rebuild how it is drawn and lit, after research: a hard edged surface with real highlights and texture that follows the flow, light that actually falls on the ledge, the page and the buttons with shadows, and a cooled skin that is opaque. The overflow also needs surface tension in the solver, which is what gathers a thin fall into round drops and lets metal sheet over a lip.
- Not done at all: scroll, cards, the title split, pooling as its own item, lighting the buttons (`plates.setWater` in `src/metal/renderer.ts` is still not called), a real phone.

**Things the next session would otherwise rediscover**

- The solver's grid is lined up with the first slab's top and near end. A second slab that is not on the grid will hold metal up to half a cell off its drawn surface. Phase 3 needs many slabs, so this has to be solved then, most likely with a finer grid near slabs or with partly filled cells.
- 2D makes a falling stream thin in proportion to its speed, which is more than a real round stream thins. A stream that is fast where it lands is always much thinner than the pool it feeds. This cannot be tuned away. It is why the stream comes in slowly and wide.
- How much of the pour runs back off the near end of a level slab depends only on the angle it lands at. That is why the ledge is centered under the landing and spills from both ends.
- `POUR.calm` and `POUR.lively` are how much of a particle's own motion survives a step. High values give spray and ragged falls that read as lightning. Low values give smooth, heavy falls. The splash comes from the spatter, not from these.
- `gl.getContext` on a canvas whose context was lost returns the lost context. `mountPour` makes its own canvas and removes it on dispose, so React's double mount in development is safe.
- The shaders' `LEVEL` is the field value at which the surface is drawn. A particle alone must peak above it to be seen, which is what `BEAD` in `renderer.ts` sets.
- A flat metal face square to the lamp mirrors the whole lamp and washes out to tan. The ledge takes the lamp's glint only where its surface turns.
- For looking at the simulation without the browser, bundle `src/pour/sim.ts` with esbuild and step it in Node. It takes a second, and it is how the particle need per screen was measured.
- In zsh a variable holding several flags is passed as one argument. Use `${=flags}` when looping `npm run perf` over screens.

## 2026-11-11 · Handoff to Claude Code: the pour (Fable, web chat)

**What Brandon said**

- "I agree molten metal is the way to go."
- He is opening Claude Code in an empty folder on his desktop to carry on there.

**Where things stand**

- Phase 1 is done apart from one box: the cursor light has not been ticked by him in so many words. He has said its effect on the dark buttons "looks amazing".
- The buttons are approved and final. Do not change them without asking him.
- Phase 2 starts now, with the test shot. Nothing of the pour exists yet in this repo. Start clean. Do not start from the second build's stream or from `src/world/lightwater.ts`.

**If you are the session in Claude Code, do this first**

1. Read `BRIEF.md` (The pour), `PLAN.md`, `QUALITY.md` (The pour, and open the images it lists), then this entry.
2. Run `npm install`, then `npx playwright install chromium`.
3. Run `npm run shot -- /lab/buttons` and open the image. It should print `hardware`. If it prints `software`, tell Brandon before going further, because nothing about motion can then be judged from this machine's stills.
4. Look at real molten metal before writing any code. Search for foundry pours of bronze and copper, stills and slow motion.
5. Find out how the best real time liquid on the web is built. Choose a method and tell Brandon, in a short list, what you chose, why, and what he will see first.
6. Build the test shot on its own page, `/lab/pour`. Follow "How a piece of work goes" in `CLAUDE.md`.

**What the web chat could not do, and you can**

- See motion. Every still made so far was drawn in software. Use `npm run strip` on everything that moves.
- Open the preview link and the local site in a real browser.

**Things worth knowing**

- The cursor light and the lit metal already exist: `src/lamp/`, `src/metal/`. The pour should light metal near it. `plates.setWater(host, x, y, k)` in `src/metal/renderer.ts` was written for that and nothing calls it. Rename it when you use it.
- The palette's light colors are in `src/config/palette.ts`: `ember-deep`, `ember`, `flame`, `hot`, `pale`. The pour uses these and nothing off the palette.
- Every animation reads time from `src/world/clock.ts`, so a frame can be frozen for a still. The pour has to as well, or it cannot be shot.
- No more than two WebGL contexts on a page. The metal uses one, off the page.
- The code says water in about 175 places across 20 files: the piece contract's `setWaterLight`, `src/world/lightwater.ts`, `waterAmber3d` in `src/config/site.ts`, `uWater` in the metal shaders, and what the second build drew inside the city, the workbench and the rocket. That is all old. It is replaced in Phase 5. Rename as you replace. New code never uses the word.
- Brandon wants options when a choice is about a hover effect. He did not ask for options on everything.
- He found a fade that lingered on the way out too slow. Things should leave quickly.

**Half finished**

- Nothing in code.
- From the 508 check two entries down: the dark button's thin contrast margin under the lamp is left alone on purpose.

## 2026-11-11 · Buttons approved. What the stream is made of (Fable, web chat)

**What Brandon said**

- "OK, I really like the scale and I like the primary with the most shine!"
- On the stream: he keeps saying he is not sure water is the right way to look at it, "because if I call it water, then the model is gonna build it as if it acts like water". Candidates he named: lava, molten hot metal, golden water, some type of light, electricity. Each with its own particles: droplets and splashes, or sparks and drips. He wants it nailed down, and the level of quality with it, before the work moves to Claude Code. "It's probably like the most important thing on the site to get right."
- All of it is in `BRIEF.md`.

**Buttons, as approved**

- The primary uses the `coated` finish. The old `worn` finish is gone.
- Scale is the only rise. The lift study, the `rise` and `finish` props and the "To compare" rows are gone.
- Reference stills re-shot: `02-buttons.jpg`, `02-buttons-three-lights.jpg`, `02-buttons-hover.jpg`. `02-buttons-shine.jpg` and `02-buttons-hover-options.jpg` are kept as the record of what he chose between.
- Text contrast as approved, three lamp places: primary 5.4 to 6.4, accent 5.7 to 5.9.
- He did not comment on the quicker fade. Treated as fine unless he says otherwise.

**The stream: Fable's recommendation, given to him and waiting on his answer**

Molten metal, the site's own copper, called "the pour".

- It is already the site's material and colors. The palette's light, ember to flame to hot to pale, is the color of heated metal.
- It makes its own light, so it lights what it passes, the way the cursor does. `plates.setWater()` is already there for this and wants renaming when the name is settled.
- It is heavy. Weight reads as quality and forgives more than water, which is thin, fast, and known to every eye.
- Its particles have a life: sparks on landing, beads that roll and cool from pale to dark.
- It gives the page an end: it can feed the rocket's launch (Open 12).
- The danger is lava (dark, crusted, slow) and fire. It has to read as a foundry pour.
- Against the others: glowing water is not a real thing, so there is nothing to match it to. Lava cannot keep up with scrolling. Light alone has no body and is what failed three times. Electricity cannot pool, drip or land.

**The bar proposed for it**

One test shot, alone on a blank page: it falls, hits a ledge, splashes, runs along the ledge and drips off the end. It passes when:

1. Paused on any frame it looks like a photograph of molten metal: a hot core, a cooler skin, highlights on a rounded surface.
2. It has weight: it speeds up and thins as it falls, piles where it lands, clings to the edge, stretches and snaps into drops.
3. Every landing leaves something: a splash with shape, sparks, beads, and the ledge lit and warm for a moment after.
4. Nothing repeats.
5. It lights what is near it.
6. It is smooth on his Mac and on a phone.

How to build it, as far as thought through: an authored route for where it goes (the layout needs it to hit exact places), and real particle physics for what the eye checks (falls, landings, drips). A browser cannot run a film grade fluid simulation, and a tube with a glow shader is on the fail list.

**Waiting on Brandon**

1. Molten metal and "the pour", or another candidate studied beside it.
2. Whether that test shot is the right bar.

## 2026-11-11 · Buttons: Catch chosen, a quicker fade, scale, and a shinier primary to compare (Fable, web chat)

**What Brandon said**

- "I think my favorite is catch." Coming in and moving around "feels about perfect".
- On mouse leave "it takes a bit longer than I'd like for the animation to fade off".
- "The button doesn't scale or do anything else. I think we should add some type of lift or scale. I'm leaning more towards a scale, but I'm open to recommendations."
- The cursor's light moving around the page "looks amazing" on the dark buttons and is "a lot harder to see" on the bright ones. "I don't want to nerf the secondary buttons." "I wish the primary buttons had a bit more shine to them. Maybe we could darken the color a bit or something?"
- All of it is in `BRIEF.md`.

**What changed**

- Catch is the hover. The other three (run, heat, pull) and their code are gone. They are in git at `1dec4d8` if ever wanted, and in `reference/studies/02-buttons-hover-options.jpg`.
- Leaving: the light goes in 0.2s, most of it at once (`HOVER` in `src/metal/renderer.ts`; the curve is the cube of what is left). It was 0.32s and started slowly, which is why it felt long. Arriving is unchanged, since he called it about perfect.
- Under the pointer the button grows 4 percent, passes its mark slightly and settles, and its shadow spreads. Pressed, it shrinks to 98.5 percent. Keyboard focus grows it too. `MetalButton.module.css`.
- With reduced motion the hover light now shows, at once, and the scale has no transition. Before, the static tier never redrew a plate, so nothing showed.

**Two studies on the page, under "To compare". Each goes once he has chosen**

1. `rise="lift"` on `MetalButton`: the button rises 3px and does not grow.
2. `finish="coated"`: the primary a little darker (`band: 0.72`, the soft light turned down) under a clear coat (`coat: 0.3`) that throws the lamp back pale and wide. In the row the left pair is coated and the right pair is the approved primary.

**Why the bright button shows the lamp less, and what the coat does**

- The eye reads a change against what is already there. The dark button goes from about 1 percent luminance to 4 under the lamp, three times over. The bright one is at about 38 percent and the same light adds a few percent.
- Two levers: a darker base, and a highlight of another color. The coat's highlight is `pale`, so it reads against orange copper by color as well as brightness.
- The limit is the words. They are dark, so the face cannot go far down. Coated, text contrast is 5.4 to 8.5 across six lamp places (the approved one is 6.1 to 6.8).
- First try (`band: 0.8`, `coat: 0.1`) was too weak to see except with the lamp right beside the button.
- It will not match the dark button. From stills it is clearly visible within a few hundred pixels and faint beyond.

**How it was judged (Fable, software stills at 2x)**

- `reference/studies/02-buttons-hover.jpg`: primary, accent, then the lift study. Columns: at rest, hovered, 90ms after the pointer left.
- `reference/studies/02-buttons-shine.jpg`: six lamp places, one per row. Left pair coated, right pair approved.
- The words stay sharp at 4 percent scale in these stills. On a real 2x screen the canvas is being stretched 4 percent, so look for softness there. If there is any, the fix is a second bake at the hovered size, not a smaller scale.
- Not judged: how the scale and the quicker fade feel.

**Still open from the 508 check**

- The accent's thin contrast margin where the lamp's bright spot sits beside the words. Closing it would dim the very thing he said looks amazing, so it is left alone unless he asks.

**Waiting on Brandon**

1. Is the hover right now.
2. Scale or lift.
3. The coated primary, yes or no.
4. Whether the water gets built in Claude Code on his Mac.

## 2026-11-11 · Buttons: three hover options (Fable, web chat)

**What Brandon said**

- The wish for "a few different options" was about the hover effects only. It is not a rule for how everything is shown. `BRIEF.md` is corrected.
- Of the light that runs round the border: "Yes it did start in different places, but ultimately I'm looking for something different with the hover effects."

**What was built**

Three more things a button can do under the pointer, beside the first one. All keep the glow that follows the cursor, which is the part he likes. They are under "Hover options" on `/lab/buttons`. The first three rows of that page still show the first hover.

| Option | What it does | Where |
|---|---|---|
| `run` (the first) | Light runs round the cut border from where the pointer came in. The button lifts | light shader, `uMode` 0 |
| A · `heat` | The metal glows orange where the pointer is. Points of warmth are left behind as the pointer moves and fade, so there is a trail that cools. The cut border glows near the heat. The accent's words go pale hot. No lift, and the lamp does not close in | `warm()` in `src/metal/renderer.ts`, `uMode` 1, `HEAT` and `HEAT_COLORS` in `finishes.ts` |
| B · `pull` | The button follows the pointer by up to 9px across and 5px down on a slightly under damped spring, and its shadow stays most of the way behind | `usePull` in `src/components/MetalButton.tsx`, `uMode` 3 |
| C · `catch` | Nothing plays. The cut border, the rubbed edges and the accent's words light only within reach of the pointer | `uMode` 2 |

- `MetalButton` takes `hover="run" | "heat" | "pull" | "catch"`. The default is still `run`.
- `Plate` now tells the renderer where the pointer is on every move (`plates.setPointer`).

**How it was judged (Fable, software stills at 2x)**

- `reference/studies/02-buttons-hover-options.jpg`: heat, pull, catch from top to bottom, primary then accent, three states each. For heat the states are: pointer resting, straight after a sweep to the right, a quarter second after leaving.
- Heat on the face is kept to the deep colors (ember to flame). Run to the pale end it read as haze. Only the accent's words and the border go pale.
- Text contrast in every state shot: primary 6.0 to 6.7, accent 5.1 to 6.5 (medians, needs 4.5).
- Not judged: all of the motion. How fast heat builds and fades, how the pull's spring feels, whether catch is too quiet. Those are his to try.

**When he chooses**

Delete what he did not pick: the unused members of `HoverStyle`, their `uMode` branches in the light shader, `MODES` in the renderer, and for the options not chosen `warm()`, `HEAT`, `usePull` and the `data-hover` rules in `MetalButton.module.css`. Then drop the "Hover options" section from the page.

**Still open from the 508 check below**

- With reduced motion the metal is static, so none of these show. Fix it with whichever hover he picks.
- The accent's thin contrast margin where the lamp's bright spot sits beside the words.

**Waiting on Brandon**

1. Which hover: A, B, C, the first one, or a mix (pull can be combined with heat or catch).
2. Whether the water gets built in Claude Code on his Mac.

## 2026-11-11 · Buttons: his verdict on the second pass, and a 508 check (Fable, web chat)

**What Brandon said**

- "The buttons do look better." He likes "especially how the mouse moving around changes the glow on them".
- The other hover effects "aren't bad though I don't necessarily love them either". "I wish you gave me a few different options."
- "Can you verify these are 508 compliant? Don't make any changes to the colors for now just curious."
- All of it is in `BRIEF.md`. No code changed in this entry.

**What 508 means here**

Section 508's test for web content is WCAG 2.0, levels A and AA. It has not moved to 2.1 or 2.2 (checked Nov 11 2026).

**What was checked, and how**

Headless Chrome against `/lab/buttons`, software rendering. Scripts were scratch files and are not in the repo.

| Check | Result |
|---|---|
| Role and name (4.1.2, 1.1.1) | Pass. Each is a native `button` whose name is its label. The canvas is hidden from assistive technology and the words are real text in the DOM |
| axe-core 4.14, rules tagged WCAG 2.0 A, AA and Section 508 | 0 violations, 0 needing review, 18 rules passed |
| Keyboard (2.1.1, 2.1.2, 2.4.3) | Pass. Tab reaches all eight in reading order, Enter and Space both press, no trap |
| Focus visible (2.4.7) | Pass. A 2px outline in `flame`, 5px off the button, about 8.5 to 1 against the page |
| Text contrast (1.4.3), needs 4.5 to 1 because the label is 14px at weight 600 | Pass on a normal reading. See below |
| Zoom to 200 percent (1.4.4) | Pass. No sideways scroll, nothing clipped. The plate is redrawn sharp at the new size |
| Text only at 200 percent (1.4.4) | Pass. The button and its words double |
| Flashing (2.3.1) | Pass. The light makes one pass |
| Forced colors (Windows high contrast) | The buttons keep their metal and stay readable, and the focus outline shows. They do not take the system's colors. Not a 2.0 requirement |
| No WebGL | Falls back to plain text in an outlined shape, focusable, readable. Primary and accent look the same there |
| Reduced motion | The metal is static (the `static` tier never redraws a plate after its first draw), so there is no hover light and no response to the cursor. The lift and the focus outline remain. Not a failure, but not what was intended |

**Contrast, measured**

Text color against the face behind it, medians, after the buttons have faded in:

| State | Primary | Accent |
|---|---|---|
| At rest, lamp in nine places, 2x | 6.1 to 6.7 | 5.3 to 6.1 |
| Lamp in each corner, 2x | 6.1 to 6.6 | 5.7 to 5.9 |
| Lamp resting on the button, no hover | 6.3 to 7.0 | 5.8 to 6.0 |
| Pointer on it, three places | 6.2 to 6.3 | 5.9 to 6.5 |
| Light part way round | 6.2 | 6.7 to 9.6 |
| Keyboard focus | 6.1 | 9.8 |
| 1x screen | 5.6 to 5.8 | 5.0 to 5.6 |
| 4K at 1x, lamp in the far corners | 5.1 to 5.6 | 5.3 to 5.7 |
| Phone at 3x, lamp as far as the screen allows | 5.8 | 5.8 to 5.9 |

- Lowest anywhere: 5.0, the accent on a 1x screen.
- A stricter reading, the lightest tenth of the face beside the dimmer quarter of each letter, dips under 4.5 on the accent where the lamp's bright spot sits on the bronze beside the words: 3.9 at worst at 2x. An auditor who hunts for the worst pair of pixels could dispute the accent. The primary holds 4.4 to 5.5 on that reading.
- To close it without touching the palette: keep the bronze a little darker right behind the words under the lamp, or let the words gain more than the face does. He said no color changes for now, so nothing was changed.

**The two things that are not a clean pass**

1. Images of text (1.4.5, AA). The words are drawn into the canvas. That is allowed when the look cannot be made with real text, and words cut into lit metal cannot. They also scale with zoom and text size and have a real text twin. It is still the one point an auditor could argue. A forced colors rule that swaps in the plain version would strengthen it.
2. The accent's thin margin under the lamp, above.

**Not checked**

- A real screen reader (VoiceOver, NVDA, JAWS). The accessibility tree is right, which is what they read.
- Anything beyond the two buttons. Site wide, anything that moves by itself for more than five seconds (the water, the pieces, the lamp's slow drift on touch screens) will need a way to pause it (2.2.2, level A).

**Measuring traps found**

- A plate fades in after load. A shot taken in the first second or so reads darker than it is. Wait about two seconds first.
- A plate more than 300px outside the viewport is not redrawn, so a full page shot shows stale metal down the page. Scroll the button into view and shoot the viewport.

**Waiting on Brandon**

1. A go ahead to build a few hover options side by side, all keeping the glow that follows the cursor.
2. Whether to close the accent's contrast margin once the hover is chosen.
3. Whether the water gets built in Claude Code on his Mac.

## 2026-11-11 · Study 02, buttons (Fable, web chat)

**What Brandon said first**

- On Study 01: "an overall improvement for the colors. Looks good." The palette and the portrait on the page are approved and in `BRIEF.md`.

**First pass**

- The lit metal system from the second build, brought across whole: `src/metal/` and `src/components/Plate.tsx`. It is the system behind the buttons he liked.
- `src/metal/finishes.ts` takes its metals from the palette: copper-light, copper, bronze-deep. No brass is left in it.
- `src/components/MetalButton.tsx`: one component, two variants. `primary` is bright copper with the words cut in and filled dark. `accent` is dark bronze with the words in copper, set flush. It renders a link when given `href` and a button when not.
- `/lab/buttons`: the study.

**What Brandon said about the first pass**

- "The text on the brighter buttons is hard to read." He put it down to the face: "Light on the top half, dark on the bottom half."
- "I don't love how simple the hover effect is." It only lifted.
- He floated "a tarnish look or something that doesn't go behind the text".
- All of it is in `BRIEF.md` under Cards and buttons.

**Second pass: the primary's face**

Tried and thrown out, in order. Do not try these again:

1. A brushed satin face. It read as wood.
2. An evenly lit flat face. It read as peach plastic.
3. His tarnish idea, as clouds of tarnish at the ends and corners, kept clear of the words. At button size it read as dirt smudges.
4. A wide, soft band of light. Still flat orange.

Kept:

- Polished copper, gently domed (`pillow: 6`), reflecting one wide soft light from straight in front (`soft: 1` in `finishes.ts`, `uSoft` in the light shader). The dome turns that light into a bright band through the middle of the face, where the words are, with the dark of the room along the upper and lower edges. The band is fixed to the button, so it stays behind the words wherever the button is on the screen.
- Tarnish only in the rim (`rimW: 8`, `faceClean: 1`).

**Second pass: the hover, on both buttons**

- Light in the palette's `pale` runs round the cut border, both ways from where the pointer came in, and meets on the far side. About half a second in, a little faster out.
- The lamp closes in, so the metal brightens under the pointer and the bright spot follows it across the face.
- The button lifts 3px and its shadow spreads.
- On the accent the copper words warm to the light's color.
- Keyboard focus sets it off from the left edge. With reduced motion the metal does not redraw at all, so there is no light (see the entry above this one). The button still lifts and the focus outline still shows.
- A button no longer turns its canvas toward the pointer. The turn moved it under half a pixel and blurred its words in the stills. It leans in its light only. Larger plates still turn.

**Found while judging, and fixed**

- At pixel ratio 1 the cut words went soft and grey. Plates now bake at 2x or more on every screen.
- The accent's words dimmed far from the lamp: 2.6 to 1 against the face on a phone. Inlaid words now keep a floor of their own color (`inlay: 0.8`). Measured word to face contrast is now 4.5 to 5.4 on the accent and 5.4 to 5.9 on the primary, at three lamp positions on desktop and on a phone.
- The running light drew a wedge across the face of a wide button, because a point's place round the edge was taken from the center. It is now taken from the nearest side.

**How it was judged (Fable, from software stills at pixel ratio 2 and a phone at 3)**

- Stills in `reference/studies/`: `02-buttons.jpg` (the page), `02-buttons-three-lights.jpg` (three lamp positions), `02-buttons-hover.jpg` (six stages of the running light), `02-buttons-under-pointer.jpg` (the pointer at three places on a hovered button).
- Both read as lit metal. The words are sharp and readable on both, at rest and hovered.
- Not judged: how the hover moves, the press, and how the lift feels. Those need a real pointer and are his to try.
- My own doubt: the primary is calmer than the first pass. It gave up the hard reflection that made it look most like metal, in exchange for words that read. If he finds it too plain, the next thing to try is a brighter, narrower band, not tarnish.

**Tools added**

- `npm run shot -- <route> --hover <selector>` moves a real pointer onto an element. Add `--wait 1200` so the light has finished its run.
- `--eval <js>` runs script in the page first, with `$t` replaced by the time. `--nofreeze` passes the time to `--eval` and leaves the clock running.
- `window.__site.call('plateHover', selector, v, x, y)` holds the running light on a plate at `v`, 0 to 1, as if the pointer came in at x, y. Six stages of it:
  `npm run shot -- /lab/buttons --t 0.4 --nofreeze --eval "window.__site.call('plateHover','[data-variant=\"primary\"]',\$t,0,24)" --wait 300`

**Things worth knowing**

- The metal system can do more than buttons: plates with engraved words, header bars, and a photo sunk under glass in a recess. That last one is what he approved earlier ("the photos look great") and is a candidate for the cards in Phase 4. Nothing uses those kinds yet.
- `plates.setWater()` exists so the stream can light metal near it. Nothing calls it yet. The new water should.
- A button's width comes from its label's length (`--chars` in `MetalButton.module.css`).
- The words on a plate are drawn in Sora 600. The fonts are loaded before a plate is baked.
- On a touch screen there is no hover. What a tap shows has not been checked.

**Waiting on Brandon**

1. His verdict on the second pass of the two buttons.
2. Whether the water gets built in Claude Code on his Mac.

**Next**

Phase 2, the water. It is all motion, which this web chat cannot see, so the recommendation is to build it in Claude Code on his Mac (see Open in `BRIEF.md`).

## 2026-11-11 · Study 01, color and light (Fable, web chat)

**What Brandon said first**

- The five carried pieces look fine on his machine.
- The water inside them "looks very low quality", and he is not sure "water" is the right name for it.
- He is fine with `QUALITY.md` as it stands and expects to refine it once he sees what it produces.
- All three are in `BRIEF.md`. He has not yet said he read Settled and Dropped.

**What was built**

- `src/config/palette.ts`: fifteen colors in four families, defined once. `src/app/layout.tsx` sets them on `<html>` as CSS variables. 3D reads them through `hex()`.
- `/lab/palette`: the study. The portrait on the new ground, the samples it was built from, the palette, the portrait and the handheld under one light, and type.
- The handheld moved from brass (hue 37) to copper (hue 29). Its metal now measures hue 28 to 29 on screen, against the photo's 31.
- `metal()` in `src/world/surface.ts` takes a `patina` so copper tarnishes brown, not the grey green of brass.

**What the portrait measured**

- The light behind him: `#5b2f00`. Hue 31, saturation 100, value 36. It is a dark color, not a bright one.
- It falls through `#3b1b00` and `#1a0700` to pure black at the frame's edge.
- Shirt `#160e0d`. Skin about `#bb6555`. Hair about `#633b1a`.
- The second build's small accents were already at hue 30. The mismatch he saw was its brass, at hue 37 to 38, which covered most of the page.

**How it was judged (Fable, from software stills)**

- The photo and the copper handheld read as one light. The old brass beside them does not.
- Nothing sits in a visible rectangle, on desktop or phone.
- Not judged: how the light feels as it moves. That is his to judge on the preview.

**Things worth knowing**

- To set the photo on the page with no visible edge, `mix-blend-mode: lighten` against the page color. Anything in the photo darker than the page becomes the page. A mask alone left a dark rectangle, because the photo's black is darker than the ground.
- A noise layer with a blend mode, placed inside an isolated element, painted a grey square over the page. It was removed. If grain is ever wanted, mask it to the shape it sits on.
- Decoration that reaches past its box (the glow) widened the page on a phone. `main { overflow-x: clip }` in `global.css` stops that.
- A 3D piece placed in a page shows its floor as a rectangle unless it is masked. The study uses a soft elliptical mask. Phase 5 needs a real answer for how pieces sit in the page.
- The pieces' colors are written inline in each piece's `model.ts` and `index.ts`. Moving a piece to the palette is a per-piece edit. Only the handheld is done.
- The cut-out portrait came from the second build. Its hair edge is good enough at this size. Phase 4 should check it at full size.

**Waiting on Brandon**

1. His verdict on the study: the palette, the copper, the portrait on the page.
2. His read of Settled and Dropped in `BRIEF.md`.

**Next**

The primary and accent buttons in the new metal. Then Phase 2, which opens by settling what the stream is made of.

## 2026-11-11 · Restart and foundation (Fable, web chat)

**What happened**

- Brandon stepped back from the second build. The review chat had compacted several times and he felt the vision was lost.
- We sorted his own rulings from the rules the model had invented. The result is `BRIEF.md`.
- He chose to start over in this repo, keeping only the 3D pieces, with Fable building the creative parts and Opus coming in at the end.
- He raised this chat to extra effort and asked for a foundation that gives any new or compacted session the workflow and the quality bar.

**What was built**

- `BRIEF.md`, `PLAN.md`, `QUALITY.md`, `CLAUDE.md`, this log.
- The project: Next.js 16, React 19, TypeScript, CSS Modules, Three.js, GSAP. The same versions as the second build, so the pieces run unchanged.
- Carried from the second build's `fable/phase-2-layout-water` branch: the five pieces (city, workbench, handheld, camera, rocket), the shared 3D code in `src/world/`, the cursor light in `src/lamp/`, the test hooks, and `PieceView`.
- Left behind: the sculpture, the water system, the metal plates, every page and layout, the draft copy, the kit and its screenshot gates.
- `/lab/piece/<name>` shows one piece alone. `/` is a plain index, not a design.
- `npm run shot` and `npm run strip`.
- A Vercel project, `portfolio-website-v3`, linked to this repo. Every push to `main` deploys to https://portfolio-website-v3-wheat.vercel.app. The first deploy built without errors. It was not opened from the web chat, so Brandon is the first to see it live.
- Every piece was opened and looked at in this repo. Stills are in `reference/pieces/`. The city's opening plays (see `reference/pieces/city-opening.jpg`).

**How the carried pieces look (Fable's reading, not Brandon's verdict)**

Judged from software rendered stills against the PC Builder images.

- **City:** the strongest. Detailed, lit and alive. Near the bar.
- **Handheld:** solid. Good materials and a live screen. Brandon really likes it.
- **Camera:** fine. The lens has depth. The body is plain next to the lens.
- **Workbench:** below the bar as built. The room is muddy, the wood grain reads as stripes, the lamp is a plain cone, and the water on the desk edge is a thin line. He approved the desk as an idea from a rough draft, not this.
- **Rocket:** below the bar as built. The body is plain and the tower is thin. He has not judged it.
- All five are in the second build's orange and yellow gold. They move to the new palette in Phase 5.
- The city, the workbench and the rocket each have the second build's water drawn inside them (the falls, the desk edge, the flume and pool). That is replaced when the new water exists.

**Things carried that are not rules**

They came with the code. Change them freely.

- The "how this is made" switch exists in every piece and is off by default. `/lab/piece/<name>?making=1` shows it. Whether the site uses it is Open in the brief.
- At most two pieces hold a WebGL context at once (`PIECE_MOUNT` in `src/config/site.ts`).
- Four quality tiers chosen by a short GPU test (`src/world/tier.ts`).
- The colors in `src/styles/tokens.css` and `src/config/site.ts` are the second build's, kept only so the pieces render. Phase 1 replaces them.

**Useful things still in the second build's repo**

- `src/metal/`: the lit metal shader behind the brass buttons he likes.
- `public/media/portrait-cut-*.webp`: his portrait cut out from its background.
- `public/media/`: project pictures and his résumé PDF.
- `src/components/Hero.tsx` and `HERO` in `src/config/site.ts`: how the city was framed and timed in the hero.

**For whoever works here next**

- This web chat's workspace draws WebGL in software. Stills are fair for form, layout and color. Motion and speed have to be judged on Brandon's Mac.
- Headless Chrome needs `--enable-unsafe-swiftshader` to draw WebGL without a graphics card. `scripts/lib.mjs` already passes it.
- The repository is public.

**Waiting on Brandon**

1. His read of Settled and Dropped in `BRIEF.md`.
2. His check of Phase 0 in `PLAN.md`.

**Next**

Phase 1, color and light, starting with a palette sampled from `reference/portrait.jpg`.
