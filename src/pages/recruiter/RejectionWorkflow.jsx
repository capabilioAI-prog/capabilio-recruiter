import { useState, useEffect, useCallback } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

// 2026-08-09: /generate-feedback and /send-feedback now require auth on the
// backend (were previously open, unauthenticated -- AI cost + email-relay
// abuse risk).
async function authHeaders(extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    ...extra,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

// 2026-08-06: REWRITTEN. This page used to read a Firebase `users`
// collection (disconnected from both Supabase projects), fabricate a fake
// "gap analysis" from a hardcoded ELO-threshold rule function, and its
// "Send" button only called local setSent(true) — no email, no Supabase
// write, nothing real happened, while the UI claimed the candidate
// "received their rejection email." That's a direct violation of "never be
// misleading" — a recruiter using this screen would reasonably believe
// candidates were actually notified when none were.
//
// Meanwhile ApplicationsView.jsx already has a REAL version of this exact
// workflow (FeedbackModal): real `applications` rows, real AI draft via
// POST /generate-feedback, real send via POST /send-feedback + a real
// `applications` update (feedback_sent/feedback_text/rejected_at). This
// page now reuses that same backend contract and the same `applications`
// columns — one real system, two UI entry points, not two disconnected
// ones. This page's job specifically: "rejections pending communication"
// (an existing dashboard metric) — applications already marked `rejected`
// that haven't had feedback sent yet.
function fromDbApplication(row, jobTitle) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    score: row.score,
    missingSkills: row.missing_skills || [],
    matchedSkills: row.matched_skills || [],
    atsSummary: row.ats_summary || "",
    jobTitle,
    rejectedAt: row.rejected_at,
  }
}

function ScorePill({ score }) {
  if (typeof score !== "number") return <span style={{ fontSize:11, color:T.ink4 }}>Not scored</span>
  const color = score >= 75 ? T.green : score >= 50 ? T.amber : T.red
  const bg = score >= 75 ? T.green2 : score >= 50 ? T.amber2 : T.red2
  return <span style={{ fontSize:11, fontWeight:700, color, background:bg, border:`1px solid ${color}30`, borderRadius:7, padding:"3px 9px" }}>{score}/100</span>
}

