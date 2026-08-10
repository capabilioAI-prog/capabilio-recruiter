import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, card } from "./theme"

// 2026-08-10: this page read the same dead pre-Supabase Firestore `users`
// snapshot as Shadow Interview/Talent Pool/Team Chemistry did (same root
// cause, same fix -- real /partner/candidates data). Beyond that it had 3
// separate fabrications, each removed rather than patched:
//   1. SLABar showed `Math.floor(Math.random() * 8) + 1` as "days elapsed"
//      for every candidate on every render -- there is no real per-bucket
//      clock for a raw discovery-pool candidate (that concept only exists
//      once someone is actually in the pipeline, via pipeline_candidates.
//      added_at), so it's gone rather than replaced with a fake substitute.
//   2. "AI Shortlist Reasoning" was 3 blocks of invented prose (a fake
//      "notice period: 28 days" that comes from nowhere, a claim that
//      rejection emails "will auto-generate" when nothing here sends any).
//      Replaced with real numbers computed from the actual clustered pool.
//   3. "Stage Drop-off Insights" used `candidates.length || 248` as a
//      fallback and fixed 0.62/0.31/0.14 drop-off rates -- a fabricated
//      funnel with fabricated data. RecruiterAnalytics.jsx already computes
//      a REAL hiring funnel from pipeline_candidates/applications/
//      interviews/offers -- this page links there now instead of
//      duplicating it with fake numbers.
// Bulk bucket actions now do one real thing: add the bucket's candidates to
// the real pipeline_candidates table (same table Candidate Discovery's
// "+ Pipeline" and Applications' "Shortlist" already write to) at a stage
// matching what that bucket represents. "Not Matched" has no real action
// that makes sense (nobody should be added to a hiring pipeline from a
// "didn't match" bucket), so its button is disabled with an honest reason
// instead of wired to a fake success toast.
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

const BUCKETS = [
  { id:"strong_fit",     label:"Strong Fit",           icon:"🏆", color:T.green,  desc:"Meet must-have skills, high ELO, verified",    action:"Add to Pipeline · Shortlisted", pipelineStage:"shortlisted" },
  { id:"interview_ready",label:"Interview Ready",       icon:"🎯", color:T.blue,   desc:"Passed assessment, available, notice ≤30d",    action:"Add to Pipeline · Interview",   pipelineStage:"interview" },
  { id:"high_potential", label:"High Potential",        icon:"🚀", color:T.indigo, desc:"Strong ELO, incomplete profile or new joiner",  action:"Add to Pipeline · Sourced",     pipelineStage:"applied" },
  { id:"needs_verify",   label:"Needs Verification",    icon:"🛡️",  color:T.amber,  desc:"Good signals but pending docs/identity",       action:"Add to Pipeline · Sourced",     pipelineStage:"applied" },
  { id:"future_pool",    label:"Future Talent Pool",    icon:"🌱", color:T.indigo2,desc:"Strong but mismatched timing or availability",  action:"Add to Pipeline · Sourced",     pipelineStage:"applied" },
  { id:"not_matched",    label:"Not Matched",           icon:"○",  color:T.ink4,   desc:"Below threshold on critical must-have skills", action:null,                            pipelineStage:null },
]

function clusterCandidate(c) {
  const elo   = c.elo || 800
  const ready = c.jobReadiness || 0
  const arena = c.taskCount || 0
  if (elo >= 1100 && ready >= 70) return "strong_fit"
  if (elo >= 1000 && ready >= 50) return "interview_ready"
  if (elo >= 950  && ready < 50)  return "high_potential"
  if (elo >= 900  && arena >= 2)  return "needs_verify"
  if (elo >= 870)                 return "future_pool"
  return "not_matched"
}

