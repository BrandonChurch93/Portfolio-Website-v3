import { catalog, type WorkItem } from './work';

// A project's own page (BRIEF.md, Open 33): what it is, why it was built, how it works, what it proved, what it is
// built with, and its pictures. The words are the live site's own wherever it has them. Where it has none, the
// page says so with a stand in, and never with words made up in his voice. All of it is his to rewrite.

export interface ProjectFigure { value: string; label: string; href?: string }
export interface ProjectStep { title: string; text: string }
export interface ProjectShot { src: string; alt: string; standIn?: boolean }

export interface ProjectPage {
  slug: string;
  // One line under the title.
  sub: string;
  intro: string;
  facts: [label: string, value: string][];
  // The lead picture, and a video of the project when there is one: the picture is then its first frame.
  lead: { src: string; alt: string; video?: string };
  what: string[];
  // Empty until he has written it: the page shows a stand in.
  why: string[];
  how: ProjectStep[];
  proved: ProjectFigure[];
  built: [group: string, items: string[]][];
  gallery: ProjectShot[];
}

const shot = (set: string, n: number): ProjectShot => ({ src: `/media/work/stand-in-${set}-${n}.webp`, alt: `A plain picture standing in for a screenshot`, standIn: true });

export const projects: ProjectPage[] = [
  {
    slug: 'ask-the-claude-docs',
    sub: 'An evaluated RAG chatbot with honest refusals',
    intro: 'A RAG assistant over the live Claude Code documentation. Every answer cites the exact doc passage it came from; when nothing clears a calibrated confidence threshold, it declines instead of guessing, and shows its receipts. Quality is measured, not claimed: a CI eval harness scores retrieval and answer quality on every change and publishes the results, failures included.',
    facts: [
      ['Type', 'RAG chatbot'],
      ['Year', '2026'],
      ['Role', 'Stand in'],
      ['Status', 'Live'],
      ['Corpus', 'The Claude Code docs, re-synced nightly'],
    ],
    lead: { src: '/media/work/claude-docs-full.webp', alt: 'A screenshot of Ask the Claude Docs' },
    what: [
      'A production RAG pipeline end to end: a nightly GitHub Action ingests the live Claude Code docs, chunks them along heading boundaries, and embeds only what changed (an unchanged corpus re-syncs in 26 seconds with zero embedding calls). Questions are answered by Claude Haiku from retrieved passages only, streamed with the sources arriving before the first token, with real cost printed on every receipt.',
      'The distinctive part is what happens when it can’t answer: a server-side gate calibrated from measured score distributions refuses before the model is ever called, and a public /evals page shows retrieval accuracy, LLM-judged answer quality with a noise margin, and the refusal tests, all re-run by CI so a regression cannot merge.',
      'The entire application was built by Claude Code executing twelve specification documents I wrote, under a three-tier decision authority that escalated ten real engineering conflicts to me for rulings. Hand-built editorial design system in three typefaces, no UI framework, with accessibility gated in CI.',
    ],
    why: [],
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
    proved: [
      { value: '0', label: 'LLM calls when it refuses' },
      { value: '26 s', label: 'to re-sync an unchanged corpus' },
      { value: '30x', label: 'less for a decline than an answer' },
      { value: 'Live', label: 'CI-scored eval scoreboard', href: 'https://ask-the-claude-docs.vercel.app/evals' },
    ],
    built: [
      ['Front end', ['Next.js 16', 'React 19', 'TypeScript']],
      ['Data', ['PostgreSQL + pgvector', 'Upstash Redis']],
      ['AI', ['Anthropic API', 'OpenAI Embeddings']],
      ['Delivery', ['GitHub Actions', 'Playwright', 'Vercel']],
    ],
    gallery: [
      { src: '/media/work/claude-docs-full.webp', alt: 'A screenshot of Ask the Claude Docs' },
      shot('art', 1),
      shot('art', 3),
      shot('photo', 2),
    ],
  },
];

const all: WorkItem[] = catalog.flatMap((c) => (c.standIn ? [] : c.items));

// A project's page with the card it belongs to, and the projects before and after it among those that have pages.
export function projectOf(slug: string): { page: ProjectPage; item: WorkItem; prev: WorkItem | null; next: WorkItem | null } | null {
  const page = projects.find((p) => p.slug === slug), at = all.findIndex((i) => i.slug === slug);
  if (!page || at < 0) return null;
  return { page, item: all[at], prev: all[at - 1] ?? null, next: all[at + 1] ?? null };
}
