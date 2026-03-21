'use client';

import { useState, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface Props {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ItemPill({ label, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPos({
        top: spaceBelow > 90 ? rect.bottom + 4 : rect.top - 88,
        left: rect.left,
      });
    }
    setMenuOpen(!menuOpen);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border border-[var(--accent)] t-accent bg-[var(--accent-light)] hover:opacity-80"
      >
        {label}
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setMenuOpen(false)} />
          <div className="fixed t-card border rounded-lg shadow-lg z-[999] min-w-[120px] overflow-hidden"
            style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onEdit(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm t-text hover:bg-slate-50 cursor-pointer flex items-center gap-2 transition-colors">
              <Pencil size={14} /> Editar
            </button>
            <button onClick={() => { onDelete(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-2 transition-colors">
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        </>
      )}
    </>
  );
}
