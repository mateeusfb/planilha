'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function CollapsibleSection({ title, action, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="t-card rounded-xl border mb-6 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-80 transition-colors">
        <h3 className="text-sm font-bold t-text">{title}</h3>
        <div className="flex items-center gap-2">
          {action}
          <ChevronDown size={14} className="t-text-dim transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </div>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
