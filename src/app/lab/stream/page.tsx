import type { Metadata } from 'next';
import { StreamLab } from '../../../components/lab/StreamLab';

export const metadata: Metadata = { title: 'Study 07 · the stream' };

export default function StreamStudy() {
  return <StreamLab />;
}
