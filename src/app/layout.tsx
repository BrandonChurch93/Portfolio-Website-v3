import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/sora';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '../styles/tokens.css';
import '../styles/global.css';
import { paletteVars } from '../config/palette';
import { COLORS, SITE_NAME, SITE_URL } from '../config/site';
import { STILLS } from '../config/stills';
import { hero } from '../content/hero';
import { Runtime } from '../components/Runtime';

// What a shared link shows: his own first paragraph and a picture of the hero's first screen. The words are his to
// approve. Nothing is indexed until the real page is at the root and he says so.
const SHARE = STILLS.share;
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: hero.lead,
  openGraph: { type: 'website', siteName: SITE_NAME, title: SITE_NAME, description: hero.lead, locale: 'en_US', images: [{ url: SHARE.file, width: SHARE.keep.w, height: SHARE.keep.h, alt: `${hero.name}, ${hero.role}` }] },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: hero.lead, images: [SHARE.file] },
  robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: COLORS.bg,
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={paletteVars as CSSProperties}>
      <body>
        {children}
        <Runtime />
      </body>
    </html>
  );
}
