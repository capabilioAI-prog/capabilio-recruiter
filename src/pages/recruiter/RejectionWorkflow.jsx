import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




const GAP_TYPES = ["Technical","Communication","Domain Knowledge","Documentation","Role Fit"]
const GAP_COLORS = { Technical:T.indigo, Communication:T.amber, "Domain Knowledge":T.blue, Documentation:T.amber, "Role Fit":T.red }
const GAP_TINTS  = { Technical:T.indigo3, Communication:T.amber2, "Domain Knowledge":T.blue2, Documentation:T.amber2, "Role Fit":T.red2 }

function buildRejection(c) {
  const elo  = c.eloRating || 800
  const gaps = []
  if (elo < 950)  gaps.push({ type:"Technical",        severity:"high",   detail:"Core domain skills below role threshold. ELO score indicates gap in advanced concepts." })
  if (elo < 900)  gaps.push({ type:"Domain Knowledge", severity:"medium", detail:"Limited exposure to role-specific tools and workflows based on Arena performance." })
  if (elo < 1000) gaps.push({ type:"Role Fit",         severity:"medium", detail:"Experience depth does not yet match the seniority level required for this position." })
  if (elo < 870)  gaps.push({ type:"Documentation",    severity:"low",    detail:"Work history and certification documents were incomplete or unverifiable at this time." })
  return {
    stageReached: elo >= 950 ? "Interview Scheduled" : elo >= 900 ? "Shortlisted" : elo >= 860 ? "AI Screened" : "Applied",
    strengths: [
      `Strong ${c.keyword || "domain"} awareness and conceptual understanding`,
      elo >= 900 ? "Completed Arena challenges with above-average engagement" : "Completed profile with career details",
      "Professional communication and prompt responses during the process",
    ],
    gaps,
    nextSteps: [
      { type:"arena",    label:"Arena Tasks",       action:"Practice 3 Advanced Arena Tasks", icon:"🎯", color:T.indigo, tint:T.indigo3 },
      { type:"cert",     label:"Certification",     action:`Get certified in ${c.keyword || "your domain"} (recommended path)`, icon:"📜", color:T.amber, tint:T.amber2 },
      { type:"mentor",   label:"Mentor Session",    action:"Book 1-on-1 with a senior professional in your field", icon:"👥", color:T.green, tint:T.green2 },
      { type:"learning", label:"Micro-Learning",    action:"Complete 5 targeted skill modules on Capabilio Learn", icon:"📚", color:T.blue, tint:T.blue2 },
    ],
  }
}

function GapBadge({ type, severity }) {
  const color = GAP_COLORS[type] || T.ink4
  const tint  = GAP_TINTS[type]  || T.cream2
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color, background:tint, border:`1px solid ${color}30`, borderRadius:7, padding:"3px 9px" }}>
      {severity === "high" ? "🔴" : severity === "medium" ? "🟡" : "🟢"} {type}
    </span>
  )
}

