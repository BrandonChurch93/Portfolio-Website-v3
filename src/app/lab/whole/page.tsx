import type { Metadata } from 'next';
import { WholeLab } from '../../../components/lab/WholeLab';

export const metadata: Metadata = { title: 'The whole page so far' };

export default function LabWhole() {
  return <WholeLab />;
}
