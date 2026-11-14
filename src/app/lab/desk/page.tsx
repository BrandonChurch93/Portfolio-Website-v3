import type { Metadata } from 'next';
import { DeskDrafts } from '../../../components/lab/DeskDrafts';

export const metadata: Metadata = { title: 'Study 23 · The desk, a rough draft' };

export default function DeskStudy() {
  return <DeskDrafts />;
}
