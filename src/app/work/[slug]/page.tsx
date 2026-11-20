import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectView } from '../../../components/ProjectView';
import { SHARE } from '../../../config/share';
import { SITE_NAME } from '../../../config/site';
import { projectOf, projects, standsIn } from '../../../content/projects';
import { ALL_WORK } from '../../../content/work';

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = projectOf((await params).slug);
  if (!found) return {};
  const { item, page } = found, url = `${ALL_WORK}/${page.slug}`, images = [{ url: item.picture.src, alt: item.picture.alt }];
  const title = `${item.name} · ${SITE_NAME}`;
  return {
    title: item.name,
    description: page.sub,
    alternates: { canonical: url },
    // A stand in's page is for judging the layout, and is never for a search engine.
    robots: standsIn(page.slug) ? { index: false } : undefined,
    openGraph: { ...SHARE.openGraph, title, description: page.sub, url, images },
    twitter: { ...SHARE.twitter, title, description: page.sub, images: [item.picture.src] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const found = projectOf((await params).slug);
  if (!found) notFound();
  return <ProjectView {...found} />;
}
