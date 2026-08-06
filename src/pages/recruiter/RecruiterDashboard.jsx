import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAY = 24 * 3600 * 1000

function daysAgo(iso) {
  if (!iso) return null
  return Math.round((Date.now() - new Date(iso).getTime()) / DAY)
}

function daysUntil(iso) {
  if (!iso) return null
  return Math.round((new Date(iso).getTime() - Date.now()) / DAY)
}

const domainColor = (d = "") => {
  const s = d.toLowerCase()
  if (s.includes("medical"))   return T.green
  if (s.includes("software") || s.includes("engineer")) return T.indigo
  if (s.includes("data"))      return T.blue
  if (s.includes("finance"))   return T.amber
  if (s.includes("marketing")) return T.amber
  if (s.includes("design"))    return "#c2185b"
  return T.indigo2
}

function scoreColor(score) {
  if (score == null) return T.ink4
  return score >= 75 ? T.green : score >= 50 ? T.amber : T.red
}

// ── Small building blocks ─────────────────────────────────────────────────────
function SLABadge({ daysLeft }) {
  if (daysLeft == null) return null
  const overdue = daysLeft < 0
  const warning = daysLeft <= 3 && daysLeft >= 0
  const color = overdue ? T.red : warning ? T.amber : T.green
  const bg    = overdue ? T.red2 : warning ? T.amber2 : T.green2
  return (
    <span style={{ fontSize:10, fontWeight:700, color, background:bg, border:`1px solid ${color}40`, borderRadius:6, padding:"2px 7px", whiteSpace:"nowrap" }}>
      {overdue ? `⚠ ${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
    </span>
  )
}

function EmptyState({ icon = "🌱", title, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"28px 12px", color:T.ink4 }}>
      <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:13, color:T.ink3, fontWeight:600 }}>{title}</div>
      {sub && <div style={{ fontSize:11, color:T.ink4, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ── Active Role Row ───────────────────────────────────────────────────────────
function ActiveRoleRow({ job, applied, shortlisted }) {
  const pct = applied ? Math.round((shortlisted / applied) * 100) : 0
  const daysLeft = daysUntil(job.deadline)
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.ink, display:"flex", alignItems:"center", gap:8 }}>
          {job.title}
          <span style={{ fontSize:10, background:T.cream2, color:T.ink4, border:`1px solid ${T.border}`, borderRadius:5, padding:"1px 6px" }}>{job.status || "Open"}</span>
        </div>
        <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>{job.domain || job.location || "—"}</div>
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
      <SLABadge daysLeft={daysLeft} />
    </div>
  )
}

// ── Candidate Row (Top Candidates queue) ──────────────────────────────────────
function CandidateRow({ app, jobTitle, onOpen }) {
  const initials = (app.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const col = domainColor(jobTitle)
  return (
    <div style={CR.card} onClick={onOpen}>
      <div style={{ ...CR.avatar, background:`${col}18`, border:`1.5px solid ${col}44`, color:col }}>{initials}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={CR.name}>{app.name || "—"}</div>
        <div style={{ fontSize:11, color:T.ink4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{jobTitle || "—"}</div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:scoreColor(app.score) }}>{app.score ?? "—"}</div>
        <div style={{ fontSize:9, color:T.ink4 }}>match</div>
      </div>
    </div>
  )
}
const CR = {
  card: { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, cursor:"pointer" },
  avatar: { width:36, height:36, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13 },
  name: { fontSize:13, fontWeight:600, color:T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
}

// ── Hiring Funnel (real counts, no fabricated %) ──────────────────────────────
function HiringFunnel({ stages }) {
  const max = Math.max(1, ...stages.map((s) => s.count))
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {stages.map((s) => (
        <div key={s.label}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:12, color:T.ink3 }}>{s.label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.count.toLocaleString()}</span>
          </div>
          <div style={{ height:10, background:T.cream3, borderRadius:6, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${Math.max(2, (s.count / max) * 100)}%`, background:s.color, borderRadius:6, transition:"width 1.2s ease" }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Job applicant heat bar ─────────────────────────────────────────────────────
function HeatBar({ label, count, max }) {
  const col = domainColor(label)
  const pct = Math.max(6, (count / max) * 100)
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, color:T.ink3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</span>
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
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [interviewCount, setInterviewCount] = useState(0)
  const [offerCount, setOfferCount] = useState(0)
  const [offersSentCount, setOffersSentCount] = useState(0)
  const [collegeConnectedCount, setCollegeConnectedCount] = useState(0)
  const [noticePeriodCount, setNoticePeriodCount] = useState(0)
  const [hrPendingCount, setHrPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, appsRes, interviewsRes, offersRes, offersSentRes, collegeConnRes, candidateProfilesRes, offerReviewsRes, employmentChangesRes] = await Promise.all([
        supabase.from("jobs").select("id,title,domain,location,status,deadline,applicant_count,created_at"),
        supabase.from("applications").select("id,job_id,name,score,status,missing_skills,created_at,shortlisted_at,rejected_at,feedback_sent"),
        supabase.from("interviews").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "sent"),
        supabase.from("college_connections").select("id", { count: "exact", head: true }).eq("status", "connected"),
        supabase.from("candidate_profiles").select("id", { count: "exact", head: true }).eq("employment_status", "notice_period"),
        supabase.from("offer_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("employment_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ])
      if (jobsRes.error) throw jobsRes.error
      if (appsRes.error) throw appsRes.error
      setJobs(jobsRes.data || [])
      setApplications(appsRes.data || [])
      setInterviewCount(interviewsRes.count || 0)
      setOfferCount(offersRes.count || 0)
      setOffersSentCount(offersSentRes.count || 0)
      setCollegeConnectedCount(collegeConnRes.count || 0)
      setNoticePeriodCount(candidateProfilesRes.count || 0)
      setHrPendingCount((offerReviewsRes.count || 0) + (employmentChangesRes.count || 0))
    } catch (err) {
      console.error("Dashboard load failed:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 30000); return () => clearInterval(id) }, [fetchData])

  // ── Derived (all real, computed from Supabase rows) ─────────────────────────
  const totalApplicants = applications.length
  const newThisWeek = applications.filter((a) => a.created_at && Date.now() - new Date(a.created_at).getTime() < 7 * DAY).length
  const shortlisted = applications.filter((a) => a.status === "shortlisted")
  const rejected = applications.filter((a) => a.status === "rejected")
  const scored = applications.filter((a) => a.score != null)
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length) : null
  const activeRoles = jobs.filter((j) => (j.status || "Open") === "Open").length
  const pendingFeedback = rejected.filter((a) => !a.feedback_sent)

  const STATS = [
    { label: "Total Applicants",  value: totalApplicants, icon: "👥", color: T.indigo,  sub: "across all roles" },
    { label: "New This Week",     value: newThisWeek,     icon: "🆕", color: T.green,   sub: "last 7 days" },
    { label: "Shortlisted",       value: shortlisted.length, icon: "✓", color: T.indigo2, sub: "ready to progress" },
    { label: "Avg Match Score",   value: avgScore ?? "—", icon: "🎯", color: T.amber,   sub: "AI resume match" },
    { label: "Active Roles",     value: activeRoles,      icon: "💼", color: T.blue,    sub: "currently open" },
    { label: "Pending Feedback", value: pendingFeedback.length, icon: "📝", color: T.red, sub: "rejected, not notified" },
    { label: "College Connections", value: collegeConnectedCount, icon: "🎓", color: T.indigo, sub: "active partnerships" },
    { label: "Notice Period Pool",  value: noticePeriodCount,     icon: "⏳", color: T.amber,  sub: "discoverable professionals" },
    { label: "HR Approvals Pending", value: hrPendingCount,       icon: "✅", color: T.red,    sub: "offers + employment changes" },
    { label: "Offers Sent",          value: offersSentCount,      icon: "🎁", color: T.green,  sub: `of ${offerCount} total` },
  ]

  const QUICK = [
    { icon: "📝", label: "Post Job",     path: "/recruiter/jobs",         color: T.indigo  },
    { icon: "📥", label: "Applications", path: "/recruiter/applications", color: T.indigo2 },
    { icon: "🔍", label: "Candidates",   path: "/recruiter/search",       color: T.blue    },
    { icon: "🎓", label: "Colleges",     path: "/recruiter/colleges",     color: T.indigo  },
    { icon: "✅", label: "HR Approvals", path: "/recruiter/hr-approvals", color: T.red     },
    { icon: "🧩", label: "Tasks",        path: "/recruiter/tasks",        color: T.amber   },
  ]

  // Time to shortlist (real, from shortlisted_at - created_at)
  const shortlistTimes = shortlisted
    .filter((a) => a.shortlisted_at && a.created_at)
    .map((a) => (new Date(a.shortlisted_at) - new Date(a.created_at)) / DAY)
  const avgTimeToShortlist = shortlistTimes.length
    ? (shortlistTimes.reduce((s, d) => s + d, 0) / shortlistTimes.length)
    : null

  // Top missing skills across all applications (real, from missing_skills jsonb)
  const skillGapMap = {}
  applications.forEach((a) => {
    (a.missing_skills || []).forEach((skill) => {
      const k = String(skill).trim()
      if (!k) return
      skillGapMap[k] = (skillGapMap[k] || 0) + 1
    })
  })
  const topSkillGaps = Object.entries(skillGapMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Per-job breakdown for Active Roles table + heatmap
  const jobStats = jobs.map((j) => {
    const jApps = applications.filter((a) => a.job_id === j.id)
    return { job: j, applied: jApps.length, shortlisted: jApps.filter((a) => a.status === "shortlisted").length }
  })
  const maxApplied = Math.max(1, ...jobStats.map((j) => j.applied))

  // Needs review: applications sitting untouched (still "pending") for 3+ days
  const needsReview = applications
    .filter((a) => a.status === "pending" && daysAgo(a.created_at) >= 3)
    .sort((a, b) => daysAgo(b.created_at) - daysAgo(a.created_at))
    .slice(0, 5)

  // Top candidates queue: highest-scored, not-yet-rejected applications
  const jobTitleById = Object.fromEntries(jobs.map((j) => [j.id, j.title]))
  const topCandidates = applications
    .filter((a) => a.status !== "rejected" && a.score != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  // Recent activity: latest applications, real timestamps
  const recentActivity = [...applications]
    .filter((a) => a.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)

  const funnelStages = [
    { label: "Applied",              count: totalApplicants,      color: T.indigo  },
    { label: "Shortlisted",          count: shortlisted.length,   color: T.blue    },
    { label: "Interviews Scheduled", count: interviewCount,       color: T.amber   },
    { label: "Offers Extended",      count: offerCount,           color: T.green   },
  ]

  return (
    <div style={P.root}>

      {/* ── KPI Stats Strip ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
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

      {/* ── Signal Row (all real, honest empty states) ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>

        {/* Time to shortlist */}
        <div style={{ ...P.card, padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.ink3, letterSpacing:"0.04em", marginBottom:8 }}>⏱ TIME TO SHORTLIST</div>
          {avgTimeToShortlist == null ? (
            <EmptyState icon="⏱" title="Not enough data yet" sub="Appears once you shortlist your first candidate" />
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:T.indigo }}>{avgTimeToShortlist.toFixed(1)}</span>
                <span style={{ fontSize:13, color:T.ink3 }}>days avg</span>
              </div>
              <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>from application to shortlist, across {shortlistTimes.length} candidate{shortlistTimes.length === 1 ? "" : "s"}</div>
            </>
          )}
        </div>

        {/* Missing feedback (real) */}
        <div style={{ ...P.card, padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.ink3, letterSpacing:"0.04em", marginBottom:8 }}>📝 MISSING FEEDBACK</div>
          {pendingFeedback.length === 0 ? (
            <EmptyState icon="✅" title="All caught up" sub="No rejected candidates waiting on feedback" />
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:8 }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:T.red }}>{pendingFeedback.length}</span>
                <span style={{ fontSize:13, color:T.ink3 }}>pending</span>
              </div>
              {pendingFeedback.slice(0, 3).map((a) => (
                <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, padding:"6px 8px", background:T.cream2, borderRadius:7 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:T.ink }}>{a.name || "—"}</div>
                    <div style={{ fontSize:10, color:T.ink4 }}>{jobTitleById[a.job_id] || "—"}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:T.amber, background:`${T.amber}18`, borderRadius:4, padding:"2px 6px" }}>{daysAgo(a.rejected_at || a.created_at)}d</span>
                </div>
              ))}
              {pendingFeedback.length > 3 && <div style={{ fontSize:10, color:T.ink4, marginTop:4 }}>+{pendingFeedback.length - 3} more</div>}
            </>
          )}
        </div>

        {/* Top skill gaps (real, from missing_skills) */}
        <div style={{ ...P.card, padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.ink3, letterSpacing:"0.04em", marginBottom:8 }}>🧩 TOP SKILL GAPS</div>
          {topSkillGaps.length === 0 ? (
            <EmptyState icon="🧩" title="No gaps identified yet" sub="Appears once applications are scored" />
          ) : (
            topSkillGaps.map(([skill, count]) => (
              <div key={skill} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:T.ink3, marginBottom:6 }}>
                <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{skill}</span>
                <span style={{ fontWeight:700, color:T.amber }}>{count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main 2-col grid ── */}
      <div style={P.mainGrid}>

        {/* ── LEFT: Hiring Activity ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Active Roles */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>💼 Active Roles</h2>
              <button onClick={() => navigate("/recruiter/jobs")} style={P.linkBtn}>View All →</button>
            </div>
            {jobStats.length === 0
              ? <EmptyState icon="💼" title="No jobs posted yet" sub="Post your first role to start receiving applications" />
              : jobStats.map((js) => <ActiveRoleRow key={js.job.id} job={js.job} applied={js.applied} shortlisted={js.shortlisted} />)}
          </div>

          {/* Needs review (real, replaces fake bottleneck alerts) */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>🚧 Needs Review</h2>
              {needsReview.length > 0 && <span style={{ fontSize:11, color:T.amber, fontWeight:600 }}>{needsReview.length} waiting 3+ days</span>}
            </div>
            {needsReview.length === 0
              ? <EmptyState icon="✅" title="You're all caught up" sub="No applications have been waiting more than 3 days" />
              : needsReview.map((a) => (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:18 }}>⏳</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.ink }}>{a.name || "—"}</div>
                    <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>{jobTitleById[a.job_id] || "—"} · waiting {daysAgo(a.created_at)} days</div>
                  </div>
                  <button onClick={() => navigate("/recruiter/applications")} style={{ fontSize:11, color:T.amber, background:`${T.amber}15`, border:`1px solid ${T.amber}30`, borderRadius:7, padding:"5px 10px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, whiteSpace:"nowrap" }}>
                    Review
                  </button>
                </div>
              ))}
          </div>

          {/* Top Candidates queue */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>🎯 Top Candidates</h2>
              <button onClick={() => navigate("/recruiter/applications")} style={P.linkBtn}>All Applications →</button>
            </div>
            {loading ? (
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:120, gap:12 }}>
                <div style={P.spinner} />
                <span style={{ color:T.ink3, fontSize:13 }}>Loading candidates...</span>
              </div>
            ) : topCandidates.length === 0 ? (
              <EmptyState icon="🎯" title="No candidates yet" sub="Ranked candidates will appear here once people apply" />
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                {topCandidates.map((a) => (
                  <CandidateRow key={a.id} app={a} jobTitle={jobTitleById[a.job_id]} onOpen={() => navigate("/recruiter/applications")} />
                ))}
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
            <HiringFunnel stages={funnelStages} />
          </div>

          {/* Applications by job */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>📊 Applications by Role</h2>
            </div>
            {loading ? <div style={{ color:T.ink3, fontSize:13 }}>Loading...</div>
              : jobStats.filter((j) => j.applied > 0).length === 0
                ? <EmptyState icon="📊" title="No applications yet" />
                : jobStats.filter((j) => j.applied > 0).sort((a, b) => b.applied - a.applied).slice(0, 7)
                    .map((js) => <HeatBar key={js.job.id} label={js.job.title} count={js.applied} max={maxApplied} />)}
          </div>

          {/* Recent activity (real timestamps) */}
          <div style={P.card}>
            <div style={P.cardHead}>
              <h2 style={P.sectionTitle}>📡 Recent Activity</h2>
              <div style={{ display:"flex", alignItems:"center", gap:5, background:T.green2, border:`1px solid ${T.green}25`, borderRadius:20, padding:"3px 8px" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:T.green, display:"inline-block", boxShadow:`0 0 6px ${T.green}70`, animation:"pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize:10, color:T.green }}>30s refresh</span>
              </div>
            </div>
            {loading ? <div style={{ color:T.ink3, fontSize:13 }}>Loading activity...</div>
              : recentActivity.length === 0 ? <EmptyState icon="📡" title="No activity yet" sub="New applications will show up here" />
              : recentActivity.map((a) => (
                <div key={a.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}`, alignItems:"flex-start" }}>
                  <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:`${T.indigo}15`, fontSize:12 }}>📥</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:T.ink3, lineHeight:1.4 }}>
                      <strong style={{ color:T.ink }}>{a.name || "Someone"}</strong> applied to {jobTitleById[a.job_id] || "a role"}{a.score != null ? ` · scored ${a.score}` : ""}
                    </div>
                    <div style={{ fontSize:10, color:T.ink4, marginTop:2 }}>{daysAgo(a.created_at) === 0 ? "today" : `${daysAgo(a.created_at)}d ago`}</div>
                  </div>
                </div>
              ))}
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
