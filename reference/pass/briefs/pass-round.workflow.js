export const meta = {
  name: 'pass-round',
  description: 'One round of the section pass on one 3D piece: an Opus builder makes a few checked improvements from a brief on disk, then two fresh Opus reviewers judge them and look for anything broken',
  phases: [
    { title: 'Build', detail: 'the piece, by one Opus builder', model: 'opus' },
    { title: 'Review', detail: 'two fresh reviewers', model: 'opus' },
  ],
}

const B = args.dir
const a = args
const builder = `You are a builder on the section pass of Brandon Church's portfolio site (work from the repo's own folder).

First read, whole, with the Read tool: ${B}/common.md (what every builder on the pass is told: the rules, how to look, how to report). Then read your brief: ${B}/${a.brief}.
${a.round > 1 ? `\nThis is round ${a.round}. Read the report and both reviews of the round before yours first (beside ${a.report}, with the round's number before), and take stills as it stands before you change anything.\n` : ''}
Write your full report to ${a.report}. Your final message is short, at most twelve lines, as common.md says.`

const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    score: { type: 'number' },
    gaps: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    keep: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    broke: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
  required: ['pass', 'score', 'gaps', 'broke'],
}

const review = (lens, said) => `You are a fresh reviewer on the section pass of Brandon Church's portfolio site (work from the repo's own folder). You did not make this work and you owe its builder nothing. Assume the builder's verdict is too kind. ${lens}

Read first, with the Read tool: ${B}/common.md ("Read first" and "Hard rules": open what they name), then the builder's brief ${B}/${a.brief}, which says what was to be made and which of the owner's rulings stand over it. The builder's full report is at ${a.report} and its last words were:
<said>
${said}
</said>

Open every still the report names, and take your own (the scripts in common.md's "How to look"), so you are not judging only what the builder chose to show. Do not edit any file in the repo. Run no build and no dev server. Write your full findings to ${a.report.replace('.md', '')}-review-$N.md.

Return pass=true only if every item in the brief is plainly better than it was, nothing on QUALITY.md's fail list applies, no ruling in BRIEF.md was gone against, and nothing else broke. score is 1 to 10 for the piece as it now stands (5 is plainly a computer drawing, 8 is film quality with small faults). gaps: at most six, most important first, each one sentence, concrete enough to act on. keep: at most three things that must not be lost. broke: anything that is worse than before or that goes against a ruling (quote it), or empty.`

phase('Build')
const said = await agent(builder, { label: `build:${a.key}:r${a.round}`, phase: 'Build', model: 'opus' })
phase('Review')
const lenses = [
  'Lens 1: before and after, item by item. For each item in the brief: is it plainly better than the still of how it was, at the page\'s size and at three times, and is it at the bar of QUALITY.md? Then check every ruling the brief names: was any gone against?',
  'Lens 2: a stranger, a pedant and a regression hunter. Say first what a stranger sees. Then hunt the fail on sight list, sample pixels for anything off the palette, and look for seams, banding, shimmer and repetition. Then look for what broke: the piece in place on its section\'s page and on /lab/whole?ui=0, with the stream arriving, with the cursor moving, on an iPad held sideways (1366 by 1024, touch), with reduced motion, and its frame times (npm run perf) against what the report says they were before.',
]
const verdicts = await parallel(lenses.map((l, i) => () => agent(review(l, said).replaceAll('$N', String(i + 1)), { label: `review:${a.key}:r${a.round}:${i + 1}`, phase: 'Review', model: 'opus', schema: VERDICT })))
return { part: a.key, round: a.round, said, verdicts }
