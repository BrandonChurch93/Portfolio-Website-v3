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
interface Base {
  slug: string;
  // One line under the name.
  sub: string;
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
  // What it was made with, where that is worth saying, as a 3D piece's tools are. standIn: the names are a guess.
  built?: { items: string[]; standIn?: boolean };
}

export type ProjectPage = StudyPage | GalleryPage;

const STAND_IN = 'Stand in';
const still = (set: string, n: number, caption: string): Shot => ({ src: `/media/work/stand-in-${set}-${((n - 1) % 4) + 1}.webp`, alt: 'A plain picture standing in for a real one', caption, standIn: true });
const video = (src: string, alt: string): Shot => ({ src, alt, caption: 'A video of the project plays here once there is one.', slot: 'video', standIn: true });

// The other seven are the live site's pages (brandonchurchportfolio.com/projects/<slug>) in its own words: the line
// under the name, its overview split into paragraphs, its key features each split at its lead phrase into a title and
// its text, its stack grouped here, and its figures. The opening paragraph above an overview is kept only where the
// overview does not already say it.
export const projects: ProjectPage[] = [
  {
    kind: 'study',
    slug: 'proactive-ui-for-ai-glasses',
    sub: 'A UX study in when an assistant should speak, and when it should stay quiet',
    shots: [
      video('/media/work/glasses.webp', 'A still from a video of Proactive UI for AI Glasses'),
      { src: '/media/work/glasses.webp', alt: 'The view through the glasses on a city street: a card for the Grace Theater pinned at its storefront, with a label for Trattoria da Lia beside it', caption: 'A theater’s card and a restaurant’s label on a city street.' },
      still('photo', 1, 'A screenshot goes here: the inspector, a decision with its reason.'),
      still('art', 2, 'A screenshot goes here: a crossing, with the glass stepped back.'),
      still('game', 3, 'A screenshot goes here: the eval report.'),
    ],
    proved: [
      { value: '13', label: 'walking rules' },
      { value: '0', label: 'LLM calls, same decisions every run' },
      { value: '1,000+', label: 'eval checks across 44 suites' },
      { value: 'Live', label: 'walk the block yourself', href: 'https://proactive-ui-for-ai-glasses.vercel.app' },
    ],
    why: [],
    what: [
      'An assistant on a screen waits to be asked. Glasses have to decide when to speak at all, to someone who is walking, watching for traffic and can’t afford to read. This project is a study of that decision.',
      'One looping city block renders in real time in Three.js. The wearer walks it on rails and looks where they like, with a viewfinder standing in for eye tracking. Ten times a second a rules engine reads a snapshot of the walk (pace, gaze and dwell, the crossing and its signal, nearby cars and people, messages and the goal) and returns decisions, each with a level, a timing, a placement and a reason. Gates beat everything: in a crossing the glass steps back and the safety text shows. A settled view lights the labels of the places in sight, a held look grows one into its card and then its expanded view, and turning away plays it back down a level at a time.',
      'The brain is a rules policy, not a model: no LLM, no keys, no server, and a seeded simulation, so the same inputs make the same decisions every run. That is what keeps the proof exact. The inspector replays every decision with its reason, and the eval suite runs two recorded walks and 41 focused cases through the engine headless, scoring them against hand-written expectations.',
      'Claude Code on Opus built it from a written spec across 31 gated phases. In the final rounds a second Claude Code session reviewed each phase and reran its checks, and I played each build before the next one was written.',
    ],
    how: [
      { title: 'Thirteen walking rules', text: 'The clear center of view grows with pace, unread labels fold themselves in 2.5 seconds at a walk, and a brisk pace gets one captioned line in place of a pane.' },
      { title: 'Deterministic decision engine', text: 'A 10 Hz tick in a fixed order of pace band, gates, scored candidates and the attention ladder, with no Math.random and no wall clock.' },
      { title: 'Attention climbs with the look', text: 'A held look grows a label to its card in half a second and to its expanded view two seconds later, pinned where the look landed. Turn away and it plays back down.' },
      { title: 'The world has right of way', text: 'Crossings and nearby vehicles step the glass back, content yields to a head check at the curb, and a pane over a person or car dims and moves aside. A face is never covered.' },
      { title: 'The pocket and the budget', text: 'A pinch while walking opens nothing, it saves the place for the next red light. Seven proactive shows per walk, earned back by 40 seconds of quiet.' },
      { title: 'An inspector as proof', text: 'Every decision with its reason, a scrubbable timeline, live signals, overrides, the eval report and an export that replays through a fresh engine and must match exactly.' },
      { title: 'Evals as the real test suite', text: '44 suites and over 1,000 checks, with invariants on every run. Every crossing decision is a hold, no reason cites the wearer’s body or habits, and two runs produce identical logs.' },
      { title: 'Measured in a real browser', text: 'Scripted laps aim with real drags and judge every landing for jumps, every one of fourteen doors is walked and chosen, and thirteen screens from a 390 px phone to 4K are rendered.' },
    ],
    built: [
      ['Front end', ['TypeScript', 'GSAP', 'CSS Modules', 'Vite']],
      ['3D', ['Three.js', 'WebGL 2']],
      ['Delivery', ['Vitest', 'Playwright', 'Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'ask-the-claude-docs',
    sub: 'An evaluated RAG chatbot with honest refusals',
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
  {
    kind: 'study',
    slug: 'design-system-extractor',
    sub: 'A website’s design system, extracted as measured data',
    shots: [
      video('/media/work/dse.webp', 'A still from a video of the Design System Extractor'),
      { src: '/media/work/dse.webp', alt: 'A Design System Extractor run: the counts of colors, type styles and components it found, the palette it extracted, and three of the components', caption: 'A run’s counts, its palette and three of its components.' },
      still('art', 4, 'A screenshot goes here: a component in every state, with its pixel check.'),
      still('photo', 3, 'A screenshot goes here: the drift report.'),
      still('game', 1, 'A screenshot goes here: the MCP server answering in an editor.'),
    ],
    proved: [
      { value: 'Under 1¢', label: 'model cost per run' },
      { value: '0', label: 'scripts run in any preview' },
      { value: '801', label: 'tests on every release' },
      { value: '72–83%', label: 'live preview rate, from near 30%' },
    ],
    why: [],
    what: [
      'A product that treats a website’s design system as data. Paste a URL and a headless crawler visits its key pages, captures every component in every state it can reach, clusters raw values into tokens, runs five measured checks per component and reports where the system is drifting. It’s free to try, with paid plans through Stripe, and everything exports to Tailwind, W3C tokens and an MCP server.',
      'Reading stylesheets isn’t enough, so this watches the page. A Playwright crawler picks the pages that matter, walks the real Tab order for focus, holds the mouse down for active states and reads motion from the running page, including GSAP. Values cluster into tokens in OKLCH, and components are grouped by structure, not selectors. Every preview is rebuilt as sanitized HTML and CSS, then pixel-diffed against the real page before it’s shown live. Real sites fought back. stripe.com first took 773 seconds against a six-minute limit, and live preview rates started near 30%. Four measured rounds of cause-by-cause fixes brought them to between 72% and 83%.',
      'The model only names and narrates. Every call has a deterministic fallback, and every number in a narrative is checked against the facts. Free runs sit behind a daily budget that fails closed, per-visitor caps and a worst-case reservation. Paid plans through Stripe lift those limits, and a typical run costs under a cent in model spend.',
      'Claude Code on Opus built it from a kit I planned, across nineteen gated phases and 112 logged decisions, with a second Claude Code session reviewing each round before I tested it.',
    ],
    how: [
      { title: 'Previews checked by pixels', text: 'Each component is rebuilt as sanitized HTML and CSS and pixel-diffed against the real page. Within 2.5% it renders live; otherwise the crop shows with the measured reason.' },
      { title: 'Every state, replayed without scripts', text: 'Hover, focus through a real Tab walk, active, open and disabled are captured with their timing and replayed inside a scriptless sandbox.' },
      { title: 'Motion read from the running page', text: 'Web Animations, CSS and an inline-style sampler that catches GSAP, classified into entrances, scroll reveals and loops, with every easing drawn on its real curve.' },
      { title: 'Components, not selectors', text: 'Clustered by structure and merged across pages into named variants, keeping the site’s own variable names, with a source crop that scrolls to every element.' },
      { title: 'Measured checks and a safe drift fix', text: 'Five checks per component, counted as measured, never claimed. The drift report proposes a smaller token set that keeps every passing contrast pair passing.' },
      { title: 'Built for AI reuse', text: 'Exports to CSS, JSON, Tailwind and W3C tokens, a prompt for any model, an MCP server with seven tools, and a CLI that can reach logged-in pages.' },
      { title: 'Free and paid tiers', text: 'Free runs are protected by a daily budget that fails closed, per-visitor caps and a worst-case reservation. Paid plans bill through Stripe and lift the caps.' },
      { title: 'Built by an AI agent under a written spec', text: 'Nineteen gated phases, 112 logged decisions, and a release gate of 801 tests, 134 visual goldens, zero axe violations and Lighthouse budgets.' },
    ],
    built: [
      ['Front end', ['Next.js 16', 'React 19', 'TypeScript']],
      ['Crawling', ['Playwright', 'BullMQ']],
      ['Data', ['Redis', 'PostgreSQL', 'Drizzle']],
      ['AI', ['Anthropic API', 'Model Context Protocol']],
      ['Billing', ['Stripe']],
      ['Delivery', ['Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'generative-ui-github',
    sub: 'An agent that composes interfaces from GitHub repo data',
    shots: [
      video('/media/work/genui.webp', 'A still from a video of Generative UI for GitHub'),
      { src: '/media/work/genui.webp', alt: 'A composed answer about a GitHub repo: a sentence that sums it up, then open pull requests, pull requests awaiting review, failing checks, a list of the longest waiting and a chart of CI duration', caption: 'An answer composed for a repo: counts, a list and a chart.' },
      still('photo', 4, 'A screenshot goes here: the screen rewriting itself after a click.'),
      still('art', 1, 'A screenshot goes here: one component in its five states.'),
      still('game', 2, 'A screenshot goes here: the public eval results.'),
    ],
    proved: [
      { value: '41', label: 'components, five states each' },
      { value: '$0.002', label: 'per composed answer' },
      { value: '99', label: 'eval cases, run three times each' },
      { value: 'Live', label: 'eval results', href: 'https://generative-ui-github.vercel.app/evals' },
    ],
    why: [],
    what: [
      'Paste any public GitHub repo and ask it a question. A model classifies the question, picks from a hand-built catalog of 41 components, and the renderer streams the screen in. Click any card, row or chart point and the screen rewrites itself around it. Every number the model writes is checked against the data it cites, and a public eval harness scores the whole pipeline on every change.',
      'Most generative UI demos let a model write the page. This one doesn’t. The model emits a small JSON description, chosen from a Zod-validated registry, and never touches HTML, CSS or a pixel value; the system decides what everything looks like. Haiku classifies each question into one of fifteen layout templates and fills the slots; Sonnet composes only when no template fits, which keeps a typical answer around a fifth of a cent. Screens arrive as a stream of ops against stable component ids, so a follow-up click doesn’t reload anything: the pieces that no longer apply exit in reverse of how they entered, the survivors morph into their new positions, and the new ones draw in.',
      'Underneath is a design system I built in Claude Design and then audited to the number: 41 components, each with default, skeleton, empty, error and warming states at three densities, two tokens per status color so text and fills both pass contrast, and six motion moves with Motion owning presence and GSAP owning what happens inside a card.',
      'The eval harness runs 99 cases three times each on three model configurations and publishes everything, including the finding that Haiku alone matches production on routing and numbers at a third of the cost.',
    ],
    how: [
      { title: 'Model decides, code renders', text: 'The composer emits JSON against a Zod registry and never HTML, class names or colors. Unknown or malformed output renders the component’s error state instead of throwing.' },
      { title: 'Rewrites in place', text: 'Stable ids and a diff engine turn a follow-up click into exits, morphs and entrances rather than a page load. Exit is the strict reverse of enter.' },
      { title: 'Two-model routing', text: 'Haiku classifies into fifteen templates and fills them; Sonnet composes only off-template. Production answers cost about $0.002 and arrive in about six seconds.' },
      { title: 'Numbers are verified', text: 'Any figure the model writes into a sentence, delta or chart finding is checked against the data it cites. A mismatch is replaced by a system sentence, never rendered.' },
      { title: 'Five states, three densities, every component', text: 'Error is never styled as critical, a zero is data not empty, and the frame always renders so you can see what’s loading, missing or failed.' },
      { title: 'Cost controls that show on screen', text: 'Fifteen live compositions per visitor per day, precomputed answers for five sample repos, and a global daily cap that flips the site to cached-only mode and says so.' },
      { title: 'Public evals with the failures left in', text: '99 cases, three runs, three model configurations, scored on template, bindings, numbers, rules, latency and cost, with a regression gate before any composer change can land.' },
      { title: 'A design system built to be audited', text: 'Tokens generated from one JSON file, CSS modules with no framework, measured contrast on every status color, and Motion plus GSAP split so neither touches the other’s element.' },
    ],
    built: [
      ['Front end', ['Next.js', 'React', 'TypeScript', 'CSS Modules']],
      ['Motion', ['Motion', 'GSAP']],
      ['AI', ['Anthropic API', 'Zod']],
      ['Data', ['GitHub GraphQL + REST', 'Upstash Redis']],
      ['Delivery', ['Playwright', 'Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'modern-softworks',
    sub: 'A full marketing site for my studio, Modern Softworks',
    shots: [
      video('/media/work/softworks.webp', 'A still from a video of the Modern Softworks site'),
      { src: '/media/work/softworks.webp', alt: 'The Modern Softworks mark, a green hexagon, over the studio’s name and the words Development Studio on a dark ground', caption: 'The studio’s mark and name on a dark ground.' },
      still('art', 3, 'A screenshot goes here: a service page with its consultation form.'),
      still('photo', 1, 'A screenshot goes here: a guide from the MDX pipeline.'),
      still('game', 4, 'A screenshot goes here: a case study page.'),
    ],
    proved: [
      { value: '48', label: 'hand-built components' },
      { value: '22', label: 'pages' },
      { value: '90%', label: 'accessibility floor in CI/CD' },
    ],
    why: [],
    what: [
      'The website for my development studio, Modern Softworks. A full marketing site with lead generation, blog, case studies, and service pages built for private-sector and federal clients.',
      'The entire design system is hand-built on CSS custom properties. No Tailwind, no UI framework. 48 components, a semantic color system, typography scale, and spacing tokens all from scratch. Lighthouse CI fails the build if accessibility drops below 90%. Enterprise-grade security headers and AVIF/WebP images.',
    ],
    how: [
      { title: 'Custom design system', text: '48 components, 10 section modules, full token system with no framework dependency.' },
      { title: 'MDX content pipeline', text: '8 blog posts, 6 guides, 3 case studies, reading time, table of contents, and RSS feeds.' },
      { title: 'Dynamic OG image generation per page', text: 'Using Next.js ImageResponse API.' },
      { title: 'Context-aware consultation modal', text: 'Pre-fills based on which service page the user is on.' },
      { title: 'Canvas 2D and GSAP', text: 'Canvas 2D particle field and GSAP scroll-triggered animations.' },
      { title: 'Lighthouse CI', text: 'Enforces accessibility and SEO as hard build failures on every push.' },
      { title: 'Enterprise security headers', text: 'Full CSP, HSTS with preload, X-Frame-Options DENY.' },
      { title: 'No tracking', text: 'No tracking pixels, no chat widgets.' },
    ],
    built: [
      ['Front end', ['Next.js 15', 'React 19', 'TypeScript']],
      ['Motion', ['GSAP']],
      ['Content', ['MDX']],
      ['Email', ['Resend']],
      ['Delivery', ['Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'hero-animation-builder',
    sub: 'Design a hero animation, watch it ship itself',
    shots: [
      video('/media/work/hero-builder.webp', 'A still from a video of the Hero Animation Builder'),
      { src: '/media/work/hero-builder.webp', alt: 'The builder: a glowing violet arc under a headline, beside its panel of presets and sliders for the line', caption: 'A glowing arc beside the builder’s panel of controls.' },
      still('game', 1, 'A screenshot goes here: the staged fintech site, lit by a design.'),
      still('art', 2, 'A screenshot goes here: the five glow layers in the panel.'),
    ],
    proved: [
      { value: '36', label: 'live animation controls' },
      { value: '5', label: 'independent glow layers' },
      { value: '0', label: 'animation libraries' },
    ],
    why: [],
    what: [
      'A two-sided piece: a builder and a stage. The builder exposes the full anatomy of a hero arc animation (line thickness and brightness falloff, five named glow layers from Upper Far to Lower Far each with its own color, width, blur, opacity, and offset, a choreographed entrance draw, and a breathing loop) with five tuned presets and a randomizer. The stage is /live, a deliberately fictional fintech brand whose hero, feature grid, and CTA are all lit by whatever the user designed: the config travels as base64 JSON in the URL and is decoded during server-side rendering, no storage anywhere.',
      'Two craft decisions do the heavy lifting. The arc is imperatively built SVG, constructed once with attribute-only updates afterward, which is why 36 controls feel instant. And color legibility is guaranteed by an inline implementation of APCA-W3 (the SA98G algorithm): it picks button text color against any user accent and progressively lightens accent-colored text until it clears perceptual contrast thresholds, solving the saturated-hue-on-dark-UI problem that WCAG 2.x luminance math gets wrong.',
    ],
    how: [
      { title: 'Imperatively built SVG arc', text: 'Constructed once, then attribute-only updates, so every slider responds instantly with no re-render of the graphic.' },
      { title: 'Inline APCA-W3 (SA98G) contrast engine', text: 'Picks button text color for any accent and lightens accent text in 5% steps until perceptual legibility thresholds pass.' },
      { title: 'Every design is a URL', text: 'The full config encodes as base64 JSON into a query param and decodes during SSR on the staged site, no storage, instantly shareable.' },
      { title: 'Five independent glow layers', text: 'Upper Far, Upper Near, Inner, Lower Near, Lower Far, each with its own color, width, blur, opacity, and vertical offset.' },
      { title: 'Choreographed motion', text: 'A timed entrance draw with staged glow fade-in, then a continuous breathing loop with speed, intensity, and drift controls.' },
      { title: 'CSS-3D showcase card', text: 'Driven by a hand-written requestAnimationFrame lerp loop, perspective and preserve-3d only, no Three.js.' },
      { title: 'A deliberately fictional fintech brand stages the work', text: 'The user’s design lights the hero, the ambient card lighting, and the closing CTA.' },
      { title: 'Deliberately few runtime dependencies', text: 'The animation system, the contrast engine, and the 3D interaction are all hand-built.' },
    ],
    built: [
      ['Front end', ['Next.js 16', 'React 19', 'TypeScript']],
      ['Graphics', ['SVG', 'CSS 3D Transforms']],
      ['Color', ['react-colorful']],
      ['Delivery', ['Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'meridian',
    sub: 'A working watch movement, built entirely in code',
    shots: [
      video('/media/work/meridian.webp', 'A still from a video of Meridian'),
      { src: '/media/work/meridian.webp', alt: 'The Meridian movement in its gold case, with its gears, bridges and blue screws, a clockwork moth perched on it, beside a card about how it runs', caption: 'The movement in its case, with the clockwork moth on it.' },
      still('photo', 2, 'A screenshot goes here: the Dissected view, with its labelled parts.'),
      still('art', 4, 'A screenshot goes here: the movement at night.'),
      still('game', 3, 'A screenshot goes here: a part’s card, from the guided tour.'),
    ],
    proved: [
      { value: '0', label: 'imported models or textures' },
      { value: '60:1', label: 'gear train, centre wheel to cage' },
      { value: '555', label: 'instances across 27 parts' },
      { value: 'Live', label: 'wind it yourself', href: 'https://meridian-calibre.vercel.app/' },
    ],
    why: [],
    what: [
      'A browser-native 3D specimen of a fictional hand-wound tourbillon, framed as a plate from a watchmaker’s reference folio. Nothing is imported. Every gear, jewel and texture, and the clockwork moth that lives on the bench, is generated in code. The mechanism runs on its own logic: real tooth counts, driven from a single beat counter. Visitors can wind it, take it apart, tour it part by part, and watch it run down.',
      'A deterministic kinematic model, not an animation. The escapement, tourbillon and gear train all derive from one integer beat counter at 8 beats per second, and the train is solved backward from the cage by real tooth counts: 60:1 from the centre wheel to the cage, 12:1 between the hands.',
      'The whole scene is procedural: 27 parts, 555 instances and 51 PBR material families, with perlage, Geneva stripes and engravings baked to canvas at load, at about a million triangles per frame. Material changes happen per fragment in custom shaders. A re-plating wave sweeps a new finish across the movement from the crown, and a terminator dissolve turns day into night.',
      'The build was spec-driven. I wrote fifteen specification documents with a 41-item acceptance list, an eight-step review ritual that gated each of twelve phases, and an override order for when rules collide. Perplexity Computer built it across those phases and seven review rounds. I then took it into Claude Code and added a hidden menu of 23 scripted camera takes, so the page can film its own commercials.',
    ],
    how: [
      { title: 'Mechanics from one beat counter', text: 'The escapement, tourbillon and gear train all follow an integer beat counter solved by real tooth counts, with no keyframes anywhere in the mechanism.' },
      { title: 'Wind it, watch it stop', text: 'Hold the crown or press W and the ratchet and click turn. The reserve drains with every beat, and at zero the balance winds down to a stop until it’s wound again.' },
      { title: 'Fully procedural', text: 'No imported models or texture images. Gears are generated from module and tooth count, and surface finishes and engravings are baked to canvas at load.' },
      { title: 'Shader-level transitions', text: 'A re-plating wave swaps Ice, Rhodium and Rose finishes per fragment across the whole movement, and day to night runs as a reversible terminator dissolve into a procedural night sky.' },
      { title: 'Take it apart', text: 'The Dissected view fans the movement out by layer with labelled leaders. Click any of 27 parts for its card, or take a six-stop guided tour.' },
      { title: 'A living companion', text: 'A procedurally modelled clockwork moth that perches on moving parts, flies, and reacts to the movement’s state, starring in a 12-second opening film where the watch assembles around it.' },
      { title: 'A page that films itself', text: 'A hidden reel menu of 23 scripted takes with a camera director, focus pulls and an on-page pointer that clicks the real controls, all frame-repeatable.' },
      { title: 'Built by an AI agent under a written spec', text: 'Fifteen documents, a 41-item acceptance list, review gates on every phase, and seven review rounds, then a Claude Code pass for filming and sharing.' },
    ],
    built: [
      ['3D', ['three.js', 'Custom GLSL Shaders']],
      ['Front end', ['JavaScript ES Modules', 'GSAP']],
      ['Built by', ['Perplexity Computer', 'Claude Code']],
      ['Delivery', ['Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'micro-interactions-library',
    sub: '15 components, zero animation libraries, built in a weekend',
    shots: [
      video('/media/work/stand-in-art-2.webp', 'A plain picture standing in for a video of the Micro-Interactions Library'),
      still('photo', 3, 'A screenshot goes here: the library’s fifteen components.'),
      still('game', 2, 'A screenshot goes here: a demo beside its code, ready to copy.'),
      still('photo', 1, 'A screenshot goes here: the command palette search.'),
    ],
    proved: [
      { value: '15', label: 'components' },
      { value: '0', label: 'animation libraries' },
      { value: '6', label: 'total dependencies' },
    ],
    why: [],
    what: [
      'A collection of 15 production-ready micro-interaction components built as a copy-paste resource for frontend developers. Every animation runs on CSS transitions or the native Web Animations API. No Framer Motion, no GSAP, no animation libraries.',
      'Animations use predominantly transform and opacity for GPU-only rendering. The entire site is statically generated with only 6 production dependencies.',
    ],
    how: [
      { title: '15 interactive demos', text: 'Live preview, syntax-highlighted code, and one-click copy.' },
      { title: 'Command palette search (Cmd+K)', text: 'Fuzzy matching across all components.' },
      { title: 'Accessibility-first', text: 'WCAG 2.1 AA, prefers-reduced-motion respected globally, built on react-aria-components.' },
      { title: 'Hydration-safe dark/light theme toggle', text: 'No flash of wrong theme.' },
    ],
    built: [
      ['Front end', ['Next.js 14', 'TypeScript', 'CSS Modules']],
      ['Motion', ['Web Animations API']],
      ['Accessibility', ['react-aria-components']],
      ['Highlighting', ['Shiki']],
      ['Delivery', ['Vercel']],
    ],
  },
  // A shoot and a 3D piece, both stand ins, so the gallery page can be judged with one of each.
  {
    kind: 'gallery',
    slug: 'photo-stand-in-1',
    sub: 'A stand in for a shoot',
    aspect: 2,
    note: [],
    shots: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => still('photo', n, `Picture ${n} of the shoot, with a line about it.`)),
  },
  {
    kind: 'gallery',
    slug: 'art-stand-in-1',
    sub: 'A stand in for a 3D piece',
    aspect: 2,
    note: [],
    built: { items: ['Blender', 'Nomad Sculpt'], standIn: true },
    shots: [
      { ...still('art', 1, 'A turntable of the piece plays here once there is one.'), slot: 'video' },
      ...[2, 3, 4, 5, 6].map((n) => still('art', n, `View ${n - 1} of the piece, with a line about it.`)),
    ],
  },
];

export const STAND_IN_WORD = STAND_IN;

// A project's page with the card it belongs to, and the projects before and after it in its own category.
export function projectOf(slug: string): { page: ProjectPage; item: WorkItem; prev: WorkItem | null; next: WorkItem | null } | null {
  const page = projects.find((p) => p.slug === slug);
  const among = catalog.find((c) => c.items.some((i) => i.slug === slug))?.items ?? [], at = among.findIndex((i) => i.slug === slug);
  if (!page || at < 0) return null;
  // The way on goes round, so a category of three or more always has a project before and one after.
  const round = among.length > 2, n = among.length;
  return { page, item: among[at], prev: among[at - 1] ?? (round ? among[n - 1] : null), next: among[at + 1] ?? (round ? among[0] : null) };
}
