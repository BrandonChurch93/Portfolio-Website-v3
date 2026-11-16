export const meta = {
  name: 'section-pass-find',
  description: 'The pass over the whole site, section by section: one critic a section looks at the 3D, the experience, the animations, the interface and the small interactions against the quality bar, a second reader checks every proposal against what the owner has ruled, and one list comes back. Read only: nothing is changed',
  phases: [
    { title: 'Look', detail: 'one critic a section', model: 'opus' },
    { title: 'Check', detail: 'each proposal against the brief', model: 'opus' },
    { title: 'List', detail: 'one ranked list', model: 'opus' },
  ],
}

const BASE = args && args.base ? args.base : 'http://127.0.0.1:5331' /* a production build served locally */

const COMMON = `You are a design critic on Brandon Church's portfolio site (a Next.js app with three.js: the repo's own folder is your working folder). He has asked for "one more pass ... the whole entire website section by section. figure out where you can make improvements on the 3D assets, overall user experience, animations, user interface, micro interactions". You are that pass for ONE section, and this stage only FINDS: you change nothing.

Hard rules:
- READ ONLY. Do not edit, create, move or delete any file in the repo except stills and notes under shots/pass/ (make it if missing). No commits, no pushes.
- NEVER run npm run build, npm run dev, next build or next dev in the repo folder, and never kill or restart a server. The site is already being served at ${BASE} : open pages there. The repo's scripts take --url ${BASE} (read the tops of scripts/shot.mjs, scripts/strip.mjs, scripts/live.mjs, scripts/perf.mjs for their options: shot takes a still, strip a filmstrip under a frozen clock, live records real frames of something that changes on a press, a scroll or the pointer). The machine is busy with other work: one browser at a time, and only the stills you need.
- Read first, from disk: QUALITY.md (the bar: the two questions, the six tests, "Fail on sight", and the section about your part of the page), then the parts of BRIEF.md that govern your section (it is long: find them with grep on the section's name under "## Settled", and read "## Dropped" too). BRIEF.md is the only source of rules. "Settled" means the owner said it and it may not be changed without him. CLAUDE.md's "Where things are" table tells you which files make your section.
- The line of light and shards that runs down the site is called the stream. Never call it anything else.
- Phones: under 1100 px wide the site shows a plain stand in on purpose. Do not review it. Judge at 1440 by 900 (scale 2), 1920 by 1080 and an iPad held sideways (1366 by 1024, touch).
- The copy is the owner's. Do not propose rewording. Do say where a stand in or placeholder is showing.

How to look: stills at rest, a screen at a time. Then everything that MOVES or ANSWERS, in real frames (npm run live): the stream arriving and striking, a thing waking, a hover, a press, focus by keyboard (Tab through the section), a tab or category changed, the cursor's light crossing a piece, a slow scroll through the section. Open every image you take. Three times zoom on every 3D thing (the scripts' --scale 3 or a piece's own page under /lab/piece/<name>).

Judge by five lenses, and say which each finding belongs to:
  3d: the 3D assets. Form, material, light, detail at three times zoom, how each sits in the page (never in a visible rectangle, never cut off).
  ux: the experience of using it. What a visitor understands and when, order, hierarchy, what is easy to miss, what makes him wait, what he cannot find, what does nothing when pressed.
  animation: motion. Does it start, build, peak and settle, with weight. Timing, easing, anything that pops, jumps, races, repeats visibly or draws a frame behind.
  ui: the interface. Type, spacing, alignment, contrast, consistency of buttons, labels, tabs, cards and forms, states (rest, hover, pressed, focus, disabled, error, sent).
  micro: the small interactions. What answers the pointer, a press, focus and a touch, and what should and does not.

A finding is worth reporting only if a careful engineer visiting the site would notice the difference once it is fixed. Aim for the eight to fourteen that matter most, ranked. For each one say exactly: where (the thing, the file if you found it), what it does or looks like now (so the owner can picture it without opening it), what it should do or look like, why that is better (which test of QUALITY.md it now fails or passes weakly), how large the change is (small: a constant or a few lines. medium: a component or a shader. large: a new piece or a new mechanism), and whether doing it would go against anything in BRIEF.md's Settled or Dropped (quote the line if so, else say none found). Name the stills that show it.`

