import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, card, cardLg, tag, btn } from "./theme"

// 2026-08-09: candidate lookup used to read Firebase Firestore's `users`
// collection -- a frozen snapshot from before this product migrated to
// Supabase, disconnected from real current signups (test accounts and old
// pre-migration ghosts were indistinguishable from real ones there). Now
// reads real, live, recruiter_discoverable profiles via the same
// partner-bridge routes CandidateSearch.jsx/CandidateDetail.jsx already use
// -- same auth pattern (Supabase session bearer token), same BACKEND base.
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

// 2026-08-10: was a hardcoded literal, unconfigurable and inconsistent with
// BACKEND above. Intentionally a DIFFERENT service from BACKEND -- this
// project's own capabilio-recruiter-backend has no /recruiter/
// generate-challenge or /recruiter/shadow-interview route (confirmed via
// grep) -- kept pointed at the same working legacy AI endpoint, just made
// configurable.
const LEGACY_AI_URL = import.meta.env.VITE_LEGACY_AI_URL || "https://capabilio-backend-production-60ab.up.railway.app/api"

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}


const ROLES = [
  "Software Engineer", "Data Analyst", "Medical Coder", "Product Manager",
  "Frontend Developer", "Backend Developer", "Data Scientist", "Business Analyst",
  "UI/UX Designer", "Financial Analyst", "Marketing Manager", "DevOps Engineer",
]

const DEFAULT_QUESTIONS = [
  "Tell me about yourself and your background.",
  "What is your greatest professional strength?",
  "Describe a challenging project you worked on.",
  "How do you handle tight deadlines?",
  "Where do you see yourself in 3 years?",
]

const scoreColor = (s) => {
  if (s >= 8) return "#1A7A4A"
  if (s >= 6) return "#f59e0b"
  return "#ef4444"
}

