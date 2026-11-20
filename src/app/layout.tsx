import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/sora';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '../styles/tokens.css';
import '../styles/global.css';
import { paletteVars } from '../config/palette';
import { COLORS, LAUNCHED, SITE_NAME, SITE_URL } from '../config/site';
import { SHARE } from '../config/share';
import { hero } from '../content/hero';
import { Runtime } from '../components/Runtime';

// What a shared link shows is in src/config/share.ts. Nothing is indexed until he says the site is launched
// (LAUNCHED in src/config/site.ts).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: hero.lead,
  openGraph: SHARE.openGraph,
  twitter: SHARE.twitter,
  robots: LAUNCHED ? undefined : { index: false },
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
