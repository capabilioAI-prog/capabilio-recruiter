import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor, eloLevel, card, tag, btn } from "./theme"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

// Recruiter-facing candidate portfolio — 2026-08-07.
// Reached from CandidateSearch.jsx's "View Profile" (card click or button).
// This is the real, live-data equivalent of a student's own Aura dashboard
// in capabilio-web: ELO, career timeline (Arena history), AI interviews
// completed, verified certifications, and published portfolio artifacts —
// all via the new GET /partner/candidates/:id (backend/server/routes/
// partnerBridge.js on capabilio-web). Distinct from the legacy
// /recruiter/candidate/:uid route (CandidateProfile.jsx), which reads from
// a separate, disconnected Firestore project and has no data for any
// candidate sourced from this live search.
export default function CandidateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // `silent` (2026-08-07): background polling refreshes ELO/skills/career
  // timeline without re-showing the full-page loading state -- see the
  // polling effect below.
  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/partner/candidates/${id}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setData(body)
    } catch (err) {
      console.error("Failed to load candidate profile:", err)
      if (!silent) setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Live refresh: poll every 20s and on tab focus, same pattern as
  // CandidateSearch.jsx and CollegeConnections.jsx.
  useEffect(() => {
    const interval = setInterval(() => load(true), 20000)
    const onVisible = () => { if (document.visibilityState === "visible") load(true) }
    window.addEventListener("focus", onVisible)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onVisible)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  if (loading) {
    return <div style={{ color: T.ink3, fontSize: 13, textAlign: "center", padding: "60px 0" }}>Loading candidate profile...</div>
  }
  if (error || !data) {
    return (
      <div style={{ ...card, maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Couldn't load this candidate</div>
        <div style={{ fontSize: 13, color: T.ink3, marginBottom: 16 }}>
          {error === "Candidate not found or not visible to recruiters."
            ? "This candidate is no longer visible to recruiters (they may have turned off discoverability, or this link is stale)."
            : "Something went wrong reaching the candidate data bridge. Try again in a moment."}
        </div>
        <button onClick={() => navigate(-1)} style={btn.outline}>← Back</button>
      </div>
    )
  }

  const { candidate: c, skills, careerTimeline, interviewsCompleted, certifications, portfolioArtifacts } = data
  const col = domainColor(c.domain)
  const displayName = c.display_name || c.username || "Candidate"
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const tierScore = Math.max(c.role_elo || 0, c.professional_elo || 0, c.aura_score || 0)
  const lvl = eloLevel(tierScore)

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => navigate(-1)} style={{ ...btn.outline, alignSelf: "flex-start" }}>← Back to Candidates</button>

      {/* Header */}
      <div style={{ ...card, display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        {c.avatar_url ? (
          <img src={c.avatar_url} alt={displayName} style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${col}18`, border: `1.5px solid ${col}44`, color: col, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.ink }}>{displayName}</div>
            <span style={tag(lvl.color, `${lvl.color}18`)}>{lvl.label}</span>
          </div>
          <div style={{ fontSize: 13, color: T.ink3, marginTop: 3 }}>
            {c.headline || (c.current_role_title ? `${c.current_role_title}${c.current_company ? ` · ${c.current_company}` : ""}` : "—")}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {c.domain && <span style={{ fontSize: 11, color: col, border: `1px solid ${col}33`, background: `${col}11`, borderRadius: 6, padding: "2px 7px" }}>{c.domain}</span>}
            {c.path_type === "student"
              ? <span style={{ fontSize: 11, color: T.ink3, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 7px" }}>Student</span>
              : typeof c.years_of_experience === "number" && <span style={{ fontSize: 11, color: T.ink3, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 7px" }}>{c.years_of_experience} yrs experience</span>}
            {c.location && <span style={{ fontSize: 11, color: T.ink4 }}>📍 {c.location}</span>}
            {c.uan_verified && <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.green2, border: `1px solid ${T.green}30`, borderRadius: 6, padding: "2px 7px" }}>✓ Employment (EPFO)</span>}
            {c.education_verified && <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.green2, border: `1px solid ${T.green}30`, borderRadius: 6, padding: "2px 7px" }}>✓ Education</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ textAlign: "center", padding: "8px 16px", background: T.cream2, borderRadius: 10 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.indigo }}>{tierScore || "—"}</div>
            <div style={{ fontSize: 10, color: T.ink4 }}>ELO</div>
          </div>
          <div style={{ textAlign: "center", padding: "8px 16px", background: T.cream2, borderRadius: 10 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.green }}>{careerTimeline.length}</div>
            <div style={{ fontSize: 10, color: T.ink4 }}>Tasks Done</div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Skills</div>
        {skills.length === 0 ? (
          <div style={{ fontSize: 13, color: T.ink4 }}>No skill data yet.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {skills.map((s) => (
              <span key={s.skill_name} title={`ELO ${s.elo_value}`} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", background: T.indigo3, color: T.indigo, borderRadius: 8 }}>
                {s.skill_name} · {s.elo_value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Career timeline / Arena history */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Career Timeline</div>
        {careerTimeline.length === 0 ? (
          <div style={{ fontSize: 13, color: T.ink4 }}>No completed challenges shared to portfolio yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {careerTimeline.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", background: T.cream2, borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{e.title || e.skill_name || "Challenge"}</div>
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>
                    {[e.domain, e.difficulty].filter(Boolean).join(" · ")}
                    {e.completed_at ? ` · ${new Date(e.completed_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                {typeof e.score === "number" && (
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.green, flexShrink: 0 }}>{e.score}%</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Interviews + Certifications side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>AI Interviews</div>
          {interviewsCompleted.length === 0 ? (
            <div style={{ fontSize: 13, color: T.ink4 }}>None completed yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {interviewsCompleted.map((iv) => (
                <div key={iv.id} style={{ fontSize: 12.5, color: T.ink2 }}>
                  ✓ {iv.mode || "Interview"} — {iv.completed_at ? new Date(iv.completed_at).toLocaleDateString() : ""}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Certifications</div>
          {certifications.length === 0 ? (
            <div style={{ fontSize: 13, color: T.ink4 }}>None verified yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {certifications.map((cert, i) => (
                <div key={i} style={{ fontSize: 12.5, color: T.ink2 }}>
                  ✓ {cert.cert_name}{cert.issuer ? ` — ${cert.issuer}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Projects / Portfolio artifacts */}
      {portfolioArtifacts.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Projects</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {portfolioArtifacts.map((a) => (
              <a key={a.id} href={a.storage_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: T.indigo }}>
                {a.artifact_type || "Project artifact"} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
