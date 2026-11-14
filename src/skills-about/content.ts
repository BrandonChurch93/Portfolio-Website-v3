// The words on the fuller draft of Skills and About. He rewrites the copy himself, so nothing here is drafted.
// Each skill set's name, the line under it and its sentence are his live site's, as they stand there
// (brandon-church-portfolio: app/data/competencies.js). The lists under them are the Skills section of the résumé he
// shared on Nov 14, word for word, since the live site's lists are out of date: its six groups under his four skill
// sets, which group goes under which being Fable's call. About's paragraphs are the live site's
// (app/components/AboutSection.jsx). Two claims in its third paragraph are down for correction in BRIEF.md, Words:
// the years and the clients.

export interface Competency { name: string; claim: string; proof: string; groups: [label: string, items: string[]][] }

export const COMPETENCIES: Competency[] = [
  {
    name: 'AI Product Engineering',
    claim: 'AI products that prove their answers.',
    proof: 'If a model is in the product, it gets measured. After hours, the same obsession in hardware.',
    groups: [
      ['AI Engineering', ['Claude Code', 'Claude API', 'OpenAI API', 'Amazon Bedrock', 'Generative AI', 'LLMs', 'RAG', 'Vector Databases (pgvector)', 'AI Agents', 'Agentic AI', 'Tool Use', 'Model Orchestration', 'LangGraph', 'LangChain', 'MCP', 'Prompt Engineering']],
      ['AI Evaluation & Safety', ['LLM Evaluation', 'Eval Harnesses', 'Golden Question Sets', 'LLM-as-Judge', 'Rubric Design', 'Agent Trajectory Review', 'AI Red Teaming', 'Guardrails', 'Human-in-the-Loop Evaluation', 'Spend and Rate Limits']],
    ],
  },
  {
    name: 'Full-Stack Engineering',
    claim: 'Frontend led. Full stack shipped.',
    proof: 'A decade deep on the front. Behind it, a backend that holds up at federal scale.',
    groups: [
      ['Full Stack', ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Node.js', 'Express', 'Python', 'FastAPI', 'REST', 'SQL (PostgreSQL, SQL Server)', 'Supabase', 'AWS', 'Docker', 'GitHub Actions', 'CI/CD', 'Nx and pnpm Monorepos', 'Playwright', 'ServiceNow']],
    ],
  },
  {
    name: 'Design Systems & Craft',
    claim: 'I make products feel inevitable.',
    proof: 'Tokens to components to motion, built from scratch and built for teams to ship on.',
    groups: [
      ['Frontend & Design', ['Angular', 'HTML5', 'CSS3', 'Tailwind CSS', 'Design Tokens', 'Micro-Frontends', 'Core Web Vitals', 'GSAP', 'Figma', 'Claude Design', 'Prototyping in Code', 'Design Systems', 'UI/UX Design', 'User Research', 'Usability Testing']],
      ['Accessibility', ['WCAG 2.2', 'Section 508', 'ARIA', 'Screen Reader Testing', 'axe', 'Auditing & Remediation', 'VPAT']],
    ],
  },
  {
    name: 'Product Leadership',
    claim: 'The role changes. The standard doesn’t.',
    proof: 'VP of Product, studio founder, Director roles across federal and Fortune 500.',
    groups: [
      ['Client & Product', ['Requirements Gathering', 'Discovery', 'Proofs of Concept', 'Solutions Engineering', 'Stakeholder Management', 'Demos & UAT', 'User Training', 'Product Strategy', 'Roadmaps', 'User Stories', 'Cross-Functional Leadership']],
    ],
  },
];

// The live site's About is one block of four paragraphs under "How I got here". The brief asks for three tabs, so
// the paragraphs are dealt out between them as they stand. Which paragraph sits under which tab is Fable's call.
export const ABOUT_TABS: { name: string; text: string[] }[] = [
  {
    name: 'About me',
    text: [
      'What I do about it: design and build products end to end, held to a standard most software skips. The problem has to be real, the solution has to feel effortless for the person on the other side, and the whole thing has to be done with taste. Taste never shows up in a spec, but it’s the difference between software that works and software people actually want to use.',
      'Twelve years of that standard looks like career portals for Fortune 500 companies, a federal system tracking $43 billion in goods, and a studio I founded that serves 40+ clients, every one of those products accessible to everyone.',
    ],
  },
  {
    name: 'What I want to do',
    text: ['I’m driven by scientific discovery, human prosperity, and problems at every scale. Some span a federal supply chain. Some fit on a desk. If solving it leaves people better off, I’m interested.'],
  },
  {
    name: 'My plans for the future',
    text: ['Now the problems I can’t put down run through AI. I ship AI products end to end, and after hours I build machines: desk robots that talk back, a rover that roams my house. That’s what’s next, putting AI to work on real problems, in software and in the physical world.'],
  },
];
