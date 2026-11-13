import type { Metadata } from 'next';
import { WorkCards } from '../../../components/lab/WorkCards';

export const metadata: Metadata = { title: 'Study 14 · the card' };

export default function WorkCardsStudy() {
  return <WorkCards />;
}
