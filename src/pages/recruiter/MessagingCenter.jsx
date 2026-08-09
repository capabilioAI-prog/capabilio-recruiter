import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

// 2026-08-09: this entire file previously talked to a disconnected demo
// backend (`https://capabilio-backend-production-60ab.up.railway.app/api/recruiter`,
// its own `threads`/`messages` tables) that no real candidate has ever
// received a message from -- confirmed via repo audit, zero shared state
// with the actual candidate-messaging data. Rewired to the REAL partner-
// bridge candidate messaging: GET/POST /api/partner/candidates/:id/message(s)
// on capabilio-recruiter-backend, which proxies to capabilio-web's
// `recruiter_messages` table (the same table the candidate can now read AND
// REPLY TO via Nexus.jsx's new Messages tab -- see that file for the other
// half of this feature).
//
// Threading model: capabilio-web's recruiter_messages has no thread id --
// a "thread" is just every message between this company and one candidate.
// There is also no single "list all my company's message threads" endpoint,
// so the thread list here is built from candidates this company has a real,
// on-record relationship with (this company's own pipeline_candidates +
// applications, both already RLS-scoped to this recruiter's company) --
// real data, not fabricated -- plus whichever candidate the recruiter just
// arrived from (Candidate Discovery's "Message" button, via navigate state)
// even if not yet in the pipeline.
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id:"intro", label:"👋 Introduction",
    body:`Hi [Name],

I came across your profile and was genuinely impressed by your experience. We have a position that I think could be a great fit for you.

Would you be open to a 15-minute call this week to explore? No pressure at all — just a conversation.

Best,
[Your Name]`,
  },
  {
    id:"followup", label:"🔄 Follow-up",
    body:`Hi [Name],

I wanted to follow up on my message from earlier this week.

I know you're busy, so I'll keep this brief — I truly think your background is a rare match for what we're building.

Happy to share more details or answer any questions. Would a quick call work for you?

Best,
[Your Name]`,
  },
  {
    id:"shortlist", label:"✅ Shortlist",
    body:`Hi [Name],

Congratulations! After reviewing your application, we'd love to move you forward in our process.

Please let me know your availability for a quick call.

Looking forward to speaking with you!

Best,
[Your Name]`,
  },
  {
    id:"offer", label:"🎉 Offer",
    body:`Hi [Name],

I have some exciting news — we'd love to formally extend you an offer!

I'll be sending over the full offer letter shortly, but wanted to give you a heads-up and make sure you're free to connect this week.

Talk soon,
[Your Name]`,
  },
]

// ── Message Bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isOwn = msg.direction === "outgoing"
  const time = msg.created_at ? new Date(msg.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : ""
  return (
    <div style={{ display:"flex", justifyContent: isOwn ? "flex-end" : "flex-start", marginBottom:12 }}>
      <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
        <div style={{
          background: isOwn ? T.indigo3 : T.cream2,
          border: `1px solid ${isOwn ? T.indigo+"44" : T.border}`,
          borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding:"10px 14px",
          color: isOwn ? T.indigo : T.ink,
          fontSize:13,
          lineHeight:1.6,
          whiteSpace:"pre-wrap",
          wordBreak:"break-word",
        }}>
          {msg.subject && <div style={{ fontWeight:700, marginBottom:4, fontSize:12 }}>{msg.subject}</div>}
          {msg.body}
        </div>
        <div style={{ fontSize:10, color:T.ink4, marginTop:4 }}>{time}</div>
      </div>
    </div>
  )
}

