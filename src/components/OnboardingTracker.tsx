'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle2, Circle, Clock, AlertCircle,
  Users, Eye, EyeOff, ChevronDown, ChevronUp,
  RefreshCw, Zap, TrendingUp, ArrowRight,
  Building2, Scale, DollarSign, UserCheck,
  MessageSquare, FileText, Palette, Video, Star, Rocket,
  PartyPopper
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────
type Status = 'pending' | 'in_progress' | 'done' | 'blocked'
type PlanMode = 'pro' | 'pro_ads' | 'upsell'
type ViewMode = 'team' | 'client'

interface Step {
  id: string
  title: string
  responsible: string
  deadline?: string
  clientVisible: boolean
  clientLabel?: string
  plans: PlanMode[]
  parallel?: boolean
}

interface Phase {
  id: string
  title: string
  icon: React.ReactNode
  clientTitle: string
  clientDescription: string
  steps: Step[]
}

// ── Responsible party metadata ─────────────────────────────────────────────
const RESP: Record<string, { label: string; bg: string; color: string }> = {
  comercial:   { label: 'Comercial',    bg: '#f3e8ff', color: '#7c3aed' },
  juridico:    { label: 'Jurídico',     bg: '#dbeafe', color: '#1d4ed8' },
  financeiro:  { label: 'Financeiro',   bg: '#dcfce7', color: '#15803d' },
  gestora:     { label: 'Gestora',      bg: '#fef9c3', color: '#a16207' },
  atendimento: { label: 'Atendimento',  bg: '#ffedd5', color: '#c2410c' },
  social:      { label: 'Social Media', bg: '#fce7f3', color: '#be185d' },
  criacao:     { label: 'Criação',      bg: '#fee2e2', color: '#b91c1c' },
  audiovisual: { label: 'Audiovisual',  bg: '#fef3c7', color: '#92400e' },
  trafego:     { label: 'Tráfego',      bg: '#cffafe', color: '#0e7490' },
  barbara:     { label: 'Bárbara',      bg: '#ede9fe', color: '#6d28d9' },
  diretor:     { label: 'Dir. Criação', bg: '#e0e7ff', color: '#3730a3' },
  cliente:     { label: 'Cliente',      bg: '#d1fae5', color: '#065f46' },
}

