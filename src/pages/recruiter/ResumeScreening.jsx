import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, card, btn } from "./theme"

// 2026-08-10: this page used to completely ignore every uploaded file --
// parseResume(file, index) never read file contents at all, just cycled
// through 5 hardcoded fake candidates (MOCK_POOL) by array index. Confirmed
// directly: uploading any PDF, including a blank one, always returned
// "Ananya Krishnan, 91%, Strong Hire". Bulk actions (Shortlist/Pipeline/
// Reject) were fake too -- a toast that reset selection, nothing persisted.
//
// Now: uploads go to POST /resume-screening/bulk-parse, which runs each PDF
// through the SAME extractPdfText + scoreResume pipeline the public
// /apply/:jobId endpoint already uses in production -- not a second,
// different scoring system. AI-extracted name/email/phone are shown as an
// EDITABLE review step (probabilistic, not authoritative -- see
// extractResumeIdentity.js) before anything is saved. Confirming writes
// real rows into `applications` (source: "recruiter_upload"), the same
// table the public apply flow uses -- so these candidates immediately show
// up in the real Applications view, Pipeline, and Rejection Engine, with
// zero duplicate logic for shortlist/reject/compare here.
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

// Exported only so src/pages/recruiter/__tests__/ResumeScreening.test.js can
// unit test the real verdict thresholds directly.
// eslint-disable-next-line react-refresh/only-export-components
export function verdictFor(score) {
  if (score >= 85) return { label: "Strong Hire", color: T.green }
  if (score >= 70) return { label: "Good Hire", color: T.indigo }
  if (score >= 55) return { label: "Maybe", color: T.amber }
  return { label: "Weak Match", color: T.red }
}

