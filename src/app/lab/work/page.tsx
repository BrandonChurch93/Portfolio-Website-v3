import type { Metadata } from 'next';
import { WorkLab } from '../../../components/lab/WorkLab';

export const metadata: Metadata = { title: 'Study 10 · the stream through Work' };

export default function WorkStudy() {
  return <WorkLab />;
}
