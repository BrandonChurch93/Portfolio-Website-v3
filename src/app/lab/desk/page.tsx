import type { Metadata } from 'next';
import { DeskDrafts } from '../../../components/lab/DeskDrafts';

export const metadata: Metadata = { title: 'Study 23 · Three rough desks' };

export default function DeskStudy() {
  return <DeskDrafts />;
}