// ── Process data ───────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  {
    id: 'contrato',
    title: 'Contrato & Pagamento',
    icon: <Scale size={16} />,
    clientTitle: 'Formalização',
    clientDescription: 'Assinatura do contrato e confirmação do pagamento',
    steps: [
      {
        id: 'c1', title: 'Vendeu e coletou dados do cliente', responsible: 'comercial',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'c2', title: 'Dados enviados para BPO', responsible: 'juridico',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'c3', title: 'Contrato enviado para assinatura', responsible: 'juridico',
        plans: ['pro', 'pro_ads', 'upsell'], clientVisible: true,
        clientLabel: 'Seu contrato foi enviado — assine para prosseguir',
      },
      {
        id: 'c4', title: 'Assinatura conferida → enviado ao financeiro', responsible: 'juridico',
        plans: ['pro', 'pro_ads', 'upsell'], clientVisible: false,
      },
      {
        id: 'c5', title: 'Pagamento confirmado → OK para a gestora', responsible: 'financeiro',
        plans: ['pro', 'pro_ads', 'upsell'], clientVisible: true,
        clientLabel: 'Pagamento confirmado! Estamos prontos para começar.',
      },
    ],
  },
  {
    id: 'squad',
    title: 'Formação do Squad',
    icon: <Users size={16} />,
    clientTitle: 'Preparando seu time',
    clientDescription: 'Montamos a equipe dedicada ao seu projeto',
    steps: [
      {
        id: 's1', title: 'Squad definido para atendimento', responsible: 'gestora',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 's2', title: 'Grupo criado + boas-vindas pelo atendimento', responsible: 'gestora',
        plans: ['pro', 'pro_ads'], clientVisible: true,
        clientLabel: 'Seu grupo foi criado! Nossa equipe já entrou em contato.',
      },
      {
        id: 's3', title: 'Briefing enviado (prazo cliente: 2 dias úteis)', responsible: 'atendimento',
        deadline: '2 dias úteis',
        plans: ['pro', 'pro_ads'], clientVisible: true,
        clientLabel: 'Briefing enviado para você — prazo de resposta: 2 dias úteis',
      },
    ],
  },
  {
    id: 'reuniao',
    title: 'Briefing & 1ª Reunião',
    icon: <MessageSquare size={16} />,
    clientTitle: 'Primeira reunião estratégica',
    clientDescription: 'Analisamos seu briefing e nos reunimos com toda a equipe',
    steps: [
      {
        id: 'r1', title: 'Briefing recebido do cliente', responsible: 'cliente',
        plans: ['pro', 'pro_ads', 'upsell'], clientVisible: true,
        clientLabel: 'Você enviou o briefing ✓',
      },
      {
        id: 'r2', title: 'Primeira reunião agendada (2 dias úteis após briefing)', responsible: 'atendimento',
        deadline: '2 dias úteis após briefing',
        plans: ['pro', 'pro_ads', 'upsell'], clientVisible: true,
        clientLabel: 'Sua primeira reunião estratégica está agendada',
      },
      {
        id: 'r3', title: 'Reunião realizada — todo squad + Bárbara participam (social pega acessos e cores ao vivo)', responsible: 'gestora',
        plans: ['pro', 'pro_ads', 'upsell'], clientVisible: true,
        clientLabel: 'Realizamos a reunião de alinhamento com toda a equipe',
      },
      {
        id: 'r4', title: 'Figma criado com todos os processos', responsible: 'atendimento',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
    ],
  },
  {
    id: 'producao',
    title: 'Produção de Conteúdo',
    icon: <Palette size={16} />,
    clientTitle: 'Criando seu conteúdo',
    clientDescription: 'Nossa equipe está desenvolvendo a estratégia visual e editorial',
    steps: [
      {
        id: 'p1', title: 'Análise de perfil, linhas editoriais e 4 primeiras artes (copy)', responsible: 'social',
        deadline: '4 dias úteis',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'p2', title: 'Moodboard visual (foto e vídeo) no Figma', responsible: 'audiovisual',
        deadline: '4 dias úteis', parallel: true,
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'p3', title: 'Moodboarding de criação', responsible: 'criacao',
        deadline: '4 dias úteis', parallel: true,
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'p4', title: 'Estratégia de tráfego criada e adicionada no Figma', responsible: 'trafego',
        deadline: '4 dias úteis',
        plans: ['pro_ads'], clientVisible: false,
      },
    ],
  },
  {
    id: 'aprovacao',
    title: 'Aprovações Internas',
    icon: <CheckCircle2 size={16} />,
    clientTitle: 'Revisão interna',
    clientDescription: 'Revisamos e aprovamos todo o material antes de apresentar para você',
    steps: [
      {
        id: 'a1', title: 'Bárbara aprova Social Media', responsible: 'barbara',
        deadline: 'Até dia 5',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'a2', title: 'Diretor de Criação aprova moodboarding', responsible: 'diretor',
        deadline: 'Até dia 5', parallel: true,
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'a3', title: 'Alterações realizadas no mesmo dia (se houver)', responsible: 'criacao',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'a4', title: 'Bárbara notifica gestora na aprovação', responsible: 'barbara',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'a5', title: 'Aprovação da estratégia de tráfego', responsible: 'gestora',
        deadline: 'Dia 5',
        plans: ['pro_ads'], clientVisible: false,
      },
      {
        id: 'a6', title: 'Solicitação de criativos para a criação', responsible: 'gestora',
        plans: ['pro_ads'], clientVisible: false,
      },
    ],
  },
  {
    id: 'entrega',
    title: 'Artes & Apresentação Final',
    icon: <Rocket size={16} />,
    clientTitle: 'Apresentação para você',
    clientDescription: 'Apresentamos todo o trabalho desenvolvido e aguardamos sua aprovação',
    steps: [
      {
        id: 'e1', title: 'Gestora sobe arte para criação', responsible: 'gestora',
        deadline: '3 dias úteis',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'e2', title: 'Criativos de tráfego produzidos', responsible: 'criacao',
        deadline: '3 dias úteis', parallel: true,
        plans: ['pro_ads'], clientVisible: false,
      },
      {
        id: 'e3', title: 'Aprovação das primeiras artes', responsible: 'barbara',
        deadline: '4º dia',
        plans: ['pro', 'pro_ads'], clientVisible: false,
      },
      {
        id: 'e4', title: 'Aprovação total (tráfego + artes)', responsible: 'gestora',
        deadline: 'Dia 10',
        plans: ['pro_ads'], clientVisible: false,
      },
      {
        id: 'e5', title: 'Reunião de apresentação final (5º dia = 10º após 1ª reunião)', responsible: 'atendimento',
        deadline: 'Dia 5 / Dia 10',
        plans: ['pro', 'pro_ads', 'upsell'], clientVisible: true,
        clientLabel: 'Reunião de apresentação de todo o trabalho desenvolvido',
      },
      {
        id: 'e6', title: 'Onboarding aprovado → início das publicações', responsible: 'cliente',
        plans: ['pro', 'pro_ads', 'upsell'], clientVisible: true,
        clientLabel: 'Você aprovou! As publicações começarão em breve.',
      },
    ],
  },
]

