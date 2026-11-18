import type { Metadata } from 'next';
import { AllWork } from '../../components/AllWork';
import { allWork } from '../../content/site-pages';
import { ALL_WORK } from '../../content/work';

export const metadata: Metadata = { title: allWork.title, description: allWork.lead, alternates: { canonical: ALL_WORK }, openGraph: { title: allWork.title, description: allWork.lead, url: ALL_WORK } };

export default function Page() {
  return <AllWork look="wall" />;
}
