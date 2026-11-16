// The words of the pages a visitor is not meant to see: a page that does not exist, and a page that broke. Stand ins:
// his to rewrite.
export const pages = {
  missing: { label: '404', title: 'This page is not here.', note: 'The address may be mistyped, or the page may have moved.', home: 'Back to the start' },
  broken: { label: 'Error', title: 'Something on this page broke.', note: 'It is not you. Try it again, or go back to the start.', again: 'Try again', home: 'Back to the start' },
} as const;