// Upsell has a reduced process
const UPSELL_PHASES: Phase[] = [
  {
    id: 'contrato',
    title: 'Novo Contrato',
    icon: <Scale size={16} />,
    clientTitle: 'Formalização do Upsell',
    clientDescription: 'Assinatura do novo contrato',
    steps: [
      {
        id: 'u1', title: 'Contrato enviado para assinatura', responsible: 'juridico',
        plans: ['upsell'], clientVisible: true,
        clientLabel: 'Seu novo contrato foi enviado — assine para prosseguir',
      },
      {
        id: 'u2', title: 'Assinatura conferida', responsible: 'juridico',
        plans: ['upsell'], clientVisible: false,
      },
    ],
  },
  {
    id: 'reuniao_upsell',
    title: 'Reunião de Alinhamento',
    icon: <MessageSquare size={16} />,
    clientTitle: 'Reunião de alinhamento',
    clientDescription: 'Alinhamos a nova estratégia com você',
    steps: [
      {
        id: 'u3', title: 'Reunião agendada em até 2 dias (atendimento + gestor + líder de tráfego + cliente)', responsible: 'atendimento',
        deadline: '2 dias após assinatura',
        plans: ['upsell'], clientVisible: true,
        clientLabel: 'Reunião de alinhamento agendada com toda a equipe',
      },
      {
        id: 'u4', title: 'Reunião realizada', responsible: 'gestora',
        plans: ['upsell'], clientVisible: true,
        clientLabel: 'Reunião realizada ✓',
      },
    ],
  },
  {
    id: 'producao_upsell',
    title: 'Criação de Estratégia',
    icon: <TrendingUp size={16} />,
    clientTitle: 'Desenvolvendo a estratégia',
    clientDescription: 'Nossa equipe está criando a estratégia e os criativos',
    steps: [
      {
        id: 'u5', title: 'Estratégia criada + solicitação de criativos (ou agendamento de captação)', responsible: 'trafego',
        deadline: '4 dias úteis',
        plans: ['upsell'], clientVisible: false,
      },
      {
        id: 'u6', title: 'Criativos produzidos', responsible: 'criacao',
        deadline: '3 dias úteis',
        plans: ['upsell'], clientVisible: false,
      },
      {
        id: 'u7', title: 'Aprovação e início', responsible: 'gestora',
        plans: ['upsell'], clientVisible: true,
        clientLabel: 'Estratégia aprovada! Começando a execução.',
      },
    ],
  },
]

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { label: 'Pendente',      icon: Circle,        color: '#94a3b8', bg: '#f1f5f9' },
  in_progress: { label: 'Em andamento',  icon: Clock,         color: '#f59e0b', bg: '#fffbeb' },
  done:        { label: 'Concluído',     icon: CheckCircle2,  color: '#10b981', bg: '#ecfdf5' },
  blocked:     { label: 'Bloqueado',     icon: AlertCircle,   color: '#ef4444', bg: '#fef2f2' },
}

