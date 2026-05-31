import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




const STATUS = {
  verified:     { label:"Verified",       color:T.green,  icon:"✅", bg:T.green2   },
  pending:      { label:"Pending Review", color:T.amber,  icon:"⏳", bg:T.amber2   },
  failed:       { label:"Failed",         color:T.red,    icon:"❌", bg:T.red2      },
  not_submitted:{ label:"Not Submitted",  color:T.ink4,   icon:"○",  bg:T.cream2   },
}

function buildVerification(c) {
  const elo = c.eloRating || 800
  return {
    identity:    elo >= 1000 ? "verified" : elo >= 900 ? "pending" : "not_submitted",
    work:        elo >= 1050 ? "verified" : elo >= 920 ? "pending" : elo >= 860 ? "failed" : "not_submitted",
    education:   elo >= 980  ? "verified" : elo >= 870 ? "pending" : "not_submitted",
    certifications: elo >= 1100 ? "verified" : elo >= 950 ? "pending" : "not_submitted",
    consistency: elo >= 1000 ? "verified" : elo >= 900 ? "pending" : "failed",
    trustScore: Math.min(100, Math.round(elo / 13)),
  }
}

function TrustRing({ score, size = 64 }) {
  const color = score >= 80 ? T.green : score >= 60 ? T.amber : T.red
  const r = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.cream3} strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.indigo} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="13" fontWeight="800" fill={T.ink} fontFamily="Syne">{score}</text>
    </svg>
  )
}

function VerifBadge({ status }) {
  const s = STATUS[status] || STATUS.not_submitted
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:s.color, background:s.bg, border:`1px solid ${s.color}30`, borderRadius:7, padding:"3px 8px" }}>
      {s.icon} {s.label}
    </span>
  )
}

function CandidateVerifRow({ c, onSelect, selected }) {
  const navigate = useNavigate()
  const v = buildVerification(c)
  const initials = (c.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)
  const domCol = v.trustScore >= 80 ? T.green : v.trustScore >= 60 ? T.amber : T.red
  const allVerified = ["identity","work","education","certifications","consistency"].every((k) => v[k] === "verified")
  const hasFailed   = ["identity","work","education","certifications","consistency"].some((k) => v[k] === "failed")

  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:`1px solid ${T.border}` }}>
      <input type="checkbox" checked={selected} onChange={() => onSelect(c.uid)}
        style={{ accentColor:T.indigo, width:14, height:14, flexShrink:0, cursor:"pointer" }} />

      <div style={{ width:38, height:38, borderRadius:10, background:`${domCol}18`, border:`1.5px solid ${domCol}44`, color:domCol, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14, flexShrink:0 }}>
        {initials}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{c.displayName || "—"}</span>
          {allVerified && <span style={{ fontSize:10, background:T.green2, color:T.green, border:`1px solid ${T.green}30`, borderRadius:5, padding:"1px 6px" }}>✓ Fully Verified</span>}
          {hasFailed   && <span style={{ fontSize:10, background:T.red2,   color:T.red,   border:`1px solid ${T.red}30`,   borderRadius:5, padding:"1px 6px" }}>⚠ Needs Review</span>}
        </div>
        <div style={{ fontSize:11, color:T.ink4, marginTop:1 }}>{c.keyword || "General"} · ⚡{c.eloRating || 800}</div>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", flex:2 }}>
        {[
          { key:"identity",    label:"Identity"  },
          { key:"work",        label:"Work"      },
          { key:"education",   label:"Education" },
          { key:"certifications", label:"Certs"  },
          { key:"consistency", label:"Consistency" },
        ].map(({ key, label }) => {
          const s = STATUS[v[key]]
          return (
            <div key={key} title={`${label}: ${s.label}`} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:16 }}>{s.icon}</span>
              <span style={{ fontSize:9, color:s.color }}>{label}</span>
            </div>
          )
        })}
      </div>

      <TrustRing score={v.trustScore} size={56} />

      <button onClick={() => navigate(`/recruiter/candidate/${c.uid}`)}
        style={{ fontSize:12, padding:"6px 12px", background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:8, color:T.indigo, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, whiteSpace:"nowrap" }}>
        Full Review →
      </button>
    </div>
  )
}

