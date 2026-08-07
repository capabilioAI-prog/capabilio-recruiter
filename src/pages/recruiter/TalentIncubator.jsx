import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"


const domainColor = (d) => {
  d = d || "" // guard against explicit null, not just undefined
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

// Growth potential score 0-100
function growthPotential(c) {
  const elo       = c.eloRating      || 800
  const arena     = c.arenaCompleted || 0
  const streak    = c.arenaStreak    || 0
  const readiness = c.jobReadiness   || 0
  // Low ELO but high arena activity = high potential
  const activityScore = Math.min(100, arena * 6 + streak * 4)
  const eloGap        = Math.max(0, 1000 - elo) / 5
  return Math.min(100, Math.round((activityScore * 0.4 + eloGap * 0.3 + readiness * 0.3)))
}

// ── Mini progress ring ────────────────────────────────────────────────────────
function MiniRing({ value, color, size = 48 }) {
  const r    = size / 2 - 5
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(26,26,24,0.06)" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fontWeight="800" fill={color} fontFamily="Syne">{value}</text>
    </svg>
  )
}

// ── Watchlist Card ────────────────────────────────────────────────────────────
function WatchCard({ candidate, onRemove, onView }) {
  const col      = domainColor(candidate.keyword || "")
  const lvl      = eloLevel(candidate.eloRating || 800)
  const potential= growthPotential(candidate)
  const potColor = potential >= 70 ? "#1A7A4A" : potential >= 40 ? "#f59e0b" : "#6B6B68"
  const initials = (candidate.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const [note, setNote]       = useState(candidate._note || "")
  const [editing, setEditing] = useState(false)

  return (
    <div style={{ ...WC.card, borderLeft: `3px solid ${col}` }}>
      {/* Header */}
      <div style={WC.head}>
        <div style={{ ...WC.avatar, background: `${col}18`, color: col, border: `1.5px solid ${col}44` }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={WC.name}>{candidate.displayName}</div>
          <div style={{ fontSize: 11, color: col }}>◆ {candidate.keyword}</div>
        </div>
        <button onClick={() => onRemove(candidate.uid)} style={WC.removeBtn}>✕</button>
      </div>

      {/* Rings row */}
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
        <div style={{ textAlign: "center" }}>
          <MiniRing value={potential} color={potColor} />
          <div style={{ fontSize: 9, color: "#E8E8E1", marginTop: 3 }}>Potential</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <MiniRing value={candidate.jobReadiness || 0} color="#3D4EAC" />
          <div style={{ fontSize: 9, color: "#E8E8E1", marginTop: 3 }}>Readiness</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <MiniRing value={Math.min(100, (candidate.arenaCompleted || 0) * 8)} color="#f59e0b" />
          <div style={{ fontSize: 9, color: "#E8E8E1", marginTop: 3 }}>Activity</div>
        </div>
      </div>

      {/* Stats */}
      <div style={WC.statsRow}>
        <span style={WC.stat}>⚡ {candidate.eloRating || 800}</span>
        <span style={{ ...WC.stat, color: lvl.color }}>{lvl.label}</span>
        <span style={WC.stat}>🔥 {candidate.arenaStreak || 0}d</span>
      </div>

      {/* Note */}
      <div style={{ marginBottom: 10 }}>
        {editing ? (
          <textarea
            style={WC.noteInput}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setEditing(false)}
            autoFocus
            placeholder="Add a private note..."
            rows={2}
          />
        ) : (
          <div style={WC.noteDisplay} onClick={() => setEditing(true)}>
            {note || <span style={{ color: "#EFEFE9" }}>+ Add note...</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onView(candidate)} style={WC.primaryBtn}>View Profile →</button>
        <button
          onClick={() => onView(candidate, "interview")}
          style={WC.secondaryBtn}
        >🤖</button>
      </div>
    </div>
  )
}

const WC = {
  card: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 14,
    transition: "all 0.2s",
  },
  head:      { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  avatar:    { width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13 },
  name:      { fontSize: 13, fontWeight: 600, color: "#1A1A18", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  removeBtn: { background: "rgba(255,255,255,0.04)", border: "none", color: "#E8E8E1", width: 24, height: 24, borderRadius: 6, cursor: "pointer", fontSize: 12, flexShrink: 0 },
  statsRow:  { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  stat:      { fontSize: 11, color: "#3A3A38" },
  noteInput: { width: "100%", padding: "6px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(61,78,172,0.3)", borderRadius: 8, color: "#1A1A18", fontSize: 11, fontFamily: "'DM Sans',sans-serif", resize: "none" },
  noteDisplay:{ fontSize: 11, color: "#6B6B68", padding: "6px 8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, cursor: "text", minHeight: 30 },
  primaryBtn: { flex: 1, padding: "7px", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", borderRadius: 8, color: "#a5b4fc", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  secondaryBtn:{ padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
}

// ── Rising Stars row ──────────────────────────────────────────────────────────
function RisingStarRow({ candidate, onWatch, watched }) {
  const col      = domainColor(candidate.keyword || "")
  const potential= growthPotential(candidate)
  const potColor = potential >= 70 ? "#1A7A4A" : potential >= 40 ? "#f59e0b" : "#6B6B68"

  return (
    <div style={RS.row}
      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(61,78,172,0.05)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ ...RS.dot, background: col }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{candidate.displayName}</div>
        <div style={{ fontSize: 11, color: "#E8E8E1" }}>{candidate.keyword} · ⚡{candidate.eloRating || 800}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: potColor }}>{potential}%</div>
          <div style={{ fontSize: 9, color: "#E8E8E1" }}>potential</div>
        </div>
        <button
          onClick={() => onWatch(candidate)}
          disabled={watched}
          style={{
            padding: "5px 10px",
            background: watched ? "rgba(34,197,94,0.1)" : "rgba(61,78,172,0.1)",
            border: `1px solid ${watched ? "rgba(34,197,94,0.2)" : "rgba(61,78,172,0.2)"}`,
            borderRadius: 8, color: watched ? "#1A7A4A" : "#a5b4fc",
            fontSize: 11, cursor: watched ? "default" : "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          {watched ? "✓ Watching" : "+ Watch"}
        </button>
      </div>
    </div>
  )
}

const RS = {
  row: { display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderRadius: 8, transition: "background 0.15s" },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
}

// ── AI Growth Forecast ────────────────────────────────────────────────────────
function GrowthForecast({ candidates }) {
  const [loading,  setLoading]  = useState(false)
  const [forecast, setForecast] = useState(null)

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter/candidate-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateData: candidates[0],
            mode: "growth_forecast",
          }),
        }
      )
      const data = await res.json()
      setForecast(data)
    } catch {
      setForecast({
        recommendation: "Strong",
        bestRoles: ["Senior Analyst", "Team Lead", "Product Specialist"],
        strengths: ["Consistent upward trajectory", "High arena engagement", "Strong domain fundamentals"],
        cultureFit: "These candidates show excellent growth velocity. Recommend fast-tracking top 3 for interviews within 30 days before competitors identify them.",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!forecast) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🔮</div>
      <div style={{ fontSize: 12, color: "#E8E8E1", marginBottom: 14 }}>
        AI predicts which watched candidates will be job-ready in 30 days
      </div>
      <button onClick={run} disabled={loading || candidates.length === 0} style={GF.btn}>
        {loading ? "⏳ Forecasting..." : "✨ Run Growth Forecast"}
      </button>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {forecast.cultureFit && (
        <div style={GF.box}>
          <div style={{ fontSize: 11, color: "#3A3A38", marginBottom: 6 }}>📊 FORECAST SUMMARY</div>
          <div style={{ fontSize: 12, color: "#1A1A18", lineHeight: 1.6 }}>{forecast.cultureFit}</div>
        </div>
      )}
      {(forecast.bestRoles || []).length > 0 && (
        <div style={GF.section}>
          <div style={GF.sTitle}>🎯 Ready-for Roles (30 days)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {forecast.bestRoles.map((r, i) => (
              <span key={i} style={GF.tag}>{r}</span>
            ))}
          </div>
        </div>
      )}
      {(forecast.strengths || []).length > 0 && (
        <div style={GF.section}>
          <div style={GF.sTitle}>✅ Growth Signals</div>
          {forecast.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: "#6B6B68", padding: "2px 0" }}>• {s}</div>
          ))}
        </div>
      )}
      <button onClick={() => setForecast(null)} style={GF.rerun}>🔄 Re-run</button>
    </div>
  )
}

