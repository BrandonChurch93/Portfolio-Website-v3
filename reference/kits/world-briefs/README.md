# The briefs the hero's new world is built from

`reference/kits/world.md` is the kit. These are the working briefs under it, as they stood on the night of Nov 15 to 16, kept in the repo so the work can be picked up by any session.

- `common.md`: what every builder is told. The rules, the frame, the tools, how to look, how to report, and at its end what changed in the frame during the night.
- `<part>.md`, `<part>-r2.md` and so on: each part's brief, a file a round. A later round's brief says what was kept, what the two fresh reviewers and Fable found short, and what must change, most important first. The latest for a part is its next round's.
- `<part>-review.md`: what a reviewer of that part is told to judge and how.
- `world-round.workflow.js`: the Claude Code workflow that runs one round: one Opus builder from a brief, then two fresh Opus reviewers, each with a lens of its own. It takes `{ key, round, brief, review, report }`.

How a round goes, and why:
1. Fable lays the part over picture 9 (`npm run match`) and beside its own picture, and reads both reviews.
2. Fable writes the next brief: what to keep (so it is not lost), then the faults in order, each concrete.
3. The round runs. Its report goes to `shots/world/<part>/r<N>-report.md`, the reviews beside it. `shots/` is not committed.
4. The round is committed before the next begins. A round that existed only as uncommitted files was once overwritten by the next.

Where each part stands is in `LOG.md`, top entry.
