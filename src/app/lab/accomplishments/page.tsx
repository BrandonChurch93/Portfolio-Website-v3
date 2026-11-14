import type { Metadata } from 'next';
import { Accomplishments } from '../../../components/lab/Accomplishments';

export const metadata: Metadata = { title: 'Study 19 · accomplishments' };

export default function AccomplishmentsStudy() {
  return <Accomplishments />;
}
