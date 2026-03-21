'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import type { PageId, Member } from '@/lib/types';
import { Home, CreditCard, BarChart3, FileText, TrendingUp, Menu, ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface SidebarProps {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
}

const navLinks: { id: PageId; icon: ReactNode; label: string }[] = [
  { id: 'dashboard', icon: <Home size={18} />, label: 'Início' },
  { id: 'expenses', icon: <CreditCard size={18} />, label: 'Lançamentos' },
  { id: 'analysis', icon: <BarChart3 size={18} />, label: 'Análise' },
  { id: 'investments', icon: <TrendingUp size={18} />, label: 'Investimentos' },
  { id: 'summary', icon: <FileText size={18} />, label: 'Resumo Mensal' },
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

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fechar menu mobile ao trocar de página
  function handlePageChange(page: PageId) {
    onPageChange(page);
    setMobileOpen(false);
  }

  // Fechar mobile menu em resize
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setMobileOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const w = collapsed ? 'w-[60px]' : 'w-[170px]';

  // Conteúdo da sidebar (compartilhado entre desktop e mobile)
  const sidebarContent = (
    <>
      {/* Logo + toggle */}
      <div className="px-3 py-4 border-b t-border flex items-center justify-between">
        {!collapsed && (
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <div>
              <h1 className="text-base font-bold t-accent truncate">Folga</h1>
              <p className="text-[0.68rem] t-text-dim truncate">Controle financeiro</p>
            </div>
          </div>
        )}
        {/* Desktop: toggle collapse. Mobile: close */}
        <button onClick={() => { if (mobileOpen) setMobileOpen(false); else setCollapsed(!collapsed); }}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center t-text-muted hover:opacity-80 transition-colors cursor-pointer"
          title={mobileOpen ? 'Fechar menu' : collapsed ? 'Expandir menu' : 'Recolher menu'}>
          {mobileOpen ? <ChevronLeft size={18} /> : collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1.5 py-3 overflow-y-auto">
        {!collapsed && <div className="text-[0.65rem] font-semibold uppercase tracking-wider t-text-dim px-2 mb-1">Menu</div>}
        {navLinks.map(link => (
          <button key={link.id} onClick={() => handlePageChange(link.id)}
            title={collapsed ? link.label : undefined}
            className={`w-full flex items-center gap-2 px-2.5 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activePage === link.id ? 't-accent-light' : 't-text hover:opacity-80'
            } ${collapsed ? 'justify-center' : ''}`}>
            <span className="w-5 text-center flex-shrink-0">{link.icon}</span>
            {!collapsed && <span className="truncate">{link.label}</span>}
          </button>
        ))}
      </nav>

    </>
  );

  return (
    <>
      {/* Botão hambúrguer mobile (fixo no canto) */}
      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[200] w-10 h-10 rounded-xl t-card border shadow-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-colors"
        style={{ display: mobileOpen ? 'none' : undefined }}>
        <Menu size={20} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-[150]" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside className={`md:hidden fixed top-0 left-0 bottom-0 w-72 t-sidebar border-r flex flex-col z-[200] transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebarContent}
      </aside>

      {/* Sidebar desktop */}
      <aside className={`hidden md:flex ${w} t-sidebar border-r fixed top-0 left-0 bottom-0 flex-col z-[100] transition-all duration-300`}>
        {sidebarContent}
      </aside>

      {/* Spacer desktop */}
      <div className={`hidden md:block ${w} flex-shrink-0 transition-all duration-300`} />
    </>
  );
}
