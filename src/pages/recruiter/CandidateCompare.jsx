import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor } from "./theme"

// Real data only: this page compares applicants from the `applications`
// table (real AI resume-match score, real matched/missing skills, real ATS
// summary text produced when the application was scored). There is no ELO,
// no random "hiring risk"/"notice period"/"team fit" fabrication anymore --
// if we don't have a real signal for a field, we simply don't show it.

const STATUS_META = {
  applied:     { label: "Applied",     color: T.ink3,   bg: T.cream2 },
  shortlisted: { label: "Shortlisted", color: T.green,  bg: T.green2 },
  rejected:    { label: "Rejected",    color: T.red,    bg: T.red2   },
}

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.applied
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.color}30`, borderRadius: 7, padding: "3px 9px" }}>
      {m.label}
    </span>
  )
}

function ScoreBar({ value, color = T.indigo, label }) {
  if (value == null) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: T.ink3 }}>{label}</span>
          <span style={{ fontSize: 11, color: T.ink4 }}>Not scored</span>
        </div>
        <div style={{ height: 6, background: T.cream3, borderRadius: 3 }} />
      </div>
    )
  }
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: T.ink3 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: T.cream3, borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
      </div>
    </div>
  )
}

function SkillTags({ skills, color, bg, prefix }) {
  const list = Array.isArray(skills) ? skills : []
  if (list.length === 0) return <span style={{ fontSize: 11, color: T.ink4 }}>None recorded</span>
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {list.slice(0, 8).map((s, i) => (
        <span key={`${s}-${i}`} style={{ fontSize: 10, fontWeight: 600, color, background: bg, border: `1px solid ${color}30`, borderRadius: 6, padding: "2px 7px" }}>
          {prefix}{s}
        </span>
      ))}
    </div>
  )
}

function CompareColumn({ a, rank, jobTitle }) {
  const navigate = useNavigate()
  const col = domainColor(jobTitle)
  const initials = (a.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div style={{ background: T.cream, border: `2px solid ${rank === 1 ? T.indigo : T.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14, position: "relative", boxShadow: T.shadow }}>
      {rank === 1 && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: T.indigo, color: "#1A1A18", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 12px", whiteSpace: "nowrap" }}>
          ⭐ HIGHEST MATCH
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `${col}18`, border: `2px solid ${col}44`, color: col, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 20 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 700, color: T.ink }}>{a.name || "—"}</div>
          <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{jobTitle || "—"}</div>
          <div style={{ marginTop: 6 }}><StatusPill status={a.status} /></div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ScoreBar value={a.score} label="AI Resume Match" color={T.indigo} />
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.green, marginBottom: 5 }}>✓ Matched skills</div>
        <SkillTags skills={a.matched_skills} color={T.green} bg={T.green2} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.red, marginBottom: 5 }}>✕ Missing skills</div>
        <SkillTags skills={a.missing_skills} color={T.red} bg={T.red2} />
      </div>

      {a.ats_summary && (
        <div style={{ padding: "10px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: T.ink3, fontWeight: 600, marginBottom: 4 }}>AI ATS summary</div>
          <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5 }}>{a.ats_summary}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ padding: "10px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 16 }}>📅</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 700, color: T.ink, marginTop: 4 }}>
            {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
          </div>
          <div style={{ fontSize: 10, color: T.ink4 }}>Applied</div>
        </div>
        <div style={{ padding: "10px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 16 }}>💬</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 700, color: T.ink, marginTop: 4 }}>
            {a.feedback_sent ? "Sent" : "Not sent"}
          </div>
          <div style={{ fontSize: 10, color: T.ink4 }}>Feedback</div>
        </div>
      </div>

      {a.resume_url && (
        <a href={a.resume_url} target="_blank" rel="noreferrer"
          style={{ padding: "9px 0", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink2, fontSize: 12, fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "'Inter',sans-serif" }}>
          📄 View Resume
        </a>
      )}

      <button onClick={() => navigate(`/recruiter/applications`)}
        style={{ padding: "9px 0", background: T.indigo3, border: `1px solid ${T.indigo}25`, borderRadius: 10, color: T.indigo, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
        Open in Applications →
      </button>
    </div>
  )
}

export default function CandidateCompare() {
  const [applications, setApplications] = useState([])
  const [jobsById, setJobsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [appsRes, jobsRes] = await Promise.all([
        supabase.from("applications").select("*").order("score", { ascending: false, nullsFirst: false }),
        supabase.from("jobs").select("id,title"),
      ])
      if (appsRes.error) throw appsRes.error
      setApplications(appsRes.data || [])
      setJobsById(Object.fromEntries((jobsRes.data || []).map((j) => [j.id, j.title])))
    } catch (err) {
      console.error("Failed to load applications for compare:", err)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleCandidate = (a) => {
    setComparing((prev) => {
      if (prev.find((x) => x.id === a.id)) return prev.filter((x) => x.id !== a.id)
      if (prev.length >= 4) return prev
      return [...prev, a]
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ background: T.indigo3, border: `1px solid ${T.indigo}20`, borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 6 }}>⚖️ Candidate Compare</div>
        <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6 }}>
          Compare up to <strong style={{ color: T.indigo }}>4 applicants</strong> side-by-side on the real AI resume-match score, matched/missing skills, and ATS summary generated when each application was scored. Fields we don't actually measure (salary, notice period, "team fit") are intentionally left out rather than guessed.
        </div>
      </div>

      <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, margin: 0 }}>
            Select applicants to compare <span style={{ color: T.ink4, fontWeight: 400 }}>({comparing.length}/4)</span>
          </h2>
          {comparing.length > 0 && (
            <button onClick={() => setComparing([])} style={{ fontSize: 12, color: T.red, background: T.red2, border: `1px solid ${T.red}25`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Clear All</button>
          )}
        </div>
        {loading ? (
          <span style={{ fontSize: 13, color: T.ink4 }}>Loading applicants...</span>
        ) : applications.length === 0 ? (
          <div style={{ fontSize: 13, color: T.ink4, padding: "20px 0", textAlign: "center" }}>No applications yet. Once candidates apply to your jobs, they'll show up here to compare.</div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {applications.slice(0, 24).map((a) => {
              const inList = comparing.find((x) => x.id === a.id)
              const col = domainColor(jobsById[a.job_id])
              const initials = (a.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              return (
                <button key={a.id} onClick={() => toggleCandidate(a)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: inList ? T.indigo3 : T.cream2, border: `1px solid ${inList ? T.indigo : T.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${col}18`, color: col, border: `1px solid ${col}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{initials}</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: inList ? T.indigo : T.ink }}>{a.name || "—"}</div>
                    <div style={{ fontSize: 10, color: T.ink4 }}>{a.score != null ? `${a.score}% match` : "Not scored"}</div>
                  </div>
                  {inList && <span style={{ fontSize: 14, color: T.indigo }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {comparing.length === 0 ? (
        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: "60px 20px", textAlign: "center", boxShadow: T.shadow }}>
          <div style={{ fontSize: 40 }}>⚖️</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, marginTop: 12 }}>Select applicants above to start comparing</div>
          <div style={{ fontSize: 13, color: T.ink4, marginTop: 6 }}>Pick 2–4 applicants to see a full side-by-side breakdown.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${comparing.length}, 1fr)`, gap: 14, alignItems: "start" }}>
            {comparing.map((a, i) => (
              <CompareColumn key={a.id} a={a} rank={i + 1} jobTitle={jobsById[a.job_id]} />
            ))}
          </div>

          <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, margin: "0 0 16px" }}>📊 Side-by-Side Breakdown</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter',sans-serif" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 11, color: T.ink4, fontWeight: 600, textTransform: "uppercase", padding: "8px 12px", borderBottom: `1px solid ${T.border}`, width: 160 }}>Dimension</th>
                  {comparing.map((a) => (
                    <th key={a.id} style={{ textAlign: "center", fontSize: 12, color: T.indigo, fontWeight: 700, padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}>{a.name || "—"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "AI Match Score", fn: (a) => (a.score != null ? `${a.score}%` : "Not scored"), best: (cs) => cs.reduce((b, c) => (c.score ?? -1) > (b.score ?? -1) ? c : b, cs[0])?.id },
                  { label: "Status",         fn: (a) => STATUS_META[a.status]?.label || a.status || "—", best: null },
                  { label: "Job applied to", fn: (a) => jobsById[a.job_id] || "—", best: null },
                  { label: "Matched skills", fn: (a) => (a.matched_skills || []).length, best: (cs) => cs.reduce((b, c) => (c.matched_skills || []).length > (b.matched_skills || []).length ? c : b, cs[0])?.id },
                  { label: "Missing skills", fn: (a) => (a.missing_skills || []).length, best: null },
                  { label: "Applied",        fn: (a) => a.created_at ? new Date(a.created_at).toLocaleDateString() : "—", best: null },
                ].map((row) => (
                  <tr key={row.label} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ fontSize: 12, color: T.ink3, padding: "10px 12px", fontWeight: 600 }}>{row.label}</td>
                    {comparing.map((a) => {
                      const isBest = row.best && row.best(comparing) === a.id
                      return (
                        <td key={a.id} style={{ textAlign: "center", padding: "10px 12px", fontSize: 13, fontWeight: isBest ? 700 : 400, color: isBest ? T.green : T.ink3 }}>
                          {row.fn(a)}
                          {isBest && <span style={{ marginLeft: 4, fontSize: 10 }}>★</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
