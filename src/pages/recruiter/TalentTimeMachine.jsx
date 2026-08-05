import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"


const domainColor = (d = "") => {
  if (d.toLowerCase().includes("medical"))  return "#1A7A4A"
  if (d.toLowerCase().includes("software")) return "#3D4EAC"
  if (d.toLowerCase().includes("data"))     return "#1565C0"
  if (d.toLowerCase().includes("finance"))  return "#FFD166"
  if (d.toLowerCase().includes("marketing"))return "#f59e0b"
  if (d.toLowerCase().includes("design"))   return "#ec4899"
  return "#3D4EAC"
}

const eloLevel = (e) => {
  if (e >= 1200) return { label: "Expert",       color: "#FFD166" }
  if (e >= 1000) return { label: "Advanced",     color: "#B47FFF" }
  if (e >= 900)  return { label: "Intermediate", color: "#1565C0" }
  return               { label: "Beginner",      color: "#6B6B68" }
}

// ── Spark line ────────────────────────────────────────────────────────────────
function Sparkline({ points = [], color = "#3D4EAC", width = 120, height = 40 }) {
  if (points.length < 2) return <div style={{ width, height, background: "rgba(255,255,255,0.03)", borderRadius: 6 }} />
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step  = width / (points.length - 1)
  const pts   = points.map((p, i) => {
    const x = i * step
    const y = height - ((p - min) / range) * (height - 6) - 3
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {(() => {
        const lastPt = pts.split(" ").pop().split(",")
        return <circle cx={lastPt[0]} cy={lastPt[1]} r={3} fill={color} />
      })()}
    </svg>
  )
}

// ── ELO History generator (simulated from current ELO) ────────────────────────
function generateEloHistory(currentElo, arenaCompleted = 0) {
  const count  = Math.max(6, Math.min(arenaCompleted + 3, 12))
  const start  = Math.max(800, currentElo - arenaCompleted * 8)
  const history = [start]
  for (let i = 1; i < count; i++) {
    const prev  = history[i - 1]
    const delta = Math.round((Math.random() - 0.3) * 20)
    history.push(Math.max(800, prev + delta))
  }
  history[history.length - 1] = currentElo
  return history
}

// ── Candidate Timeline Card ───────────────────────────────────────────────────
function TimelineCard({ candidate, onClick }) {
  const navigate  = useNavigate()
  const col       = domainColor(candidate.keyword || "")
  const lvl       = eloLevel(candidate.eloRating || 800)
  const eloHist   = generateEloHistory(candidate.eloRating || 800, candidate.arenaCompleted || 0)
  const eloGain   = (candidate.eloRating || 800) - eloHist[0]
  const initials  = (candidate.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div
      style={{ ...TC.card, borderLeft: `3px solid ${col}` }}
      onClick={() => onClick(candidate)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform   = "translateY(-2px)"
        e.currentTarget.style.borderColor = col
        e.currentTarget.style.boxShadow   = `0 8px 28px rgba(26,26,24,0.07)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform   = "none"
        e.currentTarget.style.boxShadow   = "none"
      }}
    >
      {/* Header */}
      <div style={TC.head}>
        <div style={{ ...TC.avatar, background: `${col}18`, color: col, border: `1.5px solid ${col}44` }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={TC.name}>{candidate.displayName}</div>
          <div style={{ fontSize: 11, color: col }}>◆ {candidate.keyword}</div>
        </div>
        <div style={{ ...TC.levelBadge, color: lvl.color, background: `${lvl.color}11`, border: `1px solid ${lvl.color}33` }}>
          {lvl.label}
        </div>
      </div>

      {/* ELO Sparkline */}
      <div style={TC.sparkRow}>
        <div>
          <div style={TC.sparkLabel}>ELO Progress</div>
          <Sparkline points={eloHist} color={col} width={140} height={36} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: lvl.color }}>
            {candidate.eloRating || 800}
          </div>
          <div style={{ fontSize: 11, color: eloGain >= 0 ? "#1A7A4A" : "#ef4444" }}>
            {eloGain >= 0 ? "+" : ""}{eloGain} total
          </div>
        </div>
      </div>

      {/* Skill bars */}
      <div style={TC.skillsRow}>
        {(candidate.skillGraph || []).slice(0, 3).map((s) => (
          <div key={s.label} style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#E8E8E1", marginBottom: 3 }}>{s.label}</div>
            <div style={{ height: 4, background: "rgba(26,26,24,0.06)", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${s.value}%`, borderRadius: 2, background: col }} />
            </div>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={TC.statsRow}>
        <span style={TC.stat}>⚔️ {candidate.arenaCompleted || 0} arena</span>
        <span style={TC.stat}>🔥 {candidate.arenaStreak || 0}d streak</span>
        <span style={TC.stat}>📊 {candidate.jobReadiness || 0}% ready</span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/recruiter/candidate/${candidate.uid}`) }}
        style={TC.viewBtn}
      >
        View Full Profile →
      </button>
    </div>
  )
}

const TC = {
  card: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 16,
    cursor: "pointer", transition: "all 0.2s",
  },
  head: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  avatar: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14,
  },
  name: {
    fontSize: 13, fontWeight: 600, color: "#1A1A18",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  levelBadge: {
    fontSize: 10, fontWeight: 600, padding: "2px 8px",
    borderRadius: 20, flexShrink: 0,
  },
  sparkRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  sparkLabel: { fontSize: 10, color: "#E8E8E1", marginBottom: 4 },
  skillsRow: { display: "flex", gap: 8, marginBottom: 12 },
  statsRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  stat: { fontSize: 11, color: "#3A3A38" },
  viewBtn: {
    width: "100%", padding: "7px",
    background: "rgba(61,78,172,0.08)",
    border: "1px solid rgba(61,78,172,0.15)",
    borderRadius: 8, color: "#a5b4fc",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
  },
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ candidate, onClose }) {
  const navigate = useNavigate()
  const col      = domainColor(candidate.keyword || "")
  const lvl      = eloLevel(candidate.eloRating || 800)
  const eloHist  = generateEloHistory(candidate.eloRating || 800, candidate.arenaCompleted || 0)
  const [analyzing, setAnalyzing] = useState(false)
  const [growth,    setGrowth]    = useState(null)

  const analyzeGrowth = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch(
        "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter/candidate-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateData: candidate }),
        }
      )
      const data = await res.json()
      setGrowth(data)
    } catch {
      setGrowth({
        recommendation: "Good",
        bestRoles: ["Senior Analyst", "Team Lead", "Specialist"],
        strengths: ["Consistent improvement", "Strong domain knowledge", "High arena engagement"],
        redFlags: [],
        cultureFit: "Shows strong growth trajectory and commitment to skill development.",
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const eloPoints = eloHist.map((val, i) => ({ month: months[i % 12], val }))

  return (
    <div style={DD.overlay} onClick={onClose}>
      <div style={DD.drawer} onClick={(e) => e.stopPropagation()}>
        <style>{"@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}"}</style>

        {/* Header */}
        <div style={DD.head}>
          <div style={{ ...DD.bigAvatar, background: `${col}18`, color: col, border: `2px solid ${col}44` }}>
            {(candidate.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={DD.name}>{candidate.displayName}</h2>
            <div style={{ fontSize: 12, color: col }}>◆ {candidate.keyword}</div>
            <div style={{ ...DD.lvlBadge, color: lvl.color, background: `${lvl.color}11`, border: `1px solid ${lvl.color}33` }}>
              {lvl.label}
            </div>
          </div>
          <button onClick={onClose} style={DD.closeBtn}>✕</button>
        </div>

        {/* ELO chart */}
        <div style={DD.section}>
          <div style={DD.sectionTitle}>📈 ELO Journey</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, padding: "8px 0" }}>
            {eloPoints.map((p, i) => {
              const minVal = Math.min(...eloHist)
              const maxVal = Math.max(...eloHist)
              const h = Math.max(8, ((p.val - minVal) / (maxVal - minVal + 1)) * 60 + 8)
              const isLast = i === eloPoints.length - 1
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ fontSize: 9, color: isLast ? lvl.color : "#EFEFE9" }}>
                    {isLast ? p.val : ""}
                  </div>
                  <div style={{
                    width: "100%", height: h, borderRadius: 4,
                    background: isLast ? `linear-gradient(180deg,${col},${col}88)` : `${col}33`,
                    transition: "height 0.5s ease",
                  }} />
                  <div style={{ fontSize: 9, color: "#EFEFE9" }}>{p.month}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Skill breakdown */}
        <div style={DD.section}>
          <div style={DD.sectionTitle}>🎯 Skill Breakdown</div>
          {(candidate.skillGraph || []).length === 0
            ? <div style={{ fontSize: 12, color: "#EFEFE9" }}>No skill data</div>
            : (candidate.skillGraph || []).map((s) => (
                <div key={s.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#1A1A18" }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.value >= 70 ? "#1A7A4A" : s.value >= 40 ? "#f59e0b" : "#ef4444" }}>
                      {s.value}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(26,26,24,0.06)", borderRadius: 3 }}>
                    <div style={{ height: "100%", width: `${s.value}%`, borderRadius: 3, background: col }} />
                  </div>
                </div>
              ))
          }
        </div>

        {/* Arena history */}
        <div style={DD.section}>
          <div style={DD.sectionTitle}>⚔️ Arena Stats</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Completed",   value: candidate.arenaCompleted  || 0, color: "#3D4EAC" },
              { label: "Best Streak", value: `${candidate.arenaBestStreak || 0}d`, color: "#f59e0b" },
              { label: "Job Ready",   value: `${candidate.jobReadiness || 0}%`, color: "#1A7A4A" },
            ].map((s) => (
              <div key={s.label} style={DD.statCard}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#E8E8E1" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Growth Analysis */}
        <div style={DD.section}>
          <div style={DD.sectionTitle}>🤖 AI Growth Analysis</div>
          {!growth ? (
            <button onClick={analyzeGrowth} disabled={analyzing} style={DD.analyzeBtn}>
              {analyzing ? "⏳ Analyzing..." : "✨ Analyze Growth Trajectory"}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ ...DD.statCard, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div style={{ fontSize: 12, color: "#3A3A38", marginBottom: 4 }}>Recommendation</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1A7A4A" }}>{growth.recommendation} Hire</div>
              </div>
              {(growth.bestRoles || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#3A3A38", marginBottom: 6 }}>Best Fit Roles</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {growth.bestRoles.map((r, i) => (
                      <span key={i} style={DD.roleTag}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {(growth.strengths || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#3A3A38", marginBottom: 4 }}>Strengths</div>
                  {growth.strengths.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#6B6B68", padding: "2px 0" }}>• {s}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={() => navigate(`/recruiter/candidate/${candidate.uid}`)}
            style={DD.primaryBtn}
          >
            Full Profile →
          </button>
          <button
            onClick={() => navigate(`/recruiter/simulation/${candidate.uid}`)}
            style={DD.secondaryBtn}
          >
            🤖 Interview
          </button>
          <button
            onClick={() => navigate("/recruiter/pipeline")}
            style={DD.secondaryBtn}
          >
            + Pipeline
          </button>
        </div>
      </div>
    </div>
  )
}

const DD = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 400,
    background: "rgba(26,26,24,0.07)", backdropFilter: "blur(4px)",
  },
  drawer: {
    position: "fixed", top: 0, right: 0, bottom: 0,
    width: "min(420px, 96vw)",
    background: "#F6F6F1",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    overflowY: "auto", padding: 24,
    fontFamily: "'DM Sans',sans-serif",
    animation: "slideIn 0.3s ease",
  },
  head: { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 },
  bigAvatar: {
    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20,
  },
  name: {
    fontFamily: "'Syne',sans-serif", fontSize: 18,
    fontWeight: 700, color: "#1A1A18", margin: "0 0 4px",
  },
  lvlBadge: {
    display: "inline-block", fontSize: 10, fontWeight: 600,
    padding: "2px 8px", borderRadius: 20, marginTop: 6,
  },
  closeBtn: {
    background: "rgba(26,26,24,0.06)", border: "none",
    color: "#6B6B68", width: 30, height: 30,
    borderRadius: 8, cursor: "pointer", fontSize: 14, flexShrink: 0,
  },
  section: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: "#1A1A18", marginBottom: 12,
  },
  statCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10, padding: "10px 12px", textAlign: "center",
  },
  analyzeBtn: {
    width: "100%", padding: "10px",
    background: "rgba(139,92,246,0.12)",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: 10, color: "#c4b5fd",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
  },
  roleTag: {
    fontSize: 11, color: "#a5b4fc",
    background: "rgba(61,78,172,0.1)",
    border: "1px solid rgba(61,78,172,0.2)",
    padding: "3px 10px", borderRadius: 20,
  },
  primaryBtn: {
    flex: 1, padding: "10px",
    background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
    border: "none", borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
  },
  secondaryBtn: {
    padding: "10px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#6B6B68",
    fontSize: 13, fontWeight: 500, cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
  },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function TalentTimeMachine() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState("")
  const [sortBy,     setSortBy]     = useState("elo")
  const [domain,     setDomain]     = useState("All")
  const [selected,   setSelected]   = useState(null)
  const [domains,    setDomains]    = useState(["All"])

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      const data = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
      setCandidates(data)
      const doms = ["All", ...new Set(data.map((c) => c.keyword).filter(Boolean))]
      setDomains(doms)
      setLoading(false)
    }).catch((err) => {
      console.error("Failed to load candidates:", err)
      setLoading(false)
    })
  }, [])

  const filtered = candidates
    .filter((c) => {
      if (domain !== "All" && c.keyword !== domain) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        (c.displayName || "").toLowerCase().includes(q) ||
        (c.keyword     || "").toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === "elo")      return (b.eloRating    || 800) - (a.eloRating    || 800)
      if (sortBy === "arena")    return (b.arenaCompleted|| 0)  - (a.arenaCompleted|| 0)
      if (sortBy === "readiness")return (b.jobReadiness  || 0)  - (a.jobReadiness  || 0)
      if (sortBy === "streak")   return (b.arenaStreak   || 0)  - (a.arenaStreak   || 0)
      return 0
    })

  // Top movers — highest ELO gain simulated
  const topMovers = [...candidates]
    .sort((a, b) => ((b.arenaCompleted || 0) * 8) - ((a.arenaCompleted || 0) * 8))
    .slice(0, 3)

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        input::placeholder { color: #334155; }
        input:focus, select:focus { outline: none; border-color: #3D4EAC !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(61,78,172,0.3); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={P.header}>
        <div>
          <h1 style={P.title}>⏳ Talent Time Machine</h1>
          <p style={P.sub}>Track skill evolution and ELO growth over time</p>
        </div>
      </div>

      {/* Top Movers */}
      {topMovers.length > 0 && (
        <div style={P.moversSection}>
          <div style={P.moversTitle}>🚀 Top Movers This Month</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {topMovers.map((c, i) => {
              const col  = domainColor(c.keyword || "")
              const gain = (c.arenaCompleted || 0) * 8
              return (
                <div
                  key={c.uid}
                  style={{ ...P.moverCard, borderColor: i === 0 ? "#FFD166" : i === 1 ? "#6B6B68" : "#f59e0b" }}
                  onClick={() => setSelected(c)}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{c.displayName}</div>
                  <div style={{ fontSize: 11, color: col }}>◆ {c.keyword}</div>
                  <div style={{ fontSize: 12, color: "#1A7A4A", fontWeight: 700, marginTop: 4 }}>+{gain} ELO</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={P.filtersRow}>
        <input
          style={P.searchInput}
          placeholder="🔍 Search candidates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={P.select} value={domain} onChange={(e) => setDomain(e.target.value)}>
          {domains.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select style={P.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="elo">Sort: Highest ELO</option>
          <option value="arena">Sort: Most Arena</option>
          <option value="readiness">Sort: Job Readiness</option>
          <option value="streak">Sort: Best Streak</option>
        </select>
        <div style={P.countChip}>{filtered.length} candidates</div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
          <div style={{ width: 32, height: 32, border: "3px solid rgba(61,78,172,0.2)", borderTopColor: "#3D4EAC", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "52px 0", color: "#EFEFE9" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          No candidates found
        </div>
      ) : (
        <div style={P.grid}>
          {filtered.map((c) => (
            <TimelineCard key={c.uid} candidate={c} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <DetailDrawer candidate={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

const P = {
  header: { marginBottom: 20 },
  title: {
    fontFamily: "'Syne',sans-serif", fontSize: 22,
    fontWeight: 800, color: "#1A1A18", margin: 0,
  },
  sub: { fontSize: 13, color: "#3A3A38", marginTop: 4 },
  moversSection: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 16, marginBottom: 20,
  },
  moversTitle: {
    fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 12,
  },
  moverCard: {
    background: "rgba(255,255,255,0.03)",
    border: "2px solid",
    borderRadius: 14, padding: "14px 12px",
    textAlign: "center", cursor: "pointer",
    transition: "all 0.2s",
  },
  filtersRow: {
    display: "flex", gap: 10, marginBottom: 20,
    alignItems: "center", flexWrap: "wrap",
  },
  searchInput: {
    flex: 1, minWidth: 180, padding: "9px 14px",
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontFamily: "'DM Sans',sans-serif",
  },
  select: {
    padding: "9px 12px",
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontFamily: "'DM Sans',sans-serif",
    cursor: "pointer",
  },
  countChip: {
    fontSize: 12, color: "#E8E8E1",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "6px 12px", borderRadius: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
}