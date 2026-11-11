# Brandon Church · portfolio

The third build of Brandon's portfolio. He calls it the most important thing he has ever made. The work runs across many chats, and any session can lose its memory, so everything a session needs is in this repo.

## Start here, every session, and again after a compaction

1. Read `BRIEF.md`. The rules. It is the only source of them.
2. Read `PLAN.md`. The order of the work and where it stands.
3. Read `QUALITY.md`, and open the images it lists. The bar.
4. Read the top entry of `LOG.md`. What the last session did and left unfinished.

Do not work from what you remember of these. Read them from disk.

## Who does what

- **Brandon** decides and approves. He does not arrive with the full picture. He wants a partner who brings ideas and recommendations, not someone who waits for instructions.
- **Fable** does the creative work itself: color, the water, layout, cards, how each piece sits in the page. It does not hand these to another model.
- **Opus** builds contained 3D objects and the remaining pages late in the plan, from finished examples in this repo. Every subagent runs on Opus.

## How a piece of work goes

1. Read the brief and the quality bar for what you are about to touch.
2. Build it as real code in this repo, on its own page under `/lab` when it helps to see it alone.
3. Look at it. Take stills and filmstrips (see Commands) and open every image.
4. Judge it against `QUALITY.md`. Assume your first verdict is too kind.
5. Fix it and look again until it passes, or until you can say plainly where it falls short.
6. Show Brandon: where to open it, what is at the bar, what is not, and exactly what he is approving.
7. Write his verdict into `BRIEF.md` the moment he gives it.
8. Update `PLAN.md` and `LOG.md`, commit and push.

## Keeping the record

- **`BRIEF.md`:** when Brandon makes a ruling, write it in straight away with the date. Move items between Settled, Open and Dropped as he decides them. If something is not in the brief it is not a rule. Do not invent one, and do not carry one over from the second build.
- **`PLAN.md`:** only Brandon's approval ticks a box. Keep the "Now" section true.
- **`LOG.md`:** add an entry at the end of each piece of work, and before your context gets long. Say what was done, what he said, what is half finished, and anything the next session would otherwise have to rediscover.
- **Git:** commit and push after each piece of work so every chat sees the same repo. End commit messages with the attribution lines your session gives you.

## Working with Brandon

- Give him lists, not paragraphs.
- End every message with a clear, simple recommendation, so he never agrees to something he does not fully understand.
- He speaks in impressions. Restate what he said in exact terms (which section, what it does now, what it should do) before you build on it.
- Never show him something with "the final will be better". If it is not at the bar, keep working or say what is wrong with it.
- Do not make him critique every small detail. Give him an agreed list of what is being built and what is not.
- Ask before changing something he has already approved.
- When he has to do something himself, give only the steps needed right now, as a numbered list. No "if this, then that" branches.
- For a command, say it goes in VS Code's integrated terminal and give the exact text to paste. He prefers the Claude Code panel in VS Code to the terminal when either would do.
- Do not bring up timelines or how long things will take.
- When his own browser has to be checked or operated, give that to an Opus agent.
- He rewrites the site's copy himself. Draft copy only when he asks.

## Commands

All run from the repo folder.

| Command | What it does |
|---|---|
| `npm install` | Once, after cloning |
| `npm run dev` | The site at `http://127.0.0.1:5330` |
| `npm run build` | A production build. Run it before pushing |
| `npm run typecheck` | Type check only |
| `npm run shot -- <route>` | A still of a page. Options are listed at the top of `scripts/shot.mjs` |
| `npm run strip -- <route> --times 0,1,2,3` | A filmstrip of motion. Options are at the top of `scripts/strip.mjs` |

Examples:

```
npm run shot -- /lab/piece/city --t 12
npm run shot -- /lab/piece/handheld --vp phone --lamp 0.3,0.4
npm run strip -- "/lab/piece/city?entrance=1&label=0" --opening --times 0.4,1.2,2,2.8,3.6,4.4,5.2,7
```

- The scripts use the dev server if it is running and start one if it is not.
- They need a browser. If one is missing they say so: run `npx playwright install chromium`.
- Images go to `shots/`, which is not committed. Copy one into `reference/` only when it is worth keeping.
- The scripts print `hardware` or `software`. `QUALITY.md` says what each can be trusted for.

## Where things are

| Path | What |
|---|---|
| `BRIEF.md`, `PLAN.md`, `QUALITY.md`, `LOG.md` | The record |
| `reference/` | The portrait, the bar, the rejected second build, the pieces as carried, stills of each study |
| `src/pieces/` | The 3D pieces, one folder each, behind the contract in `src/world/piece.ts` |
| `src/world/` | Shared 3D code: the stage, materials, the clock, quality tiers |
| `src/lamp/` | The cursor light. One lamp, read by everything that is lit |
| `src/hooks/` | `window.__site`, present only with `?hook=1`. The screenshot scripts drive pages through it |
| `src/components/PieceView.tsx` | Puts a piece in a page |
| `src/app/lab/` | Pages for looking at one thing alone |
| `src/config/palette.ts` | Every color, defined once. The interface gets them as CSS variables, 3D as numbers |
| `src/styles/tokens.css`, `src/config/site.ts` | Type, spacing and other constants, each defined once |
| `scripts/` | The screenshot tools |

Every push to `main` deploys to https://portfolio-website-v3-wheat.vercel.app, which is where Brandon looks at the work on his own machine.

The second build is at https://github.com/BrandonChurch93/Portfolio-Website-v2. Its code can be read for ideas and lifted from when Brandon asks for something it had. Its kit and its rules do not apply here.

## Code and writing

- TypeScript strict. React function components with CSS Modules.
- Three.js is used directly, and GSAP drives motion. Every animation reads time from the one clock in `src/world/clock.ts`, so a frame can be frozen for a screenshot.
- Each constant is defined once and imported.
- Almost no code comments. Keep one only when it explains a reason someone could otherwise undo.
- No em dashes in anything the site shows or in these documents. Use a period, a comma or an interpunct (·).
- This repository is public. Do not commit anything private.

## When compacting

Keep: the phase and item you are on, what is changed but not committed, what Brandon last said, and the rule that the first thing to do afterwards is read `BRIEF.md`, `PLAN.md`, `QUALITY.md` and the top of `LOG.md` again.