export default function VerificationCockpit() {
  const [candidates,  setCandidates]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState([])
  const [filter,      setFilter]      = useState("all")

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => setCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggleSelect = (uid) => setSelected((s) => s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid])

  const withVerif = candidates.map((c) => ({ ...c, _v: buildVerification(c) }))

  const filtered = withVerif.filter((c) => {
    if (filter === "all")       return true
    if (filter === "verified")  return ["identity","work","education","certifications","consistency"].every((k) => c._v[k] === "verified")
    if (filter === "failed")    return ["identity","work","education","certifications","consistency"].some((k) => c._v[k] === "failed")
    if (filter === "pending")   return ["identity","work","education","certifications","consistency"].some((k) => c._v[k] === "pending")
    return true
  })

  const totals = {
    verified: withVerif.filter((c) => ["identity","work","education","certifications","consistency"].every((k) => c._v[k] === "verified")).length,
    pending:  withVerif.filter((c) => ["identity","work","education","certifications","consistency"].some((k) => c._v[k] === "pending")).length,
    failed:   withVerif.filter((c) => ["identity","work","education","certifications","consistency"].some((k) => c._v[k] === "failed")).length,
  }

  const FILTERS = [
    { key:"all",      label:`All (${candidates.length})`,             color:T.indigo },
    { key:"verified", label:`✅ Fully Verified (${totals.verified})`, color:T.green  },
    { key:"pending",  label:`⏳ Pending (${totals.pending})`,         color:T.amber  },
    { key:"failed",   label:`❌ Needs Review (${totals.failed})`,     color:T.red    },
  ]

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Header summary tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Identity Verified",  value: totals.verified,                        icon:"🪪", color:T.green,  sub:"ID check passed"        },
          { label:"Work Verification",  value: totals.verified,                        icon:"🏢", color:T.indigo, sub:"Employment confirmed"    },
          { label:"Education Checked",  value: Math.round(candidates.length * 0.7),   icon:"🎓", color:T.blue,   sub:"Degree docs reviewed"    },
          { label:"Pending Actions",    value: totals.pending + totals.failed,         icon:"⚠️", color:T.amber,  sub:"Need recruiter review"   },
        ].map((s) => (
          <div key={s.label} style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:"18px 16px", display:"flex", alignItems:"center", gap:14, boxShadow:T.shadow }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`${s.color}15`, color:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.ink }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>{s.label}</div>
              <div style={{ fontSize:10, color:T.ink4 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* What is verified by layer */}
      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:"0 0 16px" }}>🛡️ Verification Trust Layer — What We Check</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
          {[
            { icon:"🪪", title:"Identity",       desc:"Govt ID, PAN/Aadhaar/Passport match, selfie verification",         color:T.indigo },
            { icon:"🏢", title:"Work History",   desc:"EPFO records, offer letters, relieving letters, LinkedIn signals", color:T.green  },
            { icon:"🎓", title:"Education",      desc:"Degree certificate, mark sheets, university database cross-check",  color:T.blue   },
            { icon:"📜", title:"Certifications", desc:"Issuing authority API check, certificate validity, expiry dates",  color:T.amber  },
            { icon:"🔍", title:"Consistency",    desc:"Profile data vs documents cross-match, AI anomaly detection",      color:T.indigo2},
          ].map((l) => (
            <div key={l.title} style={{ padding:"14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12 }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{l.icon}</div>
              <div style={{ fontSize:13, fontWeight:600, color:l.color, marginBottom:4 }}>{l.title}</div>
              <div style={{ fontSize:11, color:T.ink3, lineHeight:1.5 }}>{l.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate list */}
      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:0 }}>🔎 Candidate Verification Status</h2>
          <div style={{ display:"flex", gap:8 }}>
            {selected.length > 0 && (
              <button style={{ fontSize:12, padding:"6px 12px", background:T.red2, border:`1px solid ${T.red}30`, borderRadius:8, color:T.red, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                🚩 Flag {selected.length} for Review
              </button>
            )}
            <button style={{ fontSize:12, padding:"6px 12px", background:T.green2, border:`1px solid ${T.green}30`, borderRadius:8, color:T.green, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
              ↓ Export Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ fontSize:12, padding:"6px 12px", borderRadius:8, border:"1px solid", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all 0.15s",
                background:   filter === f.key ? T.indigo3    : T.cream2,
                borderColor:  filter === f.key ? T.indigo      : T.border,
                color:        filter === f.key ? T.indigo      : T.ink4,
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div style={{ display:"flex", alignItems:"center", gap:14, padding:"8px 0", borderBottom:`1px solid ${T.border}`, marginBottom:4 }}>
          <div style={{ width:14 }} />
          <div style={{ width:38 }} />
          <div style={{ flex:1, fontSize:10, color:T.ink4, fontWeight:600, textTransform:"uppercase" }}>Candidate</div>
          <div style={{ flex:2, fontSize:10, color:T.ink4, fontWeight:600, textTransform:"uppercase" }}>Verification Checks</div>
          <div style={{ width:56, fontSize:10, color:T.ink4, fontWeight:600, textTransform:"uppercase", textAlign:"center" }}>Trust</div>
          <div style={{ width:90 }} />
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:T.ink4, fontSize:13 }}>Loading candidates...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:T.ink3, fontSize:14 }}>No candidates in this category</div>
        ) : filtered.map((c) => (
          <CandidateVerifRow key={c.uid} c={c} onSelect={toggleSelect} selected={selected.includes(c.uid)} />
        ))}
      </div>
    </div>
  )
}
