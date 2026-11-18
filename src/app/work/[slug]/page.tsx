import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectView } from '../../../components/ProjectView';
import { projectOf, projects } from '../../../content/projects';
import { ALL_WORK } from '../../../content/work';

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = projectOf((await params).slug);
  if (!found) return {};
  const { item, page } = found, url = `${ALL_WORK}/${page.slug}`, images = [{ url: item.picture.src, alt: item.picture.alt }];
  return {
    title: item.name,
    description: page.sub,
    alternates: { canonical: url },
    openGraph: { title: item.name, description: page.sub, url, images },
    twitter: { card: 'summary_large_image', title: item.name, description: page.sub, images: [item.picture.src] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const found = projectOf((await params).slug);
  if (!found) notFound();
  return <ProjectView {...found} />;
}
