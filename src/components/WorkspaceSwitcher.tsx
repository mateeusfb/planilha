'use client';

import { useState } from 'react';
import type { Workspace } from '@/lib/types';
import { ChevronDown, Plus } from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  active: Workspace;
  onSwitch: (ws: Workspace) => void;
  onCreateNew: () => void;
}

export default function WorkspaceSwitcher({ workspaces, active, onSwitch, onCreateNew }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="px-3 py-1.5 border rounded-lg text-xs font-medium t-card t-border cursor-pointer hover:opacity-80 flex items-center gap-1.5">
        <span>{active.icon}</span>
        <span className="max-w-[120px] truncate">{active.label}</span>
        <ChevronDown size={14} className="t-text-dim" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 t-card border rounded-xl shadow-lg p-2 min-w-56 z-50">
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider t-text-dim px-2 mb-1">Meus espaços</div>
            {workspaces.filter(w => w.isOwn).map(ws => (
              <button key={ws.id} onClick={() => { onSwitch(ws); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors mb-0.5 ${
                  active.id === ws.id ? 't-accent-light font-semibold' : 't-text hover:opacity-80'
                }`}>
                <span className="mr-2">{ws.icon}</span>{ws.label}
              </button>
            ))}

            <button onClick={() => { onCreateNew(); setOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors text-blue-600 hover:bg-blue-50 mb-0.5">
              <Plus size={14} className="mr-1" />Novo espaço
            </button>

            {workspaces.some(w => !w.isOwn) && (
              <>
                <div className="text-[0.65rem] font-semibold uppercase tracking-wider t-text-dim px-2 mt-2 mb-1">Compartilhados comigo</div>
                {workspaces.filter(w => !w.isOwn).map(ws => (
                  <button key={ws.id} onClick={() => { onSwitch(ws); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors mb-0.5 ${
                      active.id === ws.id ? 't-accent-light font-semibold' : 't-text hover:opacity-80'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span>{ws.icon}</span>
                      <div>
                        <div className="font-medium">{ws.label}</div>
                        <div className="text-[0.7rem] t-text-dim">{ws.ownerEmail}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