// ── Compose Area ──────────────────────────────────────────────────────────────
function ComposeArea({ candidateName, sending, onSend }) {
  const [body, setBody] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [showTpl, setShowTpl] = useState(false)
  const [purpose, setPurpose] = useState("introduction")
  const textRef = useRef()

  async function handleSend() {
    if (!body.trim() || sending) return
    const ok = await onSend(body.trim())
    if (ok) setBody("")
  }

  async function handleAIDraft() {
    setDrafting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/message-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ candidateName, purpose }),
      })
      const data = await res.json()
      if (res.ok && data.draft) setBody(data.draft)
    } catch (e) {
      console.error("AI draft failed:", e)
    } finally {
      setDrafting(false)
      textRef.current?.focus()
    }
  }

  function applyTemplate(tpl) {
    setBody(tpl.body.replace("[Name]", candidateName || "[Name]"))
    setShowTpl(false)
    textRef.current?.focus()
  }

  return (
    <div style={{ borderTop:`1px solid ${T.border}`, padding:"14px 16px", background:T.cream3 }}>
      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
        <button onClick={handleAIDraft} disabled={drafting} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:T.indigo3, border:`1px solid ${T.indigo}44`, borderRadius:20, color:T.indigo, fontSize:11, fontWeight:600, cursor:"pointer" }}>
          {drafting ? "✨ Writing…" : "✨ AI Draft"}
        </button>
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowTpl(t => !t)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:20, color:T.ink3, fontSize:11, fontWeight:600, cursor:"pointer" }}>
            📝 Templates
          </button>
          {showTpl && (
            <div style={{ position:"absolute", bottom:32, left:0, background:T.cream, border:`1px solid ${T.border}`, borderRadius:12, padding:"6px 0", zIndex:20, minWidth:200, boxShadow:T.shadow2 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)} style={{ display:"block", width:"100%", padding:"8px 14px", background:"none", border:"none", color:T.ink2, fontSize:12, textAlign:"left", cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <select value={purpose} onChange={e => setPurpose(e.target.value)} style={{ padding:"5px 10px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:20, color:T.ink3, fontSize:11, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
          {["introduction","follow-up","shortlist","offer","rejection","general"].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
        <textarea
          ref={textRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={`Message ${candidateName || "candidate"}…`}
          rows={3}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend() }}
          style={{ flex:1, padding:"10px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, color:T.ink, fontSize:13, lineHeight:1.6, resize:"none", fontFamily:"'Inter',sans-serif", outline:"none" }}
        />
        <button onClick={handleSend} disabled={sending || !body.trim()} style={{ padding:"10px 18px", background: sending || !body.trim() ? T.indigo3 : T.indigo, border:"none", borderRadius:12, color: sending || !body.trim() ? T.indigo : "#1A1A18", fontWeight:700, fontSize:13, cursor: body.trim() ? "pointer" : "not-allowed", height:44, whiteSpace:"nowrap" }}>
          {sending ? "…" : "Send ↑"}
        </button>
      </div>
      <div style={{ fontSize:10, color:T.ink4, marginTop:6 }}>⌘↩ to send</div>
    </div>
  )
}

// ── Thread List Item ──────────────────────────────────────────────────────────
function ThreadItem({ candidate, active, onClick }) {
  return (
    <div onClick={onClick} style={{ padding:"12px 16px", cursor:"pointer", background: active ? T.indigo3 : "transparent", borderLeft: active ? `2px solid ${T.indigo}` : "2px solid transparent", borderBottom:`1px solid ${T.border}`, transition:"all 0.15s" }}>
      <div style={{ fontSize:13, fontWeight:600, color:T.ink2 }}>{candidate.name}</div>
      {candidate.context && (
        <div style={{ fontSize:10, color:T.indigo, marginTop:4 }}>◆ {candidate.context}</div>
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function MessagingCenter() {
  const location = useLocation()
  const seed = location.state // { candidateId, candidateName, pathType } — set by CandidateSearch/CandidateDetail's "Message" button

  const [candidates, setCandidates] = useState([]) // real candidates this company has a relationship with
  const [activeId, setActiveId] = useState(seed?.candidateId || null)
  const [messages, setMessages] = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [search, setSearch] = useState("")

  // Build the candidate list from this company's OWN real records
  // (pipeline_candidates + applications, both RLS-scoped) rather than a
  // fabricated or empty list -- this company has genuinely engaged with
  // every candidate that shows up here. The seeded candidate (if any, from
  // navigate state) is added even if not yet in either table, since a
  // recruiter can message someone straight from Candidate Discovery before
  // shortlisting them.
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [pipelineRes, appsRes] = await Promise.all([
        supabase.from("pipeline_candidates").select("candidate_id, name, job_title").not("candidate_id", "is", null),
        supabase.from("applications").select("candidate_id, name, job_id").not("candidate_id", "is", null),
      ])
      if (cancelled) return
      const byId = new Map()
      for (const r of pipelineRes.data || []) {
        if (!byId.has(r.candidate_id)) byId.set(r.candidate_id, { id: r.candidate_id, name: r.name, context: r.job_title || "" })
      }
      for (const r of appsRes.data || []) {
        if (!byId.has(r.candidate_id)) byId.set(r.candidate_id, { id: r.candidate_id, name: r.name, context: "" })
      }
      if (seed?.candidateId && !byId.has(seed.candidateId)) {
        byId.set(seed.candidateId, { id: seed.candidateId, name: seed.candidateName || "Candidate", context: "" })
      }
      setCandidates([...byId.values()])
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(
    () => candidates.filter(c => c.name?.toLowerCase().includes(search.toLowerCase())),
    [candidates, search]
  )
  const active = candidates.find(c => c.id === activeId)

  const loadMessages = useCallback(async (silent = false) => {
    if (!activeId) return
    if (!silent) setLoadingMsgs(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/partner/candidates/${activeId}/messages`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setMessages(body.messages || [])
    } catch (e) {
      console.error("Failed to load message thread:", e)
    } finally {
      if (!silent) setLoadingMsgs(false)
    }
  }, [activeId])

  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => {
    if (!activeId) return
    const interval = setInterval(() => loadMessages(true), 15000)
    return () => clearInterval(interval)
  }, [activeId, loadMessages])

  async function handleSend(body) {
    if (!active) return false
    setSending(true)
    setSendError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/partner/candidates/${active.id}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        // linkId omitted -- this UI doesn't currently resolve a college
        // connection linkId for student-path candidates. If the candidate
        // requires one (student path, no approved access request yet), the
        // backend's checkStudentAccessGate 403s with a clear reason, shown
        // below rather than silently failing.
        body: JSON.stringify({ body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      await loadMessages(true)
      return true
    } catch (e) {
      console.error("Failed to send message:", e)
      setSendError(e.message)
      return false
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ fontFamily:"'Inter',sans-serif", color:T.ink, height:"calc(100vh - 120px)", display:"flex", flexDirection:"column" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        input:focus,textarea:focus { outline:none; }
      `}</style>

      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:T.ink, margin:0 }}>Messages</h1>
        <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>
          {candidates.length} candidate{candidates.length === 1 ? "" : "s"} you've engaged with
        </p>
      </div>

      <div style={{ flex:1, display:"grid", gridTemplateColumns:"300px 1fr", gap:0, background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden", minHeight:0, boxShadow:T.shadow }}>

        <div style={{ borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden", background:T.cream2 }}>
          <div style={{ padding:"12px 14px", borderBottom:`1px solid ${T.border}` }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates…"
              style={{ width:"100%", padding:"8px 12px", background:T.cream3, border:`1px solid ${T.border}`, borderRadius:8, color:T.ink, fontSize:12, fontFamily:"'Inter',sans-serif", boxSizing:"border-box" }}
            />
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px", color:T.ink4 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
                <div style={{ fontSize:13, color:T.ink3 }}>No conversations yet</div>
                <div style={{ fontSize:11, color:T.ink4, marginTop:6 }}>Message a candidate from Candidate Discovery or your Pipeline to start one.</div>
              </div>
            ) : (
              filtered.map(c => (
                <ThreadItem key={c.id} candidate={c} active={activeId === c.id} onClick={() => setActiveId(c.id)} />
              ))
            )}
          </div>
        </div>

        {active ? (
          <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", background:T.cream }}>
            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>{active.name}</div>
                {active.context && <div style={{ fontSize:11, color:T.ink3 }}>{active.context}</div>}
              </div>
              <span style={{ fontSize:11, color:T.indigo, background:T.indigo3, border:`1px solid ${T.indigo}33`, padding:"3px 10px", borderRadius:20 }}>
                {messages.length} messages
              </span>
            </div>

            <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", background:T.cream }}>
              {loadingMsgs ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", gap:10, color:T.ink3 }}>
                  <div style={{ width:22, height:22, border:`2px solid ${T.indigo}33`, borderTopColor:T.indigo, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                  Loading…
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12, color:T.ink4 }}>
                  <div style={{ fontSize:40 }}>💬</div>
                  <div style={{ fontSize:13, color:T.ink3 }}>No messages yet. Say hello!</div>
                </div>
              ) : (
                messages.map(msg => <Bubble key={msg.id} msg={msg} />)
              )}
            </div>

            {sendError && (
              <div style={{ padding:"8px 20px", color:T.red, fontSize:12, background:`${T.red}10`, borderTop:`1px solid ${T.red}30` }}>
                Couldn't send: {sendError}
              </div>
            )}

            <ComposeArea candidateName={active.name} sending={sending} onSend={handleSend} />
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:T.ink4, gap:12, background:T.cream }}>
            <div style={{ fontSize:52 }}>💬</div>
            <div style={{ fontSize:15, fontWeight:600, color:T.ink2 }}>Select a conversation</div>
          </div>
        )}
      </div>
    </div>
  )
}
