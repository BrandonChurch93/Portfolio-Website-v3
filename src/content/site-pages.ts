// The words of the plain pages: a page that does not exist, a page that broke, and a page not built yet. Stand ins:
// his to rewrite.
export const pages = {
  missing: { label: '404', title: 'This page is not here.', note: 'The address may be mistyped, or the page may have moved.', home: 'Back to the start' },
  // The page of all his work, until it is built (his word, Nov 16: "make a placeholder all work page").
  work: { label: 'Work', title: 'All work', note: 'This page is being built. The four newest projects are on the home page, and the rest are on the current site for now.', home: 'Back to the home page', now: 'The current site' },
  broken: { label: 'Error', title: 'Something on this page broke.', note: 'It is not you. Try it again, or go back to the start.', again: 'Try again', home: 'Back to the start' },
} as const;

// The navigation: his name, which is the hero's own, and one link. On the page of all his work the link goes home.
export const nav = { label: 'Site', work: 'All work', home: 'Home', skip: 'Skip to content' } as const;

// The foot of every page: the names of its two groups of links and its way back up. Stand ins, his to rewrite.
export const foot = { site: 'Site', elsewhere: 'Elsewhere', contact: 'Contact', top: 'Back to top' } as const;

// The page of all his work. The lead is his live site's own line. The rest are stand ins, his to rewrite.
export const allWork = {
  title: 'All work',
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
  parts: { why: 'Why I built this', what: 'What this is', how: 'How it works', built: 'Built with', note: 'About it' },
  standIn: 'Stand in',
  why: 'Not written yet. This is where the reason goes: what was missing, who it was for, and what his part in it was.',
  note: 'Not written yet. This is where his words go: what this was, what he was after, and the one thing in it worth a closer look.',
  more: (n: number) => `Show all ${n}`,
  fewer: 'Show fewer',
  prev: 'Previous',
  next: 'Next',
  all: 'All work',
  open: 'Open large',
  close: 'Close',
  video: 'Video',
  picture: 'Picture',
} as const;
