'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useTheme, type AccentColor } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { EXPENSE_CATS, BASE_PAYMENTS, BASE_BANKS } from '@/lib/constants';
import type { Member } from '@/lib/types';
import { Tag, CreditCard, Landmark, Users, FolderOpen, Link, Copy, Check, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react';
import { useToast } from './Toast';
import InputModal from './InputModal';
import DeleteModal from './DeleteModal';

interface Workspace {
  id: string;
  userId: string;
  workspaceId?: string;
  label: string;
  icon: string;
  isOwn: boolean;
}

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
  const { state, setState, removeMember, getIndividualMembers } = useStore();
  const { user } = useAuth();
  const customCats = state.customCats || [];
  const customPays = state.customPayments || [];
  const customBanks = state.customBanks || [];
  const individuals = getIndividualMembers();
  const conjuntas = state.members.filter(m => m.id !== 'all' && m.isConjunta);
  const allMembers = [...individuals, ...conjuntas];
  const ownWorkspaces = workspaces.filter(w => w.isOwn);

  // Delete account state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();

  // InputModal state
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{ type: 'cat' | 'pay' | 'editCat' | 'editPay' | 'bank' | 'editBank'; index?: number; defaultValue?: string }>({ type: 'cat' });

  // DeleteModal state for confirmations
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });

  // Categories unified tab
  const [catTab, setCatTab] = useState<'cats' | 'pays' | 'banks' | 'members' | 'workspaces'>('cats');

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

  const [inviteWorkspace, setInviteWorkspace] = useState<string>('current');

  async function generateInviteLink() {
    if (!user) return;
    setInviteLoading(true);
    setInviteMsg('');
    setGeneratedLink('');

    // Determinar workspace_id do convite
    let wsId: string | null = null;
    if (inviteWorkspace === 'current') {
      wsId = activeWorkspace?.workspaceId || null;
    } else if (inviteWorkspace !== 'personal') {
      wsId = inviteWorkspace;
    }

    const insertData: Record<string, unknown> = { owner_id: user.id };
    if (wsId) insertData.workspace_id = wsId;

    const { data, error } = await supabase.from('invite_links').insert(insertData).select('code').single();

    if (error) {
      toast('Erro ao gerar link.', 'error');
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
      <CollapsibleSection title="Compartilhar Planilha" action={
        <button onClick={(e) => { e.stopPropagation(); generateInviteLink(); }} disabled={inviteLoading}
          className="px-3 py-1.5 t-accent-bg text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
          {inviteLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : <Link size={14} />}
          {inviteLoading ? 'Gerando...' : 'Gerar convite'}
        </button>
      }>

        {/* Workspace selector para convite */}
        {ownWorkspaces.length > 1 && (
          <div className="mb-3">
            <div className="text-[0.7rem] t-text-dim font-semibold mb-1.5">CONVIDAR PARA</div>
            <select
              value={inviteWorkspace}
              onChange={e => setInviteWorkspace(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm t-input"
            >
              <option value="current">{activeWorkspace?.icon} {activeWorkspace?.label || 'Espaço atual'}</option>
              {ownWorkspaces.filter(w => w.id !== activeWorkspace?.id).map(ws => (
                <option key={ws.id} value={ws.workspaceId || 'personal'}>{ws.icon} {ws.label}</option>
              ))}
            </select>
          </div>
        )}

        {generatedLink && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="flex gap-2">
              <input type="text" readOnly value={generatedLink}
                className="flex-1 px-3 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none" />
              <button onClick={() => copyLink(generatedLink)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer whitespace-nowrap">
                {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
              </button>
            </div>
            <p className="text-[0.68rem] text-blue-500 mt-1.5">Expira em 7 dias. Uso único.</p>
          </div>
        )}

        {/* Pessoas com acesso */}
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
              await supabase.from('invite_links').delete().eq('workspace_id', wsId);
              await supabase.from('workspaces').delete().eq('id', wsId);
              toast(`Espaço "${ws.label}" excluído.`, 'success');
              if (onWorkspaceDeleted) onWorkspaceDeleted();
            },
          });
        }}
      />

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

function CollapsibleSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
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

type CatTabId = 'cats' | 'pays' | 'banks' | 'members' | 'workspaces';

