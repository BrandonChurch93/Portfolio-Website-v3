import type { Metadata } from 'next';
import { PIECES } from '../../../../config/site';
import { PieceLab } from '../../../../components/lab/PieceLab';

export const dynamicParams = false;

export function generateStaticParams() {
  return PIECES.map((name) => ({ name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `Piece · ${name}` };
}

export default async function LabPiece({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <PieceLab name={name} />;
}
