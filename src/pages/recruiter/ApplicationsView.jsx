import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { T, card, cardLg, tag, btn } from "./theme"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api";

// applications table (Supabase) <-> local camelCase shape used by this
// component's render code. Scoring now happens automatically server-side
// in POST /apply/:jobId, so every application loaded here already has a
// score -- the old "Score All Resumes" manual step has been retired.
function fromDbApplication(row) {
  return {
    id: row.id,
    companyId: row.company_id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    name: row.name,
    email: row.email,
    resumeText: row.resume_text,
    resumeUrl: row.resume_url,
    jobDescription: row.job_description,
    score: row.score,
    missingSkills: row.missing_skills || [],
    skills: row.matched_skills || [],
    atsSummary: row.ats_summary,
    status: row.status,
    feedbackSent: row.feedback_sent,
    feedbackText: row.feedback_text,
    appliedAt: row.created_at ? new Date(row.created_at) : null,
  };
}

// ─── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const color =
    score >= 75 ? "#1A7A4A" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? "Strong" : score >= 50 ? "Good" : "Weak";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `2.5px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color,
          background: `${color}18`,
          flexShrink: 0,
        }}
      >
        {score}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color,
          background: `${color}18`,
          padding: "2px 8px",
          borderRadius: 20,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const color =
    score >= 75 ? "#1A7A4A" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: "#EFEFE9",
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${score}%`,
          background: color,
          borderRadius: 2,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

