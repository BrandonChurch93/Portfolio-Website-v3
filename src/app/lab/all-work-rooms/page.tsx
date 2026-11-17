import type { Metadata } from 'next';
import { AllWorkRooms } from '../../../components/lab/AllWorkRooms';

export const metadata: Metadata = { title: 'Study 33 · rooms for the All work page' };

export default function Page() {
  return <AllWorkRooms />;
}
