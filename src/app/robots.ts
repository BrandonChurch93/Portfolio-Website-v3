import type { MetadataRoute } from 'next';
import { LAUNCHED, SITE_URL } from '../config/site';

// Until the site is launched nothing is to be crawled. After it, everything but the studies.
export default function robots(): MetadataRoute.Robots {
  return LAUNCHED
    ? { rules: { userAgent: '*', allow: '/', disallow: '/lab/' }, sitemap: `${SITE_URL}/sitemap.xml` }
    : { rules: { userAgent: '*', disallow: '/' } };
}
