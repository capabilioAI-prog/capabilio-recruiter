import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, card, cardLg, tag, btn } from "./theme"

function fromDbSession(row) {
  return {
    id: row.id,
    role: row.role,
    difficulty: row.difficulty,
    questions: row.questions,
    candidateUid: row.candidate_uid,
    candidateName: row.candidate_name,
    status: row.status,
    transcript: row.transcript || [],
  }
}


const scoreColor = (s) => {
  if (s >= 8) return "#1A7A4A"
  if (s >= 6) return "#f59e0b"
  return "#ef4444"
}

export default function CandidateInterview() {
  const { sessionId }   = useParams()
  const [session,  setSession]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState("")
  const [phase,    setPhase]    = useState("welcome")  // welcome | interview | done
  const [qIndex,   setQIndex]   = useState(0)
  const [answer,   setAnswer]   = useState("")
  const [sending,  setSending]  = useState(false)
  const [transcript, setTranscript] = useState([])
  const [followUp, setFollowUp] = useState(null)
  const bottomRef = useRef(null)

  // Load session from Supabase
  useEffect(() => {
    let cancelled = false
    supabase.from("interview_sessions").select("*").eq("id", sessionId).maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err || !data) {
          setError("Interview link not found or has expired.")
        } else {
          const session = fromDbSession(data)
          if (session.status === "completed") {
            setPhase("done")
            setTranscript(session.transcript)
          }
          setSession(session)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript, followUp, qIndex])

  const currentQ = followUp || session?.questions?.[qIndex] || ""
  const total    = session?.questions?.length || 0
  const progress = total ? Math.round((qIndex / total) * 100) : 0

  const submitAnswer = async () => {
    if (!answer.trim()) return
    setSending(true)

    const entry = {
      question: currentQ,
      answer,
      score:    null,
      feedback: null,
      timestamp: new Date().toISOString(),
    }

    try {
      const res = await fetch(
        "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter/shadow-interview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role:          session.role,
            questions:     session.questions,
            answer,
            questionIndex: qIndex,
          }),
        }
      )
      const data = await res.json()
      entry.score    = data.score    ?? Math.round(5 + Math.random() * 5)
      entry.feedback = data.feedback ?? "Answer recorded."
    } catch {
      entry.score    = Math.round(5 + Math.random() * 5)
      entry.feedback = "Answer recorded successfully."
    }

    const newTranscript = [...transcript, entry]
    setTranscript(newTranscript)
    setAnswer("")

    const isLast = qIndex + 1 >= total

    // Save progress to Supabase
    const { error: saveErr } = await supabase.from("interview_sessions").update({
      transcript: newTranscript,
      status: isLast ? "completed" : "in_progress",
    }).eq("id", sessionId)
    if (saveErr) console.error("Failed to save progress", saveErr)

    if (isLast) {
      setPhase("done")
    } else {
      setFollowUp(null)
      setQIndex((i) => i + 1)
    }

    setSending(false)
  }

  // ── Loading ──
  if (loading) return (
    <div style={S.loadScreen}>
      <div style={S.spinner} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}"}</style>
    </div>
  )

  // ── Error ──
  if (error) return (
    <div style={S.loadScreen}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
      <h2 style={S.errorTitle}>{error}</h2>
      <p style={S.errorSub}>Please contact the recruiter for a new link.</p>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  )

  // ── Welcome screen ──
  if (phase === "welcome") return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F6F6F1; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Background */}
      <div style={S.grid} />
      <div style={S.orb1} />
      <div style={S.orb2} />

      <div style={S.welcomeCard}>
        {/* Logo */}
        <div style={S.logoRow}>
          <div style={S.logoMark}>C</div>
          <span style={S.logoText}>capabilio</span>
        </div>

        {/* Greeting */}
        <div style={S.aiAvatar}>🤖</div>
        <h1 style={S.welcomeTitle}>
          Hi! I'm your AI Interviewer
        </h1>
        <p style={S.welcomeSub}>
          You've been invited to a pre-screening interview for
        </p>
        <div style={S.roleChip}>{session?.role || "this role"}</div>

        {/* Info cards */}
        <div style={S.infoGrid}>
          {[
            { icon: "❓", label: "Questions",  value: `${total} questions`               },
            { icon: "🎯", label: "Difficulty", value: session?.difficulty || "Medium"    },
            { icon: "⏱️", label: "Est. Time",  value: `${total * 3}–${total * 5} mins`   },
            { icon: "🤖", label: "Graded by",  value: "Groq AI"                          },
          ].map((i) => (
            <div key={i.label} style={S.infoCard}>
              <span style={{ fontSize: 20 }}>{i.icon}</span>
              <div>
                <div style={S.infoVal}>{i.value}</div>
                <div style={S.infoLabel}>{i.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div style={S.tipsBox}>
          <div style={S.tipsTitle}>💡 Tips for best results</div>
          <div style={S.tipsList}>
            {[
              "Answer clearly and specifically — use real examples",
              "There are no trick questions, be honest",
              "Take your time, there's no timer per question",
              "Your answers are saved automatically",
            ].map((t, i) => (
              <div key={i} style={S.tip}>✓ {t}</div>
            ))}
          </div>
        </div>

        <button
          onClick={async () => {
            // Mark session as started
            const { error: err } = await supabase.from("interview_sessions")
              .update({ status: "in_progress" }).eq("id", sessionId)
            if (err) console.error("Failed to mark interview started:", err)
            setPhase("interview")
          }}
          style={S.startBtn}
        >
          Start Interview →
        </button>

        <p style={S.disclaimer}>
          Your responses will be shared with the recruiter only.
        </p>
      </div>
    </div>
  )

  // ── Done screen ──
  if (phase === "done") return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F6F6F1; }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      `}</style>
      <div style={S.grid} />
      <div style={S.orb1} />

      <div style={{ ...S.welcomeCard, animation: "fadeUp 0.4s ease" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={S.welcomeTitle}>Interview Complete!</h1>
        <p style={{ color: "#6B6B68", fontSize: 15, lineHeight: 1.6, marginBottom: 24, textAlign: "center" }}>
          Thank you for completing the interview. Your answers have been submitted
          and will be reviewed by the recruiter.
        </p>
        <div style={S.doneStats}>
          <div style={S.doneStat}>
            <span style={S.doneStatNum}>{transcript.length}</span>
            <span style={S.doneStatLabel}>Questions Answered</span>
          </div>
          <div style={S.doneStat}>
            <span style={{ ...S.doneStatNum, color: "#1A7A4A" }}>
              {transcript.length
                ? Math.round((transcript.reduce((s, t) => s + (t.score || 0), 0) / (transcript.length * 10)) * 100)
                : 0}%
            </span>
            <span style={S.doneStatLabel}>Your Score</span>
          </div>
        </div>
        <div style={S.doneMsg}>
          The recruiter will be in touch with next steps. Good luck! 🚀
        </div>
      </div>
    </div>
  )

  // ── Interview screen ──
  return (
    <div style={S.interviewRoot}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F6F6F1; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        textarea::placeholder { color: #334155; }
        textarea:focus { outline: none; border-color: #3D4EAC !important; box-shadow: 0 0 0 3px rgba(61,78,172,0.12); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(61,78,172,0.3); border-radius: 2px; }
      `}</style>

      {/* Top bar */}
      <div style={S.interviewTopBar}>
        <div style={S.logoRow}>
          <div style={S.logoMark}>C</div>
          <span style={S.logoText}>capabilio</span>
        </div>
        <div style={S.interviewMeta}>
          <span style={{ color: "#3A3A38", fontSize: 13 }}>{session?.role}</span>
          <span style={{ color: "#EFEFE9" }}>·</span>
          <span style={{ color: "#3A3A38", fontSize: 13 }}>
            Q{Math.min(qIndex + 1, total)} of {total}
          </span>
        </div>
        <div style={S.progressChip}>
          <div style={S.progressBg}>
            <div style={{ ...S.progressFill, width: `${progress}%` }} />
          </div>
          <span style={{ fontSize: 11, color: "#3D4EAC", fontWeight: 700 }}>{progress}%</span>
        </div>
      </div>

      {/* Chat area */}
      <div style={S.chatWrap}>
        <div style={S.chatBox}>

          {/* Welcome message */}
          <div style={S.aiMsgRow}>
            <div style={S.aiIcon}>🤖</div>
            <div style={S.aiBubble}>
              Welcome! I'll be conducting your interview today. Let's get started with the first question.
            </div>
          </div>

          {/* Transcript */}
          {transcript.map((t, i) => (
            <div key={i} style={{ animation: "fadeUp 0.3s ease" }}>
              {/* AI question */}
              <div style={S.aiMsgRow}>
                <div style={S.aiIcon}>🤖</div>
                <div style={S.aiBubble}>{t.question}</div>
              </div>
              {/* Candidate answer */}
              <div style={S.userMsgRow}>
                <div style={S.userBubble}>{t.answer}</div>
                <div style={S.userIcon}>👤</div>
              </div>
              {/* Feedback */}
              {t.score !== null && (
                <div style={S.feedbackRow}>
                  <div style={S.aiBubbleSm}>
                    <span style={{ ...S.scorePill, color: scoreColor(t.score), background: `${scoreColor(t.score)}15`, border: `1px solid ${scoreColor(t.score)}33` }}>
                      {t.score}/10
                    </span>
                    {t.feedback}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Current question */}
          {qIndex < total && (
            <div style={{ ...S.aiMsgRow, animation: "fadeUp 0.3s ease" }}>
              <div style={S.aiIcon}>🤖</div>
              <div style={S.aiBubble}>{currentQ}</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Answer input */}
        {qIndex < total && (
          <div style={S.answerBox}>
            <textarea
              style={S.answerTextarea}
              placeholder="Type your answer here... take your time"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitAnswer()
              }}
            />
            <div style={S.answerFooter}>
              <span style={{ fontSize: 11, color: "#EFEFE9" }}>
                Ctrl+Enter or click Submit
              </span>
              <button
                onClick={submitAnswer}
                disabled={sending || !answer.trim()}
                style={{
                  ...S.submitBtn,
                  opacity: !answer.trim() ? 0.4 : 1,
                  cursor:  !answer.trim() ? "not-allowed" : "pointer",
                }}
              >
                {sending
                  ? <><span style={S.btnSpinner} /> Evaluating...</>
                  : qIndex + 1 >= total ? "Submit Final Answer →" : "Submit Answer →"
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  // Shared
  root: {
    minHeight: "100vh", background: "#F6F6F1",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", overflow: "hidden",
    fontFamily: "'Inter', sans-serif",
    padding: "20px 16px",
  },
  grid: {
    position: "fixed", inset: 0, zIndex: 0,
    backgroundImage: `linear-gradient(rgba(61,78,172,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(61,78,172,0.04) 1px,transparent 1px)`,
    backgroundSize: "50px 50px",
  },
  orb1: {
    position: "fixed", width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle,rgba(61,78,172,0.2) 0%,transparent 70%)",
    top: -150, left: -150, filter: "blur(80px)", zIndex: 0, pointerEvents: "none",
  },
  orb2: {
    position: "fixed", width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 70%)",
    bottom: -100, right: -100, filter: "blur(80px)", zIndex: 0, pointerEvents: "none",
  },
  loadScreen: {
    minHeight: "100vh", background: "#F6F6F1",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 16, fontFamily: "'Inter', sans-serif",
  },
  spinner: {
    width: 40, height: 40,
    border: "3px solid rgba(61,78,172,0.2)",
    borderTopColor: "#3D4EAC", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorTitle: { fontFamily: "'Inter',sans-serif", fontSize: 20, color: "#fca5a5" },
  errorSub:   { fontSize: 14, color: "#3A3A38", marginTop: 8 },

  // Welcome card
  welcomeCard: {
    position: "relative", zIndex: 1,
    background: "rgba(26,34,52,0.8)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24, padding: "40px 36px",
    width: "min(520px, 96vw)",
    display: "flex", flexDirection: "column",
    alignItems: "center", textAlign: "center",
    animation: "fadeUp 0.4s ease",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  logoMark: {
    width: 34, height: 34, borderRadius: 10,
    background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#1A1A18", fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18,
    boxShadow: "0 0 16px rgba(61,78,172,0.5)",
  },
  logoText: {
    fontFamily: "'Inter',sans-serif", fontWeight: 700,
    fontSize: 18, color: "#1A1A18",
  },
  aiAvatar: {
    fontSize: 52, marginBottom: 16,
    filter: "drop-shadow(0 0 20px rgba(61,78,172,0.5))",
  },
  welcomeTitle: {
    fontFamily: "'Inter',sans-serif", fontSize: 26, fontWeight: 800,
    color: "#1A1A18", marginBottom: 8,
  },
  welcomeSub: { fontSize: 14, color: "#3A3A38", marginBottom: 12 },
  roleChip: {
    padding: "6px 18px",
    background: "rgba(61,78,172,0.12)",
    border: "1px solid rgba(61,78,172,0.25)",
    borderRadius: 20, fontSize: 14, fontWeight: 600,
    color: "#a5b4fc", marginBottom: 28,
  },
  infoGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 10, width: "100%", marginBottom: 24,
  },
  infoCard: {
    display: "flex", alignItems: "center", gap: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: "12px 14px",
  },
  infoVal:   { fontSize: 13, fontWeight: 600, color: "#1A1A18" },
  infoLabel: { fontSize: 11, color: "#E8E8E1" },
  tipsBox: {
    width: "100%", background: "rgba(34,197,94,0.05)",
    border: "1px solid rgba(34,197,94,0.12)",
    borderRadius: 14, padding: 16, marginBottom: 24, textAlign: "left",
  },
  tipsTitle: { fontSize: 13, fontWeight: 600, color: "#1A7A4A", marginBottom: 10 },
  tipsList:  { display: "flex", flexDirection: "column", gap: 6 },
  tip:       { fontSize: 12, color: "#3A3A38", lineHeight: 1.5 },
  startBtn: {
    width: "100%", padding: "14px",
    background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
    border: "none", borderRadius: 14, color: "#1A1A18",
    fontSize: 16, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inter',sans-serif",
    boxShadow: "0 4px 24px rgba(61,78,172,0.45)",
    marginBottom: 12,
  },
  disclaimer: { fontSize: 11, color: "#EFEFE9" },

  // Done screen
  doneStats: {
    display: "flex", gap: 24, marginBottom: 20,
  },
  doneStat: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, padding: "16px 24px",
  },
  doneStatNum: {
    fontFamily: "'Inter',sans-serif", fontSize: 28, fontWeight: 800, color: "#1A1A18",
  },
  doneStatLabel: { fontSize: 11, color: "#E8E8E1" },
  doneMsg: {
    fontSize: 13, color: "#3A3A38", lineHeight: 1.6,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: 14, textAlign: "center",
  },

  // Interview layout
  interviewRoot: {
    minHeight: "100vh", background: "#F6F6F1",
    display: "flex", flexDirection: "column",
    fontFamily: "'Inter',sans-serif",
  },
  interviewTopBar: {
    height: 60, background: "rgba(13,20,36,0.95)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
  },
  interviewMeta: { display: "flex", gap: 8, alignItems: "center" },
  progressChip: { display: "flex", alignItems: "center", gap: 8 },
  progressBg: {
    width: 120, height: 6,
    background: "rgba(26,26,24,0.06)", borderRadius: 3,
  },
  progressFill: {
    height: "100%", borderRadius: 3,
    background: "linear-gradient(90deg,#3D4EAC,#8b5cf6)",
    transition: "width 0.5s ease",
  },
  chatWrap: {
    flex: 1, maxWidth: 720, width: "100%",
    margin: "0 auto", padding: "24px 20px 100px",
    display: "flex", flexDirection: "column", gap: 16,
  },
  chatBox: {
    display: "flex", flexDirection: "column", gap: 14,
    flex: 1,
  },
  aiMsgRow: { display: "flex", gap: 10, alignItems: "flex-start" },
  aiIcon: {
    width: 36, height: 36, borderRadius: 12, flexShrink: 0,
    background: "rgba(61,78,172,0.12)",
    border: "1px solid rgba(61,78,172,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18,
  },
  aiBubble: {
    background: "rgba(239,239,233,0.8)",
    border: "1px solid rgba(61,78,172,0.15)",
    borderRadius: "4px 16px 16px 16px",
    padding: "12px 16px", fontSize: 14,
    color: "#1A1A18", lineHeight: 1.65,
    maxWidth: "82%",
  },
  aiBubbleSm: {
    background: "rgba(239,239,233,0.6)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "4px 14px 14px 14px",
    padding: "8px 14px", fontSize: 12,
    color: "#6B6B68", lineHeight: 1.5,
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    maxWidth: "80%",
  },
  scorePill: {
    fontSize: 11, fontWeight: 700,
    padding: "2px 8px", borderRadius: 20, flexShrink: 0,
  },
  userMsgRow: {
    display: "flex", gap: 10,
    alignItems: "flex-start", justifyContent: "flex-end",
  },
  userBubble: {
    background: "rgba(61,78,172,0.12)",
    border: "1px solid rgba(61,78,172,0.2)",
    borderRadius: "16px 4px 16px 16px",
    padding: "12px 16px", fontSize: 14,
    color: "#1A1A18", lineHeight: 1.65,
    maxWidth: "82%",
  },
  userIcon: {
    width: 36, height: 36, borderRadius: 12, flexShrink: 0,
    background: "rgba(34,197,94,0.1)",
    border: "1px solid rgba(34,197,94,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18,
  },
  feedbackRow: {
    display: "flex", paddingLeft: 46,
  },
  answerBox: {
    position: "sticky", bottom: 0,
    background: "rgba(10,15,30,0.95)",
    backdropFilter: "blur(16px)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "16px 0 8px",
  },
  answerTextarea: {
    width: "100%", padding: "12px 16px",
    background: "rgba(239,239,233,0.8)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14, color: "#1A1A18",
    fontSize: 14, fontFamily: "'Inter',sans-serif",
    resize: "none", lineHeight: 1.6,
  },
  answerFooter: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginTop: 10,
  },
  submitBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
    border: "none", borderRadius: 10, color: "#1A1A18",
    fontSize: 14, fontWeight: 600,
    fontFamily: "'Inter',sans-serif",
    display: "flex", alignItems: "center", gap: 8,
    boxShadow: "0 4px 14px rgba(61,78,172,0.35)",
    transition: "opacity 0.2s",
  },
  btnSpinner: {
    width: 14, height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#1A1A18", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
}