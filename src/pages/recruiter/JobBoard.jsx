import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
// NOTE: `applications` (per-job listener, status updates, appCounts below)
// intentionally stays on Firestore for now — new applications are created by
// an external Railway backend that still writes to Firestore, so migrating
// the read side here would make new applicants invisible to recruiters.
// Only `jobs` (created directly by this app) has moved to Supabase.
import {
  collection, onSnapshot, serverTimestamp,
  query, where, orderBy, doc, updateDoc, getDocs
} from "firebase/firestore"
import { db } from "./firebase"
import { supabase } from "../../lib/supabaseClient"
import ApplicationsView from "./ApplicationsView"
import { T, card, cardLg, tag, btn } from "./theme"

// Supabase `jobs` rows are snake_case; the rest of this file (and ApplyPage.jsx)
// expects the camelCase/legacy field names below.
function fromDbJob(row) {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    type: row.type,
    experience: row.experience,
    location: row.location,
    salary: row.salary,
    skills: row.skills,
    status: row.status,
    applicantCount: row.applicant_count,
    description: row.description,
    responsibilities: row.responsibilities,
    requirements: row.requirements,
    niceToHave: row.nice_to_have,
    createdAt: row.created_at,
  }
}




// ── Helpers ───────────────────────────────────────────────────────────────────
const domainColor = (d = "") => {
  if (d.toLowerCase().includes("medical"))   return T.green
  if (d.toLowerCase().includes("software"))  return T.indigo
  if (d.toLowerCase().includes("data"))      return T.blue
  if (d.toLowerCase().includes("finance"))   return T.amber
  if (d.toLowerCase().includes("marketing")) return T.amber
  if (d.toLowerCase().includes("design"))    return T.indigo2
  return T.indigo2
}
const scoreColor  = (s) => s >= 75 ? T.green : s >= 50 ? T.amber : T.red
const recColor    = (r) => r === "Strong Match" ? T.green : r === "Good Match" ? T.indigo : r === "Weak Match" ? T.amber : T.red

async function generateFeedback(candidate, decision, job) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Write a professional ${decision === "shortlist" ? "shortlist/interview invitation" : "rejection"} email.
Candidate: ${candidate.candidateName}
Role: ${job.title}
ATS Score: ${candidate.atsScore}/100
Decision: ${decision}
Top Strength: ${candidate.topStrength || "domain knowledge"}
Main Gap: ${candidate.mainGap || "experience depth"}
Matched Skills: ${(candidate.matchedSkills || []).join(", ")}
Missing Skills: ${(candidate.missingSkills || []).join(", ")}

${decision === "shortlist"
  ? "Write a warm, enthusiastic invitation for next steps. Highlight their top strength."
  : "Write a kind, constructive rejection with 2-3 specific improvement tips based on missing skills. Encourage them to apply again."}

Respond ONLY in raw JSON: {"subject":"<email subject>","body":"<email body, use \\n for line breaks>"}`
        }]
      })
    })
    const data = await res.json()
    return JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g, "").trim() || "{}")
  } catch {
    return decision === "shortlist"
      ? {
          subject: `Great news — you've been shortlisted for ${job.title}!`,
          body: `Hi ${candidate.candidateName},\n\nCongratulations! After reviewing your application for ${job.title}, we're excited to invite you to the next stage of our hiring process.\n\nYour ${candidate.topStrength || "skills"} stood out and we believe you'd be a strong addition to our team.\n\nWe'll be in touch with next steps shortly.\n\nBest,\nThe Hiring Team`,
        }
      : {
          subject: `Your application for ${job.title}`,
          body: `Hi ${candidate.candidateName},\n\nThank you for applying for ${job.title}. After careful consideration, we've decided to move forward with other candidates.\n\nTo strengthen future applications, consider:\n• Deepening your experience in ${(candidate.missingSkills || ["the required skills"])[0]}\n• Building projects that demonstrate ${(candidate.missingSkills || ["technical skills"])[1] || "hands-on skills"}\n• Gaining certifications in relevant areas\n\nWe encourage you to apply for future openings that match your growing skill set.\n\nBest of luck,\nThe Hiring Team`,
        }
  }
}

