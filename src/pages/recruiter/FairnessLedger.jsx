import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




const EVENT_TYPES = {
  applied:        { icon:"📥", color:T.indigo,  label:"Applied"              },
  viewed:         { icon:"👁️",  color:T.blue,   label:"Profile Viewed"       },
  shortlisted:    { icon:"✅", color:T.green,  label:"Shortlisted"          },
  task_assigned:  { icon:"🎯", color:T.indigo2, label:"Task Assigned"        },
  task_completed: { icon:"🏆", color:T.amber,  label:"Task Completed"       },
  interview_sched:{ icon:"📅", color:T.amber,  label:"Interview Scheduled"  },
  interview_done: { icon:"🎤", color:T.blue,   label:"Interview Completed"  },
  score_updated:  { icon:"⚡", color:T.amber,  label:"Score Updated"        },
  stage_moved:    { icon:"🔀", color:T.green,  label:"Stage Advanced"       },
  rejected:       { icon:"❌", color:T.red,    label:"Rejection Sent"       },
  offer_sent:     { icon:"🎉", color:T.green,  label:"Offer Extended"       },
}

function buildLedger(c) {
  const elo = c.eloRating || 800
  const events = [
    { type:"applied",         day:0,  note:"Candidate applied via Capabilio portal",                     public:true  },
    { type:"viewed",          day:1,  note:"Recruiter Priya opened candidate profile (3m 42s)",          public:true  },
    { type:"task_assigned",   day:2,  note:"Arena task: Medical Coding Level 3 challenge assigned",      public:true  },
    { type:"task_completed",  day:4,  note:`Task completed with score ${Math.min(94,Math.round(elo/13))}%. Time: 22 min.`,  public:true  },
    { type:"score_updated",   day:4,  note:`Role-fit score updated to ${Math.min(88,Math.round(elo/14))}% based on task performance.`, public:false },
    { type:"shortlisted",     day:5,  note:"Candidate moved to shortlisted stage",                       public:true  },
    elo >= 980 ? { type:"interview_sched", day:7, note:"Video interview scheduled for DD/MM/YYYY, 11:00 AM", public:true }
               : { type:"rejected",       day:8, note:"Candidate not progressed. AI rejection with improvement roadmap sent.", public:true },
    elo >= 980 ? { type:"interview_done",  day:9, note:"Interview completed. Scorecard submitted by panel.",   public:true  } : null,
    elo >= 1000 ? { type:"offer_sent",    day:11, note:"Offer letter extended with compensation details.",      public:true  } : null,
  ].filter(Boolean)
  return events
}

