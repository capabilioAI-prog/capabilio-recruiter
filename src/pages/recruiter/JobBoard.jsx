import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import ApplicationsView from "./ApplicationsView"
import { T, card, cardLg, tag, btn } from "./theme"

// 2026-08-09: this file used to have TWO parallel, disconnected application
// systems -- a "👥 Applications" tab reading/writing Firebase Firestore
// (candidate shortlist/reject decisions written to Firestore `applications`,
// with a "AI email" generator that called Anthropic directly from the
// browser with no auth header and always silently fell back to static
// text), and a separate "📊 Bulk ATS" tab that already embedded the real,
// fully-wired ApplicationsView.jsx (Supabase `applications` table, real
// pagination, real bulk-reject-feedback backend with AI-drafted emails,
// verified-profile badges -- see ApplicationsView.jsx's own history).
// A recruiter shortlisting/rejecting from the Firestore tab never showed up
// anywhere else in the product (Pipeline, Analytics, Compare, Rejection
// Engine all read the real Supabase `applications` table) -- candidates
// could be silently "rejected" here while still fully active everywhere
// else. Per the project's own rule against duplicate systems, the fix is
// not to repair the Firestore duplicate -- it's retired entirely in favor
// of the one real system, which was already built and working. "Bulk ATS"
// is now simply the "Applications" tab.
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }
}

