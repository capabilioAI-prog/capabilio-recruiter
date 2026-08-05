import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore"
import { db, auth } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




const STAGES = [
  { id: "shortlisted", label: "Shortlisted",          icon: "👀", color: T.indigo },
  { id: "contacted",   label: "Contacted",             icon: "📧", color: T.blue },
  { id: "interview",   label: "Interview Scheduled",   icon: "🎯", color: T.amber },
  { id: "offered",     label: "Offered",               icon: "✅", color: T.green },
  { id: "rejected",    label: "Rejected",              icon: "❌", color: T.red },
]

const eloColor = (e) => {
  if (e >= 1200) return T.amber
  if (e >= 1000) return T.indigo
  if (e >= 900)  return T.blue
  return T.ink4
}

const domainColor = (d = "") => {
  if (d.toLowerCase().includes("medical"))  return T.green
  if (d.toLowerCase().includes("software")) return T.indigo
  if (d.toLowerCase().includes("data"))     return T.blue
  return T.indigo2
}

// ── Kanban Card ───────────────────────────────────────────────────────────────
function KanbanCard({ card, stageColor, stageId, onMove, onRemove }) {
  const navigate   = useNavigate()
  const [editNote, setEditNote] = useState(false)
  const [note,     setNote]     = useState(card.notes || "")
  const col = domainColor(card.domain || "")
  const currentIndex = STAGES.findIndex((s) => s.id === stageId)
  const nextStage    = STAGES[currentIndex + 1]

  return (
    <div
      style={{ ...KC.card, borderLeft: `3px solid ${stageColor}` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)"
        e.currentTarget.style.boxShadow = T.shadow2
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none"
        e.currentTarget.style.boxShadow = T.shadow
      }}
    >
      {/* Top row */}
      <div style={KC.top}>
        <div style={{ ...KC.avatar, background: `${col}18`, color: col, border: `1.5px solid ${col}44` }}>
          {(card.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={KC.name}>{card.name}</div>
          <div style={{ fontSize: 11, color: col }}>◆ {card.domain}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: eloColor(card.elo || 800) }}>
          ⚡{card.elo || 800}
        </div>
      </div>

      {/* Days in stage */}
      <div style={KC.daysRow}>
        <span style={{ fontSize: 11, color: T.ink4 }}>
          🕐 {card.daysInStage || 0}d in stage
        </span>
        {(card.daysInStage || 0) > 5 && (
          <span style={KC.staleBadge}>⚠️ Stale</span>
        )}
      </div>

      {/* Note */}
      {editNote ? (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            style={KC.noteInput}
          />
          <button
            onClick={() => setEditNote(false)}
            style={KC.saveNoteBtn}
          >
            Save
          </button>
        </div>
      ) : (
        <div
          onClick={() => setEditNote(true)}
          style={KC.noteDisplay}
        >
          {note || <span style={{ color: T.ink4 }}>+ Add note...</span>}
        </div>
      )}

      {/* Actions */}
      <div style={KC.actions}>
        <button
          onClick={() => navigate(`/recruiter/candidate/${card.uid}`)}
          style={KC.viewBtn}
        >
          View
        </button>
        {nextStage && (
          <button
            onClick={() => onMove(card.uid, stageId, nextStage.id)}
            style={KC.moveBtn}
          >
            → {nextStage.icon}
          </button>
        )}
        <button
          onClick={() => onRemove(card.uid, stageId)}
          style={KC.removeBtn}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

const KC = {
  card: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 12, padding: 12,
    transition: "all 0.2s", cursor: "default",
    boxShadow: T.shadow,
  },
  top: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  avatar: {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13,
  },
  name: {
    fontSize: 13, fontWeight: 600, color: T.ink,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  daysRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  staleBadge: {
    fontSize: 10, color: T.amber,
    background: T.amber2,
    padding: "1px 6px", borderRadius: 20,
  },
  noteDisplay: {
    fontSize: 11, color: T.ink3,
    background: T.cream2,
    border: `1px dashed ${T.border}`,
    borderRadius: 8, padding: "6px 8px",
    cursor: "pointer", minHeight: 28, lineHeight: 1.4,
  },
  noteInput: {
    width: "100%",
    background: T.cream2,
    border: `1px solid ${T.indigo3}`,
    borderRadius: 8, padding: "6px 8px",
    color: T.ink, fontSize: 11,
    fontFamily: "'DM Sans', sans-serif",
    resize: "none",
  },
  saveNoteBtn: {
    marginTop: 4, padding: "4px 10px",
    background: T.indigo3,
    border: "none", borderRadius: 6,
    color: T.indigo, fontSize: 11,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  actions: { display: "flex", gap: 5, marginTop: 8 },
  viewBtn: {
    flex: 1, padding: "5px 0",
    background: T.indigo3,
    border: `1px solid ${T.border}`,
    borderRadius: 7, color: T.indigo,
    fontSize: 11, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  moveBtn: {
    padding: "5px 8px",
    background: T.green2,
    border: `1px solid ${T.border}`,
    borderRadius: 7, color: T.green,
    fontSize: 11, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  removeBtn: {
    padding: "5px 8px",
    background: T.red2,
    border: `1px solid ${T.border}`,
    borderRadius: 7, color: T.red,
    fontSize: 11, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
}

// ── Add Candidate Modal ───────────────────────────────────────────────────────
function AddCandidateModal({ onClose, onAdd, existing }) {
  const [candidates, setCandidates] = useState([])
  const [search,     setSearch]     = useState("")
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      setCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
      setLoading(false)
    }).catch((err) => {
      console.error("Failed to load candidates:", err)
      setLoading(false)
    })
  }, [])

  const filtered = candidates.filter((c) => {
    if (existing.has(c.uid)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.displayName || "").toLowerCase().includes(q) ||
      (c.keyword     || "").toLowerCase().includes(q)
    )
  })

  return (
    <div style={AM.overlay} onClick={onClose}>
      <div style={AM.box} onClick={(e) => e.stopPropagation()}>
        <div style={AM.head}>
          <h3 style={AM.title}>Add Candidate to Pipeline</h3>
          <button onClick={onClose} style={AM.closeBtn}>✕</button>
        </div>
        <input
          style={AM.search}
          placeholder="Search by name or domain..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div style={AM.list}>
          {loading && (
            <div style={{ color: T.ink4, fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              Loading candidates...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ color: T.ink4, fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              No candidates found
            </div>
          )}
          {filtered.map((c) => (
            <div key={c.uid} style={AM.row}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                  {c.displayName}
                </div>
                <div style={{ fontSize: 11, color: T.ink4 }}>
                  {c.keyword} · ELO {c.eloRating || 800}
                </div>
              </div>
              <button onClick={() => { onAdd(c); onClose() }} style={AM.addBtn}>
                + Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const AM = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 500,
    background: "rgba(26,26,24,0.45)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  box: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 20, padding: 24,
    width: "min(520px, 94vw)",
    maxHeight: "80vh",
    display: "flex", flexDirection: "column",
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: T.shadow2,
  },
  head: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  title: {
    fontFamily: "'Syne', sans-serif", fontSize: 17,
    fontWeight: 700, color: T.ink, margin: 0,
  },
  closeBtn: {
    background: T.cream2, border: `1px solid ${T.border}`,
    color: T.ink3, width: 30, height: 30,
    borderRadius: 8, cursor: "pointer", fontSize: 14,
  },
  search: {
    width: "100%", padding: "10px 14px",
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 10, color: T.ink,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    marginBottom: 12,
  },
  list: { overflowY: "auto", flex: 1 },
  row: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 0", borderBottom: `1px solid ${T.border}`,
  },
  addBtn: {
    padding: "6px 14px",
    background: T.indigo,
    border: "none", borderRadius: 8, color: "#1A1A18",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
  },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function RecruiterPipeline() {
  const [pipelines,       setPipelines]       = useState({ "Senior Analyst": { shortlisted: [], contacted: [], interview: [], offered: [], rejected: [] } })
  const [activePipeline,  setActivePipeline]  = useState("Senior Analyst")
  const [newName,         setNewName]         = useState("")
  const [showNewInput,    setShowNewInput]    = useState(false)
  const [showAddModal,    setShowAddModal]    = useState(false)
  const [dragCard,        setDragCard]        = useState(null)

  const board = pipelines[activePipeline] || {}

  // All UIDs already in this pipeline
  const allUids = new Set(Object.values(board).flat().map((c) => c.uid))

  const moveCard = (uid, fromStage, toStage) => {
    setPipelines((prev) => {
      const pipe  = { ...prev[activePipeline] }
      const card  = pipe[fromStage]?.find((c) => c.uid === uid)
      if (!card) return prev
      pipe[fromStage] = pipe[fromStage].filter((c) => c.uid !== uid)
      pipe[toStage]   = [...(pipe[toStage] || []), { ...card, daysInStage: 0 }]
      return { ...prev, [activePipeline]: pipe }
    })
  }

  const removeCard = (uid, stageId) => {
    setPipelines((prev) => {
      const pipe = { ...prev[activePipeline] }
      pipe[stageId] = pipe[stageId].filter((c) => c.uid !== uid)
      return { ...prev, [activePipeline]: pipe }
    })
  }

  const addCandidate = (candidate) => {
    setPipelines((prev) => {
      const pipe = { ...prev[activePipeline] }
      pipe.shortlisted = [
        ...pipe.shortlisted,
        {
          uid:         candidate.uid,
          name:        candidate.displayName || "Unknown",
          domain:      candidate.keyword     || "General",
          elo:         candidate.eloRating   || 800,
          notes:       "",
          daysInStage: 0,
          addedAt:     new Date().toISOString(),
        },
      ]
      return { ...prev, [activePipeline]: pipe }
    })
  }

  const createPipeline = () => {
    if (!newName.trim()) return
    setPipelines((prev) => ({
      ...prev,
      [newName]: { shortlisted: [], contacted: [], interview: [], offered: [], rejected: [] },
    }))
    setActivePipeline(newName)
    setNewName("")
    setShowNewInput(false)
  }

  // Stats
  const totalCards     = Object.values(board).flat().length
  const offerCount     = board.offered?.length || 0
  const conversionRate = totalCards ? Math.round((offerCount / totalCards) * 100) : 0

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        textarea::placeholder { color: ${T.ink4}; }
        textarea:focus        { outline: none; border-color: ${T.indigo} !important; }
        input::placeholder    { color: ${T.ink4}; }
        input:focus           { outline: none; border-color: ${T.indigo} !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={P.header}>
        <div>
          <h1 style={P.title}>Hiring Pipeline</h1>
          <p style={P.sub}>
            {totalCards} candidates · {conversionRate}% offer rate
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={activePipeline}
            onChange={(e) => setActivePipeline(e.target.value)}
            style={P.select}
          >
            {Object.keys(pipelines).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            style={P.addCandBtn}
          >
            + Add Candidate
          </button>
          <button
            onClick={() => setShowNewInput(!showNewInput)}
            style={P.newPipeBtn}
          >
            + New Pipeline
          </button>
        </div>
      </div>

      {/* New pipeline input */}
      {showNewInput && (
        <div style={P.newPipeRow}>
          <input
            style={P.newPipeInput}
            placeholder="Pipeline name  e.g. Senior Data Analyst"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPipeline()}
            autoFocus
          />
          <button onClick={createPipeline} style={P.createBtn}>Create →</button>
          <button onClick={() => setShowNewInput(false)} style={P.cancelBtn}>Cancel</button>
        </div>
      )}

      {/* ── Funnel stats ── */}
      <div style={P.funnelRow}>
        {STAGES.map((s) => {
          const count = board[s.id]?.length || 0
          return (
            <div key={s.id} style={P.funnelCard}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div style={{ ...P.funnelCount, color: s.color }}>{count}</div>
              <div style={P.funnelLabel}>{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* ── Kanban board ── */}
      <div style={P.board}>
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            style={{ ...P.column, borderTop: `3px solid ${stage.color}` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragCard && dragCard.from !== stage.id) {
                moveCard(dragCard.uid, dragCard.from, stage.id)
              }
              setDragCard(null)
            }}
          >
            {/* Column header */}
            <div style={P.colHead}>
              <span style={{ fontSize: 16 }}>{stage.icon}</span>
              <span style={{ ...P.colTitle, color: stage.color }}>
                {stage.label}
              </span>
              <span style={{ ...P.colCount, background: `${stage.color}18`, color: stage.color }}>
                {board[stage.id]?.length || 0}
              </span>
            </div>

            {/* Cards */}
            <div style={P.cardList}>
              {(board[stage.id] || []).map((card) => (
                <div
                  key={card.uid}
                  draggable
                  onDragStart={() => setDragCard({ uid: card.uid, from: stage.id })}
                  style={{ cursor: "grab" }}
                >
                  <KanbanCard
                    card={card}
                    stageColor={stage.color}
                    stageId={stage.id}
                    onMove={moveCard}
                    onRemove={removeCard}
                  />
                </div>
              ))}

              {/* Empty drop zone */}
              {(board[stage.id] || []).length === 0 && (
                <div style={{ ...P.emptyCol, borderColor: `${stage.color}44` }}>
                  <span style={{ fontSize: 20 }}>{stage.icon}</span>
                  <span style={{ fontSize: 11, color: T.ink4 }}>
                    Drop candidates here
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <AddCandidateModal
          onClose={() => setShowAddModal(false)}
          onAdd={addCandidate}
          existing={allUids}
        />
      )}
    </div>
  )
}

const P = {
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12,
  },
  title: {
    fontFamily: "'Syne', sans-serif", fontSize: 22,
    fontWeight: 800, color: T.ink, margin: 0,
  },
  sub: { fontSize: 13, color: T.ink4, marginTop: 4 },
  select: {
    padding: "9px 14px",
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.ink,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  },
  addCandBtn: {
    padding: "9px 16px",
    background: T.green2,
    border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.green,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  newPipeBtn: {
    padding: "9px 16px",
    background: T.indigo,
    border: "none", borderRadius: 12, color: "#1A1A18",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  newPipeRow: {
    display: "flex", gap: 10, marginBottom: 16,
    alignItems: "center", flexWrap: "wrap",
  },
  newPipeInput: {
    flex: 1, minWidth: 200, padding: "10px 14px",
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.ink,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
  },
  createBtn: {
    padding: "10px 18px",
    background: T.indigo,
    border: "none", borderRadius: 12, color: "#1A1A18",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  cancelBtn: {
    padding: "10px 14px",
    background: "transparent",
    border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.ink4,
    fontSize: 13, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  funnelRow: {
    display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
    gap: 10, marginBottom: 20,
  },
  funnelCard: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 14, padding: "14px 12px",
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
    boxShadow: T.shadow,
  },
  funnelCount: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 26, fontWeight: 800, lineHeight: 1.1,
  },
  funnelLabel: { fontSize: 11, color: T.ink4, textAlign: "center" },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 12, overflowX: "auto",
  },
  column: {
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 16, padding: 12, minHeight: 420,
  },
  colHead: {
    display: "flex", alignItems: "center",
    gap: 8, marginBottom: 12,
  },
  colTitle: {
    fontSize: 12, fontWeight: 700,
    letterSpacing: 0.3, flex: 1,
  },
  colCount: {
    fontSize: 11, fontWeight: 700,
    padding: "2px 8px", borderRadius: 20,
  },
  cardList: { display: "flex", flexDirection: "column", gap: 8 },
  emptyCol: {
    border: "2px dashed", borderRadius: 12,
    padding: "28px 12px",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 8,
  },
}
