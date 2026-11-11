import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/sora';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '../styles/tokens.css';
import '../styles/global.css';
import { paletteVars } from '../config/palette';
import { COLORS, SITE_NAME } from '../config/site';
import { Runtime } from '../components/Runtime';

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
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
