import type { Metadata } from 'next';
import { AllWork } from '../../components/AllWork';
import { SHARE } from '../../config/share';
import { SITE_NAME } from '../../config/site';
import { allWork } from '../../content/site-pages';
import { ALL_WORK } from '../../content/work';

const TITLE = `${allWork.title} · ${SITE_NAME}`;
export const metadata: Metadata = {
  title: allWork.title,
  description: allWork.lead,
  alternates: { canonical: ALL_WORK },
  openGraph: { ...SHARE.openGraph, title: TITLE, description: allWork.lead, url: ALL_WORK },
  twitter: { ...SHARE.twitter, title: TITLE, description: allWork.lead },
};

export default function Page() {
  return <AllWork look="wall" />;
}
