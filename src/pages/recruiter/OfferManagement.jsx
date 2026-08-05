import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T, card, cardLg, tag, btn } from "./theme"

function fromDbOffer(row) {
  return {
    id: row.id,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email,
    jobTitle: row.job_title,
    department: row.department,
    currency: row.currency,
    baseSalary: row.base_salary,
    bonus: row.bonus,
    equity: row.equity,
    equityAmount: row.equity_amount,
    signingBonus: row.signing_bonus,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    workLocation: row.work_location,
    notes: row.notes,
    letterText: row.letter_text,
    status: row.status,
    counterSalary: row.counter_salary,
    counterBonus: row.counter_bonus,
    negotiationHistory: row.negotiation_history || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDbOffer(payload) {
  return {
    candidate_name: payload.candidateName,
    candidate_email: payload.candidateEmail,
    job_title: payload.jobTitle,
    department: payload.department,
    currency: payload.currency,
    base_salary: payload.baseSalary || null,
    bonus: payload.bonus || null,
    equity: payload.equity,
    equity_amount: payload.equityAmount,
    signing_bonus: payload.signingBonus || null,
    start_date: payload.startDate || null,
    expiry_date: payload.expiryDate || null,
    work_location: payload.workLocation,
    notes: payload.notes,
    letter_text: payload.letterText,
    status: payload.status,
    counter_salary: payload.counterSalary || null,
    counter_bonus: payload.counterBonus || null,
    negotiation_history: payload.negotiationHistory,
  }
}




const BACKEND = "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter"

// ── Constants ─────────────────────────────────────────────────────────────────
const STAGES = [
  { id:"draft",      label:"Draft",      color:T.ink3,   icon:"📝" },
  { id:"sent",       label:"Sent",       color:T.indigo, icon:"📤" },
  { id:"negotiating",label:"Negotiating",color:T.amber,  icon:"💬" },
  { id:"accepted",   label:"Accepted",   color:T.green,  icon:"✅" },
  { id:"declined",   label:"Declined",   color:T.red,    icon:"❌" },
  { id:"expired",    label:"Expired",    color:T.ink4,   icon:"⏰" },
]

const CURRENCIES = ["USD","EUR","GBP","INR","CAD","AUD","SGD"]
const EQUITY_TYPES = ["None","Stock Options","RSUs","Phantom Equity"]

function stageObj(id) { return STAGES.find(s => s.id === id) || STAGES[0] }

// ── Offer Letter Builder (AI) ─────────────────────────────────────────────────
async function generateOfferLetter(offer) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1200,
        messages:[{ role:"user", content:
`Write a warm, professional offer letter.
Candidate: ${offer.candidateName}
Role: ${offer.jobTitle}
Department: ${offer.department || "Engineering"}
Start Date: ${offer.startDate || "TBD"}
Base Salary: ${offer.currency} ${Number(offer.baseSalary).toLocaleString()}
Bonus: ${offer.bonus ? offer.currency + " " + Number(offer.bonus).toLocaleString() + " annual bonus" : "No bonus"}
Equity: ${offer.equity || "None"}
Location: ${offer.workLocation || "Remote"}
Expiry: ${offer.expiryDate || "5 business days"}

Write a complete, professional offer letter. Include:
- Warm opening congratulating them
- Role details and responsibilities overview
- Compensation breakdown
- Benefits highlights
- Clear next steps and signature deadline
- Professional closing

Tone: warm but professional. Make them excited to join.
Return ONLY the plain letter text with \\n for line breaks. No JSON.` }]
      })
    })
    const data = await res.json()
    return data.content?.[0]?.text || ""
  } catch {
    return `Dear ${offer.candidateName},

We are thrilled to extend an offer of employment for the position of ${offer.jobTitle}.

After a thorough review of your background and experience, we are confident that you will be a tremendous asset to our team. We were particularly impressed by your skills and believe your contributions will help drive our mission forward.

OFFER DETAILS
─────────────────────────────
Position: ${offer.jobTitle}
${offer.department ? `Department: ${offer.department}` : ""}
Start Date: ${offer.startDate || "To be confirmed"}
Work Location: ${offer.workLocation || "Remote"}

COMPENSATION PACKAGE
─────────────────────────────
Base Salary: ${offer.currency} ${Number(offer.baseSalary || 0).toLocaleString()} per year
${offer.bonus ? `Performance Bonus: Up to ${offer.currency} ${Number(offer.bonus).toLocaleString()} annually` : ""}
${offer.equity && offer.equity !== "None" ? `Equity: ${offer.equity}` : ""}

NEXT STEPS
─────────────────────────────
Please review this offer and indicate your acceptance by ${offer.expiryDate || "within 5 business days"}. We would be happy to answer any questions you may have.

We are genuinely excited about the possibility of you joining our team and look forward to working together.

With excitement,
The Hiring Team`
  }
}

