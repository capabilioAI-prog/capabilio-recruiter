import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, card, cardLg, tag, btn } from "./theme"

// 2026-08-09: this page used to read a Firebase Firestore `users` collection
// -- a frozen pre-Supabase-migration snapshot, disconnected from real
// current candidates (that's why old/test accounts like "venkata-kopuri"
// showed up alongside real ones with no way to tell them apart). The
// segment counts and "Reactivation Queue" were also hardcoded literals
// behind an IS_DEMO_DATA flag, not live data at all.
//
// This pass makes ONE segment real: "Strong but Not Selected" is now built
// from this company's actual `applications` rows (status='rejected' AND
// score >= STRONG_SCORE_THRESHOLD, same "Strong" cutoff ApplicationsView's
// ScoreBadge already uses elsewhere in this app, so the definition of
// "strong" is consistent across the product). The other three segments
// (Warm Pipeline, Future Talent, Reactivated) have no real backing feature
// yet -- no "expressed interest" tracking, no automated learning-plan
// system, no role-rematch engine exist anywhere in this codebase. Rather
// than fabricate numbers for them (the project's own no-fake-data rule),
// they now show an honest "not built yet" state instead of literals.
const STRONG_SCORE_THRESHOLD = 75

const SEGMENTS = [
  { id:"strong_not_selected", label:"💎 Strong but Not Selected", color:T.amber,  desc:"High-scoring applicants your team rejected. Keep warm for future roles.", implemented:true },
  { id:"warm_pipeline",       label:"🔥 Warm Pipeline",           color:T.amber,  desc:"Expressed interest, contacted, not yet applied to an active role.",       implemented:false },
  { id:"future_talent",       label:"🌱 Future Talent",           color:T.green,  desc:"Strong potential, currently underqualified. Assigned learning plans.",    implemented:false },
  { id:"reactivated",         label:"♻️ Reactivated",             color:T.indigo, desc:"Role match detected. System re-engaged them for a new opening.",         implemented:false },
]

function WarmthBar({ level }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ flex:1, height:5, background:T.cream3, borderRadius:3 }}>
        <div style={{ height:"100%", width:`${level}%`, background:T.amber, borderRadius:3, transition:"width 1s ease" }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color:T.amber, minWidth:32 }}>{level}%</span>
    </div>
  )
}

// Real candidate card for the one implemented segment -- built from an
// `applications` row (+ its job title, + capabilio_profile_data if the
// applicant's capabilio_username was resolved to a real verified profile,
// see apply.js's tryResolveCapabilioProfile()), never from fabricated data.
function PoolCard({ app }) {
  const navigate = useNavigate()
  const initials = (app.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const verified = app.capabilio_profile_verified && app.capabilio_profile_data
  const elo = verified ? (app.capabilio_profile_data.elo ?? app.capabilio_profile_data.role_elo ?? app.capabilio_profile_data.professional_elo) : null
  const skills = Array.isArray(app.matched_skills) ? app.matched_skills.slice(0, 4) : []

  return (
    <div className="cap-card" style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:16, display:"flex", flexDirection:"column", gap:10, position:"relative", transition:"all 0.2s", boxShadow:T.shadow }}>
      <div style={{ position:"absolute", top:12, right:12, fontSize:10, fontWeight:700, color:T.amber, background:`${T.amber}15`, border:`1px solid ${T.amber}30`, borderRadius:6, padding:"2px 8px" }}>
        Score {app.score}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:`${T.indigo}18`, border:`1.5px solid ${T.indigo}44`, color:T.indigo, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:15, flexShrink:0 }}>
          {initials}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{app.name || "—"}</div>
          <div style={{ fontSize:11, color:T.ink3 }}>{app.jobTitle || "—"}{verified && elo != null ? ` · ✓ Verified · ELO ${elo}` : ""}</div>
        </div>
      </div>

      {skills.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {skills.map((s) => (
            <span key={s} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:T.cream3, color:T.ink2, border:`1px solid ${T.border}` }}>{s}</span>
          ))}
        </div>
      )}

      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
          <span style={{ fontSize:10, color:T.ink3 }}>ATS Score</span>
          <span style={{ fontSize:10, fontWeight:700, color:T.amber }}>{app.score}%</span>
        </div>
        <WarmthBar level={Math.min(100, Math.max(0, app.score || 0))} />
      </div>

      <div style={{ display:"flex", gap:6 }}>
        {verified && (
          <button onClick={() => navigate(`/recruiter/candidates/${app.capabilio_profile_data.id}`)}
            style={{ flex:1, padding:"6px 0", background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:8, color:T.indigo, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
            Verified Profile
          </button>
        )}
        <button onClick={() => navigate("/recruiter/applications")}
          style={{ flex:1, padding:"6px 0", background:`${T.amber}10`, border:`1px solid ${T.amber}25`, borderRadius:8, color:T.amber, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
          View Application →
        </button>
      </div>
    </div>
  )
}

// Honest placeholder for a not-yet-built segment -- explains what real
// feature/data source is missing instead of showing a fabricated count.
function NotBuiltYet({ segment }) {
  const need = {
    warm_pipeline: "This needs a real 'expressed interest' tracker (a candidate messaging a company, or self-nominating, before formally applying) -- that data doesn't exist anywhere in this product yet.",
    future_talent: "This needs a real automated learning-plan feature (Arena task assignment, certification tracking tied to a specific skill gap) -- not built yet.",
    reactivated:   "This needs a real role-rematch engine (detecting when a new job opening matches a previously-rejected candidate and auto-notifying them) -- not built yet.",
  }[segment.id]
  return (
    <div style={{ textAlign:"center", padding:"50px 20px", background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, boxShadow:T.shadow }}>
      <div style={{ fontSize:36, marginBottom:12 }}>🚧</div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, color:T.ink }}>Not built yet</div>
      <div style={{ fontSize:13, color:T.ink4, marginTop:6, maxWidth:440, marginLeft:"auto", marginRight:"auto", lineHeight:1.5 }}>{need}</div>
    </div>
  )
}

