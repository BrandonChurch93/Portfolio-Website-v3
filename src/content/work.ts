// The projects on the Work cards. The words are the live site's own (brandonchurchportfolio.com), and the pictures
// are its screenshots, cropped to one telling part. Brandon is retaking the pictures, says which category a project
// is in, and rewrites the words.

export interface WorkLink {
  label: 'Live' | 'Evals' | 'Code';
  href: string;
}

export interface WorkItem {
  slug: string;
  name: string;
  kind: string;
  year: string;
  line: string;
  tags: string[];
  // focus: the part of the picture that stays in view when it is cropped, 0 to 1. zoom: how far it is cropped in.
  // loop: a short video of the same view, which plays while the card is awake. Its first frame is the picture.
  picture: { src: string; alt: string; focus?: [number, number]; zoom?: number; loop?: string };
  page: string;
  links: WorkLink[];
}

// A kind of work, as the category bar names it, and the four projects it shows on the home page.
export interface WorkCategory {
  name: string;
  items: WorkItem[];
  // Not real projects: cards that stand in until he has the work to show and says which projects go where.
  standIn?: boolean;
}

const GITHUB = 'https://github.com/BrandonChurch93';
const LIVE_SITE = 'https://www.brandonchurchportfolio.com/projects';

export const software: WorkItem[] = [
  {
    slug: 'proactive-ui-for-ai-glasses',
    name: 'Proactive UI for AI Glasses',
    kind: 'UX Study',
    year: '2026',
    line: 'A simulated city-street walk in near-future AI glasses. A deterministic engine decides what to show, how much, and when to stay quiet. Each decision is logged with its reason, can be replayed in an inspector, and is scored by evals.',
    tags: ['Decision Engine', 'Walking Rules', 'Three.js', 'Scenario Evals'],
    picture: {
      src: '/media/work/glasses.webp',
      alt: 'The view through the glasses on a city street: a card for the Grace Theater pinned at its storefront, with a label for Trattoria da Lia beside it',
      focus: [0.5, 0.5],
    },
    page: `${LIVE_SITE}/proactive-ui-for-ai-glasses`,
    links: [
      { label: 'Live', href: 'https://proactive-ui-for-ai-glasses.vercel.app' },
      { label: 'Code', href: `${GITHUB}/Proactive-UI-for-AI-Glasses` },
    ],
  },
  {
    slug: 'ask-the-claude-docs',
    name: 'Ask the Claude Docs',
    kind: 'RAG Chatbot',
    year: '2026',
    line: 'A retrieval-augmented chatbot that either proves its answers or declines to answer. Each response cites the passages behind it, the refusal wording is calibrated from real data, and a public eval suite scores every change in CI.',
    tags: ['RAG Pipeline', 'pgvector', 'Cited Answers'],
    picture: {
      src: '/media/work/claude-docs.webp',
      alt: 'The Ask the Claude Docs type specimen: an answer set in a serif with a cited passage, and a question set in a sans',
      focus: [0.43, 0.4],
    },
    page: `${LIVE_SITE}/ask-the-claude-docs`,
    links: [
      { label: 'Live', href: 'https://ask-the-claude-docs.vercel.app' },
      { label: 'Evals', href: 'https://ask-the-claude-docs.vercel.app/evals' },
      { label: 'Code', href: `${GITHUB}/Ask-the-Claude-Docs` },
    ],
  },
  {
    slug: 'design-system-extractor',
    name: 'Design System Extractor',
    kind: 'MCP Server & CLI',
    year: '2026',
    line: 'Paste a URL to get the site’s design system back: tokens, live components in every state, measured checks, and a drift report. It’s free to try, with paid plans through Stripe, and it exports to Tailwind, W3C tokens, and an MCP server.',
    tags: ['Live Component Capture', 'MCP Server', 'Stripe Billing'],
    picture: {
      src: '/media/work/dse.webp',
      alt: 'A Design System Extractor run: the counts of colors, type styles and components it found, and the palette it extracted',
      focus: [0.67, 0.3],
      zoom: 1.75,
    },
    page: `${LIVE_SITE}/design-system-extractor`,
    links: [{ label: 'Code', href: `${GITHUB}/design-system-extractor` }],
  },
  {
    slug: 'generative-ui-github',
    name: 'Generative UI for GitHub',
    kind: 'Agent-Composed',
    year: '2026',
    line: 'Paste a GitHub repo and ask a question. An agent assembles the interface that answers it: the model picks the components, the code renders them, and every number it writes is checked against the data.',
    tags: ['Generative UI', 'Live Rewrites', 'Public Evals'],
    picture: {
      src: '/media/work/genui.webp',
      alt: 'A composed answer about a GitHub repo: a sentence that sums it up, then open pull requests, pull requests awaiting review and failing checks',
      focus: [0.36, 0.6],
      zoom: 1.3,
    },
    page: `${LIVE_SITE}/generative-ui-github`,
    links: [
      { label: 'Live', href: 'https://generative-ui-github.vercel.app' },
      { label: 'Evals', href: 'https://generative-ui-github.vercel.app/evals' },
      { label: 'Code', href: `${GITHUB}/generative-ui-github` },
    ],
  },
];

// Stand ins for the three categories that have no projects on the cards yet. Nothing on them is real: the names say
// so, the words only fill the room real words will take, and the pictures are plain shapes. The three sets are
// written to different lengths, so their cards come out shorter and taller than Software's.
const HOME = '#work-title';
const standIn = (set: string, kind: string, names: string, n: number, line: string, tags: string[]): WorkItem => ({
  slug: `${set}-stand-in-${n}`,
  name: `${names} · stand in 0${n}`,
  kind,
  year: '2026',
  line,
  tags,
  picture: { src: `/media/work/stand-in-${set}-${n}.webp`, alt: `A plain picture standing in for ${names.toLowerCase()} ${n}` },
  page: HOME,
  links: [],
});

const games: WorkItem[] = [1, 2, 3, 4].map((n) => standIn('game', 'Game', 'Game', n, 'A stand in for a game. Its real words go here.', ['Stand in', 'Game']));
const art: WorkItem[] = [1, 2, 3, 4].map((n) => standIn('art', '3D art', '3D piece', n,
  'A stand in for a 3D piece. Its real words go here: what the piece is, what it was made in and what was hard about it, in about as many words as a project card carries.',
  ['Stand in', '3D art', 'Blender']));
const photography: WorkItem[] = [1, 2, 3, 4].map((n) => standIn('photo', 'Photography', 'Photo set', n,
  'A stand in for a set of photographs. Its real words go here, and this one runs long on purpose: where the set was shot, what it was shot on, what light it was after, how long it took and how many frames made the cut. It is written long so that this card stands taller than a card for software, and the page under it has to make room for it and then give that room back.',
  ['Stand in', 'Photography', 'Natural light', 'Medium format']));

export const categories: WorkCategory[] = [
  { name: 'Software', items: software },
  { name: 'Games', items: games, standIn: true },
  { name: '3D art', items: art, standIn: true },
  { name: 'Photography', items: photography, standIn: true },
];
