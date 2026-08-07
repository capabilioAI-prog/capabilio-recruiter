import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor, eloLevel, card, tag, btn } from "./theme"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

const GRADE_COLOR = (g) => (g === "A+" || g === "A") ? T.green : (g === "B+" || g === "B") ? T.indigo : (g === "C") ? T.amber : T.red

// Recruiter-facing candidate portfolio — 2026-08-07, rebuilt 2026-08-08 for
// evidence-based transparency (see ProofCard below). Reached from
// CandidateSearch.jsx's "View Profile" (card click or button). This is the
// real, live-data equivalent of a student's own Aura dashboard in
// capabilio-web, via GET /partner/candidates/:id (backend/server/routes/
// partnerBridge.js on capabilio-web). Distinct from the legacy
// /recruiter/candidate/:uid route (CandidateProfile.jsx), which reads from
// a separate, disconnected Firestore project and has no data for any
// candidate sourced from this live search.
//
// 2026-08-08: explicit request for "complete transparency ... with
// evidence and proof rather than claiming like resumes." Three changes:
//   1. What was labeled "Career Timeline" (actually Arena challenge
//      history) is now "Proof of Skills" — each card expands to show the
//      full evidence trail the backend now sends: the task scenario/
//      objective the candidate was given, what they actually submitted,
//      and the AI feedback explaining the score. Not just a title + number.
//   2. "Career Timeline" now means what the label says: real employment
//      history (and internships) from the candidate's own profile.
//   3. New "Code DNA" section — a candidate's GitHub-derived profile, shown
//      only when they've run Code DNA AND opted it into recruiter
//      visibility (backend-gated, never fabricated when absent).
function ProofCard({ p }) {
  const [open, setOpen] = useState(false)
  const hasEvidence = !!(p.scenario || p.objective || p.user_answer || p.feedback)
  return (
    <div style={{ padding: "10px 12px", background: T.cream2, borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{p.title || p.skill_name || "Challenge"}</div>
          <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>
            {[p.domain, p.difficulty].filter(Boolean).join(" · ")}
            {p.completed_at ? ` · ${new Date(p.completed_at).toLocaleDateString()}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {typeof p.score === "number" && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: GRADE_COLOR(p.grade) }}>{p.grade || ""} {p.score}%</div>
              {typeof p.elo_delta === "number" && p.elo_delta !== 0 && (
                <div style={{ fontSize: 10, color: p.elo_delta > 0 ? T.green : T.red }}>{p.elo_delta > 0 ? "+" : ""}{p.elo_delta} ELO</div>
              )}
            </div>
          )}
          {hasEvidence && (
            <button onClick={() => setOpen((o) => !o)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", background: "transparent", color: T.indigo, border: `1px solid ${T.indigo}30`, borderRadius: 7, cursor: "pointer" }}>
              {open ? "Hide evidence" : "View evidence"}
            </button>
          )}
        </div>
      </div>
      {open && hasEvidence && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {p.scenario && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, marginBottom: 3 }}>SCENARIO GIVEN</div>
              <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.scenario}</div>
            </div>
          )}
          {p.objective && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, marginBottom: 3 }}>OBJECTIVE</div>
              <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.objective}</div>
            </div>
          )}
          {p.expected_output && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, marginBottom: 3 }}>EXPECTED OUTPUT</div>
              <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.expected_output}</div>
            </div>
          )}
          {p.user_answer && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.indigo, marginBottom: 3 }}>CANDIDATE'S SUBMITTED SOLUTION</div>
              <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.5, whiteSpace: "pre-wrap", background: T.cream, borderRadius: 8, padding: "8px 10px", border: `1px solid ${T.border}` }}>{p.user_answer}</div>
            </div>
          )}
          {p.feedback && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, marginBottom: 3 }}>WHY THIS SCORE — AI EVALUATION</div>
              <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.feedback}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
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

  const { candidate: c, skills, proofOfSkills = [], careerTimeline = [], codeDna, interviewsCompleted, certifications, portfolioArtifacts } = data
  const col = domainColor(c.domain)
  const displayName = c.display_name || c.username || "Candidate"
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  // 2026-08-07: was recomputing this from role_elo/professional_elo/
  // aura_score only, which excludes profiles.elo_rating -- the field the
  // candidate's OWN Aura dashboard actually shows for the student path (see
  // canonicalElo() in capabilio-web's orgStudentVisibility.js). That made a
  // student's real, live ELO show as 0 or a stale lower number here. The
  // backend now computes this correctly and sends it as `c.elo`; fall back
  // to the old formula only if an older cached response lacks it.
  const tierScore = c.elo ?? Math.max(c.role_elo || 0, c.professional_elo || 0, c.aura_score || 0)
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
          {c.career && (
            <div style={{ fontSize: 12, color: T.indigo, marginTop: 2, fontWeight: 600 }}>🎯 {c.career}</div>
          )}
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
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.green }}>{proofOfSkills.length}</div>
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

      {/* Proof of Skills — full evidence trail per completed challenge */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>Proof of Skills</div>
        <div style={{ fontSize: 11, color: T.ink4, marginBottom: 12 }}>What they were given, what they submitted, and why they scored what they did — not a claim, the actual work.</div>
        {proofOfSkills.length === 0 ? (
          <div style={{ fontSize: 13, color: T.ink4 }}>No completed challenges shared to portfolio yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {proofOfSkills.map((p) => <ProofCard key={p.id} p={p} />)}
          </div>
        )}
      </div>

      {/* Career Timeline — real employment history + internships */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Career Timeline</div>
        {careerTimeline.length === 0 ? (
          <div style={{ fontSize: 13, color: T.ink4 }}>No employment history added yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {careerTimeline.map((e, i) => (
              <div key={i} style={{ padding: "10px 12px", background: T.cream2, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                      {e.role || "—"}{e.company ? ` · ${e.company}` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>
                      {e.startDate || "?"} — {e.isCurrent ? "Present" : (e.endDate || "?")}
                    </div>
                    {e.description && <div style={{ fontSize: 12, color: T.ink2, marginTop: 6, lineHeight: 1.5 }}>{e.description}</div>}
                    {Array.isArray(e.skills) && e.skills.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                        {e.skills.map((s, si) => (
                          <span key={si} style={{ fontSize: 10, color: T.ink3, background: T.cream, border: `1px solid ${T.border}`, borderRadius: 5, padding: "2px 7px" }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: e.employmentType === "internship" ? T.amber : T.blue, background: e.employmentType === "internship" ? T.amber2 : T.blue2, borderRadius: 6, padding: "2px 7px" }}>
                      {e.employmentType === "internship" ? "Internship" : "Employment"}
                    </span>
                    {e.verificationStatus === "verified" && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.green }}>✓ Verified</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code DNA — GitHub-derived profile, only when the candidate ran it and opted it into recruiter visibility */}
      {codeDna && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Code DNA {codeDna.username && <span style={{ fontWeight: 400, color: T.ink4 }}>· <a href={`https://github.com/${codeDna.username}`} target="_blank" rel="noreferrer" style={{ color: T.indigo }}>github.com/{codeDna.username}</a></span>}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
            {codeDna.publicRepos != null && (
              <div><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.ink }}>{codeDna.publicRepos}</div><div style={{ fontSize: 10, color: T.ink4 }}>Public repos</div></div>
            )}
            {codeDna.totalCommits != null && (
              <div><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.ink }}>{codeDna.totalCommits}</div><div style={{ fontSize: 10, color: T.ink4 }}>Commits</div></div>
            )}
            {codeDna.followers != null && (
              <div><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.ink }}>{codeDna.followers}</div><div style={{ fontSize: 10, color: T.ink4 }}>Followers</div></div>
            )}
            {codeDna.score != null && (
              <div><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.indigo }}>{codeDna.score}</div><div style={{ fontSize: 10, color: T.ink4 }}>Builder score</div></div>
            )}
          </div>
          {codeDna.standoutFact && (
            <div style={{ fontSize: 12, color: T.ink2, marginBottom: 8, fontStyle: "italic" }}>"{codeDna.standoutFact}"</div>
          )}
          {codeDna.languages.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {codeDna.languages.slice(0, 8).map((l, i) => (
                <span key={i} style={{ fontSize: 11, color: T.ink3, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 9px" }}>
                  {l.lang}{l.pct != null ? ` ${l.pct}%` : ""}
                </span>
              ))}
            </div>
          )}
          {codeDna.topRepos.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {codeDna.topRepos.slice(0, 5).map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: T.ink2 }}>• {typeof r === "string" ? r : (r.name || r.repoName || "Repo")}</div>
              ))}
            </div>
          )}
        </div>
      )}

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
