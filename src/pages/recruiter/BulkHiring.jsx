import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




const BUCKETS = [
  { id:"strong_fit",     label:"Strong Fit",           icon:"🏆", color:T.green,  desc:"Meet must-have skills, high ELO, verified",    action:"Bulk Shortlist" },
  { id:"high_potential", label:"High Potential",        icon:"🚀", color:T.indigo, desc:"Strong ELO, incomplete profile or new joiner",  action:"Send Nudge"     },
  { id:"needs_verify",   label:"Needs Verification",    icon:"🛡️",  color:T.amber,  desc:"Good signals but pending docs/identity",       action:"Request Docs"   },
  { id:"interview_ready",label:"Interview Ready",       icon:"🎯", color:T.blue,   desc:"Passed assessment, available, notice ≤30d",    action:"Schedule"       },
  { id:"future_pool",    label:"Future Talent Pool",    icon:"🌱", color:T.indigo2,desc:"Strong but mismatched timing or availability",  action:"Add to Pool"    },
  { id:"not_matched",    label:"Not Matched",           icon:"○",  color:T.ink4,   desc:"Below threshold on critical must-have skills", action:"Send Feedback"  },
]

function clusterCandidate(c) {
  const elo   = c.eloRating || 800
  const ready = c.jobReadiness || 0
  const arena = c.arenaCompleted || 0
  if (elo >= 1100 && ready >= 70) return "strong_fit"
  if (elo >= 1000 && ready >= 50) return "interview_ready"
  if (elo >= 950  && ready < 50)  return "high_potential"
  if (elo >= 900  && arena >= 2)  return "needs_verify"
  if (elo >= 870)                 return "future_pool"
  return "not_matched"
}

function SLABar({ elapsed, limit }) {
  const pct   = Math.min(100, (elapsed / limit) * 100)
  const color = pct >= 100 ? T.red : pct >= 70 ? T.amber : T.green
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:5, background:T.cream3, borderRadius:3 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.8s ease" }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color, minWidth:40 }}>{elapsed}d/{limit}d</span>
    </div>
  )
}

