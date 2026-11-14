import type { Metadata } from 'next';
import { SkillsLab } from '../../../components/lab/SkillsLab';

export const metadata: Metadata = { title: 'Skills and About' };

export default function LabSkills() {
  return <SkillsLab />;
}
