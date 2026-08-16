'use client';

import type { LucideIcon } from 'lucide-react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * Barra de abas horizontal no visual sublinhado (mesmo padrão do PeriodFilter).
 * No mobile rola na horizontal — com 5+ abas não cabe na largura da tela.
 */
export default function Tabs<T extends string>({ items, activeId, onChange, className = '' }: {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <nav
      role="tablist"
      className={`flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {items.map(item => {
        const Icon = item.icon;
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              active ? 't-accent' : 't-text-muted border-transparent hover:opacity-80'
            }`}
            style={active ? { borderBottomColor: 'var(--accent)' } : undefined}
          >
            {Icon && <Icon size={15} className="flex-shrink-0" />}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