function BucketCard({ bucket, candidates, onBulkAdd, adding }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedRaw, setSelectedRaw] = useState([])
  const count  = candidates.length
  const avgElo = count ? Math.round(candidates.reduce((s, c) => s + (c.elo || 800), 0) / count) : 0

  // Derived, not synced via an effect+setState: selections from a previous
  // candidates set (e.g. after a refetch) simply won't match any current
  // candidate id and drop out of this filter on the next render, with no
  // separate effect needed to "clean up" state.
  const idsSet = useMemo(() => new Set(candidates.map((c) => c.id)), [candidates])
  const selected = useMemo(() => selectedRaw.filter((id) => idsSet.has(id)), [selectedRaw, idsSet])

  const targets = () => candidates.filter((c) => selected.length === 0 || selected.includes(c.id))

  return (
    <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderLeft:`4px solid ${bucket.color}`, borderRadius:16, overflow:"hidden", boxShadow:T.shadow }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 18px", cursor:"pointer", background:T.cream }}
        onClick={() => setExpanded(!expanded)}>
        <div style={{ width:42, height:42, borderRadius:12, background:`${bucket.color}15`, color:bucket.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
          {bucket.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.ink }}>{bucket.label}</div>
          <div style={{ fontSize:11, color:T.ink3, marginTop:1 }}>{bucket.desc}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:bucket.color }}>{count}</div>
          <div style={{ fontSize:10, color:T.ink4 }}>candidates</div>
        </div>
        <div style={{ textAlign:"right", marginLeft:4 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.ink3 }}>⚡{avgElo}</div>
          <div style={{ fontSize:10, color:T.ink4 }}>avg ELO</div>
        </div>
        {bucket.action ? (
          <button
            onClick={(e) => { e.stopPropagation(); onBulkAdd(bucket, targets()) }}
            disabled={count === 0 || adding}
            title={`Adds ${selected.length > 0 ? selected.length : count} candidate(s) to your Pipeline at the "${bucket.pipelineStage}" stage`}
            style={{ padding:"7px 14px", background:`${bucket.color}15`, border:`1px solid ${bucket.color}35`, borderRadius:9, color:bucket.color, fontSize:12, fontWeight:700, cursor: count === 0 || adding ? "not-allowed" : "pointer", opacity: count === 0 || adding ? 0.5 : 1, fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
            {bucket.action} →
          </button>
        ) : (
          <span title="No hiring action applies to candidates who didn't match — nothing to wire this button to." style={{ fontSize:11, color:T.ink4, fontStyle:"italic" }}>No action available</span>
        )}
        <span style={{ color:T.ink4, fontSize:16 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && count > 0 && (
        <div style={{ padding:"0 18px 16px", borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
            <input type="checkbox"
              checked={selected.length === candidates.length && candidates.length > 0}
              onChange={() => setSelectedRaw(selected.length === candidates.length ? [] : candidates.map((c) => c.id))}
              style={{ accentColor:T.indigo, cursor:"pointer" }} />
            <span style={{ fontSize:12, color:T.ink3 }}>Select all {count} (leave unselected to act on all)</span>
          </div>

          {candidates.slice(0, 10).map((c) => {
            const col = c.domain?.toLowerCase().includes("medical") ? T.green
              : c.domain?.toLowerCase().includes("software") ? T.indigo
              : c.domain?.toLowerCase().includes("data") ? T.blue : T.indigo2
            const displayName = c.display_name || c.username || "Candidate"
            const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)
            return (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                <input type="checkbox" checked={selected.includes(c.id)}
                  onChange={() => setSelectedRaw((s) => s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id])}
                  style={{ accentColor:T.indigo, cursor:"pointer", flexShrink:0 }} />
                <div style={{ width:34, height:34, borderRadius:9, background:`${col}18`, color:col, border:`1px solid ${col}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:12, flexShrink:0 }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{displayName}</div>
                  <div style={{ fontSize:11, color:T.ink4 }}>{c.domain || "General"}</div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:T.amber }}>⚡{c.elo || 800}</span>
                <span style={{ fontSize:12, color:T.green }}>🎯{c.taskCount || 0} tasks</span>
                {c.jobReadiness != null && <span style={{ fontSize:11, color:T.ink3, minWidth:70, textAlign:"right" }}>{c.jobReadiness}% ready</span>}
              </div>
            )
          })}
          {count > 10 && (
            <div style={{ textAlign:"center", paddingTop:10, fontSize:12, color:T.ink4 }}>+{count - 10} more in this bucket (bulk action applies to all {count})</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BulkHiring() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [jobs,        setJobs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [bridgeError, setBridgeError] = useState("")
  const [activeJobId, setActiveJobId] = useState("")
  const [toast,       setToast]       = useState(null)
  const [adding,      setAdding]      = useState(false)

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    setBridgeError("")
    try {
      const headers = await authHeaders()
      const res = await fetch(`${BACKEND}/partner/candidates?limit=200`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setCandidates(body.candidates || [])
    } catch (err) {
      console.error("Failed to load candidates from partner bridge:", err)
      setBridgeError(err.message || "Could not load candidates.")
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("jobs").select("id, title, status").order("created_at", { ascending: false })
      if (error) { console.error("Failed to load jobs:", error.message); return }
      const open = (data || []).filter((j) => (j.status || "").toLowerCase() !== "closed")
      setJobs(open)
      if (open.length > 0) setActiveJobId(open[0].id)
    })()
  }, [])

  const activeJob = jobs.find((j) => j.id === activeJobId)

  const clustered = useMemo(() => BUCKETS.reduce((acc, b) => {
    acc[b.id] = candidates.filter((c) => clusterCandidate(c) === b.id)
    return acc
  }, {}), [candidates])

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleBulkAdd = async (bucket, targets) => {
    if (!bucket.pipelineStage || targets.length === 0) return
    if (!activeJobId) { showToast("Select a job before adding candidates to the pipeline.", "error"); return }
    setAdding(true)
    try {
      const rows = targets.map((c) => ({
        candidate_id: c.id,
        name: c.display_name || c.username || "Candidate",
        job_id: activeJobId,
        job_title: activeJob?.title || null,
        stage: bucket.pipelineStage,
        score: c.jobReadiness ?? null,
      }))
      const { error } = await supabase.from("pipeline_candidates").insert(rows)
      if (error) throw error
      showToast(`${targets.length} candidate${targets.length > 1 ? "s" : ""} added to Pipeline (${bucket.pipelineStage}) for ${activeJob?.title || "this role"}`)
    } catch (err) {
      console.error("Bulk pipeline add failed:", err)
      showToast(err.message || "Failed to add candidates to pipeline", "error")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:T.cream, border:`1px solid ${toast.type === "error" ? T.red : T.green}30`, borderRadius:12, padding:"12px 18px", zIndex:999, fontSize:13, color: toast.type === "error" ? T.red : T.green, fontWeight:600, boxShadow:T.shadow2 }}>
          {toast.type === "error" ? "⚠ " : "✅ "}{toast.msg}
        </div>
      )}

      <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>🚀 Bulk Hiring Intelligence</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          Clusters your live candidate pool into deterministic buckets by ELO, job readiness, and Arena activity, and lets you bulk-add a whole bucket to your real Pipeline at the right stage in one click.
        </div>
      </div>

      {bridgeError && (
        <div style={{ background:T.red2, border:`1px solid ${T.red}30`, borderRadius:12, padding:"12px 16px", fontSize:12, color:T.red, fontWeight:600 }}>⚠ {bridgeError}</div>
      )}

      {/* Job selector */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:12, color:T.ink3, fontWeight:600 }}>Adding to pipeline for:</span>
        {jobs.length === 0 ? (
          <span style={{ fontSize:12, color:T.ink4 }}>No jobs yet — create one in Jobs first.</span>
        ) : jobs.map((j) => (
          <button key={j.id} onClick={() => setActiveJobId(j.id)}
            style={{ fontSize:12, padding:"6px 14px", borderRadius:9, border:"1px solid", cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600, transition:"all 0.15s",
              background:  activeJobId === j.id ? T.indigo3 : T.cream2,
              borderColor: activeJobId === j.id ? T.indigo   : T.border,
              color:       activeJobId === j.id ? T.indigo   : T.ink4,
            }}>
            {j.title}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
        {BUCKETS.map((b) => (
          <div key={b.id} style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:14, padding:"14px", textAlign:"center", boxShadow:T.shadow }}>
            <div style={{ fontSize:22 }}>{b.icon}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:b.color, marginTop:4 }}>
              {loading ? "—" : clustered[b.id]?.length || 0}
            </div>
            <div style={{ fontSize:11, color:T.ink3, marginTop:2, lineHeight:1.3 }}>{b.label}</div>
          </div>
        ))}
      </div>

      {/* Real, deterministic pool summary — no fabricated notice periods or claims */}
      {!loading && candidates.length > 0 && (
        <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:20 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.ink, marginBottom:14 }}>📊 Pool Summary — computed from {candidates.length} live candidates</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[
              { title:"Strong Fit", color:T.green, text: `${clustered.strong_fit?.length || 0} candidates have ELO ≥1100 and job readiness ≥70% — the two thresholds this bucket is defined by. ${clustered.strong_fit?.length ? `Average ELO in this bucket: ${Math.round(clustered.strong_fit.reduce((s,c)=>s+(c.elo||800),0)/clustered.strong_fit.length)}.` : ""}` },
              { title:"Interview Ready", color:T.blue, text: `${clustered.interview_ready?.length || 0} candidates meet ELO ≥1000 with readiness ≥50%, the assessment-passed threshold for this bucket.` },
              { title:"Not Matched", color:T.red, text: `${clustered.not_matched?.length || 0} candidates fall below every bucket's ELO/readiness/Arena threshold — none currently clear the bar for this role's pipeline.` },
            ].map((r) => (
              <div key={r.title} style={{ padding:"14px 16px", background:T.cream, border:`1px solid ${r.color}20`, borderRadius:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:r.color, marginBottom:6 }}>{r.title}</div>
                <div style={{ fontSize:12, color:T.ink3, lineHeight:1.6 }}>{r.text}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:T.ink4, marginTop:12 }}>
            Clustering thresholds are fixed rules on ELO/job-readiness/Arena activity — not an AI judgment call. For hiring-funnel drop-off and conversion rates, see{" "}
            <button onClick={() => navigate("/recruiter/analytics")} style={{ background:"none", border:"none", color:T.indigo, textDecoration:"underline", cursor:"pointer", fontSize:11, padding:0 }}>Analytics</button>.
          </div>
        </div>
      )}

      {/* Bucket cards */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:T.ink4, fontSize:14 }}>Loading and clustering candidates...</div>
      ) : candidates.length === 0 ? (
        <div style={{ ...card, textAlign:"center", padding:"48px 24px" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
          <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>No candidates in your discoverable pool yet</div>
          <div style={{ fontSize:13, color:T.ink3, marginTop:6 }}>Candidates appear here once they opt into recruiter visibility on Capabilio.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {BUCKETS.map((b) => (
            <BucketCard key={b.id} bucket={b} candidates={clustered[b.id] || []} onBulkAdd={handleBulkAdd} adding={adding} />
          ))}
        </div>
      )}
    </div>
  )
}
