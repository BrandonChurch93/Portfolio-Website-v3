// What the hero says. The line, his name and the paragraph are his own, as he sent them. The buttons' words and
// the preloader's word are stand ins.
export const hero = {
  role: 'Product Engineer · Designer',
  name: 'Brandon Church',
  lead: 'I take products from the first client conversation all the way to production. I’m the person clients trust to own the outcome, not just hand over the artifacts.',
  // No button here moves a visitor down this page (his ruling, Nov 16). One goes to the page of all his work, the
  // other is his résumé, which is held back until he sends a copy without his phone number.
  work: { label: 'View all work', href: '/work' },
  resume: { label: 'Download résumé', href: '/downloads/BrandonChurch-Resume.pdf', held: true as boolean },
  // What the preloader says while the first screen is made ready. A stand in: his to rewrite.
  loading: 'Loading',
} as const;
