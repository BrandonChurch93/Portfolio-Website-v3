import type { Metadata } from 'next';
import { SkyLab } from '../../../components/lab/SkyLab';

export const metadata: Metadata = { title: 'The night sky' };

export default function LabSky() {
  return <SkyLab />;
}