// ── Offer Modal ───────────────────────────────────────────────────────────────
function OfferModal({ offer, onClose, onSaved }) {
  const isEdit = !!offer
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    candidateName: offer?.candidateName || "",
    candidateEmail: offer?.candidateEmail || "",
    jobTitle: offer?.jobTitle || "",
    department: offer?.department || "",
    currency: offer?.currency || "USD",
    baseSalary: offer?.baseSalary || "",
    bonus: offer?.bonus || "",
    equity: offer?.equity || "None",
    equityAmount: offer?.equityAmount || "",
    signingBonus: offer?.signingBonus || "",
    startDate: offer?.startDate || "",
    expiryDate: offer?.expiryDate || "",
    workLocation: offer?.workLocation || "Remote",
    notes: offer?.notes || "",
    letterText: offer?.letterText || "",
  })
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }))

  async function handleGenerate() {
    setGenerating(true)
    const letter = await generateOfferLetter(form)
    set("letterText", letter)
    setStep(2)
    setGenerating(false)
  }

  async function handleSave(status = "draft") {
    setSaving(true)
    try {
      const payload = toDbOffer({ ...form, status })
      if (isEdit) {
        const { error } = await supabase.from("offers").update(payload).eq("id", offer.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("offers").insert(payload)
        if (error) throw error
      }
      onSaved()
    } catch(e) { console.error(e) }
    setSaving(false)
  }

  const iStyle = {
    width:"100%", padding:"10px 12px",
    background:T.cream3, border:`1px solid ${T.border}`,
    borderRadius:10, color:T.ink, fontSize:13,
    fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box",
  }

  const totalComp = [
    Number(form.baseSalary)||0,
    Number(form.bonus)||0,
    Number(form.signingBonus)||0,
  ].reduce((a,b) => a+b, 0)

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(26,26,24,0.5)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:20, padding:28, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", fontFamily:"'DM Sans',sans-serif", boxShadow:T.shadow2 }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:T.green, fontWeight:700, letterSpacing:"0.08em", marginBottom:4 }}>
              {step === 1 ? "OFFER DETAILS" : "OFFER LETTER"}
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.ink, margin:0 }}>
              {step === 1 ? (isEdit ? "Edit Offer" : "Create Offer") : "Review & Send"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background:T.cream3, border:`1px solid ${T.border}`, color:T.ink3, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {["Details","Letter"].map((s,i) => (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, background: step > i ? T.indigo : step === i+1 ? T.indigo3 : T.cream3, color: step > i ? "#1A1A18" : step === i+1 ? T.indigo : T.ink4, border: step === i+1 ? `1px solid ${T.indigo}` : "none" }}>{i+1}</div>
              <span style={{ fontSize:12, color: step === i+1 ? T.indigo : T.ink4, fontWeight: step === i+1 ? 600 : 400 }}>{s}</span>
              {i < 1 && <span style={{ color:T.border, fontSize:12 }}>›</span>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Candidate Name *</div>
                <input value={form.candidateName} onChange={e => set("candidateName",e.target.value)} placeholder="Alex Johnson" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Email</div>
                <input value={form.candidateEmail} onChange={e => set("candidateEmail",e.target.value)} placeholder="alex@email.com" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Job Title *</div>
                <input value={form.jobTitle} onChange={e => set("jobTitle",e.target.value)} placeholder="Senior Engineer" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Department</div>
                <input value={form.department} onChange={e => set("department",e.target.value)} placeholder="Engineering" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Work Location</div>
                <select value={form.workLocation} onChange={e => set("workLocation",e.target.value)} style={iStyle}>
                  {["Remote","Hybrid","On-site"].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>

              {/* Compensation */}
              <div style={{ gridColumn:"1/-1", borderTop:`1px solid ${T.border}`, paddingTop:14, marginTop:4 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:12 }}>💰 Compensation</div>
                <div style={{ display:"grid", gridTemplateColumns:"100px 1fr", gap:8 }}>
                  <select value={form.currency} onChange={e => set("currency",e.target.value)} style={iStyle}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input value={form.baseSalary} onChange={e => set("baseSalary",e.target.value)} placeholder="Base Salary (annual)" style={iStyle} type="number" />
                </div>
              </div>
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Annual Bonus</div>
                <input value={form.bonus} onChange={e => set("bonus",e.target.value)} placeholder="0" style={iStyle} type="number" />
              </div>
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Signing Bonus</div>
                <input value={form.signingBonus} onChange={e => set("signingBonus",e.target.value)} placeholder="0" style={iStyle} type="number" />
              </div>
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Equity Type</div>
                <select value={form.equity} onChange={e => set("equity",e.target.value)} style={iStyle}>
                  {EQUITY_TYPES.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              {form.equity !== "None" && (
                <div>
                  <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Equity Amount / Vesting</div>
                  <input value={form.equityAmount} onChange={e => set("equityAmount",e.target.value)} placeholder="10,000 options / 4yr vest" style={iStyle} />
                </div>
              )}

              {/* Total comp preview */}
              {form.baseSalary && (
                <div style={{ gridColumn:"1/-1", background:T.green2, border:`1px solid ${T.green}33`, borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:T.ink3 }}>Total Annual Compensation</span>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.green }}>
                    {form.currency} {totalComp.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Dates */}
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Start Date</div>
                <input type="date" value={form.startDate} onChange={e => set("startDate",e.target.value)} style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Offer Expiry</div>
                <input type="date" value={form.expiryDate} onChange={e => set("expiryDate",e.target.value)} style={iStyle} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Internal Notes</div>
                <textarea value={form.notes} onChange={e => set("notes",e.target.value)} rows={2} placeholder="Negotiation history, special terms..." style={{ ...iStyle, resize:"vertical" }} />
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={onClose} style={{ flex:1, padding:"11px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10, color:T.ink3, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => handleSave("draft")} disabled={saving} style={{ flex:1, padding:"11px", background:T.cream3, border:`1px solid ${T.border}`, borderRadius:10, color:T.ink, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                💾 Save Draft
              </button>
              <button onClick={handleGenerate} disabled={generating || !form.candidateName || !form.jobTitle} style={{ flex:2, padding:"11px", background: generating ? T.indigo3 : T.indigo, border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {generating ? "✨ Generating Letter…" : "✨ Generate Offer Letter →"}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:T.ink4, marginBottom:8 }}>OFFER LETTER — Review & Edit</div>
              <textarea
                value={form.letterText}
                onChange={e => set("letterText",e.target.value)}
                rows={18}
                style={{ ...iStyle, lineHeight:1.8, fontFamily:"'DM Mono','Courier New',monospace", fontSize:12 }}
              />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(1)} style={{ padding:"11px 16px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10, color:T.ink3, fontSize:13, cursor:"pointer" }}>← Edit Details</button>
              <button onClick={() => handleSave("draft")} disabled={saving} style={{ flex:1, padding:"11px", background:T.cream3, border:`1px solid ${T.border}`, borderRadius:10, color:T.ink, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                💾 Save Draft
              </button>
              <button onClick={() => handleSave("sent")} disabled={saving} style={{ flex:2, padding:"11px", background:T.green, border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {saving ? "Sending…" : "📤 Send Offer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Negotiation Log ───────────────────────────────────────────────────────────
function NegotiationModal({ offer, onClose, onSaved }) {
  const [form, setForm] = useState({
    counterSalary: offer.counterSalary || offer.baseSalary || "",
    counterBonus: offer.counterBonus || offer.bonus || "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const history = [...(offer.negotiationHistory || []), {
      date: new Date().toISOString(),
      originalSalary: offer.baseSalary,
      counterSalary: form.counterSalary,
      counterBonus: form.counterBonus,
      notes: form.notes,
    }]
    const { error } = await supabase.from("offers").update({
      status: "negotiating",
      counter_salary: form.counterSalary || null,
      counter_bonus: form.counterBonus || null,
      negotiation_history: history,
    }).eq("id", offer.id)
    if (error) console.error("Failed to log negotiation:", error)
    setSaving(false)
    onSaved()
  }

  const iStyle = {
    width:"100%", padding:"10px 12px",
    background:T.cream3, border:`1px solid ${T.border}`,
    borderRadius:10, color:T.ink, fontSize:13,
    fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box",
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:700, background:"rgba(26,26,24,0.5)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:T.cream, border:`1px solid ${T.amber}44`, borderRadius:20, padding:28, width:"100%", maxWidth:480, fontFamily:"'DM Sans',sans-serif", boxShadow:T.shadow2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:T.amber, fontWeight:700, letterSpacing:"0.08em", marginBottom:4 }}>COUNTER OFFER</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:T.ink, margin:0 }}>Log Negotiation</h2>
          </div>
          <button onClick={onClose} style={{ background:T.cream3, border:`1px solid ${T.border}`, color:T.ink3, width:32, height:32, borderRadius:8, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ background:T.amber2, border:`1px solid ${T.amber}33`, borderRadius:12, padding:14, marginBottom:16 }}>
          <div style={{ fontSize:12, color:T.ink3, marginBottom:4 }}>Original Offer</div>
          <div style={{ fontSize:16, fontWeight:700, color:T.ink }}>
            {offer.currency} {Number(offer.baseSalary).toLocaleString()} base
            {offer.bonus ? ` + ${offer.currency} ${Number(offer.bonus).toLocaleString()} bonus` : ""}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Counter Base Salary</div>
            <input type="number" value={form.counterSalary} onChange={e => setForm(f => ({...f, counterSalary:e.target.value}))} style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Counter Bonus</div>
            <input type="number" value={form.counterBonus} onChange={e => setForm(f => ({...f, counterBonus:e.target.value}))} style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Notes</div>
            <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} placeholder="Candidate mentioned competing offer from X..." style={{ ...iStyle, resize:"vertical" }} />
          </div>
        </div>

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10, color:T.ink3, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:"11px", background:T.amber, border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {saving ? "Saving…" : "💬 Log Counter Offer"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Offer Card ────────────────────────────────────────────────────────────────
function OfferCard({ offer, onEdit, onDelete, onStatusChange, onNegotiate }) {
  const stage = stageObj(offer.status)
  const totalComp = (Number(offer.baseSalary)||0) + (Number(offer.bonus)||0)
  const daysLeft = offer.expiryDate ? Math.ceil((new Date(offer.expiryDate) - new Date()) / (1000*60*60*24)) : null

  const statusBg = offer.status === "accepted" ? T.green2
    : offer.status === "pending" || offer.status === "sent" ? T.amber2
    : offer.status === "draft" ? T.cream3
    : T.cream2

  return (
    <div style={{ background:statusBg, border:`1px solid ${T.border}`, borderLeft:`3px solid ${stage.color}`, borderRadius:14, padding:"18px 20px", boxShadow:T.shadow }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:T.ink, marginBottom:2 }}>{offer.candidateName}</div>
          <div style={{ fontSize:12, color:T.ink3 }}>{offer.jobTitle}{offer.department ? ` · ${offer.department}` : ""}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:stage.color, background:`${stage.color}18`, border:`1px solid ${stage.color}40`, padding:"3px 10px", borderRadius:20 }}>
            {stage.icon} {stage.label}
          </span>
        </div>
      </div>

      {/* Comp summary */}
      <div style={{ display:"flex", gap:16, marginBottom:12, flexWrap:"wrap" }}>
        <div style={{ background:T.green2, border:`1px solid ${T.green}33`, borderRadius:10, padding:"8px 14px" }}>
          <div style={{ fontSize:10, color:T.ink3, marginBottom:2 }}>BASE</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.green, fontFamily:"'Syne',sans-serif" }}>
            {offer.currency} {Number(offer.baseSalary||0).toLocaleString()}
          </div>
        </div>
        {offer.bonus && Number(offer.bonus) > 0 && (
          <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}33`, borderRadius:10, padding:"8px 14px" }}>
            <div style={{ fontSize:10, color:T.ink3, marginBottom:2 }}>BONUS</div>
            <div style={{ fontSize:14, fontWeight:700, color:T.indigo, fontFamily:"'Syne',sans-serif" }}>
              {offer.currency} {Number(offer.bonus).toLocaleString()}
            </div>
          </div>
        )}
        {offer.equity && offer.equity !== "None" && (
          <div style={{ background:T.amber2, border:`1px solid ${T.amber}33`, borderRadius:10, padding:"8px 14px" }}>
            <div style={{ fontSize:10, color:T.ink3, marginBottom:2 }}>EQUITY</div>
            <div style={{ fontSize:12, fontWeight:600, color:T.amber }}>{offer.equity}</div>
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:12 }}>
        {offer.startDate && <span style={{ fontSize:12, color:T.ink3 }}>🗓 Start: {offer.startDate}</span>}
        {daysLeft !== null && (
          <span style={{ fontSize:12, color: daysLeft < 0 ? T.red : daysLeft <= 2 ? T.amber : T.ink3 }}>
            ⏰ {daysLeft < 0 ? "Expired" : daysLeft === 0 ? "Expires today" : `${daysLeft}d left`}
          </span>
        )}
        {offer.workLocation && <span style={{ fontSize:12, color:T.ink3 }}>📍 {offer.workLocation}</span>}
      </div>

      {/* Negotiation indicator */}
      {offer.status === "negotiating" && offer.counterSalary && (
        <div style={{ background:T.amber2, border:`1px solid ${T.amber}33`, borderRadius:10, padding:"8px 12px", marginBottom:12 }}>
          <div style={{ fontSize:11, color:T.amber, fontWeight:600, marginBottom:2 }}>💬 Counter offer received</div>
          <div style={{ fontSize:12, color:T.ink2 }}>
            {offer.currency} {Number(offer.counterSalary).toLocaleString()} base
            {offer.counterBonus ? ` + ${offer.currency} ${Number(offer.counterBonus).toLocaleString()} bonus` : ""}
            {" "}<span style={{ color:T.ink3 }}>vs original {offer.currency} {Number(offer.baseSalary).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {offer.status === "sent" && (
          <>
            <button onClick={() => onStatusChange(offer.id,"accepted")} style={{ padding:"6px 12px", background:T.green2, border:`1px solid ${T.green}44`, borderRadius:8, color:T.green, fontSize:11, fontWeight:600, cursor:"pointer" }}>✅ Accept</button>
            <button onClick={() => onNegotiate(offer)} style={{ padding:"6px 12px", background:T.amber2, border:`1px solid ${T.amber}44`, borderRadius:8, color:T.amber, fontSize:11, fontWeight:600, cursor:"pointer" }}>💬 Negotiate</button>
            <button onClick={() => onStatusChange(offer.id,"declined")} style={{ padding:"6px 12px", background:T.red2, border:`1px solid ${T.red}44`, borderRadius:8, color:T.red, fontSize:11, fontWeight:600, cursor:"pointer" }}>❌ Declined</button>
          </>
        )}
        {offer.status === "negotiating" && (
          <>
            <button onClick={() => onStatusChange(offer.id,"accepted")} style={{ padding:"6px 12px", background:T.green2, border:`1px solid ${T.green}44`, borderRadius:8, color:T.green, fontSize:11, fontWeight:600, cursor:"pointer" }}>✅ Agreed</button>
            <button onClick={() => onNegotiate(offer)} style={{ padding:"6px 12px", background:T.amber2, border:`1px solid ${T.amber}44`, borderRadius:8, color:T.amber, fontSize:11, fontWeight:600, cursor:"pointer" }}>+ Counter</button>
          </>
        )}
        {offer.status === "draft" && (
          <button onClick={() => onStatusChange(offer.id,"sent")} style={{ padding:"6px 12px", background:T.indigo3, border:`1px solid ${T.indigo}44`, borderRadius:8, color:T.indigo, fontSize:11, fontWeight:600, cursor:"pointer" }}>📤 Send</button>
        )}
        <button onClick={() => onEdit(offer)} style={{ padding:"6px 12px", background:T.cream3, border:`1px solid ${T.border}`, borderRadius:8, color:T.ink3, fontSize:11, cursor:"pointer" }}>✏️ Edit</button>
        <button onClick={() => onDelete(offer.id)} style={{ padding:"6px 12px", background:"none", border:"none", color:T.ink4, fontSize:11, cursor:"pointer" }}>🗑</button>
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function OfferManagement() {
  const [offers,      setOffers]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [negotiateTarget, setNegotiateTarget] = useState(null)
  const [filterStage, setFilterStage] = useState("all")

  useEffect(() => {
    let cancelled = false
    supabase.from("offers").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error("Failed to load offers:", error); setLoading(false); return }
        setOffers((data || []).map(fromDbOffer))
        setLoading(false)
      })
    const channel = supabase
      .channel("offers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, (payload) => {
        setOffers((prev) => {
          if (payload.eventType === "INSERT") {
            const next = [...prev, fromDbOffer(payload.new)]
            next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            return next
          }
          if (payload.eventType === "UPDATE") {
            return prev.map((o) => (o.id === payload.new.id ? fromDbOffer(payload.new) : o))
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((o) => o.id !== payload.old.id)
          }
          return prev
        })
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  async function handleStatusChange(id, status) {
    const { error } = await supabase.from("offers").update({ status }).eq("id", id)
    if (error) console.error("Failed to update offer status:", error)
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this offer?")) return
    const { error } = await supabase.from("offers").delete().eq("id", id)
    if (error) console.error("Failed to delete offer:", error)
  }

  const stats = STAGES.map(s => ({ ...s, count: offers.filter(o => o.status === s.id).length }))
  const displayed = filterStage === "all" ? offers : offers.filter(o => o.status === filterStage)

  const totalOffered   = offers.filter(o => ["sent","negotiating","accepted"].includes(o.status)).length
  const acceptanceRate = totalOffered > 0 ? Math.round(offers.filter(o => o.status === "accepted").length / totalOffered * 100) : 0

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform:rotate(360deg) } }
        input:focus,select:focus,textarea:focus { outline:none; border-color:${T.indigo} !important }
        input[type="date"]::-webkit-calendar-picker-indicator { filter:none; opacity:0.5 }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.ink, margin:0 }}>Offer Management</h1>
          <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>Track offers, manage negotiations, and close candidates</p>
        </div>
        <button onClick={() => { setEditTarget(null); setShowModal(true) }} style={{ padding:"10px 20px", background:T.green, border:"none", borderRadius:12, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:T.shadow }}>
          + Create Offer
        </button>
      </div>

      {/* Stage pipeline */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.id} onClick={() => setFilterStage(filterStage === s.id ? "all" : s.id)} style={{ background: filterStage === s.id ? `${s.color}12` : T.cream2, border:`1px solid ${filterStage === s.id ? s.color+"44" : T.border}`, borderTop:`3px solid ${s.color}`, borderRadius:12, padding:"12px 14px", cursor:"pointer", transition:"all 0.2s", boxShadow: filterStage === s.id ? T.shadow : "none" }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:s.color }}>{s.count}</div>
            <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Acceptance rate banner */}
      {totalOffered > 0 && (
        <div style={{ background:T.green2, border:`1px solid ${T.green}33`, borderRadius:14, padding:"14px 20px", marginBottom:20, display:"flex", alignItems:"center", gap:20 }}>
          <div>
            <div style={{ fontSize:11, color:T.ink3, marginBottom:2 }}>OFFER ACCEPTANCE RATE</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:T.green }}>{acceptanceRate}%</div>
          </div>
          <div style={{ flex:1, height:6, background:T.border, borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${acceptanceRate}%`, background:T.green, borderRadius:3, transition:"width 0.6s ease" }} />
          </div>
          <div style={{ fontSize:13, color:T.ink3 }}>
            {offers.filter(o => o.status === "accepted").length} of {totalOffered} offers accepted
          </div>
        </div>
      )}

      {/* Offer list */}
      {loading ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:200, gap:12, color:T.ink3 }}>
          <div style={{ width:28, height:28, border:`2px solid ${T.green}33`, borderTopColor:T.green, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          Loading offers…
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:T.ink4 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📄</div>
          <div style={{ fontSize:16, fontWeight:600, color:T.ink2, marginBottom:8 }}>No Offers Yet</div>
          <div style={{ fontSize:13, color:T.ink3, marginBottom:20 }}>Create your first offer letter to track the process</div>
          <button onClick={() => setShowModal(true)} style={{ padding:"10px 24px", background:T.green, border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            + Create Offer
          </button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {displayed.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onEdit={o => { setEditTarget(o); setShowModal(true) }}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onNegotiate={o => setNegotiateTarget(o)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <OfferModal
          offer={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={() => { setShowModal(false); setEditTarget(null) }}
        />
      )}
      {negotiateTarget && (
        <NegotiationModal
          offer={negotiateTarget}
          onClose={() => setNegotiateTarget(null)}
          onSaved={() => setNegotiateTarget(null)}
        />
      )}
    </div>
  )
}
