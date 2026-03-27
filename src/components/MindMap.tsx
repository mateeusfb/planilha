'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Plus, Trash2, ZoomIn, ZoomOut, Maximize2,
  ChevronRight, Download, RotateCcw
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface MindNode {
  id: string
  text: string
  x: number
  y: number
  parentId?: string
  childIds: string[]
  collapsed: boolean
  color: string
  level: number
}

type NodeMap = Record<string, MindNode>

// ── Colors per phase ────────────────────────────────────────────────────────
const PHASE_COLORS = [
  '#7c3aed', // Contrato     — purple
  '#2563eb', // Squad        — blue
  '#0891b2', // Reunião      — cyan
  '#059669', // Produção     — green
  '#d97706', // Aprovações   — amber
  '#dc2626', // Entrega      — red
  '#6366f1', // ADS          — indigo
]

// ── Initial data (onboarding process) ─────────────────────────────────────
function buildInitialNodes(): NodeMap {
  const nodes: NodeMap = {}

  const root: MindNode = {
    id: 'root',
    text: 'Onboarding de Entrada',
    x: 0, y: 0,
    childIds: [],
    collapsed: false,
    color: '#1e293b',
    level: 0,
  }
  nodes['root'] = root

  const phases = [
    {
      id: 'ph1', text: 'Contrato & Pagamento',
      steps: [
        'Comercial: vendeu e coletou dados',
        'Jurídico: enviou dados para BPO',
        'Jurídico: contrato enviado para assinatura',
        'Jurídico: conferiu assinatura → financeiro',
        'Financeiro: confirmou pagamento → OK gestora',
      ],
    },
    {
      id: 'ph2', text: 'Formação do Squad',
      steps: [
        'Definição do squad de atendimento',
        'Gestora cria o grupo',
        'Atendimento faz as boas-vindas',
        'Briefing enviado (prazo: 2 dias úteis)',
      ],
    },
    {
      id: 'ph3', text: 'Briefing & 1ª Reunião',
      steps: [
        'Cliente envia o briefing',
        'Reunião agendada (2 dias úteis após briefing)',
        '1ª Reunião: todo squad + Bárbara',
        'Social Media pega acessos e cores ao vivo',
        'Atendimento cria Figma com os processos',
      ],
    },
    {
      id: 'ph4', text: 'Produção de Conteúdo',
      steps: [
        'Social Media: análise de perfil + linhas editoriais + 4 artes (4 d.u.)',
        'Audiovisual: moodboard visual no Figma (4 d.u.) ⚡',
        'Criação: moodboarding (4 d.u.) ⚡',
      ],
    },
    {
      id: 'ph5', text: 'Aprovações Internas',
      steps: [
        'Bárbara aprova Social Media (até dia 5)',
        'Diretor aprova moodboarding (até dia 5) ⚡',
        'Alterações realizadas no mesmo dia',
        'Bárbara notifica gestora na aprovação',
      ],
    },
    {
      id: 'ph6', text: 'Artes & Apresentação Final',
      steps: [
        'Gestora sobe arte → criação (3 d.u.)',
        'Aprovação das primeiras artes (4º dia)',
        'Reunião de apresentação (5º / 10º dia)',
        'Cliente aprova → início das publicações',
      ],
    },
    {
      id: 'ph7', text: 'Plano ADS (paralelo)',
      steps: [
        'Tráfego pega todos os acessos (1ª reunião)',
        'Estratégia de tráfego + Figma (4 d.u.)',
        'Aprovação da estratégia (dia 5)',
        'Solicitação de criativos',
        'Criação produz criativos (3 d.u.)',
        'Aprovação total (dia 10)',
      ],
    },
  ]

  const phaseCount = phases.length
  const phaseR = 260

  phases.forEach((phase, pi) => {
    // Distribute phases evenly around root, starting from top-right
    const angle = ((pi / phaseCount) * 2 * Math.PI) - Math.PI / 2
    const px = Math.cos(angle) * phaseR
    const py = Math.sin(angle) * phaseR

    const phaseNode: MindNode = {
      id: phase.id,
      text: phase.text,
      x: px, y: py,
      parentId: 'root',
      childIds: [],
      collapsed: false,
      color: PHASE_COLORS[pi],
      level: 1,
    }
    nodes[phase.id] = phaseNode
    root.childIds.push(phase.id)

    // Spread steps radially out from phase
    const stepCount = phase.steps.length
    const stepR = 200
    // Angular spread: 80% of the sector allocated to this phase
    const sectorWidth = (2 * Math.PI / phaseCount) * 0.75

    phase.steps.forEach((stepText, si) => {
      const offset = stepCount > 1 ? (si / (stepCount - 1) - 0.5) * sectorWidth : 0
      const stepAngle = angle + offset
      const sx = px + Math.cos(stepAngle) * stepR
      const sy = py + Math.sin(stepAngle) * stepR

      const stepId = `${phase.id}_s${si}`
      nodes[stepId] = {
        id: stepId,
        text: stepText,
        x: sx, y: sy,
        parentId: phase.id,
        childIds: [],
        collapsed: false,
        color: PHASE_COLORS[pi],
        level: 2,
      }
      phaseNode.childIds.push(stepId)
    })
  })

  return nodes
}

