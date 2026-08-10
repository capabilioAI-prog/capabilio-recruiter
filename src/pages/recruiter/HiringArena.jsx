import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

// 2026-08-10: was a hardcoded literal, unconfigurable and inconsistent with
// every other page's VITE_BACKEND_URL convention. This is intentionally a
// DIFFERENT service, not this project's own capabilio-recruiter-backend --
// that backend has no /recruiter/generate-challenge route at all (confirmed
// via grep). Kept pointed at the same working legacy AI endpoint, just made
// configurable instead of scattering the literal across files.
const LEGACY_AI_URL = import.meta.env.VITE_LEGACY_AI_URL || "https://capabilio-backend-production-60ab.up.railway.app/api"

// 2026-08-10: this page kept challenge rooms in pure React state
// (useState([])) -- every room a recruiter created vanished on refresh, and
// "Past Rooms" was 2 hardcoded fake entries (DEMO_PAST) that never changed.
// The live-room leaderboard was worse: 6 hardcoded fake names ("Priya S.",
// "Rahul V.", ...) with Math.random() scores for anyone "Grade All with AI"
// hadn't already given a number to -- there is no real candidate-facing
// arena-room flow (a candidate actually joining and submitting to a room)
// anywhere in this product yet, so that data cannot be real no matter how
// it's dressed up. Rather than fake it, this page now does the part that
// IS real -- creating and tracking challenge rooms in a real arena_rooms
// table -- and drops the participant/leaderboard UI entirely rather than
// show fabricated people and scores. Same scoping decision as
// EmployeeNetwork.jsx (wire what's real, honestly flag the rest as not
// built) rather than building a full candidate-submission system in this
// pass.
const DOMAINS   = ["Medical Coding", "Software Dev", "Data Science", "Finance", "Marketing", "Design", "SQL", "Product Management"]
const TYPES     = ["Coding", "Case Study", "SQL", "Data Analysis", "Design Challenge", "Written Assessment"]
const DIFFS     = ["Easy", "Medium", "Hard"]
const TIME_OPTS = [30, 45, 60, 90, 120]

const diffColor = (d) => {
  if (d === "Easy")   return T.green
  if (d === "Medium") return T.amber
  return T.red
}