const FIND = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    strongest: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    findings: {
      type: 'array', maxItems: 14,
      items: {
        type: 'object',
        properties: {
          lens: { type: 'string', enum: ['3d', 'ux', 'animation', 'ui', 'micro'] },
          where: { type: 'string' },
          now: { type: 'string' },
          better: { type: 'string' },
          why: { type: 'string' },
          size: { type: 'string', enum: ['small', 'medium', 'large'] },
          ruling: { type: 'string' },
          stills: { type: 'string' },
        },
        required: ['lens', 'where', 'now', 'better', 'why', 'size', 'ruling'],
      },
    },
  },
  required: ['summary', 'findings'],
}

const SECTIONS = [
  { key: 'work', route: '/lab/work?ui=0', what: `WORK (also seen in place on /lab/whole?ui=0, scrolled to it). The title, the category bar and what a change of category does (the surge), the four project cards (asleep as an engine turned blank until the stream wakes them, and woken by the pointer or focus), the Sun stones, the rail with its finials, the "View all work" button, and the stream's route through all of it. Games, 3D art and Photography are stand in cards on purpose, and the pictures are being retaken by the owner: do not report those.` },
  { key: 'skills', route: '/lab/skills?ui=0', what: `SKILLS (the upper half of /lab/skills, also in place on /lab/whole?ui=0). The desk as one 3D piece (its own page is /lab/piece/desk, with ?only=<part> for each thing on it: the monitor, the keyboard, the mouse, the PC, the lamp, the tablet, the camera, the headphones, the word on the floor), how its lights come on when the stream strikes the lamp, the three rows of skills with their tabs or lists and the small CPU piece the stream strikes (/lab/piece/cpu), the rails the stream draws as the rows' borders.` },
  { key: 'about', route: '/lab/skills?ui=0', what: `ABOUT (the lower half of /lab/skills, also in place on /lab/whole?ui=0). His portrait blended into the page, the reflector and the studio light as small 3D pieces (/lab/piece/reflector, /lab/piece/studio-light), the stream's run across the top and down behind his shoulder, the glow, the title, the two tabs (Professional and Personal) and what a change of tab does, the words and how and when they come on. The paragraphs are placeholders from his live site: do not report the wording.` },
  { key: 'contact', route: '/lab/contact?ui=0', what: `CONTACT AND THE FOOTER (also in place at the foot of /lab/whole?ui=0). The one plate with its two buttons, the form (every state: empty, focus, typing, an invalid email, sending, sent, failed. Do NOT submit the real form: read src/contact/send.ts and the page's ?sent switch), the launch pad as one 3D piece (/lab/piece/pad, with ?only=rocket and ?fill= and ?launch=): the Sun stone that lights band by band when the stream lands, the table, the tower and the rocket that launches, and the plain footer under it.` },
  { key: 'whole', route: '/lab/whole?ui=0', what: `THE PAGE AS ONE THING (/lab/whole?ui=0, from the hero to the footer). Not the sections' insides, which other critics have: the joins between sections (hero to Work, Work to Skills, Skills to About, About to Contact), the rhythm and the room between them, whether a visitor always knows where he is and can get anywhere (there is no navigation bar today: say what he cannot do for want of one, and what the smallest thing that would serve him is), the two buttons in the hero and where they take him, the scroll cue, what happens when he scrolls fast or drags the scroll bar to the foot or opens the page at an anchor, the cursor's light across the whole page, the stream as one line from the core to the stone under the rocket, and the page with reduced motion.` },
]

