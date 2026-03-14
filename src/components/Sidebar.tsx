'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import type { PageId, Member } from '@/lib/types';

interface SidebarProps {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  onAddMember?: () => void;
}

const navLinks: { id: PageId; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '🏠', label: 'Início' },
  { id: 'expenses', icon: '💳', label: 'Lançamentos' },
  { id: 'analysis', icon: '📈', label: 'Análise' },
  { id: 'summary', icon: '📄', label: 'Resumo Mensal' },
  { id: 'settings', icon: '⚙', label: 'Configurações' },
];

export function Avatar({ member, size = 26 }: { member: Member; size?: number }) {
  if (member.photo) {
    return (
      <span className="rounded-full overflow-hidden flex-shrink-0 inline-flex"
        style={{ width: size, height: size, background: member.color }}>
        <img src={member.photo} alt={member.name[0]} className="w-full h-full object-cover" />
      </span>
    );
  }
  return (
    <span className="rounded-full flex items-center justify-center text-white flex-shrink-0 font-bold"
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.42 }}>
      {member.name[0].toUpperCase()}
    </span>
  );
}

export function Sidebar({ activePage, onPageChange, onAddMember }: SidebarProps) {
  const { state, setActiveMember } = useStore();
  const { members, activeMember } = state;
  const [collapsed, setCollapsed] = useState(false);

  const individuals = members.filter(m => m.id !== 'all' && !m.isConjunta);
  const conjuntas = members.filter(m => m.id !== 'all' && m.isConjunta);

  const w = collapsed ? 'w-[60px]' : 'w-60';

  return (
    <>
      <aside className={`${w} t-sidebar border-r fixed top-0 left-0 bottom-0 flex flex-col z-[100] transition-all duration-300`}>
        {/* Logo + toggle */}
        <div className="px-3 py-4 border-b t-border flex items-center justify-between">
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-bold t-accent truncate">Finanças Família</h1>
              <p className="text-[0.72rem] t-text-dim mt-0.5 truncate">Controle inteligente</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center t-text-muted hover:opacity-80 transition-colors cursor-pointer"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
            {collapsed ? '☰' : '✕'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-1.5 py-3 overflow-y-auto">
          {!collapsed && <div className="text-[0.65rem] font-semibold uppercase tracking-wider t-text-dim px-2 mb-1">Menu</div>}
          {navLinks.map(link => (
            <button key={link.id} onClick={() => onPageChange(link.id)}
              title={collapsed ? link.label : undefined}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activePage === link.id ? 't-accent-light' : 't-text hover:opacity-80'
              } ${collapsed ? 'justify-center' : ''}`}>
              <span className="w-5 text-center flex-shrink-0">{link.icon}</span>
              {!collapsed && <span className="truncate">{link.label}</span>}
            </button>
          ))}
        </nav>

        {/* Members */}
        <div className="px-1.5 pb-3 border-t t-border pt-3">
          {!collapsed && <div className="text-[0.65rem] font-semibold uppercase tracking-wider t-text-dim px-2 mb-1.5">Membros</div>}

          {/* Família (todos) */}
          <button onClick={() => setActiveMember('all')}
            title={collapsed ? 'Família (todos)' : undefined}
            className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[0.82rem] font-medium transition-colors text-left cursor-pointer ${
              activeMember === 'all' ? 't-accent-light' : 't-text hover:opacity-80'
            } ${collapsed ? 'justify-center' : ''}`}>
            <span className="rounded-full flex items-center justify-center text-white flex-shrink-0 font-bold"
              style={{ width: 26, height: 26, background: '#2563eb', fontSize: 11 }}>F</span>
            {!collapsed && <span className="truncate">Família (todos)</span>}
          </button>

          {/* Individual members */}
          {individuals.map(m => (
            <button key={m.id} onClick={() => setActiveMember(m.id)}
              title={collapsed ? m.name : undefined}
              className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[0.82rem] font-medium transition-colors text-left cursor-pointer ${
                activeMember === m.id ? 't-accent-light' : 't-text hover:opacity-80'
              } ${collapsed ? 'justify-center' : ''}`}>
              <Avatar member={m} size={26} />
              {!collapsed && <span className="truncate">{m.name}</span>}
            </button>
          ))}

          {/* Conjunta members */}
          {conjuntas.length > 0 && (
            <>
              {!collapsed && <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400 px-2.5 mt-2 mb-1">Contas Conjuntas</div>}
              {conjuntas.map(m => (
                <button key={m.id} onClick={() => setActiveMember(m.id)}
                  title={collapsed ? m.name : undefined}
                  className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[0.82rem] font-medium transition-colors text-left cursor-pointer ${
                    activeMember === m.id ? 't-accent-light' : 't-text hover:opacity-80'
                  } ${collapsed ? 'justify-center' : ''}`}>
                  <Avatar member={m} size={26} />
                  {!collapsed && (
                    <>
                      <span className="truncate">{m.name}</span>
                      <span className="bg-amber-50 text-amber-700 text-[0.62rem] px-1.5 py-px rounded-full ml-0.5 flex-shrink-0">conjunta</span>
                    </>
                  )}
                </button>
              ))}
            </>
          )}

          {/* Add member */}
          {onAddMember && (
            <button onClick={onAddMember}
              title={collapsed ? 'Adicionar membro' : undefined}
              className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-sm text-slate-400 border border-dashed t-border mt-1 hover:opacity-80 transition-colors cursor-pointer ${collapsed ? 'justify-center' : ''}`}>
              <span className="flex-shrink-0">+</span>
              {!collapsed && <span>Adicionar membro</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Spacer to push content - matches sidebar width */}
      <div className={`${w} flex-shrink-0 transition-all duration-300`} />
    </>
  );
}
