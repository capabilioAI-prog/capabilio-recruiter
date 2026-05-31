import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




// ── Helpers ───────────────────────────────────────────────────────────────────
const eloLevel = (e) => {
  if (e >= 1200) return { label: "Expert",       color: T.amber  }
  if (e >= 1000) return { label: "Advanced",     color: T.indigo }
  if (e >= 900)  return { label: "Intermediate", color: T.blue   }
  return               { label: "Beginner",      color: T.ink4   }
}

const domainColor = (d = "") => {
  if (d.toLowerCase().includes("medical"))   return T.green
  if (d.toLowerCase().includes("software"))  return T.indigo
  if (d.toLowerCase().includes("data"))      return T.blue
  if (d.toLowerCase().includes("finance"))   return T.amber
  if (d.toLowerCase().includes("marketing")) return T.amber
  if (d.toLowerCase().includes("design"))    return "#c2185b"
  return T.indigo
}

// ── Hiring Funnel ─────────────────────────────────────────────────────────────
function HiringFunnel({ total }) {
  const stages = [
    { label: "Applied",          count: total || 248, color: T.indigo, pct: 100 },
    { label: "AI Screened",      count: Math.round((total || 248) * 0.62), color: T.indigo2, pct: 62 },
    { label: "Shortlisted",      count: Math.round((total || 248) * 0.31), color: T.blue,    pct: 31 },
    { label: "Interview Ready",  count: Math.round((total || 248) * 0.14), color: T.amber,   pct: 14 },
    { label: "Offered",          count: Math.round((total || 248) * 0.04), color: T.green,   pct: 4  },
  ]
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {stages.map((s) => (
        <div key={s.label}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:12, color:T.ink3 }}>{s.label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.count.toLocaleString()}</span>
          </div>
          <div style={{ height:10, background:T.cream3, borderRadius:6, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${s.pct}%`, background:s.color, borderRadius:6, transition:"width 1.2s ease" }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── SLA Timer Badge ───────────────────────────────────────────────────────────
function SLABadge({ days, limit = 5 }) {
  const overdue = days > limit
  const warning = days > limit * 0.7
  const color   = overdue ? T.red : warning ? T.amber : T.green
  const bg      = overdue ? T.red2 : warning ? T.amber2 : T.green2
  return (
    <span style={{ fontSize:10, fontWeight:700, color, background:bg, border:`1px solid ${color}40`, borderRadius:6, padding:"2px 7px" }}>
      {overdue ? "⚠ " : ""}{days}d{overdue ? " BREACH" : ""}
    </span>
  )
}

// ── AI Shortlist Card ─────────────────────────────────────────────────────────
function ShortlistCard({ c, onCompare, onPipeline }) {
  const navigate = useNavigate()
  const lvl = eloLevel(c.eloRating || 800)
  const col = domainColor(c.keyword)
  const initials = (c.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const fitScore = Math.min(99, Math.round((c.eloRating || 800) / 14 + (c.jobReadiness || 0) * 0.3))

  return (
    <div className="cap-card" style={SC.card}>
      {/* Fit badge */}
      <div style={{ position:"absolute", top:12, right:12, background:T.green2, color:T.green, fontSize:11, fontWeight:800, borderRadius:8, padding:"3px 8px", border:`1px solid ${T.green}30` }}>
        {fitScore}% fit
      </div>

      <div style={SC.top}>
        <div style={{ ...SC.avatar, background:`${col}18`, border:`1.5px solid ${col}44`, color:col }}>
          {initials}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={SC.name}>{c.displayName || "—"}</div>
          <div style={{ fontSize:11, color:col }}>◆ {c.keyword || "General"}</div>
        </div>
      </div>

      {/* Signals row */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
        <span style={{ ...SC.tag, color:lvl.color, borderColor:`${lvl.color}33`, background:`${lvl.color}11` }}>⚡{c.eloRating || 800}</span>
        <span style={{ ...SC.tag, color:T.green, borderColor:`${T.green}33`, background:T.green2 }}>🎯{c.arenaCompleted || 0} Arena</span>
        {c.jobReadiness >= 70 && <span style={{ ...SC.tag, color:T.blue, borderColor:`${T.blue}33`, background:T.blue2 }}>✓ Verified</span>}
        {c.arenaStreak  > 0  && <span style={{ ...SC.tag, color:T.amber, borderColor:`${T.amber}33`, background:T.amber2 }}>🔥{c.arenaStreak}</span>}
      </div>

      {/* Readiness bar */}
      <div style={{ marginTop:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:10, color:T.ink3 }}>Hiring Readiness</span>
          <span style={{ fontSize:10, fontWeight:700, color:T.green }}>{c.jobReadiness || 0}%</span>
        </div>
        <div style={{ height:5, background:T.cream3, borderRadius:3 }}>
          <div style={{ height:"100%", width:`${c.jobReadiness || 0}%`, background:T.green, borderRadius:3 }} />
        </div>
      </div>

      {/* AI reason */}
      <div style={{ marginTop:10, padding:"8px 10px", background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:8 }}>
        <div style={{ fontSize:10, color:T.indigo, fontWeight:600, marginBottom:2 }}>🤖 AI Shortlist Reason</div>
        <div style={{ fontSize:11, color:T.ink3, lineHeight:1.4 }}>
          Strong Arena performance + verified skills match role requirements. Notice period: 30 days.
        </div>
      </div>

      <div style={SC.btnRow}>
        <button onClick={() => navigate(`/recruiter/candidate/${c.uid}`)} style={SC.viewBtn}>360 View</button>
        <button onClick={() => onCompare && onCompare(c)} style={SC.cmpBtn}>Compare</button>
        <button onClick={() => onPipeline && onPipeline(c)} style={SC.addBtn}>+ Stage</button>
      </div>
    </div>
  )
}

const SC = {
  card: { background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:16, display:"flex", flexDirection:"column", gap:0, position:"relative", transition:"all 0.2s", boxShadow:T.shadow },
  top: { display:"flex", alignItems:"center", gap:10, marginBottom:2 },
  avatar: { width:40, height:40, borderRadius:12, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15 },
  name: { fontSize:14, fontWeight:600, color:T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  tag: { fontSize:10, fontWeight:600, border:"1px solid", borderRadius:6, padding:"2px 6px" },
  btnRow: { display:"flex", gap:5, marginTop:12 },
  viewBtn: { flex:1, padding:"7px 0", background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:8, color:T.indigo, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
  cmpBtn:  { padding:"7px 10px", background:T.blue2, border:`1px solid ${T.blue}30`, borderRadius:8, color:T.blue, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
  addBtn:  { padding:"7px 10px", background:T.green2, border:`1px solid ${T.green}30`, borderRadius:8, color:T.green, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
}

// ── Bottleneck Alert ──────────────────────────────────────────────────────────
function BottleneckAlert({ role, stage, count, days, action, color = T.amber }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:`${color}08`, border:`1px solid ${color}25`, borderLeft:`3px solid ${color}`, borderRadius:10, marginBottom:8 }}>
      <span style={{ fontSize:20 }}>⚠️</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:600, color:T.ink }}>{role}</div>
        <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>
          {count} candidates stuck at <span style={{ color }}>{stage}</span> · {days} days avg wait
        </div>
      </div>
      <button style={{ fontSize:11, color, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:7, padding:"5px 10px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, whiteSpace:"nowrap" }}>
        {action}
      </button>
    </div>
  )
}

// ── Active Role Row ───────────────────────────────────────────────────────────
function ActiveRoleRow({ role, applied, shortlisted, stage, sla, urgent }) {
  const pct = Math.round((shortlisted / applied) * 100)
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.ink, display:"flex", alignItems:"center", gap:8 }}>
          {role}
          {urgent && <span style={{ fontSize:10, background:T.red2, color:T.red, border:`1px solid ${T.red}30`, borderRadius:5, padding:"1px 6px" }}>Urgent</span>}
        </div>
        <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>Current: {stage}</div>
      </div>
      <div style={{ textAlign:"center", minWidth:52 }}>
        <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>{applied}</div>
        <div style={{ fontSize:10, color:T.ink4 }}>applied</div>
      </div>
      <div style={{ textAlign:"center", minWidth:52 }}>
        <div style={{ fontSize:15, fontWeight:700, color:T.green }}>{shortlisted}</div>
        <div style={{ fontSize:10, color:T.ink4 }}>shortlisted</div>
      </div>
      <div style={{ textAlign:"center", minWidth:52 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.indigo }}>{pct}%</div>
        <div style={{ fontSize:10, color:T.ink4 }}>conversion</div>
      </div>
      <SLABadge days={sla} />
    </div>
  )
}

// ── Domain Heatmap ────────────────────────────────────────────────────────────
function HeatBar({ domain, count, max }) {
  const col = domainColor(domain)
  const pct = Math.max(6, (count / max) * 100)
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, color:T.ink3 }}>{domain}</span>
        <span style={{ fontSize:12, fontWeight:700, color:col }}>{count}</span>
      </div>
      <div style={{ height:7, background:T.cream3, borderRadius:4 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:col, borderRadius:4, transition:"width 1.2s ease" }} />
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [bulkSelect, setBulkSelect] = useState([])
  const [tab,        setTab]        = useState("ai-shortlist")

  const fetchData = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "users"))
      setCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 30000); return () => clearInterval(id) }, [fetchData])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const total    = candidates.length
  const avgElo   = total ? Math.round(candidates.reduce((s, c) => s + (c.eloRating || 800), 0) / total) : 0
  const thisWeek = candidates.filter((c) => {
    if (!c.createdAt) return false
    const d = new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt)
    return Date.now() - d.getTime() < 7 * 24 * 3600 * 1000
  }).length

  const domainMap = {}
  candidates.forEach((c) => { const k = c.keyword || "Other"; domainMap[k] = (domainMap[k] || 0) + 1 })
  const domains  = Object.entries(domainMap).sort((a, b) => b[1] - a[1]).slice(0, 7)
  const maxDomain = domains[0]?.[1] || 1

  const aiShortlist = [...candidates]
    .filter((c) => (c.jobReadiness || 0) >= 40)
    .sort((a, b) => (b.eloRating || 800) - (a.eloRating || 800))
    .slice(0, 8)

  const strongNotSelected = candidates.filter((c) => (c.eloRating || 800) >= 950).slice(0, 4)

  const STATS = [
    { label: "Total Talent Pool",   value: total,    icon: "👥", color: T.indigo, sub: "all candidates"     },
    { label: "New This Week",        value: thisWeek, icon: "🆕", color: T.green,  sub: "joined recently"    },
    { label: "AI Shortlisted",       value: aiShortlist.length, icon: "🤖", color: T.indigo2, sub: "ready to review" },
    { label: "Avg ELO Score",        value: avgElo,   icon: "⚡", color: T.amber,  sub: "talent quality"     },
    { label: "Active Roles",         value: 4,        icon: "💼", color: T.blue,   sub: "hiring in progress" },
    { label: "SLA Alerts",           value: 3,        icon: "⚠️",  color: T.red,    sub: "need action today"  },
  ]

  const QUICK = [
    { icon: "📝", label: "Post Job",         path: "/recruiter/jobs",           color: T.indigo  },
    { icon: "🚀", label: "Bulk Hiring",      path: "/recruiter/bulk-hiring",    color: T.indigo2 },
    { icon: "⚖️",  label: "Compare Mode",    path: "/recruiter/compare",        color: T.blue    },
    { icon: "🛡️",  label: "Verification",    path: "/recruiter/verification",   color: T.green   },
    { icon: "⭐", label: "Trust Ratings",    path: "/recruiter/trust-ratings",  color: T.amber   },
    { icon: "🌱", label: "Talent Pool",      path: "/recruiter/talent-pool",    color: T.amber   },
  ]

  const ACTIVE_ROLES = [
    { role: "Senior ML Engineer",     applied: 312, shortlisted: 41,  stage: "Technical Screen",  sla: 7,  urgent: true  },
    { role: "Product Manager",        applied: 185, shortlisted: 28,  stage: "HR Interview",       sla: 3,  urgent: false },
    { role: "Data Analyst",           applied: 97,  shortlisted: 19,  stage: "Shortlisted",        sla: 2,  urgent: false },
    { role: "Medical Coder (Senior)", applied: 248, shortlisted: 53,  stage: "Arena Challenge",    sla: 6,  urgent: true  },
  ]

  return (
    <div style={P.root}>

      {/* ── KPI Stats Strip ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12 }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ ...P.statCard, animationDelay:`${i * 55}ms` }}>
            <div style={{ ...P.statIcon, background:`${s.color}15`, color:s.color }}>{s.icon}</div>
            <div>
              <div style={P.statVal}>{loading ? "—" : s.value}</div>
              <div style={P.statLabel}>{s.label}</div>
              <div style={P.statSub}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
        {QUICK.map((q) => (
          <button key={q.label} onClick={() => navigate(q.path)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:T.cream, border:`1px solid ${T.border}`, borderRadius:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s", boxShadow:T.shadow }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = `${q.color}55` }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = T.border }}>
            <span style={{ fontSize:18, color:q.color }}>{q.icon}</span>
            <span style={{ fontSize:12, fontWeight:600, color:T.ink }}>{q.label}</span>
          </button>
        ))}
      </div>

      {/* ── PRD Signal Row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>

        {/* Time-to-shortlist */}
        <div style={{ ...P.card, padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.ink3, letterSpacing:"0.04em", marginBottom:8 }}>⏱ TIME TO SHORTLIST</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:T.indigo }}>9</span>
            <span style={{ fontSize:13, color:T.ink3 }}>days avg</span>
          </div>
          <div style={{ fontSize:11, color:T.green, marginTop:2 }}>↓ 38d industry avg</div>
          <div style={{ marginTop:10, height:4, background:T.cream3, borderRadius:2 }}>
            <div style={{ width:"24%", height:"100%", background:T.indigo, borderRadius:2 }} />
          </div>
          <div style={{ fontSize:10, color:T.ink4, marginTop:4 }}>24% of industry benchmark</div>
        </div>

        {/* Candidate experience score */}
        <div style={{ ...P.card, padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.ink3, letterSpacing:"0.04em", marginBottom:8 }}>😊 CANDIDATE EXPERIENCE</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ position:"relative", width:52, height:52 }}>
              <svg width={52} height={52}>
                <circle cx={26} cy={26} r={22} fill="none" stroke={T.cream3} strokeWidth={5} />
                <circle cx={26} cy={26} r={22} fill="none" stroke={T.green} strokeWidth={5}
                  strokeDasharray={`${(87/100)*138} 138`} strokeLinecap="round"
                  transform="rotate(-90 26 26)" />
                <text x={26} y={30} textAnchor="middle" fontSize={13} fontWeight={800} fill={T.green}>87</text>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.green }}>Excellent</div>
              <div style={{ fontSize:11, color:T.ink4 }}>NPS-style score</div>
              <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>↑ 4pts this month</div>
            </div>
          </div>
        </div>

        {/* Company trust summary */}
        <div style={{ ...P.card, padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.ink3, letterSpacing:"0.04em", marginBottom:8 }}>🛡️ TRUST RATING</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:T.amber }}>4.7</span>
            <span style={{ fontSize:13, color:T.ink3 }}>/5.0</span>
          </div>
          <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>Based on 124 candidate reviews</div>
          {["Communication","Fairness","Speed"].map((dim, i) => {
            const scores = [92, 88, 79]
            return (
              <div key={dim} style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
                <span style={{ fontSize:10, color:T.ink3, width:76 }}>{dim}</span>
                <div style={{ flex:1, height:3, background:T.cream3, borderRadius:2 }}>
                  <div style={{ width:`${scores[i]}%`, height:"100%", background:T.amber, borderRadius:2 }} />
                </div>
                <span style={{ fontSize:10, color:T.ink2, width:20, textAlign:"right" }}>{scores[i]}</span>
              </div>
            )
          })}
        </div>

        {/* Reactivation pool */}
        <div style={{ ...P.card, padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.ink3, letterSpacing:"0.04em", marginBottom:8 }}>♻️ REACTIVATION POOL</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:T.blue }}>23</span>
            <span style={{ fontSize:13, color:T.ink3 }}>candidates</span>
          </div>
          <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>Previously rejected, now re-eligible</div>
          <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:4 }}>
            {["ELO improved ≥50pts", "New skills added", "Gap closed"].map((r, i) => {
              const counts = [11, 8, 4]
              return (
                <div key={r} style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.ink3 }}>
                  <span>{r}</span><span style={{ fontWeight:600, color:T.blue }}>{counts[i]}</span>
                </div>
              )
            })}
          </div>
          <button style={{ marginTop:10, width:"100%", fontSize:11, fontWeight:600, padding:"5px 0", background:T.blue2, color:T.blue, border:`1px solid ${T.blue}22`, borderRadius:7, cursor:"pointer" }}>
            Review Pool →
          </button>
        </div>

        {/* Missing feedback alerts */}
        <div style={{ ...P.card, padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.ink3, letterSpacing:"0.04em", marginBottom:8 }}>📝 MISSING FEEDBACK</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:8 }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:T.red }}>7</span>
            <span style={{ fontSize:13, color:T.ink3 }}>pending</span>
          </div>
          {[
            { name:"Arjun Mehta",   role:"ML Engineer",    days:3, urgency:T.red   },
            { name:"Priya Sharma",  role:"Product Manager",days:2, urgency:T.amber },
            { name:"Ravi Nair",     role:"Data Analyst",   days:1, urgency:T.amber },
          ].map(fb => (
            <div key={fb.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, padding:"6px 8px", background:T.cream2, borderRadius:7 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:T.ink }}>{fb.name}</div>
                <div style={{ fontSize:10, color:T.ink4 }}>{fb.role}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:fb.urgency, background:`${fb.urgency}18`, borderRadius:4, padding:"2px 6px" }}>{fb.days}d late</span>
            </div>
          ))}
          <div style={{ fontSize:10, color:T.ink4, marginTop:4 }}>+4 more · </div>
        </div>
      </div>

      {/* ── Main 2-col grid ── */}
      <div style={P.mainGrid}>

        {/* ── LEFT: Hiring Activity ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Active Roles + SLA */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>💼 Active Roles · SLA Status</h2>
              <button onClick={() => navigate("/recruiter/jobs")} style={P.linkBtn}>View All →</button>
            </div>
            {ACTIVE_ROLES.map((r) => <ActiveRoleRow key={r.role} {...r} />)}
          </div>

          {/* Bottleneck Alerts */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>🚧 Hiring Bottlenecks</h2>
              <span style={{ fontSize:11, color:T.red, fontWeight:600 }}>3 need action</span>
            </div>
            <BottleneckAlert role="Senior ML Engineer"   stage="Technical Screen" count={14} days={8}  action="Send Reminders"  color={T.red}   />
            <BottleneckAlert role="Medical Coder"        stage="Arena Challenge"  count={22} days={5}  action="Extend Deadline" color={T.amber} />
            <BottleneckAlert role="Product Manager"      stage="HR Interview"     count={7}  days={6}  action="Reschedule"      color={T.red}   />
          </div>

          {/* AI Shortlist Tabs */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>🤖 AI-Ranked Candidate Queue</h2>
              <div style={{ display:"flex", gap:6 }}>
                {["ai-shortlist","strong-not-selected"].map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ fontSize:11, padding:"4px 10px", borderRadius:7, border:"1px solid", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, background: tab === t ? T.indigo3 : "transparent", borderColor: tab === t ? `${T.indigo}40` : T.border, color: tab === t ? T.indigo : T.ink3 }}>
                    {t === "ai-shortlist" ? "🎯 AI Shortlist" : "💎 Strong Not Selected"}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk action bar */}
            {bulkSelect.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:10, marginBottom:12 }}>
                <span style={{ fontSize:13, color:T.indigo, fontWeight:600 }}>{bulkSelect.length} selected</span>
                <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                  {["Bulk Shortlist","Bulk Reject","Bulk Move","Send Message"].map((a) => (
                    <button key={a} onClick={() => setBulkSelect([])} style={{ fontSize:11, padding:"5px 10px", background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:7, color:T.indigo, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>{a}</button>
                  ))}
                </div>
                <button onClick={() => setBulkSelect([])} style={{ background:"none", border:"none", color:T.ink3, cursor:"pointer", fontSize:16 }}>✕</button>
              </div>
            )}

            {loading ? (
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:180, gap:12 }}>
                <div style={P.spinner} />
                <span style={{ color:T.ink3, fontSize:13 }}>Loading candidates...</span>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                {(tab === "ai-shortlist" ? aiShortlist : strongNotSelected).map((c) => (
                  <ShortlistCard key={c.uid} c={c}
                    onCompare={() => navigate("/recruiter/compare")}
                    onPipeline={() => navigate("/recruiter/pipeline")}
                  />
                ))}
                {(tab === "ai-shortlist" ? aiShortlist : strongNotSelected).length === 0 && (
                  <div style={{ gridColumn:"span 2", color:T.ink4, fontSize:14, textAlign:"center", padding:"40px 0" }}>
                    {tab === "strong-not-selected" ? "No strong candidates yet — they appear after pipeline moves." : "Candidates will appear once they sign up on Capabilio."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Signals + Funnel ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Hiring Funnel */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>🔻 Hiring Funnel</h2>
              <button onClick={() => navigate("/recruiter/analytics")} style={P.linkBtn}>Analytics →</button>
            </div>
            <HiringFunnel total={total} />
            {/* Stage drop-off note */}
            <div style={{ marginTop:14, padding:"10px 12px", background:T.red2, border:`1px solid ${T.red}20`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:T.red, fontWeight:600 }}>⚠ Drop-off Alert</div>
              <div style={{ fontSize:11, color:T.ink3, marginTop:3 }}>38% abandonment at Shortlisted → Interview step. Consider adding async video screen.</div>
            </div>
          </div>

          {/* Domain Heatmap */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>🗺️ Talent Pool by Domain</h2>
            </div>
            {loading ? <div style={{ color:T.ink3, fontSize:13 }}>Loading...</div>
              : domains.length === 0 ? <div style={{ color:T.ink4, fontSize:13 }}>No domain data yet</div>
              : domains.map(([d, n]) => <HeatBar key={d} domain={d} count={n} max={maxDomain} />)}
          </div>

          {/* ELO Tiers */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>⚡ Talent Tier Distribution</h2>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
              {[
                { range:"1200+",    label:"Expert",       color:T.amber,  min:1200, max:9999 },
                { range:"1000–1199",label:"Advanced",     color:T.indigo, min:1000, max:1199 },
                { range:"900–999",  label:"Intermediate", color:T.blue,   min:900,  max:999  },
                { range:"800–899",  label:"Beginner",     color:T.ink4,   min:800,  max:899  },
              ].map((tier) => {
                const count = candidates.filter((c) => { const e = c.eloRating || 800; return e >= tier.min && e <= tier.max }).length
                const pct   = total ? Math.round((count / total) * 100) : 0
                return (
                  <div key={tier.range} style={{ padding:"14px 16px", background:T.cream2, border:`1px solid ${tier.color}22`, borderRadius:12, textAlign:"center" }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:tier.color }}>{count}</div>
                    <div style={{ fontSize:11, color:tier.color, fontWeight:600 }}>{tier.label}</div>
                    <div style={{ fontSize:10, color:T.ink4 }}>{tier.range} · {pct}%</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>📡 Live Activity</h2>
              <div style={{ display:"flex", alignItems:"center", gap:5, background:T.green2, border:`1px solid ${T.green}25`, borderRadius:20, padding:"3px 8px" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:T.green, display:"inline-block", boxShadow:`0 0 6px ${T.green}70`, animation:"pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize:10, color:T.green }}>30s refresh</span>
              </div>
            </div>
            {loading ? <div style={{ color:T.ink3, fontSize:13 }}>Loading activity...</div>
              : candidates.filter((c) => (c.eloRating || 800) >= 900).slice(0, 6).map((c, i) => {
              const templates = [
                { icon:"⚡", text:`${c.displayName} crossed ELO ${c.eloRating} in ${c.keyword}`,         color:T.amber  },
                { icon:"🎯", text:`${c.displayName} completed ${c.arenaCompleted || 0} Arena challenges`, color:T.indigo },
                { icon:"📈", text:`${c.displayName}'s readiness score: ${c.jobReadiness || 0}%`,          color:T.green  },
                { icon:"🛡️",  text:`${c.displayName} completed identity verification`,                    color:T.blue   },
              ]
              const t = templates[i % 4]
              return (
                <div key={c.uid} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}`, alignItems:"flex-start" }}>
                  <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:`${t.color}15`, fontSize:12 }}>{t.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:T.ink3, lineHeight:1.4 }}>{t.text}</div>
                    <div style={{ fontSize:10, color:T.ink4, marginTop:2 }}>{i * 4 + 2}m ago</div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}

const P = {
  root: { display:"flex", flexDirection:"column", gap:18 },
  statCard: { background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:"16px 14px", display:"flex", alignItems:"center", gap:12, animation:"fadeUp 0.4s ease both", boxShadow:T.shadow },
  statIcon: { width:42, height:42, borderRadius:11, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 },
  statVal:  { fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.ink, lineHeight:1.1 },
  statLabel:{ fontSize:11, color:T.ink3, marginTop:2 },
  statSub:  { fontSize:10, color:T.ink4, marginTop:1 },
  mainGrid: { display:"grid", gridTemplateColumns:"1fr 340px", gap:18, alignItems:"start" },
  card:     { background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow },
  cardHead: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  sectionTitle: { fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:0 },
  linkBtn:  { background:"none", border:"none", color:T.indigo, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
  spinner:  { width:28, height:28, border:`3px solid ${T.indigo3}`, borderTopColor:T.indigo, borderRadius:"50%", animation:"spin 0.8s linear infinite" },
}
