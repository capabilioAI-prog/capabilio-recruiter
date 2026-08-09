import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor, eloLevel } from "./theme"

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
// 2026-08-08: folded in the card style from the removed Talent Time
// Machine tab (tier badge, skill bars, activity stats row) -- but sourced
// from real fields only. Time Machine's ELO "history" sparkline was
// Math.random()-generated and is deliberately NOT carried over; no
// history data actually exists to chart.
function CandidateCard({ c, onTask, onMessage, onPipeline, onOpen }) {
  const col = domainColor(c.domain)
  const displayName = c.display_name || c.username || "Candidate"
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const lvl = eloLevel(c.elo || 0)
  const skillsDetailed = c.topSkillsDetailed || []
  const maxSkillVal = Math.max(1, ...skillsDetailed.map((s) => s.elo_value || 0))

  return (
    <div style={CC.card}>
      <div style={CC.top}>
        {c.avatar_url ? (
          <img src={c.avatar_url} alt={displayName} style={{ ...CC.avatar, objectFit: "cover" }} />
        ) : (
          <div style={{ ...CC.avatar, background:`${col}18`, border:`1.5px solid ${col}44`, color:col }}>{initials}</div>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={CC.name}>
              <button onClick={() => onOpen(c)} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                {displayName}
              </button>
            </div>
            {c.performance_tier && (
              <span style={{ fontSize:9.5, fontWeight:700, color:lvl.color, background:`${lvl.color}15`, border:`1px solid ${lvl.color}33`, borderRadius:20, padding:"2px 8px", flexShrink:0 }}>
                {c.performance_tier}
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:T.ink4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {c.headline || (c.current_role_title ? `${c.current_role_title}${c.current_company ? ` · ${c.current_company}` : ""}` : "—")}
          </div>
        </div>
      </div>

      {skillsDetailed.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:10 }}>
          {skillsDetailed.map((s) => (
            <div key={s.skill_name}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.ink3, marginBottom:2 }}>
                <span>{s.skill_name}</span>
                <span style={{ fontWeight:700, color:T.indigo }}>{s.elo_value}</span>
              </div>
              <div style={{ height:4, background:T.cream3, borderRadius:2 }}>
                <div style={{ height:"100%", width:`${Math.max(4, Math.round((s.elo_value / maxSkillVal) * 100))}%`, borderRadius:2, background:col }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:10, fontSize:11, color:T.ink3 }}>
        <span>⚔️ {c.taskCount || 0} tasks</span>
        <span>🔥 {c.streak || 0}d streak</span>
        {c.jobReadiness != null && <span>📊 {c.jobReadiness}% ready</span>}
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

  // 2026-08-09: advanced filters -- sent as real query params to
  // GET /partner/candidates (see partnerBridge.js's advanced-filters
  // commit for exactly what each does and why maxElo isn't offered).
  // advOpen just toggles the panel; everything else maps 1:1 to a
  // server-side filter.
  const [advOpen, setAdvOpen] = useState(false)
  const [career, setCareer] = useState("")
  const [location, setLocation] = useState("")
  const [minElo, setMinElo] = useState("")
  const [minExperience, setMinExperience] = useState("")
  const [maxExperience, setMaxExperience] = useState("")
  const [minTasks, setMinTasks] = useState("")
  const [minStreak, setMinStreak] = useState("")
  const [minJobReadiness, setMinJobReadiness] = useState("")
  const [employmentStatus, setEmploymentStatus] = useState("")
  const [uanVerified, setUanVerified] = useState(false)
  const [educationVerified, setEducationVerified] = useState(false)
  const [sortBy, setSortBy] = useState("recent")

  const advFilters = { career, location, minElo, minExperience, maxExperience, minTasks, minStreak, minJobReadiness, employmentStatus, uanVerified, educationVerified, sortBy }
  const activeAdvCount = [career, location, minElo, minExperience, maxExperience, minTasks, minStreak, minJobReadiness, employmentStatus].filter((v) => v !== "").length + (uanVerified ? 1 : 0) + (educationVerified ? 1 : 0)
  const clearAdvFilters = () => {
    setCareer(""); setLocation(""); setMinElo(""); setMinExperience(""); setMaxExperience("")
    setMinTasks(""); setMinStreak(""); setMinJobReadiness(""); setEmploymentStatus("")
    setUanVerified(false); setEducationVerified(false); setSortBy("recent")
  }

  // 2026-08-09: AI-assisted natural-language search -- a thin translation
  // layer in front of the SAME advanced filters above, via
  // POST /search-assist (capabilio-recruiter-backend). It does not search
  // candidates itself and cannot return a candidate the filters couldn't
  // also return; it only fills in the filter panel state from free text,
  // which the recruiter can see and edit before/after it runs (the panel
  // auto-opens so the applied filters are never hidden). The backend
  // whitelists/clamps every field before sending it back, but this is still
  // AI output -- treated as a starting point, not a final decision.
  const [aiQuery, setAiQuery] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNote, setAiNote] = useState(null)
  const [aiErr, setAiErr] = useState(null)

  const applyPathType = (pt) => setPathFilter(pt === "student" || pt === "professional" ? pt : "all")

  const handleAiSearch = async () => {
    const query = aiQuery.trim()
    if (!query || aiLoading) return
    setAiLoading(true)
    setAiErr(null)
    setAiNote(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/search-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ query }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      const f = body.filters || {}
      // Apply only the whitelisted keys the backend can return -- anything
      // else in the response object (there shouldn't be anything else) is
      // ignored rather than blindly spread into state.
      if ("pathType" in f) applyPathType(f.pathType)
      setCareer(f.career ?? "")
      setLocation(f.location ?? "")
      setMinElo(f.minElo != null ? String(f.minElo) : "")
      setMinExperience(f.minExperience != null ? String(f.minExperience) : "")
      setMaxExperience(f.maxExperience != null ? String(f.maxExperience) : "")
      setMinTasks(f.minTasks != null ? String(f.minTasks) : "")
      setMinStreak(f.minStreak != null ? String(f.minStreak) : "")
      setMinJobReadiness(f.minJobReadiness != null ? String(f.minJobReadiness) : "")
      setEmploymentStatus(f.employmentStatus ?? "")
      setUanVerified(f.uanVerified === true)
      setEducationVerified(f.educationVerified === true)
      setSortBy(f.sortBy || "recent")
      if (f.skill) setQ(f.skill.split(",")[0].trim())
      setAdvOpen(true)
      setAiNote(body.interpretation || null)
    } catch (err) {
      console.error("AI search-assist failed:", err)
      setAiErr(err.message)
    } finally {
      setAiLoading(false)
    }
  }

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
      const params = new URLSearchParams({ limit: "50" })
      if (pathFilter !== "all") params.set("pathType", pathFilter)
      if (advFilters.career.trim()) params.set("career", advFilters.career.trim())
      if (advFilters.location.trim()) params.set("location", advFilters.location.trim())
      if (advFilters.minElo) params.set("minElo", advFilters.minElo)
      if (advFilters.minExperience) params.set("minExperience", advFilters.minExperience)
      if (advFilters.maxExperience) params.set("maxExperience", advFilters.maxExperience)
      if (advFilters.minTasks) params.set("minTasks", advFilters.minTasks)
      if (advFilters.minStreak) params.set("minStreak", advFilters.minStreak)
      if (advFilters.minJobReadiness) params.set("minJobReadiness", advFilters.minJobReadiness)
      if (advFilters.employmentStatus) params.set("employmentStatus", advFilters.employmentStatus)
      if (advFilters.uanVerified) params.set("uanVerified", "true")
      if (advFilters.educationVerified) params.set("educationVerified", "true")
      if (advFilters.sortBy) params.set("sortBy", advFilters.sortBy)
      const res = await fetch(`${BACKEND}/partner/candidates?${params.toString()}`, {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathFilter, career, location, minElo, minExperience, maxExperience, minTasks, minStreak, minJobReadiness, employmentStatus, uanVerified, educationVerified, sortBy])

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

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAiSearch() }}
            placeholder="Try: senior React devs in Bangalore, 3+ years, open to offers"
            style={{ flex:1, minWidth:260, padding:"10px 14px", borderRadius:10, border:`1px solid ${T.indigo}44`, background:T.indigo3, fontSize:13, fontFamily:"'Inter',sans-serif" }}
          />
          <button onClick={handleAiSearch} disabled={aiLoading || !aiQuery.trim()} style={{ ...FS.select, cursor: aiLoading || !aiQuery.trim() ? "default" : "pointer", fontWeight:700, color:T.indigo, borderColor:T.indigo, opacity: aiLoading || !aiQuery.trim() ? 0.6 : 1 }}>
            {aiLoading ? "Thinking..." : "✨ AI Search"}
          </button>
        </div>
        {(aiNote || aiErr) && (
          <div style={{ fontSize:11.5, color: aiErr ? T.red : T.ink3 }}>
            {aiErr ? `Couldn't run AI search: ${aiErr}` : aiNote}
          </div>
        )}
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, domain, or skill..."
          style={{ flex:1, minWidth:220, padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'Inter',sans-serif" }} />
        <select value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} style={FS.select}>
          <option value="all">All Paths</option>
          <option value="student">College Path</option>
          <option value="professional">Professional Path</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={FS.select}>
          <option value="recent">Sort: Most recently active</option>
          <option value="elo">Sort: Highest ELO</option>
          <option value="experience">Sort: Most experience</option>
          <option value="tasks">Sort: Most tasks completed</option>
        </select>
        <button onClick={() => setAdvOpen((o) => !o)} style={{ ...FS.select, cursor:"pointer", fontWeight:600, color: activeAdvCount > 0 ? T.indigo : T.ink2, borderColor: activeAdvCount > 0 ? T.indigo : T.border }}>
          ⚙ Advanced filters{activeAdvCount > 0 ? ` (${activeAdvCount})` : ""}
        </button>
      </div>

      {advOpen && (
        <div style={{ display:"flex", flexDirection:"column", gap:12, background:T.cream, border:`1px solid ${T.border}`, borderRadius:14, padding:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
            <FilterField label="Career / role">
              <input value={career} onChange={(e) => setCareer(e.target.value)} placeholder="e.g. Data Analyst" style={FS.input} />
            </FilterField>
            <FilterField label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bangalore" style={FS.input} />
            </FilterField>
            <FilterField label="Min ELO">
              <input type="number" min="0" value={minElo} onChange={(e) => setMinElo(e.target.value)} placeholder="e.g. 900" style={FS.input} />
            </FilterField>
            <FilterField label="Min experience (yrs)">
              <input type="number" min="0" step="0.5" value={minExperience} onChange={(e) => setMinExperience(e.target.value)} style={FS.input} />
            </FilterField>
            <FilterField label="Max experience (yrs)">
              <input type="number" min="0" step="0.5" value={maxExperience} onChange={(e) => setMaxExperience(e.target.value)} style={FS.input} />
            </FilterField>
            <FilterField label="Min tasks completed">
              <input type="number" min="0" value={minTasks} onChange={(e) => setMinTasks(e.target.value)} style={FS.input} />
            </FilterField>
            <FilterField label="Min streak (days)">
              <input type="number" min="0" value={minStreak} onChange={(e) => setMinStreak(e.target.value)} style={FS.input} />
            </FilterField>
            <FilterField label="Min job readiness %">
              <input type="number" min="0" max="100" value={minJobReadiness} onChange={(e) => setMinJobReadiness(e.target.value)} style={FS.input} />
            </FilterField>
            <FilterField label="Employment status">
              <select value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} style={FS.input}>
                <option value="">Any</option>
                <option value="discoverable">Open to offers</option>
                <option value="notice_period">Notice period</option>
              </select>
            </FilterField>
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.ink2, cursor:"pointer" }}>
              <input type="checkbox" checked={uanVerified} onChange={(e) => setUanVerified(e.target.checked)} />
              ✓ Employment verified (EPFO)
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.ink2, cursor:"pointer" }}>
              <input type="checkbox" checked={educationVerified} onChange={(e) => setEducationVerified(e.target.checked)} />
              ✓ Education verified
            </label>
            {activeAdvCount > 0 && (
              <button onClick={clearAdvFilters} style={{ marginLeft:"auto", fontSize:12, fontWeight:600, color:T.red, background:"transparent", border:"none", cursor:"pointer" }}>
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

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

function FilterField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:10.5, fontWeight:600, color:T.ink3, marginBottom:4 }}>{label}</div>
      {children}
    </div>
  )
}

const FS = {
  select: { padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'Inter',sans-serif", color:T.ink2, cursor:"pointer" },
  input: { width:"100%", boxSizing:"border-box", padding:"7px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:12.5, fontFamily:"'Inter',sans-serif", color:T.ink },
}