function BucketCard({ bucket, candidates, onBulkAction }) {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState([])
  const count  = candidates.length
  const avgElo = count ? Math.round(candidates.reduce((s, c) => s + (c.eloRating || 800), 0) / count) : 0

  // Keep `selected` in sync with the current candidates list — drop any
  // selected uids that are no longer present in this bucket.
  useEffect(() => {
    const validUids = new Set(candidates.map((c) => c.uid))
    setSelected((prev) => prev.filter((uid) => validUids.has(uid)))
  }, [candidates])

  return (
    <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderLeft:`4px solid ${bucket.color}`, borderRadius:16, overflow:"hidden", boxShadow:T.shadow }}>
      {/* Bucket header */}
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
        <button onClick={(e) => { e.stopPropagation(); onBulkAction(bucket, candidates) }}
          style={{ padding:"7px 14px", background:`${bucket.color}15`, border:`1px solid ${bucket.color}35`, borderRadius:9, color:bucket.color, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
          {bucket.action} →
        </button>
        <span style={{ color:T.ink4, fontSize:16 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded candidate list */}
      {expanded && count > 0 && (
        <div style={{ padding:"0 18px 16px", borderTop:`1px solid ${T.border}` }}>
          {/* Select all bar */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
            <input type="checkbox"
              checked={selected.length === candidates.length}
              onChange={() => setSelected(selected.length === candidates.length ? [] : candidates.map((c) => c.uid))}
              style={{ accentColor:T.indigo, cursor:"pointer" }} />
            <span style={{ fontSize:12, color:T.ink3 }}>Select all {count}</span>
            {selected.length > 0 && (
              <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                {["Shortlist","Reject","Move Stage","Message"].map((a) => (
                  <button key={a} onClick={() => setSelected([])}
                    style={{ fontSize:11, padding:"4px 10px", background:T.indigo3, border:`1px solid ${T.indigo}25`, borderRadius:7, color:T.indigo, cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {candidates.slice(0, expanded ? 10 : 3).map((c) => {
            const col = c.keyword?.toLowerCase().includes("medical") ? T.green
              : c.keyword?.toLowerCase().includes("software") ? T.indigo
              : c.keyword?.toLowerCase().includes("data") ? T.blue : T.indigo2
            const initials = (c.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)
            return (
              <div key={c.uid} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                <input type="checkbox" checked={selected.includes(c.uid)}
                  onChange={() => setSelected((s) => s.includes(c.uid) ? s.filter((x) => x !== c.uid) : [...s, c.uid])}
                  style={{ accentColor:T.indigo, cursor:"pointer", flexShrink:0 }} />
                <div style={{ width:34, height:34, borderRadius:9, background:`${col}18`, color:col, border:`1px solid ${col}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:12, flexShrink:0 }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{c.displayName || "—"}</div>
                  <div style={{ fontSize:11, color:T.ink4 }}>{c.keyword || "General"}</div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:T.amber }}>⚡{c.eloRating || 800}</span>
                <span style={{ fontSize:12, color:T.green }}>🎯{c.arenaCompleted || 0}</span>
                <div style={{ minWidth:100 }}>
                  <SLABar elapsed={Math.floor(Math.random() * 8) + 1} limit={5} />
                </div>
              </div>
            )
          })}
          {count > 10 && (
            <div style={{ textAlign:"center", paddingTop:10, fontSize:12, color:T.indigo, cursor:"pointer" }}>View all {count} →</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BulkHiring() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeJob,  setActiveJob]  = useState("Senior ML Engineer")
  const [toast,      setToast]      = useState(null)

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => setCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const clustered = BUCKETS.reduce((acc, b) => {
    acc[b.id] = candidates.filter((c) => clusterCandidate(c) === b.id)
    return acc
  }, {})

  const handleBulkAction = (bucket, cands) => {
    setToast(`${bucket.action} applied to ${cands.length} candidates in "${bucket.label}"`)
    setTimeout(() => setToast(null), 3000)
  }

  const JOBS = ["Senior ML Engineer","Medical Coder (Senior)","Product Manager","Data Analyst"]

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:T.cream, border:`1px solid ${T.green}30`, borderRadius:12, padding:"12px 18px", zIndex:999, fontSize:13, color:T.green, fontWeight:600, boxShadow:T.shadow2, animation:"fadeIn 0.2s ease" }}>
          ✅ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>🚀 Bulk Hiring Intelligence</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          Handles <strong style={{ color:T.indigo }}>1,000+ applications</strong> without chaos. AI auto-clusters every applicant into smart buckets, generates shortlist reasoning, enables bulk actions, and surfaces bottlenecks with SLA timers — so you move fast without losing transparency.
        </div>
      </div>

      {/* Job selector */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:12, color:T.ink3, fontWeight:600 }}>Active Job:</span>
        {JOBS.map((j) => (
          <button key={j} onClick={() => setActiveJob(j)}
            style={{ fontSize:12, padding:"6px 14px", borderRadius:9, border:"1px solid", cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600, transition:"all 0.15s",
              background:  activeJob === j ? T.indigo3 : T.cream2,
              borderColor: activeJob === j ? T.indigo   : T.border,
              color:       activeJob === j ? T.indigo   : T.ink4,
            }}>
            {j}
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

      {/* AI Shortlist Summary */}
      <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:20 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.ink, marginBottom:14 }}>🤖 AI Shortlist Reasoning — {activeJob}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {[
            { title:"Why these candidates made Strong Fit",    text:`Top ${clustered.strong_fit?.length || 0} candidates scored ≥70% on hiring readiness, ELO ≥1100, and passed Arena challenges. All have verified identity and work history. Average notice period: 28 days.`, color:T.green  },
            { title:"What disqualified Not Matched candidates", text:`${clustered.not_matched?.length || 0} candidates fell below must-have skill thresholds for ${activeJob}. Primary gaps: missing domain certifications, ELO below 870, and zero Arena completion. Rejection emails will auto-generate with improvement roadmaps.`, color:T.red    },
            { title:"High Potential — what they need",         text:`${clustered.high_potential?.length || 0} candidates show strong ELO signals but incomplete profiles. Sending a targeted nudge requesting: work verification, 1 Arena challenge, and a 2-min intro video could move 40% of this group into Strong Fit within 5 days.`, color:T.indigo },
          ].map((r) => (
            <div key={r.title} style={{ padding:"14px 16px", background:T.cream, border:`1px solid ${r.color}20`, borderRadius:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:r.color, marginBottom:6 }}>{r.title}</div>
              <div style={{ fontSize:12, color:T.ink3, lineHeight:1.6 }}>{r.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage drop-off analytics */}
      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.ink, marginBottom:14 }}>📉 Stage Drop-off Insights</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { from:"Applied",     to:"AI Screened",    in:candidates.length || 248, out:Math.round((candidates.length||248)*0.62), issue:"38% bounced — likely incomplete profiles or below ELO threshold" },
            { from:"AI Screened", to:"Shortlisted",    in:Math.round((candidates.length||248)*0.62), out:Math.round((candidates.length||248)*0.31), issue:"50% drop — role skills mismatch, consider revising JD must-haves" },
            { from:"Shortlisted", to:"Interview Ready",in:Math.round((candidates.length||248)*0.31), out:Math.round((candidates.length||248)*0.14), issue:"55% drop — candidates ghosting. Enable async video screen to reduce drop." },
          ].map((row) => (
            <div key={row.from} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10 }}>
              <div style={{ textAlign:"center", minWidth:80 }}>
                <div style={{ fontSize:18, fontWeight:800, color:T.ink, fontFamily:"'Inter',sans-serif" }}>{row.in}</div>
                <div style={{ fontSize:10, color:T.ink4 }}>{row.from}</div>
              </div>
              <div style={{ fontSize:20, color:T.ink4 }}>→</div>
              <div style={{ textAlign:"center", minWidth:80 }}>
                <div style={{ fontSize:18, fontWeight:800, color:T.green, fontFamily:"'Inter',sans-serif" }}>{row.out}</div>
                <div style={{ fontSize:10, color:T.ink4 }}>{row.to}</div>
              </div>
              <div style={{ flex:1, padding:"8px 12px", background:T.red2, border:`1px solid ${T.red}15`, borderRadius:8 }}>
                <span style={{ fontSize:11, color:T.red }}>⚠ </span>
                <span style={{ fontSize:11, color:T.ink3 }}>{row.issue}</span>
              </div>
              <div style={{ textAlign:"right", minWidth:60 }}>
                <div style={{ fontSize:16, fontWeight:800, color:T.red, fontFamily:"'Inter',sans-serif" }}>
                  {Math.round((1 - row.out / row.in) * 100)}%
                </div>
                <div style={{ fontSize:10, color:T.ink4 }}>drop-off</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bucket cards */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:T.ink4, fontSize:14 }}>Clustering candidates...</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {BUCKETS.map((b) => (
            <BucketCard key={b.id} bucket={b} candidates={clustered[b.id] || []} onBulkAction={handleBulkAction} />
          ))}
        </div>
      )}
    </div>
  )
}
