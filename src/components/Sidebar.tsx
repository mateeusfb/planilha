'use client';

import { useStore } from '@/lib/store';
import type { PageId, Member } from '@/lib/types';

interface SidebarProps {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  onAddMember?: () => void;
}

const navLinks: { id: PageId; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '◉', label: 'Dashboard' },
  { id: 'expenses', icon: '💳', label: 'Lancamentos' },
  { id: 'analysis', icon: '📈', label: 'Analise' },
  { id: 'summary', icon: '📄', label: 'Resumo Mensal' },
  { id: 'settings', icon: '⚙', label: 'Configuracoes' },
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

  const individuals = members.filter(m => m.id !== 'all' && !m.isConjunta);
  const conjuntas = members.filter(m => m.id !== 'all' && m.isConjunta);

  return (
    <aside className="w-60 bg-white border-r border-slate-200 fixed top-0 left-0 bottom-0 flex flex-col z-[100]">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-200">
        <h1 className="text-base font-bold text-blue-600">Financas Familia</h1>
        <p className="text-[0.72rem] text-slate-400 mt-0.5">Controle inteligente de gastos</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">Menu</div>
        {navLinks.map(link => (
          <button key={link.id} onClick={() => onPageChange(link.id)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activePage === link.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
            }`}>
            <span className="w-5 text-center">{link.icon}</span>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      {/* Members */}
      <div className="px-2 pb-3 border-t border-slate-200 pt-3">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1.5">Membros</div>

        {/* Familia (todos) */}
        <button onClick={() => setActiveMember('all')}
          className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[0.82rem] font-medium transition-colors text-left cursor-pointer ${
            activeMember === 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
          }`}>
          <span className="rounded-full flex items-center justify-center text-white flex-shrink-0 font-bold"
            style={{ width: 26, height: 26, background: '#2563eb', fontSize: 11 }}>F</span>
          <span>Familia (todos)</span>
        </button>

        {/* Individual members */}
        {individuals.map(m => (
          <button key={m.id} onClick={() => setActiveMember(m.id)}
            className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[0.82rem] font-medium transition-colors text-left cursor-pointer ${
              activeMember === m.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
            }`}>
            <Avatar member={m} size={26} />
            <span>{m.name}</span>
          </button>
        ))}

        {/* Conjunta members */}
        {conjuntas.length > 0 && (
          <>
            <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400 px-2.5 mt-2 mb-1">Contas Conjuntas</div>
            {conjuntas.map(m => (
              <button key={m.id} onClick={() => setActiveMember(m.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[0.82rem] font-medium transition-colors text-left cursor-pointer ${
                  activeMember === m.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}>
                <Avatar member={m} size={26} />
                <span>{m.name}</span>
                <span className="bg-amber-50 text-amber-700 text-[0.62rem] px-1.5 py-px rounded-full ml-0.5">conjunta</span>
              </button>
            ))}
          </>
        )}

        {/* Add member */}
        {onAddMember && (
          <button onClick={onAddMember}
            className="w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-sm text-slate-400 border border-dashed border-slate-200 mt-1 hover:border-blue-500 hover:text-blue-600 transition-colors cursor-pointer">
            <span>+</span>
            <span>Adicionar membro</span>
          </button>
        )}
      </div>
    </aside>
  );
}
