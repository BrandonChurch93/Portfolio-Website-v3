// The words of the plain pages: a page that does not exist, a page that broke, and a page not built yet. Stand ins:
// his to rewrite.
export const pages = {
  missing: { label: '404', title: 'This page is not here.', note: 'The address may be mistyped, or the page may have moved.', home: 'Back to the start' },
  // The page of all his work, until it is built (his word, Nov 16: "make a placeholder all work page").
  work: { label: 'Work', title: 'All work', note: 'This page is being built. The four newest projects are on the home page, and the rest are on the current site for now.', home: 'Back to the home page', now: 'The current site' },
  broken: { label: 'Error', title: 'Something on this page broke.', note: 'It is not you. Try it again, or go back to the start.', again: 'Try again', home: 'Back to the start' },
} as const;
