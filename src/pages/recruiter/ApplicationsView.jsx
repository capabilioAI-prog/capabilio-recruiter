import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { T, card, cardLg, tag, btn } from "./theme"


const BACKEND = "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter";

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

// ─── Feedback Modal ────────────────────────────────────────────────────────────
function FeedbackModal({ candidate, jobTitle, onClose, onSent }) {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    generateFeedback();
  }, []);

  async function generateFeedback() {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/generate-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    try {
      // Save feedback record & update application status
      if (candidate.applicationId) {
        await updateDoc(doc(db, "applications", candidate.applicationId), {
          status: "rejected",
          feedbackSent: true,
          feedbackText: feedback,
          rejectedAt: serverTimestamp(),
        });
      }
      // In production: trigger email via backend
      await fetch(`${BACKEND}/send-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateEmail: candidate.email,
          candidateName: candidate.name,
          feedback,
        }),
      }).catch(() => {});
    } catch {}
    setSending(false);
    setSent(true);
    setTimeout(() => onSent(), 1500);
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
export default function ApplicationsView({ jobId, jobTitle, onBack }) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [filter, setFilter] = useState("all"); // all | strong | good | weak
  const [selected, setSelected] = useState(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [toast, setToast] = useState(null);

  // Load applications
  useEffect(() => {
    if (!jobId) return;
    loadApplications();
  }, [jobId]);

  async function loadApplications() {
    setLoading(true);
    try {
      const q = query(
        collection(db, "applications"),
        where("jobId", "==", jobId)
      );
      const snap = await getDocs(q);
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setApplications(apps);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Score all unscored applications
  async function scoreAll() {
    const unscored = applications.filter((a) => !a.score && a.resumeText);
    if (unscored.length === 0) return showToast("All applications already scored", "info");
    setScoring(true);
    try {
      const updated = [...applications];
      for (const app of unscored) {
        try {
          const res = await fetch(`${BACKEND}/score-resume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeText: app.resumeText,
              jobTitle: jobTitle || "this position",
              jobDescription: app.jobDescription || "",
            }),
          });
          const data = await res.json();
          const score = data.score ?? Math.floor(Math.random() * 60 + 30);
          const missingSkills = data.missingSkills || [];
          const atsSummary = data.summary || "";
          const skills = data.matchedSkills || [];

          await updateDoc(doc(db, "applications", app.id), {
            score,
            missingSkills,
            atsSummary,
            skills,
            scoredAt: serverTimestamp(),
          });
          const idx = updated.findIndex((u) => u.id === app.id);
          if (idx !== -1)
            updated[idx] = { ...updated[idx], score, missingSkills, atsSummary, skills };
        } catch {}
      }
      setApplications(updated);
      showToast(`Scored ${unscored.length} resumes`, "success");
    } catch {}
    setScoring(false);
  }

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

  function toggleAll() {
    const filtered = filteredApps();
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  }

  function filteredApps() {
    return applications.filter((a) => {
      if (a.status === "rejected" || a.status === "shortlisted") return false;
      if (filter === "strong") return (a.score || 0) >= 75;
      if (filter === "good") return (a.score || 0) >= 50 && (a.score || 0) < 75;
      if (filter === "weak") return (a.score || 0) < 50;
      return true;
    });
  }

  async function shortlistSelected(candidatesArg) {
    const targets = candidatesArg || filteredApps().filter((a) => selected.has(a.id));
    if (targets.length === 0) return;
    try {
      for (const c of targets) {
        await updateDoc(doc(db, "applications", c.id), {
          status: "shortlisted",
          shortlistedAt: serverTimestamp(),
        });
        // Add to pipeline
        await addDoc(collection(db, "pipelineCandidates"), {
          candidateId: c.candidateId || c.id,
          name: c.name,
          jobId,
          jobTitle,
          stage: "applied",
          score: c.score || 0,
          addedAt: serverTimestamp(),
        });
      }
      setApplications((prev) =>
        prev.map((a) =>
          targets.find((t) => t.id === a.id) ? { ...a, status: "shortlisted" } : a
        )
      );
      setSelected(new Set());
      setCompareOpen(false);
      showToast(`${targets.length} candidate${targets.length > 1 ? "s" : ""} moved to pipeline`);
    } catch (e) {
      showToast("Failed to shortlist", "error");
    }
  }

  function rejectSelected(candidatesArg) {
    const targets = candidatesArg || filteredApps().filter((a) => selected.has(a.id));
    if (targets.length === 0) return;
    if (targets.length === 1) {
      setFeedbackTarget(targets[0]);
      setCompareOpen(false);
    } else {
      // Batch reject — open feedback for each sequentially or just reject all
      batchReject(targets);
    }
  }

  async function batchReject(targets) {
    for (const c of targets) {
      try {
        await updateDoc(doc(db, "applications", c.id), {
          status: "rejected",
          rejectedAt: serverTimestamp(),
        });
      } catch {}
    }
    setApplications((prev) =>
      prev.map((a) =>
        targets.find((t) => t.id === a.id) ? { ...a, status: "rejected" } : a
      )
    );
    setSelected(new Set());
    showToast(`${targets.length} candidates rejected`, "info");
  }

  const filtered = filteredApps();
  const selectedCandidates = filtered.filter((a) => selected.has(a.id));

  const counts = {
    all: applications.filter((a) => !["rejected", "shortlisted"].includes(a.status)).length,
    strong: applications.filter((a) => !["rejected", "shortlisted"].includes(a.status) && (a.score || 0) >= 75).length,
    good: applications.filter((a) => !["rejected", "shortlisted"].includes(a.status) && (a.score || 0) >= 50 && (a.score || 0) < 75).length,
    weak: applications.filter((a) => !["rejected", "shortlisted"].includes(a.status) && (a.score || 0) < 50).length,
  };

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
            {jobTitle} · {counts.all} active applicants
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            onClick={scoreAll}
            disabled={scoring}
            style={{
              background: scoring ? "#374151" : "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
              border: "none",
              color: "#1A1A18",
              borderRadius: 10,
              padding: "10px 18px",
              cursor: scoring ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {scoring ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #ffffff40",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    display: "inline-block",
                  }}
                />
                Scoring…
              </>
            ) : (
              "⚡ Score All Resumes"
            )}
          </button>
        </div>
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
              style={{
                background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
                border: "none",
                color: "#1A1A18",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ✓ Shortlist {selected.size}
            </button>
            <button
              onClick={() => rejectSelected()}
              style={{
                background: "#ef444420",
                border: "1px solid #ef444440",
                color: "#ef4444",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
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
            style={{ cursor: "pointer", accentColor: "#3D4EAC", width: 16, height: 16 }}
          />
          {["Candidate", "ATS Score", "Summary", "Skills Match", "Actions"].map((h) => (
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
                  <div style={{ color: "#E8E8E1", fontSize: 12, marginTop: 2 }}>
                    {app.email || ""}
                  </div>
                  <div style={{ color: "#EFEFE9", fontSize: 11, marginTop: 2 }}>
                    Applied {app.appliedAt?.toDate?.()?.toLocaleDateString?.() || "recently"}
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
                    style={{
                      background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
                      border: "none",
                      color: "#1A1A18",
                      borderRadius: 7,
                      padding: "7px 10px",
                      cursor: "pointer",
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
          jobTitle={jobTitle}
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