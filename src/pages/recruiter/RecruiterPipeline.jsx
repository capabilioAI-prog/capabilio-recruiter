import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor } from "./theme"

// Real data only: this board reads/writes the `pipeline_candidates` table
// directly (populated by the "+ Pipeline" action in Candidate Discovery and
// the "Shortlist" action in Applications). The previous version kept an
// entirely separate, non-persistent set of named "pipelines" in React state
// that vanished on refresh and pulled candidates from Firestore with fake
// ELO scores -- none of that is real, so it's gone. Stage moves and removals
// here are actual database writes.

const STAGES = [
  { id: "applied",     aliases: ["sourced"], label: "Sourced / Applied",   icon: "👀", color: T.indigo },
  { id: "shortlisted", label: "Shortlisted",           icon: "⭐", color: T.indigo2 },
  { id: "contacted",   label: "Contacted",             icon: "📧", color: T.blue },
  { id: "interview",   label: "Interview Scheduled",   icon: "🎯", color: T.amber },
  { id: "offered",     label: "Offered",               icon: "✅", color: T.green },
  { id: "rejected",    label: "Rejected",              icon: "❌", color: T.red },
]

const stageIdFor = (rawStage) => {
  const match = STAGES.find((s) => s.id === rawStage || (s.aliases || []).includes(rawStage))
  return match ? match.id : "applied"
}

const daysAgo = (iso) => {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d
}

