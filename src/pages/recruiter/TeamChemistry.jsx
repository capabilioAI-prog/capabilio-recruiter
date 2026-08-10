import { useState, useEffect, useCallback } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor, eloLevel } from "./theme"

// 2026-08-10: candidate pool used to read Firebase Firestore's `users`
// collection -- the same frozen pre-Supabase-migration snapshot bug fixed
// on Shadow Interview and Talent Pool. Now reads real, live,
// recruiter-visible candidates via the same /partner/candidates route
// CandidateSearch.jsx uses (real field names: id, display_name, domain,
// elo, topSkillsDetailed -- not the old uid/displayName/keyword/skillGraph
// Firestore shape). domainColor/eloLevel were also locally re-implemented
// here with slightly different color values than theme.js's shared
// versions -- switched to the shared ones instead of keeping a second
// copy that could drift.
// The chemistry math itself (calcChemistry) was already real computation
// over whatever data it was given, not random -- only the data source was
// fake. Saved Teams, on the other hand, WAS fake: two hardcoded empty
// "teams" and a Load button with no onClick, backed by nothing. That now
// persists to a real saved_teams table (RLS-scoped to the recruiter's
// company), same pattern as company_employees/jobs.
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

function calcChemistry(team) {
  if (team.length < 2) return null
  const allSkills    = team.flatMap((c) => (c.topSkillsDetailed || []).map((s) => s.skill_name))
  const uniqueSkills = new Set(allSkills).size
  const skillScore   = Math.min(100, uniqueSkills * 12)
  const domains      = new Set(team.map((c) => c.domain).filter(Boolean))
  const divScore     = Math.min(100, domains.size * 25)
  const elos         = team.map((c) => c.elo || 800)
  const avgElo       = elos.reduce((s, e) => s + e, 0) / elos.length
  const variance     = elos.reduce((s, e) => s + Math.pow(e - avgElo, 2), 0) / elos.length
  const balScore     = Math.max(0, 100 - Math.sqrt(variance) / 3)
  const readiness    = team.map((c) => c.jobReadiness || 0)
  const readScore    = readiness.reduce((s, r) => s + r, 0) / readiness.length
  const overall      = Math.round((skillScore * 0.3 + divScore * 0.2 + balScore * 0.25 + readScore * 0.25))
  return {
    overall,
    skillCoverage: Math.round(skillScore),
    diversity:     Math.round(divScore),
    eloBalance:    Math.round(balScore),
    avgReadiness:  Math.round(readScore),
    avgElo:        Math.round(avgElo),
    uniqueSkills,
    domains:       [...domains],
    gaps: overall < 60
      ? ["Consider adding complementary skills", "Team ELO spread is wide"]
      : overall < 80
      ? ["Good balance — minor skill gaps remain"]
      : ["Excellent team composition"],
  }
}