const STATUS_CYCLE: Status[] = ['pending', 'in_progress', 'done', 'blocked']

// ── Helper ─────────────────────────────────────────────────────────────────
function nextStatus(s: Status): Status {
  const i = STATUS_CYCLE.indexOf(s)
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]
}

// ── Main component ─────────────────────────────────────────────────────────
export default function OnboardingTracker() {
  const [planMode, setPlanMode] = useState<PlanMode>('pro_ads')
  const [viewMode, setViewMode] = useState<ViewMode>('team')
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [clientName, setClientName] = useState('Novo Cliente')
  const [editingName, setEditingName] = useState(false)

  const phases = planMode === 'upsell' ? UPSELL_PHASES : PHASES

  const filteredPhases = useMemo(() => {
    return phases.map(phase => ({
      ...phase,
      steps: phase.steps.filter(s => s.plans.includes(planMode)),
    })).filter(phase => phase.steps.length > 0)
  }, [phases, planMode])

  const getStatus = (id: string): Status => statuses[id] ?? 'pending'

  const toggleStatus = (id: string) => {
    setStatuses(prev => ({ ...prev, [id]: nextStatus(getStatus(id)) }))
  }

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const allSteps = filteredPhases.flatMap(p => p.steps)
  const doneCount = allSteps.filter(s => getStatus(s.id) === 'done').length
  const progress = allSteps.length > 0 ? Math.round((doneCount / allSteps.length) * 100) : 0

  // Current phase for client view (first phase that isn't fully done)
  const currentPhaseIndex = useMemo(() => {
    for (let i = 0; i < filteredPhases.length; i++) {
      const allDone = filteredPhases[i].steps.every(s => getStatus(s.id) === 'done')
      if (!allDone) return i
    }
    return filteredPhases.length - 1
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPhases, statuses])

  const PLAN_LABELS: Record<PlanMode, string> = {
    pro:     'Plano Pró',
    pro_ads: 'Plano Pró + ADS',
    upsell:  'Upsell',
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>

      {/* ── Top bar ── */}
      <div style={{ background: 'var(--bg-topbar)', borderBottom: '1px solid var(--border)' }}
        className="sticky top-0 z-30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent)' }}>
                <Star size={16} color="#fff" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Onboarding
                </p>
                {editingName ? (
                  <input
                    autoFocus
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                    className="text-sm font-bold outline-none"
                    style={{ color: 'var(--text)', background: 'transparent', width: 160 }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-sm font-bold text-left hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text)' }}
                  >
                    {clientName}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Plan selector */}
            <div className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              {(['pro', 'pro_ads', 'upsell'] as PlanMode[]).map(p => (
                <button key={p}
                  onClick={() => setPlanMode(p)}
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: planMode === p ? 'var(--accent)' : 'transparent',
                    color: planMode === p ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {PLAN_LABELS[p]}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <button
                onClick={() => setViewMode('team')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: viewMode === 'team' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'team' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <Users size={13} /> Time
              </button>
              <button
                onClick={() => setViewMode('client')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: viewMode === 'client' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'client' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <Eye size={13} /> Cliente
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={() => setStatuses({})}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-80"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}
              title="Resetar todos os status"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Progress bar ── */}
        <div className="rounded-xl p-4 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Progresso geral
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {progress}% — {doneCount}/{allSteps.length} etapas
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: progress === 100 ? '#10b981' : 'var(--accent)' }}
            />
          </div>
          {progress === 100 && (
            <p className="text-xs mt-2 font-medium flex items-center gap-1" style={{ color: '#10b981' }}>
              <PartyPopper size={13} /> Onboarding concluído! Cliente pronto para publicações.
            </p>
          )}
        </div>

        {/* ── TEAM VIEW ── */}
        {viewMode === 'team' && (
          <div className="space-y-4">
            {filteredPhases.map((phase, phaseIdx) => {
              const phaseSteps = phase.steps
              const phaseDone = phaseSteps.filter(s => getStatus(s.id) === 'done').length
              const phaseBlocked = phaseSteps.some(s => getStatus(s.id) === 'blocked')
              const phaseComplete = phaseDone === phaseSteps.length
              const isCollapsed = collapsed[phase.id]

              return (
                <div key={phase.id} className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${phaseBlocked ? '#fca5a5' : phaseComplete ? '#6ee7b7' : 'var(--border)'}`, background: 'var(--bg-card)' }}>

                  {/* Phase header */}
                  <button
                    onClick={() => toggleCollapse(phase.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{ background: phaseComplete ? 'rgba(16,185,129,0.05)' : phaseBlocked ? 'rgba(239,68,68,0.05)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: phaseComplete ? '#10b981' : phaseBlocked ? '#ef4444' : 'var(--accent)',
                          color: '#fff',
                        }}>
                        {phaseIdx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--text-muted)' }}>{phase.icon}</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                            {phase.title}
                          </span>
                          {phaseBlocked && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: '#fef2f2', color: '#ef4444' }}>
                              Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {phaseDone}/{phaseSteps.length} etapas concluídas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Mini progress */}
                      <div className="w-16 h-1.5 rounded-full hidden sm:block" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(phaseDone / phaseSteps.length) * 100}%`, background: phaseComplete ? '#10b981' : 'var(--accent)' }} />
                      </div>
                      {isCollapsed ? <ChevronDown size={16} style={{ color: 'var(--text-dim)' }} /> : <ChevronUp size={16} style={{ color: 'var(--text-dim)' }} />}
                    </div>
                  </button>

                  {/* Steps */}
                  {!isCollapsed && (
                    <div style={{ borderTop: '1px solid var(--border-light)' }}>
                      {phaseSteps.map((step, stepIdx) => {
                        const status = getStatus(step.id)
                        const cfg = STATUS_CONFIG[status]
                        const Icon = cfg.icon
                        const resp = RESP[step.responsible]

                        return (
                          <div key={step.id}
                            className="flex items-start gap-3 px-4 py-3 transition-colors"
                            style={{
                              borderTop: stepIdx > 0 ? '1px solid var(--border-light)' : undefined,
                              background: status === 'blocked' ? 'rgba(239,68,68,0.03)' : status === 'done' ? 'rgba(16,185,129,0.02)' : undefined,
                            }}>

                            {/* Status toggle button */}
                            <button
                              onClick={() => toggleStatus(step.id)}
                              className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                              title={`Status: ${cfg.label} — clique para avançar`}
                            >
                              <Icon size={18} style={{ color: cfg.color }} />
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <p className="text-sm" style={{
                                  color: status === 'done' ? 'var(--text-dim)' : 'var(--text)',
                                  textDecoration: status === 'done' ? 'line-through' : undefined,
                                }}>
                                  {step.parallel && (
                                    <span className="inline-flex items-center gap-1 text-xs mr-2 px-1.5 py-0.5 rounded"
                                      style={{ background: 'var(--accent-light)', color: 'var(--accent)', verticalAlign: 'middle' }}>
                                      <Zap size={10} /> Paralelo
                                    </span>
                                  )}
                                  {step.title}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {resp && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: resp.bg, color: resp.color }}>
                                    {resp.label}
                                  </span>
                                )}
                                {step.deadline && (
                                  <span className="text-xs flex items-center gap-1"
                                    style={{ color: 'var(--text-muted)' }}>
                                    <Clock size={10} /> {step.deadline}
                                  </span>
                                )}
                                <span className="text-xs px-2 py-0.5 rounded-full"
                                  style={{ background: cfg.bg, color: cfg.color }}>
                                  {cfg.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── CLIENT VIEW ── */}
        {viewMode === 'client' && (
          <div>
            {/* Welcome banner */}
            <div className="rounded-xl p-5 mb-6 text-center"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <p className="text-xs font-medium opacity-80 mb-1">Bem-vindo ao seu onboarding</p>
              <h2 className="text-xl font-bold mb-1">{clientName}</h2>
              <p className="text-sm opacity-80">
                {PLAN_LABELS[planMode]} · {progress}% concluído
              </p>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[22px] top-0 bottom-0 w-0.5"
                style={{ background: 'var(--border)' }} />

              <div className="space-y-3">
                {filteredPhases.map((phase, idx) => {
                  const steps = phase.steps
                  const phaseDone = steps.filter(s => getStatus(s.id) === 'done').length
                  const isComplete = phaseDone === steps.length
                  const isCurrent = idx === currentPhaseIndex
                  const isPast = idx < currentPhaseIndex
                  const clientSteps = steps.filter(s => s.clientVisible)

                  return (
                    <div key={phase.id} className="flex gap-4 relative">
                      {/* Circle indicator */}
                      <div className="flex-shrink-0 z-10">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all"
                          style={{
                            background: isComplete ? '#10b981' : isCurrent ? 'var(--accent)' : 'var(--bg-card)',
                            borderColor: isComplete ? '#10b981' : isCurrent ? 'var(--accent)' : 'var(--border)',
                          }}>
                          {isComplete
                            ? <CheckCircle2 size={20} color="#fff" />
                            : isCurrent
                              ? <Clock size={18} color="#fff" />
                              : <span className="text-sm font-bold" style={{ color: 'var(--text-dim)' }}>{idx + 1}</span>
                          }
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-2">
                        <div className="rounded-xl p-4 transition-all"
                          style={{
                            background: isCurrent ? 'var(--accent-light)' : 'var(--bg-card)',
                            border: `1px solid ${isCurrent ? 'var(--accent)' : isComplete ? '#6ee7b7' : 'var(--border)'}`,
                          }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium mb-0.5"
                                style={{ color: isCurrent ? 'var(--accent)' : isComplete ? '#10b981' : 'var(--text-muted)' }}>
                                {isComplete ? '✓ Concluído' : isCurrent ? '▶ Etapa atual' : `Etapa ${idx + 1}`}
                              </p>
                              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                                {phase.clientTitle}
                              </h3>
                              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {phase.clientDescription}
                              </p>
                            </div>
                          </div>

                          {/* Client-visible steps */}
                          {(isCurrent || isComplete) && clientSteps.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {clientSteps.map(step => {
                                const status = getStatus(step.id)
                                return (
                                  <div key={step.id} className="flex items-start gap-2">
                                    <div className="mt-0.5">
                                      {status === 'done'
                                        ? <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                                        : status === 'in_progress'
                                          ? <Clock size={14} style={{ color: '#f59e0b' }} />
                                          : <Circle size={14} style={{ color: 'var(--text-dim)' }} />
                                      }
                                    </div>
                                    <p className="text-xs" style={{
                                      color: status === 'done' ? 'var(--text-muted)' : 'var(--text)',
                                      textDecoration: status === 'done' ? 'line-through' : undefined,
                                    }}>
                                      {step.clientLabel ?? step.title}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Final state */}
                {progress === 100 && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 z-10">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: '#10b981' }}>
                        <PartyPopper size={20} color="#fff" />
                      </div>
                    </div>
                    <div className="flex-1 rounded-xl p-4" style={{ background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
                      <p className="text-sm font-bold" style={{ color: '#065f46' }}>
                        Onboarding concluído!
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#047857' }}>
                        Tudo pronto. Suas publicações já podem começar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Legend (team view only) ── */}
        {viewMode === 'team' && (
          <div className="mt-6 rounded-xl p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
              LEGENDA — clique no ícone de status para avançar a etapa
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <Icon size={14} style={{ color: cfg.color }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cfg.label}</span>
                  </div>
                )
              })}
              <div className="flex items-center gap-1.5">
                <Zap size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tarefa paralela</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
