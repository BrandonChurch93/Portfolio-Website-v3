import type { MetadataRoute } from 'next';
import { SITE_URL } from '../config/site';
import { projects } from '../content/projects';
import { ALL_WORK } from '../content/work';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', ALL_WORK, ...projects.map((p) => `${ALL_WORK}/${p.slug}`)].map((path) => ({ url: `${SITE_URL}${path === '/' ? '' : path}` }));
}