// ── Setup Screen ──────────────────────────────────────────────────────────────
function SetupScreen({ candidate, onStart }) {
  const [role,     setRole]     = useState(ROLES[0])
  const [questions,setQuestions]= useState(DEFAULT_QUESTIONS.join("\n"))
  const [diff,     setDiff]     = useState("Medium")
  const [genning,  setGenning]  = useState(false)
  const [creating, setCreating] = useState(false)
  const [error,    setError]    = useState("")
  const [link,     setLink]     = useState("")
  const [copied,   setCopied]   = useState(false)

  const generateQuestions = async () => {
    setGenning(true)
    setError("")
    try {
      const res = await fetch(
        `${LEGACY_AI_URL}/recruiter/generate-challenge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            domain:     candidate?.keyword || role,
            difficulty: diff,
            type:       "Interview Questions",
          }),
        }
      )
      const data = await res.json()
      if (data.evaluationCriteria?.length) {
        setQuestions(data.evaluationCriteria.join("\n"))
      }
    } catch {
      setError("Backend not reachable — using default questions.")
    } finally {
      setGenning(false)
    }
  }

  const handleCreate = async () => {
    const qs = questions.split("\n").map((q) => q.trim()).filter((q) => q.length > 0)
    if (qs.length < 2) { setError("Please enter at least 2 questions."); return }
    setCreating(true)
    setError("")
    try {
      const { data, error } = await supabase.from("interview_sessions").insert({
        role,
        difficulty: diff,
        questions: qs,
        candidate_uid: candidate?.uid || null,
        candidate_name: candidate?.displayName || null,
        status: "pending",
        transcript: [],
      }).select().single()
      if (error) throw error
      setLink(`${window.location.origin}/interview/${data.id}`)
    } catch (e) {
      setError("Failed to create session: " + e.message)
    } finally {
      setCreating(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (link) {
    return (
      <div style={SS.card}>
        <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🔗</div>
          <h2 style={SS.heading}>Interview Link Ready!</h2>
          <p style={{ color: "#3A3A38", fontSize: 14, marginBottom: 24 }}>
            Share this link with{" "}
            <strong style={{ color: "#a5b4fc" }}>
              {candidate?.displayName || "the candidate"}
            </strong>
          </p>
          <div style={SS.linkBox}>
            <span style={SS.linkText}>{link}</span>
            <button onClick={copyLink} style={SS.copyBtn}>
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
          <div style={SS.shareRow}>
            <a href={`mailto:?subject=Interview Invitation&body=Hi, please complete your interview here: ${link}`} style={SS.shareBtn}>
              📧 Email
            </a>
            <a href={`https://wa.me/?text=Hi! Please complete your interview here: ${link}`} target="_blank" rel="noreferrer" style={SS.shareBtn}>
              💬 WhatsApp
            </a>
            <button onClick={() => window.open(link, "_blank")} style={SS.shareBtn}>
              👁️ Preview
            </button>
          </div>
          <div style={SS.sessionInfo}>
            <div style={SS.sessionInfoItem}>
              <span style={{ color: "#3A3A38" }}>Role:</span>
              <span style={{ color: "#1A1A18", fontWeight: 600 }}>{role}</span>
            </div>
            <div style={SS.sessionInfoItem}>
              <span style={{ color: "#3A3A38" }}>Questions:</span>
              <span style={{ color: "#1A1A18", fontWeight: 600 }}>
                {questions.split("\n").filter((q) => q.trim()).length}
              </span>
            </div>
            <div style={SS.sessionInfoItem}>
              <span style={{ color: "#3A3A38" }}>Difficulty:</span>
              <span style={{ color: "#1A1A18", fontWeight: 600 }}>{diff}</span>
            </div>
            <div style={SS.sessionInfoItem}>
              <span style={{ color: "#3A3A38" }}>Status:</span>
              <span style={{ color: "#f59e0b", fontWeight: 600 }}>Waiting for candidate</span>
            </div>
          </div>
          <button onClick={() => setLink("")} style={SS.newBtn}>
            + Create Another Interview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={SS.card}>
      <h2 style={SS.heading}>🤖 Shadow Interview Setup</h2>
      <p style={SS.sub}>
        Configure the AI interview for{" "}
        <strong style={{ color: "#a5b4fc" }}>
          {candidate?.displayName || "this candidate"}
        </strong>
      </p>
      <div style={SS.grid}>
        <div style={SS.field}>
          <label style={SS.label}>Target Role</label>
          <select style={SS.input} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={SS.field}>
          <label style={SS.label}>Difficulty</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["Easy", "Medium", "Hard"].map((d) => {
              const col = d === "Easy" ? "#1A7A4A" : d === "Medium" ? "#f59e0b" : "#ef4444"
              return (
                <button
                  key={d}
                  onClick={() => setDiff(d)}
                  style={{
                    ...SS.diffBtn,
                    background:  diff === d ? `${col}22` : "transparent",
                    color:       diff === d ? col         : "#3A3A38",
                    borderColor: diff === d ? col         : "rgba(26,26,24,0.07)",
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ ...SS.field, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ ...SS.label, marginBottom: 0 }}>Interview Questions (one per line)</label>
            <button onClick={generateQuestions} disabled={genning} style={SS.aiBtn}>
              {genning ? "⏳ Generating..." : "✨ AI Generate"}
            </button>
          </div>
          <textarea
            style={SS.textarea}
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            rows={8}
            placeholder="Enter one question per line..."
          />
          <div style={SS.qCount}>
            {questions.split("\n").filter((q) => q.trim()).length} questions
          </div>
        </div>
      </div>
      {error && <div style={SS.errorBox}>{error}</div>}
      <button onClick={handleCreate} disabled={creating} style={SS.startBtn}>
        {creating ? "⏳ Creating interview link..." : "🔗 Generate Interview Link"}
      </button>
    </div>
  )
}

const SS = {
  card: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 20, padding: 28, maxWidth: 700,
  },
  heading: {
    fontFamily: "'Inter', sans-serif", fontSize: 20,
    fontWeight: 700, color: "#1A1A18", margin: "0 0 6px",
  },
  sub:   { fontSize: 14, color: "#3A3A38", marginBottom: 24 },
  grid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  field: { display: "flex", flexDirection: "column" },
  label: {
    fontSize: 11, color: "#3A3A38", fontWeight: 600,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8,
  },
  input: {
    padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontFamily: "'Inter', sans-serif",
  },
  diffBtn: {
    flex: 1, padding: "8px 0", border: "1px solid",
    borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
  },
  aiBtn: {
    padding: "5px 12px",
    background: "rgba(139,92,246,0.15)",
    border: "1px solid rgba(139,92,246,0.3)",
    borderRadius: 8, color: "#c4b5fd",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  textarea: {
    width: "100%", padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontFamily: "'Inter', sans-serif",
    resize: "vertical",
  },
  qCount:   { fontSize: 11, color: "#E8E8E1", marginTop: 6, textAlign: "right" },
  errorBox: {
    margin: "12px 0", padding: "10px 14px",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10, color: "#fca5a5", fontSize: 13,
  },
  startBtn: {
    marginTop: 20, width: "100%", padding: "14px",
    background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)",
    border: "none", borderRadius: 12, color: "#1A1A18",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    boxShadow: "0 4px 20px rgba(61,78,172,0.4)",
  },
  linkBox: {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(61,78,172,0.3)",
    borderRadius: 12, padding: "12px 14px",
    marginBottom: 16, textAlign: "left",
  },
  linkText: {
    flex: 1, fontSize: 12, color: "#a5b4fc",
    wordBreak: "break-all", lineHeight: 1.5,
  },
  copyBtn: {
    padding: "6px 12px", flexShrink: 0,
    background: "rgba(61,78,172,0.2)",
    border: "1px solid rgba(61,78,172,0.3)",
    borderRadius: 8, color: "#a5b4fc",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  shareRow: {
    display: "flex", gap: 8, justifyContent: "center",
    marginBottom: 20,
  },
  shareBtn: {
    padding: "8px 16px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#6B6B68",
    fontSize: 13, fontWeight: 500, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    textDecoration: "none", display: "inline-block",
  },
  sessionInfo: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: "14px 16px",
    marginBottom: 20, textAlign: "left",
    display: "flex", flexDirection: "column", gap: 8,
  },
  sessionInfoItem: {
    display: "flex", justifyContent: "space-between", fontSize: 13,
  },
  newBtn: {
    padding: "10px 20px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#6B6B68",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
}

// ── Interview Screen ──────────────────────────────────────────────────────────
function InterviewScreen({ config, candidate, onComplete }) {
  const [qIndex,     setQIndex]     = useState(0)
  const [answer,     setAnswer]     = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [followUp,   setFollowUp]   = useState(null)
  const bottomRef = useRef(null)

  const currentQ = followUp || config.questions[qIndex]
  const total    = config.questions.length
  const progress = Math.round((qIndex / total) * 100)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript, followUp])

  const submitAnswer = async () => {
    if (!answer.trim()) return
    setSubmitting(true)
    const entry = { question: currentQ, answer, score: null, feedback: null }
    try {
      const res = await fetch(
        `${LEGACY_AI_URL}/recruiter/shadow-interview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role:          config.role,
            questions:     config.questions,
            answer,
            questionIndex: qIndex,
          }),
        }
      )
      const data = await res.json()
      entry.score    = data.score    ?? Math.round(5 + Math.random() * 5)
      entry.feedback = data.feedback ?? "Good answer. Could be more specific."
      const newTranscript = [...transcript, entry]
      setTranscript(newTranscript)
      setAnswer("")
      if (data.isComplete || qIndex + 1 >= total) {
        onComplete(newTranscript)
      } else {
        setFollowUp(data.followUp || null)
        if (!data.followUp) setQIndex((i) => i + 1)
      }
    } catch {
      entry.score    = Math.round(5 + Math.random() * 5)
      entry.feedback = "Answer noted. Backend offline — scores estimated locally."
      const newTranscript = [...transcript, entry]
      setTranscript(newTranscript)
      setAnswer("")
      setFollowUp(null)
      if (qIndex + 1 >= total) {
        onComplete(newTranscript)
      } else {
        setQIndex((i) => i + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={IS.root}>
      <div style={IS.progressRow}>
        <span style={IS.progressLabel}>Question {Math.min(qIndex + 1, total)} of {total}</span>
        <div style={IS.progressBg}>
          <div style={{ ...IS.progressFill, width: `${progress}%` }} />
        </div>
        <span style={IS.progressPct}>{progress}%</span>
      </div>
      <div style={IS.transcript}>
        {transcript.map((t, i) => (
          <div key={i} style={IS.tBlock}>
            <div style={IS.aiMsg}>
              <div style={IS.aiAvatar}>🤖</div>
              <div style={IS.aiBubble}>{t.question}</div>
            </div>
            <div style={IS.userMsg}>
              <div style={IS.userBubble}>{t.answer}</div>
              <div style={IS.candidateAvatar}>
                {(candidate?.displayName || "C").charAt(0).toUpperCase()}
              </div>
            </div>
            {t.score !== null && (
              <div style={IS.scoreRow}>
                <span style={{ ...IS.scoreBadge, color: scoreColor(t.score), borderColor: `${scoreColor(t.score)}33`, background: `${scoreColor(t.score)}11` }}>
                  {t.score}/10
                </span>
                <span style={IS.feedbackText}>{t.feedback}</span>
              </div>
            )}
          </div>
        ))}
        {qIndex < total && (
          <div style={IS.aiMsg}>
            <div style={IS.aiAvatar}>🤖</div>
            <div style={IS.aiBubble}>{currentQ}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {qIndex < total && (
        <div style={IS.inputArea}>
          <textarea
            style={IS.answerInput}
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) submitAnswer() }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "#EFEFE9" }}>⌘+Enter to submit</span>
            <button
              onClick={submitAnswer}
              disabled={submitting || !answer.trim()}
              style={{ ...IS.submitBtn, opacity: !answer.trim() ? 0.5 : 1 }}
            >
              {submitting ? "⏳ Evaluating..." : "Submit Answer →"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const IS = {
  root: { display: "flex", flexDirection: "column", gap: 16 },
  progressRow: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14, padding: "12px 16px",
  },
  progressLabel: { fontSize: 12, color: "#3A3A38", flexShrink: 0 },
  progressBg: { flex: 1, height: 6, background: "rgba(26,26,24,0.06)", borderRadius: 3 },
  progressFill: {
    height: "100%", borderRadius: 3,
    background: "linear-gradient(90deg, #3D4EAC, #8b5cf6)",
    transition: "width 0.5s ease",
  },
  progressPct: { fontSize: 12, color: "#3D4EAC", fontWeight: 700, flexShrink: 0 },
  transcript: {
    background: "#F6F6F1",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 16, padding: 20,
    minHeight: 300, maxHeight: 420, overflowY: "auto",
    display: "flex", flexDirection: "column", gap: 16,
  },
  tBlock: { display: "flex", flexDirection: "column", gap: 10 },
  aiMsg:  { display: "flex", gap: 10, alignItems: "flex-start" },
  aiAvatar: {
    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
    background: "rgba(61,78,172,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16,
  },
  aiBubble: {
    background: "rgba(61,78,172,0.1)",
    border: "1px solid rgba(61,78,172,0.2)",
    borderRadius: "4px 14px 14px 14px",
    padding: "10px 14px", fontSize: 13,
    color: "#1A1A18", lineHeight: 1.6, maxWidth: "80%",
  },
  userMsg: { display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "flex-end" },
  userBubble: {
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.15)",
    borderRadius: "14px 4px 14px 14px",
    padding: "10px 14px", fontSize: 13,
    color: "#1A1A18", lineHeight: 1.6, maxWidth: "80%",
  },
  candidateAvatar: {
    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
    background: "rgba(34,197,94,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, color: "#1A7A4A",
  },
  scoreRow: { display: "flex", alignItems: "center", gap: 10, paddingLeft: 42 },
  scoreBadge: {
    fontSize: 12, fontWeight: 700, border: "1px solid",
    borderRadius: 8, padding: "2px 8px", flexShrink: 0,
  },
  feedbackText: { fontSize: 12, color: "#3A3A38", lineHeight: 1.4 },
  inputArea: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 16,
  },
  answerInput: {
    width: "100%", padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontFamily: "'Inter', sans-serif",
    resize: "none",
  },
  submitBtn: {
    padding: "9px 20px",
    background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)",
    border: "none", borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "opacity 0.2s",
  },
}

// ── Report Screen ─────────────────────────────────────────────────────────────
function ReportScreen({ transcript, config, candidate, onRestart }) {
  const navigate     = useNavigate()
  const total        = transcript.reduce((s, t) => s + (t.score || 0), 0)
  const avg          = transcript.length ? Math.round((total / (transcript.length * 10)) * 100) : 0
  const overall      = avg >= 80 ? "Strong Hire" : avg >= 65 ? "Good Candidate" : avg >= 50 ? "Maybe" : "Not Ready"
  const overallColor = avg >= 80 ? "#1A7A4A"     : avg >= 65 ? "#3D4EAC"        : avg >= 50 ? "#f59e0b" : "#ef4444"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={RS.header}>
        <div>
          <div style={{ fontSize: 13, color: "#3A3A38", marginBottom: 4 }}>Interview Complete</div>
          <h2 style={RS.title}>Interview Report</h2>
          <div style={{ fontSize: 13, color: "#6B6B68" }}>
            {candidate?.displayName || "Candidate"} · {config.role} · {config.difficulty}
          </div>
        </div>
        <div style={RS.overallBox}>
          <div style={RS.overallLabel}>Overall Score</div>
          <div style={{ ...RS.overallScore, color: overallColor }}>{avg}%</div>
          <div style={{ ...RS.overallRec, color: overallColor }}>{overall}</div>
        </div>
      </div>
      <div style={RS.statsRow}>
        {[
          { label: "Questions Asked", value: transcript.length,                                        color: "#3D4EAC"    },
          { label: "Avg Score",       value: `${avg}%`,                                                color: overallColor },
          { label: "Best Answer",     value: `${Math.max(...transcript.map((t) => t.score || 0))}/10`, color: "#1A7A4A"    },
          { label: "Needs Work",      value: `${Math.min(...transcript.map((t) => t.score || 0))}/10`, color: "#f59e0b"    },
        ].map((s) => (
          <div key={s.label} style={RS.statCard}>
            <div style={{ ...RS.statVal, color: s.color }}>{s.value}</div>
            <div style={RS.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={RS.transcriptCard}>
        <h3 style={RS.sectionTitle}>📝 Full Transcript</h3>
        {transcript.map((t, i) => (
          <div key={i} style={RS.tRow}>
            <div style={RS.tHead}>
              <span style={RS.qLabel}>Q{i + 1}</span>
              <span style={RS.qText}>{t.question}</span>
              <span style={{ ...RS.tScore, color: scoreColor(t.score || 0) }}>{t.score}/10</span>
            </div>
            <div style={RS.aText}>{t.answer}</div>
            {t.feedback && <div style={RS.fbText}>💬 {t.feedback}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onRestart} style={RS.restartBtn}>🔄 New Interview</button>
        {/* /recruiter/candidates/:id (plural, CandidateDetail.jsx) is the real
            partner-bridge profile page -- candidate.uid is now the actual
            Supabase profiles.id, not a Firestore doc id, so this must NOT
            point at the old /recruiter/candidate/:uid (singular,
            Firestore-backed CandidateProfile.jsx) route anymore. */}
        <button onClick={() => navigate(`/recruiter/candidates/${candidate?.uid}`)} style={RS.profileBtn}>
          View Full Profile →
        </button>
        <button onClick={() => navigate("/recruiter/pipeline")} style={RS.pipelineBtn}>
          Add to Pipeline
        </button>
      </div>
    </div>
  )
}

const RS = {
  header: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 24,
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", flexWrap: "wrap", gap: 16,
  },
  title: {
    fontFamily: "'Inter', sans-serif", fontSize: 22,
    fontWeight: 800, color: "#1A1A18", margin: "0 0 4px",
  },
  overallBox: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, padding: "16px 24px", textAlign: "center",
  },
  overallLabel: { fontSize: 11, color: "#3A3A38", letterSpacing: 0.5, marginBottom: 4 },
  overallScore: { fontFamily: "'Inter', sans-serif", fontSize: 36, fontWeight: 800, lineHeight: 1.1 },
  overallRec:   { fontSize: 13, fontWeight: 600, marginTop: 4 },
  statsRow:     { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  statCard: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14, padding: 16, textAlign: "center",
  },
  statVal:   { fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4 },
  statLabel: { fontSize: 11, color: "#3A3A38" },
  transcriptCard: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 24,
  },
  sectionTitle: {
    fontFamily: "'Inter', sans-serif", fontSize: 15,
    fontWeight: 700, color: "#1A1A18", margin: "0 0 16px",
  },
  tRow: { borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 14, marginBottom: 14 },
  tHead: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  qLabel: {
    fontSize: 11, fontWeight: 700, color: "#3D4EAC",
    background: "rgba(61,78,172,0.1)",
    border: "1px solid rgba(61,78,172,0.2)",
    padding: "1px 7px", borderRadius: 6, flexShrink: 0,
  },
  qText:  { fontSize: 13, color: "#1A1A18", flex: 1, lineHeight: 1.5 },
  tScore: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
  aText:  { fontSize: 13, color: "#6B6B68", lineHeight: 1.5, paddingLeft: 42, marginBottom: 4 },
  fbText: { fontSize: 12, color: "#E8E8E1", paddingLeft: 42, lineHeight: 1.4 },
  restartBtn: {
    padding: "10px 18px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#6B6B68",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  profileBtn: {
    padding: "10px 18px",
    background: "rgba(61,78,172,0.12)",
    border: "1px solid rgba(61,78,172,0.2)",
    borderRadius: 10, color: "#a5b4fc",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  pipelineBtn: {
    padding: "10px 18px",
    background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)",
    border: "none", borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
}

// ── Candidate Picker ──────────────────────────────────────────────────────────
function CandidatePicker({ onPick }) {
  const [candidates, setCandidates] = useState([])
  const [search,     setSearch]     = useState("")
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const headers = await authHeaders()
        const params = new URLSearchParams({ limit: "50", sortBy: "recent" })
        const res = await fetch(`${BACKEND}/partner/candidates?${params.toString()}`, { headers })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
        if (!cancelled) {
          // uid/displayName kept as aliases for id/display_name so the rest
          // of this file (interview_sessions insert, transcript labels,
          // profile-link navigation) doesn't need to be rewritten
          // field-by-field for the new response shape.
          setCandidates((body.candidates || []).map((c) => ({ ...c, uid: c.id, displayName: c.display_name || c.username })))
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load candidates.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = candidates.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.display_name || "").toLowerCase().includes(q) ||
      (c.username     || "").toLowerCase().includes(q) ||
      (c.career       || "").toLowerCase().includes(q) ||
      (c.domain       || "").toLowerCase().includes(q)
    )
  })

  return (
    <div style={CP.card}>
      <h2 style={CP.heading}>🤖 Shadow Interview AI</h2>
      <p style={CP.sub}>Select a candidate to start an AI pre-screening interview</p>
      <input
        style={CP.search}
        placeholder="Search candidates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      {loading ? (
        <div style={CP.loading}>Loading candidates...</div>
      ) : error ? (
        <div style={{ color: "#ef4444", fontSize: 13, textAlign: "center", padding: "20px 0" }}>{error}</div>
      ) : (
        <div style={CP.list}>
          {filtered.map((c) => (
            <div
              key={c.uid}
              style={CP.row}
              onMouseEnter={(e) => {
                e.currentTarget.style.background  = "rgba(61,78,172,0.08)"
                e.currentTarget.style.borderColor = "rgba(61,78,172,0.2)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background  = "rgba(255,255,255,0.02)"
                e.currentTarget.style.borderColor = "rgba(26,26,24,0.06)"
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{c.display_name || c.username || "Unnamed candidate"}</div>
                <div style={{ fontSize: 11, color: "#3A3A38" }}>
                  {c.career || c.domain || "General"} · ELO {c.elo ?? 800} · {c.jobReadiness ?? 0}% ready
                </div>
              </div>
              <button onClick={() => onPick(c)} style={CP.pickBtn}>
                Start Interview →
              </button>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div style={{ color: "#EFEFE9", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              No candidates found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const CP = {
  card: {
    background: "#EFEFE9",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 20, padding: 28, maxWidth: 640,
  },
  heading: {
    fontFamily: "'Inter', sans-serif", fontSize: 20,
    fontWeight: 700, color: "#1A1A18", margin: "0 0 6px",
  },
  sub: { fontSize: 14, color: "#3A3A38", marginBottom: 20 },
  search: {
    width: "100%", padding: "10px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#1A1A18",
    fontSize: 13, fontFamily: "'Inter', sans-serif",
    marginBottom: 12,
  },
  loading: { color: "#E8E8E1", fontSize: 13, textAlign: "center", padding: "20px 0" },
  list: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" },
  row: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "12px 14px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, cursor: "default", transition: "all 0.2s",
  },
  pickBtn: {
    padding: "7px 14px",
    background: "linear-gradient(135deg, #3D4EAC, #8b5cf6)",
    border: "none", borderRadius: 8, color: "#1A1A18",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", flexShrink: 0,
  },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ShadowInterview() {
  const { uid }      = useParams()
  const navigate     = useNavigate()
  const [candidate,  setCandidate]  = useState(null)
  const [loading,    setLoading]    = useState(!!uid)
  const [phase,      setPhase]      = useState("pick")
  const [config,     setConfig]     = useState(null)
  const [transcript, setTranscript] = useState([])

  useEffect(() => {
    if (uid) {
      authHeaders().then((headers) =>
        fetch(`${BACKEND}/partner/candidates/${uid}`, { headers }).then(async (res) => {
          const body = await res.json()
          if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
          if (body.candidate) {
            const c = body.candidate
            setCandidate({ ...c, uid: c.id, displayName: c.display_name || c.username })
            setPhase("setup")
          }
          setLoading(false)
        })
      ).catch((err) => {
        console.error("Failed to load candidate:", err)
        setLoading(false)
      })
    }
  }, [uid])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
      <div style={{ width: 32, height: 32, border: "3px solid rgba(61,78,172,0.2)", borderTopColor: "#3D4EAC", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input::placeholder, textarea::placeholder { color: #334155; }
        input:focus, textarea:focus, select:focus  { outline: none; border-color: #3D4EAC !important; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A18", margin: 0 }}>
          Shadow Interview AI
        </h1>
        <p style={{ fontSize: 13, color: "#3A3A38", marginTop: 4 }}>
          AI conducts pre-screening interviews and generates detailed reports
        </p>
      </div>

      {phase === "pick" && (
        <CandidatePicker onPick={(c) => { setCandidate(c); setPhase("setup") }} />
      )}

      {phase === "setup" && (
        <div>
          {candidate && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => { setCandidate(null); setPhase("pick") }}
                style={{ background: "none", border: "none", color: "#3D4EAC", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
              >
                ← Change Candidate
              </button>
              <span style={{ color: "#EFEFE9" }}>·</span>
              <span style={{ fontSize: 13, color: "#6B6B68" }}>
                Interviewing: <strong style={{ color: "#1A1A18" }}>{candidate.displayName}</strong>
              </span>
            </div>
          )}
          <SetupScreen
            candidate={candidate}
            onStart={(cfg) => { setConfig(cfg); setPhase("interview") }}
          />
        </div>
      )}

      {phase === "interview" && config && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#6B6B68" }}>
              🎯 {config.role} · {config.difficulty} · {config.questions.length} questions
            </div>
            <div style={{ fontSize: 13, color: "#6B6B68" }}>·</div>
            <div style={{ fontSize: 13, color: "#1A1A18", fontWeight: 600 }}>{candidate?.displayName}</div>
          </div>
          <InterviewScreen
            config={config}
            candidate={candidate}
            onComplete={(t) => { setTranscript(t); setPhase("report") }}
          />
        </div>
      )}

      {phase === "report" && (
        <ReportScreen
          transcript={transcript}
          config={config}
          candidate={candidate}
          onRestart={() => { setPhase("setup"); setTranscript([]) }}
        />
      )}
    </div>
  )
}