import { catalog, type WorkItem } from './work';

// A project's own page (BRIEF.md, Open 33). Two kinds. A case study, for software and games: a viewer with the
// video and the pictures at the top beside a summary, then the problem, what was built, the decisions, and what
// it is built with. A gallery, for a shoot and for a 3D piece: the pictures first, a short note, and a few facts.
// The words are the live site's own wherever it has them. Where it has none, the page says so with a stand in,
// and never with words made up in his voice. All of it is his to rewrite.

// One thing in a viewer. slot 'video' is a video's place: it plays `video` when there is one, and until then
// shows `src` as its picture and says it is a stand in.
export interface Shot { src: string; alt: string; caption: string; slot?: 'video'; video?: string; standIn?: boolean }
export interface ProjectFigure { value: string; label: string; href?: string }
export interface ProjectStep { title: string; text: string }
export type Fact = [label: string, value: string];

interface Base {
  slug: string;
  // One line under the name.
  sub: string;
  facts: Fact[];
  shots: Shot[];
}

export interface StudyPage extends Base {
  kind: 'study';
  proved: ProjectFigure[];
  // Empty until he has written it: the page shows a stand in.
  why: string[];
  what: string[];
  how: ProjectStep[];
  built: [group: string, items: string[]][];
}

export interface GalleryPage extends Base {
  kind: 'gallery';
  // How wide the pictures are to how tall.
  aspect: number;
  note: string[];
}

export type ProjectPage = StudyPage | GalleryPage;

const STAND_IN = 'Stand in';
const still = (set: string, n: number, caption: string): Shot => ({ src: `/media/work/stand-in-${set}-${((n - 1) % 4) + 1}.webp`, alt: 'A plain picture standing in for a real one', caption, standIn: true });

export const projects: ProjectPage[] = [
  {
    kind: 'study',
    slug: 'ask-the-claude-docs',
    sub: 'An evaluated RAG chatbot with honest refusals',
    facts: [
      ['Role', STAND_IN],
      ['Status', 'Live'],
      ['Corpus', 'The Claude Code docs, re-synced nightly'],
    ],
    shots: [
      { src: '/media/work/claude-docs-full.webp', alt: 'A still from a video of Ask the Claude Docs', caption: 'A video of the project plays here once there is one.', slot: 'video', standIn: true },
      { src: '/media/work/claude-docs-full.webp', alt: 'The Ask the Claude Docs type specimen: an answer set in a serif with a citation, a question set in a sans, and a receipt set in a mono', caption: 'The design language: one typeface for the answer, one for the interface, one for the receipt.' },
      still('art', 1, 'A screenshot goes here: an answer with its citations.'),
      still('art', 3, 'A screenshot goes here: a refusal, with its receipt.'),
      still('photo', 2, 'A screenshot goes here: the public eval scoreboard.'),
    ],
    proved: [
      { value: '0', label: 'LLM calls when it refuses' },
      { value: '26 s', label: 'to re-sync an unchanged corpus' },
      { value: '30x', label: 'less for a decline than an answer' },
      { value: 'Live', label: 'CI-scored eval scoreboard', href: 'https://ask-the-claude-docs.vercel.app/evals' },
    ],
    why: [],
    what: [
      'A production RAG pipeline end to end: a nightly GitHub Action ingests the live Claude Code docs, chunks them along heading boundaries, and embeds only what changed (an unchanged corpus re-syncs in 26 seconds with zero embedding calls). Questions are answered by Claude Haiku from retrieved passages only, streamed with the sources arriving before the first token, with real cost printed on every receipt.',
      'The distinctive part is what happens when it can’t answer: a server-side gate calibrated from measured score distributions refuses before the model is ever called, and a public /evals page shows retrieval accuracy, LLM-judged answer quality with a noise margin, and the refusal tests, all re-run by CI so a regression cannot merge.',
      'The entire application was built by Claude Code executing twelve specification documents I wrote, under a three-tier decision authority that escalated ten real engineering conflicts to me for rulings. Hand-built editorial design system in three typefaces, no UI framework, with accessibility gated in CI.',
    ],
    how: [
      { title: 'A refusal gate on the server', text: 'Below the calibrated similarity threshold the model is never called; a decline costs 30x less than an answer and says so on its receipt.' },
      { title: 'Citations to the passage', text: 'Passage-level citations streamed sources-first over SSE; every [n] marker deep-links to the exact heading on code.claude.com.' },
      { title: 'A public eval scoreboard', text: 'Retrieval hit@5 and MRR plus a four-check LLM judge with a measured noise margin, re-run by CI on every change; regressions cannot merge.' },
      { title: 'A corpus that keeps itself', text: 'A daily Action hash-diffs the live docs and embeds only deltas; first ingest 8 minutes, unchanged re-sync 26 seconds.' },
      { title: 'Spend defenses', text: 'Asymmetric failure postures: per-IP rate limiting fails open, the global daily spend cap fails closed; every receipt computes cost from real API usage.' },
      { title: 'Built by an agent under governance', text: 'Twelve frozen spec documents, three-tier decision authority, phase gates with self-audits, ten escalated rulings, all logged.' },
      { title: 'A hand-built design system', text: 'Three typefaces as three voices, token palette with measured WCAG contrast, no UI framework.' },
      { title: 'Hardened CI', text: 'Playwright e2e with axe, Lighthouse budgets, payload assertions, secret greps and CVE gates that caught three real advisories mid-build.' },
    ],
    built: [
      ['Front end', ['Next.js 16', 'React 19', 'TypeScript']],
      ['Data', ['PostgreSQL + pgvector', 'Upstash Redis']],
      ['AI', ['Anthropic API', 'OpenAI Embeddings']],
      ['Delivery', ['GitHub Actions', 'Playwright', 'Vercel']],
    ],
  },
  // A shoot and a 3D piece, both stand ins, so the gallery page can be judged with one of each.
  {
    kind: 'gallery',
    slug: 'photo-stand-in-1',
    sub: 'A stand in for a shoot',
    aspect: 3 / 2,
    facts: [['Place', STAND_IN], ['Date', STAND_IN], ['Camera', STAND_IN], ['Light', STAND_IN]],
    note: [],
    shots: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => still('photo', n, `Picture ${n} of the shoot, with a line about it.`)),
  },
  {
    kind: 'gallery',
    slug: 'art-stand-in-1',
    sub: 'A stand in for a 3D piece',
    aspect: 16 / 10,
    facts: [['Made in', STAND_IN], ['Made for', '3D print'], ['Size', STAND_IN], ['Files', STAND_IN]],
    note: [],
    shots: [
      { ...still('art', 1, 'A turntable of the piece plays here once there is one.'), slot: 'video' },
      ...[2, 3, 4, 5, 6].map((n) => still('art', n, `View ${n - 1} of the piece, with a line about it.`)),
    ],
  },
];

export const STAND_IN_WORD = STAND_IN;

// A project's page with the card it belongs to. A case study also has the real projects before and after it.
export function projectOf(slug: string): { page: ProjectPage; item: WorkItem; prev: WorkItem | null; next: WorkItem | null } | null {
  const page = projects.find((p) => p.slug === slug);
  const item = catalog.flatMap((c) => c.items).find((i) => i.slug === slug);
  if (!page || !item) return null;
  const real = catalog.flatMap((c) => (c.standIn ? [] : c.items)), at = real.findIndex((i) => i.slug === slug);
  return { page, item, prev: at > 0 ? real[at - 1] : null, next: at >= 0 ? real[at + 1] ?? null : null };
}
