import { useState, useRef } from "react"

// ── Mock parsed resume data (simulates AI parsing) ────────────────────────────
function parseResume(file, index) {
  const MOCK_POOL = [
    {
      name: "Ananya Krishnan", email: "ananya.k@gmail.com", phone: "+91 98765 43210",
      location: "Bengaluru, Karnataka", experience: "4 years", domain: "Medical Coding",
      currentRole: "Medical Coder", currentCompany: "Apollo Hospitals",
      education: "B.Sc. Life Sciences, Manipal University, 2019",
      skills: ["ICD-10", "CPT Coding", "HCPCS", "Medical Billing", "Epic EMR", "HCC Risk Adjustment"],
      expectedCTC: "₹8.5L", noticePeriod: "30 days",
      matchScore: 91, strengths: ["Strong domain expertise", "Certified CPC", "EMR proficiency"],
      gaps: ["No outpatient coding exp"],
      aiVerdict: "Strong Hire",
      resumeUrl: null,
      filename: file?.name || `resume_${index + 1}.pdf`,
    },
    {
      name: "Rahul Mehta", email: "rahul.mehta@outlook.com", phone: "+91 87654 32109",
      location: "Mumbai, Maharashtra", experience: "2 years", domain: "Software Engineering",
      currentRole: "Frontend Developer", currentCompany: "Infosys",
      education: "B.E. Computer Science, VIT University, 2022",
      skills: ["React", "JavaScript", "TypeScript", "Node.js", "Git", "REST APIs"],
      expectedCTC: "₹12L", noticePeriod: "60 days",
      matchScore: 76, strengths: ["React expertise", "Good fundamentals", "Open source contributions"],
      gaps: ["No system design exp", "Short tenure"],
      aiVerdict: "Good Hire",
      resumeUrl: null,
      filename: file?.name || `resume_${index + 1}.pdf`,
    },
    {
      name: "Priya Nair", email: "priya.nair@yahoo.com", phone: "+91 76543 21098",
      location: "Hyderabad, Telangana", experience: "6 years", domain: "Data Science",
      currentRole: "Senior Data Analyst", currentCompany: "Deloitte",
      education: "M.Sc. Statistics, IIT Madras, 2018",
      skills: ["Python", "SQL", "Machine Learning", "Tableau", "Power BI", "Spark"],
      expectedCTC: "₹18L", noticePeriod: "45 days",
      matchScore: 88, strengths: ["ML proficiency", "IIT pedigree", "Client-facing exp"],
      gaps: ["No cloud cert", "Heavy consulting, less product exp"],
      aiVerdict: "Strong Hire",
      resumeUrl: null,
      filename: file?.name || `resume_${index + 1}.pdf`,
    },
    {
      name: "Vikram Sharma", email: "vikram.s@protonmail.com", phone: "+91 65432 10987",
      location: "Pune, Maharashtra", experience: "1 year", domain: "Finance",
      currentRole: "Finance Analyst", currentCompany: "HDFC Bank",
      education: "MBA Finance, Symbiosis, 2024",
      skills: ["Financial Modeling", "Excel", "Tally", "SEBI Compliance", "Valuation"],
      expectedCTC: "₹6L", noticePeriod: "15 days",
      matchScore: 62, strengths: ["Banking domain", "Immediate joiner potential"],
      gaps: ["Very limited experience", "No Python/automation skills"],
      aiVerdict: "Maybe",
      resumeUrl: null,
      filename: file?.name || `resume_${index + 1}.pdf`,
    },
    {
      name: "Sonia Gupta", email: "sonia.gupta@gmail.com", phone: "+91 54321 09876",
      location: "Delhi NCR", experience: "8 years", domain: "Marketing",
      currentRole: "Marketing Manager", currentCompany: "Zomato",
      education: "MBA Marketing, MDI Gurgaon, 2016",
      skills: ["Performance Marketing", "SEO/SEM", "Google Ads", "HubSpot", "Analytics", "Brand Strategy"],
      expectedCTC: "₹22L", noticePeriod: "30 days",
      matchScore: 84, strengths: ["Startup experience", "D2C brand building", "Data-driven approach"],
      gaps: ["High CTC expectation", "Zomato churn risk"],
      aiVerdict: "Good Hire",
      resumeUrl: null,
      filename: file?.name || `resume_${index + 1}.pdf`,
    },
  ]
  return { ...MOCK_POOL[index % MOCK_POOL.length], filename: file?.name || `resume_${index + 1}.pdf` }
}