export default function TalentPool() {
  const [strongApps, setStrongApps] = useState([])
  const [loading,     setLoading]   = useState(true)
  const [error,       setError]     = useState("")
  const [activeTab,   setActiveTab] = useState("strong_not_selected")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        // RLS scopes this to the logged-in recruiter's own company, same as
        // every other direct-Supabase query in this app (ApplicationsView,
        // etc.) -- no company_id filter is added client-side because RLS is
        // the actual boundary, not a client-side eq() call.
        const { data: apps, error: appsErr } = await supabase
          .from("applications")
          .select("id, job_id, name, score, matched_skills, ats_summary, capabilio_profile_verified, capabilio_profile_data, created_at")
          .eq("status", "rejected")
          .gte("score", STRONG_SCORE_THRESHOLD)
          .order("score", { ascending: false })
          .limit(100)
        if (appsErr) throw appsErr

        const jobIds = [...new Set((apps || []).map((a) => a.job_id).filter(Boolean))]
        let jobsById = {}
        if (jobIds.length > 0) {
          const { data: jobs, error: jobsErr } = await supabase.from("jobs").select("id, title").in("id", jobIds)
          if (jobsErr) throw jobsErr
          jobsById = Object.fromEntries((jobs || []).map((j) => [j.id, j.title]))
        }

        if (!cancelled) {
          setStrongApps((apps || []).map((a) => ({ ...a, jobTitle: jobsById[a.job_id] || "—" })))
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load the talent pool.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const countFor = (segmentId) => (segmentId === "strong_not_selected" ? strongApps.length : null) // null = "not tracked yet", not a real zero

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Hero */}
      <div style={{ background:T.amber2, border:`1px solid ${T.amber}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>🌱 Talent Pool · Never Lose a Good Candidate Again</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          <strong style={{ color:T.amber }}>"Strong but Not Selected"</strong> candidates stay visible here so you can revisit them for future roles instead of losing track after a rejection.
        </div>
      </div>

      {error && (
        <div style={{ background:T.red2, border:`1px solid ${T.red}30`, borderRadius:12, padding:"12px 16px", fontSize:12, color:T.red, fontWeight:600 }}>
          ⚠ {error}
        </div>
      )}

      {/* Summary stats / segment tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {SEGMENTS.map((s) => {
          const count = countFor(s.id)
          return (
            <div key={s.id}
              onClick={() => setActiveTab(s.id)}
              style={{ background:T.cream, border:`1px solid ${activeTab === s.id ? s.color : T.border}`, borderRadius:16, padding:"18px 16px", cursor:"pointer", transition:"all 0.2s", boxShadow: activeTab === s.id ? T.shadow2 : T.shadow, outline: activeTab === s.id ? `2px solid ${s.color}40` : "none", opacity: s.implemented ? 1 : 0.75 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:28, fontWeight:800, color:s.color }}>
                {loading && s.implemented ? "—" : count === null ? "—" : count}
              </div>
              <div style={{ fontSize:12, color:T.ink, fontWeight:600, marginTop:4 }}>{s.label}</div>
              <div style={{ fontSize:11, color:T.ink4, marginTop:4, lineHeight:1.4 }}>{s.desc}</div>
              {!s.implemented && <div style={{ fontSize:10, color:T.ink4, marginTop:6, fontStyle:"italic" }}>Not built yet</div>}
            </div>
          )
        })}
      </div>

      {/* "Strong but Not Selected" — how it works */}
      {activeTab === "strong_not_selected" && (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h2 style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.amber, margin:"0 0 8px" }}>💎 How This Works Today</h2>
          <div style={{ fontSize:12, color:T.ink3, marginBottom:16, lineHeight:1.5 }}>
            Step 1 below is real and live for every candidate shown on this page. Steps 2–4 describe the planned automation (learning plans, warmth tracking, auto-reactivation) — not yet built, so they don't run for these candidates yet.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { step:"1", title:"Candidate Rejected",      desc:"Recruiter rejects a strong applicant. They appear here automatically, scoped to your company.", icon:"📬", live:true },
              { step:"2", title:"Auto Learning Plan",       desc:"Planned: system would assign Arena tasks, certifications, mentor sessions based on gap.",       icon:"📚", live:false },
              { step:"3", title:"Stay Warm",               desc:"Planned: candidate receives progress updates and a tracked warmth score.",                      icon:"🔥", live:false },
              { step:"4", title:"Role Match → Reactivate", desc:"Planned: auto-notify and move to a Reactivated pool when a matching role opens.",                icon:"♻️",  live:false },
            ].map((step) => (
              <div key={step.step} style={{ padding:"14px", background:T.amber2, border:`1px solid ${T.amber}15`, borderRadius:12, opacity: step.live ? 1 : 0.65 }}>
                <div style={{ fontSize:24 }}>{step.icon}</div>
                <div style={{ fontSize:11, color:T.amber, fontWeight:700, marginTop:6 }}>Step {step.step}: {step.title}{!step.live && " (planned)"}</div>
                <div style={{ fontSize:11, color:T.ink3, marginTop:4, lineHeight:1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate cards grid / not-built-yet state */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.ink }}>
            {SEGMENTS.find((s) => s.id === activeTab)?.label} — {activeTab === "strong_not_selected" ? (loading ? "..." : `${strongApps.length} candidates`) : "not available"}
          </div>
          {activeTab === "strong_not_selected" && (
            <div style={{ display:"flex", gap:8 }}>
              <button title="Not built yet" disabled style={{ fontSize:12, padding:"6px 12px", background:T.cream3, border:`1px solid ${T.border}`, borderRadius:8, color:T.ink4, cursor:"not-allowed", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                📬 Bulk Nurture
              </button>
              <button title="Not built yet" disabled style={{ fontSize:12, padding:"6px 12px", background:T.cream3, border:`1px solid ${T.border}`, borderRadius:8, color:T.ink4, cursor:"not-allowed", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                ↓ Export Pool
              </button>
            </div>
          )}
        </div>

        {activeTab !== "strong_not_selected" ? (
          <NotBuiltYet segment={SEGMENTS.find((s) => s.id === activeTab)} />
        ) : loading ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:T.ink4 }}>Loading talent pool...</div>
        ) : strongApps.length === 0 ? (
          <div style={{ textAlign:"center", padding:"50px 20px", background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, boxShadow:T.shadow }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🌱</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, color:T.ink }}>No candidates in this pool yet</div>
            <div style={{ fontSize:13, color:T.ink4, marginTop:6 }}>Strong applicants (score ≥ {STRONG_SCORE_THRESHOLD}) you reject will appear here automatically.</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {strongApps.map((app) => (
              <PoolCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
