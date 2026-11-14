// The words on the fuller draft of Skills and About. He rewrites the copy himself, so nothing here is drafted.
// Each skill set's name is his live site's (brandon-church-portfolio: app/data/competencies.js). He cut the fourth,
// Product Leadership, which the résumé and the accomplishments section say better. He cut the line
// under each name and the sentence beside it. The lists start from the Skills section of the résumé he shared on
// Nov 14, in its own words, and are cut to the big ones as he asked: which stay is Fable's first cut and his to
// change. The game development group is new, from what he has said of his game work, and his to correct.
// About's paragraphs are the live site's (app/components/AboutSection.jsx), kept as a placeholder until he writes
// the two tabs. Two claims in them are down for correction in BRIEF.md, Words: the years and the clients.

export interface Competency { name: string; groups: [label: string, items: string[]][] }

export const COMPETENCIES: Competency[] = [
  {
    name: 'AI Product Engineering',
    groups: [
      ['AI Engineering', ['Claude Code', 'Claude API', 'OpenAI API', 'RAG', 'AI Agents', 'Tool Use', 'Model Orchestration', 'LangGraph', 'MCP', 'Prompt Engineering']],
      ['AI Evaluation & Safety', ['LLM Evaluation', 'Eval Harnesses', 'LLM-as-Judge', 'Rubric Design', 'AI Red Teaming', 'Guardrails', 'Human-in-the-Loop Evaluation']],
    ],
  },
  {
    name: 'Full-Stack Engineering',
    groups: [
      ['Full Stack', ['React', 'TypeScript', 'Next.js', 'Node.js', 'Python', 'FastAPI', 'SQL', 'Supabase', 'AWS', 'Docker', 'CI/CD', 'Playwright']],
      ['Game Development', ['Unreal Engine', 'Unity', 'C++', 'C#', 'Three.js', 'Blender']],
    ],
  },
  {
    name: 'Design Systems & Craft',
    groups: [
      ['Frontend & Design', ['Angular', 'Tailwind CSS', 'Design Systems', 'Design Tokens', 'GSAP', 'Figma', 'Prototyping in Code', 'UI/UX Design', 'User Research', 'Usability Testing']],
      ['Accessibility', ['WCAG 2.2', 'Section 508', 'ARIA', 'Screen Reader Testing', 'Auditing & Remediation']],
    ],
  },
];

// The live site's About is one block of four paragraphs under "How I got here". He wants two tabs, so the paragraphs
// are dealt out between them as they stand, as a placeholder. Which paragraph sits under which tab is Fable's call.
export const ABOUT_TABS: { name: string; text: string[] }[] = [
  {
    name: 'Professional',
    text: [
      'What I do about it: design and build products end to end, held to a standard most software skips. The problem has to be real, the solution has to feel effortless for the person on the other side, and the whole thing has to be done with taste. Taste never shows up in a spec, but it’s the difference between software that works and software people actually want to use.',
      'Twelve years of that standard looks like career portals for Fortune 500 companies, a federal system tracking $43 billion in goods, and a studio I founded that serves 40+ clients, every one of those products accessible to everyone.',
    ],
  },
  {
    name: 'Personal',
    text: [
      'I’m driven by scientific discovery, human prosperity, and problems at every scale. Some span a federal supply chain. Some fit on a desk. If solving it leaves people better off, I’m interested.',
      'Now the problems I can’t put down run through AI. I ship AI products end to end, and after hours I build machines: desk robots that talk back, a rover that roams my house. That’s what’s next, putting AI to work on real problems, in software and in the physical world.',
    ],
  },
];
