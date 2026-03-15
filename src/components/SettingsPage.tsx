'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useTheme, type ThemeMode, type AccentColor } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { EXPENSE_CATS, BASE_PAYMENTS } from '@/lib/constants';
import { Avatar } from './Sidebar';
import { useToast } from './Toast';
import InputModal from './InputModal';
import DeleteModal from './DeleteModal';

interface Props {
  onAddMember: () => void;
  onEditMember: (id: string) => void;
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

export default function SettingsPage({ onAddMember, onEditMember }: Props) {
  const { state, setState, removeMember, getIndividualMembers } = useStore();
  const { user } = useAuth();
  const customCats = state.customCats || [];
  const customPays = state.customPayments || [];
  const individuals = getIndividualMembers();
  const conjuntas = state.members.filter(m => m.id !== 'all' && m.isConjunta);
  const allMembers = [...individuals, ...conjuntas];

  // Delete account state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();

  // InputModal state
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{ type: 'cat' | 'pay' | 'editCat' | 'editPay'; index?: number; defaultValue?: string }>({ type: 'cat' });

  // DeleteModal state for confirmations
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });

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

  // Invite state
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [shares, setShares] = useState<Share[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [inviteLinks, setInviteLinks] = useState<{id: string; code: string; used_by: string | null; created_at: string; expires_at: string}[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [copied, setCopied] = useState(false);

  const loadShares = useCallback(async () => {
    if (!user) return;
    // Meus convites aceitos
    const { data } = await supabase.from('shares').select('*').eq('owner_id', user.id);
    setShares(data || []);

    // Meus links de convite
    const { data: links } = await supabase.from('invite_links').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    setInviteLinks(links || []);

    // Convites que recebi (pendentes)
    const { data: received } = await supabase.from('shares').select('*').eq('shared_email', user.email).eq('accepted', false);
    setPendingInvites(received || []);
  }, [user]);

  useEffect(() => { loadShares(); }, [loadShares]);

  async function generateInviteLink() {
    if (!user) return;
    setInviteLoading(true);
    setInviteMsg('');
    setGeneratedLink('');

    const { data, error } = await supabase.from('invite_links').insert({
      owner_id: user.id,
    }).select('code').single();

    if (error) {
      setInviteMsg('Erro ao gerar link.');
    } else if (data) {
      const link = `${window.location.origin}/convite?code=${data.code}`;
      setGeneratedLink(link);
      setCopied(false);
      loadShares();
    }
    setInviteLoading(false);
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function removeInviteLink(id: string) {
    setConfirmModal({
      open: true,
      message: 'Remover este link de convite?',
      onConfirm: async () => {
        await supabase.from('invite_links').delete().eq('id', id);
        toast('Link removido.', 'success');
        loadShares();
      },
    });
  }

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
    const msg = inUse > 0 ? `"${catName}" está em uso em ${inUse} lançamento(s). Excluir mesmo assim?` : `Excluir "${catName}"?`;
    setConfirmModal({
      open: true, message: msg,
      onConfirm: () => {
        setState(prev => ({ ...prev, customCats: prev.customCats.filter((_, idx) => idx !== i) }));
        toast(`Categoria "${catName}" excluída.`, 'success');
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
      onConfirm: () => {
        removeMember(id);
        toast(`Membro "${member.name}" excluído.`, 'success');
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
    }
  }

  const { mode, setMode, accent, setAccent } = useTheme();

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
      {/* Tema */}
      <div className="t-card border rounded-xl p-6 mb-6">
        <h3 className="text-base font-bold mb-4 t-text">Aparencia</h3>

        {/* Mode */}
        <div className="mb-5">
          <div className="text-[0.78rem] t-text-dim font-semibold mb-2.5">MODO</div>
          <div className="flex gap-3">
            {(['light', 'dark'] as ThemeMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
                  mode === m ? 'border-[var(--accent)] t-accent-light' : 't-border t-card-hover border'
                }`}>
                <span className="text-lg">{m === 'light' ? '☀️' : '🌙'}</span>
                <span className="t-text">{m === 'light' ? 'Claro' : 'Escuro'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <div className="text-[0.78rem] t-text-dim font-semibold mb-2.5">COR DE DESTAQUE</div>
          <div className="flex gap-3 flex-wrap">
            {accentColors.map(c => (
              <button key={c.id} onClick={() => setAccent(c.id)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer min-w-[70px] ${
                  accent === c.id ? 'border-[var(--accent)] scale-105' : 't-border'
                }`}>
                <div className="w-8 h-8 rounded-full shadow-sm" style={{ background: c.color }}></div>
                <span className="text-[0.7rem] t-text-muted font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Convites recebidos */}
      {pendingInvites.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="text-base font-bold mb-3 text-blue-800">📩 Convites Pendentes</h3>
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
      <div className="t-card rounded-xl p-6 border mb-6">
        <h3 className="text-base font-bold mb-1">Compartilhar Planilha</h3>
        <p className="text-sm text-slate-400 mb-4">Gere um link de convite e envie para quem quiser compartilhar sua planilha.</p>

        <button onClick={generateInviteLink} disabled={inviteLoading}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer mb-3 flex items-center gap-2">
          {inviteLoading ? '⏳ Gerando...' : '🔗 Gerar link de convite'}
        </button>

        {generatedLink && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
            <div className="text-xs text-blue-600 font-semibold mb-2">Link gerado! Envie para a pessoa:</div>
            <div className="flex gap-2">
              <input type="text" readOnly value={generatedLink}
                className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none" />
              <button onClick={() => copyLink(generatedLink)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 cursor-pointer whitespace-nowrap">
                {copied ? '✅ Copiado!' : '📋 Copiar'}
              </button>
            </div>
            <p className="text-[0.72rem] text-blue-500 mt-2">Este link expira em 7 dias e pode ser usado apenas uma vez.</p>
          </div>
        )}

        {inviteMsg && <div className="text-green-600 text-sm mb-2">{inviteMsg}</div>}

        {/* Pessoas com acesso */}
        {shares.length > 0 && (
          <div className="mt-4">
            <div className="text-[0.78rem] text-slate-400 font-semibold mb-2">PESSOAS COM ACESSO</div>
            {shares.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.shared_email}</span>
                  <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-semibold ${s.accepted ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                    {s.accepted ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
                <button onClick={() => removeShare(s.id)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[0.78rem] font-semibold hover:bg-red-100 cursor-pointer">Remover</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categorias */}
      <div className="t-card rounded-xl p-6 border mb-6">
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
      <div className="t-card rounded-xl p-6 border mb-6">
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
      <div className="t-card rounded-xl p-6 border mb-6">
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

      {/* Zona de perigo - Excluir conta */}
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
          'Editar Forma de Pagamento'
        }
        placeholder={
          inputModalConfig.type === 'cat' || inputModalConfig.type === 'editCat'
            ? 'Nome da categoria...'
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

function ItemRow({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1.5">
        <button onClick={onEdit} className="px-3 py-2 md:py-1 border border-slate-200 rounded-lg text-[0.78rem] font-semibold hover:bg-white cursor-pointer min-h-[36px] md:min-h-0">Editar</button>
        <button onClick={onDelete} className="px-3 py-2 md:py-1 bg-red-50 text-red-600 rounded-lg text-[0.78rem] font-semibold hover:bg-red-100 cursor-pointer min-h-[36px] md:min-h-0">Excluir</button>
      </div>
    </div>
  );
}
