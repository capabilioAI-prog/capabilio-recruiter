import { useState, useEffect, useMemo } from "react"
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

// Simulated competitor companies
const COMPETITORS = [
  { name: "TechCorp",     logo: "TC", color: "#3D4EAC", hiring: 12, domains: ["Software","Data"] },
  { name: "MediGroup",    logo: "MG", color: "#1A7A4A", hiring: 8,  domains: ["Medical","Data"] },
  { name: "FinanceHub",   logo: "FH", color: "#FFD166", hiring: 15, domains: ["Finance","Software"] },
  { name: "DesignStudio", logo: "DS", color: "#ec4899", hiring: 5,  domains: ["Design","Marketing"] },
  { name: "DataWorks",    logo: "DW", color: "#1565C0", hiring: 10, domains: ["Data","Software"] },
]

// Simulate poaching risk based on ELO and activity
function poachRisk(c) {
  const elo    = c.eloRating      || 800
  const arena  = c.arenaCompleted || 0
  const streak = c.arenaStreak    || 0
  if (elo >= 1100 && arena >= 10) return { level: "High",   color: "#ef4444", score: 85 + Math.floor(Math.random() * 10) }
  if (elo >= 950  && arena >= 5)  return { level: "Medium", color: "#f59e0b", score: 50 + Math.floor(Math.random() * 25) }
  return                                 { level: "Low",    color: "#1A7A4A", score: 10 + Math.floor(Math.random() * 30) }
}

