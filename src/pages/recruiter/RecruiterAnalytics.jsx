import { useState, useEffect, useMemo, useCallback, Fragment } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor } from "./theme"

// Real data only: everything below is computed from applications, jobs,
// interviews, offers, and pipeline_candidates -- no ELO, no Firestore, no
// Math.random() trend lines. Where a real historical comparison isn't
// available (e.g. "days in stage" isn't tracked), the field is left out
// rather than invented.

const PERIODS = {
  "7d":  7,
  "30d": 30,
  "90d": 90,
  "All": null,
}

function withinDays(iso, days) {
  if (days == null) return true
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() <= days * 86400000
}

function BarChart({ data, color = T.indigo, height = 120 }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, padding: "4px 0" }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * (height - 24))
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 9, color: T.ink3 }}>{d.value || ""}</div>
            <div style={{ width: "100%", height: h, borderRadius: "4px 4px 0 0", background: `linear-gradient(180deg,${color},${color}88)`, transition: "height 0.5s ease" }} />
            <div style={{ fontSize: 9, color: T.ink4, whiteSpace: "nowrap" }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ segments, size = 140 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const cx = size / 2, cy = size / 2, r = size / 2 - 16, inner = r - 18
  let angle = -Math.PI / 2
  const arcs = segments.map((seg) => {
    const sweep = (seg.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep)
    const xi1 = cx + inner * Math.cos(angle), yi1 = cy + inner * Math.sin(angle)
    const xi2 = cx + inner * Math.cos(angle + sweep), yi2 = cy + inner * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    const path = `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large},0 ${xi1},${yi1} Z`
    angle += sweep
    return { ...seg, path }
  })
  return (
    <svg width={size} height={size}>
      {arcs.map((arc, i) => <path key={i} d={arc.path} fill={arc.color} opacity="0.85" />)}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill={T.ink} fontFamily="Syne">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill={T.ink4} fontFamily="DM Sans">total</text>
    </svg>
  )
}

