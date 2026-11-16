export const meta = {
  name: 'world-round',
  description: 'One round on one part of the hero world: an Opus builder works from a brief on disk, then two fresh Opus reviewers judge its stills. Reports are written to files',
  phases: [
    { title: 'Build', detail: 'the part, by one Opus builder', model: 'opus' },
    { title: 'Review', detail: 'two fresh reviewers', model: 'opus' },
  ],
}

const B = 'reference/kits/world-briefs'
const a = args
const builder = `You are a builder of the hero's new world on Brandon Church's portfolio (work from the repo's own folder).

First read, whole, with the Read tool: ${B}/common.md (what every builder is told: the rules, the frame, the tools, how to look, how to report). Then read your brief: ${B}/${a.brief}.
${a.round > 1 ? `\nThis is round ${a.round}. The part already exists in your files, built by a builder before you. Read all of it, make it again with its make script if it has one, and take stills of it as it stands before you change anything. Do not start again from nothing unless the brief says so.\n` : ''}
Write your full report to ${a.report}. Your final message is short, at most twelve lines, as common.md says.`

const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    score: { type: 'number' },
    gaps: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    keep: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  },
  required: ['pass', 'score', 'gaps'],
}

const review = (lens, said) => `You are a fresh reviewer of one part of the hero's new world on Brandon Church's portfolio (work from the repo's own folder). You have not seen this work being made and you owe its builder nothing. Assume the builder's verdict is too kind. ${lens}

Read first, with the Read tool: ${B}/common.md, the sections "Read first" and "The two rules of this world" (open what they name), then what you are judging and how: ${B}/${a.review}. The builder's full report is at ${a.report} and its last words were:
<said>
${said}
</said>

Open every still the report names, and take stills of your own as the review file says, so you are not judging only what the builder chose to show. Do not edit any file in the repo. Write your full findings to ${a.report.replace('.md', '')}-review-${'$'}N.md, where ${'$'}N is your lens number.

Return pass=true only if nothing on the fail list applies and you would call it the work of a premium film or a AAA game. score is 1 to 10 (5 is plainly a computer drawing, 8 is film quality with small faults). gaps: at most six, most important first, each one sentence, concrete enough to act on. keep: at most three things that must not be lost.`

phase('Build')
const said = await agent(builder, { label: `build:${a.key}:r${a.round}`, phase: 'Build', model: 'opus' })
phase('Review')
const lenses = [
  'Lens 1: side by side and laid over the picture. Does it sit where the picture has it, and beside the picture is it the better asset or the weaker one, at the page\'s size and at three times zoom?',
  'Lens 2: a stranger and a pedant. First say what you see as someone who has never heard of this project would: what is it, what is it made of, does it look expensive or cheap, a film or a web demo. Then hunt the fail on sight list, sample pixels for anything whiter than pale gold or bluer or greener than it is red, and look for seams, banding, shimmer, tiling and repetition.',
]
const verdicts = await parallel(lenses.map((l, i) => () => agent(review(l, said).replaceAll('$N', String(i + 1)), { label: `review:${a.key}:r${a.round}:${i + 1}`, phase: 'Review', model: 'opus', schema: VERDICT })))
return { part: a.key, round: a.round, said, verdicts }
