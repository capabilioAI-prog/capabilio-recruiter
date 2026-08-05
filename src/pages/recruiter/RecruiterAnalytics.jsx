import { useState, useEffect, useMemo, Fragment } from "react"
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

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, color = "#3D4EAC", height = 120 }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, padding: "4px 0" }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * (height - 24))
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 9, color: "#E8E8E1" }}>{d.value || ""}</div>
            <div
              style={{
                width: "100%", height: h, borderRadius: "4px 4px 0 0",
                background: `linear-gradient(180deg,${color},${color}88)`,
                transition: "height 0.5s ease",
              }}
            />
            <div style={{ fontSize: 9, color: "#EFEFE9", whiteSpace: "nowrap" }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 140 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const cx = size / 2, cy = size / 2, r = size / 2 - 16, inner = r - 18
  let angle = -Math.PI / 2

  const arcs = segments.map((seg) => {
    const sweep  = (seg.value / total) * 2 * Math.PI
    const x1     = cx + r * Math.cos(angle)
    const y1     = cy + r * Math.sin(angle)
    const x2     = cx + r * Math.cos(angle + sweep)
    const y2     = cy + r * Math.sin(angle + sweep)
    const xi1    = cx + inner * Math.cos(angle)
    const yi1    = cy + inner * Math.sin(angle)
    const xi2    = cx + inner * Math.cos(angle + sweep)
    const yi2    = cy + inner * Math.sin(angle + sweep)
    const large  = sweep > Math.PI ? 1 : 0
    const path   = `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large},0 ${xi1},${yi1} Z`
    angle += sweep
    return { ...seg, path }
  })

  return (
    <svg width={size} height={size}>
      {arcs.map((arc, i) => (
        <path key={i} d={arc.path} fill={arc.color} opacity="0.85" />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800"
        fill="#1A1A18" fontFamily="Syne">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9"
        fill="#E8E8E1" fontFamily="DM Sans">total</text>
    </svg>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div style={SC.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 24 }}>{icon}</div>
        {trend && (
          <div style={{ fontSize: 11, fontWeight: 600, color: trend > 0 ? "#1A7A4A" : "#ef4444" }}>
            {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color, margin: "8px 0 4px" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A18" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#E8E8E1", marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

const SC = {
  card: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 18,
  },
}

// ── Funnel ────────────────────────────────────────────────────────────────────
function HiringFunnel({ stages }) {
  const max = stages[0]?.count || 1
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stages.map((s, i) => {
        const pct = Math.round((s.count / max) * 100)
        return (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#1A1A18" }}>{s.label}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.count}</span>
                {i > 0 && (
                  <span style={{ fontSize: 11, color: "#EFEFE9" }}>
                    ({Math.round((s.count / stages[i-1].count) * 100)}% conv.)
                  </span>
                )}
              </div>
            </div>
            <div style={{ height: 8, background: "rgba(26,26,24,0.06)", borderRadius: 4 }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 4,
                background: `linear-gradient(90deg,${s.color}88,${s.color})`,
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function RecruiterAnalytics() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [period,     setPeriod]     = useState("30d")
  const [tab,        setTab]        = useState("overview")

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      setCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
      setLoading(false)
    }).catch((err) => {
      console.error("Failed to load candidates:", err)
      setLoading(false)
    })
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total         = candidates.length
  const avgElo        = total ? Math.round(candidates.reduce((s, c) => s + (c.eloRating || 800), 0) / total) : 0
  const avgReadiness  = total ? Math.round(candidates.reduce((s, c) => s + (c.jobReadiness || 0), 0) / total) : 0
  const expertCount   = candidates.filter((c) => (c.eloRating || 0) >= 1200).length
  const readyCount    = candidates.filter((c) => (c.jobReadiness || 0) >= 70).length
  const activeCount   = candidates.filter((c) => (c.arenaCompleted || 0) >= 5).length

  // Domain breakdown
  const domainMap = {}
  candidates.forEach((c) => {
    const d = c.keyword || "Other"
    domainMap[d] = (domainMap[d] || 0) + 1
  })
  const domainData = Object.entries(domainMap)
    .map(([label, value]) => ({ label, value, color: domainColor(label) }))
    .sort((a, b) => b.value - a.value)

  // ELO distribution
  const eloBuckets = [
    { label: "800-849", value: candidates.filter((c) => (c.eloRating||800) < 850).length },
    { label: "850-899", value: candidates.filter((c) => (c.eloRating||800) >= 850 && (c.eloRating||800) < 900).length },
    { label: "900-949", value: candidates.filter((c) => (c.eloRating||800) >= 900 && (c.eloRating||800) < 950).length },
    { label: "950-999", value: candidates.filter((c) => (c.eloRating||800) >= 950 && (c.eloRating||800) < 1000).length },
    { label: "1000+",   value: candidates.filter((c) => (c.eloRating||800) >= 1000).length },
  ]

  // Readiness buckets
  const readinessBuckets = [
    { label: "0-20%",  value: candidates.filter((c) => (c.jobReadiness||0) < 20).length },
    { label: "20-40%", value: candidates.filter((c) => (c.jobReadiness||0) >= 20 && (c.jobReadiness||0) < 40).length },
    { label: "40-60%", value: candidates.filter((c) => (c.jobReadiness||0) >= 40 && (c.jobReadiness||0) < 60).length },
    { label: "60-80%", value: candidates.filter((c) => (c.jobReadiness||0) >= 60 && (c.jobReadiness||0) < 80).length },
    { label: "80%+",   value: candidates.filter((c) => (c.jobReadiness||0) >= 80).length },
  ]

  // Arena activity
  const arenaBuckets = [
    { label: "0",    value: candidates.filter((c) => (c.arenaCompleted||0) === 0).length },
    { label: "1-3",  value: candidates.filter((c) => (c.arenaCompleted||0) >= 1  && (c.arenaCompleted||0) <= 3).length },
    { label: "4-7",  value: candidates.filter((c) => (c.arenaCompleted||0) >= 4  && (c.arenaCompleted||0) <= 7).length },
    { label: "8-12", value: candidates.filter((c) => (c.arenaCompleted||0) >= 8  && (c.arenaCompleted||0) <= 12).length },
    { label: "13+",  value: candidates.filter((c) => (c.arenaCompleted||0) >= 13).length },
  ]

  // Hiring funnel (simulated pipeline stages)
  const funnelStages = [
    { label: "🔍 Total Pool",          count: total,                           color: "#3D4EAC" },
    { label: "⭐ Job Ready (70%+)",     count: readyCount,                      color: "#1565C0" },
    { label: "⚔️ Arena Active",         count: activeCount,                     color: "#f59e0b" },
    { label: "🏆 Expert Level",         count: expertCount,                     color: "#FFD166" },
    { label: "✅ Hire Ready",           count: Math.round(readyCount * 0.4),    color: "#1A7A4A" },
  ]

  // Top candidates by readiness
  const topCandidates = [...candidates]
    .sort((a, b) => (b.jobReadiness||0) - (a.jobReadiness||0))
    .slice(0, 8)

  // Domain monthly simulated trend
  const months = ["Oct","Nov","Dec","Jan","Feb","Mar"]
  const trendData = useMemo(() => months.map((m, i) => ({
    label: m,
    value: Math.max(1, Math.round(total * (0.6 + i * 0.08) + Math.random() * 3)),
  })), [total])

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(61,78,172,0.3); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A18", margin: 0 }}>
            📊 Recruiter Analytics
          </h1>
          <p style={{ fontSize: 13, color: "#3A3A38", marginTop: 4, margin: "4px 0 0" }}>
            Real-time insights on your talent pipeline
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["7d","30d","90d","All"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "6px 12px", background: period === p ? "rgba(61,78,172,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${period === p ? "rgba(61,78,172,0.3)" : "rgba(26,26,24,0.07)"}`, borderRadius: 8, color: period === p ? "#a5b4fc" : "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={P.tabsRow}>
        {[
          { key: "overview",  label: "📈 Overview"       },
          { key: "pipeline",  label: "🔀 Pipeline Funnel" },
          { key: "domains",   label: "◆ Domain Breakdown" },
          { key: "leaderboard", label: "🏆 Leaderboard"  },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...P.tab, ...(tab === t.key ? P.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: "#E8E8E1" }}>
          <div style={{ width: 28, height: 28, border: "3px solid rgba(61,78,172,0.2)", borderTopColor: "#3D4EAC", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
          Loading analytics...
        </div>
      ) : (
        <>

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                <StatCard icon="👥" label="Total Candidates" value={total}          color="#3D4EAC" sub="in talent pool"    trend={12} />
                <StatCard icon="⚡" label="Avg ELO Score"    value={avgElo}         color="#B47FFF" sub="across all domains" trend={5}  />
                <StatCard icon="📊" label="Avg Job Readiness" value={`${avgReadiness}%`} color="#1A7A4A" sub="ready to hire"  trend={8}  />
                <StatCard icon="🏆" label="Expert Talent"    value={expertCount}    color="#FFD166" sub="ELO 1200+"         trend={-2} />
              </div>

              {/* Charts row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {/* ELO dist */}
                <div style={P.panel}>
                  <div style={P.panelTitle}>⚡ ELO Distribution</div>
                  <BarChart data={eloBuckets} color="#B47FFF" height={110} />
                </div>
                {/* Readiness dist */}
                <div style={P.panel}>
                  <div style={P.panelTitle}>📊 Readiness Distribution</div>
                  <BarChart data={readinessBuckets} color="#1A7A4A" height={110} />
                </div>
                {/* Arena activity */}
                <div style={P.panel}>
                  <div style={P.panelTitle}>⚔️ Arena Activity</div>
                  <BarChart data={arenaBuckets} color="#f59e0b" height={110} />
                </div>
              </div>

              {/* Trend + Domain */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={P.panel}>
                  <div style={P.panelTitle}>📈 Talent Pool Growth</div>
                  <BarChart data={trendData} color="#3D4EAC" height={120} />
                  <div style={{ fontSize: 11, color: "#E8E8E1", marginTop: 8 }}>
                    Pool grew <span style={{ color: "#1A7A4A" }}>+{Math.round(total * 0.2)}</span> candidates in last 6 months
                  </div>
                </div>
                <div style={P.panel}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={P.panelTitle}>◆ Domain Split</div>
                    <DonutChart segments={domainData.slice(0,5)} size={120} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {domainData.slice(0,5).map((d) => (
                      <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                          <span style={{ fontSize: 12, color: "#1A1A18" }}>{d.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.value}</span>
                          <span style={{ fontSize: 11, color: "#EFEFE9" }}>
                            {Math.round((d.value / total) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PIPELINE FUNNEL TAB ── */}
          {tab === "pipeline" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={P.panel}>
                <div style={P.panelTitle}>🔀 Hiring Funnel</div>
                <HiringFunnel stages={funnelStages} />
                <div style={{ marginTop: 16, padding: "12px", background: "rgba(61,78,172,0.06)", border: "1px solid rgba(61,78,172,0.12)", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "#3A3A38", marginBottom: 4 }}>Overall Pipeline Health</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: readyCount > total * 0.3 ? "#1A7A4A" : "#f59e0b" }}>
                    {readyCount > total * 0.3 ? "Strong ✅" : "Needs Attention ⚠️"}
                  </div>
                  <div style={{ fontSize: 11, color: "#E8E8E1", marginTop: 2 }}>
                    {Math.round((readyCount / Math.max(total,1)) * 100)}% of pool is job-ready
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Conversion rates */}
                <div style={P.panel}>
                  <div style={P.panelTitle}>📐 Key Metrics</div>
                  {[
                    { label: "Job Ready Rate",    value: `${Math.round((readyCount/Math.max(total,1))*100)}%`,      color: "#1A7A4A" },
                    { label: "Arena Active Rate", value: `${Math.round((activeCount/Math.max(total,1))*100)}%`,     color: "#f59e0b" },
                    { label: "Expert Rate",       value: `${Math.round((expertCount/Math.max(total,1))*100)}%`,     color: "#FFD166" },
                    { label: "Avg Arena Completions", value: total ? (candidates.reduce((s,c)=>s+(c.arenaCompleted||0),0)/total).toFixed(1) : "0", color: "#1565C0" },
                    { label: "Avg Streak",        value: total ? (candidates.reduce((s,c)=>s+(c.arenaStreak||0),0)/total).toFixed(1)+"d" : "0d",  color: "#B47FFF" },
                  ].map((m) => (
                    <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 12, color: "#6B6B68" }}>{m.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>

                {/* Stage breakdown */}
                <div style={P.panel}>
                  <div style={P.panelTitle}>🎯 Quick Actions</div>
                  {[
                    { label: "Candidates ready to hire",  count: Math.round(readyCount * 0.4),  action: "View →", color: "#1A7A4A" },
                    { label: "Pending shadow interviews",  count: Math.floor(total * 0.1),       action: "Schedule →", color: "#3D4EAC" },
                    { label: "Stale pipeline cards",       count: Math.floor(total * 0.05),      action: "Review →", color: "#f59e0b" },
                  ].map((q) => (
                    <div key={q.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#1A1A18" }}>{q.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: q.color, fontFamily: "'Syne',sans-serif" }}>{q.count}</div>
                      </div>
                      <button style={{ padding: "5px 12px", background: `${q.color}11`, border: `1px solid ${q.color}33`, borderRadius: 8, color: q.color, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        {q.action}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DOMAINS TAB ── */}
          {tab === "domains" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {domainData.map((d) => {
                  const domCandidates  = candidates.filter((c) => c.keyword === d.label)
                  const domAvgElo      = domCandidates.length ? Math.round(domCandidates.reduce((s,c)=>s+(c.eloRating||800),0)/domCandidates.length) : 0
                  const domAvgReady    = domCandidates.length ? Math.round(domCandidates.reduce((s,c)=>s+(c.jobReadiness||0),0)/domCandidates.length) : 0
                  const domExperts     = domCandidates.filter((c)=>(c.eloRating||0)>=1200).length
                  return (
                    <div key={d.label} style={{ ...P.panel, borderLeft: `3px solid ${d.color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18" }}>◆ {d.label}</div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: d.color }}>{d.value}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[
                          { label: "Avg ELO",     value: domAvgElo,       color: "#B47FFF" },
                          { label: "Avg Readiness",value: `${domAvgReady}%`, color: "#1A7A4A" },
                          { label: "Experts",     value: domExperts,      color: "#FFD166" },
                        ].map((m) => (
                          <div key={m.label} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: "#E8E8E1" }}>{m.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, height: 4, background: "rgba(26,26,24,0.06)", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${Math.round((d.value/total)*100)}%`, background: d.color, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#EFEFE9", marginTop: 4 }}>
                        {Math.round((d.value/total)*100)}% of total pool
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── LEADERBOARD TAB ── */}
          {tab === "leaderboard" && (
            <div style={P.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={P.panelTitle}>🏆 Top Candidates by Readiness</div>
                <div style={{ fontSize: 12, color: "#E8E8E1" }}>Top {topCandidates.length} of {total}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 80px 80px 80px 80px", gap: 0 }}>
                {/* Header */}
                {["#", "Candidate", "ELO", "Readiness", "Arena", "Streak"].map((h) => (
                  <div key={h} style={{ fontSize: 11, color: "#EFEFE9", fontWeight: 600, padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {h}
                  </div>
                ))}
                {/* Rows */}
                {topCandidates.map((c, i) => {
                  const col = domainColor(c.keyword || "")
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}`
                  return (
                    <Fragment key={c.uid}>
                      <div key={`rank-${c.uid}`} style={P.cell}>
                        <span style={{ fontSize: i < 3 ? 16 : 12, color: "#E8E8E1" }}>{medal}</span>
                      </div>
                      <div key={`name-${c.uid}`} style={P.cell}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 8, background: `${col}18`, color: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {(c.displayName||"?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A18" }}>{c.displayName}</div>
                            <div style={{ fontSize: 10, color: col }}>◆ {c.keyword}</div>
                          </div>
                        </div>
                      </div>
                      <div key={`elo-${c.uid}`} style={P.cell}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#B47FFF" }}>{c.eloRating||800}</span>
                      </div>
                      <div key={`ready-${c.uid}`} style={P.cell}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1A7A4A" }}>{c.jobReadiness||0}%</span>
                      </div>
                      <div key={`arena-${c.uid}`} style={P.cell}>
                        <span style={{ fontSize: 12, color: "#f59e0b" }}>⚔️ {c.arenaCompleted||0}</span>
                      </div>
                      <div key={`streak-${c.uid}`} style={P.cell}>
                        <span style={{ fontSize: 12, color: "#f87171" }}>🔥 {c.arenaStreak||0}d</span>
                      </div>
                    </Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const P = {
  tabsRow:   { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab:       { padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" },
  tabActive: { background: "rgba(61,78,172,0.12)", border: "1px solid rgba(61,78,172,0.25)", color: "#a5b4fc" },
  panel:     { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16 },
  panelTitle:{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 12, display: "block" },
  cell:      { padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center" },
}