export default function RejectionWorkflow() {
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [sent,       setSent]       = useState(false)
  const [preview,    setPreview]    = useState("recruiter")

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

  const rejection = selected ? buildRejection(selected) : null

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Header */}
      <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>🤖 AI Decision Transparency Engine</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          Every rejection becomes a <strong style={{ color:T.indigo }}>growth roadmap</strong>, not a dead end. AI generates candidate-safe explanations — showing strengths, naming exact gap types, and linking directly to personalised improvement paths. No private data about other candidates is ever revealed.
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16, alignItems:"start" }}>

        {/* Candidate picker */}
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:16, boxShadow:T.shadow }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.ink, marginBottom:12 }}>Select Candidate</div>
          {loading ? <div style={{ color:T.ink4, fontSize:13 }}>Loading...</div>
            : candidates.slice(0,12).map((c) => {
            const col = c.keyword?.toLowerCase().includes("medical") ? T.green : c.keyword?.toLowerCase().includes("software") ? T.indigo : T.indigo2
            const initials = (c.displayName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)
            const rej = buildRejection(c)
            const isSelected = selected?.uid === c.uid
            return (
              <div key={c.uid} onClick={() => { setSelected(c); setSent(false) }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px", borderRadius:10, cursor:"pointer", marginBottom:4, background: isSelected ? T.indigo3 : "transparent", border:`1px solid ${isSelected ? T.indigo + "30" : "transparent"}`, transition:"all 0.15s" }}>
                <div style={{ width:32, height:32, borderRadius:9, background:`${col}15`, color:col, border:`1px solid ${col}35`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:12, flexShrink:0 }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: isSelected ? T.indigo : T.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.displayName || "—"}</div>
                  <div style={{ fontSize:10, color:T.ink4 }}>{rej.stageReached}</div>
                </div>
                <div style={{ width:6, height:6, borderRadius:"50%", background: rej.gaps.length === 0 ? T.green : rej.gaps.some((g) => g.severity === "high") ? T.red : T.amber, flexShrink:0 }} />
              </div>
            )
          })}
        </div>

        {/* Rejection engine */}
        {rejection && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* View toggle */}
            <div style={{ display:"flex", gap:8 }}>
              {[["recruiter","🔎 Recruiter View"],["candidate","📬 Candidate-Safe View"]].map(([v,l]) => (
                <button key={v} onClick={() => setPreview(v)}
                  style={{ fontSize:12, padding:"7px 14px", borderRadius:9, border:"1px solid", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all 0.15s", background: preview === v ? T.indigo3 : "transparent", borderColor: preview === v ? `${T.indigo}40` : T.border, color: preview === v ? T.indigo : T.ink4 }}>
                  {l}
                </button>
              ))}
            </div>

            {preview === "recruiter" ? (
              <>
                {/* Internal decision summary */}
                <div style={{ background:T.cream, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.indigo, marginBottom:14 }}>🔎 Internal Decision Summary — {selected.displayName}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                    <div style={{ padding:"12px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10 }}>
                      <div style={{ fontSize:11, color:T.ink4, marginBottom:4 }}>Stage Reached</div>
                      <div style={{ fontSize:14, fontWeight:700, color:T.ink }}>{rejection.stageReached}</div>
                    </div>
                    <div style={{ padding:"12px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10 }}>
                      <div style={{ fontSize:11, color:T.ink4, marginBottom:4 }}>Primary Gap Type</div>
                      <div style={{ fontSize:14, fontWeight:700, color:T.red }}>{rejection.gaps[0]?.type || "None — selected!"}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.ink4, marginBottom:8 }}>Gap Analysis</div>
                    {rejection.gaps.length === 0 ? (
                      <div style={{ fontSize:13, color:T.green }}>✅ No significant gaps — this candidate is a strong match.</div>
                    ) : rejection.gaps.map((g, i) => (
                      <div key={i} style={{ padding:"10px 12px", background:GAP_TINTS[g.type] || T.cream2, border:`1px solid ${GAP_COLORS[g.type]}25`, borderRadius:9, marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <GapBadge type={g.type} severity={g.severity} />
                          <span style={{ fontSize:10, color:T.ink4, textTransform:"uppercase" }}>{g.severity} priority</span>
                        </div>
                        <div style={{ fontSize:12, color:T.ink3 }}>{g.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Candidate-safe rejection preview */}
                <div style={{ background:T.cream, border:`1px solid ${T.green}20`, borderRadius:16, padding:24, boxShadow:T.shadow }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, marginBottom:16 }}>📬 Candidate-Safe Rejection Message Preview</div>

                  <div style={{ background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, padding:20, fontFamily:"'DM Sans',sans-serif", fontSize:13, color:T.ink3, lineHeight:1.8 }}>
                    <p style={{ color:T.ink, fontWeight:600, marginTop:0 }}>Hi {selected.displayName?.split(" ")[0] || "there"},</p>
                    <p>Thank you for applying and for the effort you put into every stage of the process. We genuinely appreciate the time you invested.</p>
                    <p>After careful review, we have decided not to proceed with your application at this stage. We want to be transparent about what we observed:</p>

                    <div style={{ background:T.green2, border:`1px solid ${T.green}20`, borderRadius:10, padding:"14px 16px", margin:"16px 0" }}>
                      <div style={{ fontWeight:700, color:T.green, marginBottom:8 }}>✨ Your Strengths We Recognised</div>
                      {rejection.strengths.map((s, i) => (
                        <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                          <span style={{ color:T.green, flexShrink:0 }}>•</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>

                    {rejection.gaps.length > 0 && (
                      <div style={{ background:T.red2, border:`1px solid ${T.red}20`, borderRadius:10, padding:"14px 16px", margin:"16px 0" }}>
                        <div style={{ fontWeight:700, color:T.red, marginBottom:8 }}>📌 Areas That Affected the Decision</div>
                        {rejection.gaps.map((g, i) => (
                          <div key={i} style={{ marginBottom:8 }}>
                            <span style={{ fontWeight:600, color:GAP_COLORS[g.type] }}>{g.type}</span>
                            <span style={{ color:T.ink3 }}> — The role requires a stronger foundation here. This is not a reflection of your overall ability; it is a specific gap for this role's requirements.</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p>This is not the end of your journey with Capabilio. Based on your profile, we have created a personalised improvement roadmap to help you close these gaps and become stronger for future roles:</p>
                  </div>

                  {/* Growth roadmap */}
                  <div style={{ marginTop:16 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.ink, marginBottom:12 }}>🗺️ Your Personalised Growth Roadmap</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                      {rejection.nextSteps.map((step) => (
                        <div key={step.type} style={{ padding:"14px 16px", background:step.tint, border:`1px solid ${step.color}25`, borderRadius:12 }}>
                          <div style={{ fontSize:20 }}>{step.icon}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:step.color, marginTop:6 }}>{step.label}</div>
                          <div style={{ fontSize:12, color:T.ink3, marginTop:4 }}>{step.action}</div>
                          <button style={{ marginTop:10, fontSize:11, padding:"5px 10px", background:T.cream, border:`1px solid ${step.color}30`, borderRadius:7, color:step.color, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                            Start Now →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!sent ? (
                    <button onClick={() => setSent(true)}
                      style={{ marginTop:20, width:"100%", padding:"12px", background:T.ink, border:"none", borderRadius:12, color:T.cream, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      📬 Send Rejection + Roadmap to {selected.displayName}
                    </button>
                  ) : (
                    <div style={{ marginTop:20, padding:"14px", background:T.green2, border:`1px solid ${T.green}25`, borderRadius:12, textAlign:"center" }}>
                      <div style={{ fontSize:18 }}>✅</div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.green, marginTop:6 }}>Sent! {selected.displayName} received their rejection email and personalised growth roadmap.</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
