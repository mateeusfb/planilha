'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useTheme, type AccentColor } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { Member, Workspace } from '@/lib/types';
import { useToast } from './Toast';
import InputModal from './InputModal';
import DeleteModal from './DeleteModal';
import CollapsibleSection from './settings/CollapsibleSection';
import CategoriesBlock from './settings/CategoriesBlock';

interface Props {
  onAddMember: () => void;
  onEditMember: (id: string) => void;
  workspaces?: Workspace[];
  activeWorkspace?: Workspace;
  onWorkspaceDeleted?: () => void;
}

interface Share {
  id: string;
  shared_email: string;
  accepted: boolean;
  created_at: string;
}

interface PendingInvite {
  id: string;
  owner_id: string;
  owner_email?: string;
  accepted: boolean;
}

export default function SettingsPage({ onAddMember, onEditMember, workspaces = [], activeWorkspace, onWorkspaceDeleted }: Props) {
  const { state, setState, removeMember, getIndividualMembers, recurringExpenses, updateRecurring, removeRecurring } = useStore();
  const { user } = useAuth();
  const customCats = state.customCats || [];
  const customPays = state.customPayments || [];
  const customBanks = state.customBanks || [];
  const individuals = getIndividualMembers();
  const conjuntas = state.members.filter(m => m.id !== 'all' && m.isConjunta);
  const allMembers = [...individuals, ...conjuntas];

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{ type: 'cat' | 'pay' | 'editCat' | 'editPay' | 'bank' | 'editBank'; index?: number; defaultValue?: string }>({ type: 'cat' });

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });

  const [catTab, setCatTab] = useState<'cats' | 'pays' | 'banks' | 'members' | 'workspaces' | 'budgets' | 'recurring'>('cats');


  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'EXCLUIR') return;
    setDeleting(true);
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      toast('Erro ao excluir conta: ' + error.message, 'error');
      setDeleting(false);
      return;
    }
    await signOut();
  }

  const [shares, setShares] = useState<Share[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const loadShares = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('shares').select('*').eq('owner_id', user.id);
    setShares(data || []);

    const { data: received } = await supabase.from('shares').select('*').eq('shared_email', user.email).eq('accepted', false);
    setPendingInvites(received || []);
  }, [user]);

  useEffect(() => { loadShares(); }, [loadShares]);

  function removeShare(id: string) {
    setConfirmModal({
      open: true,
      message: 'Remover este acesso compartilhado?',
      onConfirm: async () => {
        await supabase.from('shares').delete().eq('id', id);
        toast('Acesso removido.', 'success');
        loadShares();
      },
    });
  }

  async function acceptInvite(invite: PendingInvite) {
    if (!user) return;
    await supabase.from('shares').update({
      shared_user_id: user.id,
      accepted: true,
    }).eq('id', invite.id);
    loadShares();
    window.location.reload();
  }

  async function declineInvite(id: string) {
    await supabase.from('shares').delete().eq('id', id);
    loadShares();
  }

  function addCat() {
    setInputModalConfig({ type: 'cat' });
    setInputModalOpen(true);
  }
  function editCat(i: number) {
    setInputModalConfig({ type: 'editCat', index: i, defaultValue: customCats[i] });
    setInputModalOpen(true);
  }
  function deleteCat(i: number) {
    const catName = customCats[i];
    const inUse = state.expenses.filter(e => e.cat === catName).length;
    const msg = inUse > 0 ? `"${catName}" está em uso em ${inUse} lançamento(s). Serão movidos para "Outros". Excluir mesmo assim?` : `Excluir "${catName}"?`;
    setConfirmModal({
      open: true, message: msg,
      onConfirm: async () => {
        const affectedExpenses = state.expenses.filter(e => e.cat === catName);
        setState(prev => ({
          ...prev,
          customCats: prev.customCats.filter((_, idx) => idx !== i),
          expenses: prev.expenses.map(e => e.cat === catName ? { ...e, cat: 'Outros' } : e),
        }));
        if (affectedExpenses.length > 0) {
          const { error } = await supabase.from('expenses').update({ category: 'Outros' }).eq('category', catName).eq('user_id', user!.id);
          if (error) console.error('Erro ao reatribuir lançamentos:', error.message);
        }
        toast(`Categoria "${catName}" excluída.${inUse > 0 ? ` ${inUse} lançamento(s) movido(s) para "Outros".` : ''}`, 'success');
      },
    });
  }
  function addPay() {
    setInputModalConfig({ type: 'pay' });
    setInputModalOpen(true);
  }
  function editPay(i: number) {
    setInputModalConfig({ type: 'editPay', index: i, defaultValue: customPays[i] });
    setInputModalOpen(true);
  }
  function deletePay(i: number) {
    const payName = customPays[i];
    const inUse = state.expenses.filter(e => e.payment === payName).length;
    const msg = inUse > 0 ? `"${payName}" está em uso em ${inUse} lançamento(s). Excluir mesmo assim?` : `Excluir "${payName}"?`;
    setConfirmModal({
      open: true, message: msg,
      onConfirm: () => {
        setState(prev => ({ ...prev, customPayments: prev.customPayments.filter((_, idx) => idx !== i) }));
        toast(`Forma "${payName}" excluída.`, 'success');
      },
    });
  }
  function handleDeleteMember(id: string) {
    const member = state.members.find(m => m.id === id);
    if (!member) return;
    const inUse = state.expenses.filter(e => e.memberId === id).length;
    const msg = inUse > 0 ? `Excluir "${member.name}"? ${inUse} lançamento(s) serão excluídos.` : `Excluir "${member.name}"?`;
    setConfirmModal({
      open: true, message: msg,
      onConfirm: async () => {
        try {
          await removeMember(id);
          toast(`Membro "${member.name}" excluído.`, 'success');
        } catch {
          toast('Erro ao excluir membro. Tente novamente.', 'error');
        }
      },
    });
  }

  function handleInputModalConfirm(value: string) {
    const { type, index } = inputModalConfig;
    if (type === 'cat') {
      setState(prev => ({ ...prev, customCats: [...(prev.customCats || []), value] }));
      toast(`Categoria "${value}" criada!`, 'success');
    } else if (type === 'editCat' && index !== undefined) {
      const oldName = customCats[index];
      setState(prev => ({
        ...prev,
        customCats: prev.customCats.map((c, idx) => idx === index ? value : c),
        expenses: prev.expenses.map(e => e.cat === oldName ? { ...e, cat: value } : e),
      }));
      toast(`Categoria renomeada para "${value}".`, 'success');
    } else if (type === 'pay') {
      setState(prev => ({ ...prev, customPayments: [...(prev.customPayments || []), value] }));
      toast(`Forma "${value}" criada!`, 'success');
    } else if (type === 'editPay' && index !== undefined) {
      const oldName = customPays[index];
      setState(prev => ({
        ...prev,
        customPayments: prev.customPayments.map((p, idx) => idx === index ? value : p),
        expenses: prev.expenses.map(e => e.payment === oldName ? { ...e, payment: value } : e),
      }));
      toast(`Forma renomeada para "${value}".`, 'success');
    } else if (type === 'bank') {
      setState(prev => ({ ...prev, customBanks: [...(prev.customBanks || []), value] }));
      toast(`Instituição "${value}" adicionada!`, 'success');
    } else if (type === 'editBank' && index !== undefined) {
      const oldName = customBanks[index];
      setState(prev => ({
        ...prev,
        customBanks: prev.customBanks.map((b, idx) => idx === index ? value : b),
        expenses: prev.expenses.map(e => e.bank === oldName ? { ...e, bank: value } : e),
      }));
      toast(`Instituição renomeada para "${value}".`, 'success');
    }
  }

  function addBank() {
    setInputModalConfig({ type: 'bank' });
    setInputModalOpen(true);
  }
  function editBank(i: number) {
    setInputModalConfig({ type: 'editBank', index: i, defaultValue: customBanks[i] });
    setInputModalOpen(true);
  }
  function deleteBank(i: number) {
    const bankName = customBanks[i];
    const inUse = state.expenses.filter(e => e.bank === bankName).length;
    const msg = inUse > 0 ? `"${bankName}" está em uso em ${inUse} lançamento(s). Excluir mesmo assim?` : `Excluir "${bankName}"?`;
    setConfirmModal({
      open: true, message: msg,
      onConfirm: () => {
        setState(prev => ({ ...prev, customBanks: prev.customBanks.filter((_, idx) => idx !== i) }));
        toast(`Instituição "${bankName}" excluída.`, 'success');
      },
    });
  }

  const { accent, setAccent, customColor, setCustomColor } = useTheme();

  const accentColors: { id: AccentColor; label: string; color: string }[] = [
    { id: 'blue', label: 'Azul', color: '#2563eb' },
    { id: 'purple', label: 'Roxo', color: '#7c3aed' },
    { id: 'green', label: 'Verde', color: '#059669' },
    { id: 'rose', label: 'Rosa', color: '#e11d48' },
    { id: 'orange', label: 'Laranja', color: '#ea580c' },
    { id: 'cyan', label: 'Ciano', color: '#0891b2' },
  ];

  return (
    <>
      {/* Cor de destaque */}
      <div className="t-card border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold t-text">Cor de destaque</h3>
          <div className="w-5 h-5 rounded-full shadow-sm border t-border" style={{ background: accent === 'custom' ? customColor : accentColors.find(c => c.id === accent)?.color }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {accentColors.map(c => (
            <button key={c.id} onClick={() => setAccent(c.id)}
              title={c.label}
              className={`w-8 h-8 rounded-full cursor-pointer transition-all flex-shrink-0 ${
                accent === c.id ? 'ring-2 ring-offset-2 ring-[var(--accent)] scale-110' : 'hover:scale-105'
              }`}
              style={{ background: c.color }}
            />
          ))}
          <div className="relative">
            <button
              onClick={() => { /* click triggers the hidden color input */ }}
              title="Cor personalizada"
              className={`w-8 h-8 rounded-full cursor-pointer transition-all flex-shrink-0 border-2 border-dashed flex items-center justify-center overflow-hidden ${
                accent === 'custom' ? 'ring-2 ring-offset-2 ring-[var(--accent)] scale-110 border-transparent' : 't-border hover:scale-105'
              }`}
              style={accent === 'custom' ? { background: customColor } : {}}
            >
              {accent !== 'custom' && <span className="text-xs t-text-dim">+</span>}
            </button>
            <input
              type="color"
              value={customColor}
              onChange={e => setCustomColor(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Escolher cor personalizada"
            />
          </div>
        </div>
      </div>

      {/* Convites recebidos */}
      {pendingInvites.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="text-base font-bold mb-3 text-blue-800">Convites Pendentes</h3>
          <p className="text-sm text-blue-600 mb-4">Você foi convidado para compartilhar uma planilha:</p>
          {pendingInvites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-3 bg-white rounded-lg mb-1.5 border border-blue-100">
              <span className="text-sm">Convite de <strong>{inv.owner_id.slice(0, 8)}...</strong></span>
              <div className="flex gap-1.5">
                <button onClick={() => acceptInvite(inv)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer">Aceitar</button>
                <button onClick={() => declineInvite(inv.id)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer">Recusar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compartilhar planilha */}
      <CollapsibleSection title="Compartilhar Planilha">
        {shares.length > 0 && (
          <div className="mt-3">
            <div className="text-[0.7rem] t-text-dim font-semibold mb-1.5">PESSOAS COM ACESSO</div>
            {shares.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{s.shared_email}</span>
                  <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${s.accepted ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                    {s.accepted ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
                <button onClick={() => removeShare(s.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[0.72rem] font-semibold hover:bg-red-100 cursor-pointer flex-shrink-0 ml-2">Remover</button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Categorias (unificado com membros e workspaces) */}
      <CategoriesBlock
        catTab={catTab} setCatTab={setCatTab}
        customCats={customCats} customPays={customPays} customBanks={customBanks}
        addCat={addCat} editCat={editCat} deleteCat={deleteCat}
        addPay={addPay} editPay={editPay} deletePay={deletePay}
        addBank={addBank} editBank={editBank} deleteBank={deleteBank}
        members={allMembers} onAddMember={onAddMember} onEditMember={onEditMember} onDeleteMember={handleDeleteMember}
        recurringExpenses={recurringExpenses}
        onToggleRecurring={async (id, active) => {
          try { await updateRecurring(id, { active }); }
          catch { toast('Erro ao atualizar recorrência. Tente novamente.', 'error'); }
        }}
        onDeleteRecurring={(id) => {
          setConfirmModal({
            open: true,
            message: 'Excluir esta despesa recorrente?',
            onConfirm: async () => {
              try {
                await removeRecurring(id);
                toast('Recorrência excluída.', 'success');
              } catch {
                toast('Erro ao excluir recorrência. Tente novamente.', 'error');
              }
            },
          });
        }}
        categoryBudgets={state.categoryBudgets}
        onBudgetChange={(cat, value) => {
          setState(prev => ({
            ...prev,
            categoryBudgets: { ...prev.categoryBudgets, [cat]: value },
          }));
        }}
        workspaces={workspaces} activeWorkspace={activeWorkspace}
        onDeleteWorkspace={(ws) => {
          setConfirmModal({
            open: true,
            message: `Excluir o espaço "${ws.label}"? Todos os membros e lançamentos deste espaço serão removidos permanentemente. Esta ação não pode ser desfeita.`,
            onConfirm: async () => {
              const wsId = ws.workspaceId;
              if (!wsId) return;
              await supabase.from('expenses').delete().eq('workspace_id', wsId);
              await supabase.from('members').delete().eq('workspace_id', wsId);
              await supabase.from('shares').delete().eq('workspace_id', wsId);
              await supabase.from('workspaces').delete().eq('id', wsId);
              toast(`Espaço "${ws.label}" excluído.`, 'success');
              if (onWorkspaceDeleted) onWorkspaceDeleted();
            },
          });
        }}
      />

      {/* Zona de perigo */}
      <div className="t-card border border-red-200 rounded-xl p-6 mt-6">
        <h3 className="text-base font-bold text-red-600 mb-2">Zona de perigo</h3>
        <p className="text-sm t-text-muted mb-4">
          Ao excluir sua conta, todos os seus dados serão permanentemente removidos, incluindo membros, lançamentos, configurações e convites. Esta ação não pode ser desfeita.
        </p>
        {!deleteConfirmOpen ? (
          <button onClick={() => setDeleteConfirmOpen(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer">
            Excluir minha conta e todos os dados
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-semibold mb-2">Tem certeza absoluta?</p>
            <p className="text-xs text-red-600 mb-3">
              Digite <strong>EXCLUIR</strong> para confirmar a exclusao permanente da sua conta e de todos os seus dados.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm mb-3 focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'EXCLUIR' || deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {deleting ? 'Excluindo...' : 'Confirmar exclusao permanente'}
              </button>
              <button
                onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText(''); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <InputModal
        isOpen={inputModalOpen}
        onClose={() => setInputModalOpen(false)}
        onConfirm={handleInputModalConfirm}
        title={
          inputModalConfig.type === 'cat' ? 'Nova Categoria' :
          inputModalConfig.type === 'editCat' ? 'Editar Categoria' :
          inputModalConfig.type === 'pay' ? 'Nova Forma de Pagamento' :
          inputModalConfig.type === 'editPay' ? 'Editar Forma de Pagamento' :
          inputModalConfig.type === 'bank' ? 'Nova Instituição Financeira' :
          'Editar Instituição Financeira'
        }
        placeholder={
          inputModalConfig.type === 'cat' || inputModalConfig.type === 'editCat'
            ? 'Nome da categoria...'
            : inputModalConfig.type === 'bank' || inputModalConfig.type === 'editBank'
            ? 'Nome da instituição...'
            : 'Nome da forma de pagamento...'
        }
        defaultValue={inputModalConfig.defaultValue || ''}
      />

      <DeleteModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, open: false })); }}
        message={confirmModal.message}
      />
    </>
  );
}
