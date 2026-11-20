import type { Metadata } from 'next';
import { WholeLab } from '../components/lab/WholeLab';
import { SHARE } from '../config/share';
import { SITE_NAME } from '../config/site';

export const metadata: Metadata = { title: { absolute: SITE_NAME }, alternates: { canonical: '/' }, openGraph: { ...SHARE.openGraph, url: '/' } };

// The home page: the hero, Work, Skills and About, and Contact on one page with one stream.
export default function Home() {
  return <WholeLab />;
}
