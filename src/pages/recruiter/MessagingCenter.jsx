import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T, card, cardLg, tag, btn } from "./theme"

function fromDbThread(row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email,
    jobTitle: row.job_title,
    background: row.background,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    unread: row.unread,
    isBulk: row.is_bulk,
    createdAt: row.created_at,
  }
}

function toDbThread(payload) {
  return {
    candidate_id: payload.candidateId,
    candidate_name: payload.candidateName,
    candidate_email: payload.candidateEmail,
    job_title: payload.jobTitle,
    background: payload.background,
    last_message: payload.lastMessage,
    last_message_at: payload.lastMessageAt,
    unread: payload.unread,
    is_bulk: payload.isBulk,
  }
}

function fromDbMessage(row) {
  return {
    id: row.id,
    threadId: row.thread_id,
    body: row.body,
    senderType: row.sender_type,
    senderName: row.sender_name,
    read: row.read,
    createdAt: row.created_at,
  }
}




const BACKEND = "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter"

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id:"intro", label:"👋 Introduction",
    subject:"Exciting opportunity at [Company]",
    body:`Hi [Name],

I came across your profile and was genuinely impressed by your experience in [skill/domain]. We have a [role] position that I think could be a great fit for you.

The role offers [key benefit], and the team is working on [exciting thing].

Would you be open to a 15-minute call this week to explore? No pressure at all — just a conversation.

Best,
[Your Name]`,
  },
  {
    id:"followup", label:"🔄 Follow-up",
    subject:"Following up — [Role] at [Company]",
    body:`Hi [Name],

I wanted to follow up on my message from earlier this week about the [role] opportunity.

I know you're busy, so I'll keep this brief — I truly think your background in [skill] is a rare match for what we're building.

Happy to share more details or answer any questions. Would a quick call work for you?

Best,
[Your Name]`,
  },
  {
    id:"shortlist", label:"✅ Shortlist",
    subject:"Great news — you've been shortlisted!",
    body:`Hi [Name],

Congratulations! After reviewing your application, we'd love to move you forward in our process for the [role] position.

Next step: [interview type] — approximately [duration].

Please let me know your availability or use the link below to book a slot.

Looking forward to speaking with you!

Best,
[Your Name]`,
  },
  {
    id:"offer", label:"🎉 Offer",
    subject:"An offer you'll want to read 🎉",
    body:`Hi [Name],

I have some exciting news — we'd love to formally extend you an offer for the [role] position!

I'll be sending over the full offer letter shortly, but wanted to give you a heads-up and make sure you're free to connect this week.

We're genuinely excited about having you join the team.

Talk soon,
[Your Name]`,
  },
]

