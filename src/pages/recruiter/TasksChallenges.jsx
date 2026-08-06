import { useState, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

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

function NewTaskForm({ defaultCandidateId, defaultCandidateName, onCreated }) {
  const [candidateId, setCandidateId] = useState(defaultCandidateId || "")
  const [candidateName, setCandidateName] = useState(defaultCandidateName || "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!candidateName || !title) return
    setSaving(true)
    try {
      const { error } = await supabase.from("tasks_challenges").insert({
        candidate_id: candidateId || null, candidate_name: candidateName, title, description, status: "assigned",
      })
      if (error) throw error
      setTitle(""); setDescription("")
      onCreated()
    } catch (err) {
      console.error("Failed to create task:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ fontSize:12, fontWeight:700, color:T.ink3 }}>Assign a new task or challenge</div>
      <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Candidate name"
        style={{ padding:"9px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'DM Sans',sans-serif" }} />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Task title (e.g. "Build a REST API endpoint")'
        style={{ padding:"9px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'DM Sans',sans-serif" }} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description / instructions..."
        style={{ padding:"9px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:13, fontFamily:"'DM Sans',sans-serif", minHeight:60, resize:"vertical" }} />
      <button onClick={submit} disabled={saving || !candidateName || !title}
        style={{ alignSelf:"flex-start", fontSize:12, fontWeight:700, padding:"8px 18px", background:T.indigo3, color:T.indigo, border:`1px solid ${T.indigo}30`, borderRadius:8, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", opacity: saving || !candidateName || !title ? 0.5 : 1 }}>
        {saving ? "Assigning..." : "Assign Task"}
      </button>
    </div>
  )
}

// A task only has real candidate work to review once a candidate has
// actually submitted through their own capabilio-web "Tasks from Companies"
// inbox (via the partner bridge) -- submission_text/submission_url are
// null/undefined for anything still sitting at assigned/started, or for
// tasks that were never linked to a real candidate_id in the first place
// (freeform-name-only assignment; see NewTaskForm below).
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
          <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{task.title}</div>
          <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>
            {task.candidate_name || "—"}
            {!task.candidate_id && <span style={{ marginLeft:6, color:T.amber }}>· not linked to a real candidate — won't appear in their dashboard</span>}
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:meta.color, background:meta.bg, border:`1px solid ${meta.color}30`, borderRadius:7, padding:"3px 9px", whiteSpace:"nowrap" }}>{meta.label}</span>
        {next && (
          <button onClick={() => onAdvance(task, next)} style={{ fontSize:11, fontWeight:600, padding:"6px 12px", background:T.cream, color:T.indigo, border:`1px solid ${T.indigo}30`, borderRadius:7, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
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
            style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:12.5, minHeight:56, resize:"vertical", fontFamily:"'DM Sans',sans-serif" }} />
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

export default function TasksChallenges() {
  const location = useLocation()
  const seed = location.state || {}
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(!!seed.candidateName)

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("tasks_challenges").select("*").order("assigned_at", { ascending: false })
      if (error) throw error
      setTasks(data || [])
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

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.ink, margin:0 }}>Tasks & Challenges</h1>
          <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>Assign real work samples and track candidates through review — no automated pass/fail without a human evaluation.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} style={{ fontSize:12, fontWeight:700, padding:"9px 18px", background:T.ink, color:T.cream, border:"none", borderRadius:10, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          {showForm ? "Close" : "+ Assign Task"}
        </button>
      </div>

      {showForm && <NewTaskForm defaultCandidateId={seed.candidateId} defaultCandidateName={seed.candidateName} onCreated={() => { fetchData(); setShowForm(false) }} />}

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {STAGES.map((s) => (
          <div key={s} style={{ fontSize:11, color:STAGE_META[s].color, background:STAGE_META[s].bg, border:`1px solid ${STAGE_META[s].color}30`, borderRadius:8, padding:"4px 10px", fontWeight:600 }}>
            {STAGE_META[s].label}: {counts[s]}
          </div>
        ))}
      </div>

      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
        {loading ? (
          <div style={{ color:T.ink3, fontSize:13, textAlign:"center", padding:"30px 0" }}>Loading...</div>
        ) : tasks.length === 0 ? (
          <div style={{ color:T.ink4, fontSize:14, textAlign:"center", padding:"40px 0" }}>No tasks assigned yet.</div>
        ) : (
          tasks.map((t) => <TaskRow key={t.id} task={t} onAdvance={advance} onSaveNotes={saveNotes} />)
        )}
      </div>
    </div>
  )
}
