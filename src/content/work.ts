// The projects on the Work cards. The words are the live site's own (brandonchurchportfolio.com), and the pictures
// are its screenshots, cropped to one telling part. Brandon is retaking the pictures, says which category a project
// is in, and rewrites the words.

export interface WorkLink {
  // The first link says what it opens (his word, Nov 26: "Live is pretty ambiguous"). Play it: a game. View it live:
  // a marketing site or a working app. Try it out: an interactive 3D showcase, which the visitor handles in the
  // browser (his word, Nov 27: "We should change the link to try it out. I think that's better."). Today that is
  // Desktop PC Builder and Meridian, and an interactive 3D project added later takes it too. How it’s made: a film,
  // whose link opens the page that shows its making (his words, Nov 26). It does not say "Watch the film": the film
  // already plays on its page here. No link reads "Live". 3D art and photography have no word yet: he has not
  // chosen one, so add it here when he does.
  // How it’s made is also a further link, after the main ones, on a project that plays or runs and has a film: there
  // it opens the film's review page (his word, Nov 27: "Make sure all the other films I've created that are on my
  // portfolio are public review pages"). That such a project keeps its first link and gains this one is the reading
  // of the chat he keeps his projects in, his to overturn.
  // App and Site: a project that is both a product and the site that sells it, each with its own address.
  // Code: only for a repository that is public and stays public.
  label: 'Play it' | 'View it live' | 'Try it out' | 'How it’s made' | 'App' | 'Site' | 'Evals' | 'Code';
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
  // The sub categories it is under on the page of all his work. A project is in one category and may be under
  // several of that category's sub categories.
  subs?: string[];
  // Not a real project: a card that stands in until he has the work to show.
  standIn?: boolean;
}

// A kind of work, as the category bar names it, and the four projects it shows on the home page.
export interface WorkCategory {
  name: string;
  items: WorkItem[];
  // Its sub categories, in the order they are shown. None: the category is not divided, as Photography is not.
  subs?: string[];
}

const GITHUB = 'https://github.com/BrandonChurch93';
// The page of all his work on this site (src/app/work/page.tsx), where "View all work" goes.
export const ALL_WORK = '/work';

// How many of a project's links are its main ones, counted from the first: two where it is both a product and the
// site that sells it (App and Site), one on every other. On a project's page a main link's button carries the arrow
// that says it leaves this site (his word, Nov 27: "we only need to put it on the primary", and of Kestrel "both
// the main links should probably have the arrow").
export const mainLinks = (item: WorkItem): number => (item.links[0]?.label === 'App' && item.links[1]?.label === 'Site' ? 2 : Math.min(1, item.links.length));

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
    page: `${ALL_WORK}/proactive-ui-for-ai-glasses`,
    links: [
      { label: 'View it live', href: 'https://proactive-ui-for-ai-glasses.vercel.app' },
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
    page: `${ALL_WORK}/ask-the-claude-docs`,
    links: [
      { label: 'View it live', href: 'https://ask-the-claude-docs.vercel.app' },
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
    page: `${ALL_WORK}/design-system-extractor`,
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
    page: `${ALL_WORK}/generative-ui-github`,
    links: [
      { label: 'View it live', href: 'https://generative-ui-github.vercel.app' },
      { label: 'Evals', href: 'https://generative-ui-github.vercel.app/evals' },
      { label: 'Code', href: `${GITHUB}/generative-ui-github` },
    ],
  },
];

