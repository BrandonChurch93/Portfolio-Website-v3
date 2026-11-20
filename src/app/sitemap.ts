import type { MetadataRoute } from 'next';
import { SITE_URL } from '../config/site';
import { projects, standsIn } from '../content/projects';
import { ALL_WORK } from '../content/work';

// Every page a visitor is meant to find: the home page, the page of all his work, and each real project's own. A
// stand in's page is left out.
export default function sitemap(): MetadataRoute.Sitemap {
  const real = projects.filter((p) => !standsIn(p.slug));
  return ['/', ALL_WORK, ...real.map((p) => `${ALL_WORK}/${p.slug}`)].map((path) => ({ url: `${SITE_URL}${path === '/' ? '' : path}` }));
}
