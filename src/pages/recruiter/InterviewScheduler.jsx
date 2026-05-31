import { useState, useEffect } from "react"
import {
  collection, addDoc, onSnapshot, query,
  orderBy, doc, updateDoc, deleteDoc, serverTimestamp, getDocs
} from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"


// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE CALENDAR INTEGRATION
//
// Setup (one-time):
//  1. Go to console.cloud.google.com → New project
//  2. Enable "Google Calendar API"
//  3. Create OAuth 2.0 credentials → Web application
//  4. Add your domain to "Authorised JavaScript origins"
//  5. Replace GOOGLE_CLIENT_ID below with your client ID
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"
const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events"

// Load the Google Identity Services script once
function loadGoogleScript() {
  return new Promise((resolve) => {
    if (window.google?.accounts) return resolve()
    const s = document.createElement("script")
    s.src = "https://accounts.google.com/gsi/client"
    s.onload = resolve
    document.head.appendChild(s)
  })
}

// Load gapi for Calendar API calls
function loadGapi() {
  return new Promise((resolve) => {
    if (window.gapi?.client) return resolve()
    const s = document.createElement("script")
    s.src = "https://apis.google.com/js/api.js"
    s.onload = () => {
      window.gapi.load("client", async () => {
        await window.gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY || "",
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
        })
        resolve()
      })
    }
    document.head.appendChild(s)
  })
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HOURS = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30",
               "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"]
const TYPES     = ["Video Call","Phone Screen","Technical","Panel","On-site","Culture Fit"]
const DURATIONS = [15,30,45,60,90]
const PLATFORMS = ["Google Meet","Zoom","Microsoft Teams","Phone","In-Person"]
const TYPE_ICON = { "Video Call":"🎥","Phone Screen":"📞","Technical":"💻","Panel":"👥","On-site":"🏢","Culture Fit":"🤝" }

const statusColor = (s) => s==="confirmed"?"#1A7A4A":s==="pending"?"#f59e0b":s==="cancelled"?"#ef4444":s==="completed"?"#3D4EAC":"#3A3A38"
const statusBg    = (s) => s==="confirmed"?"rgba(34,197,94,0.1)":s==="pending"?"rgba(245,158,11,0.1)":s==="cancelled"?"rgba(239,68,68,0.1)":s==="completed"?"rgba(61,78,172,0.1)":"rgba(100,116,139,0.1)"

function getDaysInMonth(year, month) { return new Date(year, month+1, 0).getDate() }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay() }
function formatDate(d) { return d.toISOString().split("T")[0] }
function todayStr() { return formatDate(new Date()) }