async function generateJobDescription(job) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Write a compelling job description.
Title: ${job.title}, Domain: ${job.domain}, Type: ${job.type}, Experience: ${job.experience}
Skills: ${job.skills}, Salary: ${job.salary}, Location: ${job.location}
Respond ONLY in raw JSON:
{"description":"<2-3 sentences>","responsibilities":["r1","r2","r3","r4","r5"],"requirements":["req1","req2","req3","req4"],"niceToHave":["n1","n2","n3"]}`
        }]
      })
    })
    const data = await res.json()
    return JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g, "").trim() || "{}")
  } catch {
    return {
      description: `We are looking for a talented ${job.title} to join our team.`,
      responsibilities: ["Lead key projects", "Collaborate with team", "Drive results", "Mentor junior members", "Report to leadership"],
      requirements: ["Relevant experience", "Strong communication", "Team player", "Problem solver"],
      niceToHave: ["Leadership experience", "Domain certifications", "Open source contributions"],
    }
  }
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 52 }) {
  const r    = size / 2 - 5
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const col  = scoreColor(score)
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        fontSize="12" fontWeight="800" fill={col} fontFamily="Syne">{score}</text>
    </svg>
  )
}

// ── Feedback Modal ────────────────────────────────────────────────────────────
function FeedbackModal({ candidate, decision, job, onClose, onSent }) {
  const [loading,  setLoading]  = useState(true)
  const [subject,  setSubject]  = useState("")
  const [body,     setBody]     = useState("")
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)

  useEffect(() => {
    generateFeedback(candidate, decision, job).then((fb) => {
      setSubject(fb.subject || "")
      setBody(fb.body || "")
      setLoading(false)
    })
  }, [])

  const handleSend = async () => {
    setSending(true)
    try {
      await updateDoc(doc(db, "applications", candidate.id), {
        status: decision === "shortlist" ? "shortlisted" : "feedback_sent",
        feedbackSent: true,
        feedbackSubject: subject,
        feedbackBody: body,
        updatedAt: serverTimestamp(),
      })
      setSent(true)
      setTimeout(() => onSent(candidate.id, decision), 1200)
    } catch {
      setSending(false)
    }
  }

  const isShortlist = decision === "shortlist"
  const col = isShortlist ? T.green : T.red

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(26,26,24,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 20 }}>
      <style>{"@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}"}</style>
      <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", animation: "slideUp 0.3s ease", fontFamily: "'DM Sans',sans-serif", boxShadow: T.shadow2 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: T.ink4, marginBottom: 2 }}>{isShortlist ? "✅ SHORTLIST EMAIL" : "❌ REJECTION EMAIL"}</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: T.ink, margin: 0 }}>
              {isShortlist ? "🎉 Shortlist Candidate" : "Send Feedback"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: T.cream2, border: `1px solid ${T.border}`, color: T.ink3, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ background: isShortlist ? T.green2 : T.red2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 16, alignItems: "center" }}>
          <ScoreRing score={candidate.atsScore || 0} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{candidate.candidateName}</div>
            <div style={{ fontSize: 12, color: T.ink4 }}>{candidate.candidateEmail}</div>
            <div style={{ fontSize: 12, color: recColor(candidate.recommendation), fontWeight: 600, marginTop: 2 }}>{candidate.recommendation}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.ink4 }}>Matched Skills</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>
              {(candidate.matchedSkills || []).slice(0, 2).join(", ")}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: T.ink4, fontSize: 13 }}>
            <style>{"@keyframes spin2{to{transform:rotate(360deg)}}"}</style>
            <div style={{ width: 28, height: 28, border: `2px solid ${T.indigo3}`, borderTopColor: T.indigo, borderRadius: "50%", animation: "spin2 0.8s linear infinite", margin: "0 auto 10px" }} />
            ✨ AI is writing personalised email...
          </div>
        ) : sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, color: T.green, fontWeight: 600 }}>Email sent! Status updated.</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Subject</div>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: "10px 14px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Email Body</div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                style={{ width: "100%", padding: "10px 14px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink, fontSize: 13, fontFamily: "'DM Sans',sans-serif", resize: "vertical", lineHeight: 1.7 }}
              />
            </div>
            <div style={{ background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: T.ink3 }}>
              ⚡ Candidate receives personalised feedback in minutes, not weeks
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink3, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Cancel
              </button>
              <button onClick={handleSend} disabled={sending} style={{ flex: 2, padding: "11px", background: isShortlist ? T.green : T.indigo, border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {sending ? "⏳ Sending..." : `📧 Send ${isShortlist ? "Shortlist" : "Feedback"} Email Now`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Comparison View ───────────────────────────────────────────────────────────
function CompareView({ candidates, job, onClose, onDecision }) {
  const sorted = [...candidates].sort((a, b) => (b.atsScore || 0) - (a.atsScore || 0))
  const topId  = sorted[0]?.id

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: T.cream2, overflow: "auto", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');"}</style>
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.ink, margin: 0 }}>
            📊 Comparing {candidates.length} Candidates
          </h2>
          <button onClick={onClose} style={{ padding: "8px 16px", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink3, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            ✕ Close
          </button>
        </div>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16 }}>
          {sorted.map((c) => {
            const isTop = c.id === topId
            const col   = scoreColor(c.atsScore || 0)
            return (
              <div key={c.id} style={{ minWidth: 260, background: T.cream, border: `1px solid ${isTop ? T.amber : T.border}`, borderRadius: 16, padding: 20, flexShrink: 0, boxShadow: T.shadow }}>
                {isTop && <div style={{ fontSize: 11, color: T.amber, fontWeight: 700, marginBottom: 10 }}>🥇 TOP MATCH</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{c.candidateName}</div>
                    <div style={{ fontSize: 11, color: T.ink4 }}>{c.candidateEmail}</div>
                  </div>
                  <ScoreRing score={c.atsScore || 0} size={52} />
                </div>
                <div style={{ fontSize: 12, color: recColor(c.recommendation), fontWeight: 600, marginBottom: 12 }}>{c.recommendation}</div>
                {(c.matchedSkills || []).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: T.ink4, marginBottom: 5 }}>✅ MATCHES</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {c.matchedSkills.slice(0, 4).map((s, i) => (
                        <span key={i} style={{ fontSize: 10, color: T.green, background: T.green2, border: `1px solid ${T.border}`, padding: "2px 7px", borderRadius: 20 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(c.missingSkills || []).length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: T.ink4, marginBottom: 5 }}>❌ MISSING</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {c.missingSkills.slice(0, 3).map((s, i) => (
                        <span key={i} style={{ fontSize: 10, color: T.ink3, background: T.cream2, border: `1px solid ${T.border}`, padding: "2px 7px", borderRadius: 20 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5, marginBottom: 14 }}>{c.summary}</div>
                {c.status === "pending" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => onDecision(c, "shortlist")} style={{ flex: 1, padding: "7px", background: T.green2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.green, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✓ Shortlist</button>
                    <button onClick={() => onDecision(c, "reject")}   style={{ flex: 1, padding: "7px", background: T.red2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.red, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✕ Reject</button>
                  </div>
                )}
                {c.status !== "pending" && (
                  <div style={{ textAlign: "center", fontSize: 11, color: c.status === "shortlisted" ? T.green : T.ink4, fontWeight: 600 }}>
                    {c.status === "shortlisted" ? "✅ Shortlisted" : c.status === "feedback_sent" ? "📧 Feedback Sent" : c.status}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Create Job Modal ──────────────────────────────────────────────────────────
function CreateJobModal({ onClose, onCreated }) {
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({ title: "", domain: "Software Engineering", type: "Full-time", experience: "Mid", skills: "", salary: "", location: "Remote" })
  const [generated, setGenerated] = useState(null)

  const DOMAINS = ["Software Engineering", "Data Science", "Medical & Health", "Finance", "Marketing", "Design", "Product Management", "Operations"]
  const iStyle  = { width: "100%", padding: "10px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }

  const generate = async () => {
    if (!form.title.trim()) return
    setLoading(true)
    const desc = await generateJobDescription(form)
    setGenerated(desc)
    setStep(2)
    setLoading(false)
  }

  const save = async (status) => {
    setSaving(true)
    try {
      const { data, error } = await supabase.from("jobs").insert({
        title: form.title,
        domain: form.domain,
        type: form.type,
        experience: form.experience,
        skills: form.skills,
        salary: form.salary,
        location: form.location,
        description: generated?.description,
        responsibilities: generated?.responsibilities,
        requirements: generated?.requirements,
        nice_to_have: generated?.niceToHave,
        status,
        applicant_count: 0,
        // company_id is auto-stamped server-side (see stamp_company_id trigger)
      }).select().single()
      if (error) throw error
      onCreated(fromDbJob(data))
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(26,26,24,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`input:focus,select:focus,textarea:focus{outline:none;border-color:${T.indigo}!important}`}</style>
      <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: T.shadow2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: T.ink, margin: 0 }}>
            {step === 1 ? "📋 Create Job Posting" : "✨ AI-Generated Description"}
          </h2>
          <button onClick={onClose} style={{ background: T.cream2, border: `1px solid ${T.border}`, color: T.ink3, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        {step === 1 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Job Title *</div>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Data Analyst" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Domain</div>
                <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} style={iStyle}>
                  {DOMAINS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Type</div>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={iStyle}>
                  {["Full-time", "Part-time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Experience</div>
                <select value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} style={iStyle}>
                  {["Junior", "Mid", "Senior", "Lead", "Executive"].map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Location</div>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Remote / City" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Salary Range</div>
                <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="e.g. $80k–$110k" style={iStyle} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 12, color: T.ink4, marginBottom: 6 }}>Required Skills (comma separated)</div>
                <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, SQL, Communication..." style={iStyle} />
              </div>
            </div>
            <button onClick={generate} disabled={loading || !form.title.trim()} style={{ width: "100%", padding: "13px", background: loading ? T.indigo3 : T.indigo, border: "none", borderRadius: 12, color: loading ? T.indigo : "#1A1A18", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {loading ? "✨ Generating with AI..." : "✨ Generate Description with AI →"}
            </button>
          </>
        )}

        {step === 2 && generated && (
          <>
            <div style={{ fontSize: 14, color: T.ink3, lineHeight: 1.7, marginBottom: 16 }}>{generated.description}</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Responsibilities</div>
              {(generated.responsibilities || []).map((r, i) => <div key={i} style={{ fontSize: 13, color: T.ink4, padding: "3px 0" }}>• {r}</div>)}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Requirements</div>
              {(generated.requirements || []).map((r, i) => <div key={i} style={{ fontSize: 13, color: T.ink4, padding: "3px 0" }}>✓ {r}</div>)}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Nice to Have</div>
              {(generated.niceToHave || []).map((r, i) => <div key={i} style={{ fontSize: 13, color: T.ink3, padding: "3px 0" }}>⭐ {r}</div>)}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ padding: "11px 16px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink3, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>← Edit</button>
              <button onClick={() => save("Draft")} disabled={saving} style={{ flex: 1, padding: "11px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {saving ? "Saving..." : "💾 Save as Draft"}
              </button>
              <button onClick={() => save("Open")} disabled={saving} style={{ flex: 1, padding: "11px", background: T.indigo, border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {saving ? "Publishing..." : "🚀 Post Job"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, selected, onClick, appCount }) {
  const col = domainColor(job.domain)
  const statusIsOpen   = job.status === "Open"
  const statusIsDraft  = job.status === "Draft"
  const statusIsClosed = job.status === "Closed"
  const statusBg    = statusIsOpen ? T.green2 : statusIsDraft ? T.amber2 : T.red2
  const statusColor = statusIsOpen ? T.green  : statusIsDraft ? T.amber  : T.red
  return (
    <div
      onClick={() => onClick(job)}
      style={{
        background: selected ? T.indigo3 : T.cream,
        border: `1px solid ${selected ? T.indigo : T.border}`,
        borderLeft: `3px solid ${col}`,
        borderRadius: 14, padding: "14px 16px", cursor: "pointer",
        transition: "all 0.2s", boxShadow: T.shadow,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, flex: 1, marginRight: 8 }}>{job.title}</div>
        <span style={{ fontSize: 10, color: statusColor, background: statusBg, border: `1px solid ${T.border}`, padding: "2px 8px", borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
          {job.status || "Open"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: col, marginBottom: 8 }}>◆ {job.domain}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: T.ink4 }}>📅 {job.experience}</span>
        <span style={{ fontSize: 11, color: T.ink4 }}>💰 {job.salary || "TBD"}</span>
        <span style={{ fontSize: 11, color: T.indigo, fontWeight: 600 }}>👥 {appCount} applicants</span>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobBoard() {
  const navigate = useNavigate()
  const [jobs,        setJobs]        = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [applications,setApplications]= useState([])
  const [loadingApps, setLoadingApps] = useState(false)
  const [view,        setView]        = useState("detail")  // detail | applications | bulk-ats
  const [filter,      setFilter]      = useState("All")
  const [selected,    setSelected]    = useState([])
  const [feedback,    setFeedback]    = useState(null)
  const [compareData, setCompareData] = useState(null)
  const [showCreate,  setShowCreate]  = useState(false)
  const [newBadge,    setNewBadge]    = useState(null)

  // ── Load jobs from Supabase ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    supabase.from("jobs").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error("Failed to load jobs:", error); setLoadingJobs(false); return }
        const rows = (data || []).map(fromDbJob)
        setJobs(rows)
        setSelectedJob((prev) => prev || rows[0] || null)
        setLoadingJobs(false)
      })
    const channel = supabase
      .channel("jobs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, (payload) => {
        setJobs((prev) => {
          if (payload.eventType === "INSERT") {
            const next = [...prev, fromDbJob(payload.new)]
            next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            return next
          }
          if (payload.eventType === "UPDATE") {
            return prev.map((j) => (j.id === payload.new.id ? fromDbJob(payload.new) : j))
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((j) => j.id !== payload.old.id)
          }
          return prev
        })
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  // ── Live applications for selected job ───────────────────────────────────
  const prevAppCountRef = useRef(0)
  useEffect(() => {
    if (!selectedJob) return
    setLoadingApps(true)
    setSelected([])
    prevAppCountRef.current = 0

    const q = query(
      collection(db, "applications"),
      where("jobId", "==", selectedJob.id),
      orderBy("appliedAt", "desc")
    )
    const unsub = onSnapshot(q, (snap) => {
      const prev = prevAppCountRef.current
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      prevAppCountRef.current = data.length
      setApplications(data)
      setLoadingApps(false)
      if (prev > 0 && data.length > prev) {
        setNewBadge(`🔔 New application from ${data[0].candidateName}!`)
        setTimeout(() => setNewBadge(null), 4000)
      }
    })
    return unsub
  }, [selectedJob?.id])

  // ── App counts per job ────────────────────────────────────────────────────
  const [appCounts, setAppCounts] = useState({})
  useEffect(() => {
    if (jobs.length === 0) return
    jobs.forEach((j) => {
      getDocs(query(collection(db, "applications"), where("jobId", "==", j.id))).then((snap) => {
        setAppCounts((prev) => ({ ...prev, [j.id]: snap.size }))
      })
    })
  }, [jobs.length])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalApps  = Object.values(appCounts).reduce((s, c) => s + c, 0)
  const shortlisted= applications.filter((a) => a.status === "shortlisted").length
  const fbSent     = applications.filter((a) => a.status === "feedback_sent").length

  const stats = [
    { icon: "📋", label: "Open Positions",    value: jobs.filter((j) => j.status === "Open").length, color: T.indigo },
    { icon: "📤", label: "Total Applications", value: totalApps,   color: T.blue },
    { icon: "✅", label: "Shortlisted",        value: shortlisted,  color: T.green },
    { icon: "⚡", label: "Feedback Sent",      value: fbSent,       color: T.amber },
  ]

  // ── Filtered applications ─────────────────────────────────────────────────
  const filtered = applications.filter((a) => {
    if (filter === "All")        return true
    if (filter === "Strong")     return a.atsScore >= 75
    if (filter === "Good")       return a.atsScore >= 50 && a.atsScore < 75
    if (filter === "Weak")       return a.atsScore < 50
    if (filter === "Shortlisted")return a.status === "shortlisted"
    if (filter === "Rejected")   return a.status === "feedback_sent"
    return true
  })

  const handleDecision = (candidate, decision) => {
    setFeedback({ candidate, decision })
    setCompareData(null)
  }

  const handleFeedbackSent = (appId, decision) => {
    setFeedback(null)
  }

  const handleCompare = () => {
    const sel = applications.filter((a) => selected.includes(a.id))
    setCompareData(sel)
  }

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const copyApplyLink = () => {
    if (!selectedJob) return
    const link = `${window.location.origin}/apply/${selectedJob.id}`
    navigator.clipboard.writeText(link)
  }

  const col = selectedJob ? domainColor(selectedJob.domain) : T.indigo

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabs = [
    { id: "detail",       label: "📋 Job Details" },
    { id: "applications", label: `👥 Applications (${applications.length})` },
    { id: "bulk-ats",     label: "📊 Bulk ATS" },
  ]

  // ── Empty state ───────────────────────────────────────────────────────────
  const EmptyJobs = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
      <div style={{ fontSize: 52 }}>📋</div>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.ink, margin: 0 }}>No Job Postings Yet</h2>
      <p style={{ color: T.ink4, fontSize: 14, textAlign: "center" }}>Create your first job posting to start receiving applications</p>
      <button onClick={() => setShowCreate(true)} style={{ padding: "12px 24px", background: T.indigo, border: "none", borderRadius: 12, color: "#1A1A18", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
        + Create Job Posting
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.6} }
        input::placeholder, textarea::placeholder { color: ${T.ink4}; }
        input:focus, textarea:focus, select:focus  { outline: none; border-color: ${T.indigo} !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.indigo3}; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>Job Board</h1>
          <p style={{ fontSize: 13, color: T.ink4, marginTop: 4 }}>Post jobs, share apply links, and get 100 resumes auto-scored by AI</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: "10px 20px", background: T.indigo, border: "none", borderRadius: 12, color: "#1A1A18", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: T.shadow }}>
          + Post New Job
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: T.shadow }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* New application badge */}
      {newBadge && (
        <div style={{ background: T.green2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: T.green, animation: "fadeIn 0.3s ease" }}>
          {newBadge}
        </div>
      )}

      {loadingJobs ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${T.indigo3}`, borderTopColor: T.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyJobs />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>

          {/* Left — Jobs sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                selected={selectedJob?.id === j.id}
                onClick={(job) => { setSelectedJob(job); setView("detail"); setSelected([]) }}
                appCount={appCounts[j.id] || 0}
              />
            ))}
          </div>

          {/* Right — Tabs + Views */}
          {selectedJob && (
            <div>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4 }}>
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: view === t.id ? T.indigo3 : "transparent",
                      border: view === t.id ? `1px solid ${T.border}` : "1px solid transparent",
                      borderRadius: 10,
                      color: view === t.id ? T.indigo : T.ink4,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Job Detail View ── */}
              {view === "detail" && (
                <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, boxShadow: T.shadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.ink, margin: "0 0 4px" }}>{selectedJob.title}</h2>
                      <div style={{ fontSize: 13, color: col }}>◆ {selectedJob.domain}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={copyApplyLink} style={{ padding: "8px 16px", background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.indigo, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        🔗 Copy Apply Link
                      </button>
                      <button onClick={() => setView("bulk-ats")} style={{ padding: "8px 16px", background: T.indigo, border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        📊 Bulk ATS →
                      </button>
                    </div>
                  </div>

                  {/* Apply link box */}
                  <div style={{ background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.indigo, marginBottom: 6 }}>🔗 Public Apply Link</div>
                    <div style={{ fontSize: 12, color: T.ink3, marginBottom: 10 }}>Share this link on LinkedIn, your website, or job boards. Candidates apply directly and their resumes are scored by AI instantly.</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px" }}>
                      <span style={{ flex: 1, fontSize: 12, color: T.indigo, wordBreak: "break-all" }}>
                        {window.location.origin}/apply/{selectedJob.id}
                      </span>
                      <button onClick={copyApplyLink} style={{ padding: "5px 12px", background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 6, color: T.indigo, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    {[selectedJob.type, selectedJob.experience, selectedJob.location || "Remote", selectedJob.salary || "Competitive"].map((v, i) => (
                      <span key={i} style={{ fontSize: 12, color: T.ink3, background: T.cream2, border: `1px solid ${T.border}`, padding: "5px 12px", borderRadius: 20 }}>{v}</span>
                    ))}
                  </div>

                  {selectedJob.description && (
                    <p style={{ fontSize: 14, color: T.ink3, lineHeight: 1.7, marginBottom: 16 }}>{selectedJob.description}</p>
                  )}

                  {(selectedJob.requirements || []).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Requirements</div>
                      {selectedJob.requirements.map((r, i) => <div key={i} style={{ fontSize: 13, color: T.ink4, padding: "3px 0" }}>✓ {r}</div>)}
                    </div>
                  )}
                </div>
              )}

              {/* ── Applications View ── */}
              {view === "applications" && (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                    {["All", "Strong", "Good", "Weak", "Shortlisted", "Rejected"].map((f) => (
                      <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", background: filter === f ? T.indigo3 : T.cream2, border: `1px solid ${filter === f ? T.border : T.border}`, borderRadius: 20, color: filter === f ? T.indigo : T.ink4, fontSize: 12, fontWeight: filter === f ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        {f}
                      </button>
                    ))}
                    {selected.length >= 2 && (
                      <button onClick={handleCompare} style={{ marginLeft: "auto", padding: "7px 16px", background: T.indigo, border: "none", borderRadius: 20, color: "#1A1A18", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        📊 Compare {selected.length} Selected
                      </button>
                    )}
                  </div>

                  {loadingApps ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 10, color: T.ink4, fontSize: 13 }}>
                      <div style={{ width: 24, height: 24, border: `2px solid ${T.indigo3}`, borderTopColor: T.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Loading applications...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 0", color: T.ink4 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.ink3, marginBottom: 8 }}>
                        {applications.length === 0 ? "No Applications Yet" : "No applications match this filter"}
                      </div>
                      {applications.length === 0 && (
                        <>
                          <div style={{ fontSize: 13, color: T.ink4, marginBottom: 16 }}>Share the apply link to start receiving applications</div>
                          <button onClick={copyApplyLink} style={{ padding: "10px 20px", background: T.indigo3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.indigo, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                            🔗 Copy Apply Link
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 80px 100px 120px 110px auto", gap: 12, padding: "8px 14px", fontSize: 10, color: T.ink4, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={(e) => setSelected(e.target.checked ? filtered.map((a) => a.id) : [])} style={{ cursor: "pointer", accentColor: T.indigo }} />
                        <span>Candidate</span>
                        <span>Score</span>
                        <span>Exp Match</span>
                        <span>Recommendation</span>
                        <span>Status</span>
                        <span>Actions</span>
                      </div>

                      {filtered.map((app) => {
                        const sc  = scoreColor(app.atsScore || 0)
                        const isNew = app.appliedAt?.seconds && (Date.now() / 1000 - app.appliedAt.seconds) < 300
                        return (
                          <div key={app.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 80px 100px 120px 110px auto", gap: 12, alignItems: "center", padding: "12px 14px", background: selected.includes(app.id) ? T.indigo3 : T.cream, border: `1px solid ${T.border}`, borderRadius: 12, transition: "all 0.15s", boxShadow: T.shadow }}>
                            <input type="checkbox" checked={selected.includes(app.id)} onChange={() => toggleSelect(app.id)} style={{ cursor: "pointer", accentColor: T.indigo }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, display: "flex", alignItems: "center", gap: 6 }}>
                                {app.candidateName}
                                {isNew && <span style={{ fontSize: 9, color: T.green, background: T.green2, border: `1px solid ${T.border}`, padding: "1px 6px", borderRadius: 20, animation: "pulse 1.5s infinite" }}>NEW</span>}
                              </div>
                              <div style={{ fontSize: 11, color: T.ink4 }}>{app.candidateEmail}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <ScoreRing score={app.atsScore || 0} size={38} />
                            </div>
                            <span style={{ fontSize: 12, color: app.experienceMatch === "Good" ? T.green : app.experienceMatch === "Partial" ? T.amber : T.red, fontWeight: 600 }}>
                              {app.experienceMatch || "—"}
                            </span>
                            <span style={{ fontSize: 11, color: recColor(app.recommendation), fontWeight: 600 }}>
                              {app.recommendation || "—"}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: app.status === "shortlisted" ? T.green : app.status === "feedback_sent" ? T.amber : T.ink4 }}>
                              {app.status === "pending" ? "⏳ Pending" : app.status === "shortlisted" ? "✓ Shortlisted" : "📧 Feedback Sent"}
                            </span>
                            <div style={{ display: "flex", gap: 5 }}>
                              {app.status === "pending" && (
                                <>
                                  <button onClick={() => handleDecision(app, "shortlist")} style={{ padding: "4px 10px", background: T.green2, border: `1px solid ${T.border}`, borderRadius: 6, color: T.green, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✓</button>
                                  <button onClick={() => handleDecision(app, "reject")}   style={{ padding: "4px 10px", background: T.red2, border: `1px solid ${T.border}`, borderRadius: 6, color: T.red, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✕</button>
                                </>
                              )}
                              {app.status !== "pending" && (
                                <button onClick={() => handleDecision(app, app.status === "shortlisted" ? "shortlist" : "reject")} style={{ padding: "4px 10px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 6, color: T.ink4, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>📧</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Bulk ATS View ── */}
              {view === "bulk-ats" && (
                <ApplicationsView
                  jobId={selectedJob.id}
                  jobTitle={selectedJob.title}
                  onBack={() => setView("applications")}
                />
              )}

            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {feedback && (
        <FeedbackModal
          candidate={feedback.candidate}
          decision={feedback.decision}
          job={selectedJob}
          onClose={() => setFeedback(null)}
          onSent={handleFeedbackSent}
        />
      )}
      {compareData && (
        <CompareView
          candidates={compareData}
          job={selectedJob}
          onClose={() => setCompareData(null)}
          onDecision={(c, d) => { setCompareData(null); handleDecision(c, d) }}
        />
      )}
      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onCreated={(job) => { setShowCreate(false); setSelectedJob(job) }}
        />
      )}
    </div>
  )
}
