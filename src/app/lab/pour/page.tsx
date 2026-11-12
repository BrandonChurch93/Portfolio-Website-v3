import type { Metadata } from 'next';
import { PourLab } from '../../../components/lab/PourLab';

export const metadata: Metadata = { title: 'Study 03 · the pour' };

export default function PourStudy() {
  return <PourLab />;
}
