import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectView } from '../../../components/ProjectView';
import { projectOf, projects } from '../../../content/projects';

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = projectOf((await params).slug);
  return found ? { title: found.item.name, description: found.page.sub } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const found = projectOf((await params).slug);
  if (!found) notFound();
  return <ProjectView {...found} />;
}