// ── AI Draft ─────────────────────────────────────────────────────────────────
async function aiDraftMessage(context) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:600,
        messages:[{ role:"user", content:
`Write a personalised, warm recruiter message.
Candidate: ${context.candidateName}
Their background: ${context.background || "software engineering"}
Role: ${context.jobTitle || "an open position"}
Purpose: ${context.purpose || "introduction"}
Tone: professional but warm, never salesy

Return ONLY the message body text (no subject line, no JSON). Use \\n for line breaks.` }]
      })
    })
    const data = await res.json()
    return data.content?.[0]?.text || ""
  } catch { return "" }
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isOwn }) {
  const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" }) : ""
  return (
    <div style={{ display:"flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems:"flex-end", gap:8, marginBottom:12 }}>
      {!isOwn && (
        <div style={{ width:28, height:28, borderRadius:"50%", background:T.indigo3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0, color:T.indigo, fontWeight:700 }}>
          {msg.senderName?.[0] || "C"}
        </div>
      )}
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
          {msg.body}
        </div>
        <div style={{ fontSize:10, color:T.ink4, marginTop:4 }}>
          {time} {isOwn && (msg.read ? "· Read" : "· Sent")}
        </div>
      </div>
    </div>
  )
}

// ── Compose Area ──────────────────────────────────────────────────────────────
function ComposeArea({ threadId, recipientName, recipientBackground, jobTitle, onSent }) {
  const [body,       setBody]       = useState("")
  const [sending,    setSending]    = useState(false)
  const [drafting,   setDrafting]   = useState(false)
  const [showTpl,    setShowTpl]    = useState(false)
  const [purpose,    setPurpose]    = useState("introduction")
  const textRef = useRef()

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    try {
      const { error: msgErr } = await supabase.from("messages").insert({
        thread_id: threadId,
        body: body.trim(),
        sender_type: "recruiter",
        sender_name: "You",
        read: false,
      })
      if (msgErr) throw msgErr
      const { error: threadErr } = await supabase.from("threads").update({
        last_message: body.trim().slice(0,80),
        last_message_at: new Date().toISOString(),
        unread: false,
      }).eq("id", threadId)
      if (threadErr) throw threadErr
      setBody("")
      onSent?.()
    } catch(e) { console.error(e) }
    setSending(false)
  }

  async function handleAIDraft() {
    setDrafting(true)
    const draft = await aiDraftMessage({ candidateName: recipientName, background: recipientBackground, jobTitle, purpose })
    setBody(draft)
    setDrafting(false)
    textRef.current?.focus()
  }

  function applyTemplate(tpl) {
    let b = tpl.body.replace("[Name]", recipientName || "[Name]")
    setBody(b)
    setShowTpl(false)
    textRef.current?.focus()
  }

  return (
    <div style={{ borderTop:`1px solid ${T.border}`, padding:"14px 16px", background:T.cream3 }}>
      {/* AI tools bar */}
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
                <button key={t.id} onClick={() => applyTemplate(t)} style={{ display:"block", width:"100%", padding:"8px 14px", background:"none", border:"none", color:T.ink2, fontSize:12, textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <select value={purpose} onChange={e => setPurpose(e.target.value)} style={{ padding:"5px 10px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:20, color:T.ink3, fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          {["introduction","follow-up","shortlist","offer","rejection","general"].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
        <textarea
          ref={textRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={`Message ${recipientName || "candidate"}…`}
          rows={3}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend() }}
          style={{ flex:1, padding:"10px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, color:T.ink, fontSize:13, lineHeight:1.6, resize:"none", fontFamily:"'DM Sans',sans-serif", outline:"none" }}
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
function ThreadItem({ thread, active, onClick }) {
  const time = thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : ""
  return (
    <div onClick={onClick} style={{ padding:"12px 16px", cursor:"pointer", background: active ? T.indigo3 : "transparent", borderLeft: active ? `2px solid ${T.indigo}` : "2px solid transparent", borderBottom:`1px solid ${T.border}`, transition:"all 0.15s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <div style={{ fontSize:13, fontWeight: thread.unread ? 700 : 600, color: thread.unread ? T.ink : T.ink2 }}>
          {thread.candidateName}
        </div>
        <div style={{ fontSize:10, color:T.ink4 }}>{time}</div>
      </div>
      <div style={{ fontSize:11, color:T.ink3, display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
        {thread.lastMessage || "No messages yet"}
      </div>
      {thread.jobTitle && (
        <div style={{ fontSize:10, color:T.indigo, marginTop:4 }}>◆ {thread.jobTitle}</div>
      )}
    </div>
  )
}

// ── New Thread Modal ──────────────────────────────────────────────────────────
function NewThreadModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ candidateName:"", candidateEmail:"", jobTitle:"", background:"" })
  const [saving, setSaving] = useState(false)
  const iStyle = {
    width:"100%", padding:"10px 12px",
    background:T.cream3, border:`1px solid ${T.border}`,
    borderRadius:10, color:T.ink, fontSize:13,
    fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box",
  }

  async function handleCreate() {
    if (!form.candidateName) return
    setSaving(true)
    const { data, error } = await supabase.from("threads").insert(toDbThread({
      ...form,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unread: false,
    })).select().single()
    if (error) { console.error("Failed to create thread:", error); setSaving(false); return }
    onCreated(fromDbThread(data))
    setSaving(false)
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(26,26,24,0.5)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:20, padding:28, width:"100%", maxWidth:480, fontFamily:"'DM Sans',sans-serif", boxShadow:T.shadow2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:T.ink, margin:0 }}>New Conversation</h2>
          <button onClick={onClose} style={{ background:T.cream3, border:`1px solid ${T.border}`, color:T.ink3, width:32, height:32, borderRadius:8, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Candidate Name *</div>
            <input value={form.candidateName} onChange={e => setForm(f => ({...f,candidateName:e.target.value}))} placeholder="Alex Johnson" style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Email</div>
            <input value={form.candidateEmail} onChange={e => setForm(f => ({...f,candidateEmail:e.target.value}))} placeholder="alex@email.com" style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Job Title / Role</div>
            <input value={form.jobTitle} onChange={e => setForm(f => ({...f,jobTitle:e.target.value}))} placeholder="Senior Engineer" style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:T.ink4, marginBottom:6 }}>Their Background (for AI drafts)</div>
            <input value={form.background} onChange={e => setForm(f => ({...f,background:e.target.value}))} placeholder="React developer, 5 years, ex-Stripe..." style={iStyle} />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10, color:T.ink3, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || !form.candidateName} style={{ flex:2, padding:"11px", background:T.indigo, border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {saving ? "Creating…" : "Start Conversation →"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function MessagingCenter() {
  const [threads,       setThreads]       = useState([])
  const [activeThread,  setActiveThread]  = useState(null)
  const [messages,      setMessages]      = useState([])
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [showNew,       setShowNew]       = useState(false)
  const [search,        setSearch]        = useState("")
  const bottomRef = useRef()

  useEffect(() => {
    let cancelled = false
    supabase.from("threads").select("*").order("last_message_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error("Failed to load threads:", error); return }
        setThreads((data || []).map(fromDbThread))
      })
    const channel = supabase
      .channel("threads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "threads" }, (payload) => {
        setThreads((prev) => {
          if (payload.eventType === "INSERT") {
            const next = [...prev, fromDbThread(payload.new)]
            next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
            return next
          }
          if (payload.eventType === "UPDATE") {
            const next = prev.map((t) => (t.id === payload.new.id ? fromDbThread(payload.new) : t))
            next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
            return next
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((t) => t.id !== payload.old.id)
          }
          return prev
        })
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!activeThread) return
    setLoadingMsgs(true)
    let cancelled = false
    supabase.from("messages").select("*").eq("thread_id", activeThread.id).order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error("Failed to load messages:", error); setLoadingMsgs(false); return }
        setMessages((data || []).map(fromDbMessage))
        setLoadingMsgs(false)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100)
      })
    const channel = supabase
      .channel(`messages-changes-${activeThread.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `thread_id=eq.${activeThread.id}` }, (payload) => {
        setMessages((prev) => {
          if (payload.eventType === "INSERT") {
            const next = [...prev, fromDbMessage(payload.new)]
            next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            return next
          }
          if (payload.eventType === "UPDATE") {
            return prev.map((m) => (m.id === payload.new.id ? fromDbMessage(payload.new) : m))
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((m) => m.id !== payload.old.id)
          }
          return prev
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100)
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [activeThread?.id])

  const filtered = threads.filter(t =>
    t.candidateName?.toLowerCase().includes(search.toLowerCase()) ||
    t.jobTitle?.toLowerCase().includes(search.toLowerCase())
  )

  const unreadCount = threads.filter(t => t.unread).length

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:T.ink, height:"calc(100vh - 120px)", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform:rotate(360deg) } }
        input:focus,textarea:focus { outline:none; }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-thumb { background:${T.indigo}44; border-radius:2px }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.ink, margin:0 }}>Messages</h1>
            <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>
              {threads.length} conversations{unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
            </p>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setShowNew(true)} style={{ padding:"9px 20px", background:T.indigo, border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:T.shadow }}>
            + New Message
          </button>
        </div>
      </div>

      {/* Chat layout */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"300px 1fr", gap:0, background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden", minHeight:0, boxShadow:T.shadow }}>

        {/* Thread list */}
        <div style={{ borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden", background:T.cream2 }}>
          {/* Search */}
          <div style={{ padding:"12px 14px", borderBottom:`1px solid ${T.border}` }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{ width:"100%", padding:"8px 12px", background:T.cream3, border:`1px solid ${T.border}`, borderRadius:8, color:T.ink, fontSize:12, fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" }}
            />
          </div>

          {/* Thread items */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px", color:T.ink4 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
                <div style={{ fontSize:13, color:T.ink3 }}>No conversations yet</div>
                <button onClick={() => setShowNew(true)} style={{ marginTop:12, padding:"7px 16px", background:T.indigo3, border:`1px solid ${T.indigo}44`, borderRadius:8, color:T.indigo, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  Start one
                </button>
              </div>
            ) : (
              filtered.map(t => (
                <ThreadItem key={t.id} thread={t} active={activeThread?.id === t.id} onClick={() => setActiveThread(t)} />
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        {activeThread ? (
          <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", background:T.cream }}>
            {/* Chat header */}
            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>{activeThread.candidateName}</div>
                <div style={{ fontSize:11, color:T.ink3 }}>
                  {activeThread.candidateEmail}
                  {activeThread.jobTitle ? ` · ${activeThread.jobTitle}` : ""}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <span style={{ fontSize:11, color:T.indigo, background:T.indigo3, border:`1px solid ${T.indigo}33`, padding:"3px 10px", borderRadius:20 }}>
                  {messages.length} messages
                </span>
              </div>
            </div>

            {/* Messages */}
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
                <>
                  {messages.map(msg => (
                    <Bubble key={msg.id} msg={msg} isOwn={msg.senderType === "recruiter"} />
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Compose */}
            <ComposeArea
              threadId={activeThread.id}
              recipientName={activeThread.candidateName}
              recipientBackground={activeThread.background}
              jobTitle={activeThread.jobTitle}
              onSent={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 200)}
            />
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:T.ink4, gap:12, background:T.cream }}>
            <div style={{ fontSize:52 }}>💬</div>
            <div style={{ fontSize:15, fontWeight:600, color:T.ink2 }}>Select a conversation</div>
            <div style={{ fontSize:13, color:T.ink3 }}>or start a new one</div>
            <button onClick={() => setShowNew(true)} style={{ marginTop:8, padding:"9px 20px", background:T.indigo, border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              + New Message
            </button>
          </div>
        )}
      </div>

      {showNew && <NewThreadModal onClose={() => setShowNew(false)} onCreated={t => { setShowNew(false); setActiveThread(t) }} />}
    </div>
  )
}
