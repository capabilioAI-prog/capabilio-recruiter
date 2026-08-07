import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor } from "./theme"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

function PathBadge({ pathType }) {
  const isCollege = pathType === "student"
  const label = isCollege ? "College Path" : pathType === "professional" ? "Professional Path" : "Capabilio"
  return (
    <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", color: isCollege ? T.indigo : T.blue, background: isCollege ? T.indigo3 : T.blue2, border:`1px solid ${(isCollege ? T.indigo : T.blue)}22`, borderRadius:6, padding:"2px 7px" }}>
      {label}
    </span>
  )
}

function VerifiedBadge({ label }) {
  return (
    <span style={{ fontSize:10, fontWeight:700, color:T.green, background:T.green2, border:`1px solid ${T.green}30`, borderRadius:6, padding:"2px 7px" }}>
      ✓ {label}
    </span>
  )
}

// Every candidate returned here already passed the server-side visibility
// gate (recruiter_discoverable=true AND employment_status <> 'active_hidden')
// — this badge is purely a HONEST LABEL of which of the two allowed states
// they're in, never a re-check. College Path candidates have no employment
// concept, so they just show "Discoverable"; Professional Path candidates
// show their real employment_status so a recruiter can see, e.g., someone
// is in notice period (time-sensitive) vs. generally open to offers.
function VisibilityBadge({ pathType, employmentStatus }) {
  if (pathType !== "professional") {
    return <span style={{ fontSize:11, fontWeight:700, color:T.green, background:T.green2, border:`1px solid ${T.green}30`, borderRadius:7, padding:"3px 9px" }}>✓ Discoverable</span>
  }
  const meta = {
    notice_period: { label: "Notice period", color: T.amber, bg: T.amber2 },
    discoverable:  { label: "Open to offers", color: T.green, bg: T.green2 },
  }[employmentStatus] || { label: "Discoverable", color: T.green, bg: T.green2 }
  return <span style={{ fontSize:11, fontWeight:700, color:meta.color, background:meta.bg, border:`1px solid ${meta.color}30`, borderRadius:7, padding:"3px 9px" }}>✓ {meta.label}</span>
}

