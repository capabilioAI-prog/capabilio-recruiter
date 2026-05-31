import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"


// ── Helpers ───────────────────────────────────────────────────────────────────
const DOMAINS   = ["Medical Coding", "Software Dev", "Data Science", "Finance", "Marketing", "Design", "SQL", "Product Management"]
const TYPES     = ["Coding", "Case Study", "SQL", "Data Analysis", "Design Challenge", "Written Assessment"]
const DIFFS     = ["Easy", "Medium", "Hard"]
const TIME_OPTS = [30, 45, 60, 90, 120]

const diffColor = (d) => {
  if (d === "Easy")   return "#1A7A4A"
  if (d === "Medium") return "#f59e0b"
  return "#ef4444"
}

const statusColor = (s) => {
  if (s === "live")      return "#1A7A4A"
  if (s === "completed") return "#3D4EAC"
  return "#f59e0b"
}

// ── DEMO past rooms ───────────────────────────────────────────────────────────
const DEMO_PAST = [
  {
    id: "room_001",
    title: "SQL Mastery Challenge",
    domain: "Data Science",
    difficulty: "Medium",
    type: "SQL",
    timeLimit: 60,
    participants: 12,
    avgScore: 74,
    topScore: 98,
    completedAt: "2 days ago",
    status: "completed",
  },
  {
    id: "room_002",
    title: "Medical Coding Sprint",
    domain: "Medical Coding",
    difficulty: "Hard",
    type: "Case Study",
    timeLimit: 90,
    participants: 8,
    avgScore: 61,
    topScore: 89,
    completedAt: "5 days ago",
    status: "completed",
  },
]