// The rest of his software, which the page of all his work shows after the four on the home page. The words are
// the live site's and the pictures are its screenshots. The years are a guess until he says: the live site gives none.
export const more: WorkItem[] = [
  // From the project's own session, Nov 26 (the portfolio folder of its repository), each figure with its source
  // there. A draft of his to rewrite. Its repository is private, so it has no Code link. Its link opens the page that
  // shows how the film was made.
  {
    slug: 'cyberpunk-car-showcase',
    name: 'Cyberpunk Car Showcase',
    kind: 'Procedural Short Film',
    year: '2026',
    line: 'A 46 second film of a mid-engined supercar alone on a rooftop car park at night, in heavy rain, in a neon city. Nothing is filmed: every frame is computed in code, and the water on the deck jumps to 175 measured bass hits.',
    tags: ['WebGL', 'Rain Physics', 'Music Sync'],
    // The loop's first frame is the picture.
    picture: { src: '/media/work/cyberpunk-car-showcase-card.webp', alt: 'A dark supercar with white running lights stands in heavy rain on a wet rooftop deck, under neon signs and a pink and violet billboard.', focus: [0.5, 0.5], loop: '/media/work/cyberpunk-car-showcase-loop.mp4' },
    page: `${ALL_WORK}/cyberpunk-car-showcase`,
    links: [{ label: 'How it’s made', href: 'https://www.perplexity.ai/computer/a/cyberpunk-car-showcase-review-CgLzUoxkSvO_O.Vb.U7kZg' }],
  },
  // From its own repository (README.md, kit/02A-PRODUCT.md, kit/02B-WORLD.md, config/showcase.json), Nov 24. A draft
  // of his to rewrite.
  {
    slug: 'kestrel',
    name: 'Kestrel',
    kind: 'Fleet Control Platform',
    year: '2026',
    line: 'Fleet control for warehouse robots, and the site that sells it. 38 robots work a live 3D floor simulated in the browser, a queue says what needs a person, and its film is cut bar by bar to music.',
    tags: ['Three.js', 'React', 'Fleet Sim'],
    picture: { src: '/media/work/kestrel-card.webp', alt: 'Robots carrying totes and pallets along lit lanes between racks of cartons on a warehouse floor at night, seen from above.', focus: [0.5, 0.5], loop: '/media/work/kestrel-loop.mp4' },
    page: `${ALL_WORK}/kestrel`,
    links: [
      { label: 'App', href: 'https://warehouse-robot-manager.vercel.app/app/' },
      { label: 'Site', href: 'https://warehouse-robot-manager.vercel.app/' },
      { label: 'How it’s made', href: 'https://www.perplexity.ai/computer/a/warehouse-robot-manager-review-1Y1WineOQ4WdkDgEsGK.fQ' },
    ],
  },
  // His video for the page is to be switched for a newer one before the site is launched (his word, Nov 23).
  {
    slug: 'sunflower',
    name: 'Sunflower',
    kind: 'Procedural Short Film',
    year: '2026',
    line: 'A two minute film of one sunflower, from bare soil to open bloom, while fifteen days cross the sky. Nothing is filmed: each of its 3,810 frames is computed from its frame number, and every sunrise lands on a bar line of the music.',
    tags: ['WebGL', 'Time Lapse', 'Music Sync'],
    picture: { src: '/media/work/sunflower-card.webp', alt: 'A closed sunflower bud ringed by pointed green bracts stands against a low, hazy sun and a blurred field.', focus: [0.5, 0.5], loop: '/media/work/sunflower-loop.mp4' },
    page: `${ALL_WORK}/sunflower`,
    links: [{ label: 'How it’s made', href: 'https://www.perplexity.ai/computer/a/life-of-a-sunflower-review-0xhpZ5a_S3Kaj9U7He9UlQ' }],
  },
  {
    slug: 'desktop-pc-builder',
    name: 'Desktop PC Builder',
    kind: '3D Configurator',
    year: '2026',
    line: 'A 3D gaming PC builder that runs in the browser. Drag 43 invented parts into six cases, watch each one seat, and get told in one plain sentence why a part does not fit. Light it, power it on, share it as a link.',
    tags: ['Three.js', 'WebGL', 'TypeScript'],
    // Framed for the card's window as it is, so it is not cropped in. The loop's first frame is the picture.
    picture: { src: '/media/work/pc-builder.webp', alt: 'A white gaming PC on a dark stage, its lights off', focus: [0.5, 0.5], loop: '/media/work/pc-builder-loop.mp4' },
    page: `${ALL_WORK}/desktop-pc-builder`,
    links: [
      { label: 'Try it out', href: 'https://pc-desktop-builder.vercel.app/' },
      { label: 'How it’s made', href: 'https://www.perplexity.ai/computer/a/desktop-pc-builder-review-.rpN3cz4TBu_O3KOU7.bLQ' },
    ],
  },
  {
    slug: 'modern-softworks',
    name: 'Modern Softworks',
    kind: 'Studio Site',
    year: '2026',
    line: 'My studio\u2019s site, where accessibility and SEO literally fail the build below a 90. Hand-built design system on 194 CSS tokens, no UI framework, 22 routes of MDX content.',
    tags: ['Design System', 'GSAP', 'Security Headers'],
    picture: { src: '/media/work/softworks.webp', alt: 'The home page of the Modern Softworks studio site', focus: [0.5, 0.3] },
    page: `${ALL_WORK}/modern-softworks`,
    links: [{ label: 'View it live', href: 'https://www.modernsoftworks.com' }],
  },
  {
    slug: 'hero-animation-builder',
    name: 'Hero Animation Builder',
    kind: 'Design Tool',
    year: '2026',
    line: 'An SVG animation builder with 36 live controls that never lag, because React never re-renders the graphic. Design a layered arc hero, watch a staged fintech site light up with it, and share the whole design as a URL.',
    tags: ['36 Live Controls', 'Shareable State', 'APCA Contrast'],
    picture: { src: '/media/work/hero-builder.webp', alt: 'The builder: a layered arc hero beside its panel of controls', focus: [0.5, 0.4] },
    page: `${ALL_WORK}/hero-animation-builder`,
    links: [
      { label: 'View it live', href: 'https://hero-animation-builder.vercel.app' },
      { label: 'Code', href: `${GITHUB}/HeroAnimationBuilder` },
    ],
  },
  {
    slug: 'meridian',
    name: 'Meridian',
    kind: 'Procedural Watch Movement',
    year: '2026',
    line: 'A working tourbillon watch movement built entirely in code. Every gear turns on real tooth counts from a single beat counter, and visitors can wind it, take it apart, and watch it run down.',
    tags: ['Procedural 3D', 'Working Mechanics', 'Spec-Driven Build'],
    // The loop's first frame is the picture.
    picture: { src: '/media/work/meridian-card.webp', alt: 'The Meridian watch movement in daylight, in its rhodium finish, with a clockwork moth perched on it', focus: [0.5, 0.5], loop: '/media/work/meridian-loop.mp4' },
    page: `${ALL_WORK}/meridian`,
    links: [
      { label: 'Try it out', href: 'https://meridian-calibre.vercel.app/' },
      { label: 'How it’s made', href: 'https://www.perplexity.ai/computer/a/meridian-review-zXolYCTaRFaWr0kGtNPQKw' },
    ],
  },
  {
    slug: 'micro-interactions-library',
    name: 'Micro-Interactions Library',
    kind: 'Component Library',
    year: '2026',
    line: 'Fifteen copy-paste micro-interactions, zero animation libraries. The code you copy is the exact code you just watched run, and accessibility isn\u2019t a checkbox here, it\u2019s three of the fifteen patterns.',
    tags: ['Zero Animation Libs', 'React Aria', 'Reduced Motion'],
    picture: { src: '/media/work/stand-in-art-2.webp', alt: 'A plain picture standing in for the Micro-Interactions Library, which has no screenshot yet' },
    page: `${ALL_WORK}/micro-interactions-library`,
    links: [
      { label: 'View it live', href: 'https://micro-interactions-library.vercel.app/' },
      { label: 'Code', href: `${GITHUB}/micro-interactions-library` },
    ],
  },
];

