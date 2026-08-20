import AppRoot from '@/components/AppRoot';
import { pageForSegments } from '@/lib/navigation';

// /agenda, /agenda/convites — slug ausente ou desconhecido cai na 1ª aba.
export default async function Page({ params }: { params: Promise<{ tab?: string[] }> }) {
  const { tab } = await params;
  return <AppRoot initialPage={pageForSegments('agenda', tab?.[0])} />;
}