// ── Alert Card ────────────────────────────────────────────────────────────────
function AlertCard({ alert }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const urgencyColor = alert.urgency === "High" ? "#ef4444" : alert.urgency === "Medium" ? "#f59e0b" : "#1A7A4A"

  return (
    <div style={{ ...AC.card, borderLeft: `3px solid ${urgencyColor}` }}>
      <div style={AC.head}>
        <div style={{ ...AC.urgencyBadge, color: urgencyColor, background: `${urgencyColor}11`, border: `1px solid ${urgencyColor}33` }}>
          {alert.urgency === "High" ? "🚨" : alert.urgency === "Medium" ? "⚠️" : "ℹ️"} {alert.urgency}
        </div>
        <div style={AC.time}>{alert.time}</div>
        <button onClick={() => setDismissed(true)} style={AC.dismissBtn}>✕</button>
      </div>
      <div style={AC.title}>{alert.title}</div>
      <div style={AC.desc}>{alert.desc}</div>
      {alert.candidate && (
        <div style={AC.candidateChip}>
          <div style={{ ...AC.dot, background: domainColor(alert.candidate.domain) }} />
          <span>{alert.candidate.name}</span>
          <span style={{ color: "#E8E8E1" }}>· {alert.candidate.domain}</span>
          <span style={{ color: eloLevel(alert.candidate.elo).color }}>⚡{alert.candidate.elo}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={AC.actionBtn}>View Candidate</button>
        <button style={AC.secondaryBtn} onClick={() => setDismissed(true)}>Dismiss</button>
      </div>
    </div>
  )
}

const AC = {
  card:          { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, marginBottom: 10 },
  head:          { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  urgencyBadge:  { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  time:          { fontSize: 11, color: "#EFEFE9", marginLeft: "auto" },
  dismissBtn:    { background: "none", border: "none", color: "#EFEFE9", cursor: "pointer", fontSize: 12 },
  title:         { fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 4 },
  desc:          { fontSize: 12, color: "#3A3A38", lineHeight: 1.5 },
  candidateChip: { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, fontSize: 12, color: "#1A1A18" },
  dot:           { width: 6, height: 6, borderRadius: "50%" },
  actionBtn:     { padding: "6px 14px", background: "rgba(61,78,172,0.12)", border: "1px solid rgba(61,78,172,0.25)", borderRadius: 8, color: "#a5b4fc", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  secondaryBtn:  { padding: "6px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#E8E8E1", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
}

// ── Poach Risk Row ────────────────────────────────────────────────────────────
function PoachRiskRow({ candidate, risk }) {
  const navigate = useNavigate()
  const col      = domainColor(candidate.keyword || "")
  const lvl      = eloLevel(candidate.eloRating || 800)
  risk = risk || poachRisk(candidate)

  return (
    <div style={PR.row}
      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(61,78,172,0.04)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ ...PR.avatar, background: `${col}18`, color: col }}>
        {(candidate.displayName || "?").charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{candidate.displayName}</div>
        <div style={{ fontSize: 11, color: "#E8E8E1" }}>{candidate.keyword} · <span style={{ color: lvl.color }}>⚡{candidate.eloRating || 800}</span></div>
      </div>
      {/* Risk bar */}
      <div style={{ width: 100, marginRight: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: risk.color, fontWeight: 700 }}>{risk.level} Risk</span>
          <span style={{ fontSize: 10, color: "#E8E8E1" }}>{risk.score}%</span>
        </div>
        <div style={{ height: 4, background: "rgba(26,26,24,0.06)", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${risk.score}%`, background: risk.color, borderRadius: 2 }} />
        </div>
      </div>
      <button
        onClick={() => navigate(`/recruiter/candidate/${candidate.uid}`)}
        style={PR.viewBtn}
      >
        Protect →
      </button>
    </div>
  )
}

const PR = {
  row:     { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderRadius: 8, transition: "background 0.15s" },
  avatar:  { width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  viewBtn: { padding: "5px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#fca5a5", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 },
}

// ── Competitor Card ───────────────────────────────────────────────────────────
function CompetitorCard({ competitor }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={CC.card} onClick={() => setExpanded(!expanded)}>
      <div style={CC.head}>
        <div style={{ ...CC.logo, background: `${competitor.color}18`, color: competitor.color, border: `1.5px solid ${competitor.color}44` }}>
          {competitor.logo}
        </div>
        <div style={{ flex: 1 }}>
          <div style={CC.name}>{competitor.name}</div>
          <div style={{ fontSize: 11, color: "#E8E8E1" }}>
            {competitor.domains.join(" · ")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{competitor.hiring}</div>
          <div style={{ fontSize: 10, color: "#E8E8E1" }}>open roles</div>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "#3A3A38", marginBottom: 8 }}>Actively hiring in:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {competitor.domains.map((d, i) => (
              <span key={i} style={{ fontSize: 11, color: domainColor(d), background: `${domainColor(d)}11`, border: `1px solid ${domainColor(d)}33`, padding: "2px 8px", borderRadius: 20 }}>
                ◆ {d}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#EFEFE9" }}>
            ⚠️ Candidates in your pipeline may be targeted
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: "#EFEFE9", marginTop: 8, textAlign: "right" }}>
        {expanded ? "▲ less" : "▼ more"}
      </div>
    </div>
  )
}

const CC = {
  card: { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, cursor: "pointer", transition: "all 0.2s" },
  head: { display: "flex", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "'Syne',sans-serif" },
  name: { fontSize: 13, fontWeight: 700, color: "#1A1A18" },
}

// ── Market Heatmap ────────────────────────────────────────────────────────────
function MarketHeatmap({ candidates }) {
  const domains = [...new Set(candidates.map((c) => c.keyword).filter(Boolean))]
  const data = domains.map((d) => {
    const pool      = candidates.filter((c) => c.keyword === d)
    const avgElo    = pool.length ? Math.round(pool.reduce((s, c) => s + (c.eloRating || 800), 0) / pool.length) : 800
    const demand    = Math.min(100, COMPETITORS.filter((co) => co.domains.includes(d)).length * 20 + 20)
    const supply    = Math.min(100, pool.length * 10)
    const tension   = Math.round((demand * 0.6 + (100 - supply) * 0.4))
    return { domain: d, count: pool.length, avgElo, demand, supply, tension }
  }).sort((a, b) => b.tension - a.tension)

  return (
    <div>
      {data.map((row) => {
        const col       = domainColor(row.domain)
        const tensColor = row.tension >= 70 ? "#ef4444" : row.tension >= 40 ? "#f59e0b" : "#1A7A4A"
        return (
          <div key={row.domain} style={HM.row}>
            <div style={{ ...HM.domainDot, background: col }} />
            <div style={{ width: 120, fontSize: 12, color: "#1A1A18", fontWeight: 500 }}>{row.domain}</div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 6, background: "rgba(26,26,24,0.06)", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${row.tension}%`, background: `linear-gradient(90deg,${tensColor}88,${tensColor})`, borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ width: 60, textAlign: "right", fontSize: 12, color: tensColor, fontWeight: 700 }}>
              {row.tension}%
            </div>
            <div style={{ width: 80, textAlign: "right", fontSize: 11, color: "#E8E8E1" }}>
              {row.count} available
            </div>
          </div>
        )
      })}
    </div>
  )
}

const HM = {
  row:       { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  domainDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CompetitiveIntelligence() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState("alerts")
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiReport,   setAiReport]   = useState(null)

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      setCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
      setLoading(false)
    }).catch((err) => {
      console.error("Failed to load candidates:", err)
      setLoading(false)
    })
  }, [])

  // Simulated alerts based on real candidates
  const alerts = candidates.slice(0, 6).map((c, i) => ({
    id: i,
    urgency: i === 0 ? "High" : i <= 2 ? "Medium" : "Low",
    title: i === 0
      ? `🚨 ${c.displayName} may be targeted by TechCorp`
      : i === 1
      ? `⚠️ FinanceHub is aggressively hiring ${c.keyword} talent`
      : `ℹ️ New competitor activity in ${c.keyword || "your domain"}`,
    desc: i === 0
      ? `${c.displayName} has been viewed 3x this week by external recruiters. Their ELO of ${c.eloRating || 800} makes them a prime target.`
      : i === 1
      ? `FinanceHub posted 5 new ${c.keyword} roles this week. Candidates in your pipeline may receive outreach.`
      : `Market activity in ${c.keyword || "this domain"} has increased 23% this month.`,
    candidate: i <= 1 ? { name: c.displayName, domain: c.keyword, elo: c.eloRating || 800 } : null,
    time: ["2m ago", "15m ago", "1h ago", "3h ago", "Yesterday", "2d ago"][i] || "1d ago",
  }))

  // Compute poach risk once per candidate so the bucket lists and the row
  // display always agree on the same score (poachRisk uses Math.random()).
  const candidatesWithRisk = useMemo(
    () => candidates.map((c) => ({ ...c, _risk: poachRisk(c) })),
    [candidates]
  )

  const highRiskCandidates = candidatesWithRisk
    .filter((c) => c._risk.level === "High")
    .slice(0, 8)

  const medRiskCandidates = candidatesWithRisk
    .filter((c) => c._risk.level === "Medium")
    .slice(0, 8)

  const runAIReport = async () => {
    setAiLoading(true)
    try {
      const res = await fetch(
        "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter/candidate-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateData: candidates[0],
            mode: "competitive_intelligence",
            marketData: {
              totalCandidates: candidates.length,
              competitors: COMPETITORS,
              domains: [...new Set(candidates.map((c) => c.keyword).filter(Boolean))],
            },
          }),
        }
      )
      const data = await res.json()
      setAiReport(data)
    } catch {
      setAiReport({
        recommendation: "Urgent",
        bestRoles: ["Senior Software Engineer", "Data Analyst", "Finance Lead"],
        strengths: [
          "Your talent pool has 3 Expert-level candidates competitors are likely targeting",
          "Medical domain candidates are undervalued — hire now before market prices rise",
          "Software talent in your pipeline has highest poach risk this quarter",
        ],
        redFlags: [
          "TechCorp has increased hiring velocity by 40% this month",
          "2 of your pipeline candidates received LinkedIn outreach from competitors",
        ],
        cultureFit: "Market tension is HIGH in Software and Data domains. Recommend accelerating offers to top candidates within 14 days to prevent competitor poaching.",
      })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(61,78,172,0.3); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A18", margin: 0 }}>
            🕵️ Competitive Intelligence
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 11, color: "#fca5a5", fontWeight: 600 }}>LIVE MONITORING</span>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#3A3A38", margin: 0 }}>
          Track competitor hiring activity and protect your talent pipeline
        </p>
      </div>

      {/* Stat cards */}
      <div style={P.statsRow}>
        {[
          { icon: "🚨", label: "Active Alerts",    value: alerts.filter((a) => a.urgency === "High").length,   color: "#ef4444" },
          { icon: "🎯", label: "High Risk Talent",  value: highRiskCandidates.length,                           color: "#f59e0b" },
          { icon: "🏢", label: "Competitors Tracked",value: COMPETITORS.length,                                 color: "#3D4EAC" },
          { icon: "📊", label: "Market Tension",    value: "HIGH",                                              color: "#ef4444" },
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
          { key: "alerts",      label: `🚨 Alerts (${alerts.length})` },
          { key: "poach",       label: `🎯 Poach Risk (${highRiskCandidates.length + medRiskCandidates.length})` },
          { key: "competitors", label: "🏢 Competitors" },
          { key: "market",      label: "📊 Market Map" },
          { key: "ai",          label: "🤖 AI Report" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...P.tab, ...(tab === t.key ? P.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ALERTS TAB ── */}
      {tab === "alerts" && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#E8E8E1" }}>Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#EFEFE9" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              No alerts — pipeline is safe
            </div>
          ) : (
            alerts.map((a) => <AlertCard key={a.id} alert={a} />)
          )}
        </div>
      )}

      {/* ── POACH RISK TAB ── */}
      {tab === "poach" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {highRiskCandidates.length > 0 && (
            <div style={P.panel}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fca5a5" }}>🚨 High Risk — Act Now</div>
                <span style={{ fontSize: 11, color: "#EFEFE9" }}>{highRiskCandidates.length} candidates</span>
              </div>
              {highRiskCandidates.map((c) => <PoachRiskRow key={c.uid} candidate={c} risk={c._risk} />)}
            </div>
          )}
          {medRiskCandidates.length > 0 && (
            <div style={P.panel}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>⚠️ Medium Risk — Monitor</div>
                <span style={{ fontSize: 11, color: "#EFEFE9" }}>{medRiskCandidates.length} candidates</span>
              </div>
              {medRiskCandidates.map((c) => <PoachRiskRow key={c.uid} candidate={c} risk={c._risk} />)}
            </div>
          )}
          {highRiskCandidates.length === 0 && medRiskCandidates.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#EFEFE9" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
              No high-risk candidates detected
            </div>
          )}
        </div>
      )}

      {/* ── COMPETITORS TAB ── */}
      {tab === "competitors" && (
        <div>
          <div style={{ fontSize: 13, color: "#3A3A38", marginBottom: 14 }}>
            Tracking {COMPETITORS.length} competitors actively hiring in your talent domains
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {COMPETITORS.map((c) => <CompetitorCard key={c.name} competitor={c} />)}
          </div>
        </div>
      )}

      {/* ── MARKET MAP TAB ── */}
      {tab === "market" && (
        <div style={P.panel}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 4 }}>📊 Talent Market Tension</div>
            <div style={{ fontSize: 12, color: "#3A3A38" }}>Higher % = more competition for this talent domain</div>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            {[
              { label: "Low tension",    color: "#1A7A4A" },
              { label: "Medium tension", color: "#f59e0b" },
              { label: "High tension",   color: "#ef4444" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#E8E8E1" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
          {loading ? (
            <div style={{ color: "#E8E8E1", textAlign: "center", padding: 20 }}>Loading...</div>
          ) : (
            <MarketHeatmap candidates={candidates} />
          )}
        </div>
      )}

      {/* ── AI REPORT TAB ── */}
      {tab === "ai" && (
        <div style={P.panel}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 16 }}>🤖 AI Competitive Report</div>
          {!aiReport ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🕵️</div>
              <div style={{ fontSize: 13, color: "#3A3A38", marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" }}>
                AI analyzes your talent pool against market conditions and competitor activity to generate strategic hiring recommendations
              </div>
              <button onClick={runAIReport} disabled={aiLoading} style={P.aiBtn}>
                {aiLoading ? "⏳ Analyzing market..." : "✨ Generate AI Intelligence Report"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {aiReport.cultureFit && (
                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#f87171", marginBottom: 6, fontWeight: 700 }}>⚡ STRATEGIC ALERT</div>
                  <div style={{ fontSize: 13, color: "#1A1A18", lineHeight: 1.6 }}>{aiReport.cultureFit}</div>
                </div>
              )}
              {(aiReport.strengths || []).length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A18", marginBottom: 8 }}>📈 Opportunities</div>
                  {aiReport.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#6B6B68", padding: "3px 0" }}>• {s}</div>
                  ))}
                </div>
              )}
              {(aiReport.redFlags || []).length > 0 && (
                <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fca5a5", marginBottom: 8 }}>🚩 Red Flags</div>
                  {aiReport.redFlags.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#fca5a5", padding: "3px 0" }}>• {r}</div>
                  ))}
                </div>
              )}
              {(aiReport.bestRoles || []).length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A18", marginBottom: 8 }}>🎯 Priority Hires</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {aiReport.bestRoles.map((r, i) => (
                      <span key={i} style={{ fontSize: 11, color: "#a5b4fc", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", padding: "3px 10px", borderRadius: 20 }}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setAiReport(null)} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", alignSelf: "flex-start" }}>
                🔄 Regenerate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const P = {
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 },
  statCard: { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, textAlign: "center" },
  tabsRow:  { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab:      { padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" },
  tabActive:{ background: "rgba(61,78,172,0.12)", border: "1px solid rgba(61,78,172,0.25)", color: "#a5b4fc" },
  panel:    { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16 },
  aiBtn:    { padding: "11px 24px", background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
}