const VERDICT_COLORS = {
  "Strong Hire": "#22c55e",
  "Good Hire":   "#3D4EAC",
  "Maybe":       "#f59e0b",
  "No":          "#ef4444",
}

const SORT_OPTIONS = ["Match Score", "Name", "Experience", "Expected CTC", "Notice Period"]

function ScoreBadge({ score }) {
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#3D4EAC" : score >= 55 ? "#f59e0b" : "#ef4444"
  return (
    <div style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${color}55`, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", flexShrink: 0 }}>
      <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color }}>{score}</span>
      <span style={{ fontSize: 8, color: "#475569" }}>match</span>
    </div>
  )
}

function ResumeCard({ r, selected, onToggle, onView }) {
  const verdictColor = VERDICT_COLORS[r.aiVerdict] || "#3D4EAC"
  const domainCol = r.domain?.toLowerCase().includes("medical") ? "#22c55e"
    : r.domain?.toLowerCase().includes("software") ? "#3D4EAC"
    : r.domain?.toLowerCase().includes("data") ? "#00D2FF"
    : r.domain?.toLowerCase().includes("finance") ? "#FFD166"
    : r.domain?.toLowerCase().includes("marketing") ? "#f59e0b" : "#8b5cf6"

  return (
    <div style={{ background: selected ? "rgba(61,78,172,0.06)" : "#EFEFE9", border: `1px solid ${selected ? "rgba(61,78,172,0.3)" : "rgba(26,26,24,0.08)"}`, borderRadius: 14, padding: 18, transition: "all 0.15s", cursor: "pointer" }}
      onClick={() => onToggle(r.filename)}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Checkbox */}
        <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected ? "#3D4EAC" : "rgba(255,255,255,0.15)"}`, background: selected ? "#3D4EAC" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
        </div>

        {/* Score ring */}
        <ScoreBadge score={r.matchScore} />

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{r.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: verdictColor, background: `${verdictColor}15`, border: `1px solid ${verdictColor}30`, borderRadius: 6, padding: "2px 8px" }}>{r.aiVerdict}</span>
            <span style={{ fontSize: 11, color: domainCol, background: `${domainCol}10`, border: `1px solid ${domainCol}20`, borderRadius: 6, padding: "2px 8px" }}>{r.domain}</span>
          </div>

          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
            {r.currentRole} @ {r.currentCompany} · {r.experience} exp · {r.location}
          </div>

          {/* Skills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {r.skills.slice(0, 5).map((sk) => (
              <span key={sk} style={{ fontSize: 10, color: "#6B6B68", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 7px" }}>{sk}</span>
            ))}
            {r.skills.length > 5 && <span style={{ fontSize: 10, color: "#475569", padding: "2px 4px" }}>+{r.skills.length - 5}</span>}
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#22c55e" }}>💰 {r.expectedCTC}</span>
            <span style={{ fontSize: 11, color: "#f59e0b" }}>⏳ {r.noticePeriod}</span>
            <span style={{ fontSize: 11, color: "#6B6B68" }}>🎓 {r.education.split(",")[0]}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onView(r)}
            style={{ fontSize: 11, padding: "5px 10px", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.25)", borderRadius: 7, color: "#a5b4fc", cursor: "pointer" }}>
            👁 View
          </button>
          <span style={{ fontSize: 10, color: "#475569", textAlign: "center" }}>{r.filename}</span>
        </div>
      </div>

      {/* Strength / gap row */}
      <div style={{ display: "flex", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, marginBottom: 3 }}>✅ STRENGTHS</div>
          {r.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: "#64748b" }}>• {s}</div>
          ))}
        </div>
        {r.gaps.length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, marginBottom: 3 }}>⚠️ GAPS</div>
            {r.gaps.map((g, i) => (
              <div key={i} style={{ fontSize: 11, color: "#64748b" }}>• {g}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailModal({ resume, onClose }) {
  if (!resume) return null
  const verdictColor = VERDICT_COLORS[resume.aiVerdict] || "#3D4EAC"
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "#F6F6F1", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>{resume.name}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{resume.email} · {resume.phone}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(26,26,24,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#6B6B68", padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "AI Verdict",     value: resume.aiVerdict, color: verdictColor },
            { label: "Match Score",    value: `${resume.matchScore}%`, color: resume.matchScore >= 80 ? "#22c55e" : "#f59e0b" },
            { label: "Expected CTC",   value: resume.expectedCTC, color: "#FFD166" },
            { label: "Notice Period",  value: resume.noticePeriod, color: "#00D2FF" },
            { label: "Experience",     value: resume.experience, color: "#3D4EAC" },
            { label: "Location",       value: resume.location, color: "#6B6B68" },
          ].map((m) => (
            <div key={m.label} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6B6B68", marginBottom: 8 }}>🎓 Education</div>
          <div style={{ fontSize: 13, color: "#f1f5f9", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>{resume.education}</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6B6B68", marginBottom: 8 }}>🛠️ Skills</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {resume.skills.map((sk) => (
              <span key={sk} style={{ fontSize: 12, color: "#a5b4fc", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", borderRadius: 6, padding: "3px 10px" }}>{sk}</span>
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div style={{ padding: "14px 16px", background: "linear-gradient(135deg,rgba(61,78,172,0.1),rgba(139,92,246,0.06))", border: "1px solid rgba(61,78,172,0.2)", borderRadius: 12, marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", marginBottom: 4 }}>⚡ Capabilio ELO Profile Available</div>
          <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
            This candidate's resume was parsed by AI. Invite them to complete the Capabilio skill assessment to get a verified ELO score, Arena performance data, and a full skill graph — replacing guesswork with evidence.
          </div>
          <button style={{ marginTop: 10, fontSize: 11, padding: "6px 14px", background: "rgba(61,78,172,0.15)", border: "1px solid rgba(61,78,172,0.3)", borderRadius: 8, color: "#a5b4fc", cursor: "pointer", fontWeight: 600 }}>
            📨 Invite to Capabilio Assessment →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ResumeScreening() {
  const [resumes,   setResumes]   = useState([])
  const [parsing,   setParsing]   = useState(false)
  const [selected,  setSelected]  = useState(new Set())
  const [sortBy,    setSortBy]    = useState("Match Score")
  const [filterVerdict, setFilterVerdict] = useState("All")
  const [viewResume, setViewResume] = useState(null)
  const [bulkDone,  setBulkDone]  = useState(null)
  const fileInputRef = useRef()

  const handleFiles = async (files) => {
    if (!files.length) return
    setParsing(true)
    // Simulate AI parsing delay
    await new Promise((r) => setTimeout(r, 1800))
    const parsed = Array.from(files).map((f, i) => parseResume(f, resumes.length + i))
    setResumes((prev) => [...prev, ...parsed])
    setParsing(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const toggleSelect = (filename) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(filename) ? next.delete(filename) : next.add(filename)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((r) => r.filename)))
  }

  const bulkAction = (action) => {
    setBulkDone(action)
    setTimeout(() => setBulkDone(null), 2500)
    setSelected(new Set())
  }

  let filtered = [...resumes]
  if (filterVerdict !== "All") filtered = filtered.filter((r) => r.aiVerdict === filterVerdict)
  filtered.sort((a, b) => {
    if (sortBy === "Match Score")    return b.matchScore - a.matchScore
    if (sortBy === "Name")           return a.name.localeCompare(b.name)
    if (sortBy === "Experience")     return parseInt(b.experience) - parseInt(a.experience)
    if (sortBy === "Expected CTC")   return parseInt(b.expectedCTC.replace(/\D/g, "")) - parseInt(a.expectedCTC.replace(/\D/g, ""))
    if (sortBy === "Notice Period")  return parseInt(a.noticePeriod) - parseInt(b.noticePeriod)
    return 0
  })

  const verdictCounts = resumes.reduce((acc, r) => { acc[r.aiVerdict] = (acc[r.aiVerdict] || 0) + 1; return acc }, {})
  const avgMatch = resumes.length ? Math.round(resumes.reduce((s, r) => s + r.matchScore, 0) / resumes.length) : 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

      {/* Bridge Mode Banner */}
      <div style={{ background: "linear-gradient(135deg,rgba(61,78,172,0.1),rgba(139,92,246,0.06))", border: "1px solid rgba(61,78,172,0.2)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 28 }}>🌉</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#f1f5f9", marginBottom: 3 }}>
            Resume Screening Mode — Bridge to ELO-First Hiring
          </div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Screen candidates via uploaded resumes while your Capabilio talent pool grows. AI parses each resume, scores it against your open role, and flags strengths and gaps — just like Naukri, but smarter. As candidates complete ELO assessments, resume screening is automatically upgraded to verified skill data.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ padding: "8px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#22c55e" }}>0</div>
            <div style={{ fontSize: 10, color: "#475569" }}>ELO Profiles</div>
          </div>
          <div style={{ padding: "8px 14px", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#3D4EAC" }}>{resumes.length}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>Resumes Parsed</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,rgba(61,78,172,0.08),rgba(139,92,246,0.04))", border: "1px solid rgba(61,78,172,0.12)", borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>📄 Resume Screening</div>
        <div style={{ fontSize: 13, color: "#6B6B68", lineHeight: 1.6 }}>
          Upload resumes in bulk (PDF/DOC). AI extracts skills, experience, education, CTC expectations — and scores each candidate against your role requirements. Use the bulk actions to shortlist or move candidates into the pipeline instantly.
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{ background: "#EFEFE9", border: "2px dashed rgba(61,78,172,0.3)", borderRadius: 16, padding: "36px 24px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s" }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" multiple style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)} />
        {parsing ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, border: "3px solid rgba(61,78,172,0.2)", borderTopColor: "#3D4EAC", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
            <div style={{ fontSize: 14, color: "#a5b4fc", fontWeight: 600 }}>AI is parsing resumes...</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Extracting skills, experience, CTC, education</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>
              Drag & drop resumes here, or click to upload
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>PDF, DOC, DOCX · Bulk upload supported · AI auto-parses each file</div>
            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={{ fontSize: 13, padding: "8px 20px", background: "rgba(61,78,172,0.15)", border: "1px solid rgba(61,78,172,0.3)", borderRadius: 10, color: "#a5b4fc", cursor: "pointer", fontWeight: 600 }}>
                📁 Browse Files
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleFiles([null, null, null]) }}
                style={{ fontSize: 13, padding: "8px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#64748b", cursor: "pointer" }}>
                🎲 Load Demo Resumes
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stats row */}
      {resumes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
          {[
            { label: "Total Uploaded",  value: resumes.length,                       color: "#3D4EAC" },
            { label: "Avg Match Score", value: `${avgMatch}%`,                       color: avgMatch >= 75 ? "#22c55e" : "#f59e0b" },
            { label: "Strong Hires",    value: verdictCounts["Strong Hire"] || 0,     color: "#22c55e" },
            { label: "Maybe / Review",  value: verdictCounts["Maybe"] || 0,           color: "#f59e0b" },
            { label: "Selected",        value: selected.size,                         color: "#a5b4fc" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {resumes.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Filter by verdict */}
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Strong Hire", "Good Hire", "Maybe"].map((v) => (
              <button key={v} onClick={() => setFilterVerdict(v)}
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontWeight: 600,
                  background: filterVerdict === v ? "rgba(61,78,172,0.15)" : "transparent",
                  borderColor: filterVerdict === v ? "rgba(61,78,172,0.4)" : "rgba(26,26,24,0.09)",
                  color: filterVerdict === v ? "#a5b4fc" : "#475569" }}>
                {v} {v !== "All" && `(${verdictCounts[v] || 0})`}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#475569" }}>Sort:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: 12, padding: "5px 10px", background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#6B6B68", cursor: "pointer" }}>
              {SORT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.25)", borderRadius: 14, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={selectAll} style={{ fontSize: 12, padding: "5px 10px", background: "rgba(26,26,24,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#6B6B68", cursor: "pointer" }}>
            ☑ {selected.size === filtered.length ? "Deselect All" : "Select All"}
          </button>
          <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>{selected.size} candidates selected</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {[
              { label: "✅ Shortlist",           action: "shortlisted",     bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.3)",   color: "#4ade80" },
              { label: "📋 Move to Pipeline",    action: "pipeline",        bg: "rgba(61,78,172,0.15)",  border: "rgba(61,78,172,0.3)",  color: "#a5b4fc" },
              { label: "📨 Send Assessment",     action: "assessment_sent", bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)", color: "#fbbf24" },
              { label: "❌ Reject",              action: "rejected",        bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.25)",  color: "#f87171" },
            ].map((btn) => (
              <button key={btn.action} onClick={() => bulkAction(btn.action)}
                style={{ fontSize: 12, padding: "6px 12px", background: btn.bg, border: `1px solid ${btn.border}`, borderRadius: 8, color: btn.color, cursor: "pointer", fontWeight: 600 }}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Success toast */}
      {bulkDone && (
        <div style={{ padding: "12px 18px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, textAlign: "center", fontSize: 13, color: "#4ade80" }}>
          ✅ {selected.size > 0 ? selected.size : "Selected"} candidates marked as <strong>{bulkDone.replace("_", " ")}</strong> and added to pipeline.
        </div>
      )}

      {/* Resume list */}
      {resumes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
              {filtered.length} Candidates — Sorted by {sortBy}
            </div>
            <button onClick={selectAll}
              style={{ fontSize: 11, padding: "5px 10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#475569", cursor: "pointer" }}>
              {selected.size === filtered.length && filtered.length > 0 ? "Deselect All" : "Select All"}
            </button>
          </div>
          {filtered.map((r) => (
            <ResumeCard key={r.filename} r={r} selected={selected.has(r.filename)} onToggle={toggleSelect} onView={setViewResume} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {resumes.length === 0 && !parsing && (
        <div style={{ background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>No Resumes Uploaded Yet</div>
          <div style={{ fontSize: 13, color: "#475569", maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Upload candidate resumes in bulk. AI will parse each one and rank them against your open roles — exactly like Naukri's resume database, but with smarter matching.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: 13, padding: "10px 24px", background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              📂 Upload Resumes
            </button>
            <button onClick={() => handleFiles([null, null, null])}
              style={{ fontSize: 13, padding: "10px 24px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#6B6B68", cursor: "pointer" }}>
              🎲 Try with Demo Data
            </button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={{ background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>🔄 How Resume Screening Bridges to ELO Hiring</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { step: "01", icon: "📂", title: "Upload Resumes", desc: "Bulk upload PDF/DOC resumes from any source — Naukri, LinkedIn, email, direct.", color: "#3D4EAC" },
            { step: "02", icon: "🤖", title: "AI Parses & Scores", desc: "AI extracts skills, exp, CTC, education and scores each resume against your role requirements.", color: "#8b5cf6" },
            { step: "03", icon: "📨", title: "Invite to Capabilio", desc: "Shortlisted candidates get an invite to complete the ELO skill assessment — replacing guesswork with evidence.", color: "#22c55e" },
            { step: "04", icon: "⚡", title: "ELO Profile Unlocked", desc: "Once they complete the assessment, resume data is upgraded to a live ELO profile with Arena performance.", color: "#FFD166" },
          ].map((s) => (
            <div key={s.step} style={{ padding: "16px", background: `${s.color}06`, border: `1px solid ${s.color}15`, borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontSize: 10, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: s.color }}>STEP {s.step}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {viewResume && <DetailModal resume={viewResume} onClose={() => setViewResume(null)} />}
    </div>
  )
}
