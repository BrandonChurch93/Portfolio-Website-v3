import type { Metadata } from 'next';
import { ContactLab } from '../../../components/lab/ContactLab';

export const metadata: Metadata = { title: 'Contact' };

export default function LabContact() {
  return <ContactLab />;
}