function CategoriesBlock({ catTab, setCatTab, customCats, customPays, customBanks,
  addCat, editCat, deleteCat, addPay, editPay, deletePay, addBank, editBank, deleteBank,
  members, onAddMember, onEditMember, onDeleteMember,
  workspaces = [], activeWorkspace, onDeleteWorkspace,
}: {
  catTab: CatTabId;
  setCatTab: (t: CatTabId) => void;
  customCats: string[]; customPays: string[]; customBanks: string[];
  addCat: () => void; editCat: (i: number) => void; deleteCat: (i: number) => void;
  addPay: () => void; editPay: (i: number) => void; deletePay: (i: number) => void;
  addBank: () => void; editBank: (i: number) => void; deleteBank: (i: number) => void;
  members: Member[]; onAddMember: () => void; onEditMember: (id: string) => void; onDeleteMember: (id: string) => void;
  workspaces?: Workspace[]; activeWorkspace?: Workspace;
  onDeleteWorkspace?: (ws: Workspace) => void;
}) {
  const [open, setOpen] = useState(false);

  const tabs: { id: CatTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'cats', label: 'Despesas', icon: <Tag size={14} /> },
    { id: 'pays', label: 'Pagamento', icon: <CreditCard size={14} /> },
    { id: 'banks', label: 'Instituições', icon: <Landmark size={14} /> },
    { id: 'members', label: 'Membros', icon: <Users size={14} /> },
    ...(workspaces.filter(w => w.isOwn && w.id !== 'personal').length > 0
      ? [{ id: 'workspaces' as CatTabId, label: 'Espaços', icon: <FolderOpen size={14} /> }]
      : []),
  ];

  const defaults: Record<string, string[]> = {
    cats: EXPENSE_CATS,
    pays: BASE_PAYMENTS,
    banks: BASE_BANKS,
  };

  const customs: Record<string, string[]> = { cats: customCats, pays: customPays, banks: customBanks };
  const addFn: Record<string, () => void> = { cats: addCat, pays: addPay, banks: addBank };
  const editFn: Record<string, (i: number) => void> = { cats: editCat, pays: editPay, banks: editBank };
  const deleteFn: Record<string, (i: number) => void> = { cats: deleteCat, pays: deletePay, banks: deleteBank };
  const addLabels: Record<string, string> = { cats: '+ Nova categoria', pays: '+ Nova forma', banks: '+ Nova instituição' };

  const isPillTab = catTab === 'cats' || catTab === 'pays' || catTab === 'banks';

  return (
    <div className="t-card rounded-xl border mb-6 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-80 transition-colors">
        <h3 className="text-sm font-bold t-text">Categorias</h3>
        <ChevronDown size={14} className="t-text-dim transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && (
        <div className="px-5 pb-5">
          {/* Tabs */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setCatTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  catTab === t.id ? 't-accent-bg text-white shadow-sm' : 'bg-slate-100 t-text-muted hover:bg-slate-200'
                }`}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Pills content (cats, pays, banks) */}
          {isPillTab && (
            <>
              <div className="mb-3">
                <div className="text-[0.7rem] t-text-dim font-semibold mb-1.5">PADRÃO</div>
                <div className="flex flex-wrap gap-1.5">
                  {defaults[catTab].map(item => (
                    <span key={item} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs">{item}</span>
                  ))}
                </div>
              </div>

              {customs[catTab].length > 0 && (
                <div className="mb-3">
                  <div className="text-[0.7rem] t-text-dim font-semibold mb-1.5">PERSONALIZADAS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {customs[catTab].map((item, i) => (
                      <ItemPill key={i} label={item} onEdit={() => editFn[catTab](i)} onDelete={() => deleteFn[catTab](i)} />
                    ))}
                  </div>
                </div>
              )}

              <button onClick={addFn[catTab]}
                className="px-2.5 py-1 border border-dashed border-slate-300 rounded-full text-xs font-semibold t-text-dim hover:border-slate-400 hover:t-text cursor-pointer transition-colors">
                {addLabels[catTab]}
              </button>
            </>
          )}

          {/* Members */}
          {catTab === 'members' && (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {members.map(m => (
                  <ItemPill key={m.id} label={m.name} onEdit={() => onEditMember(m.id)} onDelete={() => onDeleteMember(m.id)} />
                ))}
              </div>
              <button onClick={onAddMember}
                className="px-2.5 py-1 border border-dashed border-slate-300 rounded-full text-xs font-semibold t-text-dim hover:border-slate-400 hover:t-text cursor-pointer transition-colors">
                + Adicionar membro
              </button>
            </>
          )}

          {/* Workspaces */}
          {catTab === 'workspaces' && (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {workspaces.filter(w => w.isOwn && w.id !== 'personal').map(ws => (
                  <ItemPill
                    key={ws.id}
                    label={`${ws.icon} ${ws.label}${activeWorkspace?.id === ws.id ? ' (ativo)' : ''}`}
                    onEdit={() => {}}
                    onDelete={() => onDeleteWorkspace?.(ws)}
                  />
                ))}
              </div>
              <p className="text-xs t-text-dim">O espaço "Pessoal" não pode ser excluído.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ItemPill({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPos({
        top: spaceBelow > 90 ? rect.bottom + 4 : rect.top - 88,
        left: rect.left,
      });
    }
    setMenuOpen(!menuOpen);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border border-[var(--accent)] t-accent bg-[var(--accent-light)] hover:opacity-80"
      >
        {label}
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setMenuOpen(false)} />
          <div className="fixed t-card border rounded-lg shadow-lg z-[999] min-w-[120px] overflow-hidden"
            style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onEdit(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm t-text hover:bg-slate-50 cursor-pointer flex items-center gap-2 transition-colors">
              <Pencil size={14} /> Editar
            </button>
            <button onClick={() => { onDelete(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-2 transition-colors">
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        </>
      )}
    </>
  );
}
