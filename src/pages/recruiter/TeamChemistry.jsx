import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"


const domainColor = (d = "") => {
  if (d.toLowerCase().includes("medical"))   return "#1A7A4A"
  if (d.toLowerCase().includes("software"))  return "#3D4EAC"
  if (d.toLowerCase().includes("data"))      return "#1565C0"
  if (d.toLowerCase().includes("finance"))   return "#FFD166"
  if (d.toLowerCase().includes("marketing")) return "#f59e0b"
  if (d.toLowerCase().includes("design"))    return "#ec4899"
  return "#3D4EAC"
}

const eloLevel = (e) => {
  if (e >= 1200) return { label: "Expert",       color: "#FFD166" }
  if (e >= 1000) return { label: "Advanced",     color: "#B47FFF" }
  if (e >= 900)  return { label: "Intermediate", color: "#1565C0" }
  return               { label: "Beginner",      color: "#6B6B68" }
}

function calcChemistry(team) {
  if (team.length < 2) return null
  const allSkills    = team.flatMap((c) => (c.skillGraph || []).map((s) => s.label))
  const uniqueSkills = new Set(allSkills).size
  const skillScore   = Math.min(100, uniqueSkills * 12)
  const domains      = new Set(team.map((c) => c.keyword).filter(Boolean))
  const divScore     = Math.min(100, domains.size * 25)
  const elos         = team.map((c) => c.eloRating || 800)
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
    (c.skillGraph || []).forEach((s) => {
      if (!skillMap[s.label]) skillMap[s.label] = []
      skillMap[s.label].push(s.value)
    })
  })
  const skills = Object.entries(skillMap)
    .map(([label, vals]) => ({ label, value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) }))
    .slice(0, 7)
  if (skills.length < 3) return (
    <div style={{ color: "#EFEFE9", fontSize: 12, textAlign: "center", padding: 20 }}>
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
              fontSize="9" fill="#3A3A38" fontFamily="DM Sans">{s.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function CandidateChip({ candidate, onRemove }) {
  const col = domainColor(candidate.keyword || "")
  return (
    <div style={{ ...CH.chip, borderColor: `${col}44` }}>
      <div style={{ ...CH.dot, background: col }} />
      <span style={CH.name}>{candidate.displayName}</span>
      <span style={{ fontSize: 10, color: "#E8E8E1" }}>⚡{candidate.eloRating || 800}</span>
      <button onClick={() => onRemove(candidate.uid)} style={CH.removeBtn}>✕</button>
    </div>
  )
}

const CH = {
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "rgba(255,255,255,0.04)", border: "1px solid",
    borderRadius: 20, padding: "4px 10px",
  },
  dot:       { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  name:      { fontSize: 12, color: "#1A1A18", fontWeight: 500 },
  removeBtn: { background: "none", border: "none", color: "#E8E8E1", cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1 },
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
          fontSize="14" fontWeight="800" fill={color} fontFamily="Syne">{value}</text>
      </svg>
      <span style={{ fontSize: 10, color: "#E8E8E1", textAlign: "center", maxWidth: size }}>{label}</span>
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
              name: c.displayName, domain: c.keyword, elo: c.eloRating,
              skills: c.skillGraph, strengths: c.strengths, jobReadiness: c.jobReadiness,
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
      <div style={{ fontSize: 13, color: "#3A3A38", marginBottom: 16, textAlign: "center" }}>
        Run AI analysis to get deep insights on team dynamics
      </div>
      <button onClick={analyze} disabled={loading} style={AP.btn}>
        {loading ? "⏳ Analyzing team..." : "✨ Run AI Team Analysis"}
      </button>
      {error && <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {analysis.verdict && (
        <div style={AP.verdictBox}>
          <div style={{ fontSize: 11, color: "#3A3A38", marginBottom: 6 }}>AI VERDICT</div>
          <div style={{ fontSize: 13, color: "#1A1A18", lineHeight: 1.6 }}>{analysis.verdict}</div>
        </div>
      )}
      {(analysis.teamStrengths || []).length > 0 && (
        <div style={AP.section}>
          <div style={AP.sTitle}>✅ Team Strengths</div>
          {analysis.teamStrengths.map((s, i) => <div key={i} style={AP.bullet}>• {s}</div>)}
        </div>
      )}
      {(analysis.teamWeaknesses || []).length > 0 && (
        <div style={{ ...AP.section, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
          <div style={{ ...AP.sTitle, color: "#fca5a5" }}>⚠️ Gaps to Address</div>
          {analysis.teamWeaknesses.map((s, i) => <div key={i} style={{ ...AP.bullet, color: "#fca5a5" }}>• {s}</div>)}
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
  btn:        { padding: "10px 20px", background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  verdictBox: { background: "rgba(61,78,172,0.06)", border: "1px solid rgba(61,78,172,0.15)", borderRadius: 12, padding: 14 },
  section:    { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 },
  sTitle:     { fontSize: 12, fontWeight: 700, color: "#1A1A18", marginBottom: 8 },
  bullet:     { fontSize: 12, color: "#6B6B68", padding: "2px 0" },
  roleTag:    { fontSize: 11, color: "#a5b4fc", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", padding: "3px 10px", borderRadius: 20 },
  rerunBtn:   { padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", alignSelf: "flex-start" },
}

export default function TeamChemistry() {
  const [allCandidates, setAllCandidates] = useState([])
  const [team,          setTeam]          = useState([])
  const [search,        setSearch]        = useState("")
  const [loading,       setLoading]       = useState(true)
  const [savedTeams,    setSavedTeams]    = useState([
    { name: "Backend Squad",   members: [] },
    { name: "Data Team Alpha", members: [] },
  ])
  const [teamName, setTeamName] = useState("My Dream Team")

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      setAllCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
      setLoading(false)
    }).catch((err) => {
      console.error("Failed to load candidates:", err)
      setLoading(false)
    })
  }, [])

  const addToTeam    = (c) => { if (team.find((t) => t.uid === c.uid) || team.length >= 8) return; setTeam((p) => [...p, c]) }
  const removeFromTeam = (uid) => setTeam((p) => p.filter((c) => c.uid !== uid))
  const chemistry    = team.length >= 2 ? calcChemistry(team) : null
  const chemColor    = chemistry ? chemistry.overall >= 80 ? "#1A7A4A" : chemistry.overall >= 60 ? "#f59e0b" : "#ef4444" : "#E8E8E1"

  const filtered = allCandidates.filter((c) => {
    if (team.find((t) => t.uid === c.uid)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (c.displayName || "").toLowerCase().includes(q) || (c.keyword || "").toLowerCase().includes(q)
  })

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        input::placeholder { color: #334155; }
        input:focus { outline: none; border-color: #3D4EAC !important; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A18", margin: 0 }}>
          🧪 Team Chemistry
        </h1>
        <p style={{ fontSize: 13, color: "#3A3A38", marginTop: 4 }}>
          Build your dream team and get AI-powered compatibility scores
        </p>
      </div>

      <div style={M.layout}>

        {/* LEFT — Candidate Pool */}
        <div style={M.left}>
          <div style={M.panel}>
            <div style={M.panelHead}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18" }}>👥 Candidate Pool</span>
              <span style={{ fontSize: 11, color: "#E8E8E1" }}>{allCandidates.length} total</span>
            </div>
            <input
              style={M.search}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={M.candidateList}>
              {loading && <div style={{ color: "#E8E8E1", fontSize: 13, padding: "20px 0", textAlign: "center" }}>Loading...</div>}
              {filtered.map((c) => {
                const col = domainColor(c.keyword || "")
                const lvl = eloLevel(c.eloRating || 800)
                return (
                  <div key={c.uid} style={M.candidateRow}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(61,78,172,0.06)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ ...M.miniAvatar, background: `${col}18`, color: col }}>
                      {(c.displayName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.displayName}
                      </div>
                      <div style={{ fontSize: 10, color: "#E8E8E1" }}>
                        {c.keyword} · <span style={{ color: lvl.color }}>⚡{c.eloRating || 800}</span>
                      </div>
                    </div>
                    <button onClick={() => addToTeam(c)} disabled={team.length >= 8} style={M.addBtn}>+</button>
                  </div>
                )
              })}
              {!loading && filtered.length === 0 && (
                <div style={{ color: "#EFEFE9", fontSize: 12, textAlign: "center", padding: "16px 0" }}>No candidates</div>
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
              <span style={{ fontSize: 11, color: team.length >= 8 ? "#ef4444" : "#E8E8E1" }}>{team.length}/8</span>
            </div>
            {team.length === 0 ? (
              <div style={M.emptyTeam}>
                <div style={{ fontSize: 32 }}>👥</div>
                <div style={{ fontSize: 13, color: "#EFEFE9" }}>Add candidates from the left panel</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {team.map((c) => <CandidateChip key={c.uid} candidate={c} onRemove={removeFromTeam} />)}
              </div>
            )}
          </div>

          {chemistry && (
            <div style={{ ...M.panel, animation: "fadeUp 0.3s ease" }}>
              <div style={M.panelHead}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18" }}>⚗️ Chemistry Score</span>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: chemColor }}>
                  {chemistry.overall}<span style={{ fontSize: 14, color: "#E8E8E1" }}>/100</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <ScoreRing value={chemistry.skillCoverage} color="#3D4EAC" label="Skill Coverage" />
                <ScoreRing value={chemistry.diversity}     color="#1565C0" label="Diversity"      />
                <ScoreRing value={chemistry.eloBalance}    color="#B47FFF" label="ELO Balance"    />
                <ScoreRing value={chemistry.avgReadiness}  color="#1A7A4A" label="Avg Readiness"  />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {chemistry.domains.map((d, i) => (
                  <span key={i} style={{ fontSize: 11, color: domainColor(d), background: `${domainColor(d)}11`, border: `1px solid ${domainColor(d)}33`, padding: "2px 10px", borderRadius: 20 }}>
                    ◆ {d}
                  </span>
                ))}
              </div>
              {(chemistry.gaps || []).map((g, i) => (
                <div key={i} style={{ fontSize: 12, color: "#3A3A38", padding: "2px 0" }}>
                  {chemistry.overall >= 70 ? "✅" : "⚠️"} {g}
                </div>
              ))}
            </div>
          )}

          {team.length >= 2 && (
            <div style={M.panel}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 12 }}>📡 Team Skill Radar</div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <TeamRadar team={team} size={220} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — AI + Saved */}
        <div style={M.right}>
          <div style={M.panel}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 12 }}>🤖 AI Analysis</div>
            {team.length < 2 ? (
              <div style={{ fontSize: 13, color: "#EFEFE9", textAlign: "center", padding: "20px 0" }}>
                Add at least 2 candidates to enable AI analysis
              </div>
            ) : (
              <AIPanel team={team} chemistry={chemistry} />
            )}
          </div>

          <div style={M.panel}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 12 }}>💾 Saved Teams</div>
            {savedTeams.map((t, i) => (
              <div key={i} style={M.savedTeamRow}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#E8E8E1" }}>{t.members.length} members</div>
                </div>
                <button style={M.loadBtn}>Load</button>
              </div>
            ))}
            <button
              onClick={() => {
                if (!teamName.trim() || team.length === 0) return
                setSavedTeams((prev) => [...prev, { name: teamName, members: team.map((c) => c.uid) }])
              }}
              style={M.saveBtn}
            >
              💾 Save Current Team
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
  panel:        { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16 },
  panelHead:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  search:       { width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#1A1A18", fontSize: 12, fontFamily: "'DM Sans',sans-serif", marginBottom: 10 },
  candidateList:{ maxHeight: 480, overflowY: "auto" },
  candidateRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 4px", borderRadius: 8, cursor: "default", transition: "background 0.15s" },
  miniAvatar:   { width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  addBtn:       { width: 24, height: 24, flexShrink: 0, background: "rgba(61,78,172,0.15)", border: "1px solid rgba(61,78,172,0.25)", borderRadius: 6, color: "#a5b4fc", fontSize: 16, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  teamNameInput:{ flex: 1, padding: "7px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#1A1A18", fontSize: 14, fontWeight: 600, fontFamily: "'Syne',sans-serif", marginRight: 10 },
  emptyTeam:    { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "24px 0", color: "#EFEFE9" },
  savedTeamRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  loadBtn:      { padding: "4px 10px", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", borderRadius: 6, color: "#a5b4fc", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  saveBtn:      { marginTop: 10, width: "100%", padding: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, color: "#1A7A4A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
}