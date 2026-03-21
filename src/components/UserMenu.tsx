'use client';

import { useState } from 'react';
import type { Workspace } from '@/lib/types';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { Settings, LogOut, User } from 'lucide-react';

interface Props {
  user: { email?: string; user_metadata?: { name?: string } } | null;
  onSignOut: () => void;
  onGoToSettings: () => void;
  onGoToProfile: () => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSwitchWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: () => void;
}

export default function UserMenu({ user, onSignOut, onGoToSettings, onGoToProfile, workspaces, activeWorkspace, onSwitchWorkspace, onCreateWorkspace }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-[60]">
      <button onClick={() => setOpen(!open)}
        className="w-10 h-10 md:w-8 md:h-8 rounded-full t-accent-bg text-white text-sm md:text-xs font-bold flex items-center justify-center cursor-pointer">
        {user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 t-card border rounded-xl shadow-lg p-3 min-w-48 z-[60]">
            <div className="text-sm font-semibold t-text mb-0.5">{user?.user_metadata?.name || 'Usuário'}</div>
            <div className="text-xs t-text-dim mb-3">{user?.email}</div>
            {/* Workspace switcher mobile */}
            <div className="sm:hidden mb-2 pb-2 border-b t-border">
              <WorkspaceSwitcher
                workspaces={workspaces}
                active={activeWorkspace}
                onSwitch={(ws) => { onSwitchWorkspace(ws); setOpen(false); }}
                onCreateNew={() => { onCreateWorkspace(); setOpen(false); }}
              />
            </div>
            <button onClick={() => { onGoToProfile(); setOpen(false); }}
              className="w-full text-left text-sm t-text hover:opacity-80 px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2">
              <User size={16} /> Meu Perfil
            </button>
            <button onClick={() => { onGoToSettings(); setOpen(false); }}
              className="w-full text-left text-sm t-text hover:opacity-80 px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2">
              <Settings size={16} /> Configurações
            </button>
            <button onClick={() => { onSignOut(); setOpen(false); }}
              className="w-full text-left text-sm text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 mt-1">
              <LogOut size={16} /> Sair da conta
            </button>
          </div>
        </>
      )}
    </div>
  );
}