// Stand ins for the three categories that have no projects on the cards yet. Nothing on them is real: the names say
// so, the words only fill the room real words will take, and the pictures are plain shapes. Every card is one size,
// so their words are written to the length a Software card's are.
// The stand ins that have a page of their own on this site, so the gallery page can be seen with one of each.
const PAGED = new Set(['photo-stand-in-1', 'art-stand-in-1']);
const standIn = (set: string, kind: string, names: string, n: number, line: string, tags: string[]): WorkItem => ({
  slug: `${set}-stand-in-${n}`,
  name: `${names} · stand in 0${n}`,
  kind,
  year: '2026',
  line,
  tags,
  picture: { src: `/media/work/stand-in-${set}-${((n - 1) % 4) + 1}.webp`, alt: `A plain picture standing in for ${names.toLowerCase()} ${n}` },
  page: PAGED.has(`${set}-stand-in-${n}`) ? `${ALL_WORK}/${set}-stand-in-${n}` : '',
  links: [],
  standIn: true,
});
// How many of a list are stand ins.
export const standIns = (items: WorkItem[]): number => items.filter((i) => i.standIn).length;

// His games. From each project's own session, a draft of his to rewrite.
export const played: WorkItem[] = [
  // Halation v2, a project of its own beside the first (his word, Nov 26). From its repository's README and kit. Its
  // link is the address he gave on Nov 26, which opens on a page titled with the tool it was made with.
  {
    slug: 'halation-v2',
    name: 'Halation v2',
    kind: '3D Arena Shooter',
    year: '2026',
    line: 'The same arena shooter, rule for rule, rebuilt as a 3D world of solid machines over a wet metal deck. Proven to play exactly as the first version does, and filmed by its own renderer, frame by frame.',
    tags: ['Three.js', 'WebGL2', 'Deterministic Sim'],
    // The loop's first frame is the picture.
    picture: { src: '/media/work/halation-v2-card.webp', alt: 'A grey arrowhead ship with twin blue engine plumes skims a wet metal deck crossed by channels of cyan light, toward glowing orange and purple machines and a burst of pink sparks.', focus: [0.5, 0.5], loop: '/media/work/halation-v2-loop.mp4' },
    page: `${ALL_WORK}/halation-v2`,
    links: [
      { label: 'Play it', href: 'https://www.perplexity.ai/computer/a/f83016cc-58f5-49b6-9360-28ea1cbd8046' },
      { label: 'How it’s made', href: 'https://www.perplexity.ai/computer/a/halation-v2-review-CkmYRdwySsSAYvQG6.wVbA' },
    ],
    subs: ['Web'],
  },
  {
    slug: 'halation',
    name: 'Halation',
    kind: 'Browser Arena Shooter',
    year: '2026',
    line: 'A neon twin-stick arena shooter for the browser. Every shape, letter and sound is generated in code, and its films are the real game, played by a bot pilot and rendered frame by frame.',
    tags: ['Three.js', 'TypeScript', 'Web Audio'],
    picture: { src: '/media/work/halation-card.webp', alt: 'A white arrow ship streaks across a glowing blue grid toward a crowd of neon squares, chevrons, pinwheels and a green segmented serpent.', focus: [0.5, 0.5], loop: '/media/work/halation-loop.mp4' },
    page: `${ALL_WORK}/halation`,
    links: [
      { label: 'Play it', href: 'https://space-shooter-game-perpelxity.vercel.app/' },
      { label: 'How it’s made', href: 'https://www.perplexity.ai/computer/a/halation-how-it-s-made-tNoQnccqQUyeqNpCUNAiNA' },
    ],
    subs: ['Web'],
  },
];

