import type { MetadataRoute } from 'next';
import { COLORS, SITE_NAME } from '../config/site';

export default function manifest(): MetadataRoute.Manifest {
  return { name: SITE_NAME, short_name: SITE_NAME, start_url: '/', display: 'browser', background_color: COLORS.bg, theme_color: COLORS.bg, icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' }] };
}
