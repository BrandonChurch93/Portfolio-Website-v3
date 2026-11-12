import type { Metadata } from 'next';
import { StreamCore } from '../../../components/lab/StreamCore';

export const metadata: Metadata = { title: 'Study 06 · a core with shards' };

export default function StreamCoreStudy() {
  return <StreamCore />;
}