// ── Google Calendar Hook ───────────────────────────────────────────────────
function useGoogleCalendar() {
  const [gcalStatus, setGcalStatus] = useState("idle") // idle | connecting | connected | error
  const [accessToken, setAccessToken] = useState(null)
  const [tokenClient, setTokenClient] = useState(null)

  async function connect() {
    setGcalStatus("connecting")
    try {
      await loadGoogleScript()
      await loadGapi()

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GCAL_SCOPE,
        callback: (response) => {
          if (response.error) { setGcalStatus("error"); return }
          setAccessToken(response.access_token)
          window.gapi.client.setToken({ access_token: response.access_token })
          setGcalStatus("connected")
        },
      })
      setTokenClient(client)
      client.requestAccessToken()
    } catch (e) {
      console.error("Google Calendar connect error:", e)
      setGcalStatus("error")
    }
  }

  function disconnect() {
    if (accessToken) window.google?.accounts?.oauth2?.revoke(accessToken)
    setAccessToken(null)
    setGcalStatus("idle")
  }

  async function createEvent(interview) {
    if (!accessToken) throw new Error("Not connected to Google Calendar")

    const [hours, mins] = interview.time.split(":").map(Number)
    const start = new Date(`${interview.date}T${interview.time}:00`)
    const end   = new Date(start.getTime() + interview.duration * 60000)

    const event = {
      summary: `Interview: ${interview.candidateName} — ${interview.type}`,
      description: [
        `Role: ${interview.jobTitle || ""}`,
        `Type: ${interview.type}`,
        `Platform: ${interview.platform}`,
        interview.meetLink ? `Join: ${interview.meetLink}` : "",
        interview.notes ? `Notes: ${interview.notes}` : "",
        interview.interviewers ? `Interviewers: ${interview.interviewers}` : "",
      ].filter(Boolean).join("\n"),
      start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end:   { dateTime: end.toISOString(),   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      attendees: [
        interview.candidateEmail ? { email: interview.candidateEmail } : null,
        ...(interview.interviewers || "").split(",").map(e => e.trim()).filter(Boolean).map(email => ({ email })),
      ].filter(Boolean),
      conferenceData: interview.platform === "Google Meet" ? {
        createRequest: { requestId: `capabilio-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } }
      } : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email",  minutes: 24 * 60 },
          { method: "popup",  minutes: 30 },
        ],
      },
    }

    const response = await window.gapi.client.calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: interview.platform === "Google Meet" ? 1 : 0,
      sendUpdates: "all",
    })

    const createdEvent = response.result
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri

    return { gcalEventId: createdEvent.id, gcalEventLink: createdEvent.htmlLink, meetLink: meetLink || interview.meetLink }
  }

  async function deleteEvent(gcalEventId) {
    if (!accessToken || !gcalEventId) return
    try {
      await window.gapi.client.calendar.events.delete({ calendarId: "primary", eventId: gcalEventId, sendUpdates: "all" })
    } catch (e) { console.warn("Could not delete GCal event:", e) }
  }

  async function updateEvent(gcalEventId, interview) {
    if (!accessToken || !gcalEventId) return
    await deleteEvent(gcalEventId)
    return createEvent(interview)
  }

  return { gcalStatus, connect, disconnect, createEvent, deleteEvent, updateEvent }
}

// ── Google Calendar Status Banner ─────────────────────────────────────────────
function GCalBanner({ gcalStatus, onConnect, onDisconnect }) {
  if (gcalStatus === "connected") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:12, padding:"10px 16px", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>📆</span>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"#1A7A4A" }}>Google Calendar Connected</div>
          <div style={{ fontSize:11, color:"#3A3A38" }}>New interviews will sync automatically. Invites sent to attendees.</div>
        </div>
      </div>
      <button onClick={onDisconnect} style={{ padding:"5px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, color:"#f87171", fontSize:11, fontWeight:600, cursor:"pointer" }}>
        Disconnect
      </button>
    </div>
  )

  if (gcalStatus === "connecting") return (
    <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(61,78,172,0.06)", border:"1px solid rgba(61,78,172,0.2)", borderRadius:12, padding:"10px 16px", marginBottom:16 }}>
      <div style={{ width:16, height:16, border:"2px solid rgba(61,78,172,0.3)", borderTopColor:"#3D4EAC", borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
      <span style={{ fontSize:13, color:"#a5b4fc" }}>Connecting to Google Calendar…</span>
    </div>
  )

  if (gcalStatus === "error") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, padding:"10px 16px", marginBottom:16 }}>
      <div style={{ fontSize:13, color:"#f87171" }}>⚠️ Google Calendar connection failed. Check your Client ID in .env</div>
      <button onClick={onConnect} style={{ padding:"5px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, color:"#f87171", fontSize:11, cursor:"pointer" }}>Retry</button>
    </div>
  )

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"10px 16px", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>📆</span>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"#1A1A18" }}>Sync with Google Calendar</div>
          <div style={{ fontSize:11, color:"#3A3A38" }}>Auto-create events, send invites, add Meet links</div>
        </div>
      </div>
      <button onClick={onConnect} style={{ padding:"7px 16px", background:"linear-gradient(135deg,#3D4EAC,#8b5cf6)", border:"none", borderRadius:8, color:"#1A1A18", fontSize:12, fontWeight:700, cursor:"pointer" }}>
        🔗 Connect Google Calendar
      </button>
    </div>
  )
}

// ── Schedule Modal ─────────────────────────────────────────────────────────────
function ScheduleModal({ interview, candidates, onClose, onSaved, gcalStatus, onCreateGcalEvent }) {
  const isEdit = !!interview
  const [form, setForm] = useState({
    candidateId:    interview?.candidateId    || "",
    candidateName:  interview?.candidateName  || "",
    candidateEmail: interview?.candidateEmail || "",
    jobTitle:       interview?.jobTitle       || "",
    date:           interview?.date           || todayStr(),
    time:           interview?.time           || "10:00",
    duration:       interview?.duration       || 45,
    type:           interview?.type           || "Video Call",
    platform:       interview?.platform       || "Google Meet",
    interviewers:   interview?.interviewers   || "",
    notes:          interview?.notes          || "",
    meetLink:       interview?.meetLink       || "",
    syncToGcal:     gcalStatus === "connected",
  })
  const [saving,     setSaving]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [gcalSyncing,setGcalSyncing]= useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }))

  async function generateMeetLink() {
    setGenerating(true)
    const id = Math.random().toString(36).slice(2, 12)
    const link = form.platform === "Google Meet"
      ? `https://meet.google.com/${id.slice(0,3)}-${id.slice(3,7)}-${id.slice(7)}`
      : form.platform === "Zoom"
      ? `https://zoom.us/j/${Math.floor(Math.random()*9000000000+1000000000)}`
      : form.platform === "Microsoft Teams"
      ? `https://teams.microsoft.com/l/meetup-join/${id}` : ""
    set("meetLink", link)
    setGenerating(false)
  }

  async function handleSave() {
    if (!form.candidateName || !form.date || !form.time) return
    setSaving(true)
    try {
      let gcalData = {}

      // Sync to Google Calendar if connected and opted in
      if (form.syncToGcal && gcalStatus === "connected") {
        setGcalSyncing(true)
        try {
          gcalData = await onCreateGcalEvent(form) || {}
          if (gcalData.meetLink) set("meetLink", gcalData.meetLink)
        } catch (e) { console.warn("GCal sync failed:", e) }
        setGcalSyncing(false)
      }

      const payload = { ...form, ...gcalData, status:"pending", updatedAt: serverTimestamp() }
      if (isEdit) {
        await updateDoc(doc(db, "interviews", interview.id), payload)
      } else {
        payload.createdAt = serverTimestamp()
        await addDoc(collection(db, "interviews"), payload)
      }
      onSaved()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const iStyle = { width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#1A1A18", fontSize:13, fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(26,26,24,0.07)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#F6F6F1", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:28, width:"100%", maxWidth:600, maxHeight:"90vh", overflowY:"auto", fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11, color:"#3D4EAC", fontWeight:700, letterSpacing:"0.08em", marginBottom:4 }}>
              {isEdit ? "EDIT INTERVIEW" : "SCHEDULE INTERVIEW"}
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"#1A1A18", margin:0 }}>
              {isEdit ? "Update Interview" : "Book a Slot"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background:"rgba(26,26,24,0.06)", border:"none", color:"#6B6B68", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }}>✕</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Candidate Name *</div>
            {candidates.length > 0 ? (
              <select value={form.candidateId} onChange={(e) => {
                const c = candidates.find(c => c.id === e.target.value)
                if (c) { set("candidateId",c.id); set("candidateName",c.displayName||c.name||""); set("candidateEmail",c.email||"") }
              }} style={iStyle}>
                <option value="">Select candidate…</option>
                {candidates.map(c => <option key={c.id} value={c.id}>{c.displayName||c.name}</option>)}
              </select>
            ) : (
              <input value={form.candidateName} onChange={e => set("candidateName",e.target.value)} placeholder="e.g. Alex Johnson" style={iStyle} />
            )}
          </div>
          <div>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Candidate Email</div>
            <input value={form.candidateEmail} onChange={e => set("candidateEmail",e.target.value)} placeholder="alex@email.com" style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Job Title</div>
            <input value={form.jobTitle} onChange={e => set("jobTitle",e.target.value)} placeholder="e.g. Senior Engineer" style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Date *</div>
            <input type="date" value={form.date} onChange={e => set("date",e.target.value)} style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Time *</div>
            <select value={form.time} onChange={e => set("time",e.target.value)} style={iStyle}>
              {HOURS.map(h => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Duration</div>
            <select value={form.duration} onChange={e => set("duration",Number(e.target.value))} style={iStyle}>
              {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Interview Type</div>
            <select value={form.type} onChange={e => set("type",e.target.value)} style={iStyle}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Platform</div>
            <select value={form.platform} onChange={e => set("platform",e.target.value)} style={iStyle}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Meeting Link</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={form.meetLink} onChange={e => set("meetLink",e.target.value)} placeholder="https://meet.google.com/..." style={{ ...iStyle, flex:1 }} />
              {["Google Meet","Zoom","Microsoft Teams"].includes(form.platform) && gcalStatus !== "connected" && (
                <button onClick={generateMeetLink} disabled={generating} style={{ padding:"10px 14px", background:"rgba(61,78,172,0.15)", border:"1px solid rgba(61,78,172,0.3)", borderRadius:10, color:"#a5b4fc", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {generating ? "…" : "⚡ Generate"}
                </button>
              )}
            </div>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Interviewers (comma-separated emails)</div>
            <input value={form.interviewers} onChange={e => set("interviewers",e.target.value)} placeholder="manager@co.com, tech@co.com" style={iStyle} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <div style={{ fontSize:12, color:"#3A3A38", marginBottom:6 }}>Notes / Agenda</div>
            <textarea value={form.notes} onChange={e => set("notes",e.target.value)} rows={3} placeholder="Topics to cover, prep notes..." style={{ ...iStyle, resize:"vertical", lineHeight:1.6 }} />
          </div>

          {/* Google Calendar sync toggle */}
          {gcalStatus === "connected" && (
            <div style={{ gridColumn:"1/-1", background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1A7A4A" }}>📆 Sync to Google Calendar</div>
                <div style={{ fontSize:11, color:"#3A3A38" }}>
                  {form.platform === "Google Meet" ? "Will auto-create a Meet link" : "Will send calendar invites to attendees"}
                </div>
              </div>
              <div onClick={() => set("syncToGcal", !form.syncToGcal)} style={{ width:44, height:24, borderRadius:12, background: form.syncToGcal ? "#1A7A4A" : "rgba(26,26,24,0.09)", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:3, left: form.syncToGcal ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"#1A1A18", transition:"left 0.2s" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#6B6B68", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !form.candidateName || !form.date} style={{ flex:2, padding:"11px", background: saving ? "rgba(61,78,172,0.3)" : "linear-gradient(135deg,#3D4EAC,#8b5cf6)", border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {gcalSyncing ? "📆 Syncing to Calendar…" : saving ? "Saving…" : isEdit ? "Update Interview" : "📅 Schedule Interview"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Interview Card ─────────────────────────────────────────────────────────────
function InterviewCard({ iv, onEdit, onDelete, onStatusChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const sc = statusColor(iv.status)
  const sb = statusBg(iv.status)
  const isToday = iv.date === todayStr()

  return (
    <div style={{ background:"#F6F6F1", border:`1px solid ${isToday?"rgba(61,78,172,0.4)":"rgba(26,26,24,0.06)"}`, borderLeft:`3px solid ${isToday?"#3D4EAC":sc}`, borderRadius:14, padding:"16px 18px", position:"relative" }}>
      {isToday && <div style={{ position:"absolute", top:12, right:12, fontSize:10, color:"#3D4EAC", background:"rgba(61,78,172,0.12)", border:"1px solid rgba(61,78,172,0.25)", padding:"2px 8px", borderRadius:20, fontWeight:700 }}>TODAY</div>}
      {iv.gcalEventLink && <a href={iv.gcalEventLink} target="_blank" rel="noopener noreferrer" style={{ position:"absolute", top:12, right: isToday ? 74 : 12, fontSize:10, color:"#1A7A4A", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", padding:"2px 8px", borderRadius:20, textDecoration:"none" }}>📆 GCal</a>}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ flex:1, marginRight:8 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1A1A18", marginBottom:2 }}>{iv.candidateName}</div>
          <div style={{ fontSize:12, color:"#3A3A38" }}>{iv.jobTitle || "Interview"}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:sc, background:sb, border:`1px solid ${sc}40`, padding:"3px 10px", borderRadius:20 }}>{iv.status||"pending"}</span>
          <div style={{ position:"relative" }}>
            <button onClick={() => setMenuOpen(m => !m)} style={{ background:"rgba(26,26,24,0.06)", border:"none", color:"#6B6B68", width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:14 }}>⋯</button>
            {menuOpen && (
              <div style={{ position:"absolute", right:0, top:32, background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"6px 0", zIndex:10, minWidth:160 }} onMouseLeave={() => setMenuOpen(false)}>
                {["pending","confirmed","completed","cancelled"].map(s => (
                  <button key={s} onClick={() => { onStatusChange(iv.id,s); setMenuOpen(false) }} style={{ display:"block", width:"100%", padding:"8px 14px", background:"none", border:"none", color: iv.status===s?"#a5b4fc":"#6B6B68", fontSize:12, textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Mark {s}</button>
                ))}
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", margin:"4px 0" }} />
                <button onClick={() => { onEdit(iv); setMenuOpen(false) }} style={{ display:"block", width:"100%", padding:"8px 14px", background:"none", border:"none", color:"#6B6B68", fontSize:12, textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✏️ Edit</button>
                <button onClick={() => { onDelete(iv.id); setMenuOpen(false) }} style={{ display:"block", width:"100%", padding:"8px 14px", background:"none", border:"none", color:"#ef4444", fontSize:12, textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>🗑 Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:10 }}>
        <span style={{ fontSize:12, color:"#6B6B68" }}>📅 {iv.date}</span>
        <span style={{ fontSize:12, color:"#6B6B68" }}>🕐 {iv.time} ({iv.duration}min)</span>
        <span style={{ fontSize:12, color:"#6B6B68" }}>{TYPE_ICON[iv.type]||"🎯"} {iv.type}</span>
        <span style={{ fontSize:12, color:"#6B6B68" }}>📡 {iv.platform}</span>
      </div>

      {iv.meetLink && (
        <a href={iv.meetLink} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, color:"#3D4EAC", background:"rgba(61,78,172,0.08)", border:"1px solid rgba(61,78,172,0.2)", padding:"5px 12px", borderRadius:8, textDecoration:"none", marginBottom:8 }}>
          🔗 Join {iv.platform}
        </a>
      )}

      {iv.notes && <div style={{ fontSize:12, color:"#E8E8E1", lineHeight:1.5, marginTop:6, borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:8 }}>{iv.notes}</div>}
    </div>
  )
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ interviews, selectedDate, onSelectDate }) {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"]
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay    = getFirstDayOfMonth(viewYear, viewMonth)
  const interviewDates = new Set(interviews.map(iv => iv.date))

  function prevMonth() { if (viewMonth===0){setViewYear(y=>y-1);setViewMonth(11)}else setViewMonth(m=>m-1) }
  function nextMonth() { if (viewMonth===11){setViewYear(y=>y+1);setViewMonth(0)}else setViewMonth(m=>m+1) }

  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)

  return (
    <div style={{ background:"#F6F6F1", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <button onClick={prevMonth} style={{ background:"none", border:"none", color:"#3A3A38", cursor:"pointer", fontSize:16, padding:4 }}>‹</button>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:"#1A1A18" }}>{MONTHS[viewMonth]} {viewYear}</div>
        <button onClick={nextMonth} style={{ background:"none", border:"none", color:"#3A3A38", cursor:"pointer", fontSize:16, padding:4 }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:6 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:10, color:"#E8E8E1", fontWeight:700, padding:"2px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
          const isToday    = dateStr === todayStr()
          const isSelected = dateStr === selectedDate
          const hasIv      = interviewDates.has(dateStr)
          return (
            <div key={day} onClick={() => onSelectDate(dateStr)} style={{ position:"relative", textAlign:"center", padding:"6px 0", borderRadius:8, cursor:"pointer", background: isSelected?"#3D4EAC":isToday?"rgba(61,78,172,0.15)":"transparent", color: isSelected?"#1A1A18":isToday?"#a5b4fc":"#6B6B68", fontSize:12, fontWeight: isToday||isSelected?700:400 }}>
              {day}
              {hasIv && <div style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background: isSelected?"#1A1A18":"#3D4EAC" }} />}
            </div>
          )
        })}
      </div>
      <button onClick={() => { onSelectDate(todayStr()); setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }} style={{ marginTop:14, width:"100%", padding:"7px", background:"rgba(61,78,172,0.08)", border:"1px solid rgba(61,78,172,0.2)", borderRadius:8, color:"#a5b4fc", fontSize:12, fontWeight:600, cursor:"pointer" }}>
        Today
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function InterviewScheduler() {
  const [interviews,    setInterviews]   = useState([])
  const [loading,       setLoading]      = useState(true)
  const [showModal,     setShowModal]    = useState(false)
  const [editTarget,    setEditTarget]   = useState(null)
  const [selectedDate,  setSelectedDate] = useState(todayStr())
  const [filterStatus,  setFilterStatus] = useState("all")
  const [candidates,    setCandidates]   = useState([])
  const [viewMode,      setViewMode]     = useState("list")

  const { gcalStatus, connect, disconnect, createEvent, deleteEvent } = useGoogleCalendar()

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db,"interviews"), orderBy("date","asc")),
      snap => { setInterviews(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false) }
    )
    return unsub
  }, [])

  useEffect(() => {
    getDocs(collection(db,"users")).then(snap => {
      setCandidates(snap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>!u.isRecruiter))
    }).catch(()=>{})
  }, [])

  async function handleStatusChange(id, status) {
    await updateDoc(doc(db,"interviews",id), { status, updatedAt:serverTimestamp() })
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this interview?")) return
    const iv = interviews.find(i => i.id === id)
    if (iv?.gcalEventId) await deleteEvent(iv.gcalEventId)
    await deleteDoc(doc(db,"interviews",id))
  }

  const today      = interviews.filter(iv => iv.date === todayStr())
  const thisWeek   = interviews.filter(iv => { const d=new Date(iv.date); const diff=(d-new Date())/(1000*60*60*24); return diff>=0&&diff<=7 })
  const confirmed  = interviews.filter(iv => iv.status==="confirmed")
  const stats = [
    { icon:"📅", label:"Today",     value:today.length,     color:"#3D4EAC" },
    { icon:"⏰", label:"This Week",  value:thisWeek.length,  color:"#1565C0" },
    { icon:"✅", label:"Confirmed",  value:confirmed.length, color:"#1A7A4A" },
    { icon:"📋", label:"Total",      value:interviews.length,color:"#f59e0b" },
  ]

  const displayed = interviews.filter(iv => {
    const matchDate   = viewMode==="calendar" ? iv.date===selectedDate : true
    const matchStatus = filterStatus==="all" || iv.status===filterStatus
    return matchDate && matchStatus
  }).sort((a,b) => a.date.localeCompare(b.date)||a.time.localeCompare(b.time))

  const grouped = {}
  displayed.forEach(iv => { if (!grouped[iv.date]) grouped[iv.date]=[]; grouped[iv.date].push(iv) })

  const dateLabel = (ds) => {
    if (ds===todayStr()) return "Today"
    return new Date(ds+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:"#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform:rotate(360deg) } }
        input:focus,select:focus,textarea:focus { outline:none; border-color:#3D4EAC !important }
        input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.5) }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:"#1A1A18", margin:0 }}>Interview Scheduler</h1>
          <p style={{ fontSize:13, color:"#3A3A38", marginTop:4 }}>Schedule, track, and sync interviews to Google Calendar</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ display:"flex", background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:3 }}>
            {[["list","☰ List"],["calendar","📅 Calendar"]].map(([v,l]) => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding:"7px 14px", background: viewMode===v?"rgba(61,78,172,0.2)":"transparent", border: viewMode===v?"1px solid rgba(61,78,172,0.3)":"1px solid transparent", borderRadius:8, color: viewMode===v?"#a5b4fc":"#3A3A38", fontSize:12, fontWeight:600, cursor:"pointer" }}>{l}</button>
            ))}
          </div>
          <button onClick={() => { setEditTarget(null); setShowModal(true) }} style={{ padding:"10px 20px", background:"linear-gradient(135deg,#3D4EAC,#8b5cf6)", border:"none", borderRadius:12, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 16px rgba(61,78,172,0.35)" }}>
            + Schedule
          </button>
        </div>
      </div>

      {/* Google Calendar banner */}
      <GCalBanner gcalStatus={gcalStatus} onConnect={connect} onDisconnect={disconnect} />

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#E8E8E1", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today highlight */}
      {today.length > 0 && (
        <div style={{ background:"rgba(61,78,172,0.06)", border:"1px solid rgba(61,78,172,0.2)", borderRadius:14, padding:"14px 18px", marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#a5b4fc", marginBottom:8 }}>🔔 TODAY'S INTERVIEWS</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {today.map(iv => (
              <div key={iv.id} style={{ background:"rgba(61,78,172,0.1)", border:"1px solid rgba(61,78,172,0.2)", borderRadius:10, padding:"8px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:16 }}>{TYPE_ICON[iv.type]||"🎯"}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1A1A18" }}>{iv.candidateName}</div>
                  <div style={{ fontSize:11, color:"#3D4EAC" }}>{iv.time} · {iv.duration}min</div>
                </div>
                {iv.meetLink && <a href={iv.meetLink} target="_blank" rel="noopener noreferrer" style={{ padding:"4px 10px", background:"#3D4EAC", borderRadius:6, color:"#1A1A18", fontSize:11, fontWeight:600, textDecoration:"none", marginLeft:4 }}>Join</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div style={{ display:"grid", gridTemplateColumns: viewMode==="calendar"?"260px 1fr":"1fr", gap:16 }}>
        {viewMode==="calendar" && <MiniCalendar interviews={interviews} selectedDate={selectedDate} onSelectDate={setSelectedDate} />}
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {["all","pending","confirmed","completed","cancelled"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{ padding:"6px 14px", background: filterStatus===s?"rgba(61,78,172,0.15)":"rgba(255,255,255,0.03)", border:`1px solid ${filterStatus===s?"rgba(61,78,172,0.3)":"rgba(26,26,24,0.06)"}`, borderRadius:20, color: filterStatus===s?"#a5b4fc":"#3A3A38", fontSize:12, fontWeight: filterStatus===s?700:400, cursor:"pointer", textTransform:"capitalize" }}>
                {s==="all"?"All":s}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:200, gap:12, color:"#3A3A38" }}>
              <div style={{ width:28, height:28, border:"2px solid rgba(61,78,172,0.2)", borderTopColor:"#3D4EAC", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
              Loading interviews…
            </div>
          ) : Object.keys(grouped).length===0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#EFEFE9" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📅</div>
              <div style={{ fontSize:16, fontWeight:600, color:"#E8E8E1", marginBottom:8 }}>No interviews scheduled</div>
              <button onClick={() => setShowModal(true)} style={{ padding:"10px 24px", background:"linear-gradient(135deg,#3D4EAC,#8b5cf6)", border:"none", borderRadius:10, color:"#1A1A18", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                + Schedule Interview
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              {Object.entries(grouped).map(([date, ivs]) => (
                <div key={date}>
                  <div style={{ fontSize:12, fontWeight:700, color: date===todayStr()?"#3D4EAC":"#E8E8E1", marginBottom:10, letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background: date===todayStr()?"#3D4EAC":"#EFEFE9" }} />
                    {dateLabel(date).toUpperCase()} · {ivs.length} interview{ivs.length>1?"s":""}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {ivs.map(iv => (
                      <InterviewCard key={iv.id} iv={iv}
                        onEdit={iv => { setEditTarget(iv); setShowModal(true) }}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ScheduleModal
          interview={editTarget}
          candidates={candidates}
          gcalStatus={gcalStatus}
          onCreateGcalEvent={createEvent}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={() => { setShowModal(false); setEditTarget(null) }}
        />
      )}
    </div>
  )
}