// Supabase `jobs` rows are snake_case; the rest of this file (and ApplyPage.jsx)
// expects the camelCase/legacy field names below.
function fromDbJob(row) {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    type: row.type,
    experience: row.experience,
    location: row.location,
    salary: row.salary,
    skills: row.skills,
    status: row.status,
    applicantCount: row.applicant_count,
    description: row.description,
    responsibilities: row.responsibilities,
    requirements: row.requirements,
    niceToHave: row.nice_to_have,
    createdAt: row.created_at,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const domainColor = (d) => {
  d = d || "" // guard against explicit null, not just undefined
  if (d.toLowerCase().includes("medical"))   return T.green
  if (d.toLowerCase().includes("software"))  return T.indigo
  if (d.toLowerCase().includes("data"))      return T.blue
  if (d.toLowerCase().includes("finance"))   return T.amber
  if (d.toLowerCase().includes("marketing")) return T.amber
  if (d.toLowerCase().includes("design"))    return T.indigo2
  return T.indigo2
}

// 2026-08-09: was a direct, unauthenticated https://api.anthropic.com fetch
// from the browser -- always 401'd and silently fell back to static text,
// so "AI-generated" descriptions were never real. Now routes through the
// real backend (jobDescription.js), same pattern already fixed for offer
// letters (offers.js) and rejection feedback (feedback.js).
async function generateJobDescription(job) {
  try {
    const headers = await authHeaders()
    const res = await fetch(`${BACKEND}/generate-job-description`, {
      method: "POST",
      headers,
      body: JSON.stringify(job),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
    return data
  } catch (err) {
    console.error("generateJobDescription failed, using local fallback:", err.message)
    return {
      description: `We are looking for a talented ${job.title} to join our team.`,
      responsibilities: ["Lead key projects", "Collaborate with team", "Drive results", "Mentor junior members", "Report to leadership"],
      requirements: ["Relevant experience", "Strong communication", "Team player", "Problem solver"],
      niceToHave: ["Leadership experience", "Domain certifications", "Open source contributions"],
    }
  }
}

// ── Score Ring ────────────────────────────────────────────────────────────────
const scoreColor = (s) => s >= 75 ? T.green : s >= 50 ? T.amber : T.red

function ScoreRing({ score, size = 52 }) {
  const r    = size / 2 - 5
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const col  = scoreColor(score)
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        fontSize="12" fontWeight="800" fill={col} fontFamily="Inter">{score}</text>
    </svg>
  )
}

// ── Create Job Modal ──────────────────────────────────────────────────────────
function CreateJobModal({ onClose, onCreated }) {
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({ title: "", domain: "Software Engineering", type: "Full-time", experience: "Mid", skills: "", salary: "", location: "Remote" })
  const [generated, setGenerated] = useState(null)

  const DOMAINS = ["Software Engineering", "Data Science", "Medical & Health", "Finance", "Marketing", "Design", "Product Management", "Operations"]
  const iStyle  = { width: "100%", padding: "10px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink, fontSize: 13, fontFamily: "'Inter',sans-serif" }

  const generate = async () => {
    if (!form.title.trim()) return
    setLoading(true)
    const desc = await generateJobDescription(form)
    setGenerated(desc)
    setStep(2)
    setLoading(false)
  }

  const save = async (status) => {
    setSaving(true)
    try {
      const { data, error } = await supabase.from("jobs").insert({
        title: form.title,
        domain: form.domain,
        type: form.type,
        experience: form.experience,
        skills: form.skills,
        salary: form.salary,
        location: form.location,
        description: generated?.description,
        responsibilities: generated?.responsibilities,
        requirements: generated?.requirements,
        nice_to_have: generated?.niceToHave,
        status,
        applicant_count: 0,
        // company_id is auto-stamped server-side (see stamp_company_id trigger)
      }).select().single()
      if (error) throw error
      onCreated(fromDbJob(data))
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(26,26,24,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter',sans-serif" }}>
      <style>{`input:focus,select:focus,textarea:focus{outline:none;border-color:${T.indigo}!important}`}</style>
      <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: T.shadow2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 800, color: T.ink, margin: 0 }}>
            {step === 1 ? "📋 Create Job Posting" : "✨ AI-Generated Description"}
          </h2>
          <button onClick={onClose} style={{ background: T.cream2, border: `1px solid ${T.border}`, color: T.ink3, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        {step === 1 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Job Title *</div>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Data Analyst" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Domain</div>
                <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} style={iStyle}>
                  {DOMAINS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Type</div>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={iStyle}>
                  {["Full-time", "Part-time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Experience</div>
                <select value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} style={iStyle}>
                  {["Junior", "Mid", "Senior", "Lead", "Executive"].map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Location</div>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Remote / City" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Salary Range</div>
                <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="e.g. $80k–$110k" style={iStyle} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Required Skills (comma separated)</div>
                <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, SQL, Communication..." style={iStyle} />
              </div>
            </div>
            <button onClick={generate} disabled={loading || !form.title.trim()} style={{ width: "100%", padding: "13px", background: loading ? T.indigo3 : T.indigo, border: "none", borderRadius: 12, color: loading ? T.indigo : "#1A1A18", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "'Inter',sans-serif" }}>
              {loading ? "✨ Generating with AI..." : "✨ Generate Description with AI →"}
            </button>
          </>
        )}

        {step === 2 && generated && (
          <>
            <div style={{ fontSize: 14, color: T.ink3, lineHeight: 1.7, marginBottom: 16 }}>{generated.description}</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Responsibilities</div>
              {(generated.responsibilities || []).map((r, i) => <div key={i} style={{ fontSize: 13, color: T.ink4, padding: "3px 0" }}>• {r}</div>)}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Requirements</div>
              {(generated.requirements || []).map((r, i) => <div key={i} style={{ fontSize: 13, color: T.ink4, padding: "3px 0" }}>✓ {r}</div>)}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Nice to Have</div>
              {(generated.niceToHave || []).map((r, i) => <div key={i} style={{ fontSize: 13, color: T.ink3, padding: "3px 0" }}>⭐ {r}</div>)}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ padding: "11px 16px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink3, fontSize: 13, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>← Edit</button>
              <button onClick={() => save("Draft")} disabled={saving} style={{ flex: 1, padding: "11px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                {saving ? "Saving..." : "💾 Save as Draft"}
              </button>
              <button onClick={() => save("Open")} disabled={saving} style={{ flex: 1, padding: "11px", background: T.indigo, border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                {saving ? "Publishing..." : "🚀 Post Job"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, selected, onClick, appCount }) {
  const col = domainColor(job.domain)
  const statusIsOpen   = job.status === "Open"
  const statusIsDraft  = job.status === "Draft"
  const statusIsClosed = job.status === "Closed"
  const statusBg    = statusIsOpen ? T.green2 : statusIsDraft ? T.amber2 : T.red2
  const statusColor = statusIsOpen ? T.green  : statusIsDraft ? T.amber  : T.red
  return (
    <div
      onClick={() => onClick(job)}
      style={{
        background: selected ? T.indigo3 : T.cream,
        border: `1px solid ${selected ? T.indigo : T.border}`,
        borderLeft: `3px solid ${col}`,
        borderRadius: 14, padding: "14px 16px", cursor: "pointer",
        transition: "all 0.2s", boxShadow: T.shadow,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, flex: 1, marginRight: 8 }}>{job.title}</div>
        <span style={{ fontSize: 10, color: statusColor, background: statusBg, border: `1px solid ${T.border}`, padding: "2px 8px", borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
          {job.status || "Open"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: col, marginBottom: 8 }}>◆ {job.domain}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: T.ink4 }}>📅 {job.experience}</span>
        <span style={{ fontSize: 11, color: T.ink4 }}>💰 {job.salary || "TBD"}</span>
        <span style={{ fontSize: 11, color: T.indigo, fontWeight: 600 }}>👥 {appCount} applicants</span>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyJobs({ onCreate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
      <div style={{ fontSize: 52 }}>📋</div>
      <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 20, fontWeight: 800, color: T.ink, margin: 0 }}>No Job Postings Yet</h2>
      <p style={{ color: T.ink4, fontSize: 14, textAlign: "center" }}>Create your first job posting to start receiving applications</p>
      <button onClick={onCreate} style={{ padding: "12px 24px", background: T.indigo, border: "none", borderRadius: 12, color: "#1A1A18", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
        + Create Job Posting
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobBoard() {
  const [jobs,        setJobs]        = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [view,        setView]        = useState("detail")  // detail | applications
  const [showCreate,  setShowCreate]  = useState(false)

  // ── Load jobs from Supabase ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    supabase.from("jobs").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error("Failed to load jobs:", error); setLoadingJobs(false); return }
        const rows = (data || []).map(fromDbJob)
        setJobs(rows)
        setSelectedJob((prev) => prev || rows[0] || null)
        setLoadingJobs(false)
      })
    const channel = supabase
      .channel("jobs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, (payload) => {
        setJobs((prev) => {
          if (payload.eventType === "INSERT") {
            const next = [...prev, fromDbJob(payload.new)]
            next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            return next
          }
          if (payload.eventType === "UPDATE") {
            return prev.map((j) => (j.id === payload.new.id ? fromDbJob(payload.new) : j))
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((j) => j.id !== payload.old.id)
          }
          return prev
        })
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  // ── Per-job applicant counts (real Supabase applications table) ──────────
  // 2026-08-09: previously read a Firestore `applications` collection that
  // an external Railway backend wrote to -- disconnected from the real
  // Supabase `applications` table apply.js/ApplicationsView.jsx/Pipeline/
  // Analytics all use. head:true count-only queries, so this never
  // transfers actual application rows just to count them.
  const [appCounts, setAppCounts] = useState({})
  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      const entries = await Promise.all(
        jobs.map(async (j) => {
          const { count } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("job_id", j.id)
          return [j.id, count || 0]
        })
      )
      if (!cancelled) setAppCounts(Object.fromEntries(entries))
    }
    if (jobs.length > 0) loadCounts()
    return () => { cancelled = true }
  }, [jobs])

  // ── Header stats (real, company-scoped via RLS) ───────────────────────────
  const [companyStats, setCompanyStats] = useState({ shortlisted: 0, feedbackSent: 0 })
  useEffect(() => {
    let cancelled = false
    async function loadStats() {
      const [{ count: shortlisted }, { count: feedbackSent }] = await Promise.all([
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "shortlisted"),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("feedback_sent", true),
      ])
      if (!cancelled) setCompanyStats({ shortlisted: shortlisted || 0, feedbackSent: feedbackSent || 0 })
    }
    loadStats()
    return () => { cancelled = true }
  }, [])

  const totalApps = Object.values(appCounts).reduce((s, c) => s + c, 0)

  const stats = [
    { icon: "📋", label: "Open Positions",    value: jobs.filter((j) => j.status === "Open").length, color: T.indigo },
    { icon: "📤", label: "Total Applications", value: totalApps,               color: T.blue },
    { icon: "✅", label: "Shortlisted",        value: companyStats.shortlisted, color: T.green },
    { icon: "⚡", label: "Feedback Sent",      value: companyStats.feedbackSent, color: T.amber },
  ]

  const copyApplyLink = () => {
    if (!selectedJob) return
    const link = `${window.location.origin}/apply/${selectedJob.id}`
    navigator.clipboard.writeText(link)
  }

  const col = selectedJob ? domainColor(selectedJob.domain) : T.indigo

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabs = [
    { id: "detail",       label: "📋 Job Details" },
    { id: "applications", label: `👥 Applications (${appCounts[selectedJob?.id] ?? 0})` },
  ]

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.6} }
        input::placeholder, textarea::placeholder { color: ${T.ink4}; }
        input:focus, textarea:focus, select:focus  { outline: none; border-color: ${T.indigo} !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.indigo3}; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>Job Board</h1>
          <p style={{ fontSize: 13, color: T.ink4, marginTop: 4 }}>Post jobs, share apply links, and get resumes auto-scored by AI</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: "10px 20px", background: T.indigo, border: "none", borderRadius: 12, color: "#1A1A18", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: T.shadow }}>
          + Post New Job
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: T.shadow }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loadingJobs ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${T.indigo3}`, borderTopColor: T.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyJobs onCreate={() => setShowCreate(true)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>

          {/* Left — Jobs sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                selected={selectedJob?.id === j.id}
                onClick={(job) => { setSelectedJob(job); setView("detail") }}
                appCount={appCounts[j.id] || 0}
              />
            ))}
          </div>

          {/* Right — Tabs + Views */}
          {selectedJob && (
            <div>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4 }}>
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: view === t.id ? T.indigo3 : "transparent",
                      border: view === t.id ? `1px solid ${T.border}` : "1px solid transparent",
                      borderRadius: 10,
                      color: view === t.id ? T.indigo : T.ink4,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'Inter',sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Job Detail View ── */}
              {view === "detail" && (
                <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, boxShadow: T.shadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 20, fontWeight: 800, color: T.ink, margin: "0 0 4px" }}>{selectedJob.title}</h2>
                      <div style={{ fontSize: 13, color: col }}>◆ {selectedJob.domain}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={copyApplyLink} style={{ padding: "8px 16px", background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.indigo, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                        🔗 Copy Apply Link
                      </button>
                      <button onClick={() => setView("applications")} style={{ padding: "8px 16px", background: T.indigo, border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                        👥 View Applications →
                      </button>
                    </div>
                  </div>

                  {/* Apply link box */}
                  <div style={{ background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.indigo, marginBottom: 6 }}>🔗 Public Apply Link</div>
                    <div style={{ fontSize: 12, color: T.ink3, marginBottom: 10 }}>Share this link on LinkedIn, your website, or job boards. Candidates apply directly and their resumes are scored by AI instantly.</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px" }}>
                      <span style={{ flex: 1, fontSize: 12, color: T.indigo, wordBreak: "break-all" }}>
                        {window.location.origin}/apply/{selectedJob.id}
                      </span>
                      <button onClick={copyApplyLink} style={{ padding: "5px 12px", background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 6, color: T.indigo, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    {[selectedJob.type, selectedJob.experience, selectedJob.location || "Remote", selectedJob.salary || "Competitive"].map((v, i) => (
                      <span key={i} style={{ fontSize: 12, color: T.ink3, background: T.cream2, border: `1px solid ${T.border}`, padding: "5px 12px", borderRadius: 20 }}>{v}</span>
                    ))}
                  </div>

                  {selectedJob.description && (
                    <p style={{ fontSize: 14, color: T.ink3, lineHeight: 1.7, marginBottom: 16 }}>{selectedJob.description}</p>
                  )}

                  {(selectedJob.requirements || []).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Requirements</div>
                      {selectedJob.requirements.map((r, i) => <div key={i} style={{ fontSize: 13, color: T.ink4, padding: "3px 0" }}>✓ {r}</div>)}
                    </div>
                  )}
                </div>
              )}

              {/* ── Applications View (real, Supabase-backed) ── */}
              {view === "applications" && (
                <ApplicationsView
                  jobId={selectedJob.id}
                  jobTitle={selectedJob.title}
                  onBack={() => setView("detail")}
                />
              )}

            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onCreated={(job) => { setShowCreate(false); setSelectedJob(job) }}
        />
      )}
    </div>
  )
}
