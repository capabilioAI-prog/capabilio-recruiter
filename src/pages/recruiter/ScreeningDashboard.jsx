import { useState, useEffect } from "react"
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"


const BACKEND = "https://capabilio-backend-production-60ab.up.railway.app/api"

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreColor = (s) => s >= 75 ? "#1A7A4A" : s >= 50 ? "#f59e0b" : "#ef4444"
const scoreBg    = (s) => s >= 75 ? "rgba(34,197,94,0.1)" : s >= 50 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)"
const stageColor = { shortlisted:"#1A7A4A", auto_rejected:"#ef4444", pending_manual_review:"#f59e0b", interview:"#3D4EAC", hired:"#00f5c4" }

// ── Screening Stats Card ──────────────────────────────────────────────────────
function ScreeningStatsCard({ jobId }) {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading]= useState(true)

  useEffect(() => {
    if (!jobId) return
    fetch(`${BACKEND}/screening-stats/${jobId}`)
      .then(r => r.json())
      .then(s => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [jobId])

  if (loading) return (
    <div style={{ background:"#F6F6F1", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20, marginBottom:20 }}>
      <div style={{ height:80, display:"flex", alignItems:"center", justifyContent:"center", color:"#E8E8E1", fontSize:13 }}>Loading screening stats…</div>
    </div>
  )
  if (!stats) return null

  return (
    <div style={{ background:"#F6F6F1", border:"1px solid rgba(61,78,172,0.2)", borderRadius:16, padding:20, marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#3D4EAC", letterSpacing:"0.08em", marginBottom:14 }}>🤖 AI SCREENING RESULTS</div>

      {/* Main stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        {[
          { label:"Total Applied",     value:stats.total,          color:"#1A1A18" },
          { label:"Passed Screening",  value:`${stats.passed} (${stats.passRate}%)`,   color:"#1A7A4A" },
          { label:"Auto-Rejected",     value:`${stats.autoRejected} (${stats.rejectRate}%)`, color:"#ef4444" },
          { label:"Feedback Sent",     value:stats.feedbackSent,   color:"#3D4EAC" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#E8E8E1", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pass rate bar */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#3A3A38", marginBottom:6 }}>
          <span>Pass rate</span>
          <span>Avg score of passed: <strong style={{ color:"#1A7A4A" }}>{stats.avgScorePassed}/100</strong></span>
        </div>
        <div style={{ height:8, background:"rgba(26,26,24,0.06)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${stats.passRate}%`, background:"linear-gradient(90deg,#22c55e,#16a34a)", borderRadius:4, transition:"width 0.6s ease" }} />
        </div>
      </div>

      {/* Score distribution */}
      {stats.scoreDistribution && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:"#3A3A38", marginBottom:8 }}>Score distribution</div>
          <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:40 }}>
            {Object.entries(stats.scoreDistribution).map(([range, count]) => {
              const maxVal = Math.max(...Object.values(stats.scoreDistribution), 1)
              const pct    = (count / maxVal) * 100
              const isGood = range.startsWith("9") || range.startsWith("75")
              return (
                <div key={range} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ width:"100%", height:`${Math.max(pct,4)}%`, background: isGood?"#1A7A4A":range.startsWith("65")?"#f59e0b":"#ef4444", borderRadius:"3px 3px 0 0", opacity:0.8 }} />
                  <div style={{ fontSize:9, color:"#EFEFE9", whiteSpace:"nowrap" }}>{range}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top missing skills */}
      {stats.topMissingSkills?.length > 0 && (
        <div>
          <div style={{ fontSize:11, color:"#3A3A38", marginBottom:8 }}>Top missing skills across rejected candidates</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {stats.topMissingSkills.map(({ skill, count }) => (
              <div key={skill} style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:20, padding:"3px 10px", fontSize:11, color:"#fca5a5" }}>
                {skill} <span style={{ color:"#ef4444", fontWeight:700 }}>×{count}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:"#E8E8E1", marginTop:8 }}>
            💡 If many candidates are missing the same skill, consider whether your JD requirements are too strict.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Candidate Row ─────────────────────────────────────────────────────────────
function CandidateRow({ candidate, onOverride, onStageChange, onViewDetails }) {
  const [overriding, setOverriding] = useState(false)
  const s = candidate.matchScore || 0

  async function handleOverride() {
    setOverriding(true)
    try {
      await fetch(`${BACKEND}/candidates/${candidate.id}/override`, {
        method: "PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ recruiterId: "manual" })
      })
      onOverride?.(candidate.id)
    } catch (e) { console.error(e) }
    setOverriding(false)
  }

  return (
    <div style={{ background:"#F6F6F1", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
      {/* Score badge */}
      <div style={{ minWidth:52, height:52, borderRadius:12, background:scoreBg(s), border:`1px solid ${scoreColor(s)}40`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", flexShrink:0 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:scoreColor(s) }}>{s}</div>
        <div style={{ fontSize:8, color:"#E8E8E1", fontWeight:600 }}>SCORE</div>
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:140 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#1A1A18", marginBottom:2 }}>{candidate.name}</div>
        <div style={{ fontSize:11, color:"#3A3A38" }}>{candidate.email}</div>
        {candidate.parsedData?.current_role && (
          <div style={{ fontSize:11, color:"#E8E8E1", marginTop:2 }}>{candidate.parsedData.current_role}</div>
        )}
      </div>

      {/* Matched skills */}
      <div style={{ flex:2, minWidth:200 }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {(candidate.matchingData?.skills_matched || []).slice(0,4).map(s => (
            <span key={s} style={{ fontSize:10, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", color:"#1A7A4A", padding:"2px 8px", borderRadius:20 }}>{s}</span>
          ))}
          {(candidate.matchingData?.skills_missing || []).slice(0,3).map(s => (
            <span key={s} style={{ fontSize:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", color:"#fca5a5", padding:"2px 8px", borderRadius:20 }}>✕ {s}</span>
          ))}
        </div>
      </div>

      {/* ELO badge */}
      {candidate.eloScore && (
        <div style={{ background:"rgba(61,78,172,0.1)", border:"1px solid rgba(61,78,172,0.2)", borderRadius:8, padding:"4px 10px", textAlign:"center", flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#a5b4fc" }}>{candidate.eloScore}</div>
          <div style={{ fontSize:9, color:"#3D4EAC" }}>ELO</div>
        </div>
      )}

      {/* Stage */}
      <div style={{ flexShrink:0 }}>
        <span style={{ fontSize:11, fontWeight:700, color: stageColor[candidate.stage] || "#3A3A38", background:`${stageColor[candidate.stage] || "#3A3A38"}15`, border:`1px solid ${stageColor[candidate.stage] || "#3A3A38"}30`, padding:"3px 10px", borderRadius:20 }}>
          {candidate.stage?.replace(/_/g," ")}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
        <button onClick={() => onViewDetails?.(candidate)} style={{ padding:"5px 12px", background:"rgba(61,78,172,0.1)", border:"1px solid rgba(61,78,172,0.2)", borderRadius:8, color:"#a5b4fc", fontSize:11, fontWeight:600, cursor:"pointer" }}>
          View
        </button>
        {candidate.stage === "auto_rejected" && (
          <button onClick={handleOverride} disabled={overriding} style={{ padding:"5px 12px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:8, color:"#fbbf24", fontSize:11, fontWeight:600, cursor:"pointer" }}>
            {overriding ? "…" : "Override →"}
          </button>
        )}
        {candidate.resumeUrl && (
          <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ padding:"5px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, color:"#3A3A38", fontSize:11, textDecoration:"none" }}>
            PDF
          </a>
        )}
      </div>
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function CandidateDetailModal({ candidate, onClose }) {
  if (!candidate) return null
  const sd = candidate.screeningDecision || {}
  const md = candidate.matchingData || {}
  const pd = candidate.parsedData || {}
  const as = candidate.advancedSignals || {}

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(26,26,24,0.07)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#F6F6F1", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:28, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", fontFamily:"'DM Sans',sans-serif" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"#1A1A18" }}>{candidate.name}</div>
            <div style={{ fontSize:13, color:"#3A3A38" }}>{candidate.email} · {pd.current_role || "Candidate"}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ textAlign:"center", background:scoreBg(candidate.matchScore||0), border:`1px solid ${scoreColor(candidate.matchScore||0)}40`, borderRadius:10, padding:"8px 14px" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:scoreColor(candidate.matchScore||0) }}>{candidate.matchScore}</div>
              <div style={{ fontSize:10, color:"#E8E8E1" }}>Match Score</div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(26,26,24,0.06)", border:"none", color:"#6B6B68", width:32, height:32, borderRadius:8, cursor:"pointer" }}>✕</button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

          {/* Strengths */}
          {sd.strengths?.length > 0 && (
            <div style={{ gridColumn:"1/-1", background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#1A7A4A", marginBottom:8 }}>✅ STRENGTHS</div>
              {sd.strengths.map((s,i) => <div key={i} style={{ fontSize:12, color:"#6B6B68", marginBottom:4 }}>• {s}</div>)}
            </div>
          )}

          {/* Specific gaps */}
          {sd.specific_gaps?.length > 0 && (
            <div style={{ gridColumn:"1/-1", background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", marginBottom:8 }}>⚠️ SPECIFIC GAPS</div>
              {sd.specific_gaps.map((g,i) => (
                <div key={i} style={{ fontSize:12, color:"#6B6B68", marginBottom:6, paddingBottom:6, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color:"#f87171", fontWeight:600 }}>{g.area}</span>: Expected {g.expected}, Found {g.found} — {g.gap}
                </div>
              ))}
            </div>
          )}

          {/* Skills matched */}
          <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#3A3A38", marginBottom:8 }}>SKILLS MATCHED</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {(md.skills_matched||[]).map(s => <span key={s} style={{ fontSize:11, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", color:"#1A7A4A", padding:"2px 8px", borderRadius:20 }}>{s}</span>)}
              {md.skills_matched?.length === 0 && <span style={{ fontSize:12, color:"#EFEFE9" }}>None matched</span>}
            </div>
          </div>

          {/* Skills missing */}
          <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#3A3A38", marginBottom:8 }}>SKILLS MISSING</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {(md.skills_missing||[]).map(s => <span key={s} style={{ fontSize:11, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", color:"#fca5a5", padding:"2px 8px", borderRadius:20 }}>{s}</span>)}
              {md.skills_missing?.length === 0 && <span style={{ fontSize:12, color:"#EFEFE9" }}>No gaps found</span>}
            </div>
          </div>

          {/* Advanced signals */}
          {Object.keys(as).length > 0 && (
            <div style={{ gridColumn:"1/-1", background:"rgba(61,78,172,0.05)", border:"1px solid rgba(61,78,172,0.15)", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#3D4EAC", marginBottom:10 }}>🧠 ADVANCED AI SIGNALS</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {[
                  { label:"Career Progression", value:as.career_progression, good: as.career_progression==="ascending" },
                  { label:"Job Hopping Risk",   value:as.job_hopping_risk,   good: as.job_hopping_risk==="low" },
                  { label:"Churn Risk",         value:as.predicted_churn_risk, good: as.predicted_churn_risk==="low" },
                  { label:"Resume Quality",     value:`${as.resume_quality_score}/100`, good: (as.resume_quality_score||0)>=70 },
                  { label:"Avg Tenure",         value:as.tenure_avg_months ? `${as.tenure_avg_months}mo` : "—", good: (as.tenure_avg_months||0)>=18 },
                  { label:"Est. Salary",        value:as.estimated_salary_range || "—", good: true },
                ].map(item => (
                  <div key={item.label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:"#E8E8E1", marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontSize:12, fontWeight:600, color: item.good?"#1A7A4A":"#f59e0b", textTransform:"capitalize" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {as.fraud_signals?.length > 0 && (
                <div style={{ marginTop:10, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:8, padding:"8px 12px" }}>
                  <div style={{ fontSize:11, color:"#ef4444", fontWeight:600, marginBottom:4 }}>🚨 Fraud Signals Detected</div>
                  {as.fraud_signals.map((s,i) => <div key={i} style={{ fontSize:11, color:"#fca5a5" }}>• {s}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Improvement suggestions */}
          {sd.improvement_suggestions?.length > 0 && (
            <div style={{ gridColumn:"1/-1", background:"rgba(255,255,255,0.02)", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#3A3A38", marginBottom:8 }}>💡 AI IMPROVEMENT SUGGESTIONS</div>
              {sd.improvement_suggestions.map((s,i) => <div key={i} style={{ fontSize:12, color:"#6B6B68", marginBottom:4 }}>• {s}</div>)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          {candidate.resumeUrl && (
            <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:"10px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#6B6B68", fontSize:13, fontWeight:600, textAlign:"center", textDecoration:"none" }}>
              📄 View Resume PDF
            </a>
          )}
          <button onClick={onClose} style={{ flex:1, padding:"10px", background:"linear-gradient(135deg,#3D4EAC,#8b5cf6)", border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function ScreeningDashboard({ jobId, jobTitle }) {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState("screened") // screened | rejected | manual
  const [selected,   setSelected]   = useState(null) // for detail modal
  const [bulkSending,setBulkSending]= useState(false)
  const [bulkResult, setBulkResult] = useState(null)

  useEffect(() => {
    if (!jobId) return
    setLoading(true)
    const unsub = onSnapshot(
      query(collection(db, "candidates"), where("jobId", "==", jobId), orderBy("createdAt", "desc")),
      snap => {
        setCandidates(snap.docs.map(d => ({ id:d.id, ...d.data() })))
        setLoading(false)
      }
    )
    return unsub
  }, [jobId])

  async function handleBulkFeedback() {
    setBulkSending(true)
    try {
      const res = await fetch(`${BACKEND}/feedback/bulk-send`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ jobId })
      })
      const data = await res.json()
      setBulkResult(data)
    } catch(e) { console.error(e) }
    setBulkSending(false)
  }

  function handleOverride(id) {
    setCandidates(prev => prev.map(c => c.id===id ? {...c, stage:"shortlisted", overridden:true} : c))
  }

  const screened = candidates.filter(c => c.stage !== "auto_rejected" && c.stage !== "pending_manual_review")
  const rejected = candidates.filter(c => c.stage === "auto_rejected")
  const manual   = candidates.filter(c => c.stage === "pending_manual_review")

  const tabs = [
    { id:"screened", label:`✅ Screened In (${screened.length})` },
    { id:"rejected", label:`❌ Auto-Rejected (${rejected.length})` },
    { id:"manual",   label:`🔍 Manual Review (${manual.length})` },
  ]

  const displayed = activeTab==="screened" ? screened : activeTab==="rejected" ? rejected : manual

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:"#1A1A18" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"#1A1A18", margin:0 }}>
            AI Screening — {jobTitle || "Job"}
          </h2>
          <p style={{ fontSize:13, color:"#3A3A38", margin:"4px 0 0" }}>
            6-layer AI pipeline: quality → parse → match → fraud → threshold → advanced signals
          </p>
        </div>
        {rejected.filter(c => !c.feedbackSent).length > 0 && (
          <button onClick={handleBulkFeedback} disabled={bulkSending} style={{ padding:"9px 18px", background: bulkSending?"rgba(61,78,172,0.3)":"linear-gradient(135deg,#3D4EAC,#8b5cf6)", border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {bulkSending ? "Sending…" : `📧 Send Bulk Feedback (${rejected.filter(c=>!c.feedbackSent).length})`}
          </button>
        )}
      </div>

      {/* Bulk result */}
      {bulkResult && (
        <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:12, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#1A7A4A" }}>
          ✅ Sent {bulkResult.sent} emails · {bulkResult.failed} failed · {bulkResult.total} total
          <button onClick={() => setBulkResult(null)} style={{ marginLeft:12, background:"none", border:"none", color:"#3A3A38", cursor:"pointer", fontSize:12 }}>dismiss</button>
        </div>
      )}

      {/* Stats card */}
      <ScreeningStatsCard jobId={jobId} />

      {/* Tabs */}
      <div style={{ display:"flex", background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:4, marginBottom:16, gap:4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex:1, padding:"8px 12px", background: activeTab===t.id?"rgba(61,78,172,0.15)":"transparent", border: activeTab===t.id?"1px solid rgba(61,78,172,0.3)":"1px solid transparent", borderRadius:8, color: activeTab===t.id?"#a5b4fc":"#3A3A38", fontSize:12, fontWeight: activeTab===t.id?700:400, cursor:"pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Rejected tab notice */}
      {activeTab === "rejected" && rejected.length > 0 && (
        <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#fbbf24" }}>
          💡 These candidates were auto-rejected by the AI. You can click <strong>Override →</strong> on any to manually bring them into the pipeline.
        </div>
      )}

      {/* Candidate list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#E8E8E1" }}>
          <div style={{ width:28, height:28, border:"2px solid rgba(61,78,172,0.2)", borderTopColor:"#3D4EAC", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
          Loading candidates…
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#EFEFE9" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>
            {activeTab==="screened" ? "🎯" : activeTab==="rejected" ? "✅" : "🔍"}
          </div>
          <div style={{ fontSize:14, color:"#E8E8E1" }}>
            {activeTab==="screened" ? "No candidates have passed screening yet" :
             activeTab==="rejected" ? "No auto-rejected candidates" :
             "No candidates pending manual review"}
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {displayed.map(c => (
            <CandidateRow
              key={c.id}
              candidate={c}
              onOverride={handleOverride}
              onViewDetails={setSelected}
            />
          ))}
        </div>
      )}

      {selected && <CandidateDetailModal candidate={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}