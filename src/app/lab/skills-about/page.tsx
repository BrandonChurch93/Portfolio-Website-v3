import type { Metadata } from 'next';
import { SkillsAbout } from '../../../components/lab/SkillsAbout';

export const metadata: Metadata = { title: 'Study 21 · Skills and About' };

export default function SkillsAboutStudy() {
  return <SkillsAbout />;
}
