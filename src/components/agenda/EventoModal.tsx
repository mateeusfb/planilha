'use client';

import { useEffect, useState } from 'react';
import { Plus, Video, X } from 'lucide-react';
import { validarEntradaEvento } from '@/lib/google/mapear';
import { hoje, paraInputLocal } from '@/lib/google/tempo';
import type { AgendaEvento, EntradaEvento } from '@/lib/types';

/** '2026-08-25T14:00' → '2026-08-25T15:00' (mesma data, uma hora depois). */
function umaHoraDepois(local: string): string {
  const [dia, hora] = local.split('T');
  const [h, m] = hora.split(':').map(Number);
  return `${dia}T${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function proximaHoraCheia(dia: string): string {
  const h = new Date().getHours() + 1;
  return `${dia}T${String(Math.min(h, 23)).padStart(2, '0')}:00`;
}

export default function EventoModal({
  isOpen,
  onClose,
  onSalvar,
  editando,
  fuso,
  salvando = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSalvar: (entrada: EntradaEvento, id?: string) => void;
  editando?: AgendaEvento | null;
  fuso: string;
  salvando?: boolean;
}) {
  const [titulo, setTitulo] = useState('');
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [data, setData] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [convidados, setConvidados] = useState<string[]>([]);
  const [novoConvidado, setNovoConvidado] = useState('');
  const [criarMeet, setCriarMeet] = useState(false);
  const [notificar, setNotificar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErro(null);
    setNovoConvidado('');

    if (editando) {
      setTitulo(editando.titulo);
      setDiaInteiro(editando.diaInteiro);
      setData(editando.diaInteiro ? editando.inicio : '');
      setInicio(editando.diaInteiro ? '' : paraInputLocal(editando.inicio, fuso));
      setFim(editando.diaInteiro ? '' : paraInputLocal(editando.fim, fuso));
      setLocal(editando.local ?? '');
      setDescricao(editando.descricao ?? '');
      setConvidados(editando.convidados.filter(c => !c.souEu).map(c => c.email));
      setCriarMeet(!!editando.linkMeet);
      setNotificar(true);
      return;
    }

    const dia = hoje(fuso);
    const comeco = proximaHoraCheia(dia);
    setTitulo('');
    setDiaInteiro(false);
    setData(dia);
    setInicio(comeco);
    setFim(umaHoraDepois(comeco));
    setLocal('');
    setDescricao('');
    setConvidados([]);
    setCriarMeet(false);
    setNotificar(true);
  }, [editando, isOpen, fuso]);

  if (!isOpen) return null;

  function adicionarConvidado(bruto: string) {
    const emails = bruto
      .split(/[,;\s]+/)
      .map(e => e.trim())
      .filter(Boolean);
    if (!emails.length) return;
    setConvidados(prev => [...new Set([...prev, ...emails])]);
    setNovoConvidado('');
  }

  function montarEntrada(): EntradaEvento {
    return {
      titulo,
      descricao: descricao.trim() || undefined,
      local: local.trim() || undefined,
      diaInteiro,
      ...(diaInteiro ? { data } : { inicio, fim }),
      fuso,
      convidados: convidados.map(email => ({ email })),
      criarMeet,
      notificarConvidados: notificar,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Se o usuário digitou um e-mail e não apertou Enter, não perder o convidado.
    const pendente = novoConvidado.trim();
    const lista = pendente ? [...new Set([...convidados, pendente])] : convidados;
    if (pendente) setConvidados(lista);

    const entrada = { ...montarEntrada(), convidados: lista.map(email => ({ email })) };
    const problema = validarEntradaEvento(entrada);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    onSalvar(entrada, editando?.id);
  }

  const editandoRecorrente = editando?.recorrente;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative w-full max-w-md border t-border rounded-2xl shadow-2xl animate-modal-in overflow-hidden max-h-[92vh] flex flex-col"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b t-border flex-shrink-0">
          <h3 className="text-sm font-bold t-text">
            {editando ? 'Editar reunião' : 'Nova reunião'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center t-text-muted cursor-pointer hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Título</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Reunião com o cliente"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold t-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={diaInteiro}
              onChange={e => setDiaInteiro(e.target.checked)}
              className="cursor-pointer"
            />
            Dia todo
          </label>

          {diaInteiro ? (
            <div>
              <label className="block text-xs font-semibold t-text-muted mb-1">Dia</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg t-input border text-sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold t-text-muted mb-1">Começa</label>
                <input
                  type="datetime-local"
                  value={inicio}
                  onChange={e => {
                    setInicio(e.target.value);
                    if (!fim || fim <= e.target.value) setFim(umaHoraDepois(e.target.value));
                  }}
                  className="w-full px-3 py-2.5 rounded-lg t-input border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold t-text-muted mb-1">Termina</label>
                <input
                  type="datetime-local"
                  value={fim}
                  onChange={e => setFim(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg t-input border text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">
              Convidados <span className="font-normal">(recebem o convite por e-mail)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={novoConvidado}
                onChange={e => setNovoConvidado(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    adicionarConvidado(novoConvidado);
                  }
                }}
                placeholder="email@exemplo.com"
                className="flex-1 px-3 py-2.5 rounded-lg t-input border text-sm"
              />
              <button
                type="button"
                onClick={() => adicionarConvidado(novoConvidado)}
                className="px-3 rounded-lg border t-border t-text cursor-pointer hover:opacity-80"
              >
                <Plus size={16} />
              </button>
            </div>
            {convidados.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {convidados.map(email => (
                  <span
                    key={email}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] t-accent-light t-accent font-semibold"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setConvidados(prev => prev.filter(e => e !== email))}
                      className="cursor-pointer hover:opacity-70"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {editando?.linkMeet ? (
            // O link já existe e já foi enviado aos convidados — desmarcar não o
            // remove, então não fingimos que remove.
            <p className="flex items-center gap-2 text-xs font-semibold t-text-muted">
              <Video size={13} /> Esta reunião já tem link do Google Meet
            </p>
          ) : (
            <label className="flex items-center gap-2 text-xs font-semibold t-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={criarMeet}
                onChange={e => setCriarMeet(e.target.checked)}
                className="cursor-pointer"
              />
              <Video size={13} /> Criar link do Google Meet
            </label>
          )}

          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Local</label>
            <input
              value={local}
              onChange={e => setLocal(e.target.value)}
              placeholder="Escritório, endereço, link…"
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold t-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={notificar}
              onChange={e => setNotificar(e.target.checked)}
              className="cursor-pointer"
            />
            Avisar os convidados por e-mail
          </label>

          {editandoRecorrente && (
            <p className="text-[11px] t-text-dim">
              Esta reunião se repete — a alteração vale só para esta ocorrência.
            </p>
          )}

          {erro && <p className="text-xs text-red-500 font-semibold">{erro}</p>}

          <button
            type="submit"
            disabled={salvando}
            className="w-full py-2.5 t-accent-bg text-white font-semibold rounded-lg text-sm cursor-pointer hover:opacity-90 disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar e enviar convites'}
          </button>
        </form>
      </div>
    </div>
  );
}
