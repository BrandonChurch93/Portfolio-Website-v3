import type { Metadata } from 'next';
import { AllWork } from '../../components/AllWork';
import { allWork } from '../../content/site-pages';

export const metadata: Metadata = { title: allWork.title };

export default function Page() {
  return <AllWork />;
}
