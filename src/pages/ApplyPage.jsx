import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

// ── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ file, onFile, disabled }) {
  const ref  = useRef()
  const [drag, setDrag] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type === "application/pdf") onFile(f)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && ref.current?.click()}
      style={{
        border: `2px dashed ${drag ? "#6366f1" : file ? "rgba(34,197,94,0.5)" : "rgba(99,102,241,0.25)"}`,
        borderRadius: 14, padding: "28px 20px", textAlign: "center",
        cursor: disabled ? "default" : "pointer",
        background: file ? "rgba(34,197,94,0.04)" : drag ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.02)",
        transition: "all 0.2s",
      }}
    >
      <input ref={ref} type="file" accept=".pdf,application/pdf" style={{ display:"none" }} onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (
        <div>
          <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#22c55e" }}>{file.name}</div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>
            {(file.size / 1024).toFixed(0)} KB · Click to change
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize:32, marginBottom:10 }}>☁️</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#f1f5f9", marginBottom:6 }}>
            Drop your resume here
          </div>
          <div style={{ fontSize:12, color:"#64748b" }}>PDF only · Max 5MB</div>
        </div>
      )}
    </div>
  )
}

// ── Main Apply Page ───────────────────────────────────────────────────────────
export default function ApplyPage() {
  const { jobId } = useParams()
  const [job,       setJob]       = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [file,      setFile]      = useState(null)
  const [form,      setForm]      = useState({ name:"", email:"", phone:"", capabilio_username:"" })
  const [stage,     setStage]     = useState("form") // form | submitting | done | error
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState("")

  const set = (k,v) => setForm(f => ({...f, [k]:v}))

  // Load job
  // NOTE: this `status === "closed"` check is a pre-existing mismatch with
  // JobBoard.jsx, which writes capitalized status values ("Open"/"Draft"/
  // "Closed") — so this check never actually fires for jobs created there.
  // Left as-is (not introduced by this migration); flagged separately.
  useEffect(() => {
    if (!jobId) { setNotFound(true); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    supabase.from("jobs").select("*").eq("id", jobId).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) { setNotFound(true); return }
        if (data.status === "closed") { setNotFound(true); return }
        setJob(data)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [jobId])

  const progressIntervalRef = useRef(null)

  // Ensure the progress-simulation interval is always cleared on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  async function handleSubmit() {
    if (stage === "submitting") return
    if (!form.name || !form.email || !file) {
      setError("Please fill all required fields and upload your resume.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must be under 5MB.")
      return
    }

    setStage("submitting")
    setError("")

    // Simulate progress steps while backend processes
    const progressSteps = [
      { pct:15, label:"Uploading resume…" },
      { pct:35, label:"Parsing PDF…" },
      { pct:60, label:"AI screening in progress…" },
      { pct:85, label:"Finalising application…" },
    ]
    let stepIndex = 0
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setProgress(progressSteps[stepIndex].pct)
        stepIndex++
      }
    }, 1200)
    progressIntervalRef.current = progressInterval

    try {
      const formData = new FormData()
      formData.append("name",                form.name)
      formData.append("email",               form.email)
      formData.append("phone",               form.phone)
      formData.append("capabilio_username",  form.capabilio_username)
      formData.append("resume",              file)

      const res = await fetch(`${BACKEND}/apply/${jobId}`, {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type — let browser set multipart boundary
      })

      clearInterval(progressInterval)
      progressIntervalRef.current = null
      setProgress(100)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Submission failed")
      }

      await res.json() // status: "application_received"
      setStage("done")
    } catch (err) {
      clearInterval(progressInterval)
      progressIntervalRef.current = null
      setProgress(0)
      setStage("error")
      setError(err.message || "Something went wrong. Please try again.")
    }
  }

  const iStyle = {
    width:"100%", padding:"11px 14px",
    background:"rgba(255,255,255,0.04)",
    border:"1px solid rgba(255,255,255,0.08)",
    borderRadius:10, color:"#f1f5f9", fontSize:14,
    fontFamily:"'Inter',sans-serif", boxSizing:"border-box",
    outline:"none",
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#070d1a", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:32, height:32, border:"3px solid rgba(99,102,241,0.2)", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  )

  // ── Not found / closed ─────────────────────────────────────────────────────
  if (notFound) return (
    <div style={{ minHeight:"100vh", background:"#070d1a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <div style={{ textAlign:"center", color:"#475569" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <div style={{ fontSize:18, fontWeight:700, color:"#94a3b8", marginBottom:8 }}>Position Not Available</div>
        <div style={{ fontSize:14 }}>This job posting is closed or no longer accepting applications.</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:"#070d1a", fontFamily:"'Inter',sans-serif", color:"#f1f5f9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        input:focus,textarea:focus { border-color:#6366f1 !important }
      `}</style>

      {/* Header */}
      <div style={{ background:"rgba(13,20,36,0.9)", borderBottom:"1px solid rgba(255,255,255,0.05)", padding:"16px 24px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", fontWeight:800, color:"#fff", fontSize:16 }}>C</div>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:14, color:"#f1f5f9" }}>capabilio</div>
          <div style={{ fontSize:10, color:"#475569", letterSpacing:"1px" }}>RECRUITER</div>
        </div>
      </div>

      <div style={{ maxWidth:620, margin:"0 auto", padding:"40px 20px 80px" }}>

        {/* Job details */}
        <div style={{ background:"#111827", border:"1px solid rgba(99,102,241,0.2)", borderRadius:18, padding:24, marginBottom:24, animation:"fadeUp 0.4s ease" }}>
          <div style={{ fontSize:11, color:"#6366f1", fontWeight:700, letterSpacing:"0.08em", marginBottom:8 }}>
            {job?.company_name || "Company"} · OPEN POSITION
          </div>
          <h1 style={{ fontFamily:"'Inter',sans-serif", fontSize:26, fontWeight:800, color:"#f1f5f9", margin:"0 0 12px" }}>
            {job?.title}
          </h1>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:16 }}>
            {job?.location && <span style={{ fontSize:12, color:"#94a3b8" }}>📍 {job.location}</span>}
            {job?.min_experience > 0 && <span style={{ fontSize:12, color:"#94a3b8" }}>💼 {job.min_experience}+ years experience</span>}
            {job?.deadline && <span style={{ fontSize:12, color:"#94a3b8" }}>⏰ Apply by {job.deadline}</span>}
          </div>
          {job?.required_skills?.length > 0 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {job.required_skills.map(s => (
                <span key={s} style={{ fontSize:11, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", color:"#a5b4fc", padding:"3px 10px", borderRadius:20 }}>{s}</span>
              ))}
            </div>
          )}
          {job?.jd_text && (
            <div style={{ fontSize:13, color:"#64748b", lineHeight:1.7, marginTop:14, borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:14 }}>
              {job.jd_text.slice(0, 400)}{job.jd_text.length > 400 ? "…" : ""}
            </div>
          )}
        </div>

        {/* Form */}
        {stage === "form" && (
          <div style={{ animation:"fadeUp 0.5s ease" }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>
              Apply Now
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Full Name *</div>
                <input value={form.name} onChange={e => set("name",e.target.value)} placeholder="Your full name" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Email Address *</div>
                <input type="email" value={form.email} onChange={e => set("email",e.target.value)} placeholder="you@email.com" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Phone Number</div>
                <input value={form.phone} onChange={e => set("phone",e.target.value)} placeholder="+91 98765 43210" style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Resume (PDF) *</div>
                <UploadZone file={file} onFile={setFile} />
              </div>
              <div>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>
                  Capabilio Username <span style={{ color:"#334155" }}>(optional — boosts your ELO score visibility)</span>
                </div>
                <input value={form.capabilio_username} onChange={e => set("capabilio_username",e.target.value)} placeholder="your-capabilio-username" style={iStyle} />
              </div>
            </div>

            {error && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 14px", marginTop:14, fontSize:13, color:"#f87171" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!form.name || !form.email || !file || stage === "submitting"}
              style={{ width:"100%", padding:"14px", marginTop:20, background: (!form.name||!form.email||!file||stage==="submitting") ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:700, cursor: (!form.name||!form.email||!file||stage==="submitting")?"not-allowed":"pointer", boxShadow: (!form.name||!form.email||!file||stage==="submitting")?"none":"0 4px 20px rgba(99,102,241,0.4)" }}
            >
              Submit Application →
            </button>

            <div style={{ fontSize:11, color:"#334155", textAlign:"center", marginTop:12 }}>
              Your resume will be screened by AI within seconds. You'll receive an email with feedback.
            </div>
          </div>
        )}

        {/* Submitting */}
        {stage === "submitting" && (
          <div style={{ background:"#111827", border:"1px solid rgba(99,102,241,0.2)", borderRadius:18, padding:32, textAlign:"center", animation:"fadeUp 0.3s ease" }}>
            <div style={{ width:48, height:48, border:"3px solid rgba(99,102,241,0.2)", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 20px" }} />
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:700, color:"#f1f5f9", marginBottom:8 }}>
              Processing Your Application
            </div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>
              {progress < 35 ? "Uploading resume…" : progress < 60 ? "AI is parsing your resume…" : progress < 85 ? "Matching against job requirements…" : "Almost done…"}
            </div>
            <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:4, height:6, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius:4, transition:"width 0.5s ease" }} />
            </div>
            <div style={{ fontSize:12, color:"#475569", marginTop:8 }}>{progress}%</div>
          </div>
        )}

        {/* Done */}
        {stage === "done" && (
          <div style={{ background:"#111827", border:"1px solid rgba(34,197,94,0.3)", borderRadius:18, padding:40, textAlign:"center", animation:"fadeUp 0.3s ease" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:"#22c55e", marginBottom:10 }}>
              Application Received!
            </div>
            <div style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7, marginBottom:20 }}>
              Thank you for applying to <strong style={{ color:"#f1f5f9" }}>{job?.title}</strong>.<br />
              We've received your application and will review it shortly.<br />
              You'll receive an email update within 24–48 hours.
            </div>
            <div style={{ background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.15)", borderRadius:12, padding:"14px 20px", fontSize:13, color:"#a5b4fc" }}>
              💡 While you wait — practice interview questions and build skills on{" "}
              <a href="https://capabilio-ai.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color:"#6366f1", fontWeight:700 }}>
                Capabilio
              </a>
            </div>
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div style={{ background:"#111827", border:"1px solid rgba(239,68,68,0.3)", borderRadius:18, padding:32, textAlign:"center", animation:"fadeUp 0.3s ease" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:700, color:"#f87171", marginBottom:8 }}>Submission Error</div>
            <div style={{ fontSize:13, color:"#94a3b8", marginBottom:20 }}>{error}</div>
            <button onClick={() => setStage("form")} style={{ padding:"10px 24px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}