// ─── Compare Modal ─────────────────────────────────────────────────────────────
function CompareModal({ candidates, onClose, onShortlist, onReject }) {
  const cols = candidates.slice(0, 4);
  const allSkills = [...new Set(cols.flatMap((c) => c.skills || []))];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,13,26,0.92)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f1929",
          border: "1px solid #EFEFE9",
          borderRadius: 16,
          width: "100%",
          maxWidth: 1100,
          padding: 32,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h2 style={{ color: "#F6F6F1", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Side-by-Side Comparison
            </h2>
            <p style={{ color: "#3A3A38", fontSize: 13, margin: "4px 0 0" }}>
              {cols.length} candidates selected
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#EFEFE9",
              border: "none",
              color: "#6B6B68",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close ✕
          </button>
        </div>

        {/* Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
            gap: 16,
          }}
        >
          {cols.map((c) => {
            const color = c.score >= 75 ? "#1A7A4A" : c.score >= 50 ? "#f59e0b" : "#ef4444";
            return (
              <div
                key={c.id}
                style={{
                  background: "#F6F6F1",
                  borderRadius: 12,
                  border: `1px solid ${color}40`,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Name + score */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: `${color}20`,
                      border: `2px solid ${color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 700,
                      color,
                      margin: "0 auto 10px",
                    }}
                  >
                    {c.score}
                  </div>
                  <div style={{ color: "#F6F6F1", fontWeight: 700, fontSize: 15 }}>
                    {c.name}
                  </div>
                  <div style={{ color: "#3A3A38", fontSize: 12, marginTop: 2 }}>
                    {c.title || "Candidate"}
                  </div>
                </div>

                {/* ATS Summary */}
                {c.atsSummary && (
                  <div style={{ background: "#0f1929", borderRadius: 8, padding: 12 }}>
                    <div style={{ color: "#6B6B68", fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: "0.06em" }}>
                      ATS SUMMARY
                    </div>
                    <p style={{ color: "#E8E8E1", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                      {c.atsSummary}
                    </p>
                  </div>
                )}

                {/* Skills match */}
                <div>
                  <div style={{ color: "#6B6B68", fontSize: 11, fontWeight: 600, marginBottom: 8, letterSpacing: "0.06em" }}>
                    SKILL MATCH
                  </div>
                  {allSkills.slice(0, 8).map((skill) => {
                    const has = (c.skills || []).includes(skill);
                    return (
                      <div
                        key={skill}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 5,
                        }}
                      >
                        <span style={{ color: has ? "#1A7A4A" : "#ef4444", fontSize: 12 }}>
                          {has ? "✓" : "✗"}
                        </span>
                        <span
                          style={{
                            color: has ? "#E8E8E1" : "#E8E8E1",
                            fontSize: 12,
                          }}
                        >
                          {skill}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Missing skills */}
                {c.missingSkills && c.missingSkills.length > 0 && (
                  <div>
                    <div style={{ color: "#6B6B68", fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: "0.06em" }}>
                      GAPS
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {c.missingSkills.map((s) => (
                        <span
                          key={s}
                          style={{
                            background: "#ef444420",
                            color: "#ef4444",
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 10,
                            border: "1px solid #ef444440",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
                  <button
                    onClick={() => onShortlist([c])}
                    style={{
                      background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
                      border: "none",
                      color: "#1A1A18",
                      borderRadius: 8,
                      padding: "9px 0",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    ✓ Shortlist
                  </button>
                  <button
                    onClick={() => onReject([c])}
                    style={{
                      background: "#ef444420",
                      border: "1px solid #ef444440",
                      color: "#ef4444",
                      borderRadius: 8,
                      padding: "9px 0",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    Reject + Send Feedback
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── AI Hiring Assistant panel ─────────────────────────────────────────────────
// 2026-08-09: holistic, whole-slate advisory pass on top of the per-candidate
// ATS scoring that already runs automatically at apply time. This panel is
// PURELY ADVISORY -- it never writes to applications/pipeline_candidates and
// never triggers Shortlist/Reject itself; those remain explicit human clicks
// on the existing buttons elsewhere in this file. Tier badges here are
// labeled "AI tier" throughout to keep them visually distinct from the
// deterministic ATS Strong/Good/Weak badge already shown per row.
const TIER_STYLE = {
  "Strong Fit": { color: "#1A7A4A", bg: "#1A7A4A20" },
  "Consider": { color: "#f59e0b", bg: "#f59e0b20" },
  "Not Recommended": { color: "#ef4444", bg: "#ef444420" },
}

function HiringAssistantPanel({ jobTitle, jobDescription, candidates }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)

  const run = async () => {
    if (loading) return
    setLoading(true)
    setErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/hiring-assistant/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          jobTitle,
          jobDescription,
          candidates: candidates.map((c) => ({
            id: c.id, name: c.name, score: c.score,
            matchedSkills: c.skills, missingSkills: c.missingSkills, atsSummary: c.atsSummary,
          })),
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setResult(body)
      setOpen(true)
    } catch (e) {
      console.error("Hiring assistant failed:", e)
      setErr(e.message)
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const tierById = new Map((result?.candidates || []).map((c) => [c.id, c]))

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={run}
          disabled={loading || candidates.length === 0}
          style={{
            background: loading ? "#374151" : "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
            border: "none", color: "#1A1A18", borderRadius: 8, padding: "9px 16px",
            cursor: loading || candidates.length === 0 ? "not-allowed" : "pointer",
            opacity: candidates.length === 0 ? 0.5 : 1, fontSize: 13, fontWeight: 700,
          }}
        >
          {loading ? "Analyzing slate…" : "🤖 Run AI Hiring Assistant"}
        </button>
        {result && !loading && (
          <button onClick={() => setOpen((o) => !o)} style={{ background: "transparent", border: "none", color: "#3D4EAC", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {open ? "Hide" : "Show"} recommendation
          </button>
        )}
        <span style={{ color: "#3A3A38", fontSize: 11.5 }}>
          Advisory only — AI-generated, not authoritative. You still choose who to shortlist or reject.
        </span>
      </div>

      {open && err && (
        <div style={{ marginTop: 10, color: "#ef4444", fontSize: 12.5, background: "#ef444415", border: "1px solid #ef444430", borderRadius: 10, padding: "10px 14px" }}>
          Couldn't run the hiring assistant: {err}
        </div>
      )}

      {open && result && (
        <div style={{ marginTop: 10, background: "#0f1929", border: "1px solid #EFEFE9", borderRadius: 12, padding: 16 }}>
          <div style={{ color: "#6B6B68", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>
            AI RECOMMENDATION
          </div>
          <p style={{ color: "#E8E8E1", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>{result.overallSummary}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {candidates.map((c) => {
              const rec = tierById.get(c.id)
              if (!rec) return null
              const style = TIER_STYLE[rec.tier] || TIER_STYLE["Consider"]
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderTop: "1px solid #0a1120" }}>
                  <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: style.color, background: style.bg, borderRadius: 20, padding: "3px 9px" }}>
                    {rec.tier}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#E8E8E1", fontSize: 12.5, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ color: "#3A3A38", fontSize: 11.5, marginTop: 2 }}>{rec.reasoning}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Feedback Modal ────────────────────────────────────────────────────────────
function FeedbackModal({ candidate, jobTitle, onClose, onSent }) {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    generateFeedback();
  }, []);

  async function generateFeedback() {
    setLoading(true);
    try {
      // 2026-08-09: backend now requires auth (was open/unauthenticated).
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND}/generate-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          candidateName: candidate.name,
          jobTitle,
          score: candidate.score,
          missingSkills: candidate.missingSkills || [],
          atsSummary: candidate.atsSummary || "",
          strengths: candidate.skills || [],
        }),
      });
      const data = await res.json();
      setFeedback(data.feedback || generateLocalFeedback(candidate, jobTitle));
    } catch {
      setFeedback(generateLocalFeedback(candidate, jobTitle));
    }
    setLoading(false);
  }

  function generateLocalFeedback(c, jt) {
    const missing = (c.missingSkills || []).slice(0, 3);
    const strengths = (c.skills || []).slice(0, 2);
    return `Subject: Your Application for ${jt} — Feedback from Capabilio

Hi ${c.name},

Thank you so much for taking the time to apply for the ${jt} position. We genuinely appreciate your interest and the effort you put into your application.

After carefully reviewing your background, we've decided to move forward with other candidates whose experience more closely aligns with our current needs. This was a difficult decision, and we want to make it as useful for you as possible.

**What stood out positively:**
${strengths.length > 0 ? strengths.map((s) => `• Your experience with ${s}`).join("\n") : "• Your enthusiasm and initiative came through clearly"}

**Areas to strengthen for future applications:**
${missing.length > 0 ? missing.map((s) => `• ${s} — hands-on project experience or a short course here would significantly strengthen your profile`).join("\n") : "• Deepening your technical depth in the core competencies for this role"}

**Our honest recommendation:**
Consider building 1–2 portfolio projects that demonstrate these skills directly. Even a small, well-documented project signals commitment and ability far more than a certification alone.

We genuinely hope you find a role that's a great match soon — your profile has real potential, and the right fit is out there.

With respect,
The Hiring Team`;
  }

  async function handleSend() {
    setSending(true);
    setSendError("");
    try {
      // Save feedback record & update application status
      const { error: updateErr } = await supabase
        .from("applications")
        .update({
          status: "rejected",
          feedback_sent: true,
          feedback_text: feedback,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", candidate.id);
      if (updateErr) throw updateErr;

      // Trigger the actual email via backend
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${BACKEND}/send-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          candidateEmail: candidate.email,
          candidateName: candidate.name,
          feedback,
        }),
      }).catch(() => {});
      setSending(false);
      setSent(true);
      setTimeout(() => onSent(), 1500);
    } catch (err) {
      console.error("Failed to send feedback:", err);
      setSending(false);
      setSendError("Failed to send feedback. Please try again.");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,13,26,0.92)",
        backdropFilter: "blur(8px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f1929",
          border: "1px solid #EFEFE9",
          borderRadius: 16,
          width: "100%",
          maxWidth: 640,
          padding: 32,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ color: "#1A7A4A", fontSize: 20, fontWeight: 700 }}>
              Feedback Sent!
            </div>
            <div style={{ color: "#3A3A38", fontSize: 14, marginTop: 8 }}>
              {candidate.name} will receive their feedback within minutes.
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>⚡</span>
                <h2 style={{ color: "#F6F6F1", fontSize: 20, fontWeight: 700, margin: 0 }}>
                  Instant Feedback
                </h2>
              </div>
              <p style={{ color: "#3A3A38", fontSize: 13, margin: 0 }}>
                AI-generated personalised feedback for{" "}
                <strong style={{ color: "#6B6B68" }}>{candidate.name}</strong> — review and send in one click.
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: "3px solid #EFEFE9",
                    borderTop: "3px solid #3D4EAC",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 16px",
                  }}
                />
                <div style={{ color: "#3A3A38", fontSize: 13 }}>
                  Generating personalised feedback…
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            ) : (
              <>
                {/* Missing skills chips */}
                {(candidate.missingSkills || []).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: "#6B6B68", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>
                      IDENTIFIED GAPS
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {candidate.missingSkills.map((s) => (
                        <span
                          key={s}
                          style={{
                            background: "#ef444420",
                            color: "#ef4444",
                            fontSize: 11,
                            padding: "3px 10px",
                            borderRadius: 20,
                            border: "1px solid #ef444440",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editable feedback */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: "#6B6B68", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>
                    FEEDBACK EMAIL — REVIEW & EDIT BEFORE SENDING
                  </div>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 280,
                      background: "#F6F6F1",
                      border: "1px solid #EFEFE9",
                      borderRadius: 10,
                      color: "#E8E8E1",
                      fontSize: 13,
                      lineHeight: 1.7,
                      padding: 16,
                      resize: "vertical",
                      fontFamily: "'DM Mono', 'Courier New', monospace",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {sendError && (
                  <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>
                    {sendError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      flex: 1,
                      background: sending
                        ? "#374151"
                        : "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
                      border: "none",
                      color: "#1A1A18",
                      borderRadius: 10,
                      padding: "13px 0",
                      cursor: sending ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {sending ? "Sending…" : "⚡ Send Feedback Now"}
                  </button>
                  <button
                    onClick={generateFeedback}
                    style={{
                      background: "#EFEFE9",
                      border: "1px solid #334155",
                      color: "#6B6B68",
                      borderRadius: 10,
                      padding: "13px 18px",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    ↺ Regenerate
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      background: "transparent",
                      border: "1px solid #334155",
                      color: "#3A3A38",
                      borderRadius: 10,
                      padding: "13px 18px",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
// 2026-08-09: production-scale rewrite. Previously this component loaded
// EVERY application for a job (or every application across every job on
// the "All roles" view) in one unbounded query, then filtered/rendered all
// of them client-side -- fine at a handful of applicants, but at real
// scale (a popular posting can get hundreds to 1000+ applications) this
// meant one huge query and a 1000-row client render on every load. Filter
// tabs, pagination, and the applicant counts are now all computed
// server-side (see SCORE_RANGES/scopedQuery below) so the browser only
// ever holds one page's worth of rows.
const PAGE_SIZE = 100;
// Must match routes/bulkReject.js's own MAX_BATCH exactly -- that's the
// hard per-request cap the backend enforces; this is how many candidates
// this frontend chunks each bulk-reject call into.
const BULK_REJECT_BATCH = 25;

const SCORE_RANGES = {
  all: null,
  strong: { gte: 75 },
  good: { gte: 50, lt: 75 },
  weak: { lt: 50 },
};

export default function ApplicationsView({ jobId, jobTitle, onBack }) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]); // current page only
  const [jobsById, setJobsById] = useState({});
  const [jobDescById, setJobDescById] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | strong | good | weak
  const [page, setPage] = useState(0); // 0-based
  const [counts, setCounts] = useState({ all: 0, strong: 0, good: 0, weak: 0 });
  const [selected, setSelected] = useState(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [bulkActionInFlight, setBulkActionInFlight] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { done, total } while a bulk reject is running
  const bulkInFlightRef = useRef(false); // read inside the realtime handler without a stale closure

  // titleFor(app) resolves the right job title whether this view is scoped
  // to one job (jobId/jobTitle props, drilled into from JobBoard) or showing
  // every application across every job (no jobId -- the top-level
  // /recruiter/applications route) -- in the latter case each row can belong
  // to a different job, so the single jobTitle prop can't be trusted.
  const titleFor = (app) => (jobId ? jobTitle : jobsById[app?.jobId] || app?.jobDescription?.slice(0, 40) || "—");

  // Builds the shared "active applicants for this scope" query -- always
  // excludes rejected/shortlisted (matches the old client-side filter
  // exactly), always job-scoped when jobId is set, RLS still enforces the
  // company boundary server-side either way.
  function scopedQuery(table = "applications", select = "*") {
    let q = supabase.from(table).select(select);
    if (jobId) q = q.eq("job_id", jobId);
    q = q.not("status", "in", "(rejected,shortlisted)");
    const range = SCORE_RANGES[filter];
    if (range?.gte != null) q = q.gte("score", range.gte);
    if (range?.lt != null) q = q.lt("score", range.lt);
    return q;
  }

  const fetchCounts = useCallback(async () => {
    const withRange = (q, range) => {
      if (range?.gte != null) q = q.gte("score", range.gte);
      if (range?.lt != null) q = q.lt("score", range.lt);
      return q;
    };
    const base = () => {
      let q = supabase.from("applications").select("id", { count: "exact", head: true }).not("status", "in", "(rejected,shortlisted)");
      if (jobId) q = q.eq("job_id", jobId);
      return q;
    };
    const [all, strong, good, weak] = await Promise.all([
      base(),
      withRange(base(), SCORE_RANGES.strong),
      withRange(base(), SCORE_RANGES.good),
      withRange(base(), SCORE_RANGES.weak),
    ]);
    setCounts({
      all: all.count || 0,
      strong: strong.count || 0,
      good: good.count || 0,
      weak: weak.count || 0,
    });
    // filter is deliberately NOT a dependency -- this always computes all
    // four tab counts together regardless of which tab is active.
  }, [jobId]);

  const fetchPage = useCallback(async (pageIndex, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    const from = pageIndex * PAGE_SIZE;
    const { data, error } = await scopedQuery()
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("Failed to load applications:", error.message);
    } else {
      setApplications((data || []).map(fromDbApplication));
    }
    if (!silent) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, filter]);

  // Job title/description lookup -- small, loaded once regardless of scope
  // (used for both the "All roles" column and the Hiring Assistant panel).
  useEffect(() => {
    let cancelled = false;
    supabase.from("jobs").select("id,title,description").then(({ data, error }) => {
      if (cancelled || error) return;
      setJobsById(Object.fromEntries((data || []).map((j) => [j.id, j.title])));
      setJobDescById(Object.fromEntries((data || []).map((j) => [j.id, j.description || ""])));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setPage(0); }, [jobId, filter]);
  useEffect(() => { fetchPage(page); }, [page, fetchPage]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  // Realtime: rather than trying to precisely patch one page of a
  // filtered/paginated result set from a raw INSERT/UPDATE/DELETE payload
  // (which page a changed row belongs to depends on score/status/order,
  // not just its id), any change just triggers a debounced silent refetch
  // of the current page + counts. Suppressed entirely while a bulk action
  // is running (bulkInFlightRef) -- a 25-candidate batch reject fires 25
  // UPDATEs in quick succession; those are refetched once, deliberately,
  // after the whole batch completes instead of thrashing mid-batch.
  useEffect(() => {
    let debounceTimer = null;
    const scheduleRefresh = () => {
      if (bulkInFlightRef.current) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchPage(page, { silent: true });
        fetchCounts();
      }, 600);
    };
    const channel = supabase
      .channel(jobId ? `applications-${jobId}` : "applications-all")
      .on(
        "postgres_changes",
        jobId
          ? { event: "*", schema: "public", table: "applications", filter: `job_id=eq.${jobId}` }
          : { event: "*", schema: "public", table: "applications" },
        scheduleRefresh
      )
      .subscribe();
    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [jobId, page, fetchPage, fetchCounts]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Selects/deselects everyone on the CURRENT page only -- with real
  // pagination there is no in-memory "everyone matching this filter" to
  // select from without loading them all, which is exactly what this
  // rewrite exists to avoid. See the "Select all on this page" label below.
  function toggleAll() {
    if (selected.size === applications.length && applications.length > 0) setSelected(new Set());
    else setSelected(new Set(applications.map((a) => a.id)));
  }

  async function shortlistSelected(candidatesArg) {
    if (bulkActionInFlight) return;
    const targets = candidatesArg || applications.filter((a) => selected.has(a.id));
    if (targets.length === 0) return;
    setBulkActionInFlight(true);
    try {
      for (const c of targets) {
        const { error: updateErr } = await supabase
          .from("applications")
          .update({ status: "shortlisted", shortlisted_at: new Date().toISOString() })
          .eq("id", c.id);
        if (updateErr) throw updateErr;

        // Add to pipeline
        const { error: pipelineErr } = await supabase.from("pipeline_candidates").insert({
          company_id: c.companyId,
          candidate_id: c.candidateId || c.id,
          name: c.name,
          job_id: c.jobId,
          job_title: titleFor(c),
          stage: "applied",
          score: c.score || 0,
        });
        if (pipelineErr) throw pipelineErr;
      }
      setApplications((prev) => prev.filter((a) => !targets.some((t) => t.id === a.id)));
      setSelected(new Set());
      setCompareOpen(false);
      showToast(`${targets.length} candidate${targets.length > 1 ? "s" : ""} moved to pipeline`);
      fetchCounts();
    } catch (e) {
      console.error("shortlistSelected failed:", e.message);
      showToast("Failed to shortlist", "error");
    } finally {
      setBulkActionInFlight(false);
    }
  }

  function rejectSelected(candidatesArg) {
    if (bulkActionInFlight) return;
    const targets = candidatesArg || applications.filter((a) => selected.has(a.id));
    if (targets.length === 0) return;
    if (targets.length === 1) {
      setFeedbackTarget(targets[0]);
      setCompareOpen(false);
    } else {
      batchReject(targets);
    }
  }

  // Real bulk rejection: every candidate gets an actual AI-drafted,
  // skill-gap-framed rejection email via POST /bulk-reject-feedback --
  // previously this only flipped applications.status with NO email sent
  // at all (confirmed bug). Chunked into groups of BULK_REJECT_BATCH,
  // grouped by job (relevant on the "All roles" view, where selected
  // candidates can span multiple jobs -- the backend needs one jobId per
  // call). Partial failures are real and reported, never hidden: a
  // candidate whose email failed to send is NOT marked rejected server-side
  // (see bulkReject.js) and stays selected here so the recruiter can retry.
  async function batchReject(targets) {
    if (bulkActionInFlight) return;
    const confirmed = window.confirm(
      `Reject ${targets.length} candidate${targets.length > 1 ? "s" : ""}? Each will immediately receive a personalized AI-drafted rejection email. This cannot be undone.`
    );
    if (!confirmed) return;

    setBulkActionInFlight(true);
    bulkInFlightRef.current = true;
    setBulkProgress({ done: 0, total: targets.length });

    const byJob = new Map();
    for (const c of targets) {
      const key = c.jobId || jobId || "unknown";
      if (!byJob.has(key)) byJob.set(key, []);
      byJob.get(key).push(c);
    }

    const failed = [];
    let succeededCount = 0;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      };

      for (const [jid, group] of byJob) {
        for (let i = 0; i < group.length; i += BULK_REJECT_BATCH) {
          const chunk = group.slice(i, i + BULK_REJECT_BATCH);
          try {
            const res = await fetch(`${BACKEND}/bulk-reject-feedback`, {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({ jobId: jid, applicationIds: chunk.map((c) => c.id) }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
            for (const r of body.results || []) {
              if (r.sent) succeededCount += 1;
              else failed.push(chunk.find((c) => c.id === r.id) || { id: r.id });
            }
          } catch (e) {
            console.error("Bulk reject chunk failed:", e.message);
            failed.push(...chunk);
          }
          setBulkProgress({ done: Math.min(targets.length, succeededCount + failed.length), total: targets.length });
        }
      }

      // Remove successfully-rejected rows from the current page's display;
      // keep everything else (rows untouched by this batch, and rows that
      // failed -- those stay visible and selected so the recruiter can retry).
      const failedIds = new Set(failed.map((f) => f.id));
      const targetIds = new Set(targets.map((t) => t.id));
      setApplications((prev) => prev.filter((a) => !(targetIds.has(a.id) && !failedIds.has(a.id))));
      setSelected(failedIds);
      if (failed.length === 0) {
        showToast(`${succeededCount} candidates rejected and notified`, "info");
      } else {
        showToast(`${succeededCount} rejected and notified, ${failed.length} failed -- still selected, retry when ready`, "error");
      }
      fetchCounts();
      fetchPage(page, { silent: true });
    } finally {
      setBulkActionInFlight(false);
      bulkInFlightRef.current = false;
      setBulkProgress(null);
    }
  }

  const filtered = applications; // already server-filtered/paginated
  const selectedCandidates = filtered.filter((a) => selected.has(a.id));
  const totalForFilter = counts[filter] ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalForFilter / PAGE_SIZE));

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            background:
              toast.type === "success"
                ? "#1A7A4A"
                : toast.type === "error"
                ? "#ef4444"
                : "#3D4EAC",
            color: "#1A1A18",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 2000,
            boxShadow: "0 8px 24px rgba(26,26,24,0.07)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Back + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "#EFEFE9",
              border: "none",
              color: "#6B6B68",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ← Back
          </button>
        )}
        <div>
          <h1 style={{ color: "#F6F6F1", fontSize: 24, fontWeight: 800, margin: 0 }}>
            Applications
          </h1>
          <p style={{ color: "#3A3A38", fontSize: 13, margin: "4px 0 0" }}>
            {jobId ? jobTitle : "All roles"} · {counts.all} active applicants
          </p>
        </div>
        {/* Scoring now happens automatically at apply time on the backend --
            the manual "Score All Resumes" step has been retired. */}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { key: "all", label: "All", color: "#3D4EAC" },
          { key: "strong", label: "Strong", color: "#1A7A4A" },
          { key: "good", label: "Good", color: "#f59e0b" },
          { key: "weak", label: "Weak", color: "#ef4444" },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              background: filter === key ? `${color}20` : "#F6F6F1",
              border: `1px solid ${filter === key ? color : "#EFEFE9"}`,
              color: filter === key ? color : "#3A3A38",
              borderRadius: 20,
              padding: "7px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {label}
            <span
              style={{
                background: filter === key ? color : "#EFEFE9",
                color: filter === key ? "#1A1A18" : "#6B6B68",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {bulkProgress && (
        <div style={{ background: "#3D4EAC15", border: "1px solid #3D4EAC40", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#3D4EAC", fontWeight: 600 }}>
          Rejecting and notifying candidates… {bulkProgress.done} / {bulkProgress.total}
        </div>
      )}

      {/* AI Hiring Assistant -- scoped to one job (needs job title/description
          context); on the "All roles" view (no jobId) applicants span many
          different jobs so a single holistic pass wouldn't be meaningful. */}
      {jobId && (
        <HiringAssistantPanel
          jobTitle={jobTitle}
          jobDescription={jobDescById[jobId] || ""}
          candidates={filtered}
        />
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          style={{
            background: "#EFEFE9",
            border: "1px solid #3D4EAC40",
            borderRadius: 12,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <span style={{ color: "#6B6B68", fontSize: 13 }}>
            <strong style={{ color: "#F6F6F1" }}>{selected.size}</strong> selected
          </span>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            {selected.size >= 2 && selected.size <= 4 && (
              <button
                onClick={() => setCompareOpen(true)}
                style={{
                  background: "#EFEFE9",
                  border: "1px solid #334155",
                  color: "#6B6B68",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ⚖️ Compare
              </button>
            )}
            <button
              onClick={() => shortlistSelected()}
              disabled={bulkActionInFlight}
              style={{
                background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
                border: "none",
                color: "#1A1A18",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: bulkActionInFlight ? "not-allowed" : "pointer",
                opacity: bulkActionInFlight ? 0.6 : 1,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ✓ Shortlist {selected.size}
            </button>
            <button
              onClick={() => rejectSelected()}
              disabled={bulkActionInFlight}
              style={{
                background: "#ef444420",
                border: "1px solid #ef444440",
                color: "#ef4444",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: bulkActionInFlight ? "not-allowed" : "pointer",
                opacity: bulkActionInFlight ? 0.6 : 1,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ✗ Reject {selected.size}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: "#0f1929",
          border: "1px solid #EFEFE9",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr 160px 180px 120px 160px",
            padding: "12px 20px",
            borderBottom: "1px solid #EFEFE9",
            background: "#0a1120",
          }}
        >
          <input
            type="checkbox"
            checked={selected.size === filtered.length && filtered.length > 0}
            onChange={toggleAll}
            title={pageCount > 1 ? "Select all on this page" : "Select all"}
            style={{ cursor: "pointer", accentColor: "#3D4EAC", width: 16, height: 16 }}
          />
          {["Candidate" + (pageCount > 1 ? " (this page)" : ""), "ATS Score", "Summary", "Skills Match", "Actions"].map((h) => (
            <div
              key={h}
              style={{
                color: "#E8E8E1",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#E8E8E1", fontSize: 14 }}>
            Loading applications…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#E8E8E1", fontSize: 14 }}>
            No applications in this category.
          </div>
        ) : (
          filtered.map((app) => {
            const isSelected = selected.has(app.id);
            const score = app.score || 0;
            const color =
              score >= 75 ? "#1A7A4A" : score >= 50 ? "#f59e0b" : "#ef4444";
            return (
              <div
                key={app.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 160px 180px 120px 160px",
                  padding: "16px 20px",
                  borderBottom: "1px solid #0f1929",
                  background: isSelected ? "#3D4EAC08" : "transparent",
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(app.id)}
                  style={{ cursor: "pointer", accentColor: "#3D4EAC", width: 16, height: 16 }}
                />

                {/* Candidate */}
                <div>
                  <div style={{ color: "#1A1A18", fontWeight: 600, fontSize: 14 }}>
                    {app.name || "Unknown"}
                  </div>
                  {!jobId && (
                    <div style={{ color: "#3D4EAC", fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                      {jobsById[app.jobId] || "—"}
                    </div>
                  )}
                  <div style={{ color: "#E8E8E1", fontSize: 12, marginTop: 2 }}>
                    {app.email || ""}
                  </div>
                  <div style={{ color: "#EFEFE9", fontSize: 11, marginTop: 2 }}>
                    Applied {app.appliedAt instanceof Date && !isNaN(app.appliedAt) ? app.appliedAt.toLocaleDateString() : "recently"}
                  </div>
                </div>

                {/* Score */}
                <div>
                  {score > 0 ? (
                    <>
                      <ScoreBadge score={score} />
                      <ScoreBar score={score} />
                    </>
                  ) : (
                    <span style={{ color: "#E8E8E1", fontSize: 12 }}>Not scored</span>
                  )}
                </div>

                {/* ATS Summary */}
                <div
                  style={{
                    color: "#3A3A38",
                    fontSize: 12,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {app.atsSummary || "—"}
                </div>

                {/* Skills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(app.skills || []).slice(0, 3).map((s) => (
                    <span
                      key={s}
                      style={{
                        background: "#22c55e15",
                        color: "#1A7A4A",
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 10,
                        border: "1px solid #22c55e30",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                  {(app.missingSkills || []).slice(0, 2).map((s) => (
                    <span
                      key={s}
                      style={{
                        background: "#ef444415",
                        color: "#ef4444",
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 10,
                        border: "1px solid #ef444430",
                      }}
                    >
                      ✗ {s}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => shortlistSelected([app])}
                    disabled={bulkActionInFlight}
                    style={{
                      background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
                      border: "none",
                      color: "#1A1A18",
                      borderRadius: 7,
                      padding: "7px 10px",
                      cursor: bulkActionInFlight ? "not-allowed" : "pointer",
                      opacity: bulkActionInFlight ? 0.6 : 1,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    ✓ Shortlist
                  </button>
                  <button
                    onClick={() => setFeedbackTarget(app)}
                    style={{
                      background: "#ef444415",
                      border: "1px solid #ef444430",
                      color: "#ef4444",
                      borderRadius: 7,
                      padding: "7px 10px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    ✗ Reject + Feedback
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination -- real server-side paging, not a client-side slice.
          totalForFilter comes from the same count query that drives the
          filter tab badges above, so it stays accurate at any scale. */}
      {totalForFilter > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 16 }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            style={{ padding: "7px 14px", background: "#F6F6F1", border: "1px solid #EFEFE9", borderRadius: 8, color: "#3A3A38", fontSize: 12, cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.5 : 1 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: "#6B6B68" }}>
            Page {page + 1} of {pageCount} · {totalForFilter} total
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1 || loading}
            style={{ padding: "7px 14px", background: "#F6F6F1", border: "1px solid #EFEFE9", borderRadius: 8, color: "#3A3A38", fontSize: 12, cursor: page >= pageCount - 1 ? "not-allowed" : "pointer", opacity: page >= pageCount - 1 ? 0.5 : 1 }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Modals */}
      {compareOpen && selectedCandidates.length >= 2 && (
        <CompareModal
          candidates={selectedCandidates}
          onClose={() => setCompareOpen(false)}
          onShortlist={shortlistSelected}
          onReject={rejectSelected}
        />
      )}

      {feedbackTarget && (
        <FeedbackModal
          candidate={feedbackTarget}
          jobTitle={titleFor(feedbackTarget)}
          onClose={() => setFeedbackTarget(null)}
          onSent={() => {
            setApplications((prev) =>
              prev.map((a) =>
                a.id === feedbackTarget.id
                  ? { ...a, status: "rejected", feedbackSent: true }
                  : a
              )
            );
            setFeedbackTarget(null);
            showToast("Feedback sent successfully");
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}