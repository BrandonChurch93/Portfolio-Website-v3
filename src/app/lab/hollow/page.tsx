import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'The hollow as pictures lit by the page' };

// A proof put to him on Nov 25 (LOG.md): the whole page, with the torn rock as pictures of the one view the world
// is seen from, lit by the page (src/pieces/world/parts/rock/pictured.ts). It is the whole page with ?rock=p, and
// this is only its address. Whatever else is asked for is handed on: ?lamp=1 puts the cursor's light on the rock.
export default async function LabHollow({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = new URLSearchParams({ rock: 'p' });
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === 'string' && k !== 'rock') q.set(k, v);
  redirect(`/lab/whole?${q}`);
}
