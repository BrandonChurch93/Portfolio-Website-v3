import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// The studies are for him and for the work, never for a search engine.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LabLayout({ children }: { children: ReactNode }) {
  return children;
}
