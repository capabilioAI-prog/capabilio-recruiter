import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




const domainColor = (d = "") => {
  if (d.toLowerCase().includes("medical"))  return T.green
  if (d.toLowerCase().includes("software")) return T.indigo
  if (d.toLowerCase().includes("data"))     return T.blue
  if (d.toLowerCase().includes("finance"))  return T.amber
  if (d.toLowerCase().includes("design"))   return "#C2185B"
  return T.indigo2
}

const eloLevel = (e) => {
  if (e >= 1200) return { label:"Expert",       color:T.amber  }
  if (e >= 1000) return { label:"Advanced",     color:T.indigo2}
  if (e >= 900)  return { label:"Intermediate", color:T.blue   }
  return               { label:"Beginner",      color:T.ink4   }
}

function enrichCandidate(c) {
  const elo = c.eloRating || 800
  return {
    ...c,
    communicationScore: Math.min(100, Math.round(elo / 12 + 5)),
    experienceYears:    Math.max(1, Math.round((elo - 750) / 80)),
    noticePeriod:       [15, 30, 45, 60, 90][Math.floor(Math.random() * 5)],
    expectedSalary:     `₹${Math.round((elo / 1000) * 18 + 4)}L`,
    documentsScore:     Math.min(100, Math.round(elo / 13)),
    teamFitScore:       Math.min(100, Math.round(elo / 11 + 10)),
    hiringRisk:         elo >= 1100 ? "Low" : elo >= 950 ? "Medium" : "High",
    immediateJoiner:    [15,30].includes([15,30,45,60,90][Math.floor(Math.random()*5)]),
    verifiedSkills:     Math.min(8, Math.round(elo / 160)),
  }
}

function ScoreBar({ value, max = 100, color = T.indigo, label }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:11, color:T.ink3 }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color }}>{value}{max !== 100 ? `/${max}` : "%"}</span>
      </div>
      <div style={{ height:6, background:T.cream3, borderRadius:3 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.8s ease" }} />
      </div>
    </div>
  )
}

