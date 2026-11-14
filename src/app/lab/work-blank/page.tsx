import type { Metadata } from 'next';
import { WorkBlank } from '../../../components/lab/WorkBlank';

export const metadata: Metadata = { title: 'Study 20 · the blank' };

export default function WorkBlankStudy() {
  return <WorkBlank />;
}
