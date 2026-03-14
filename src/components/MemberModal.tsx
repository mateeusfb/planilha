'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { COLORS } from '@/lib/constants';
import { genId } from '@/lib/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingMemberId: string | null;
}

export default function MemberModal({ isOpen, onClose, editingMemberId }: Props) {
  const { state, addMember, updateMember } = useStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isConjunta, setIsConjunta] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        setName(''); setColor(COLORS[0]); setPhoto(null); setIsConjunta(false);
      }
    }
  }, [isOpen, editingMemberId, state.members]);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!name.trim()) return alert('Digite o nome do membro.');
    if (editingMemberId) {
      updateMember(editingMemberId, { name: name.trim(), color, photo, isConjunta });
    } else {
      addMember({ id: genId(), name: name.trim(), color, photo, isConjunta });
    }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-card rounded-2xl p-7 w-full max-w-md shadow-xl border">
        <h3 className="text-base font-bold mb-5">{editingMemberId ? 'Editar Membro' : 'Adicionar Membro'}</h3>

        {/* Photo */}
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-500 transition-colors mb-4"
          onClick={() => fileRef.current?.click()}>
          <input type="file" ref={fileRef} accept="image/*" onChange={handlePhoto} className="hidden" />
          {photo ? (
            <>
              <img src={photo} alt="Preview" className="w-[72px] h-[72px] rounded-full object-cover mx-auto mb-2 border-[3px] border-slate-200" />
              <button onClick={e => { e.stopPropagation(); setPhoto(null); }} className="text-xs text-red-600 cursor-pointer">Remover foto</button>
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
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 cursor-pointer">Salvar</button>
        </div>
      </div>
    </div>
  );
}
