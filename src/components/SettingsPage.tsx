'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useTheme, type ThemeMode, type AccentColor } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { EXPENSE_CATS, BASE_PAYMENTS } from '@/lib/constants';
import { Avatar } from './Sidebar';

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

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'EXCLUIR') return;
    setDeleting(true);
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      alert('Erro ao excluir conta: ' + error.message);
      setDeleting(false);
      return;
    }
    await signOut();
  }

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [shares, setShares] = useState<Share[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const loadShares = useCallback(async () => {
    if (!user) return;
    // My sent invites
    const { data } = await supabase.from('shares').select('*').eq('owner_id', user.id);
    setShares(data || []);

    // Invites I received
    const { data: received } = await supabase.from('shares').select('*').eq('shared_email', user.email).eq('accepted', false);
    setPendingInvites(received || []);
  }, [user]);

  useEffect(() => { loadShares(); }, [loadShares]);

  async function sendInvite() {
    if (!inviteEmail.trim() || !user) return;
    setInviteError('');
    setInviteMsg('');
    setInviteLoading(true);

    if (inviteEmail.toLowerCase() === user.email?.toLowerCase()) {
      setInviteError('Você não pode convidar a si mesmo.');
      setInviteLoading(false);
      return;
    }

    const { error } = await supabase.from('shares').insert({
      owner_id: user.id,
      shared_email: inviteEmail.toLowerCase().trim(),
    });

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setInviteError('Este email ja foi convidado.');
      } else {
        setInviteError(error.message);
      }
    } else {
      setInviteMsg(`Convite enviado para ${inviteEmail}!`);
      setInviteEmail('');
      loadShares();
    }
    setInviteLoading(false);
  }

  async function removeInvite(id: string) {
    if (!confirm('Remover este convite?')) return;
    await supabase.from('shares').delete().eq('id', id);
    loadShares();
  }

  async function acceptInvite(invite: PendingInvite) {
    if (!user) return;
    await supabase.from('shares').update({
      shared_user_id: user.id,
      accepted: true,
    }).eq('id', invite.id);
    loadShares();
    // Reload page to pick up shared data
    window.location.reload();
  }

  async function declineInvite(id: string) {
    await supabase.from('shares').delete().eq('id', id);
    loadShares();
  }

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
    const msg = inUse > 0 ? `"${catName}" está em uso em ${inUse} lançamento(s). Excluir?` : `Excluir "${catName}"?`;
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
    const msg = inUse > 0 ? `"${payName}" está em uso em ${inUse} lançamento(s). Excluir?` : `Excluir "${payName}"?`;
    if (!confirm(msg)) return;
    setState(prev => ({ ...prev, customPayments: prev.customPayments.filter((_, idx) => idx !== i) }));
  }
  function handleDeleteMember(id: string) {
    const member = state.members.find(m => m.id === id);
    if (!member) return;
    const inUse = state.expenses.filter(e => e.memberId === id).length;
    const msg = inUse > 0 ? `Excluir "${member.name}"? ${inUse} lançamento(s) serao excluidos.` : `Excluir "${member.name}"?`;
    if (!confirm(msg)) return;
    removeMember(id);
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
        <p className="text-sm text-slate-400 mb-4">Convide alguem para ver e editar sua planilha financeira.</p>
        <div className="flex gap-2 mb-3">
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="Email da pessoa..."
            onKeyDown={e => e.key === 'Enter' && sendInvite()}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <button onClick={sendInvite} disabled={inviteLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
            {inviteLoading ? '...' : 'Convidar'}
          </button>
        </div>
        {inviteError && <div className="text-red-600 text-sm mb-2">{inviteError}</div>}
        {inviteMsg && <div className="text-green-600 text-sm mb-2">{inviteMsg}</div>}

        {shares.length > 0 && (
          <div className="mt-3">
            <div className="text-[0.78rem] text-slate-400 font-semibold mb-2">CONVITES ENVIADOS</div>
            {shares.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.shared_email}</span>
                  <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-semibold ${s.accepted ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                    {s.accepted ? 'Aceito' : 'Pendente'}
                  </span>
                </div>
                <button onClick={() => removeInvite(s.id)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[0.78rem] font-semibold hover:bg-red-100 cursor-pointer">Remover</button>
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
