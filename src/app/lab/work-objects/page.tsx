import type { Metadata } from 'next';
import { WorkObjects } from '../../../components/lab/WorkObjects';

export const metadata: Metadata = { title: 'Study 10 · the things the stream meets in Work' };

export default function WorkObjectsStudy() {
  return <WorkObjects />;
}
