import { hero } from '../content/hero';
import { SITE_NAME } from './site';
import { STILLS } from './stills';

// What a shared link shows: his own first paragraph and a picture of the hero's first screen. The words are his to
// approve. A page that says anything of its own about a shared link starts from these and changes what differs:
// Next replaces a page's whole block with the page's own, so a page that named only its address lost the picture,
// the site's name and the kind (the home page and All work did, until Nov 20).
const SHOT = STILLS.share;
const PICTURE = { url: SHOT.file, width: SHOT.keep.w, height: SHOT.keep.h, alt: `${hero.name}, ${hero.role}` };

export const SHARE = {
  openGraph: { type: 'website' as const, siteName: SITE_NAME, title: SITE_NAME, description: hero.lead, locale: 'en_US', images: [PICTURE] },
  twitter: { card: 'summary_large_image' as const, title: SITE_NAME, description: hero.lead, images: [SHOT.file] },
};