// ── Create Room Form ──────────────────────────────────────────────────────────
function CreateRoomForm({ onCreated }) {
  const [form, setForm] = useState({
    title:       "",
    domain:      DOMAINS[0],
    type:        TYPES[0],
    difficulty:  "Medium",
    timeLimit:   60,
    maxParticipants: 20,
    description: "",
  })
  const [generating, setGenerating] = useState(false)
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState("")

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const generateWithAI = async () => {
    setGenerating(true)
    setError("")
    try {
      const res = await fetch(
        "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter/generate-challenge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role:       form.domain,
            domain:     form.domain,
            difficulty: form.difficulty,
            type:       form.type,
          }),
        }
      )
      const data = await res.json()
      setF("title",       data.title       || form.title)
      setF("description", data.description || "")
    } catch {
      setError("Backend not reachable — write the description manually.")
    } finally {
      setGenerating(false)
    }
  }

  const handleCreate = () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Please add a title and description.")
      return
    }
    setCreating(true)
    setTimeout(() => {
      onCreated({
        ...form,
        id:           `room_${Date.now()}`,
        status:       "live",
        participants: [],
        createdAt:    new Date().toISOString(),
      })
      setCreating(false)
    }, 600)
  }

  return (
    <div style={CR.card}>
      <h2 style={CR.heading}>⚔️ Create Challenge Room</h2>

      <div style={CR.grid}>
        {/* Title */}
        <div style={{ ...CR.field, gridColumn: "1 / -1" }}>
          <label style={CR.label}>Challenge Title</label>
          <input
            style={CR.input}
            placeholder="e.g. Senior SQL Engineer Assessment"
            value={form.title}
            onChange={(e) => setF("title", e.target.value)}
          />
        </div>

        {/* Domain */}
        <div style={CR.field}>
          <label style={CR.label}>Domain</label>
          <select style={CR.input} value={form.domain} onChange={(e) => setF("domain", e.target.value)}>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>

        {/* Type */}
        <div style={CR.field}>
          <label style={CR.label}>Challenge Type</label>
          <select style={CR.input} value={form.type} onChange={(e) => setF("type", e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Difficulty */}
        <div style={CR.field}>
          <label style={CR.label}>Difficulty</label>
          <div style={{ display: "flex", gap: 8 }}>
            {DIFFS.map((d) => (
              <button
                key={d}
                onClick={() => setF("difficulty", d)}
                style={{
                  ...CR.diffBtn,
                  background:  form.difficulty === d ? `${diffColor(d)}22` : "transparent",
                  color:       form.difficulty === d ? diffColor(d)        : "#3A3A38",
                  borderColor: form.difficulty === d ? diffColor(d)        : "rgba(26,26,24,0.07)",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Time limit */}
        <div style={CR.field}>
          <label style={CR.label}>Time Limit (mins)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TIME_OPTS.map((t) => (
              <button
                key={t}
                onClick={() => setF("timeLimit", t)}
                style={{
                  ...CR.timeBtn,
                  background:  form.timeLimit === t ? "rgba(61,78,172,0.2)" : "transparent",
                  color:       form.timeLimit === t ? "#a5b4fc"              : "#3A3A38",
                  borderColor: form.timeLimit === t ? "#3D4EAC"              : "rgba(26,26,24,0.07)",
                }}
              >
                {t}m
              </button>
            ))}
          </div>
        </div>

        {/* Max participants */}
        <div style={CR.field}>
          <label style={CR.label}>Max Participants: {form.maxParticipants}</label>
          <input
            type="range" min={5} max={100} step={5}
            value={form.maxParticipants}
            onChange={(e) => setF("maxParticipants", +e.target.value)}
            style={{ width: "100%", accentColor: "#3D4EAC", marginTop: 6 }}
          />
        </div>

        {/* Description */}
        <div style={{ ...CR.field, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ ...CR.label, marginBottom: 0 }}>Task Description</label>
            <button
              onClick={generateWithAI}
              disabled={generating}
              style={CR.aiBtn}
            >
              {generating ? "⏳ Generating..." : "✨ AI Generate"}
            </button>
          </div>
          <textarea
            style={CR.textarea}
            placeholder="Describe the challenge task in detail... or click AI Generate above"
            value={form.description}
            onChange={(e) => setF("description", e.target.value)}
            rows={5}
          />
        </div>
      </div>

      {error && <div style={CR.errorBox}>{error}</div>}

      <button
        onClick={handleCreate}
        disabled={creating}
        style={CR.createBtn}
      >
        {creating ? "Creating Room..." : "🚀 Launch Challenge Room"}
      </button>
    </div>
  )
}

const CR = {
  card: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 20, padding: 28,
  },
  heading: {
    fontFamily: "'Syne', sans-serif", fontSize: 18,
    fontWeight: 700, color: "#1A1A18",
    margin: "0 0 24px",
  },
  grid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  field:  { display: "flex", flexDirection: "column" },
  label: {
    fontSize: 11, color: "#3A3A38", fontWeight: 600,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8,
  },
  input: {
    padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
  },
  diffBtn: {
    flex: 1, padding: "7px 0",
    border: "1px solid", borderRadius: 8,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
  },
  timeBtn: {
    padding: "6px 10px",
    border: "1px solid", borderRadius: 8,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
  },
  aiBtn: {
    padding: "5px 12px",
    background: "rgba(139,92,246,0.15)",
    border: "1px solid rgba(139,92,246,0.3)",
    borderRadius: 8, color: "#c4b5fd",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  textarea: {
    padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    resize: "vertical", width: "100%",
  },
  errorBox: {
    marginTop: 12, padding: "10px 14px",
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: 10, color: "#fbbf24", fontSize: 13,
  },
  createBtn: {
    marginTop: 20, width: "100%", padding: "14px",
    background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)",
    border: "none", borderRadius: 12, color: "#1A1A18",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: "0 4px 20px rgba(61,78,172,0.4)",
  },
}

// ── Live Room ─────────────────────────────────────────────────────────────────
function LiveRoom({ room, onClose }) {
  const [grading,    setGrading]    = useState(false)
  const [leaderboard, setLeaderboard] = useState(
    Array.from({ length: 6 }, (_, i) => ({
      name:      ["Priya S.", "Rahul V.", "Neha J.", "Amit K.", "Sara M.", "Dev P."][i],
      submitted: i < 4,
      score:     i < 4 ? [94, 87, 76, 65][i] : null,
    }))
  )

  const gradeAll = async () => {
    setGrading(true)
    await new Promise((r) => setTimeout(r, 1500))
    setLeaderboard((prev) =>
      prev.map((p) => ({
        ...p,
        submitted: true,
        score: p.score ?? Math.round(40 + Math.random() * 50),
      }))
    )
    setGrading(false)
  }

  const sorted = [...leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0))

  return (
    <div style={LR.overlay} onClick={onClose}>
      <div style={LR.box} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={LR.head}>
          <div>
            <div style={LR.liveChip}>
              <span style={LR.liveDot} />
              LIVE
            </div>
            <h3 style={LR.title}>{room.title}</h3>
            <div style={LR.meta}>
              {room.domain} · {room.type} · {room.difficulty} · {room.timeLimit}min
            </div>
          </div>
          <button onClick={onClose} style={LR.closeBtn}>✕</button>
        </div>

        {/* Task */}
        <div style={LR.taskBox}>
          <div style={LR.taskLabel}>TASK DESCRIPTION</div>
          <div style={LR.taskText}>{room.description || "Challenge task description appears here."}</div>
        </div>

        {/* Leaderboard */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={LR.lbTitle}>Live Leaderboard</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={gradeAll} disabled={grading} style={LR.gradeBtn}>
              {grading ? "⏳ Grading..." : "🤖 Grade All with AI"}
            </button>
            <button style={LR.exportBtn}>📥 Export</button>
          </div>
        </div>

        {sorted.map((p, i) => (
          <div key={p.name} style={LR.lbRow}>
            <span style={{ ...LR.rank, color: i < 3 ? ["#FFD166","#6B6B68","#f59e0b"][i] : "#E8E8E1" }}>
              #{i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: p.submitted ? "#1A7A4A" : "#f59e0b" }}>
                {p.submitted ? "✅ Submitted" : "⏳ In progress"}
              </div>
            </div>
            {p.score !== null ? (
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: p.score >= 80 ? "#1A7A4A" : p.score >= 60 ? "#f59e0b" : "#ef4444" }}>
                {p.score}%
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#EFEFE9" }}>—</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const LR = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 500,
    background: "rgba(26,26,24,0.07)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  box: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20, padding: 28,
    width: "min(680px, 94vw)",
    maxHeight: "90vh", overflowY: "auto",
    fontFamily: "'DM Sans', sans-serif",
  },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  liveChip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "rgba(34,197,94,0.1)",
    border: "1px solid rgba(34,197,94,0.2)",
    borderRadius: 20, padding: "3px 10px",
    fontSize: 10, fontWeight: 700, color: "#1A7A4A",
    letterSpacing: 1, marginBottom: 8,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#1A7A4A", boxShadow: "0 0 6px #22c55e",
    animation: "pulse 2s ease-in-out infinite",
  },
  title: {
    fontFamily: "'Syne', sans-serif", fontSize: 20,
    fontWeight: 700, color: "#1A1A18", margin: "0 0 4px",
  },
  meta: { fontSize: 12, color: "#3A3A38" },
  closeBtn: {
    background: "rgba(26,26,24,0.06)", border: "none",
    color: "#6B6B68", width: 30, height: 30,
    borderRadius: 8, cursor: "pointer", fontSize: 14, flexShrink: 0,
  },
  taskBox: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: 16, marginBottom: 20,
  },
  taskLabel: { fontSize: 10, color: "#E8E8E1", letterSpacing: 1, marginBottom: 8, fontWeight: 600 },
  taskText:  { fontSize: 13, color: "#6B6B68", lineHeight: 1.6 },
  lbTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 15,
    fontWeight: 700, color: "#1A1A18", margin: 0,
  },
  gradeBtn: {
    padding: "7px 14px",
    background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)",
    border: "none", borderRadius: 8, color: "#1A1A18",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  exportBtn: {
    padding: "7px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8, color: "#6B6B68",
    fontSize: 12, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  lbRow: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  rank: { fontSize: 13, fontWeight: 700, width: 28, flexShrink: 0 },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function HiringArena() {
  const [tab,       setTab]       = useState("create")
  const [liveRooms, setLiveRooms] = useState([])
  const [pastRooms, setPastRooms] = useState(DEMO_PAST)
  const [openRoom,  setOpenRoom]  = useState(null)

  const handleCreated = (room) => {
    setLiveRooms((prev) => [room, ...prev])
    setTab("live")
    setOpenRoom(room)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input::placeholder, textarea::placeholder { color: #334155; }
        input:focus, select:focus, textarea:focus  { outline: none; border-color: #3D4EAC !important; }
      `}</style>

      {/* Page header */}
      <div style={PA.header}>
        <div>
          <h1 style={PA.title}>Hiring Arena</h1>
          <p style={PA.sub}>Create competitive challenges and grade with AI</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "create", label: "⚔️ Create Room"    },
            { id: "live",   label: `🟢 Live (${liveRooms.length})` },
            { id: "past",   label: "📁 Past Rooms"     },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...PA.tabBtn,
                background:  tab === t.id ? "rgba(61,78,172,0.2)"        : "rgba(255,255,255,0.04)",
                color:       tab === t.id ? "#a5b4fc"                      : "#3A3A38",
                borderColor: tab === t.id ? "rgba(61,78,172,0.4)"         : "rgba(26,26,24,0.07)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Create tab ── */}
      {tab === "create" && (
        <CreateRoomForm onCreated={handleCreated} />
      )}

      {/* ── Live tab ── */}
      {tab === "live" && (
        <div>
          {liveRooms.length === 0 ? (
            <div style={PA.emptyBox}>
              <div style={{ fontSize: 44 }}>⚔️</div>
              <div style={PA.emptyTitle}>No live rooms yet</div>
              <div style={PA.emptySub}>Create a challenge room to see it here</div>
              <button onClick={() => setTab("create")} style={PA.createBtn}>
                Create Room →
              </button>
            </div>
          ) : (
            <div style={PA.roomsGrid}>
              {liveRooms.map((room) => (
                <div key={room.id} style={PA.roomCard}>
                  <div style={PA.roomCardTop}>
                    <div style={PA.liveChip}>
                      <span style={PA.liveDot} />
                      LIVE
                    </div>
                    <span style={{ ...PA.diffBadge, color: diffColor(room.difficulty), background: `${diffColor(room.difficulty)}15`, border: `1px solid ${diffColor(room.difficulty)}33` }}>
                      {room.difficulty}
                    </span>
                  </div>
                  <div style={PA.roomTitle}>{room.title}</div>
                  <div style={PA.roomMeta}>{room.domain} · {room.type} · {room.timeLimit}min</div>
                  <div style={PA.roomStats}>
                    <span>👥 {room.participants?.length || 0} participants</span>
                    <span>⏱️ {room.timeLimit}min</span>
                  </div>
                  <button onClick={() => setOpenRoom(room)} style={PA.viewRoomBtn}>
                    View Live Room →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Past tab ── */}
      {tab === "past" && (
        <div style={PA.roomsGrid}>
          {pastRooms.map((room) => (
            <div key={room.id} style={PA.roomCard}>
              <div style={PA.roomCardTop}>
                <span style={{ fontSize: 11, color: "#3D4EAC", fontWeight: 600 }}>COMPLETED</span>
                <span style={{ ...PA.diffBadge, color: diffColor(room.difficulty), background: `${diffColor(room.difficulty)}15`, border: `1px solid ${diffColor(room.difficulty)}33` }}>
                  {room.difficulty}
                </span>
              </div>
              <div style={PA.roomTitle}>{room.title}</div>
              <div style={PA.roomMeta}>{room.domain} · {room.type} · {room.timeLimit}min</div>
              <div style={PA.roomStats}>
                <span>👥 {room.participants} participated</span>
                <span>📊 Avg {room.avgScore}%</span>
                <span>🏆 Top {room.topScore}%</span>
              </div>
              <div style={{ fontSize: 11, color: "#E8E8E1", marginTop: 8 }}>
                Completed {room.completedAt}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Room Modal */}
      {openRoom && (
        <LiveRoom room={openRoom} onClose={() => setOpenRoom(null)} />
      )}
    </div>
  )
}

const PA = {
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12,
  },
  title: {
    fontFamily: "'Syne', sans-serif", fontSize: 22,
    fontWeight: 800, color: "#1A1A18", margin: 0,
  },
  sub: { fontSize: 13, color: "#3A3A38", marginTop: 4 },
  tabBtn: {
    padding: "9px 16px", border: "1px solid",
    borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
  },
  emptyBox: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 12, minHeight: 320,
  },
  emptyTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 18,
    fontWeight: 700, color: "#1A1A18",
  },
  emptySub: { fontSize: 13, color: "#E8E8E1" },
  createBtn: {
    padding: "10px 24px",
    background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)",
    border: "none", borderRadius: 12, color: "#1A1A18",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  roomsGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14,
  },
  roomCard: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 18,
  },
  roomCardTop: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  liveChip: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "rgba(34,197,94,0.1)",
    border: "1px solid rgba(34,197,94,0.2)",
    borderRadius: 20, padding: "2px 8px",
    fontSize: 10, fontWeight: 700, color: "#1A7A4A", letterSpacing: 1,
  },
  liveDot: {
    width: 5, height: 5, borderRadius: "50%",
    background: "#1A7A4A", boxShadow: "0 0 5px #22c55e",
    animation: "pulse 2s ease-in-out infinite",
  },
  diffBadge: {
    fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 20,
  },
  roomTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 15,
    fontWeight: 700, color: "#1A1A18", marginBottom: 4,
  },
  roomMeta: { fontSize: 12, color: "#3A3A38", marginBottom: 10 },
  roomStats: {
    display: "flex", gap: 10, flexWrap: "wrap",
    fontSize: 12, color: "#E8E8E1",
  },
  viewRoomBtn: {
    marginTop: 12, width: "100%", padding: "9px",
    background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)",
    border: "none", borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
}