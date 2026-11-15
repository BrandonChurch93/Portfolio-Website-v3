import type { Metadata } from 'next';
import { HeroLab } from '../../../components/lab/HeroLab';

export const metadata: Metadata = { title: 'The hero' };

export default function LabHero() {
  return <HeroLab />;
}