// ── Bezier path between two nodes ──────────────────────────────────────────
function cubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
}

// ── Unique ID ──────────────────────────────────────────────────────────────
let _seq = 1000
function uid() { return `n${++_seq}` }

// ── Component ──────────────────────────────────────────────────────────────
export default function MindMap() {
  const [nodes, setNodes] = useState<NodeMap>(() => buildInitialNodes())
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Pan & zoom
  const [zoom, setZoom] = useState(0.72)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Drag state
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null)
  const panning = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getVisibleDescendants(id: string, acc: Set<string> = new Set()): Set<string> {
    const node = nodes[id]
    if (!node || node.collapsed) return acc
    for (const cid of node.childIds) {
      acc.add(cid)
      getVisibleDescendants(cid, acc)
    }
    return acc
  }

  function svgPoint(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    }
  }

  // ── Mouse events ──────────────────────────────────────────────────────────
  const onNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (editing) return
    e.stopPropagation()
    setSelected(id)
    const pt = svgPoint(e.clientX, e.clientY)
    dragging.current = { id, ox: pt.x - nodes[id].x, oy: pt.y - nodes[id].y }
  }, [editing, nodes, pan, zoom])

  const onSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (editing) { setEditing(null); return }
    setSelected(null)
    panning.current = { ox: e.clientX, oy: e.clientY, px: pan.x, py: pan.y }
  }, [editing, pan])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (dragging.current) {
      const pt = svgPoint(e.clientX, e.clientY)
      const { id, ox, oy } = dragging.current
      setNodes(prev => ({
        ...prev,
        [id]: { ...prev[id], x: pt.x - ox, y: pt.y - oy },
      }))
    } else if (panning.current) {
      const { ox, oy, px, py } = panning.current
      setPan({ x: px + e.clientX - ox, y: py + e.clientY - oy })
    }
  }, [nodes, pan, zoom])

  const onMouseUp = useCallback(() => {
    dragging.current = null
    panning.current = null
  }, [])

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(2.5, Math.max(0.2, z * delta)))
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    const el = containerRef.current
    if (el) el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (el) el.removeEventListener('wheel', onWheel)
    }
  }, [onMouseMove, onMouseUp, onWheel])

  // ── Edit ──────────────────────────────────────────────────────────────────
  function startEdit(id: string) {
    setEditing(id)
    setEditText(nodes[id].text)
  }

  function commitEdit() {
    if (!editing) return
    setNodes(prev => ({ ...prev, [editing]: { ...prev[editing], text: editText.trim() || prev[editing].text } }))
    setEditing(null)
  }

  // ── Add child ─────────────────────────────────────────────────────────────
  function addChild(parentId: string) {
    const parent = nodes[parentId]
    const angle = Math.random() * Math.PI * 2
    const r = parent.level === 0 ? 260 : 160
    const newNode: MindNode = {
      id: uid(),
      text: 'Novo nó',
      x: parent.x + Math.cos(angle) * r,
      y: parent.y + Math.sin(angle) * r,
      parentId,
      childIds: [],
      collapsed: false,
      color: parent.color,
      level: parent.level + 1,
    }
    setNodes(prev => ({
      ...prev,
      [newNode.id]: newNode,
      [parentId]: { ...prev[parentId], childIds: [...prev[parentId].childIds, newNode.id] },
    }))
    setSelected(newNode.id)
    setTimeout(() => startEdit(newNode.id), 50)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function deleteNode(id: string) {
    if (id === 'root') return
    const node = nodes[id]
    // Collect all descendants
    const toDelete = new Set<string>([id])
    function collect(nid: string) {
      nodes[nid]?.childIds.forEach(cid => { toDelete.add(cid); collect(cid) })
    }
    collect(id)
    setNodes(prev => {
      const next = { ...prev }
      toDelete.forEach(nid => delete next[nid])
      if (node.parentId) {
        next[node.parentId] = {
          ...next[node.parentId],
          childIds: next[node.parentId].childIds.filter(c => c !== id),
        }
      }
      return next
    })
    setSelected(null)
  }

  // ── Toggle collapse ───────────────────────────────────────────────────────
  function toggleCollapse(id: string) {
    setNodes(prev => ({ ...prev, [id]: { ...prev[id], collapsed: !prev[id].collapsed } }))
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    setNodes(buildInitialNodes())
    setSelected(null)
    setEditing(null)
    setZoom(0.72)
    setPan({ x: 0, y: 0 })
  }

  // ── Center view ───────────────────────────────────────────────────────────
  function centerView() {
    const el = containerRef.current
    if (!el) return
    setPan({ x: el.clientWidth / 2, y: el.clientHeight / 2 })
  }

  // ── Render connections ────────────────────────────────────────────────────
  function renderEdges() {
    const edges: React.ReactNode[] = []
    const visible = new Set(['root', ...getVisibleDescendants('root')])

    Object.values(nodes).forEach(node => {
      if (!node.parentId) return
      if (!visible.has(node.id) || !visible.has(node.parentId)) return
      const parent = nodes[node.parentId]
      if (!parent) return

      const key = `${node.parentId}-${node.id}`
      edges.push(
        <path
          key={key}
          d={cubicPath(parent.x, parent.y, node.x, node.y)}
          fill="none"
          stroke={node.color}
          strokeWidth={node.level === 1 ? 2.5 : 1.5}
          strokeOpacity={0.5}
        />
      )
    })
    return edges
  }

  // ── Render nodes ──────────────────────────────────────────────────────────
  function renderNodes() {
    const visible = new Set(['root', ...getVisibleDescendants('root')])
    const sel = selected

    return Object.values(nodes)
      .filter(n => visible.has(n.id))
      .map(node => {
        const isRoot = node.id === 'root'
        const isSelected = sel === node.id
        const isEditing = editing === node.id
        const hasChildren = node.childIds.length > 0
        const isCollapsed = node.collapsed

        const w = isRoot ? 180 : node.level === 1 ? 150 : 140
        const h = isRoot ? 44 : node.level === 1 ? 38 : 32
        const r = isRoot ? 22 : node.level === 1 ? 19 : 16
        const fontSize = isRoot ? 13 : node.level === 1 ? 12 : 11

        return (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            style={{ cursor: 'grab' }}
            onMouseDown={e => onNodeMouseDown(e, node.id)}
            onDoubleClick={e => { e.stopPropagation(); startEdit(node.id) }}
          >
            {/* Node background */}
            <rect
              x={-w / 2} y={-h / 2}
              width={w} height={h}
              rx={r}
              fill={isRoot ? node.color : isSelected ? node.color : '#fff'}
              stroke={node.color}
              strokeWidth={isSelected ? 2.5 : isRoot ? 0 : 1.5}
              style={{ filter: isSelected ? `drop-shadow(0 0 6px ${node.color}88)` : 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
            />

            {/* Text — if editing, show foreignObject */}
            {isEditing ? (
              <foreignObject x={-w / 2 + 6} y={-h / 2} width={w - 12} height={h}>
                <input
                  // @ts-expect-error xmlns needed for foreignObject
                  xmlns="http://www.w3.org/1999/xhtml"
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') setEditing(null)
                    e.stopPropagation()
                  }}
                  style={{
                    width: '100%', height: '100%',
                    background: 'transparent',
                    border: 'none', outline: 'none',
                    fontSize: `${fontSize}px`,
                    fontFamily: 'var(--font-roboto), sans-serif',
                    fontWeight: 600,
                    color: isRoot ? '#fff' : node.color,
                    textAlign: 'center',
                    padding: '0 4px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                />
              </foreignObject>
            ) : (
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontWeight={node.level <= 1 ? 700 : 500}
                fill={isRoot || isSelected ? '#fff' : node.color}
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'var(--font-roboto), sans-serif' }}
              >
                {node.text.length > 22 ? node.text.slice(0, 21) + '…' : node.text}
              </text>
            )}

            {/* Collapse toggle */}
            {hasChildren && !isEditing && (
              <g
                transform={`translate(${w / 2 - 2}, 0)`}
                style={{ cursor: 'pointer' }}
                onMouseDown={e => { e.stopPropagation() }}
                onClick={e => { e.stopPropagation(); toggleCollapse(node.id) }}
              >
                <circle cx={0} cy={0} r={9} fill={node.color} />
                <text
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fill="#fff"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {isCollapsed ? '+' : '−'}
                </text>
              </g>
            )}

            {/* Collapsed count badge */}
            {isCollapsed && node.childIds.length > 0 && (
              <text
                x={w / 2 + 14} y={0}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fill={node.color}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.childIds.length}
              </text>
            )}
          </g>
        )
      })
  }

  const selectedNode = selected ? nodes[selected] : null

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}
    >
      {/* ── Toolbar ── */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5 mr-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'var(--accent)' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>M</span>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            Mapa Mental — Onboarding
          </span>
        </div>

        <div className="w-px h-5" style={{ background: 'var(--border)' }} />

        {/* Selected node actions */}
        {selectedNode && (
          <>
            <button
              onClick={() => addChild(selectedNode.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              title="Adicionar nó filho"
            >
              <Plus size={13} /> Adicionar
            </button>
            {selectedNode.id !== 'root' && (
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{ background: '#fef2f2', color: '#ef4444' }}
                title="Deletar nó e filhos"
              >
                <Trash2 size={13} /> Deletar
              </button>
            )}
            <div className="w-px h-5" style={{ background: 'var(--border)' }} />
          </>
        )}

        {/* Zoom controls */}
        <button onClick={() => setZoom(z => Math.min(2.5, z * 1.2))}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }} title="Zoom in">
          <ZoomIn size={15} />
        </button>
        <span className="text-xs tabular-nums w-10 text-center" style={{ color: 'var(--text-muted)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }} title="Zoom out">
          <ZoomOut size={15} />
        </button>
        <button onClick={centerView}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }} title="Centralizar">
          <Maximize2 size={15} />
        </button>

        <div className="w-px h-5" style={{ background: 'var(--border)' }} />

        <button onClick={reset}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          title="Resetar para o original">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* ── Hint bar ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-4 py-2 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {[
          ['Arrastar nó', 'drag'],
          ['Editar', 'duplo clique'],
          ['Expandir/Recolher', 'botão ±'],
          ['Pan', 'arrastar fundo'],
          ['Zoom', 'scroll'],
        ].map(([label, key]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {key}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── SVG Canvas ── */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ cursor: panning.current ? 'grabbing' : 'default' }}
        onMouseDown={onSvgMouseDown}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Dot grid background */}
          <defs>
            <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="var(--border)" />
            </pattern>
          </defs>
          <rect
            x={-10000 / zoom} y={-10000 / zoom}
            width={20000 / zoom} height={20000 / zoom}
            fill="url(#dots)"
          />

          {/* Edges */}
          <g>{renderEdges()}</g>

          {/* Nodes */}
          <g>{renderNodes()}</g>
        </g>
      </svg>

      {/* ── Selected node detail (floating) ── */}
      {selectedNode && (
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-xl p-4 w-52 shadow-xl"
          style={{ background: 'var(--bg-card)', border: `2px solid ${selectedNode.color}` }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: selectedNode.color }}>
            {selectedNode.level === 0 ? 'Raiz' : selectedNode.level === 1 ? 'Fase' : 'Etapa'}
          </div>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
            {selectedNode.text}
          </p>
          <div className="space-y-1">
            <button
              onClick={() => startEdit(selectedNode.id)}
              className="w-full text-xs px-2 py-1.5 rounded-lg text-left font-medium transition-colors"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              ✏️ Editar texto
            </button>
            <button
              onClick={() => addChild(selectedNode.id)}
              className="w-full text-xs px-2 py-1.5 rounded-lg text-left font-medium transition-colors"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              ➕ Adicionar filho
            </button>
            {selectedNode.childIds.length > 0 && (
              <button
                onClick={() => toggleCollapse(selectedNode.id)}
                className="w-full text-xs px-2 py-1.5 rounded-lg text-left font-medium"
                style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                {selectedNode.collapsed ? '▶ Expandir' : '▼ Recolher'} ({selectedNode.childIds.length})
              </button>
            )}
            {selectedNode.id !== 'root' && (
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="w-full text-xs px-2 py-1.5 rounded-lg text-left font-medium"
                style={{ background: '#fef2f2', color: '#ef4444' }}
              >
                🗑 Deletar nó
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