function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div style={SC.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 24 }}>{icon}</div>
        {trend != null && (
          <div style={{ fontSize: 11, fontWeight: 600, color: trend >= 0 ? T.green : T.red }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color, margin: "8px 0 4px" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
const SC = { card: { background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, boxShadow: T.shadow } }

function HiringFunnel({ stages }) {
  const max = stages[0]?.count || 1
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stages.map((s, i) => {
        const pct = Math.round((s.count / max) * 100)
        return (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: T.ink }}>{s.label}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.count}</span>
                {i > 0 && stages[i - 1].count > 0 && (
                  <span style={{ fontSize: 11, color: T.ink4 }}>({Math.round((s.count / stages[i - 1].count) * 100)}% conv.)</span>
                )}
              </div>
            </div>
            <div style={{ height: 8, background: T.cream3, borderRadius: 4 }}>
              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: `linear-gradient(90deg,${s.color}88,${s.color})`, transition: "width 0.6s ease" }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function RecruiterAnalytics() {
  const [applications, setApplications] = useState([])
  const [jobsById, setJobsById] = useState({})
  const [interviews, setInterviews] = useState([])
  const [offers, setOffers] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30d")
  const [tab, setTab] = useState("overview")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [appsRes, jobsRes, interviewsRes, offersRes, pipelineRes] = await Promise.all([
        supabase.from("applications").select("*"),
        supabase.from("jobs").select("id,title,domain"),
        supabase.from("interviews").select("id,created_at,status"),
        supabase.from("offers").select("id,created_at,status"),
        supabase.from("pipeline_candidates").select("id,stage,added_at"),
      ])
      setApplications(appsRes.data || [])
      setJobsById(Object.fromEntries((jobsRes.data || []).map((j) => [j.id, j])))
      setInterviews(interviewsRes.data || [])
      setOffers(offersRes.data || [])
      setPipeline(pipelineRes.data || [])
    } catch (err) {
      console.error("Failed to load analytics data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const days = PERIODS[period]

  const inPeriod   = useMemo(() => applications.filter((a) => withinDays(a.created_at, days)), [applications, days])
  const priorPeriod = useMemo(() => {
    if (days == null) return []
    const now = Date.now()
    return applications.filter((a) => {
      if (!a.created_at) return false
      const t = new Date(a.created_at).getTime()
      return t <= now - days * 86400000 && t > now - 2 * days * 86400000
    })
  }, [applications, days])

  const trendPct = (curr, prev) => {
    if (days == null) return null
    if (prev === 0) return curr > 0 ? 100 : null
    return Math.round(((curr - prev) / prev) * 100)
  }

  const total = inPeriod.length
  const scored = inPeriod.filter((a) => a.score != null)
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length) : 0
  const shortlistedCount = inPeriod.filter((a) => a.status === "shortlisted").length
  const rejectedCount = inPeriod.filter((a) => a.status === "rejected").length
  const interviewsInPeriod = interviews.filter((i) => withinDays(i.created_at, days))
  const offersInPeriod = offers.filter((o) => withinDays(o.created_at, days))

  const domainMap = {}
  inPeriod.forEach((a) => {
    const d = jobsById[a.job_id]?.domain || "Other"
    domainMap[d] = (domainMap[d] || 0) + 1
  })
  const domainData = Object.entries(domainMap).map(([label, value]) => ({ label, value, color: domainColor(label) })).sort((a, b) => b.value - a.value)

  const scoreBuckets = [
    { label: "0-20%",  value: scored.filter((a) => a.score < 20).length },
    { label: "20-40%", value: scored.filter((a) => a.score >= 20 && a.score < 40).length },
    { label: "40-60%", value: scored.filter((a) => a.score >= 40 && a.score < 60).length },
    { label: "60-80%", value: scored.filter((a) => a.score >= 60 && a.score < 80).length },
    { label: "80-100%",value: scored.filter((a) => a.score >= 80).length },
  ]

  const statusBuckets = [
    { label: "Applied",     value: inPeriod.filter((a) => a.status === "applied").length },
    { label: "Shortlisted", value: shortlistedCount },
    { label: "Rejected",    value: rejectedCount },
  ]

  const PIPELINE_STAGES = [
    { id: "applied",     label: "🔍 Sourced / Applied", color: T.indigo },
    { id: "shortlisted", label: "⭐ Shortlisted",        color: T.indigo2 },
    { id: "contacted",   label: "📧 Contacted",          color: T.blue },
    { id: "interview",   label: "🎯 Interview",          color: T.amber },
    { id: "offered",     label: "✅ Offered",            color: T.green },
  ]
  const stageCount = (id) => pipeline.filter((p) => (id === "applied" ? ["applied", "sourced"].includes(p.stage) : p.stage === id)).length
  const funnelStages = PIPELINE_STAGES.map((s) => ({ ...s, count: stageCount(s.id) }))

  // Monthly application trend -- real counts grouped by calendar month, not simulated.
  const trendData = useMemo(() => {
    const buckets = {}
    applications.forEach((a) => {
      if (!a.created_at) return
      const d = new Date(a.created_at)
      const key = d.toLocaleString("default", { month: "short" })
      buckets[key] = (buckets[key] || 0) + 1
    })
    return Object.entries(buckets).map(([label, value]) => ({ label, value }))
  }, [applications])

  const topApplicants = useMemo(
    () => [...applications].filter((a) => a.score != null).sort((a, b) => b.score - a.score).slice(0, 8),
    [applications]
  )

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: T.ink }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>📊 Recruiter Analytics</h1>
          <p style={{ fontSize: 13, color: T.ink3, margin: "4px 0 0" }}>Real counts from your jobs, applications, interviews, and offers.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.keys(PERIODS).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "6px 12px", background: period === p ? T.indigo3 : T.cream2, border: `1px solid ${period === p ? T.indigo : T.border}`, borderRadius: 8, color: period === p ? T.indigo : T.ink3, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={P.tabsRow}>
        {[
          { key: "overview",    label: "📈 Overview" },
          { key: "pipeline",    label: "🔀 Pipeline Funnel" },
          { key: "domains",     label: "◆ Domain Breakdown" },
          { key: "leaderboard", label: "🏆 Top Applicants" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ ...P.tab, ...(tab === t.key ? P.tabActive : {}) }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: T.ink4 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${T.indigo}33`, borderTopColor: T.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
          Loading analytics...
        </div>
      ) : applications.length === 0 && interviews.length === 0 && offers.length === 0 ? (
        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: "60px 20px", textAlign: "center", boxShadow: T.shadow }}>
          <div style={{ fontSize: 40 }}>📊</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, marginTop: 12 }}>No activity yet</div>
          <div style={{ fontSize: 13, color: T.ink4, marginTop: 6 }}>Once candidates start applying to your jobs, analytics will show up here.</div>
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                <StatCard icon="📥" label="Applications"   value={total}                 color={T.indigo} sub={`in ${period === "All" ? "all time" : `last ${period}`}`} trend={trendPct(total, priorPeriod.length)} />
                <StatCard icon="🎯" label="Avg AI Match"   value={`${avgScore}%`}        color={T.indigo2} sub={`${scored.length} scored`} />
                <StatCard icon="⭐" label="Shortlisted"    value={shortlistedCount}      color={T.green}  sub={total ? `${Math.round((shortlistedCount / total) * 100)}% of applicants` : "—"} />
                <StatCard icon="🎥" label="Interviews"     value={interviewsInPeriod.length} color={T.amber} sub={`in ${period === "All" ? "all time" : `last ${period}`}`} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={P.panel}>
                  <div style={P.panelTitle}>🎯 AI Match Score Distribution</div>
                  <BarChart data={scoreBuckets} color={T.indigo2} height={110} />
                </div>
                <div style={P.panel}>
                  <div style={P.panelTitle}>📋 Status Breakdown</div>
                  <BarChart data={statusBuckets} color={T.blue} height={110} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={P.panel}>
                  <div style={P.panelTitle}>📈 Applications by Month</div>
                  {trendData.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.ink4, padding: "20px 0", textAlign: "center" }}>Not enough history yet.</div>
                  ) : (
                    <BarChart data={trendData} color={T.indigo} height={120} />
                  )}
                </div>
                <div style={P.panel}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={P.panelTitle}>◆ Domain Split</div>
                    {domainData.length > 0 && <DonutChart segments={domainData.slice(0, 5)} size={120} />}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {domainData.length === 0 ? (
                      <div style={{ fontSize: 12, color: T.ink4 }}>No applications yet.</div>
                    ) : domainData.slice(0, 5).map((d) => (
                      <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                          <span style={{ fontSize: 12, color: T.ink }}>{d.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.value}</span>
                          <span style={{ fontSize: 11, color: T.ink4 }}>{Math.round((d.value / total) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "pipeline" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={P.panel}>
                <div style={P.panelTitle}>🔀 Hiring Funnel</div>
                <HiringFunnel stages={funnelStages} />
              </div>
              <div style={P.panel}>
                <div style={P.panelTitle}>📐 Key Metrics</div>
                {[
                  { label: "Shortlist rate", value: total ? `${Math.round((shortlistedCount / total) * 100)}%` : "—", color: T.green },
                  { label: "Rejection rate", value: total ? `${Math.round((rejectedCount / total) * 100)}%` : "—", color: T.red },
                  { label: "Interviews scheduled", value: interviewsInPeriod.length, color: T.amber },
                  { label: "Offers made", value: offersInPeriod.length, color: T.indigo },
                ].map((m) => (
                  <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 12, color: T.ink3 }}>{m.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "domains" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {domainData.length === 0 ? (
                <div style={{ gridColumn: "span 3", textAlign: "center", padding: "40px 0", color: T.ink4, fontSize: 13 }}>No applications yet.</div>
              ) : domainData.map((d) => {
                const domApps = inPeriod.filter((a) => (jobsById[a.job_id]?.domain || "Other") === d.label)
                const domScored = domApps.filter((a) => a.score != null)
                const domAvgScore = domScored.length ? Math.round(domScored.reduce((s, a) => s + a.score, 0) / domScored.length) : 0
                return (
                  <div key={d.label} style={{ ...P.panel, borderLeft: `3px solid ${d.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>◆ {d.label}</div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: d.color }}>{d.value}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: T.ink4 }}>Avg AI match</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.indigo2 }}>{domAvgScore}%</span>
                    </div>
                    <div style={{ marginTop: 10, height: 4, background: T.cream3, borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${Math.round((d.value / total) * 100)}%`, background: d.color, borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 10, color: T.ink4, marginTop: 4 }}>{Math.round((d.value / total) * 100)}% of applicants this period</div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === "leaderboard" && (
            <div style={P.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={P.panelTitle}>🏆 Top Applicants by AI Match Score</div>
                <div style={{ fontSize: 12, color: T.ink4 }}>Top {topApplicants.length} of {applications.length}</div>
              </div>
              {topApplicants.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: T.ink4, fontSize: 13 }}>No scored applications yet.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 100px 100px", gap: 0 }}>
                  {["#", "Applicant", "Score", "Job", "Status"].map((h) => (
                    <div key={h} style={{ fontSize: 11, color: T.ink4, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${T.border}` }}>{h}</div>
                  ))}
                  {topApplicants.map((a, i) => {
                    const jobTitle = jobsById[a.job_id]?.title || "—"
                    const col = domainColor(jobsById[a.job_id]?.domain || "")
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`
                    return (
                      <Fragment key={a.id}>
                        <div style={P.cell}><span style={{ fontSize: i < 3 ? 16 : 12, color: T.ink4 }}>{medal}</span></div>
                        <div style={P.cell}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: `${col}18`, color: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {(a.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{a.name || "—"}</div>
                          </div>
                        </div>
                        <div style={P.cell}><span style={{ fontSize: 12, fontWeight: 700, color: T.indigo2 }}>{a.score}%</span></div>
                        <div style={P.cell}><span style={{ fontSize: 11, color: T.ink3 }}>{jobTitle}</span></div>
                        <div style={P.cell}><span style={{ fontSize: 11, color: T.ink3 }}>{a.status}</span></div>
                      </Fragment>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const P = {
  tabsRow:    { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab:        { padding: "8px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink3, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" },
  tabActive:  { background: T.indigo3, border: `1px solid ${T.indigo}`, color: T.indigo },
  panel:      { background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, boxShadow: T.shadow },
  panelTitle: { fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12, display: "block" },
  cell:       { padding: "10px 8px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center" },
}