// ── Create Room Form ──────────────────────────────────────────────────────────
function CreateRoomForm({ jobs, onCreated }) {
  const [form, setForm] = useState({
    title: "", domain: DOMAINS[0], type: TYPES[0], difficulty: "Medium",
    timeLimit: 60, maxParticipants: 20, description: "", jobId: "",
  })
  const [generating, setGenerating] = useState(false)
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState("")

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Kept as-is: same hardcoded-but-working legacy AI-generation endpoint
  // used by Shadow Interview's question generator and Team Chemistry's AI
  // panel elsewhere in this app -- has its own graceful fallback (the
  // catch below) if unreachable, and isn't part of this page's data-
  // fabrication problem.
  const generateWithAI = async () => {
    setGenerating(true)
    setError("")
    try {
      const res = await fetch(
        `${LEGACY_AI_URL}/recruiter/generate-challenge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: form.domain, domain: form.domain, difficulty: form.difficulty, type: form.type }),
        }
      )
      const data = await res.json()
      setF("title", data.title || form.title)
      setF("description", data.description || "")
    } catch {
      setError("Backend not reachable — write the description manually.")
    } finally {
      setGenerating(false)
    }
  }

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Please add a title and description.")
      return
    }
    setCreating(true)
    setError("")
    try {
      const { data, error: insertErr } = await supabase.from("arena_rooms").insert({
        title: form.title.trim(),
        domain: form.domain,
        type: form.type,
        difficulty: form.difficulty,
        time_limit_minutes: form.timeLimit,
        max_participants: form.maxParticipants,
        description: form.description.trim(),
        job_id: form.jobId || null,
        status: "live",
      }).select().single()
      if (insertErr) throw insertErr
      onCreated(data)
      setForm({ title: "", domain: DOMAINS[0], type: TYPES[0], difficulty: "Medium", timeLimit: 60, maxParticipants: 20, description: "", jobId: "" })
    } catch (err) {
      setError(err.message || "Could not create room.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={CR.card}>
      <h2 style={CR.heading}>⚔️ Create Challenge Room</h2>

      <div style={CR.grid}>
        <div style={{ ...CR.field, gridColumn: "1 / -1" }}>
          <label style={CR.label}>Challenge Title</label>
          <input style={CR.input} placeholder="e.g. Senior SQL Engineer Assessment" value={form.title} onChange={(e) => setF("title", e.target.value)} />
        </div>

        <div style={CR.field}>
          <label style={CR.label}>Domain</label>
          <select style={CR.input} value={form.domain} onChange={(e) => setF("domain", e.target.value)}>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div style={CR.field}>
          <label style={CR.label}>Challenge Type</label>
          <select style={CR.input} value={form.type} onChange={(e) => setF("type", e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={CR.field}>
          <label style={CR.label}>Difficulty</label>
          <div style={{ display: "flex", gap: 8 }}>
            {DIFFS.map((d) => (
              <button key={d} onClick={() => setF("difficulty", d)}
                style={{ ...CR.diffBtn, background: form.difficulty === d ? `${diffColor(d)}22` : "transparent", color: form.difficulty === d ? diffColor(d) : T.ink2, borderColor: form.difficulty === d ? diffColor(d) : T.border }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div style={CR.field}>
          <label style={CR.label}>Time Limit (mins)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TIME_OPTS.map((t) => (
              <button key={t} onClick={() => setF("timeLimit", t)}
                style={{ ...CR.timeBtn, background: form.timeLimit === t ? T.indigo3 : "transparent", color: form.timeLimit === t ? T.indigo : T.ink2, borderColor: form.timeLimit === t ? T.indigo : T.border }}>
                {t}m
              </button>
            ))}
          </div>
        </div>

        <div style={CR.field}>
          <label style={CR.label}>Max Participants: {form.maxParticipants}</label>
          <input type="range" min={5} max={100} step={5} value={form.maxParticipants} onChange={(e) => setF("maxParticipants", +e.target.value)}
            style={{ width: "100%", accentColor: T.indigo, marginTop: 6 }} />
        </div>

        <div style={CR.field}>
          <label style={CR.label}>Attach to Job (optional)</label>
          <select style={CR.input} value={form.jobId} onChange={(e) => setF("jobId", e.target.value)}>
            <option value="">None</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>

        <div style={{ ...CR.field, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ ...CR.label, marginBottom: 0 }}>Task Description</label>
            <button onClick={generateWithAI} disabled={generating} style={CR.aiBtn}>
              {generating ? "⏳ Generating..." : "✨ AI Generate"}
            </button>
          </div>
          <textarea style={CR.textarea} placeholder="Describe the challenge task in detail... or click AI Generate above"
            value={form.description} onChange={(e) => setF("description", e.target.value)} rows={5} />
        </div>
      </div>

      {error && <div style={CR.errorBox}>{error}</div>}

      <button onClick={handleCreate} disabled={creating} style={CR.createBtn}>
        {creating ? "Creating Room..." : "🚀 Launch Challenge Room"}
      </button>
    </div>
  )
}

const CR = {
  card: { background: T.cream, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, boxShadow: T.shadow },
  heading: { fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, margin: "0 0 24px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  field:  { display: "flex", flexDirection: "column" },
  label: { fontSize: 11, color: T.ink3, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  input: { padding: "10px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink, fontSize: 13, fontFamily: "'Inter', sans-serif" },
  diffBtn: { flex: 1, padding: "7px 0", border: "1px solid", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" },
  timeBtn: { padding: "6px 10px", border: "1px solid", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" },
  aiBtn: { padding: "5px 12px", background: "#8b5cf622", border: "1px solid #8b5cf650", borderRadius: 8, color: "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  textarea: { padding: "10px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink, fontSize: 13, fontFamily: "'Inter', sans-serif", resize: "vertical", width: "100%" },
  errorBox: { marginTop: 12, padding: "10px 14px", background: T.amber2, border: `1px solid ${T.amber}30`, borderRadius: 10, color: T.amber, fontSize: 13 },
  createBtn: { marginTop: 20, width: "100%", padding: "14px", background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 20px rgba(61,78,172,0.3)" },
}

function RoomCard({ room, onClose, jobTitle }) {
  return (
    <div style={PA.roomCard}>
      <div style={PA.roomCardTop}>
        {room.status === "live" ? (
          <div style={PA.liveChip}><span style={PA.liveDot} /> LIVE</div>
        ) : (
          <span style={{ fontSize: 11, color: T.indigo, fontWeight: 600 }}>CLOSED</span>
        )}
        <span style={{ ...PA.diffBadge, color: diffColor(room.difficulty), background: `${diffColor(room.difficulty)}15`, border: `1px solid ${diffColor(room.difficulty)}33` }}>
          {room.difficulty}
        </span>
      </div>
      <div style={PA.roomTitle}>{room.title}</div>
      <div style={PA.roomMeta}>{room.domain} · {room.type} · {room.time_limit_minutes}min{jobTitle ? ` · ${jobTitle}` : ""}</div>
      {room.description && <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5, marginTop: 8, maxHeight: 60, overflow: "hidden" }}>{room.description}</div>}
      <div style={{ fontSize: 11, color: T.ink4, marginTop: 10 }}>
        {room.status === "live" ? "Created" : "Closed"} {new Date(room.status === "live" ? room.created_at : (room.closed_at || room.created_at)).toLocaleDateString()}
      </div>
      {room.status === "live" && onClose && (
        <button onClick={() => onClose(room.id)} style={PA.closeRoomBtn}>Close Room</button>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function HiringArena() {
  const [tab,      setTab]      = useState("create")
  const [rooms,    setRooms]    = useState([])
  const [jobs,     setJobs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState("")

  const fetchRooms = async () => {
    setLoading(true)
    const { data, error: fetchErr } = await supabase.from("arena_rooms").select("*").order("created_at", { ascending: false })
    if (fetchErr) setError(fetchErr.message || "Could not load challenge rooms.")
    setRooms(data || [])
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      await fetchRooms()
    })()
  }, [])

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("jobs").select("id, title").order("created_at", { ascending: false })
      setJobs(data || [])
    })()
  }, [])

  const jobTitleFor = (jobId) => jobs.find((j) => j.id === jobId)?.title || null

  const liveRooms = rooms.filter((r) => r.status === "live")
  const pastRooms = rooms.filter((r) => r.status === "closed")

  const handleCreated = (room) => {
    setRooms((prev) => [room, ...prev])
    setTab("live")
  }

  const closeRoom = async (id) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, status: "closed", closed_at: new Date().toISOString() } : r)))
    const { error: updateErr } = await supabase.from("arena_rooms").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", id)
    if (updateErr) { console.error("Failed to close room:", updateErr.message); fetchRooms() }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: T.ink }}>
      <div style={PA.header}>
        <div>
          <h1 style={PA.title}>Hiring Arena</h1>
          <p style={PA.sub}>Create competitive challenge rooms for candidates</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "create", label: "⚔️ Create Room" },
            { id: "live",   label: `🟢 Live (${liveRooms.length})` },
            { id: "past",   label: `📁 Past (${pastRooms.length})` },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ ...PA.tabBtn, background: tab === t.id ? T.indigo3 : T.cream2, color: tab === t.id ? T.indigo : T.ink3, borderColor: tab === t.id ? T.indigo : T.border }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ background: T.red2, border: `1px solid ${T.red}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: T.red, fontWeight: 600 }}>⚠ {error}</div>}

      {tab === "create" && <CreateRoomForm jobs={jobs} onCreated={handleCreated} />}

      {tab === "live" && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.ink4 }}>Loading…</div>
          ) : liveRooms.length === 0 ? (
            <div style={PA.emptyBox}>
              <div style={{ fontSize: 44 }}>⚔️</div>
              <div style={PA.emptyTitle}>No live rooms yet</div>
              <div style={PA.emptySub}>Create a challenge room to see it here</div>
              <button onClick={() => setTab("create")} style={PA.createBtn}>Create Room →</button>
            </div>
          ) : (
            <div style={PA.roomsGrid}>
              {liveRooms.map((room) => (
                <RoomCard key={room.id} room={room} onClose={closeRoom} jobTitle={jobTitleFor(room.job_id)} />
              ))}
            </div>
          )}
          {liveRooms.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 12, color: T.ink4, textAlign: "center" }}>
              Candidate participation, submissions, and leaderboards aren't available yet — there's no candidate-facing way to join a room yet. This creates and tracks the room itself.
            </div>
          )}
        </div>
      )}

      {tab === "past" && (
        loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.ink4 }}>Loading…</div>
        ) : pastRooms.length === 0 ? (
          <div style={PA.emptyBox}>
            <div style={{ fontSize: 44 }}>📁</div>
            <div style={PA.emptyTitle}>No past rooms</div>
            <div style={PA.emptySub}>Rooms you close will appear here.</div>
          </div>
        ) : (
          <div style={PA.roomsGrid}>
            {pastRooms.map((room) => (
              <RoomCard key={room.id} room={room} jobTitle={jobTitleFor(room.job_id)} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

const PA = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title: { fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 },
  sub: { fontSize: 13, color: T.ink3, marginTop: 4 },
  tabBtn: { padding: "9px 16px", border: "1px solid", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" },
  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 320 },
  emptyTitle: { fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.ink },
  emptySub: { fontSize: 13, color: T.ink3 },
  createBtn: { padding: "10px 24px", background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  roomsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  roomCard: { background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, boxShadow: T.shadow },
  roomCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  liveChip: { display: "inline-flex", alignItems: "center", gap: 5, background: T.green2, border: `1px solid ${T.green}30`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: T.green, letterSpacing: 1 },
  liveDot: { width: 5, height: 5, borderRadius: "50%", background: T.green },
  diffBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  roomTitle: { fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 4 },
  roomMeta: { fontSize: 12, color: T.ink3, marginBottom: 4 },
  closeRoomBtn: { marginTop: 12, width: "100%", padding: "8px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 9, color: T.ink2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
}
