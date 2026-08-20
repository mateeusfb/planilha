'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import EventoCard from './EventoCard';
import type { AgendaEvento, RespostaConvite } from '@/lib/types';

/**
 * Detalhe do evento clicado na grade da semana.
 *
 * Reaproveita o `EventoCard` já expandido em vez de duplicar a tela de detalhe:
 * as ações (responder, editar, cancelar) e o link do Meet são exatamente os
 * mesmos da lista.
 */
export default function EventoDetalheModal({
  evento,
  fuso,
  ocupado,
  onFechar,
  onEditar,
  onCancelar,
  onResponder,
}: {
  evento: AgendaEvento | null;
  fuso: string;
  ocupado?: boolean;
  onFechar: () => void;
  onEditar: (evento: AgendaEvento) => void;
  onCancelar: (evento: AgendaEvento) => void;
  onResponder: (evento: AgendaEvento, resposta: RespostaConvite) => void;
}) {
  useEffect(() => {
    if (!evento) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [evento, onFechar]);

  if (!evento) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />

      <div
        className="relative w-full max-w-md border t-border rounded-2xl shadow-2xl animate-modal-in overflow-hidden max-h-[92vh] flex flex-col"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b t-border flex-shrink-0">
          <h3 className="text-sm font-bold t-text">Detalhes</h3>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="w-7 h-7 rounded-lg flex items-center justify-center t-text-muted cursor-pointer hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <EventoCard
            evento={evento}
            fuso={fuso}
            ocupado={ocupado}
            iniciaAberto
            onEditar={onEditar}
            onCancelar={onCancelar}
            onResponder={onResponder}
          />
        </div>
      </div>
    </div>
  );
}