function TeamRadar({ team, size = 220 }) {
  const skillMap = {}
  team.forEach((c) => {
    (c.topSkillsDetailed || []).forEach((s) => {
      if (!skillMap[s.skill_name]) skillMap[s.skill_name] = []
      skillMap[s.skill_name].push(s.elo_value || 0)
    })
  })
  const skills = Object.entries(skillMap)
    .map(([label, vals]) => ({ label, value: Math.min(100, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length / 12)) }))
    .slice(0, 7)
  if (skills.length < 3) return (
    <div style={{ color: T.ink4, fontSize: 12, textAlign: "center", padding: 20 }}>
      Add more candidates to see team radar
    </div>
  )
  const n = skills.length
  const cx = size / 2, cy = size / 2, r = size / 2 - 32
  const angles = skills.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2)
  const bgRing = (scale) => angles.map((a) =>
    `${cx + r * scale * Math.cos(a)},${cy + r * scale * Math.sin(a)}`).join(" ")
  const fgPts = skills.map((s, i) => {
    const v = s.value / 100
    return `${cx + r * v * Math.cos(angles[i])},${cy + r * v * Math.sin(angles[i])}`
  }).join(" ")
  return (
    <svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={bgRing(s)} fill="none" stroke="rgba(61,78,172,0.08)" strokeWidth="1" />
      ))}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
          stroke="rgba(61,78,172,0.08)" strokeWidth="1" />
      ))}
      <polygon points={fgPts} fill="rgba(61,78,172,0.12)" stroke="#3D4EAC" strokeWidth="2" />
      {skills.map((s, i) => {
        const v  = s.value / 100
        const px = cx + r * v * Math.cos(angles[i])
        const py = cy + r * v * Math.sin(angles[i])
        const lx = cx + (r + 20) * Math.cos(angles[i])
        const ly = cy + (r + 20) * Math.sin(angles[i])
        return (
          <g key={s.label}>
            <circle cx={px} cy={py} r={3} fill="#3D4EAC" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill={T.ink2} fontFamily="Inter">{s.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function CandidateChip({ candidate, onRemove }) {
  const col = domainColor(candidate.domain)
  const displayName = candidate.display_name || candidate.username || "Candidate"
  return (
    <div style={{ ...CH.chip, borderColor: `${col}44` }}>
      <div style={{ ...CH.dot, background: col }} />
      <span style={CH.name}>{displayName}</span>
      <span style={{ fontSize: 10, color: T.ink4 }}>⚡{candidate.elo || 800}</span>
      <button onClick={() => onRemove(candidate.id)} style={CH.removeBtn}>✕</button>
    </div>
  )
}

const CH = {
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: T.cream, border: "1px solid",
    borderRadius: 20, padding: "4px 10px",
  },
  dot:       { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  name:      { fontSize: 12, color: T.ink, fontWeight: 500 },
  removeBtn: { background: "none", border: "none", color: T.ink4, cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1 },
}

function ScoreRing({ value, color, label, size = 80 }) {
  const r    = size / 2 - 8
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(26,26,24,0.06)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
          fontSize="14" fontWeight="800" fill={color} fontFamily="Inter">{value}</text>
      </svg>
      <span style={{ fontSize: 10, color: T.ink3, textAlign: "center", maxWidth: size }}>{label}</span>
    </div>
  )
}

function AIPanel({ team, chemistry }) {
  const [loading,  setLoading]  = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error,    setError]    = useState("")

  const analyze = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(
        "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter/team-chemistry",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team: team.map((c) => ({
              name: c.display_name || c.username, domain: c.domain, elo: c.elo,
              skills: c.topSkillsDetailed, jobReadiness: c.jobReadiness,
            })),
            chemistryScore: chemistry.overall,
          }),
        }
      )
      const data = await res.json()
      setAnalysis(data)
    } catch {
      setAnalysis({
        teamStrengths:  ["Strong domain diversity", "Balanced ELO distribution", "High individual readiness"],
        teamWeaknesses: ["Some skill overlap", "Could benefit from more senior members"],
        suggestedRoles: ["Team Lead", "Domain Specialist", "Bridge Engineer"],
        verdict: `This team shows ${chemistry.overall >= 70 ? "strong" : "moderate"} chemistry. Skill coverage is ${chemistry.skillCoverage >= 60 ? "good" : "limited"} and diversity ${chemistry.diversity >= 75 ? "excellent" : "needs improvement"}.`,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!analysis) return (
    <div style={AP.empty}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
      <div style={{ fontSize: 13, color: T.ink2, marginBottom: 16, textAlign: "center" }}>
        Run AI analysis to get deep insights on team dynamics
      </div>
      <button onClick={analyze} disabled={loading} style={AP.btn}>
        {loading ? "⏳ Analyzing team..." : "✨ Run AI Team Analysis"}
      </button>
      {error && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {analysis.verdict && (
        <div style={AP.verdictBox}>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>AI VERDICT</div>
          <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6 }}>{analysis.verdict}</div>
        </div>
      )}
      {(analysis.teamStrengths || []).length > 0 && (
        <div style={AP.section}>
          <div style={AP.sTitle}>✅ Team Strengths</div>
          {analysis.teamStrengths.map((s, i) => <div key={i} style={AP.bullet}>• {s}</div>)}
        </div>
      )}
      {(analysis.teamWeaknesses || []).length > 0 && (
        <div style={{ ...AP.section, background: T.red2, border: `1px solid ${T.red}20` }}>
          <div style={{ ...AP.sTitle, color: T.red }}>⚠️ Gaps to Address</div>
          {analysis.teamWeaknesses.map((s, i) => <div key={i} style={{ ...AP.bullet, color: T.red }}>• {s}</div>)}
        </div>
      )}
      {(analysis.suggestedRoles || []).length > 0 && (
        <div style={AP.section}>
          <div style={AP.sTitle}>🎯 Suggested Hires to Complete Team</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {analysis.suggestedRoles.map((r, i) => <span key={i} style={AP.roleTag}>{r}</span>)}
          </div>
        </div>
      )}
      <button onClick={() => setAnalysis(null)} style={AP.rerunBtn}>🔄 Re-analyze</button>
    </div>
  )
}