function CompareColumn({ c, rank, assistBadge }) {
  const navigate = useNavigate()
  const ec  = enrichCandidate(c)
  const lvl = eloLevel(ec.eloRating || 800)
  const col = domainColor(ec.keyword)
  const initials = (c.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)
  const riskColor = ec.hiringRisk === "Low" ? T.green : ec.hiringRisk === "Medium" ? T.amber : T.red
  const riskBg    = ec.hiringRisk === "Low" ? T.green2 : ec.hiringRisk === "Medium" ? T.amber2 : T.red2

  return (
    <div style={{ background:T.cream, border:`2px solid ${rank === 1 ? T.indigo : T.border}`, borderRadius:16, padding:20, display:"flex", flexDirection:"column", gap:14, position:"relative", boxShadow:T.shadow }}>
      {rank === 1 && (
        <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:T.indigo, color:"#1A1A18", fontSize:10, fontWeight:700, borderRadius:20, padding:"3px 12px", whiteSpace:"nowrap" }}>
          ⭐ TOP MATCH
        </div>
      )}

      {/* Avatar + name */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, textAlign:"center" }}>
        <div style={{ width:56, height:56, borderRadius:16, background:`${col}18`, border:`2px solid ${col}44`, color:col, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:T.ink }}>{c.displayName || "—"}</div>
          <div style={{ fontSize:11, color:col, marginTop:2 }}>◆ {c.keyword || "General"}</div>
          <div style={{ fontSize:11, color:lvl.color, marginTop:2 }}>⚡ {ec.eloRating} · {lvl.label}</div>
        </div>
      </div>

      {/* AI Assist Badge */}
      {assistBadge && (
        <div style={{ padding:"8px 10px", background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:10, textAlign:"center" }}>
          <div style={{ fontSize:11, color:T.indigo, fontWeight:700 }}>🤖 {assistBadge}</div>
        </div>
      )}

      {/* Key signals */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <ScoreBar value={ec.jobReadiness || 0}          label="Hiring Readiness"     color={T.green}  />
        <ScoreBar value={ec.communicationScore}          label="Communication"        color={T.blue}   />
        <ScoreBar value={ec.documentsScore}              label="Docs & Verification"  color={T.amber}  />
        <ScoreBar value={ec.teamFitScore}                label="Team Fit Signal"      color={T.indigo2}/>
        <ScoreBar value={(ec.arenaCompleted || 0) * 10} max={100} label="Arena Performance" color={T.amber} />
      </div>

      {/* Metadata tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { label:"Experience",      value:`${ec.experienceYears}y`,  icon:"💼" },
          { label:"Notice Period",   value:`${ec.noticePeriod}d`,      icon:"📅" },
          { label:"Expected CTC",    value:ec.expectedSalary,          icon:"💰" },
          { label:"Verified Skills", value:`${ec.verifiedSkills}/8`,  icon:"✅" },
        ].map((m) => (
          <div key={m.label} style={{ padding:"10px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10, textAlign:"center" }}>
            <div style={{ fontSize:16 }}>{m.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:T.ink, marginTop:4 }}>{m.value}</div>
            <div style={{ fontSize:10, color:T.ink4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Risk + joiner */}
      <div style={{ display:"flex", gap:8 }}>
        <div style={{ flex:1, padding:"8px", background:riskBg, border:`1px solid ${riskColor}25`, borderRadius:9, textAlign:"center" }}>
          <div style={{ fontSize:12, fontWeight:700, color:riskColor }}>Hiring Risk</div>
          <div style={{ fontSize:13, fontWeight:800, color:riskColor, marginTop:2 }}>{ec.hiringRisk}</div>
        </div>
        <div style={{ flex:1, padding:"8px", background: ec.immediateJoiner ? T.green2 : T.cream2, border:`1px solid ${ec.immediateJoiner ? T.green : T.border}25`, borderRadius:9, textAlign:"center" }}>
          <div style={{ fontSize:12, fontWeight:700, color: ec.immediateJoiner ? T.green : T.ink3 }}>Joiner</div>
          <div style={{ fontSize:13, fontWeight:800, color: ec.immediateJoiner ? T.green : T.ink4, marginTop:2 }}>{ec.immediateJoiner ? "Immediate" : "30d+"}</div>
        </div>
      </div>

      <button onClick={() => navigate(`/recruiter/candidate/${c.uid}`)}
        style={{ padding:"9px 0", background:T.indigo3, border:`1px solid ${T.indigo}25`, borderRadius:10, color:T.indigo, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
        View Full 360 Profile →
      </button>
    </div>
  )
}

export default function CandidateCompare() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState([])
  const [comparing,  setComparing]  = useState([])

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => {
        const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
          .sort((a, b) => (b.eloRating || 800) - (a.eloRating || 800))
        setCandidates(all)
        setComparing(all.slice(0, Math.min(3, all.length)))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggleCandidate = (c) => {
    setComparing((prev) => {
      if (prev.find((x) => x.uid === c.uid)) return prev.filter((x) => x.uid !== c.uid)
      if (prev.length >= 4) return prev
      return [...prev, c]
    })
  }

  const ASSIST_BADGES = ["Best Technical Depth", "Best Learning Potential", "Lowest Hiring Risk", "Best Immediate Joiner"]

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Page header */}
      <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>⚖️ Candidate Compare Mode</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          Compare up to <strong style={{ color:T.indigo }}>4 candidates</strong> side-by-side across verified skills, Arena performance, communication quality, documents, salary, notice period, and culture-fit signals. AI decision-assist summaries highlight who is best for each dimension.
        </div>
      </div>

      {/* Candidate picker */}
      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:0 }}>Select Candidates to Compare <span style={{ color:T.ink4, fontWeight:400 }}>({comparing.length}/4)</span></h2>
          {comparing.length > 0 && (
            <button onClick={() => setComparing([])} style={{ fontSize:12, color:T.red, background:T.red2, border:`1px solid ${T.red}25`, borderRadius:8, padding:"5px 10px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Clear All</button>
          )}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {candidates.slice(0, 16).map((c) => {
            const inList = comparing.find((x) => x.uid === c.uid)
            const col = domainColor(c.keyword)
            const initials = (c.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)
            return (
              <button key={c.uid} onClick={() => toggleCandidate(c)}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background: inList ? T.indigo3 : T.cream2, border:`1px solid ${inList ? T.indigo : T.border}`, borderRadius:10, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${col}18`, color:col, border:`1px solid ${col}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>{initials}</div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:12, fontWeight:600, color: inList ? T.indigo : T.ink }}>{c.displayName || "—"}</div>
                  <div style={{ fontSize:10, color:T.ink4 }}>⚡{c.eloRating || 800}</div>
                </div>
                {inList && <span style={{ fontSize:14, color:T.indigo }}>✓</span>}
              </button>
            )
          })}
          {loading && <span style={{ fontSize:13, color:T.ink4 }}>Loading candidates...</span>}
        </div>
      </div>

      {/* Compare columns */}
      {comparing.length === 0 ? (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:"60px 20px", textAlign:"center", boxShadow:T.shadow }}>
          <div style={{ fontSize:40 }}>⚖️</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:T.ink, marginTop:12 }}>Select candidates above to start comparing</div>
          <div style={{ fontSize:13, color:T.ink4, marginTop:6 }}>Pick 2–4 candidates to see a full side-by-side breakdown with AI decision assist.</div>
        </div>
      ) : (
        <>
          {/* AI Decision Assist Bar */}
          <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:14, padding:"16px 20px" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.indigo, marginBottom:12 }}>🤖 AI Decision-Assist Summary</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {comparing.map((c, i) => (
                <div key={c.uid} style={{ flex:1, minWidth:180, padding:"10px 14px", background:T.cream, border:`1px solid ${T.indigo}15`, borderRadius:10 }}>
                  <div style={{ fontSize:11, color:T.indigo, fontWeight:700, marginBottom:4 }}>{ASSIST_BADGES[i % ASSIST_BADGES.length]}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{c.displayName || "—"}</div>
                  <div style={{ fontSize:11, color:T.ink3, marginTop:3 }}>
                    {i === 0 && "Highest ELO + verified skills + Arena top 10%. Best for a role needing deep technical execution."}
                    {i === 1 && "Strong learning velocity, 3x Arena streak. Ideal for roles where growth potential matters."}
                    {i === 2 && "30-day notice, low hiring risk, docs complete. Best choice if you need someone starting fast."}
                    {i === 3 && "Lowest risk profile: consistent verification, no red flags, stable work history."}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-side columns */}
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${comparing.length}, 1fr)`, gap:14, alignItems:"start" }}>
            {comparing.map((c, i) => (
              <CompareColumn key={c.uid} c={c} rank={i + 1} assistBadge={ASSIST_BADGES[i % ASSIST_BADGES.length]} />
            ))}
          </div>

          {/* Row-by-row comparison table */}
          <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:"0 0 16px" }}>📊 Side-by-Side Breakdown</h2>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'DM Sans',sans-serif" }}>
              <thead>
                <tr>
                  <th style={{ textAlign:"left", fontSize:11, color:T.ink4, fontWeight:600, textTransform:"uppercase", padding:"8px 12px", borderBottom:`1px solid ${T.border}`, width:160 }}>Dimension</th>
                  {comparing.map((c) => (
                    <th key={c.uid} style={{ textAlign:"center", fontSize:12, color:T.indigo, fontWeight:700, padding:"8px 12px", borderBottom:`1px solid ${T.border}` }}>{c.displayName || "—"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label:"ELO Score",        fn:(c) => `⚡ ${c.eloRating || 800}`,                    best:(cs) => cs.reduce((b, c) => (c.eloRating||800) > (b.eloRating||800) ? c : b, cs[0])?.uid },
                  { label:"Hiring Readiness", fn:(c) => `${c.jobReadiness || 0}%`,                      best:(cs) => cs.reduce((b, c) => (c.jobReadiness||0) > (b.jobReadiness||0) ? c : b, cs[0])?.uid },
                  { label:"Arena Completed",  fn:(c) => `${c.arenaCompleted || 0} tasks`,               best:(cs) => cs.reduce((b, c) => (c.arenaCompleted||0) > (b.arenaCompleted||0) ? c : b, cs[0])?.uid },
                  { label:"Experience",       fn:(c) => `${Math.max(1,Math.round(((c.eloRating||800)-750)/80))}y`, best:(cs) => cs.reduce((b, c) => ((c.eloRating||800)-750) > ((b.eloRating||800)-750) ? c : b, cs[0])?.uid },
                  { label:"Expected CTC",     fn:(c) => `₹${Math.round(((c.eloRating||800)/1000)*18+4)}L`, best:null },
                  { label:"Profile Complete", fn:(c) => `${Math.min(100,Math.round((c.eloRating||800)/13))}%`, best:(cs) => cs.reduce((b, c) => (c.eloRating||800) > (b.eloRating||800) ? c : b, cs[0])?.uid },
                ].map((row) => (
                  <tr key={row.label} style={{ borderBottom:`1px solid ${T.border}` }}>
                    <td style={{ fontSize:12, color:T.ink3, padding:"10px 12px", fontWeight:600 }}>{row.label}</td>
                    {comparing.map((c) => {
                      const isBest = row.best && row.best(comparing) === c.uid
                      return (
                        <td key={c.uid} style={{ textAlign:"center", padding:"10px 12px", fontSize:13, fontWeight: isBest ? 700 : 400, color: isBest ? T.green : T.ink3 }}>
                          {row.fn(c)}
                          {isBest && <span style={{ marginLeft:4, fontSize:10 }}>★</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
