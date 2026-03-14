'use client';

import { useStore } from '@/lib/store';
import { EXPENSE_CATS, BASE_PAYMENTS } from '@/lib/constants';
import { Avatar } from './Sidebar';

interface Props {
  onAddMember: () => void;
  onEditMember: (id: string) => void;
}

export default function SettingsPage({ onAddMember, onEditMember }: Props) {
  const { state, setState, removeMember, getIndividualMembers } = useStore();
  const customCats = state.customCats || [];
  const customPays = state.customPayments || [];
  const individuals = getIndividualMembers();
  const conjuntas = state.members.filter(m => m.id !== 'all' && m.isConjunta);
  const allMembers = [...individuals, ...conjuntas];

  function addCat() {
    const name = prompt('Nome da nova categoria:');
    if (!name?.trim()) return;
    setState(prev => ({ ...prev, customCats: [...(prev.customCats || []), name.trim()] }));
  }
  function editCat(i: number) {
    const name = prompt('Novo nome:', customCats[i]);
    if (!name?.trim()) return;
    const oldName = customCats[i];
    const newName = name.trim();
    setState(prev => ({
      ...prev,
      customCats: prev.customCats.map((c, idx) => idx === i ? newName : c),
      expenses: prev.expenses.map(e => e.cat === oldName ? { ...e, cat: newName } : e),
    }));
  }
  function deleteCat(i: number) {
    const catName = customCats[i];
    const inUse = state.expenses.filter(e => e.cat === catName).length;
    const msg = inUse > 0 ? `"${catName}" esta em uso em ${inUse} lancamento(s). Excluir?` : `Excluir "${catName}"?`;
    if (!confirm(msg)) return;
    setState(prev => ({ ...prev, customCats: prev.customCats.filter((_, idx) => idx !== i) }));
  }
  function addPay() {
    const name = prompt('Nome da nova forma de pagamento:');
    if (!name?.trim()) return;
    setState(prev => ({ ...prev, customPayments: [...(prev.customPayments || []), name.trim()] }));
  }
  function editPay(i: number) {
    const name = prompt('Novo nome:', customPays[i]);
    if (!name?.trim()) return;
    const oldName = customPays[i];
    const newName = name.trim();
    setState(prev => ({
      ...prev,
      customPayments: prev.customPayments.map((p, idx) => idx === i ? newName : p),
      expenses: prev.expenses.map(e => e.payment === oldName ? { ...e, payment: newName } : e),
    }));
  }
  function deletePay(i: number) {
    const payName = customPays[i];
    const inUse = state.expenses.filter(e => e.payment === payName).length;
    const msg = inUse > 0 ? `"${payName}" esta em uso em ${inUse} lancamento(s). Excluir?` : `Excluir "${payName}"?`;
    if (!confirm(msg)) return;
    setState(prev => ({ ...prev, customPayments: prev.customPayments.filter((_, idx) => idx !== i) }));
  }
  function handleDeleteMember(id: string) {
    const member = state.members.find(m => m.id === id);
    if (!member) return;
    const inUse = state.expenses.filter(e => e.memberId === id).length;
    const msg = inUse > 0
      ? `Excluir "${member.name}"? ${inUse} lancamento(s) serao excluidos.`
      : `Excluir "${member.name}"?`;
    if (!confirm(msg)) return;
    removeMember(id);
  }

  return (
    <>
      {/* Categorias */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
        <h3 className="text-base font-bold mb-4">Categorias de Despesa</h3>
        <div className="mb-3.5">
          <div className="text-[0.78rem] text-slate-400 font-semibold mb-2">PADRAO (somente leitura)</div>
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATS.map(c => <span key={c} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs">{c}</span>)}
          </div>
        </div>
        <div className="text-[0.78rem] text-slate-400 font-semibold mb-2">PERSONALIZADAS</div>
        {customCats.length ? customCats.map((c, i) => (
          <ItemRow key={i} label={c} onEdit={() => editCat(i)} onDelete={() => deleteCat(i)} />
        )) : <p className="text-slate-400 text-sm mb-2">Nenhuma categoria personalizada.</p>}
        <button onClick={addCat} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 mt-1 cursor-pointer">+ Nova categoria</button>
      </div>

      {/* Formas de pagamento */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
        <h3 className="text-base font-bold mb-4">Formas de Pagamento</h3>
        <div className="mb-3.5">
          <div className="text-[0.78rem] text-slate-400 font-semibold mb-2">PADRAO (somente leitura)</div>
          <div className="flex flex-wrap gap-1.5">
            {BASE_PAYMENTS.map(p => <span key={p} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs">{p}</span>)}
          </div>
        </div>
        <div className="text-[0.78rem] text-slate-400 font-semibold mb-2">PERSONALIZADAS</div>
        {customPays.length ? customPays.map((p, i) => (
          <ItemRow key={i} label={p} onEdit={() => editPay(i)} onDelete={() => deletePay(i)} />
        )) : <p className="text-slate-400 text-sm mb-2">Nenhuma forma personalizada.</p>}
        <button onClick={addPay} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 mt-1 cursor-pointer">+ Nova forma</button>
      </div>

      {/* Membros */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
        <h3 className="text-base font-bold mb-4">Membros</h3>
        {allMembers.length ? allMembers.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-1.5">
            <span className="flex items-center gap-2">
              <Avatar member={m} size={24} />
              <span className="text-sm font-medium">{m.name}</span>
              {m.isConjunta && <span className="text-[0.72rem] text-slate-400">(conjunta)</span>}
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => onEditMember(m.id)} className="px-2.5 py-1 border border-slate-200 rounded-lg text-[0.78rem] font-semibold hover:bg-white cursor-pointer">Editar</button>
              <button onClick={() => handleDeleteMember(m.id)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[0.78rem] font-semibold hover:bg-red-100 cursor-pointer">Excluir</button>
            </div>
          </div>
        )) : <p className="text-slate-400 text-sm mb-2">Nenhum membro cadastrado.</p>}
        <button onClick={onAddMember} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 mt-1 cursor-pointer">+ Adicionar membro</button>
      </div>
    </>
  );
}

function ItemRow({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1.5">
        <button onClick={onEdit} className="px-2.5 py-1 border border-slate-200 rounded-lg text-[0.78rem] font-semibold hover:bg-white cursor-pointer">Editar</button>
        <button onClick={onDelete} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[0.78rem] font-semibold hover:bg-red-100 cursor-pointer">Excluir</button>
      </div>
    </div>
  );
}