const AP = {
  empty:      { display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0" },
  btn:        { padding: "10px 20px", background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  verdictBox: { background: T.indigo3, border: `1px solid ${T.indigo}20`, borderRadius: 12, padding: 14 },
  section:    { background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12 },
  sTitle:     { fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 },
  bullet:     { fontSize: 12, color: T.ink3, padding: "2px 0" },
  roleTag:    { fontSize: 11, color: T.indigo, background: T.indigo3, border: `1px solid ${T.indigo}30`, padding: "3px 10px", borderRadius: 20 },
  rerunBtn:   { padding: "8px 16px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.ink3, fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif", alignSelf: "flex-start" },
}

export default function TeamChemistry() {
  const [allCandidates, setAllCandidates] = useState([])
  const [team,          setTeam]          = useState([])
  const [search,        setSearch]        = useState("")
  const [loading,       setLoading]       = useState(true)
  const [bridgeError,   setBridgeError]   = useState("")
  const [savedTeams,    setSavedTeams]    = useState([])
  const [savedLoading,  setSavedLoading]  = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [loadNote,      setLoadNote]      = useState("")
  const [teamName, setTeamName] = useState("My Dream Team")

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    setBridgeError("")
    try {
      const headers = await authHeaders()
      const res = await fetch(`${BACKEND}/partner/candidates?limit=50`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setAllCandidates(body.candidates || [])
    } catch (err) {
      console.error("Failed to load candidates from partner bridge:", err)
      setBridgeError(err.message || "Could not load candidates.")
      setAllCandidates([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSavedTeams = useCallback(async () => {
    setSavedLoading(true)
    const { data, error } = await supabase.from("saved_teams").select("*").order("created_at", { ascending: false })
    if (error) console.error("Failed to load saved teams:", error.message)
    setSavedTeams(data || [])
    setSavedLoading(false)
  }, [])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])
  useEffect(() => { fetchSavedTeams() }, [fetchSavedTeams])

  const addToTeam    = (c) => { if (team.find((t) => t.id === c.id) || team.length >= 8) return; setTeam((p) => [...p, c]) }
  const removeFromTeam = (id) => setTeam((p) => p.filter((c) => c.id !== id))
  const chemistry    = team.length >= 2 ? calcChemistry(team) : null
  const chemColor    = chemistry ? chemistry.overall >= 80 ? T.green : chemistry.overall >= 60 ? T.amber : T.red : T.ink4

  const filtered = allCandidates.filter((c) => {
    if (team.find((t) => t.id === c.id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    const name = c.display_name || c.username || ""
    return name.toLowerCase().includes(q) || (c.domain || "").toLowerCase().includes(q)
  })

  const saveTeam = async () => {
    if (!teamName.trim() || team.length === 0) return
    setSaving(true)
    const { error } = await supabase.from("saved_teams").insert({ name: teamName.trim(), member_ids: team.map((c) => c.id) })
    if (error) {
      console.error("Failed to save team:", error.message)
    } else {
      await fetchSavedTeams()
    }
    setSaving(false)
  }

  const loadTeam = (saved) => {
    const ids = saved.member_ids || []
    const found = ids.map((id) => allCandidates.find((c) => c.id === id)).filter(Boolean)
    setTeam(found.slice(0, 8))
    setTeamName(saved.name)
    setLoadNote(found.length < ids.length ? `${ids.length - found.length} member(s) from this team are no longer discoverable and were skipped.` : "")
  }

  const deleteTeam = async (id) => {
    const { error } = await supabase.from("saved_teams").delete().eq("id", id)
    if (error) console.error("Failed to delete saved team:", error.message)
    else setSavedTeams((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: T.ink }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        input:focus { outline: none; border-color: #3D4EAC !important; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>
          🧪 Team Chemistry
        </h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>
          Build your dream team from real, live candidates and get compatibility scores
        </p>
      </div>

      {bridgeError && (
        <div style={{ background: T.red2, border: `1px solid ${T.red}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: T.red, fontWeight: 600 }}>⚠ {bridgeError}</div>
      )}

      <div style={M.layout}>

        {/* LEFT — Candidate Pool */}
        <div style={M.left}>
          <div style={M.panel}>
            <div style={M.panelHead}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>👥 Candidate Pool</span>
              <span style={{ fontSize: 11, color: T.ink4 }}>{allCandidates.length} total</span>
            </div>
            <input
              style={M.search}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={M.candidateList}>
              {loading && <div style={{ color: T.ink4, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Loading...</div>}
              {filtered.map((c) => {
                const col = domainColor(c.domain)
                const lvl = eloLevel(c.elo || 0)
                const displayName = c.display_name || c.username || "Candidate"
                return (
                  <div key={c.id} style={M.candidateRow}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.indigo3}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ ...M.miniAvatar, background: `${col}18`, color: col }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: 10, color: T.ink4 }}>
                        {c.domain} · <span style={{ color: lvl.color }}>⚡{c.elo || 800}</span>
                      </div>
                    </div>
                    <button onClick={() => addToTeam(c)} disabled={team.length >= 8} style={M.addBtn}>+</button>
                  </div>
                )
              })}
              {!loading && filtered.length === 0 && (
                <div style={{ color: T.ink4, fontSize: 12, textAlign: "center", padding: "16px 0" }}>No candidates</div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER — Team Builder */}
        <div style={M.center}>
          <div style={M.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <input
                style={M.teamNameInput}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name..."
              />
              <span style={{ fontSize: 11, color: team.length >= 8 ? T.red : T.ink4 }}>{team.length}/8</span>
            </div>
            {team.length === 0 ? (
              <div style={M.emptyTeam}>
                <div style={{ fontSize: 32 }}>👥</div>
                <div style={{ fontSize: 13, color: T.ink3 }}>Add candidates from the left panel</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {team.map((c) => <CandidateChip key={c.id} candidate={c} onRemove={removeFromTeam} />)}
              </div>
            )}
            {loadNote && <div style={{ marginTop: 10, fontSize: 11, color: T.amber }}>⚠ {loadNote}</div>}
          </div>

          {chemistry && (
            <div style={{ ...M.panel, animation: "fadeUp 0.3s ease" }}>
              <div style={M.panelHead}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>⚗️ Chemistry Score</span>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 28, fontWeight: 800, color: chemColor }}>
                  {chemistry.overall}<span style={{ fontSize: 14, color: T.ink4 }}>/100</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <ScoreRing value={chemistry.skillCoverage} color={T.indigo} label="Skill Coverage" />
                <ScoreRing value={chemistry.diversity}     color={T.blue}   label="Diversity"      />
                <ScoreRing value={chemistry.eloBalance}    color="#8b5cf6" label="ELO Balance"    />
                <ScoreRing value={chemistry.avgReadiness}  color={T.green}  label="Avg Readiness"  />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {chemistry.domains.map((d, i) => (
                  <span key={i} style={{ fontSize: 11, color: domainColor(d), background: `${domainColor(d)}11`, border: `1px solid ${domainColor(d)}33`, padding: "2px 10px", borderRadius: 20 }}>
                    ◆ {d}
                  </span>
                ))}
              </div>
              {(chemistry.gaps || []).map((g, i) => (
                <div key={i} style={{ fontSize: 12, color: T.ink2, padding: "2px 0" }}>
                  {chemistry.overall >= 70 ? "✅" : "⚠️"} {g}
                </div>
              ))}
            </div>
          )}

          {team.length >= 2 && (
            <div style={M.panel}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>📡 Team Skill Radar</div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <TeamRadar team={team} size={220} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — AI + Saved */}
        <div style={M.right}>
          <div style={M.panel}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>🤖 AI Analysis</div>
            {team.length < 2 ? (
              <div style={{ fontSize: 13, color: T.ink3, textAlign: "center", padding: "20px 0" }}>
                Add at least 2 candidates to enable AI analysis
              </div>
            ) : (
              <AIPanel team={team} chemistry={chemistry} />
            )}
          </div>

          <div style={M.panel}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>💾 Saved Teams</div>
            {savedLoading ? (
              <div style={{ fontSize: 12, color: T.ink4, padding: "8px 0" }}>Loading…</div>
            ) : savedTeams.length === 0 ? (
              <div style={{ fontSize: 12, color: T.ink4, padding: "8px 0" }}>No saved teams yet.</div>
            ) : (
              savedTeams.map((t) => (
                <div key={t.id} style={M.savedTeamRow}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: T.ink4 }}>{(t.member_ids || []).length} members</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => loadTeam(t)} style={M.loadBtn}>Load</button>
                    <button onClick={() => deleteTeam(t.id)} style={M.delBtn}>✕</button>
                  </div>
                </div>
              ))
            )}
            <button onClick={saveTeam} disabled={saving || !teamName.trim() || team.length === 0} style={M.saveBtn}>
              {saving ? "Saving…" : "💾 Save Current Team"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const M = {
  layout:       { display: "grid", gridTemplateColumns: "240px 1fr 260px", gap: 14, alignItems: "start" },
  left:         { display: "flex", flexDirection: "column", gap: 14 },
  center:       { display: "flex", flexDirection: "column", gap: 14 },
  right:        { display: "flex", flexDirection: "column", gap: 14 },
  panel:        { background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, boxShadow: T.shadow },
  panelHead:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  search:       { width: "100%", padding: "8px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 12, fontFamily: "'Inter',sans-serif", marginBottom: 10 },
  candidateList:{ maxHeight: 480, overflowY: "auto" },
  candidateRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 4px", borderRadius: 8, cursor: "default", transition: "background 0.15s" },
  miniAvatar:   { width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  addBtn:       { width: 24, height: 24, flexShrink: 0, background: T.indigo3, border: `1px solid ${T.indigo}30`, borderRadius: 6, color: T.indigo, fontSize: 16, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  teamNameInput:{ flex: 1, padding: "7px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 14, fontWeight: 600, fontFamily: "'Inter',sans-serif", marginRight: 10 },
  emptyTeam:    { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "24px 0", color: T.ink3 },
  savedTeamRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` },
  loadBtn:      { padding: "4px 10px", background: T.indigo3, border: `1px solid ${T.indigo}20`, borderRadius: 6, color: T.indigo, fontSize: 11, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  delBtn:       { padding: "4px 8px", background: T.red2, border: `1px solid ${T.red}20`, borderRadius: 6, color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  saveBtn:      { marginTop: 10, width: "100%", padding: "8px", background: T.green2, border: `1px solid ${T.green}20`, borderRadius: 8, color: T.green, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
}
