import { useState, useEffect, useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"
const ATTACHMENT_BUCKET = "task-attachments"
const MAX_ATTACHMENT_MB = 20

const STAGES = ["assigned", "started", "submitted", "evaluated", "passed", "failed", "needs_review"]
const STAGE_META = {
  assigned:     { label: "Assigned",     color: T.ink4,   bg: T.cream3 },
  started:      { label: "Started",      color: T.blue,   bg: T.blue2  },
  submitted:    { label: "Submitted",    color: T.indigo, bg: T.indigo3},
  evaluated:    { label: "Evaluated",    color: T.amber,  bg: T.amber2 },
  passed:       { label: "Passed",       color: T.green,  bg: T.green2 },
  failed:       { label: "Failed",       color: T.red,    bg: T.red2   },
  needs_review: { label: "Needs Review", color: T.amber,  bg: T.amber2 },
}

// 2026-08-07: redesigned to support sharing one task with several candidates
// at once and attaching a reference file (PDF, doc, etc.).
//
// Multi-candidate assignment is done by looping the SAME gated POST /tasks
// call once per recipient -- not a new bulk-insert endpoint -- because task
// creation for a candidate reached via a connected college's roster must
// re-check with capabilio-web that the placement cell approved contact for
// THAT SPECIFIC student (see the header comment further down and
// CollegeConnections.jsx). A bulk insert would silently skip that check for
// every recipient after the first. One POST per recipient keeps every
// candidate individually gated, exactly as today.
//
// File attachments and the shared batch_id are written with a client-side
// follow-up UPDATE on the row(s) POST /tasks already created (RLS already
// allows recruiters to update their own company's tasks_challenges rows --
// see TaskRow's onAdvance/onSaveNotes below, an existing pattern). This is
// safe because it only touches a row AFTER the access-gate decision that
// created it already ran; it can't be used to bypass that gate. It's a
// best-effort match (by company_id + candidate + title + very recent
// assigned_at) since POST /tasks' response shape isn't something this app's
// own code controls -- see the capabilio-recruiter-backend note below.
//
// KNOWN GAP: the attachment_url/batch_id columns are populated by this
// client-side follow-up regardless, so the recruiter-facing UI works today.
// But candidate_tasks.js on capabilio-web (the candidate-facing side, which
// reads through capabilio-recruiter-backend's own /candidate-tasks route,
// a separate deployment not in this workspace) will need that route updated
// to also return attachment_url so candidates can see/download the file
// from their own dashboard. Flagging this explicitly rather than assuming.
function AttachmentPicker({ file, onChange, error }) {
  return (
    <div>
      <input
        type="file"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        style={{ fontSize:12, fontFamily:"'Inter',sans-serif", color:T.ink2 }}
      />
      {file && (
        <div style={{ fontSize:11, color:T.ink3, marginTop:4, display:"flex", alignItems:"center", gap:8 }}>
          📎 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          <button type="button" onClick={() => onChange(null)} style={{ fontSize:11, color:T.red, background:"none", border:"none", cursor:"pointer", padding:0 }}>Remove</button>
        </div>
      )}
      {error && <div style={{ fontSize:11, color:T.red, marginTop:4 }}>{error}</div>}
    </div>
  )
}

function RecipientChips({ recipients, onRemove }) {
  if (recipients.length === 0) return null
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {recipients.map((r) => (
        <span key={r.candidateId || r.candidateName} style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600, padding:"5px 10px", background:T.indigo3, color:T.indigo, border:`1px solid ${T.indigo}30`, borderRadius:20 }}>
          {r.candidateName}
          <button type="button" onClick={() => onRemove(r)} style={{ background:"none", border:"none", color:T.indigo, cursor:"pointer", fontSize:13, lineHeight:1, padding:0 }}>×</button>
        </span>
      ))}
    </div>
  )
}