phase('Look')
const looked = await pipeline(
  SECTIONS,
  (s) => agent(`${COMMON}\n\nYOUR SECTION: ${s.what}\nIts own page: ${BASE}${s.route}\n\nWrite your full notes to shots/pass/${s.key}-notes.md and return the structured findings.`, { label: `look:${s.key}`, phase: 'Look', model: 'opus', schema: FIND }),
  (res, s) => {
    if (!res || !res.findings.length) return res ? { key: s.key, summary: res.summary, strongest: res.strongest || [], kept: [] } : null
    return agent(`You are the second reader on a design pass of Brandon Church's portfolio site (the repo's own folder is your working folder). READ ONLY: change nothing, run no build and no dev server, kill nothing. The site is served at ${BASE}.

A critic looked at the section "${s.key}" and proposed the changes below. Two things are wanted from you for EACH proposal, in the same order:
1. IS IT TRUE. Open the page (${BASE}${s.route}) or the code and check that what the critic says the thing does NOW is accurate. If you cannot see it or reproduce it, say not true.
2. DOES IT GO AGAINST A RULING. BRIEF.md is the only source of rules. Search its "## Settled" and "## Dropped" sections (grep for the thing's name and for the words of the proposal) for anything the owner has said that the proposal would overturn, undo or bring back: a look he picked, a behaviour he ruled, a thing he cut. Quote the line and its date if so. A proposal that improves something without touching a ruling is clear. Be strict: when in doubt, quote the line and let the owner decide.
Then score its worth from 1 to 5: 5 is something a careful engineer visiting the site would notice at once, 1 is taste.

<proposals>
${JSON.stringify(res.findings, null, 1)}
</proposals>`, {
      label: `check:${s.key}`, phase: 'Check', model: 'opus',
      schema: { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { true: { type: 'boolean' }, against: { type: 'string' }, worth: { type: 'number' }, note: { type: 'string' } }, required: ['true', 'against', 'worth'] } } }, required: ['verdicts'] },
    }).then((v) => {
      const verdicts = v ? v.verdicts : []
      const kept = res.findings.map((f, i) => ({ ...f, checked: !!verdicts[i], isTrue: verdicts[i] ? verdicts[i].true : null, against: verdicts[i] ? verdicts[i].against : f.ruling, worth: verdicts[i] ? verdicts[i].worth : 3, note: verdicts[i] ? verdicts[i].note : '' })).filter((f) => f.isTrue !== false)
      return { key: s.key, summary: res.summary, strongest: res.strongest || [], kept, dropped: res.findings.length - kept.length }
    })
  },
)

const done = looked.filter(Boolean)
log(`${done.length} of ${SECTIONS.length} sections looked at, ${done.reduce((n, d) => n + d.kept.length, 0)} proposals kept, ${done.reduce((n, d) => n + (d.dropped || 0), 0)} dropped as not true`)

phase('List')
const list = await agent(`You are writing up a design pass of Brandon Church's portfolio site for the person who will make the changes. Below, for each section, are a critic's proposals, each checked by a second reader for whether it is true and whether it goes against anything the owner has ruled ("against": a quoted line means it does, and such a proposal may NOT be built without asking him).

Write Markdown, for a file in the repo. House rules: lists, not paragraphs. Plain words. No em dashes (a period, a comma or an interpunct). The line of light is "the stream". Nothing about how long anything takes.

For each section, in the order hero joins and whole page last:
### <Section>
- one line on what is strongest there and should not be touched
- "Can be made now", ranked by worth then by smallness: each item one or two lines as: **[lens · size · worth n]** where. Now: ... Better: ...
- "Needs his word first": the proposals that go against a ruling, each with the ruling quoted and what is proposed
Keep every file path, route and number exact. Do not add proposals of your own.

Then one last list, "Across the site": things more than one section's critic said.

<sections>
${JSON.stringify(done, null, 1)}
</sections>`, { label: 'list', phase: 'List', model: 'opus' })

return { list, sections: done }