const count = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const games = (n: number): WorkItem[] => count(n).map((n) => standIn('game', 'Game', 'Game', n,
  'A stand in for a game. Its real words go here: what the game is, what it was built in and the one thing in it worth a closer look, in about as many words as a project card carries, and no more than that.',
  ['Stand in', 'Game', 'Unity']));
const art = (n: number): WorkItem[] => count(n).map((n) => standIn('art', '3D art', '3D piece', n,
  'A stand in for a 3D piece. Its real words go here: what the piece is, what it was made in and what was hard about it, in about as many words as a project card carries, and no more than that.',
  ['Stand in', '3D art', 'Blender']));
const photography = (n: number): WorkItem[] => count(n).map((n) => standIn('photo', 'Photography', 'Photo set', n,
  'A stand in for a set of photographs. Its real words go here: where the set was shot, what it was shot on and what light it was after, in about as many words as a project card carries.',
  ['Stand in', 'Photography', 'Natural light']));

export const categories: WorkCategory[] = [
  { name: 'Software', items: software },
  { name: 'Games', items: [...played, ...games(4 - played.length)] },
  { name: '3D art', items: art(4) },
  { name: 'Photography', items: photography(4) },
];

// Everything, for the page of all his work: the same four categories, each with all it holds. Every category shows,
// the three without real projects as stand ins, until he adds the real ones (his word, Nov 17).
// The sub categories (his words, Nov 17). Games' and 3D art's are the ones he named. Software's three are Fable's
// answer to his asking for them (AI, tools, and sites, which takes his "marketing site"), and which project goes
// under which is his to say. Photography has none: a card there is a shoot.
const SUBS = {
  software: ['AI', 'Tools', 'Sites'],
  games: ['Web', 'Unreal', 'Unity'],
  art: ['3D print', 'Game asset'],
} as const;
const UNDER: Record<string, string[]> = {
  'proactive-ui-for-ai-glasses': ['AI'],
  'ask-the-claude-docs': ['AI'],
  'generative-ui-github': ['AI'],
  'design-system-extractor': ['Tools'],
  'hero-animation-builder': ['Tools'],
  'micro-interactions-library': ['Tools'],
  'modern-softworks': ['Sites'],
  'desktop-pc-builder': ['Sites'],
  sunflower: ['Sites'],
  'cyberpunk-car-showcase': ['Sites'],
  kestrel: ['Sites'],
  meridian: ['Sites'],
};
// A stand in is put under each sub category in turn, so every one of them shows something, and its card says
// which it is under, where the category's own name was: a visitor sees at once that a piece is a 3D print or a
// game asset (his word, Nov 17).
const turn = (items: WorkItem[], subs: readonly string[], kind: (sub: string) => string): WorkItem[] => items.map((item, i) => { const sub = subs[i % subs.length]; return { ...item, subs: [sub], kind: kind(sub) }; });

export const catalog: WorkCategory[] = [
  { name: 'Software', items: [...software, ...more].map((item) => ({ ...item, subs: UNDER[item.slug] ?? [] })), subs: [...SUBS.software] },
  { name: 'Games', items: [...played, ...turn(games(6 - played.length), SUBS.games, (sub) => `${sub} game`)], subs: [...SUBS.games] },
  { name: '3D art', items: turn(art(6), SUBS.art, (sub) => sub), subs: [...SUBS.art] },
  { name: 'Photography', items: photography(6) },
];
