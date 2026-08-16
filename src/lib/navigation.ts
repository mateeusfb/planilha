import { Home, Wallet, CreditCard, ClipboardCheck, BarChart3, Target, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PageId } from './types';

/**
 * Fonte única da navegação do app.
 *
 * A sidebar lista **áreas**; as sub-telas de cada área viram abas horizontais no topo
 * do conteúdo. Adicionar uma área nova (projetos, calendário, tarefas…) é acrescentar
 * uma entrada em `AREAS` — a sidebar, o título do topbar e as URLs saem daqui.
 */

export interface AreaTab {
  page: PageId;
  /** Segmento da URL depois da área. Vazio = a própria raiz da área. */
  slug: string;
  label: string;
  icon: LucideIcon;
}

export interface Area {
  id: string;
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Uma aba só = área de tela única: a barra de abas não é renderizada. */
  tabs: AreaTab[];
}

export const AREAS: Area[] = [
  {
    id: 'inicio',
    slug: 'inicio',
    label: 'Início',
    icon: Home,
    tabs: [
      { page: 'dashboard', slug: '', label: 'Início', icon: Home },
    ],
  },
  {
    id: 'financeiro',
    slug: 'financeiro',
    label: 'Financeiro',
    icon: Wallet,
    tabs: [
      { page: 'expenses', slug: 'lancamentos', label: 'Lançamentos', icon: CreditCard },
      { page: 'closing', slug: 'fechamento', label: 'Fechamento', icon: ClipboardCheck },
      { page: 'analysis', slug: 'analise', label: 'Análise', icon: BarChart3 },
      { page: 'budget', slug: 'orcamento', label: 'Orçamento', icon: Target },
      { page: 'investments', slug: 'investimentos', label: 'Investimentos', icon: TrendingUp },
    ],
  },
];

/** Telas de sistema: têm URL, mas não aparecem na sidebar (acesso pelo menu do usuário). */
export const SYSTEM_PAGES: Record<'profile' | 'settings', { path: string; title: string }> = {
  profile: { path: '/perfil', title: 'Meu Perfil' },
  settings: { path: '/configuracoes', title: 'Configurações' },
};

function isSystemPage(page: PageId): page is 'profile' | 'settings' {
  return page === 'profile' || page === 'settings';
}

/** Área que contém a página — é ela que fica destacada na sidebar. */
export function areaForPage(page: PageId): Area | null {
  return AREAS.find(a => a.tabs.some(t => t.page === page)) ?? null;
}

export function tabForPage(page: PageId): AreaTab | null {
  for (const area of AREAS) {
    const tab = area.tabs.find(t => t.page === page);
    if (tab) return tab;
  }
  return null;
}

/** Página que abre ao clicar na área na sidebar: sempre a primeira aba. */
export function homePageOf(area: Area): PageId {
  return area.tabs[0].page;
}

export function pathForPage(page: PageId): string {
  if (isSystemPage(page)) return SYSTEM_PAGES[page].path;
  const area = areaForPage(page);
  if (!area) return '/';
  const tab = area.tabs.find(t => t.page === page)!;
  return tab.slug ? `/${area.slug}/${tab.slug}` : `/${area.slug}`;
}

/**
 * Resolve os segmentos da URL para uma página.
 * Área desconhecida cai no início; aba desconhecida cai na primeira aba da área.
 */
export function pageForSegments(areaSlug?: string, tabSlug?: string): PageId {
  for (const key of ['profile', 'settings'] as const) {
    if (SYSTEM_PAGES[key].path === `/${areaSlug}`) return key;
  }
  const area = AREAS.find(a => a.slug === areaSlug);
  if (!area) return 'dashboard';
  const tab = area.tabs.find(t => t.slug === (tabSlug ?? ''));
  return tab ? tab.page : homePageOf(area);
}

export function pageForPath(pathname: string): PageId {
  const [areaSlug, tabSlug] = pathname.split('/').filter(Boolean);
  return pageForSegments(areaSlug, tabSlug);
}

/** Título do topbar: o nome da área (as abas ficam logo abaixo dele). */
export function titleForPage(page: PageId): string {
  if (isSystemPage(page)) return SYSTEM_PAGES[page].title;
  return areaForPage(page)?.label ?? 'Início';
}