// ── Candidate card (real data from capabilio-web via the partner bridge) ─────
function CandidateCard({ c, onTask, onMessage, onPipeline, onOpen }) {
  const col = domainColor(c.domain)
  const displayName = c.display_name || c.username || "Candidate"
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div style={CC.card}>
      <div style={CC.top}>
        {c.avatar_url ? (
          <img src={c.avatar_url} alt={displayName} style={{ ...CC.avatar, objectFit: "cover" }} />
        ) : (
          <div style={{ ...CC.avatar, background:`${col}18`, border:`1.5px solid ${col}44`, color:col }}>{initials}</div>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={CC.name}>
            <button onClick={() => onOpen(c)} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" }}>
              {displayName}
            </button>
          </div>
          <div style={{ fontSize:11, color:T.ink4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {c.headline || (c.current_role_title ? `${c.current_role_title}${c.current_company ? ` · ${c.current_company}` : ""}` : "—")}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
        <PathBadge pathType={c.path_type} />
        <VisibilityBadge pathType={c.path_type} employmentStatus={c.employment_status} />
        {c.domain && <span style={{ fontSize:11, color:col, border:`1px solid ${col}33`, background:`${col}11`, borderRadius:6, padding:"2px 7px" }}>{c.domain}</span>}
        {c.location && <span style={{ fontSize:11, color:T.ink4 }}>📍 {c.location}</span>}
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
        {c.uan_verified && <VerifiedBadge label="Employment (EPFO)" />}
        {c.education_verified && <VerifiedBadge label="Education" />}
        {c.path_type === "student" ? (
          <span style={{ fontSize:10, color:T.ink3, background:T.cream2, border:`1px solid ${T.border}`, borderRadius:5, padding:"2px 7px" }}>Student</span>
        ) : typeof c.years_of_experience === "number" && (
          <span style={{ fontSize:10, color:T.ink3, background:T.cream2, border:`1px solid ${T.border}`, borderRadius:5, padding:"2px 7px" }}>{c.years_of_experience} yrs experience</span>
        )}
      </div>

      {(c.topSkills || []).length > 0 && (
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10 }}>
          {c.topSkills.map((s) => (
            <span key={s} style={{ fontSize:10, color:T.ink3, background:T.cream2, border:`1px solid ${T.border}`, borderRadius:5, padding:"2px 7px" }}>{s}</span>
          ))}
        </div>
      )}

      {(c.career || typeof c.elo === "number") && (
        <div style={{ display:"flex", gap:8, marginTop:10 }}>
          {typeof c.elo === "number" && (
            <div style={{ padding:"6px 10px", background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:8 }}>
              <div style={{ fontSize:9, color:T.indigo, fontWeight:700 }}>ELO</div>
              <div style={{ fontSize:13, color:T.indigo, fontWeight:800 }}>{c.elo}</div>
            </div>
          )}
          {c.career && (
            <div style={{ flex:1, padding:"6px 10px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:8, minWidth:0 }}>
              <div style={{ fontSize:9, color:T.ink3, fontWeight:700 }}>CAREER</div>
              <div style={{ fontSize:11.5, color:T.ink2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.career}</div>
            </div>
          )}
        </div>
      )}
      {c.target_role && (
        <div style={{ marginTop:8, padding:"8px 10px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:8 }}>
          <div style={{ fontSize:10, color:T.ink3, fontWeight:600, marginBottom:2 }}>Looking for</div>
          <div style={{ fontSize:11, color:T.ink2, lineHeight:1.45 }}>{c.target_role}</div>
        </div>
      )}

      <div style={CC.btnRow}>
        <button onClick={() => onOpen(c)} style={CC.profileBtn}>View Profile</button>
        <button onClick={() => onMessage(c)} style={CC.msgBtn}>Message</button>
        <button onClick={() => onTask(c)} style={CC.taskBtn}>Send Task</button>
        <button onClick={() => onPipeline(c)} style={CC.addBtn}>+ Pipeline</button>
      </div>
    </div>
  )
}
const CC = {
  card: { background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:16, position:"relative", boxShadow:T.shadow, display:"flex", flexDirection:"column" },
  top: { display:"flex", alignItems:"center", gap:10 },
  avatar: { width:40, height:40, borderRadius:12, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:15 },
  name: { fontSize:14, fontWeight:600, color:T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  btnRow: { display:"flex", gap:5, marginTop:12 },
  profileBtn: { flex:1, padding:"7px 0", background:T.ink, border:"none", borderRadius:8, color:T.cream, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" },
  msgBtn:  { flex:1, padding:"7px 0", background:T.blue2, border:`1px solid ${T.blue}30`, borderRadius:8, color:T.blue, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" },
  taskBtn: { flex:1, padding:"7px 0", background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:8, color:T.indigo, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" },
  addBtn:  { padding:"7px 10px", background:T.green2, border:`1px solid ${T.green}30`, borderRadius:8, color:T.green, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" },
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CandidateSearch() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [bridgeError, setBridgeError] = useState(null)
  const [q, setQ] = useState("")
  const [pathFilter, setPathFilter] = useState("all")

  // 2026-08-07: this page previously fetched once on mount and never again
  // -- a student updating their skills/ELO, or completing a challenge,
  // wouldn't show up here until the recruiter did a hard reload. `silent`
  // distinguishes the initial load (shows the loading state) from
  // background refreshes (updates data without flashing a spinner over
  // results the recruiter might currently be reading).
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setBridgeError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/partner/candidates?limit=50`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setCandidates(body.candidates || [])
    } catch (err) {
      console.error("Failed to load candidates from partner bridge:", err)
      if (!silent) setBridgeError(err.message) // a failed background poll shouldn't blank out results already on screen
      if (!silent) setCandidates([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Live refresh: poll every 20s, and immediately on tab focus / return to
  // this browser tab -- covers both "left it open while a candidate
  // updated their profile" and "was on another tab, came back."
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 20000)
    const onFocus = () => fetchData(true)
    const onVisible = () => { if (document.visibilityState === "visible") fetchData(true) }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [fetchData])

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (pathFilter !== "all" && c.path_type !== pathFilter) return false
      if (q) {
        const hay = `${c.display_name || ""} ${c.domain || ""} ${(c.topSkills || []).join(" ")}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [candidates, pathFilter, q])

  const handleTask = (c) => navigate("/recruiter/tasks", { state: { candidateId: c.id, candidateName: c.display_name || c.username } })
  const handleMessage = () => navigate("/recruiter/messages")
  const handleOpen = (c) => navigate(`/recruiter/candidates/${c.id}`)
  const handlePipeline = async (c) => {
    try {
      const { error } = await supabase.from("pipeline_candidates").insert({
        candidate_id: c.id, name: c.display_name || c.username, stage: "sourced", score: null,
      })
      if (error) throw error
      navigate("/recruiter/pipeline")
    } catch (err) {
      console.error("Failed to add to pipeline:", err)
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div>
        <h1 style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:T.ink, margin:0 }}>Candidate Discovery</h1>
        <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>
          Live data from Capabilio's student/professional network. Only candidates who have explicitly opted into recruiter visibility appear here — that filter is enforced server-side, not by this screen.
        </p>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, domain, or skill..."
          style={{ flex:1, minWidth:220, padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'Inter',sans-serif" }} />
        <select value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} style={FS.select}>
          <option value="all">All Paths</option>
          <option value="student">College Path</option>
          <option value="professional">Professional Path</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color:T.ink3, fontSize:13, padding:"40px 0", textAlign:"center" }}>Loading candidates...</div>
      ) : bridgeError ? (
        <div style={{ color:T.red, fontSize:13, textAlign:"center", padding:"40px 20px", background:T.red2, border:`1px solid ${T.red}30`, borderRadius:12 }}>
          Couldn't reach the candidate network: {bridgeError}. This page requires the partner bridge to capabilio-web to be configured and deployed.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color:T.ink4, fontSize:14, textAlign:"center", padding:"60px 0" }}>
          No candidates match these filters right now.
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {filtered.map((c) => (
            <CandidateCard key={c.id} c={c} onTask={handleTask} onMessage={handleMessage} onPipeline={handlePipeline} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

const FS = {
  select: { padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'Inter',sans-serif", color:T.ink2, cursor:"pointer" },
}