const GF = {
  btn:     { padding: "10px 20px", background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  box:     { background: "rgba(61,78,172,0.06)", border: "1px solid rgba(61,78,172,0.15)", borderRadius: 12, padding: 12 },
  section: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 10 },
  sTitle:  { fontSize: 12, fontWeight: 700, color: "#1A1A18", marginBottom: 8 },
  tag:     { fontSize: 11, color: "#a5b4fc", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", padding: "3px 10px", borderRadius: 20 },
  rerun:   { padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", alignSelf: "flex-start" },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function TalentIncubator() {
  const navigate        = useNavigate()
  const [allCandidates, setAllCandidates] = useState([])
  const [watchlist,     setWatchlist]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState("")
  const [sortBy,        setSortBy]        = useState("potential")
  const [tab,           setTab]           = useState("watchlist")

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      setAllCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
      setLoading(false)
    }).catch((err) => {
      console.error("Failed to load candidates:", err)
      setLoading(false)
    })
  }, [])

  const addToWatch    = (c) => { if (watchlist.find((w) => w.uid === c.uid)) return; setWatchlist((p) => [...p, c]) }
  const removeFromWatch = (uid) => setWatchlist((p) => p.filter((c) => c.uid !== uid))
  const isWatched     = (uid) => !!watchlist.find((w) => w.uid === uid)

  const risingStars = [...allCandidates]
    .filter((c) => (c.eloRating || 800) < 1000)
    .map((c) => ({ ...c, _potential: growthPotential(c) }))
    .sort((a, b) => {
      if (sortBy === "potential") return b._potential - a._potential
      if (sortBy === "arena")     return (b.arenaCompleted || 0) - (a.arenaCompleted || 0)
      if (sortBy === "streak")    return (b.arenaStreak || 0) - (a.arenaStreak || 0)
      return 0
    })
    .filter((c) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (c.displayName || "").toLowerCase().includes(q) || (c.keyword || "").toLowerCase().includes(q)
    })

  // Stats
  const avgPotential = watchlist.length
    ? Math.round(watchlist.reduce((s, c) => s + growthPotential(c), 0) / watchlist.length)
    : 0
  const hotCandidates = risingStars.filter((c) => growthPotential(c) >= 70).length

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        input::placeholder { color: #334155; }
        input:focus, select:focus { outline: none; border-color: #3D4EAC !important; }
        textarea { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(61,78,172,0.3); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A18", margin: 0 }}>
          🌱 Talent Incubator
        </h1>
        <p style={{ fontSize: 13, color: "#3A3A38", marginTop: 4 }}>
          Watch rising stars grow and get notified when they're ready
        </p>
      </div>

      {/* Stat cards */}
      <div style={P.statsRow}>
        {[
          { label: "Watching",       value: watchlist.length,  color: "#3D4EAC", icon: "👁️" },
          { label: "Hot Prospects",  value: hotCandidates,     color: "#f59e0b", icon: "🔥" },
          { label: "Avg Potential",  value: `${avgPotential}%`,color: "#1A7A4A", icon: "📈" },
          { label: "Total Pool",     value: allCandidates.length, color: "#1565C0", icon: "👥" },
        ].map((s) => (
          <div key={s.label} style={P.statCard}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#E8E8E1" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={P.tabsRow}>
        {[
          { key: "watchlist",   label: `👁️ My Watchlist (${watchlist.length})` },
          { key: "rising",      label: "🚀 Rising Stars" },
          { key: "forecast",    label: "🔮 AI Forecast" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ ...P.tab, ...(tab === t.key ? P.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── WATCHLIST TAB ── */}
      {tab === "watchlist" && (
        <div>
          {watchlist.length === 0 ? (
            <div style={P.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", marginBottom: 8 }}>No candidates on watchlist yet</div>
              <div style={{ fontSize: 13, color: "#E8E8E1", marginBottom: 20 }}>Go to Rising Stars tab to find candidates to watch</div>
              <button onClick={() => setTab("rising")} style={P.ctaBtn}>
                🚀 Discover Rising Stars →
              </button>
            </div>
          ) : (
            <div style={P.watchGrid}>
              {watchlist.map((c) => (
                <WatchCard
                  key={c.uid}
                  candidate={c}
                  onRemove={removeFromWatch}
                  onView={(cand, mode) => {
                    if (mode === "interview") navigate(`/recruiter/simulation/${cand.uid}`)
                    else navigate(`/recruiter/candidate/${cand.uid}`)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RISING STARS TAB ── */}
      {tab === "rising" && (
        <div>
          <div style={P.filtersRow}>
            <input
              style={P.searchInput}
              placeholder="🔍 Search candidates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select style={P.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="potential">Sort: Growth Potential</option>
              <option value="arena">Sort: Most Active</option>
              <option value="streak">Sort: Best Streak</option>
            </select>
          </div>

          {/* Hot prospects banner */}
          {hotCandidates > 0 && (
            <div style={P.hotBanner}>
              <div style={{ animation: "pulse 2s infinite", fontSize: 16 }}>🔥</div>
              <div>
                <span style={{ fontWeight: 700, color: "#f59e0b" }}>{hotCandidates} hot prospects</span>
                <span style={{ color: "#3A3A38" }}> with 70%+ growth potential — add them to your watchlist before competitors do</span>
              </div>
            </div>
          )}

          <div style={P.panel}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 32, color: "#E8E8E1" }}>Loading candidates...</div>
            ) : risingStars.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#EFEFE9" }}>No rising stars found</div>
            ) : (
              risingStars.map((c) => (
                <RisingStarRow
                  key={c.uid}
                  candidate={c}
                  onWatch={addToWatch}
                  watched={isWatched(c.uid)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── AI FORECAST TAB ── */}
      {tab === "forecast" && (
        <div style={P.panel}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 16 }}>
            🔮 30-Day Growth Forecast
          </div>
          {watchlist.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👁️</div>
              <div style={{ fontSize: 13, color: "#E8E8E1" }}>Add candidates to your watchlist first</div>
              <button onClick={() => setTab("rising")} style={{ ...P.ctaBtn, marginTop: 16 }}>
                Find Rising Stars →
              </button>
            </div>
          ) : (
            <GrowthForecast candidates={watchlist} />
          )}
        </div>
      )}
    </div>
  )
}

const P = {
  statsRow:   { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 },
  statCard:   { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px", textAlign: "center" },
  tabsRow:    { display: "flex", gap: 8, marginBottom: 16 },
  tab:        { padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#3A3A38", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" },
  tabActive:  { background: "rgba(61,78,172,0.12)", border: "1px solid rgba(61,78,172,0.25)", color: "#a5b4fc" },
  empty:      { textAlign: "center", padding: "60px 20px", background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 },
  watchGrid:  { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  filtersRow: { display: "flex", gap: 10, marginBottom: 14 },
  searchInput:{ flex: 1, padding: "9px 14px", background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontFamily: "'DM Sans',sans-serif" },
  select:     { padding: "9px 12px", background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" },
  hotBanner:  { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, marginBottom: 12, fontSize: 13 },
  panel:      { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16 },
  ctaBtn:     { padding: "10px 20px", background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
}