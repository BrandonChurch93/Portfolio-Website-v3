// The words on the fuller draft of Skills and About. Every line is his live site's, as it stands there
// (brandon-church-portfolio: app/data/competencies.js and app/components/AboutSection.jsx). He rewrites the copy
// himself, so nothing here is drafted. Two claims in the third paragraph are down for correction in BRIEF.md, Words:
// the years and the clients.

export interface Competency { name: string; claim: string; proof: string; groups: [label: string, items: string[]][] }

export const COMPETENCIES: Competency[] = [
  {
    name: 'AI Product Engineering',
    claim: 'AI products that prove their answers.',
    proof: 'If a model is in the product, it gets measured. After hours, the same obsession in hardware.',
    groups: [
      ['Building', ['Claude Code', 'LLM APIs', 'RAG · hybrid search & re-ranking', 'LangGraph', 'MCP', 'Multi-agent orchestration', 'Context engineering', 'Guardrails & structured outputs']],
      ['Proving', ['Eval frameworks', 'LLM-as-judge', 'Human-in-the-loop QA', 'AI observability', 'CI-gated evals']],
    ],
  },
  {
    name: 'Full-Stack Engineering',
    claim: 'Frontend led. Full stack shipped.',
    proof: 'A decade deep on the front. Behind it, a backend that holds up at federal scale.',
    groups: [
      ['Frontend', ['React', 'Next.js', 'Angular', 'TypeScript', 'Advanced CSS', 'Three.js', 'Performance']],
      ['Backend & Data', ['Node', 'Python', 'PostgreSQL', 'Data pipelines']],
      ['Platforms & Testing', ['Vercel', 'AWS', 'CI/CD', 'Automated testing']],
    ],
  },
  {
    name: 'Design Systems & Craft',
    claim: 'I make products feel inevitable.',
    proof: 'Tokens to components to motion, built from scratch and built for teams to ship on.',
    groups: [
      ['Design & Systems', ['Figma', 'UI/UX design', 'Information architecture', 'Typography & layout', 'Motion design', 'User research', 'Design tokens', 'Component libraries']],
      ['Accessibility', ['WCAG 2.2 & Section 508', 'ARIA', 'Screen reader testing', 'Auditing & remediation']],
    ],
  },
  {
    name: 'Product Leadership',
    claim: 'The role changes. The standard doesn’t.',
    proof: 'VP of Product, studio founder, Director roles across federal and Fortune 500.',
    groups: [
      ['Leading', ['Product strategy', 'Workshop facilitation', 'Stakeholder management', 'Cross-functional leadership', 'Hiring & mentorship']],
      ['Delivering', ['Zero-to-one launches', 'Federal & enterprise compliance', 'Training & enablement']],
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
