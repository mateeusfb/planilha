'use client';

import { useState } from 'react';
import {
  Check, ChevronDown, Clock, HelpCircle, MapPin, Pencil, Repeat, Trash2, Users, Video, X,
} from 'lucide-react';
import { horaDoEvento } from '@/lib/google/tempo';
import type { AgendaEvento, RespostaConvite, StatusResposta } from '@/lib/types';

const CORES_RESPOSTA: Record<StatusResposta, string> = {
  accepted: '#10b981',
  declined: '#ef4444',
  tentative: '#f59e0b',
  needsAction: '#94a3b8',
};

const ROTULO_RESPOSTA: Record<StatusResposta, string> = {
  accepted: 'Você vai',
  declined: 'Você recusou',
  tentative: 'Talvez',
  needsAction: 'Sem resposta',
};

function faixaDeHorario(evento: AgendaEvento, fuso: string): string {
  if (evento.diaInteiro) return 'Dia todo';
  const inicio = horaDoEvento(evento.inicio, fuso);
  const fim = horaDoEvento(evento.fim, fuso);
  return fim && fim !== inicio ? `${inicio} – ${fim}` : inicio;
}

export default function EventoCard({
  evento,
  fuso,
  ocupado = false,
  onEditar,
  onCancelar,
  onResponder,
}: {
  evento: AgendaEvento;
  fuso: string;
  ocupado?: boolean;
  onEditar?: (evento: AgendaEvento) => void;
  onCancelar?: (evento: AgendaEvento) => void;
  onResponder?: (evento: AgendaEvento, resposta: RespostaConvite) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const respondendo = !evento.souOrganizador && evento.convidados.some(c => c.souEu);

  return (
    <div
      className="t-card border t-border rounded-xl overflow-hidden"
      style={{
        borderLeft: `3px solid ${
          evento.minhaResposta ? CORES_RESPOSTA[evento.minhaResposta] : 'var(--accent)'
        }`,
      }}
    >
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span className="text-xs font-semibold t-text-muted whitespace-nowrap pt-0.5 w-[86px] flex-shrink-0">
          {faixaDeHorario(evento, fuso)}
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold t-text truncate">{evento.titulo}</span>
          <span className="flex items-center gap-2.5 mt-1 text-[11px] t-text-dim flex-wrap">
            {evento.convidados.length > 0 && (
              <span className="flex items-center gap-1">
                <Users size={11} /> {evento.convidados.length}
              </span>
            )}
            {evento.linkMeet && (
              <span className="flex items-center gap-1">
                <Video size={11} /> Meet
              </span>
            )}
            {evento.recorrente && (
              <span className="flex items-center gap-1">
                <Repeat size={11} /> Repete
              </span>
            )}
            {evento.local && (
              <span className="flex items-center gap-1 truncate max-w-[180px]">
                <MapPin size={11} /> {evento.local}
              </span>
            )}
            {respondendo && evento.minhaResposta && (
              <span style={{ color: CORES_RESPOSTA[evento.minhaResposta] }}>
                {ROTULO_RESPOSTA[evento.minhaResposta]}
              </span>
            )}
          </span>
        </span>

        <ChevronDown
          size={14}
          className="t-text-dim flex-shrink-0 mt-1 transition-transform duration-300"
          style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {aberto && (
        <div className="px-4 pb-4 pt-1 border-t t-border-light space-y-3">
          {evento.descricao && (
            <p className="text-xs t-text-muted whitespace-pre-wrap">{evento.descricao}</p>
          )}

          {evento.linkMeet && (
            <a
              href={evento.linkMeet}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 t-accent-bg text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90"
            >
              <Video size={14} /> Entrar no Meet
            </a>
          )}

          {evento.convidados.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold t-text-muted">Convidados</p>
              {evento.convidados.map(c => (
                <div key={c.email} className="flex items-center gap-2 text-xs t-text-muted">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: CORES_RESPOSTA[c.resposta] }}
                  />
                  <span className="truncate">
                    {c.nome || c.email}
                    {c.souEu && ' (você)'}
                    {c.organizador && ' · organizador'}
                    {c.opcional && ' · opcional'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {evento.recorrente && (
            <p className="text-[11px] t-text-dim flex items-center gap-1">
              <Repeat size={11} /> Alterações aqui valem só para esta ocorrência.
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap pt-1">
            {respondendo && onResponder && (
              <>
                <button
                  onClick={() => onResponder(evento, 'accepted')}
                  disabled={ocupado}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                  style={{ background: CORES_RESPOSTA.accepted }}
                >
                  <Check size={13} /> Vou
                </button>
                <button
                  onClick={() => onResponder(evento, 'tentative')}
                  disabled={ocupado}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                  style={{ background: CORES_RESPOSTA.tentative }}
                >
                  <HelpCircle size={13} /> Talvez
                </button>
                <button
                  onClick={() => onResponder(evento, 'declined')}
                  disabled={ocupado}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                  style={{ background: CORES_RESPOSTA.declined }}
                >
                  <X size={13} /> Não vou
                </button>
              </>
            )}

            {evento.souOrganizador && onEditar && (
              <button
                onClick={() => onEditar(evento)}
                disabled={ocupado}
                className="flex items-center gap-1.5 px-3 py-1.5 border t-border rounded-lg text-xs font-semibold t-text cursor-pointer hover:opacity-80 disabled:opacity-50"
              >
                <Pencil size={13} /> Editar
              </button>
            )}
            {evento.souOrganizador && onCancelar && (
              <button
                onClick={() => onCancelar(evento)}
                disabled={ocupado}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80 disabled:opacity-50"
              >
                <Trash2 size={13} /> Cancelar
              </button>
            )}
            {evento.linkGoogle && (
              <a
                href={evento.linkGoogle}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold t-text-muted cursor-pointer hover:opacity-80"
              >
                <Clock size={13} /> Abrir no Google
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