function AssignTaskForm({ defaultCandidateId, defaultCandidateName, companyLinkId, companyId, onCreated }) {
  const [recipients, setRecipients] = useState(
    defaultCandidateName ? [{ candidateId: defaultCandidateId || null, candidateName: defaultCandidateName }] : []
  )
  const [nameDraft, setNameDraft] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null) // { done, total }
  const [errors, setErrors] = useState([]) // [{ candidateName, message }]

  const addRecipient = () => {
    const name = nameDraft.trim()
    if (!name) return
    if (recipients.some((r) => r.candidateName.toLowerCase() === name.toLowerCase())) { setNameDraft(""); return }
    setRecipients((rs) => [...rs, { candidateId: null, candidateName: name }])
    setNameDraft("")
  }
  const removeRecipient = (r) => setRecipients((rs) => rs.filter((x) => x !== r))

  const handleFile = (f) => {
    setFileError(null)
    if (f && f.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setFileError(`File is too large — max ${MAX_ATTACHMENT_MB} MB.`)
      return
    }
    setFile(f)
  }

  const uploadAttachment = async () => {
    if (!file || !companyId) return null
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${companyId}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, { upsert: false })
    if (error) throw new Error(`Attachment upload failed: ${error.message}`)
    return { path, name: file.name }
  }

  // Best-effort: find the row POST /tasks just created for this candidate so
  // we can attach the file / batch_id to it. See header comment above for
  // why this is safe and why it's a match-by-recency rather than using an
  // id returned from the POST response.
  const attachMetaToLatestTask = async (candidateName, candidateId, batchId, attachment) => {
    if (!batchId && !attachment) return
    try {
      let query = supabase
        .from("tasks_challenges")
        .select("id")
        .eq("company_id", companyId)
        .eq("title", title)
        .eq("status", "assigned")
        .order("assigned_at", { ascending: false })
        .limit(1)
      query = candidateId ? query.eq("candidate_id", candidateId) : query.eq("candidate_name", candidateName)
      const { data } = await query
      const row = data?.[0]
      if (!row) return
      const patch = {}
      if (batchId) patch.batch_id = batchId
      if (attachment) { patch.attachment_url = attachment.path; patch.attachment_name = attachment.name }
      await supabase.from("tasks_challenges").update(patch).eq("id", row.id)
    } catch (err) {
      // Non-fatal — the task itself was already created successfully.
      console.warn(`Couldn't attach metadata for ${candidateName}:`, err.message)
    }
  }

  const submit = async () => {
    if (recipients.length === 0 || !title) return
    if (!companyId) { setErrors([{ candidateName: "", message: "Couldn't determine your company — please refresh and try again." }]); return }
    setSaving(true)
    setErrors([])
    setProgress({ done: 0, total: recipients.length })

    let attachment = null
    try {
      attachment = await uploadAttachment()
    } catch (err) {
      setErrors([{ candidateName: "", message: err.message }])
      setSaving(false)
      setProgress(null)
      return
    }

    const batchId = recipients.length > 1 ? crypto.randomUUID() : null
    const failures = []
    for (const r of recipients) {
      try {
        const res = await fetch(`${BACKEND}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: r.candidateId || null,
            candidateName: r.candidateName,
            title,
            description,
            companyLinkId: companyLinkId || null,
            companyId,
            batchId,
            attachmentUrl: attachment?.path || null,
            attachmentName: attachment?.name || null,
          }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
        await attachMetaToLatestTask(r.candidateName, r.candidateId, batchId, attachment)
      } catch (err) {
        failures.push({ candidateName: r.candidateName, message: err.message })
      }
      setProgress((p) => ({ done: (p?.done || 0) + 1, total: recipients.length }))
    }

    setSaving(false)
    setProgress(null)
    setErrors(failures)
    if (failures.length < recipients.length) {
      setTitle(""); setDescription(""); setFile(null)
      if (failures.length === 0) setRecipients([])
      else setRecipients(failures.map((f) => recipients.find((r) => r.candidateName === f.candidateName)).filter(Boolean))
      onCreated()
    }
  }

  return (
    <div style={{ background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:12, fontWeight:700, color:T.ink3 }}>Assign a task or challenge — one or more candidates</div>

      <RecipientChips recipients={recipients} onRemove={removeRecipient} />
      <div style={{ display:"flex", gap:8 }}>
        <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient() } }}
          placeholder="Candidate name — press Enter to add another"
          style={{ flex:1, padding:"9px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'Inter',sans-serif" }} />
        <button type="button" onClick={addRecipient} disabled={!nameDraft.trim()}
          style={{ fontSize:12, fontWeight:600, padding:"9px 14px", background:T.cream, color:T.ink3, border:`1px solid ${T.border}`, borderRadius:8, cursor: nameDraft.trim() ? "pointer" : "default", opacity: nameDraft.trim() ? 1 : 0.5 }}>
          + Add
        </button>
      </div>
      {recipients.length > 1 && (
        <div style={{ fontSize:11, color:T.ink4 }}>This task will be assigned to all {recipients.length} candidates above, individually.</div>
      )}

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Task title (e.g. "Build a REST API endpoint")'
        style={{ padding:"9px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'Inter',sans-serif" }} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description / instructions..."
        style={{ padding:"9px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'Inter',sans-serif", minHeight:60, resize:"vertical" }} />

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:T.ink4, marginBottom:4 }}>ATTACHMENT (OPTIONAL — PDF, DOC, ZIP, ETC., MAX {MAX_ATTACHMENT_MB}MB)</div>
        <AttachmentPicker file={file} onChange={handleFile} error={fileError} />
      </div>

      {errors.length > 0 && (
        <div style={{ fontSize:12, color:T.red, background:T.red2, border:`1px solid ${T.red}30`, borderRadius:8, padding:"8px 12px" }}>
          {errors.map((e, i) => (
            <div key={i}>{e.candidateName ? `${e.candidateName}: ` : ""}{e.message}</div>
          ))}
        </div>
      )}

      <button onClick={submit} disabled={saving || recipients.length === 0 || !title || !!fileError}
        style={{ alignSelf:"flex-start", fontSize:12, fontWeight:700, padding:"8px 18px", background:T.indigo3, color:T.indigo, border:`1px solid ${T.indigo}30`, borderRadius:8, cursor:"pointer", fontFamily:"'Inter',sans-serif", opacity: saving || recipients.length === 0 || !title || fileError ? 0.5 : 1 }}>
        {saving ? `Assigning... (${progress?.done || 0}/${progress?.total || recipients.length})` : recipients.length > 1 ? `Assign to ${recipients.length} candidates` : "Assign Task"}
      </button>
    </div>
  )
}

// A task only has real candidate work to review once a candidate has
// actually submitted through their own capabilio-web "Tasks from Companies"
// inbox (via the partner bridge) -- submission_text/submission_url are
// null/undefined for anything still sitting at assigned/started, or for
// tasks that were never linked to a real candidate_id in the first place
// (freeform-name-only assignment; see AssignTaskForm above).
function TaskRow({ task, onAdvance, onSaveNotes }) {
  const meta = STAGE_META[task.status] || STAGE_META.assigned
  const idx = STAGES.indexOf(task.status)
  const next = STAGES[idx + 1]
  const hasSubmission = !!(task.submission_text || task.submission_url)
  const [expanded, setExpanded] = useState(hasSubmission)
  const [notes, setNotes] = useState(task.evaluator_notes || "")
  const [savingNotes, setSavingNotes] = useState(false)

  const saveNotes = async () => {
    setSavingNotes(true)
    try { await onSaveNotes(task, notes) } finally { setSavingNotes(false) }
  }

  return (
    <div style={{ padding:"12px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ flex:1, minWidth:0, cursor: hasSubmission ? "pointer" : "default" }} onClick={() => hasSubmission && setExpanded((e) => !e)}>
          <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{task.candidate_name || "—"}</div>
          <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>
            {!task.candidate_id && <span style={{ color:T.amber }}>Not linked to a real candidate — won't appear in their dashboard</span>}
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:meta.color, background:meta.bg, border:`1px solid ${meta.color}30`, borderRadius:7, padding:"3px 9px", whiteSpace:"nowrap" }}>{meta.label}</span>
        {next && (
          <button onClick={() => onAdvance(task, next)} style={{ fontSize:11, fontWeight:600, padding:"6px 12px", background:T.cream, color:T.indigo, border:`1px solid ${T.indigo}30`, borderRadius:7, cursor:"pointer", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
            Mark {STAGE_META[next].label} →
          </button>
        )}
        {hasSubmission && (
          <button onClick={() => setExpanded((e) => !e)} style={{ fontSize:11, fontWeight:600, padding:"6px 10px", background:"transparent", color:T.ink4, border:`1px solid ${T.border}`, borderRadius:7, cursor:"pointer" }}>
            {expanded ? "Hide" : "View submission"}
          </button>
        )}
      </div>

      {expanded && hasSubmission && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.ink4, marginBottom:4 }}>CANDIDATE SUBMISSION</div>
          {task.submission_text && <div style={{ fontSize:12.5, color:T.ink2, whiteSpace:"pre-wrap", marginBottom:6 }}>{task.submission_text}</div>}
          {task.submission_url && <a href={task.submission_url} target="_blank" rel="noreferrer" style={{ fontSize:12.5, color:T.indigo, display:"block", marginBottom:8 }}>{task.submission_url}</a>}

          <div style={{ fontSize:10, fontWeight:700, color:T.ink4, marginBottom:4 }}>EVALUATOR NOTES (visible to candidate)</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes on this submission..."
            style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:12.5, minHeight:56, resize:"vertical", fontFamily:"'Inter',sans-serif" }} />
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button onClick={saveNotes} disabled={savingNotes} style={{ fontSize:11, fontWeight:700, padding:"6px 12px", background:T.ink, color:T.cream, border:"none", borderRadius:7, cursor:"pointer", opacity:savingNotes?0.6:1 }}>
              {savingNotes ? "Saving..." : "Save notes"}
            </button>
            {task.status !== "passed" && (
              <button onClick={() => onAdvance(task, "passed")} style={{ fontSize:11, fontWeight:700, padding:"6px 12px", background:T.green2, color:T.green, border:`1px solid ${T.green}30`, borderRadius:7, cursor:"pointer" }}>
                Mark Passed
              </button>
            )}
            {task.status !== "failed" && (
              <button onClick={() => onAdvance(task, "failed")} style={{ fontSize:11, fontWeight:700, padding:"6px 12px", background:T.red2, color:T.red, border:`1px solid ${T.red}30`, borderRadius:7, cursor:"pointer" }}>
                Mark Failed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// One card per distinct (title, batch_id) group -- a single-candidate task
// is just a "group" of one. Groups share the title/description/attachment
// header; each candidate's own progress is its own TaskRow underneath.
function TaskGroup({ tasks, onAdvance, onSaveNotes, signedAttachmentUrls }) {
  const first = tasks[0]
  const attachmentUrl = first.attachment_url ? signedAttachmentUrls[first.attachment_url] : null

  return (
    <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:12, boxShadow:T.shadow }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:T.ink }}>{first.title}</div>
          {first.description && <div style={{ fontSize:12, color:T.ink3, marginTop:2, maxWidth:520 }}>{first.description}</div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {tasks.length > 1 && (
            <span style={{ fontSize:11, fontWeight:700, color:T.indigo, background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:7, padding:"3px 9px" }}>
              Batch of {tasks.length}
            </span>
          )}
          {first.attachment_name && (
            attachmentUrl ? (
              <a href={attachmentUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, fontWeight:600, color:T.ink3, background:T.cream2, border:`1px solid ${T.border}`, borderRadius:7, padding:"5px 10px", textDecoration:"none" }}>
                📎 {first.attachment_name}
              </a>
            ) : (
              <span style={{ fontSize:11, color:T.ink4 }}>📎 {first.attachment_name}</span>
            )
          )}
        </div>
      </div>
      {tasks.map((t) => <TaskRow key={t.id} task={t} onAdvance={onAdvance} onSaveNotes={onSaveNotes} />)}
    </div>
  )
}

export default function TasksChallenges() {
  const location = useLocation()
  const seed = location.state || {}
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(!!seed.candidateName)
  const [companyId, setCompanyId] = useState(null)
  const [signedAttachmentUrls, setSignedAttachmentUrls] = useState({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data: recruiterRow } = await supabase.from("recruiters").select("company_id").eq("id", user.id).single()
      if (!cancelled) setCompanyId(recruiterRow?.company_id || null)
    })()
    return () => { cancelled = true }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("tasks_challenges").select("*").order("assigned_at", { ascending: false })
      if (error) throw error
      setTasks(data || [])

      // Resolve signed URLs for any attachment paths we haven't signed yet.
      const paths = [...new Set((data || []).map((t) => t.attachment_url).filter(Boolean))]
      if (paths.length) {
        const entries = await Promise.all(paths.map(async (p) => {
          const { data: signed } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(p, 3600)
          return [p, signed?.signedUrl || null]
        }))
        setSignedAttachmentUrls(Object.fromEntries(entries))
      }
    } catch (err) {
      console.error("Failed to load tasks:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const advance = async (task, nextStatus) => {
    try {
      const patch = { status: nextStatus }
      if (nextStatus === "started") patch.started_at = new Date().toISOString()
      if (nextStatus === "submitted") patch.submitted_at = new Date().toISOString()
      if (nextStatus === "evaluated" || nextStatus === "passed" || nextStatus === "failed") patch.evaluated_at = new Date().toISOString()
      const { error } = await supabase.from("tasks_challenges").update(patch).eq("id", task.id)
      if (error) throw error
      fetchData()
    } catch (err) {
      console.error("Failed to advance task:", err)
    }
  }

  const saveNotes = async (task, notes) => {
    try {
      const { error } = await supabase.from("tasks_challenges").update({ evaluator_notes: notes }).eq("id", task.id)
      if (error) throw error
      fetchData()
    } catch (err) {
      console.error("Failed to save evaluator notes:", err)
    }
  }

  const counts = STAGES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s).length }), {})

  // Group by batch_id when present, otherwise each task is its own group of one.
  const groups = useMemo(() => {
    const byKey = new Map()
    for (const t of tasks) {
      const key = t.batch_id || `single:${t.id}`
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(t)
    }
    // Order groups by the most recent assigned_at within the group.
    return [...byKey.entries()].sort(
      (a, b) => new Date(b[1][0].assigned_at) - new Date(a[1][0].assigned_at)
    )
  }, [tasks])

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:T.ink, margin:0 }}>Tasks & Challenges</h1>
          <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>Assign real work samples — to one candidate or many at once, with an optional reference file — and track them through review. No automated pass/fail without a human evaluation.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} style={{ fontSize:12, fontWeight:700, padding:"9px 18px", background:T.ink, color:T.cream, border:"none", borderRadius:10, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
          {showForm ? "Close" : "+ Assign Task"}
        </button>
      </div>

      {showForm && (
        <AssignTaskForm
          defaultCandidateId={seed.candidateId}
          defaultCandidateName={seed.candidateName}
          companyLinkId={seed.companyLinkId}
          companyId={companyId}
          onCreated={() => { fetchData() }}
        />
      )}

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {STAGES.map((s) => (
          <div key={s} style={{ fontSize:11, color:STAGE_META[s].color, background:STAGE_META[s].bg, border:`1px solid ${STAGE_META[s].color}30`, borderRadius:8, padding:"4px 10px", fontWeight:600 }}>
            {STAGE_META[s].label}: {counts[s]}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow, color:T.ink3, fontSize:13, textAlign:"center" }}>Loading...</div>
      ) : groups.length === 0 ? (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, boxShadow:T.shadow, color:T.ink4, fontSize:14, textAlign:"center", padding:"40px 0" }}>No tasks assigned yet.</div>
      ) : (
        groups.map(([key, groupTasks]) => (
          <TaskGroup key={key} tasks={groupTasks} onAdvance={advance} onSaveNotes={saveNotes} signedAttachmentUrls={signedAttachmentUrls} />
        ))
      )}
    </div>
  )
}