function KanbanCard({ row, stageColor, stageId, jobTitle, onMove, onRemove }) {
  const navigate = useNavigate()
  const col = domainColor(jobTitle || "")
  const currentIndex = STAGES.findIndex((s) => s.id === stageId)
  const nextStage = STAGES[currentIndex + 1]
  const age = daysAgo(row.added_at)

  return (
    <div style={{ ...KC.card, borderLeft: `3px solid ${stageColor}` }}>
      <div style={KC.top}>
        <div style={{ ...KC.avatar, background: `${col}18`, color: col, border: `1.5px solid ${col}44` }}>
          {(row.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={KC.name}>{row.name || "—"}</div>
          <div style={{ fontSize: 11, color: col, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{jobTitle || "No job attached"}</div>
        </div>
        {row.score != null && (
          <div style={{ fontSize: 12, fontWeight: 700, color: T.indigo }}>{row.score}%</div>
        )}
      </div>

      <div style={KC.daysRow}>
        <span style={{ fontSize: 11, color: T.ink4 }}>
          🕐 Added {age === 0 ? "today" : age === 1 ? "1 day ago" : `${age ?? "—"} days ago`}
        </span>
      </div>

      <div style={KC.actions}>
        <button onClick={() => navigate(`/recruiter/applications`)} style={KC.viewBtn}>View</button>
        {nextStage && (
          <button onClick={() => onMove(row.id, nextStage.id)} style={KC.moveBtn}>
            → {nextStage.icon}
          </button>
        )}
        <button onClick={() => onRemove(row.id)} style={KC.removeBtn}>✕</button>
      </div>
    </div>
  )
}

const KC = {
  card: { background: T.cream, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, boxShadow: T.shadow },
  top: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13 },
  name: { fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  daysRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  actions: { display: "flex", gap: 5, marginTop: 8 },
  viewBtn: { flex: 1, padding: "5px 0", background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 7, color: T.indigo, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  moveBtn: { padding: "5px 8px", background: T.green2, border: `1px solid ${T.border}`, borderRadius: 7, color: T.green, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  removeBtn: { padding: "5px 8px", background: T.red2, border: `1px solid ${T.border}`, borderRadius: 7, color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
}

export default function RecruiterPipeline() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [jobsById, setJobsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [jobFilter, setJobFilter] = useState("all")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rowsRes, jobsRes] = await Promise.all([
        supabase.from("pipeline_candidates").select("*").order("added_at", { ascending: false }),
        supabase.from("jobs").select("id,title"),
      ])
      if (rowsRes.error) throw rowsRes.error
      setRows(rowsRes.data || [])
      setJobsById(Object.fromEntries((jobsRes.data || []).map((j) => [j.id, j.title])))
    } catch (err) {
      console.error("Failed to load pipeline:", err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel("pipeline_candidates-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_candidates" }, () => fetchData())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchData])

  const moveCard = async (id, toStage) => {
    try {
      const { error } = await supabase.from("pipeline_candidates").update({ stage: toStage }).eq("id", id)
      if (error) throw error
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage: toStage } : r)))
    } catch (err) {
      console.error("Failed to move candidate:", err)
    }
  }

  const removeCard = async (id) => {
    try {
      const { error } = await supabase.from("pipeline_candidates").delete().eq("id", id)
      if (error) throw error
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error("Failed to remove candidate from pipeline:", err)
    }
  }

  const filteredRows = useMemo(
    () => (jobFilter === "all" ? rows : rows.filter((r) => r.job_id === jobFilter)),
    [rows, jobFilter]
  )

  const board = useMemo(() => {
    const b = Object.fromEntries(STAGES.map((s) => [s.id, []]))
    filteredRows.forEach((r) => b[stageIdFor(r.stage)].push(r))
    return b
  }, [filteredRows])

  const totalCards = filteredRows.length
  const offerCount = board.offered.length
  const conversionRate = totalCards ? Math.round((offerCount / totalCards) * 100) : 0

  const jobOptions = useMemo(() => {
    const byId = new Map()
    rows.forEach((r) => {
      if (r.job_id && !byId.has(r.job_id)) byId.set(r.job_id, jobsById[r.job_id] || r.job_title || "Untitled role")
    })
    return [...byId.entries()].map(([id, title]) => ({ id, title }))
  }, [rows, jobsById])

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: T.ink }}>
      <div style={P.header}>
        <div>
          <h1 style={P.title}>Hiring Pipeline</h1>
          <p style={P.sub}>{totalCards} candidates · {conversionRate}% offer rate</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} style={P.select}>
            <option value="all">All Jobs</option>
            {jobOptions.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <button onClick={() => navigate("/recruiter/search")} style={P.addCandBtn}>+ Source Candidates</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.ink4, fontSize: 13 }}>Loading pipeline...</div>
      ) : totalCards === 0 ? (
        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: "60px 20px", textAlign: "center", boxShadow: T.shadow }}>
          <div style={{ fontSize: 40 }}>🗂️</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, marginTop: 12 }}>No one in your pipeline yet</div>
          <div style={{ fontSize: 13, color: T.ink4, marginTop: 6 }}>Add candidates from Candidate Discovery or shortlist an applicant to see them here.</div>
        </div>
      ) : (
        <>
          <div style={P.funnelRow}>
            {STAGES.map((s) => (
              <div key={s.id} style={P.funnelCard}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div style={{ ...P.funnelCount, color: s.color }}>{board[s.id].length}</div>
                <div style={P.funnelLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={P.board}>
            {STAGES.map((stage) => (
              <div key={stage.id} style={{ ...P.column, borderTop: `3px solid ${stage.color}` }}>
                <div style={P.colHead}>
                  <span style={{ fontSize: 16 }}>{stage.icon}</span>
                  <span style={{ ...P.colTitle, color: stage.color }}>{stage.label}</span>
                  <span style={{ ...P.colCount, background: `${stage.color}18`, color: stage.color }}>{board[stage.id].length}</span>
                </div>
                <div style={P.cardList}>
                  {board[stage.id].map((row) => (
                    <KanbanCard
                      key={row.id}
                      row={row}
                      stageColor={stage.color}
                      stageId={stage.id}
                      jobTitle={jobsById[row.job_id] || row.job_title}
                      onMove={moveCard}
                      onRemove={removeCard}
                    />
                  ))}
                  {board[stage.id].length === 0 && (
                    <div style={{ ...P.emptyCol, borderColor: `${stage.color}44` }}>
                      <span style={{ fontSize: 20 }}>{stage.icon}</span>
                      <span style={{ fontSize: 11, color: T.ink4 }}>Nobody here</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const P = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 },
  sub: { fontSize: 13, color: T.ink4, marginTop: 4 },
  select: { padding: "9px 14px", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 12, color: T.ink, fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  addCandBtn: { padding: "9px 16px", background: T.green2, border: `1px solid ${T.border}`, borderRadius: 12, color: T.green, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  funnelRow: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 20 },
  funnelCard: { background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxShadow: T.shadow },
  funnelCount: { fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, lineHeight: 1.1 },
  funnelLabel: { fontSize: 11, color: T.ink4, textAlign: "center" },
  board: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, overflowX: "auto" },
  column: { background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 12, minHeight: 420 },
  colHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  colTitle: { fontSize: 12, fontWeight: 700, letterSpacing: 0.3, flex: 1 },
  colCount: { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
  cardList: { display: "flex", flexDirection: "column", gap: 8 },
  emptyCol: { border: "2px dashed", borderRadius: 12, padding: "28px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 },
}
