// The words of the plain pages: a page that does not exist, a page that broke, and a page not built yet. Stand ins:
// his to rewrite.
export const pages = {
  missing: { label: '404', title: 'This page is not here.', note: 'The address may be mistyped, or the page may have moved.', home: 'Back to the start' },
  // The page of all his work, until it is built (his word, Nov 16: "make a placeholder all work page").
  work: { label: 'Work', title: 'All work', note: 'This page is being built. The four newest projects are on the home page, and the rest are on the current site for now.', home: 'Back to the home page', now: 'The current site' },
  broken: { label: 'Error', title: 'Something on this page broke.', note: 'It is not you. Try it again, or go back to the start.', again: 'Try again', home: 'Back to the start' },
} as const;

// The page of all his work. The lead is his live site's own line. The rest are stand ins, his to rewrite.
export const allWork = {
  title: 'All work',
  home: 'Home',
  lead: 'The full catalog. Everything here is real and running, and the list grows as I build.',
  project: 'project',
  projects: 'projects',
  standIn: 'stand in',
  standIns: 'stand ins',
  all: 'All',
  subs: 'sub categories',
  close: { line: 'Have something in mind?', button: 'Get in touch' },
} as const;

// A project's own page: the names of its parts and its ways out. Stand ins, his to rewrite.
export const projectPage = {
  back: 'All work',
  kind: 'Case study',
  parts: { what: 'What it is', why: 'Why I built it', how: 'How it works', proved: 'What it proved', built: 'Built with', gallery: 'Gallery' },
  standIn: 'Stand in',
  why: 'Not written yet. This is where the problem goes: what was missing, who it was for, and why it was worth building.',
  video: 'A video of the project plays here once there is one.',
  prev: 'Previous',
  next: 'Next',
  all: 'All work',
  shot: 'Open picture',
  close: 'Close',
} as const;