function TimelineEvent({ ev }) {
  const type = EVENT_TYPES[ev.type] || { icon:"●", color:T.ink4, label:ev.type }
  return (
    <div style={{ display:"flex", gap:16, paddingBottom:20, position:"relative" }}>
      {/* Vertical line */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${type.color}15`, border:`2px solid ${type.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, zIndex:1 }}>
          {type.icon}
        </div>
        <div style={{ flex:1, width:2, background:T.border, marginTop:4 }} />
      </div>

      {/* Event content */}
      <div style={{ flex:1, paddingTop:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <span style={{ fontSize:13, fontWeight:600, color:type.color }}>{type.label}</span>
          <span style={{ fontSize:11, color:T.ink3, background:T.cream2, border:`1px solid ${T.border}`, borderRadius:5, padding:"1px 6px" }}>Day {ev.day}</span>
          {!ev.public && <span style={{ fontSize:10, color:T.ink4, background:T.cream3, border:`1px solid ${T.border}`, borderRadius:5, padding:"1px 6px" }}>🔒 Internal</span>}
        </div>
        <div style={{ fontSize:12, color:T.ink3, lineHeight:1.5 }}>{ev.note}</div>
      </div>
    </div>
  )
}

export default function FairnessLedger() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [showPublic, setShowPublic] = useState(false)

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => {
        const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a,b) => (b.eloRating||800)-(a.eloRating||800))
        setCandidates(all)
        if (all.length) setSelected(all[0])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const ledger = selected ? buildLedger(selected) : []
  const publicLedger = ledger.filter((e) => e.public)
  const displayLedger = showPublic ? publicLedger : ledger

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Header */}
      <div style={{ background:T.green2, border:`1px solid ${T.green}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>⚖️ Fairness Ledger</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          Every hiring event is timestamped and logged. Candidates see their <strong style={{ color:T.green }}>public timeline</strong>. Recruiters see internal notes and score changes. No black-box hiring — every decision is explainable and auditable.
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16, alignItems:"start" }}>

        {/* Candidate list */}
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:16, boxShadow:T.shadow }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:T.ink, marginBottom:12 }}>Applications</div>
          {loading ? <div style={{ color:T.ink4, fontSize:13 }}>Loading...</div>
            : candidates.slice(0, 12).map((c) => {
            const col = c.keyword?.toLowerCase().includes("medical") ? T.green
              : c.keyword?.toLowerCase().includes("software") ? T.indigo
              : c.keyword?.toLowerCase().includes("data") ? T.blue : T.indigo2
            const initials = (c.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)
            const isSelected = selected?.uid === c.uid
            return (
              <div key={c.uid} onClick={() => setSelected(c)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 10px", borderRadius:10, cursor:"pointer", marginBottom:4, background: isSelected ? T.indigo3 : "transparent", border: isSelected ? `1px solid ${T.indigo}30` : `1px solid transparent`, transition:"all 0.15s" }}>
                <div style={{ width:32, height:32, borderRadius:9, background:`${col}15`, color:col, border:`1px solid ${col}35`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:12, flexShrink:0 }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: isSelected ? T.indigo : T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.displayName || "—"}</div>
                  <div style={{ fontSize:10, color:T.ink4 }}>⚡{c.eloRating || 800}</div>
                </div>
                {isSelected && <span style={{ fontSize:10, color:T.indigo }}>▶</span>}
              </div>
            )
          })}
        </div>

        {/* Ledger panel */}
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:24, boxShadow:T.shadow }}>
          {!selected ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:T.ink4 }}>Select a candidate to view their Fairness Ledger</div>
          ) : (
            <>
              {/* Candidate header */}
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, padding:"14px 16px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:T.indigo3, color:T.indigo, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:16, flexShrink:0 }}>
                  {(selected.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:T.ink }}>{selected.displayName || "—"}</div>
                  <div style={{ fontSize:12, color:T.ink4 }}>Applied to: Senior Role · ⚡{selected.eloRating || 800} · {selected.keyword || "General"}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setShowPublic(!showPublic)}
                    style={{ fontSize:12, padding:"6px 12px", background: showPublic ? T.green2 : T.indigo3, border:`1px solid ${showPublic ? T.green + "30" : T.indigo + "30"}`, borderRadius:8, color: showPublic ? T.green : T.indigo, cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                    {showPublic ? "👁 Public View" : "🔒 Full View"}
                  </button>
                  <button style={{ fontSize:12, padding:"6px 12px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:8, color:T.ink3, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
                    ↓ Export PDF
                  </button>
                </div>
              </div>

              {showPublic && (
                <div style={{ padding:"10px 14px", background:T.green2, border:`1px solid ${T.green}20`, borderRadius:9, marginBottom:16, fontSize:12, color:T.green }}>
                  👁 Showing candidate-visible events only. Internal notes, score changes, and recruiter activities are hidden in this view.
                </div>
              )}

              {/* Stats row */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
                {[
                  { label:"Total Events",   value:displayLedger.length, color:T.indigo },
                  { label:"Days in Process",value:displayLedger[displayLedger.length-1]?.day || 0, color:T.amber },
                  { label:"Tasks Done",     value:displayLedger.filter((e) => e.type === "task_completed").length, color:T.green },
                  { label:"Interviews",     value:displayLedger.filter((e) => e.type === "interview_done").length, color:T.blue },
                ].map((s) => (
                  <div key={s.label} style={{ padding:"12px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10, textAlign:"center" }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div>
                {displayLedger.map((ev, i) => (
                  <TimelineEvent key={`${showPublic ? "pub" : "priv"}-${ev.type}-${ev.day ?? i}`} ev={ev} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
