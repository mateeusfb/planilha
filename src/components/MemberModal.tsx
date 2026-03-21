'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/lib/constants';
import { genId } from '@/lib/helpers';
import { uploadAvatar, deleteAvatar } from '@/lib/storage';
import { useToast } from './Toast';
import type { Workspace } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingMemberId: string | null;
  workspaces?: Workspace[];
  activeWorkspace?: Workspace;
}

export default function MemberModal({ isOpen, onClose, editingMemberId, workspaces = [], activeWorkspace }: Props) {
  const { state, addMember, updateMember } = useStore();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [isConjunta, setIsConjunta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('current');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const ownWorkspaces = workspaces.filter(w => w.isOwn);
  const hasMultipleWorkspaces = ownWorkspaces.length > 1;

  useEffect(() => {
    if (isOpen) {
      if (editingMemberId) {
        const member = state.members.find(m => m.id === editingMemberId);
        if (member) {
          setName(member.name);
          setColor(member.color);
          setPhoto(member.photo || null);
          setIsConjunta(!!member.isConjunta);
        }
      } else {
        setName(''); setColor(COLORS[0]); setPhoto(null); setPhotoFile(null); setPhotoRemoved(false); setIsConjunta(false);
        setSelectedWorkspace('current');
      }
    }
  }, [isOpen, editingMemberId, state.members]);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('Imagem muito grande. Máximo 5MB.', 'warning');
      return;
    }
    setPhotoFile(file);
    setPhotoRemoved(false);
    // Preview local
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!name.trim()) return toast('Digite o nome do membro.', 'warning');
    if (!user) return;
    setSaving(true);

    try {
      if (editingMemberId) {
        let photoUrl = photo;
        if (photoFile) {
          photoUrl = await uploadAvatar(photoFile, user.id, editingMemberId);
        } else if (photoRemoved) {
          await deleteAvatar(user.id, editingMemberId);
          photoUrl = null;
        }
        updateMember(editingMemberId, { name: name.trim(), color, photo: photoUrl, isConjunta });
        toast('Membro atualizado!', 'success');
        setSaving(false);
        onClose();
        return;
      }

      const memberId = genId();
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadAvatar(photoFile, user.id, memberId);
      }
      const member = { id: memberId, name: name.trim(), color, photo: photoUrl, isConjunta };

      if (selectedWorkspace === 'all') {
        ownWorkspaces.forEach(ws => {
          const wsId = ws.workspaceId || null;
          addMember({ ...member, id: genId() }, wsId);
        });
        toast(`${name.trim()} adicionado em todos os espaços!`, 'success');
      } else if (selectedWorkspace === 'current') {
        addMember(member);
        toast(`${name.trim()} adicionado!`, 'success');
      } else {
        const ws = ownWorkspaces.find(w => w.id === selectedWorkspace);
        const wsId = ws?.workspaceId || null;
        addMember(member, wsId);
        toast(`${name.trim()} adicionado em ${ws?.label || 'workspace'}!`, 'success');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'error');
    }

    setSaving(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-card rounded-2xl p-5 md:p-7 w-[90%] max-w-md shadow-xl border max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold mb-5">{editingMemberId ? 'Editar Membro' : 'Adicionar Membro'}</h3>

        {/* Photo */}
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-500 transition-colors mb-4"
          onClick={() => fileRef.current?.click()}>
          <input type="file" ref={fileRef} accept="image/*" onChange={handlePhoto} className="hidden" />
          {photo ? (
            <>
              <img src={photo} alt="Preview" className="w-[72px] h-[72px] rounded-full object-cover mx-auto mb-2 border-[3px] border-slate-200" />
              <button onClick={e => { e.stopPropagation(); setPhoto(null); setPhotoFile(null); setPhotoRemoved(true); }} className="text-xs text-red-600 cursor-pointer">Remover foto</button>
            </>
          ) : (
            <>
              <div className="w-[72px] h-[72px] rounded-full bg-slate-100 mx-auto mb-2 flex items-center justify-center text-3xl border-[3px] border-dashed border-slate-200">👤</div>
              <div className="text-sm text-slate-400">Clique para adicionar uma <span className="text-blue-600 font-semibold">foto</span></div>
            </>
          )}
        </div>

        {/* Name */}
        <div className="mb-3.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Nome</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do membro"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>

        {/* Tipo */}
        <div className="mb-3.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Tipo</label>
          <div className="flex items-center gap-2 mt-1">
            <label className="toggle-switch">
              <input type="checkbox" checked={isConjunta} onChange={e => setIsConjunta(e.target.checked)} />
              <span className="toggle-slider"></span>
            </label>
            <span className="text-sm">Conta Conjunta</span>
          </div>
          {isConjunta && (
            <div className="text-xs text-slate-400 mt-1">Despesas lançadas aqui serão divididas igualmente entre os membros individuais.</div>
          )}
        </div>

        {/* Workspace selector */}
        {!editingMemberId && hasMultipleWorkspaces && (
          <div className="mb-3.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Espaço de trabalho</label>
            <div className="space-y-1.5">
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  selectedWorkspace === 'current' ? 'border-[var(--accent)] t-accent-light' : 't-border hover:opacity-80'
                }`}
              >
                <input type="radio" name="workspace" value="current" checked={selectedWorkspace === 'current'}
                  onChange={() => setSelectedWorkspace('current')} className="hidden" />
                <span className="text-sm">{activeWorkspace?.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium t-text">{activeWorkspace?.label || 'Atual'}</div>
                  <div className="text-[0.7rem] t-text-dim">Apenas neste espaço</div>
                </div>
                {selectedWorkspace === 'current' && <span className="text-sm t-accent">✓</span>}
              </label>

              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  selectedWorkspace === 'all' ? 'border-[var(--accent)] t-accent-light' : 't-border hover:opacity-80'
                }`}
              >
                <input type="radio" name="workspace" value="all" checked={selectedWorkspace === 'all'}
                  onChange={() => setSelectedWorkspace('all')} className="hidden" />
                <span className="text-sm">🌐</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium t-text">Todos os espaços</div>
                  <div className="text-[0.7rem] t-text-dim">Disponível em {ownWorkspaces.length} espaços</div>
                </div>
                {selectedWorkspace === 'all' && <span className="text-sm t-accent">✓</span>}
              </label>

              {ownWorkspaces.filter(w => w.id !== activeWorkspace?.id).map(ws => (
                <label
                  key={ws.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedWorkspace === ws.id ? 'border-[var(--accent)] t-accent-light' : 't-border hover:opacity-80'
                  }`}
                >
                  <input type="radio" name="workspace" value={ws.id} checked={selectedWorkspace === ws.id}
                    onChange={() => setSelectedWorkspace(ws.id)} className="hidden" />
                  <span className="text-sm">{ws.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium t-text">{ws.label}</div>
                    <div className="text-[0.7rem] t-text-dim">Apenas neste espaço</div>
                  </div>
                  {selectedWorkspace === ws.id && <span className="text-sm t-accent">✓</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Color picker */}
        {!photo && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Cor do Avatar</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <div key={c} onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full cursor-pointer transition-all"
                  style={{ background: c, border: `3px solid ${c === color ? '#1e293b' : 'transparent'}` }} />
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 cursor-pointer disabled:opacity-60 flex items-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
