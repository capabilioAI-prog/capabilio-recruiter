import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "./firebase"

const T = {
  cream:"#F6F6F1", cream2:"#EFEFE9", cream3:"#E8E8E1",
  ink:"#1A1A18", ink2:"#3A3A38", ink3:"#6B6B68", ink4:"#9A9A97",
  indigo:"#3D4EAC", indigo2:"#5B6FD4", indigo3:"#EEF0FB",
  green:"#1A7A4A", green2:"#E8F7EF",
  amber:"#B8620A", amber2:"#FDF3E7",
  red:"#C0392B", red2:"#FDECEA",
  blue:"#1565C0", blue2:"#E8F1FB",
  border:"rgba(26,26,24,0.09)",
  shadow:"0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
  shadow2:"0 8px 32px rgba(26,26,24,0.10), 0 2px 8px rgba(26,26,24,0.06)",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const eloLevel = (e) => {
  if (e >= 1200) return { label: "Expert",       color: T.amber  }
  if (e >= 1000) return { label: "Advanced",     color: T.indigo }
  if (e >= 900)  return { label: "Intermediate", color: T.blue   }
  return               { label: "Beginner",      color: T.ink4   }
}

const domainColor = (d = "") => {
  if (d.toLowerCase().includes("medical"))   return T.green
  if (d.toLowerCase().includes("software"))  return T.indigo
  if (d.toLowerCase().includes("data"))      return T.blue
  if (d.toLowerCase().includes("finance"))   return T.amber
  if (d.toLowerCase().includes("marketing")) return T.amber
  if (d.toLowerCase().includes("design"))    return "#c2185b"
  return T.indigo
}

// ── Full Radar Chart ──────────────────────────────────────────────────────────
function RadarChart({ skills = [], size = 280 }) {
  if (!skills.length) return (
    <div style={{ color: T.ink3, textAlign: "center", padding: 40, fontSize: 13 }}>
      No skill data available
    </div>
  )
  const n = skills.length
  const cx = size / 2, cy = size / 2, r = size / 2 - 36
  const rings   = [0.25, 0.5, 0.75, 1]
  const angles  = skills.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2)
  const bgRing  = (scale) => angles.map((a) => `${cx + r * scale * Math.cos(a)},${cy + r * scale * Math.sin(a)}`).join(" ")
  const fgPts   = skills.map((s, i) => {
    const v = ((s.value || 0) / 100)
    return `${cx + r * v * Math.cos(angles[i])},${cy + r * v * Math.sin(angles[i])}`
  }).join(" ")

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {/* Background rings */}
      {rings.map((s) => (
        <polygon key={s} points={bgRing(s)}
          fill="none" stroke="rgba(61,78,172,0.07)" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {angles.map((a, i) => (
        <line key={i}
          x1={cx} y1={cy}
          x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
          stroke="rgba(61,78,172,0.07)" strokeWidth="1" />
      ))}
      {/* Data polygon */}
      <polygon points={fgPts}
        fill="rgba(61,78,172,0.1)" stroke={T.indigo} strokeWidth="2" />
      {/* Dots + labels */}
      {skills.map((s, i) => {
        const v  = ((s.value || 0) / 100)
        const px = cx + r * v * Math.cos(angles[i])
        const py = cy + r * v * Math.sin(angles[i])
        const lx = cx + (r + 22) * Math.cos(angles[i])
        const ly = cy + (r + 22) * Math.sin(angles[i])
        return (
          <g key={s.label}>
            <circle cx={px} cy={py} r={4} fill={T.indigo} />
            <text x={lx} y={ly}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="10" fill={T.ink3} fontFamily="DM Sans">
              {s.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Career Timeline ───────────────────────────────────────────────────────────
function TimelineItem({ exp }) {
  const col = domainColor(exp.industry || "")
  return (
    <div style={TL.item}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ ...TL.dot, borderColor: col, boxShadow: `0 0 10px ${col}44` }} />
        <div style={TL.line} />
      </div>
      <div style={TL.card}>
        <div style={TL.company}>{exp.company}</div>
        <div style={TL.meta}>{exp.industry} · {exp.location}</div>
        {(exp.roles || []).map((role, i) => (
          <div key={i} style={TL.role}>
            <div style={TL.roleTitle}>{role.title}</div>
            <div style={TL.roleDates}>
              {role.startDate} — {role.current ? "Present" : role.endDate}
            </div>
            {(role.skills || []).length > 0 && (
              <div style={TL.skillsRow}>
                {role.skills.map((sk, j) => (
                  <span key={j} style={TL.skillTag}>{sk}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const TL = {
  item: { display: "flex", gap: 16, paddingBottom: 24 },
  dot: {
    width: 14, height: 14, borderRadius: "50%",
    border: "2px solid", background: T.cream,
    flexShrink: 0, marginTop: 4, zIndex: 1,
  },
  line: {
    flex: 1, width: 2,
    background: `rgba(61,78,172,0.1)`,
    minHeight: 40,
  },
  card: {
    flex: 1, background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  company: { fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 2 },
  meta:    { fontSize: 11, color: T.ink3, marginBottom: 10 },
  role:    { marginBottom: 10 },
  roleTitle:  { fontSize: 13, fontWeight: 600, color: T.indigo },
  roleDates:  { fontSize: 11, color: T.ink4, marginTop: 2 },
  skillsRow:  { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 },
  skillTag: {
    fontSize: 10, color: T.ink3,
    background: T.cream3,
    border: `1px solid ${T.border}`,
    padding: "1px 7px", borderRadius: 20,
  },
}

// ── AI Analysis Tab ───────────────────────────────────────────────────────────
function AITab({ candidate }) {
  const [loading,  setLoading]  = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error,    setError]    = useState("")

  const run = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(
        "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter/candidate-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateData: candidate }),
        }
      )
      if (!res.ok) {
        throw new Error(`Analysis request failed (${res.status})`)
      }
      const data = await res.json()
      setAnalysis(data)
    } catch {
      setError("Could not reach backend. Make sure your Railway server is running.")
    } finally {
      setLoading(false)
    }
  }

  if (!analysis) return (
    <div style={{ textAlign: "center", padding: "52px 24px" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, color: T.ink, margin: "0 0 8px" }}>
        AI-Powered Candidate Analysis
      </h3>
      <p style={{ color: T.ink3, fontSize: 14, maxWidth: 360, margin: "0 auto 28px", lineHeight: 1.6 }}>
        Groq AI will analyze all candidate data and generate a comprehensive hiring report
      </p>
      {error && (
        <div style={{ color: T.red, fontSize: 13, marginBottom: 14,
          background: T.red2, border: `1px solid ${T.red}25`,
          borderRadius: 10, padding: "8px 14px", maxWidth: 400, margin: "0 auto 14px" }}>
          {error}
        </div>
      )}
      <button onClick={run} disabled={loading} style={AI.runBtn}>
        {loading
          ? <><span style={AI.spin} /> Analyzing with Groq AI...</>
          : "⚡ Generate Full AI Analysis"
        }
      </button>
    </div>
  )

  const recColor = { Strong: T.green, Good: T.indigo, Maybe: T.amber, No: T.red }
  const rec = analysis.recommendation || "Good"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Top cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={AI.card}>
          <div style={AI.cardLabel}>Hire Recommendation</div>
          <div style={{ ...AI.bigVal, color: recColor[rec] || T.green }}>{rec} Hire</div>
        </div>
        <div style={AI.card}>
          <div style={AI.cardLabel}>Estimated Salary Range</div>
          <div style={{ ...AI.bigVal, color: T.amber }}>
            {analysis.salaryRange || "₹6L – ₹12L"}
          </div>
        </div>
      </div>

      {/* Best roles */}
      {(analysis.bestRoles || []).length > 0 && (
        <div style={AI.section}>
          <div style={AI.sectionTitle}>🎯 Best Fit Roles</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {analysis.bestRoles.map((r, i) => (
              <span key={i} style={AI.roleTag}>{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {(analysis.strengths || []).length > 0 && (
        <div style={AI.section}>
          <div style={AI.sectionTitle}>✅ Strengths Observed</div>
          {analysis.strengths.map((s, i) => (
            <div key={i} style={AI.bullet}>• {s}</div>
          ))}
        </div>
      )}

      {/* Red flags */}
      {(analysis.redFlags || []).length > 0 && (
        <div style={{ ...AI.section, borderColor: `${T.red}25`, background: T.red2 }}>
          <div style={{ ...AI.sectionTitle, color: T.red }}>⚠️ Red Flags</div>
          {analysis.redFlags.map((r, i) => (
            <div key={i} style={{ ...AI.bullet, color: T.red }}>• {r}</div>
          ))}
        </div>
      )}

      {/* Culture fit */}
      {analysis.cultureFit && (
        <div style={AI.section}>
          <div style={AI.sectionTitle}>🤝 Culture Fit</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6 }}>{analysis.cultureFit}</div>
        </div>
      )}

      {/* Interview questions */}
      {(analysis.interviewQuestions || []).length > 0 && (
        <div style={AI.section}>
          <div style={AI.sectionTitle}>❓ Interview Questions to Ask</div>
          {analysis.interviewQuestions.map((q, i) => (
            <div key={i} style={AI.question}>
              <span style={{ color: T.indigo, fontWeight: 700, flexShrink: 0 }}>Q{i + 1}.</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

const AI = {
  runBtn: {
    padding: "13px 32px",
    background: T.ink,
    border: "none", borderRadius: 14, color: "#fff",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    display: "inline-flex", alignItems: "center", gap: 8,
    boxShadow: `0 4px 20px rgba(26,26,24,0.18)`,
  },
  spin: {
    width: 16, height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  card: {
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 14, padding: 18,
  },
  cardLabel: {
    fontSize: 11, color: T.ink3, letterSpacing: 0.5,
    textTransform: "uppercase", marginBottom: 8,
  },
  bigVal: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 24, fontWeight: 800,
  },
  section: {
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 14, padding: 16,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10,
  },
  roleTag: {
    fontSize: 12, color: T.indigo,
    background: T.indigo3,
    border: `1px solid ${T.indigo}25`,
    padding: "4px 12px", borderRadius: 20,
  },
  bullet: { fontSize: 13, color: T.ink3, lineHeight: 1.6, padding: "2px 0" },
  question: {
    display: "flex", gap: 10, fontSize: 13, color: T.ink2,
    padding: "7px 0", borderBottom: `1px solid ${T.border}`,
    lineHeight: 1.5,
  },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",   label: "Overview"        },
  { id: "skills",     label: "Skills"          },
  { id: "arena",      label: "Arena History"   },
  { id: "timeline",   label: "Career"          },
  { id: "resume",     label: "📄 Resume"       },
  { id: "documents",  label: "Documents"       },
  { id: "ai",         label: "AI Analysis"     },
]

export default function CandidateProfile() {
  const { uid }    = useParams()
  const navigate   = useNavigate()
  const [candidate, setCandidate] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState("overview")

  useEffect(() => {
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) setCandidate({ uid: snap.id, ...snap.data() })
      setLoading(false)
    }).catch((err) => {
      console.error("Failed to load candidate:", err)
      setLoading(false)
    })
  }, [uid])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 14 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${T.indigo3}`, borderTopColor: T.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  )

  if (!candidate) return (
    <div style={{ textAlign: "center", padding: 60, color: T.ink3, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
      Candidate not found.
    </div>
  )

  const lvl      = eloLevel(candidate.eloRating || 800)
  const col      = domainColor(candidate.keyword)
  const initials = (candidate.displayName || "?")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const arenaEntries = Object.entries(candidate.arenaSubmissions || {})

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Back button */}
      <button onClick={() => navigate(-1)} style={PP.backBtn}>
        ← Back
      </button>

      {/* ── Header card ── */}
      <div style={PP.headerCard}>
        <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* Avatar */}
          <div style={{ ...PP.bigAvatar, background: `${col}18`, border: `2px solid ${col}55`, color: col }}>
            {initials}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h1 style={PP.name}>{candidate.displayName}</h1>
              <div style={{ ...PP.levelBadge, color: lvl.color, borderColor: `${lvl.color}44`, background: `${lvl.color}11` }}>
                {lvl.label}
              </div>
            </div>
            <div style={PP.meta}>
              <span style={{ color: col }}>◆ {candidate.keyword || "—"}</span>
              <span>·</span>
              <span>@{candidate.username || "—"}</span>
              {candidate.path && (
                <>
                  <span>·</span>
                  <span style={{ textTransform: "capitalize" }}>{candidate.path}</span>
                </>
              )}
            </div>

            {/* Stat chips */}
            <div style={PP.chipsRow}>
              {[
                { label: "ELO Rating",   value: `⚡ ${candidate.eloRating || 800}`, color: lvl.color  },
                { label: "Job Ready",    value: `${candidate.jobReadiness || 0}%`,  color: T.green    },
                { label: "Arena Done",   value: candidate.arenaCompleted || 0,       color: T.indigo   },
                ...(candidate.arenaStreak > 0
                  ? [{ label: "Streak", value: `🔥 ${candidate.arenaStreak}`,        color: T.amber   }]
                  : []),
              ].map((chip) => (
                <div key={chip.label} style={PP.chip}>
                  <span style={{ ...PP.chipVal, color: chip.color }}>{chip.value}</span>
                  <span style={PP.chipLabel}>{chip.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
            <button
              onClick={() => navigate("/recruiter/pipeline")}
              style={PP.primaryBtn}
            >
              + Add to Pipeline
            </button>
            <button
              onClick={() => navigate(`/recruiter/simulation/${uid}`)}
              style={PP.outlineBtn}
            >
              🤖 Shadow Interview
            </button>
            <button
              onClick={() => window.open(`/portfolio/${candidate.username}`, "_blank")}
              style={PP.outlineBtn}
            >
              🔗 Public Profile
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={PP.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...PP.tabBtn,
              color:        tab === t.id ? T.indigo : T.ink3,
              borderBottom: tab === t.id ? `2px solid ${T.indigo}` : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={PP.tabContent}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={PP.infoCard}>
              <div style={PP.infoLabel}>Assessment Score</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, color: T.ink }}>
                {candidate.score || "—"}
              </div>
            </div>
            <div style={PP.infoCard}>
              <div style={PP.infoLabel}>Cohort Percentile</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: T.indigo }}>
                Top {Math.max(1, Math.round(100 - ((candidate.eloRating || 800) - 800) / 4))}%
              </div>
              <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>in {candidate.keyword}</div>
            </div>
            <div style={PP.infoCard}>
              <div style={PP.infoLabel}>✅ Strengths</div>
              {(candidate.strengths || []).length === 0
                ? <div style={PP.empty}>No strengths data</div>
                : (candidate.strengths || []).map((s, i) => (
                    <div key={i} style={PP.bullet}>• {s}</div>
                  ))
              }
            </div>
            <div style={PP.infoCard}>
              <div style={PP.infoLabel}>⚠️ Growth Areas</div>
              {(candidate.weakAreas || []).length === 0
                ? <div style={PP.empty}>No weak areas listed</div>
                : (candidate.weakAreas || []).map((s, i) => (
                    <div key={i} style={{ ...PP.bullet, color: T.red }}>• {s}</div>
                  ))
              }
            </div>
          </div>
        )}

        {/* SKILLS */}
        {tab === "skills" && (
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "start" }}>
            <RadarChart skills={candidate.skillGraph || []} size={280} />
            <div>
              {(candidate.skillGraph || []).length === 0
                ? <div style={PP.empty}>No skill data</div>
                : (candidate.skillGraph || []).map((s) => {
                    const barColor = s.value >= 70 ? T.green : s.value >= 40 ? T.amber : T.red
                    return (
                      <div key={s.label} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 13, color: T.ink }}>{s.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{s.value}%</span>
                        </div>
                        <div style={{ height: 8, background: T.cream3, borderRadius: 4 }}>
                          <div style={{
                            height: "100%", width: `${s.value}%`, borderRadius: 4,
                            background: barColor,
                            transition: "width 1s ease",
                          }} />
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        )}

        {/* ARENA */}
        {tab === "arena" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Completed", value: candidate.arenaCompleted || 0,       color: T.indigo },
                { label: "Best Streak",     value: `${candidate.arenaBestStreak || 0}d`, color: T.amber  },
                { label: "ELO from Arena",  value: `+${Math.max(0, (candidate.eloRating || 800) - 800)}`, color: T.green },
              ].map((s) => (
                <div key={s.label} style={PP.infoCard}>
                  <div style={PP.infoLabel}>{s.label}</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            {arenaEntries.length === 0
              ? <div style={PP.empty}>No arena submissions yet</div>
              : arenaEntries.map(([taskId, sub]) => (
                  <div key={taskId} style={PP.arenaRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                        Task: {taskId}
                      </div>
                      <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>
                        {sub.submittedAt
                          ? new Date(sub.submittedAt?.seconds
                              ? sub.submittedAt.seconds * 1000
                              : sub.submittedAt
                            ).toLocaleDateString()
                          : "—"
                        }
                      </div>
                      {sub.feedback && (
                        <div style={{ fontSize: 12, color: T.ink3, marginTop: 4, lineHeight: 1.5 }}>
                          {sub.feedback.slice(0, 120)}...
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.green }}>
                        {sub.score || 0}%
                      </div>
                      <div style={{ fontSize: 12, color: T.indigo }}>+{sub.eloGained || 0} ELO</div>
                    </div>
                  </div>
                ))
            }
          </div>
        )}

        {/* TIMELINE */}
        {tab === "timeline" && (
          <div>
            {(candidate.experiences || []).length === 0
              ? <div style={PP.empty}>No experience data available</div>
              : (candidate.experiences || []).map((exp, i) => (
                  <TimelineItem key={i} exp={exp} />
                ))
            }
          </div>
        )}

        {/* RESUME */}
        {tab === "resume" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* ELO upgrade banner */}
            <div style={{ background: T.indigo3, border: `1px solid ${T.indigo}25`, borderRadius: 14, padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 4 }}>Capabilio ELO Profile is Active</div>
                <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.6 }}>
                  This candidate has a verified ELO score of <strong style={{ color: T.indigo }}>⚡{candidate.eloRating || 800}</strong> from skill assessments and Arena challenges — a far stronger hiring signal than a resume. The resume below is supplementary context.
                </div>
              </div>
            </div>

            {/* Parsed resume summary (AI-derived from profile data) */}
            <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, boxShadow: T.shadow }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 16 }}>🤖 AI-Parsed Resume Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Full Name",        value: candidate.displayName || "—",      color: T.ink    },
                  { label: "Domain",           value: candidate.keyword || "—",           color: T.indigo },
                  { label: "Experience",       value: `${Math.round(((candidate.eloRating || 800) - 700) / 50)} yrs (est.)`, color: T.blue },
                  { label: "Education Path",   value: candidate.path ? candidate.path.charAt(0).toUpperCase() + candidate.path.slice(1) : "—", color: T.amber },
                  { label: "Job Readiness",    value: `${candidate.jobReadiness || 0}%`,   color: T.green  },
                  { label: "Arena Tasks Done", value: candidate.arenaCompleted || 0,       color: T.indigo },
                ].map((m) => (
                  <div key={m.label} style={{ padding: "10px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: T.ink4, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Skills from profile */}
              {(candidate.skillGraph || []).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontWeight: 600, marginBottom: 8 }}>VERIFIED SKILLS (from ELO Assessment)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(candidate.skillGraph || []).map((sk) => {
                      const skCol = sk.value >= 70 ? T.green : sk.value >= 40 ? T.indigo : T.amber
                      return (
                        <span key={sk.label} style={{ fontSize: 12, color: skCol, background: `${skCol}10`, border: `1px solid ${skCol}25`, borderRadius: 6, padding: "3px 10px" }}>
                          {sk.label} {sk.value}%
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {(candidate.strengths || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: T.ink3, fontWeight: 600, marginBottom: 8 }}>AI-IDENTIFIED STRENGTHS</div>
                  {(candidate.strengths || []).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: T.ink3, padding: "3px 0" }}>• {s}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Original uploaded resume */}
            <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, boxShadow: T.shadow }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14 }}>📄 Uploaded Resume File</div>
              {candidate.resumeFileName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 12 }}>
                  <span style={{ fontSize: 32 }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{candidate.resumeFileName}</div>
                    <div style={{ fontSize: 11, color: T.ink4 }}>
                      Uploaded {candidate.resumeUploadedAt
                        ? new Date(candidate.resumeUploadedAt?.seconds ? candidate.resumeUploadedAt.seconds * 1000 : candidate.resumeUploadedAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                  <button style={{ fontSize: 12, padding: "7px 14px", background: T.indigo3, border: `1px solid ${T.indigo}25`, borderRadius: 9, color: T.indigo, cursor: "pointer" }}>
                    ↓ Download
                  </button>
                </div>
              ) : (
                <div style={{ padding: "24px", background: T.cream2, border: `1px dashed ${T.border}`, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <div style={{ fontSize: 13, color: T.ink4, marginBottom: 12 }}>No resume file uploaded by this candidate yet.</div>
                  <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
                    Candidates can upload their resume from their Capabilio profile. You can also upload a resume on their behalf from the Resume Screening page.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === "documents" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {candidate.resumeFileName ? (
              <div style={PP.docRow}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                    {candidate.resumeFileName}
                  </div>
                  <div style={{ fontSize: 11, color: T.ink4 }}>
                    Uploaded {candidate.resumeUploadedAt
                      ? new Date(candidate.resumeUploadedAt?.seconds
                          ? candidate.resumeUploadedAt.seconds * 1000
                          : candidate.resumeUploadedAt
                        ).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <button style={PP.dlBtn}>Download</button>
              </div>
            ) : (
              <div style={PP.empty}>No resume uploaded</div>
            )}
            {(candidate.vaultFiles || []).map((f, i) => (
              <div key={f.id ?? f.name ?? i} style={PP.docRow}>
                <span style={{ fontSize: 24 }}>📁</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: T.ink4 }}>
                    {f.category} · {(f.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <a href={f.url} target="_blank" rel="noreferrer" style={PP.dlBtn}>View</a>
              </div>
            ))}
          </div>
        )}

        {/* AI ANALYSIS */}
        {tab === "ai" && <AITab candidate={candidate} />}

      </div>
    </div>
  )
}

const PP = {
  backBtn: {
    background: "none", border: "none", color: T.indigo,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    padding: "0 0 16px", display: "block",
  },
  headerCard: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 20, padding: 24, marginBottom: 20,
    animation: "fadeUp 0.3s ease",
    boxShadow: T.shadow,
  },
  bigAvatar: {
    width: 72, height: 72, borderRadius: 20, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28,
  },
  name: {
    fontFamily: "'Syne', sans-serif", fontSize: 26,
    fontWeight: 800, color: T.ink, margin: 0,
  },
  levelBadge: {
    fontSize: 12, fontWeight: 600, border: "1px solid",
    borderRadius: 8, padding: "3px 10px",
  },
  meta: {
    display: "flex", gap: 8, color: T.ink3,
    fontSize: 13, marginTop: 6, flexWrap: "wrap",
  },
  chipsRow: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" },
  chip: {
    display: "flex", flexDirection: "column", gap: 2,
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 10, padding: "8px 14px",
  },
  chipVal:   { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800 },
  chipLabel: { fontSize: 10, color: T.ink4 },
  primaryBtn: {
    padding: "10px 20px",
    background: T.indigo,
    border: "none", borderRadius: 10, color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: `0 4px 14px ${T.indigo}30`,
  },
  outlineBtn: {
    padding: "9px 16px",
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 10, color: T.ink3,
    fontSize: 13, fontWeight: 500, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  tabBar: {
    display: "flex", gap: 0,
    borderBottom: `1px solid ${T.border}`,
    marginBottom: 20, overflowX: "auto",
  },
  tabBtn: {
    padding: "12px 18px", background: "none",
    border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s", whiteSpace: "nowrap",
  },
  tabContent: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 16, padding: 24,
    animation: "fadeUp 0.2s ease",
    boxShadow: T.shadow,
  },
  infoCard: {
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 14, padding: 16,
  },
  infoLabel: {
    fontSize: 11, color: T.ink3, letterSpacing: 0.5,
    textTransform: "uppercase", marginBottom: 8,
  },
  bullet: { fontSize: 13, color: T.ink3, padding: "3px 0", lineHeight: 1.5 },
  empty:  { fontSize: 13, color: T.ink4, fontStyle: "italic" },
  arenaRow: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "12px 0", borderBottom: `1px solid ${T.border}`,
  },
  docRow: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 16px",
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
  },
  dlBtn: {
    padding: "6px 14px",
    background: T.indigo3,
    border: `1px solid ${T.indigo}25`,
    borderRadius: 8, color: T.indigo,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", textDecoration: "none",
  },
}
