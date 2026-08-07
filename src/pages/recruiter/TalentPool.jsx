import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




const SEGMENTS = [
  { id:"strong_not_selected", label:"💎 Strong but Not Selected", color:T.amber,  desc:"High ELO, good Arena scores, missed this cycle. Keep warm for future roles." },
  { id:"warm_pipeline",       label:"🔥 Warm Pipeline",           color:T.amber,  desc:"Expressed interest, contacted, not yet applied to an active role." },
  { id:"future_talent",       label:"🌱 Future Talent",           color:T.green,  desc:"Strong potential, currently underqualified. Assigned learning plans." },
  { id:"reactivated",         label:"♻️ Reactivated",             color:T.indigo, desc:"Role match detected. System re-engaged them for a new opening." },
]

function segmentCandidate(c) {
  const elo   = c.eloRating || 800
  const arena = c.arenaCompleted || 0
  if (elo >= 980 && arena >= 2) return "strong_not_selected"
  if (elo >= 920)               return "warm_pipeline"
  if (elo >= 860)               return "future_talent"
  return "reactivated"
}

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

function PoolCard({ c, segment }) {
  const navigate   = useNavigate()
  const col = c.keyword?.toLowerCase().includes("medical") ? T.green
    : c.keyword?.toLowerCase().includes("software") ? T.indigo
    : c.keyword?.toLowerCase().includes("data") ? T.blue : T.indigo2
  const initials   = (c.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)
  const warmth     = Math.min(100, Math.round((c.eloRating || 800) / 12.5))
  const matchScore = Math.min(99, Math.round((c.eloRating || 800) / 13 + (c.jobReadiness || 0) * 0.2))
  const seg        = SEGMENTS.find((s) => s.id === segment)

  return (
    <div className="cap-card" style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:16, display:"flex", flexDirection:"column", gap:10, position:"relative", transition:"all 0.2s", boxShadow:T.shadow }}>
      {/* Segment tag */}
      <div style={{ position:"absolute", top:12, right:12, fontSize:10, fontWeight:700, color:seg?.color, background:`${seg?.color}15`, border:`1px solid ${seg?.color}30`, borderRadius:6, padding:"2px 8px" }}>
        {seg?.label.split(" ").slice(0,2).join(" ")}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:`${col}18`, border:`1.5px solid ${col}44`, color:col, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:15, flexShrink:0 }}>
          {initials}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.displayName || "—"}</div>
          <div style={{ fontSize:11, color:col }}>◆ {c.keyword || "General"} · ⚡{c.eloRating || 800}</div>
        </div>
      </div>

      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
          <span style={{ fontSize:10, color:T.ink3 }}>Warmth Score</span>
          <span style={{ fontSize:10, fontWeight:700, color:seg?.color }}>{matchScore}% role match</span>
        </div>
        <WarmthBar level={warmth} />
      </div>

      {segment === "strong_not_selected" && (
        <div style={{ padding:"7px 10px", background:T.amber2, border:`1px solid ${T.amber}20`, borderRadius:8 }}>
          <div style={{ fontSize:10, color:T.amber, fontWeight:600 }}>📚 Auto Learning Plan Active</div>
          <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>3 Arena tasks · 1 certification path · 2 mentor sessions</div>
        </div>
      )}

      {segment === "reactivated" && (
        <div style={{ padding:"7px 10px", background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:8 }}>
          <div style={{ fontSize:10, color:T.indigo, fontWeight:600 }}>♻️ Re-engaged for: Senior Data Analyst</div>
          <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>Role match score: {matchScore}% · Notified 2d ago</div>
        </div>
      )}

      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => navigate(`/recruiter/candidate/${c.uid}`)}
          style={{ flex:1, padding:"6px 0", background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:8, color:T.indigo, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
          View Profile
        </button>
        <button onClick={() => navigate("/recruiter/pipeline")}
          style={{ padding:"6px 10px", background:`${seg?.color || T.green}10`, border:`1px solid ${seg?.color || T.green}25`, borderRadius:8, color:seg?.color || T.green, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
          Move to Role →
        </button>
      </div>
    </div>
  )
}

// 2026-08-06: FLAGGED, NOT FIXED IN THIS PASS. This page reads from a
// Firebase `users` collection that is disconnected from both this app's
// Supabase project ("Capabilio Recruiter") AND capabilio-web's real
// candidate/employment data. The "Reactivation Queue" numbers below
// (matched counts, avgScore, "opened Xd ago") are hardcoded literals, not
// live data — see the array a few dozen lines down. Building this into a
// real segmentation + reactivation engine (backend logic, real learning-plan
// integration, real role-match detection) is a bigger project than the
// specific fixes approved in this pass (employment-status visibility,
// offer-draft, rejection-workflow) — flagging honestly here rather than
// quietly shipping fabricated numbers as if they were live, or attempting an
// unverified rebuild in the same change as the safety-critical visibility
// fix above it.
const IS_DEMO_DATA = true

export default function TalentPool() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState("strong_not_selected")

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => setCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const segmented = SEGMENTS.reduce((acc, s) => {
    acc[s.id] = candidates.filter((c) => segmentCandidate(c) === s.id)
    return acc
  }, {})

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Hero */}
      <div style={{ background:T.amber2, border:`1px solid ${T.amber}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>🌱 Talent Pool · Never Lose a Good Candidate Again</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          <strong style={{ color:T.amber }}>"Strong but Not Selected"</strong> candidates stay warm with automated learning plans, get reactivated when a matching role opens, and are never ghosted. Reduces future sourcing time by up to 60%.
        </div>
      </div>

      {IS_DEMO_DATA && (
        <div style={{ background:T.red2, border:`1px solid ${T.red}30`, borderRadius:12, padding:"12px 16px", fontSize:12, color:T.red, fontWeight:600 }}>
          ⚠ Preview data — this page isn't connected to your real candidate pipeline yet. Segment counts and the Reactivation Queue below are illustrative, not live numbers.
        </div>
      )}

      {/* Summary stats / segment tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {SEGMENTS.map((s) => (
          <div key={s.id}
            onClick={() => setActiveTab(s.id)}
            style={{ background:T.cream, border:`1px solid ${activeTab === s.id ? s.color : T.border}`, borderRadius:16, padding:"18px 16px", cursor:"pointer", transition:"all 0.2s", boxShadow: activeTab === s.id ? T.shadow2 : T.shadow, outline: activeTab === s.id ? `2px solid ${s.color}40` : "none" }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:28, fontWeight:800, color:s.color }}>{loading ? "—" : segmented[s.id]?.length || 0}</div>
            <div style={{ fontSize:12, color:T.ink, fontWeight:600, marginTop:4 }}>{s.label}</div>
            <div style={{ fontSize:11, color:T.ink4, marginTop:4, lineHeight:1.4 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* "Strong but Not Selected" — how it works */}
      {activeTab === "strong_not_selected" && (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h2 style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.amber, margin:"0 0 16px" }}>💎 How Strong-but-Not-Selected Works</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { step:"1", title:"Candidate Rejected",      desc:"AI generates personalised rejection with strengths and gap analysis. No ghosting.",              icon:"📬" },
              { step:"2", title:"Auto Learning Plan",       desc:"System assigns Arena tasks, certifications, mentor sessions, and simulations based on gap.",    icon:"📚" },
              { step:"3", title:"Stay Warm",               desc:"Candidate receives progress updates and Capabilio learning path. Warmth score is tracked.",       icon:"🔥" },
              { step:"4", title:"Role Match → Reactivate", desc:"When a matching role opens, candidate is auto-notified and moved to Reactivated pool instantly.", icon:"♻️"  },
            ].map((step) => (
              <div key={step.step} style={{ padding:"14px", background:T.amber2, border:`1px solid ${T.amber}15`, borderRadius:12 }}>
                <div style={{ fontSize:24 }}>{step.icon}</div>
                <div style={{ fontSize:11, color:T.amber, fontWeight:700, marginTop:6 }}>Step {step.step}: {step.title}</div>
                <div style={{ fontSize:11, color:T.ink3, marginTop:4, lineHeight:1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reactivation matches */}
      {activeTab === "reactivated" && (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h2 style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.indigo, margin:"0 0 14px" }}>♻️ Reactivation Queue — New Role Matches Found</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              { role:"Senior Data Analyst", matched:7, avgScore:88, opened:"2 days ago" },
              { role:"ML Engineer",         matched:3, avgScore:92, opened:"5 days ago" },
            ].map((r) => (
              <div key={r.role} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", background:T.indigo3, border:`1px solid ${T.indigo}15`, borderRadius:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{r.role}</div>
                  <div style={{ fontSize:11, color:T.ink4 }}>Opened {r.opened}</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:800, color:T.indigo, fontFamily:"'Inter',sans-serif" }}>{r.matched}</div>
                  <div style={{ fontSize:10, color:T.ink4 }}>re-matched</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:800, color:T.green, fontFamily:"'Inter',sans-serif" }}>{r.avgScore}%</div>
                  <div style={{ fontSize:10, color:T.ink4 }}>avg match</div>
                </div>
                <button style={{ fontSize:12, padding:"6px 14px", background:T.cream, border:`1px solid ${T.indigo}25`, borderRadius:8, color:T.indigo, cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                  Review →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate cards grid */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.ink }}>
            {SEGMENTS.find((s) => s.id === activeTab)?.label} — {loading ? "..." : segmented[activeTab]?.length || 0} candidates
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ fontSize:12, padding:"6px 12px", background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:8, color:T.indigo, cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
              📬 Bulk Nurture
            </button>
            <button style={{ fontSize:12, padding:"6px 12px", background:T.green2, border:`1px solid ${T.green}20`, borderRadius:8, color:T.green, cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
              ↓ Export Pool
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:T.ink4 }}>Loading talent pool...</div>
        ) : (segmented[activeTab] || []).length === 0 ? (
          <div style={{ textAlign:"center", padding:"50px 20px", background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, boxShadow:T.shadow }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🌱</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, color:T.ink }}>No candidates in this pool yet</div>
            <div style={{ fontSize:13, color:T.ink4, marginTop:6 }}>Candidates appear here as they move through your hiring pipeline.</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {(segmented[activeTab] || []).map((c) => (
              <PoolCard key={c.uid} c={c} segment={activeTab} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