export default function RejectionWorkflow() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [sentIds, setSentIds] = useState(new Set())
  const [preview, setPreview] = useState("recruiter")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [appsRes, jobsRes] = await Promise.all([
        supabase.from("applications").select("*")
          .eq("status", "rejected")
          .or("feedback_sent.is.null,feedback_sent.eq.false")
          .order("rejected_at", { ascending: false }),
        supabase.from("jobs").select("id,title"),
      ])
      if (appsRes.error) throw appsRes.error
      const jobsById = Object.fromEntries((jobsRes.data || []).map((j) => [j.id, j.title]))
      const rows = (appsRes.data || []).map((row) => fromDbApplication(row, jobsById[row.job_id] || row.job_description?.slice(0, 40) || "—"))
      setApplications(rows)
      if (rows.length && !rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id)
    } catch (err) {
      console.error("Failed to load rejected applications:", err)
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = applications.find((a) => a.id === selectedId) || null

  const generateFeedback = useCallback(async (candidate) => {
    if (!candidate) return
    setGenerating(true)
    setFeedbackText("")
    try {
      const res = await fetch(`${BACKEND}/generate-feedback`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          candidateName: candidate.name,
          jobTitle: candidate.jobTitle,
          score: candidate.score,
          missingSkills: candidate.missingSkills,
          atsSummary: candidate.atsSummary,
          strengths: candidate.matchedSkills,
        }),
      })
      const data = await res.json()
      setFeedbackText(data.feedback || "")
    } catch (err) {
      console.error("Failed to generate feedback:", err)
    } finally {
      setGenerating(false)
    }
  }, [])

  useEffect(() => {
    if (selected) { setSendError(""); generateFeedback(selected) }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    if (!selected || !feedbackText.trim()) return
    setSending(true)
    setSendError("")
    try {
      const { error: updateErr } = await supabase.from("applications").update({
        feedback_sent: true,
        feedback_text: feedbackText,
      }).eq("id", selected.id)
      if (updateErr) throw updateErr

      const sendRes = await fetch(`${BACKEND}/send-feedback`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ candidateEmail: selected.email, candidateName: selected.name, feedback: feedbackText }),
      })
      const sendBody = await sendRes.json().catch(() => ({}))
      if (!sendRes.ok || sendBody.sent === false) {
        // Applications row is already marked feedback_sent — this matters:
        // we'd rather a recruiter re-check/resend manually than have this
        // page silently retry and risk a duplicate email. Surface the error
        // instead of pretending it worked.
        throw new Error(sendBody.error || "Email delivery failed")
      }
      setSentIds((s) => new Set(s).add(selected.id))
    } catch (err) {
      console.error("Failed to send rejection feedback:", err)
      setSendError(err.message || "Failed to send. The candidate has not been notified.")
    } finally {
      setSending(false)
    }
  }

  const justSent = selected && sentIds.has(selected.id)

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ background:T.indigo3, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>📬 Rejection Feedback</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          Real applications marked <strong>rejected</strong> that haven't had feedback sent yet. AI drafts a respectful, specific message from the candidate's actual score and skill gaps — you review and edit before it goes out. Nothing is sent until you click Send.
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16, alignItems:"start" }}>
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:16, boxShadow:T.shadow }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:T.ink, marginBottom:12 }}>Pending Communication</div>
          {loading ? (
            <div style={{ color:T.ink4, fontSize:13 }}>Loading...</div>
          ) : loadError ? (
            <div style={{ color:T.red, fontSize:12 }}>Couldn't load: {loadError}</div>
          ) : applications.length === 0 ? (
            <div style={{ color:T.ink4, fontSize:12, lineHeight:1.5 }}>No rejected applications are waiting on feedback right now.</div>
          ) : applications.map((c) => {
            const isSelected = selectedId === c.id
            const initials = (c.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            return (
              <div key={c.id} onClick={() => setSelectedId(c.id)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px", borderRadius:10, cursor:"pointer", marginBottom:4, background: isSelected ? T.indigo3 : "transparent", border:`1px solid ${isSelected ? T.indigo + "30" : "transparent"}` }}>
                <div style={{ width:32, height:32, borderRadius:9, background:`${T.indigo}15`, color:T.indigo, border:`1px solid ${T.indigo}35`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:12, flexShrink:0 }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: isSelected ? T.indigo : T.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name || "—"}</div>
                  <div style={{ fontSize:10, color:T.ink4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.jobTitle}</div>
                </div>
                {sentIds.has(c.id) && <span style={{ fontSize:10, color:T.green }}>✓</span>}
              </div>
            )
          })}
        </div>

        {selected && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", gap:8 }}>
              {[["recruiter","🔎 Score & Gaps"],["candidate","📬 Message to Candidate"]].map(([v, l]) => (
                <button key={v} onClick={() => setPreview(v)}
                  style={{ fontSize:12, padding:"7px 14px", borderRadius:9, border:"1px solid", cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600, background: preview === v ? T.indigo3 : "transparent", borderColor: preview === v ? `${T.indigo}40` : T.border, color: preview === v ? T.indigo : T.ink4 }}>
                  {l}
                </button>
              ))}
            </div>

            {preview === "recruiter" ? (
              <div style={{ background:T.cream, border:`1px solid ${T.indigo}20`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.indigo, marginBottom:14 }}>{selected.name} — {selected.jobTitle}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                  <div style={{ padding:"12px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10 }}>
                    <div style={{ fontSize:11, color:T.ink4, marginBottom:4 }}>ATS Score</div>
                    <ScorePill score={selected.score} />
                  </div>
                  <div style={{ padding:"12px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10 }}>
                    <div style={{ fontSize:11, color:T.ink4, marginBottom:4 }}>Rejected</div>
                    <div style={{ fontSize:13, color:T.ink }}>{selected.rejectedAt ? new Date(selected.rejectedAt).toLocaleDateString() : "—"}</div>
                  </div>
                </div>
                {selected.atsSummary && (
                  <div style={{ marginBottom:14, fontSize:12, color:T.ink3, lineHeight:1.6 }}>{selected.atsSummary}</div>
                )}
                {selected.matchedSkills.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:T.green, marginBottom:6 }}>Matched skills</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {selected.matchedSkills.map((s) => <span key={s} style={{ fontSize:11, color:T.green, background:T.green2, border:`1px solid ${T.green}30`, borderRadius:6, padding:"2px 8px" }}>{s}</span>)}
                    </div>
                  </div>
                )}
                {selected.missingSkills.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:T.red, marginBottom:6 }}>Gap skills</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {selected.missingSkills.map((s) => <span key={s} style={{ fontSize:11, color:T.red, background:T.red2, border:`1px solid ${T.red}30`, borderRadius:6, padding:"2px 8px" }}>{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background:T.cream, border:`1px solid ${T.green}20`, borderRadius:16, padding:24, boxShadow:T.shadow }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:T.ink, marginBottom:16 }}>📬 Message to {selected.name}</div>

                {generating ? (
                  <div style={{ textAlign:"center", padding:"30px 0", color:T.ink4, fontSize:13 }}>Drafting personalised feedback...</div>
                ) : justSent ? (
                  <div style={{ padding:"14px", background:T.green2, border:`1px solid ${T.green}25`, borderRadius:12, textAlign:"center" }}>
                    <div style={{ fontSize:18 }}>✅</div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.green, marginTop:6 }}>Sent — {selected.name} was emailed this feedback.</div>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={14}
                      style={{ width:"100%", padding:"14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, fontSize:13, color:T.ink2, lineHeight:1.7, fontFamily:"'Inter',sans-serif", boxSizing:"border-box", resize:"vertical" }}
                    />
                    {sendError && (
                      <div style={{ marginTop:10, fontSize:12, color:T.red, background:T.red2, border:`1px solid ${T.red}30`, borderRadius:8, padding:"8px 12px" }}>{sendError}</div>
                    )}
                    <button onClick={handleSend} disabled={sending || !feedbackText.trim()}
                      style={{ marginTop:16, width:"100%", padding:"12px", background: sending ? T.ink3 : T.ink, border:"none", borderRadius:12, color:T.cream, fontSize:14, fontWeight:700, cursor: sending ? "default" : "pointer", fontFamily:"'Inter',sans-serif" }}>
                      {sending ? "Sending..." : `📬 Send Feedback to ${selected.name}`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