function ScoreBadge({ score }) {
  const { color } = verdictFor(score)
  return (
    <div style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${color}55`, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", flexShrink: 0 }}>
      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 800, color }}>{score}</span>
      <span style={{ fontSize: 8, color: T.ink4 }}>match</span>
    </div>
  )
}

// ── Review card: editable identity fields, real score/skills/summary ────────
function ReviewCard({ r, selected, onToggle, onEdit, onView }) {
  const { label: verdictLabel, color: verdictColor } = verdictFor(r.score)
  return (
    <div style={{ ...card, padding: 18, border: `1px solid ${selected ? T.indigo : T.border}`, background: selected ? T.indigo3 : T.cream }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div onClick={() => onToggle(r.tempId)} style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected ? T.indigo : T.border}`, background: selected ? T.indigo : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, cursor: "pointer" }}>
          {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
        </div>

        <ScoreBadge score={r.score} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <input value={r.name || ""} onChange={(e) => onEdit(r.tempId, "name", e.target.value)} placeholder="Name (not detected — enter manually)"
              style={{ fontSize: 13, fontWeight: 700, color: T.ink, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", minWidth: 160 }} />
            <input value={r.email || ""} onChange={(e) => onEdit(r.tempId, "email", e.target.value)} placeholder="Email (not detected)"
              style={{ fontSize: 12, color: T.ink2, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", minWidth: 180 }} />
            <input value={r.phone || ""} onChange={(e) => onEdit(r.tempId, "phone", e.target.value)} placeholder="Phone (not detected)"
              style={{ fontSize: 12, color: T.ink2, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", minWidth: 140 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: verdictColor, background: `${verdictColor}15`, border: `1px solid ${verdictColor}30`, borderRadius: 6, padding: "2px 8px", alignSelf: "center" }}>{verdictLabel}</span>
          </div>

          <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8 }}>{r.filename}</div>

          {r.summary && <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, marginBottom: 10 }}>{r.summary}</div>}

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: T.green, fontWeight: 600, marginBottom: 3 }}>✅ MATCHED SKILLS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(r.matchedSkills || []).length === 0 && <span style={{ fontSize: 11, color: T.ink4 }}>None identified</span>}
                {(r.matchedSkills || []).map((s) => (
                  <span key={s} style={{ fontSize: 10, color: T.green, background: T.green2, border: `1px solid ${T.green}30`, borderRadius: 5, padding: "2px 7px" }}>{s}</span>
                ))}
              </div>
            </div>
            {(r.missingSkills || []).length > 0 && (
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 10, color: T.amber, fontWeight: 600, marginBottom: 3 }}>⚠️ GAPS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {r.missingSkills.map((s) => (
                    <span key={s} style={{ fontSize: 10, color: T.amber, background: T.amber2, border: `1px solid ${T.amber}30`, borderRadius: 5, padding: "2px 7px" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {r.resumeUrl && (
          <button onClick={() => onView(r)} style={{ ...btn.outline, fontSize: 11, padding: "5px 10px", flexShrink: 0 }}>👁 View PDF</button>
        )}
      </div>
    </div>
  )
}

export default function ResumeScreening() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [jobId, setJobId] = useState("")
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState("")
  const [review, setReview] = useState([]) // parsed-but-not-yet-confirmed
  const [selected, setSelected] = useState(new Set())
  const [confirming, setConfirming] = useState(false)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const fileInputRef = useRef()

  useEffect(() => {
    (async () => {
      setLoadingJobs(true)
      const { data, error } = await supabase.from("jobs").select("id, title, status").order("created_at", { ascending: false })
      if (error) console.error("Failed to load jobs:", error.message)
      const open = (data || []).filter((j) => (j.status || "").toLowerCase() !== "closed")
      setJobs(open)
      if (open.length > 0) setJobId(open[0].id)
      setLoadingJobs(false)
    })()
  }, [])

  const selectedJob = jobs.find((j) => j.id === jobId)

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    if (!jobId) { setParseError("Select a job to screen resumes against first."); return }
    setParsing(true)
    setParseError("")
    try {
      const form = new FormData()
      form.append("jobId", jobId)
      Array.from(files).forEach((f) => form.append("resumes", f))
      const headers = await authHeaders()
      const res = await fetch(`${BACKEND}/resume-screening/bulk-parse`, { method: "POST", headers, body: form })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setReview((prev) => [...body.results, ...prev])
      setSelected((prev) => new Set([...prev, ...body.results.map((r) => r.tempId)]))
    } catch (err) {
      console.error("Resume parsing failed:", err)
      setParseError(err.message || "Could not parse resumes. Please try again.")
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }

  const toggleSelect = (tempId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(tempId) ? next.delete(tempId) : next.add(tempId)
      return next
    })
  }

  const editField = (tempId, field, value) => {
    setReview((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r)))
  }

  const discard = (tempId) => {
    setReview((prev) => prev.filter((r) => r.tempId !== tempId))
    setSelected((prev) => { const n = new Set(prev); n.delete(tempId); return n })
  }

  const viewResume = async (r) => {
    if (!r.resumeUrl) return
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(r.resumeUrl, 3600)
    if (error) { console.error("Could not open resume:", error.message); return }
    window.open(data.signedUrl, "_blank", "noreferrer")
  }

  const confirmSelected = async () => {
    const targets = review.filter((r) => selected.has(r.tempId))
    if (targets.length === 0) return
    const missingName = targets.find((t) => !t.name || !t.name.trim())
    if (missingName) {
      setParseError(`"${missingName.filename}" needs a name before it can be added — enter one or deselect it.`)
      return
    }
    setConfirming(true)
    setParseError("")
    try {
      const rows = targets.map((r) => ({
        job_id: jobId,
        candidate_id: crypto.randomUUID(),
        name: r.name.trim(),
        email: r.email || null,
        phone: r.phone || null,
        resume_text: r.resumeText || null,
        resume_url: r.resumeUrl || null,
        job_description: null,
        score: r.score,
        matched_skills: r.matchedSkills || [],
        missing_skills: r.missingSkills || [],
        ats_summary: r.summary || null,
        status: "applied",
        scored_at: new Date().toISOString(),
        source: "recruiter_upload",
      }))
      const { error } = await supabase.from("applications").insert(rows)
      if (error) throw error
      const targetIds = new Set(targets.map((t) => t.tempId))
      setReview((prev) => prev.filter((r) => !targetIds.has(r.tempId)))
      setSelected((prev) => { const n = new Set(prev); targetIds.forEach((id) => n.delete(id)); return n })
      setConfirmedCount((c) => c + targets.length)
    } catch (err) {
      console.error("Failed to save applications:", err)
      setParseError(err.message || "Could not save candidates. Please try again.")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Inter',sans-serif" }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>📄 Resume Screening</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>
          Bulk-upload resumes sourced externally (Naukri, LinkedIn, email) and screen them against a role using the same AI scoring your public application form uses. Review and correct extracted details before they're saved.
        </p>
      </div>

      {/* Job selector */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: T.ink2 }}>Screening against:</label>
        {loadingJobs ? (
          <span style={{ fontSize: 13, color: T.ink4 }}>Loading jobs…</span>
        ) : jobs.length === 0 ? (
          <span style={{ fontSize: 13, color: T.ink4 }}>No jobs yet — create one in Jobs first.</span>
        ) : (
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={{ fontSize: 13, padding: "7px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.ink, minWidth: 240 }}>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{(j.status || "").toLowerCase() === "draft" ? " (Draft)" : ""}</option>)}
          </select>
        )}
        {confirmedCount > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: T.green, fontWeight: 600 }}>
            ✓ {confirmedCount} added this session — view in{" "}
            <button onClick={() => navigate("/recruiter/applications")} style={{ background: "none", border: "none", color: T.indigo, textDecoration: "underline", cursor: "pointer", fontSize: 12, padding: 0 }}>Applications</button>
          </span>
        )}
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => jobId && fileInputRef.current?.click()}
        style={{ ...card, border: `2px dashed ${T.indigo}40`, padding: "36px 24px", textAlign: "center", cursor: jobId ? "pointer" : "not-allowed", opacity: jobId ? 1 : 0.6 }}
      >
        <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)} disabled={!jobId} />
        {parsing ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${T.indigo}20`, borderTopColor: T.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
            <div style={{ fontSize: 14, color: T.indigo, fontWeight: 600 }}>Parsing and scoring resumes…</div>
            <div style={{ fontSize: 12, color: T.ink4 }}>Extracting text, matching skills against this role — this can take a moment per file.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Drag & drop resumes here, or click to upload</div>
            <div style={{ fontSize: 12, color: T.ink4 }}>PDF only · up to 15 files at once · 5MB per file</div>
          </>
        )}
      </div>

      {parseError && (
        <div style={{ background: T.red2, border: `1px solid ${T.red}30`, borderRadius: 12, padding: "12px 16px", fontSize: 12, color: T.red, fontWeight: 600 }}>⚠ {parseError}</div>
      )}

      {/* Review queue */}
      {review.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>
              {review.length} parsed — review before saving{selectedJob ? ` to ${selectedJob.title}` : ""}
            </div>
            <button onClick={confirmSelected} disabled={confirming || selected.size === 0} style={{ ...btn.primary, opacity: confirming || selected.size === 0 ? 0.5 : 1 }}>
              {confirming ? "Saving…" : `✓ Add ${selected.size} Selected to Applications`}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {review.map((r) => (
              <div key={r.tempId} style={{ position: "relative" }}>
                <ReviewCard r={r} selected={selected.has(r.tempId)} onToggle={toggleSelect} onEdit={editField} onView={viewResume} />
                <button onClick={() => discard(r.tempId)} title="Discard without saving"
                  style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: T.ink4, cursor: "pointer", fontSize: 13 }}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {review.length === 0 && !parsing && (
        <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 8 }}>No resumes uploaded yet</div>
          <div style={{ fontSize: 13, color: T.ink3, maxWidth: 440, margin: "0 auto" }}>
            Upload resumes sourced from outside Capabilio. Each one is scored against the selected role with the same AI used on your public job application form.
          </div>
        </div>
      )}
    </div>
  )
}
