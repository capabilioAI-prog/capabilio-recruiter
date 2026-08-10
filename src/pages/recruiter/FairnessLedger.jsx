import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

// 2026-08-10: this page used to read a "users" collection out of the legacy
// Firestore project and fabricate an entire per-candidate event timeline
// client-side (buildLedger()) -- a hardcoded "Recruiter Priya opened
// candidate profile (3m 42s)" line, a made-up task name, elo/13 and elo/14
// "score" formulas with no real task or role-fit score behind them, and a
// literal "DD/MM/YYYY, 11:00 AM" placeholder for the interview date. None of
// it came from a real event.
//
// Real fix: applications.status changes (shortlist/reject, single and bulk)
// now write to the existing `audit_log` table via the existing
// write_audit_log RPC (already used by OfferManagement.jsx/
// HRApprovalQueue.jsx) or, for the backend's service-role bulk-reject route,
// a direct audit_log insert -- see ApplicationsView.jsx's FeedbackModal/
// shortlistSelected() and bulkReject.js. This page reads that same table.
// Nothing here is fabricated: every timeline entry is either the real
// `applications.created_at` timestamp or a real `audit_log` row, and the
// explainability content (score/matched/missing skills/ATS summary) is read
// straight off the real `applications` row used to make the decision.
//
// Known limitation, stated honestly rather than faked: audit logging only
// started 2026-08-10. Any candidate shortlisted/rejected before that date
// will show a current status with no earlier event trail -- there is no way
// to reconstruct history that was never recorded, so this page says so
// instead of inventing it.
const AUDIT_LOGGING_START = new Date("2026-08-10T00:00:00Z")

const EVENT_TYPES = {
  applied:               { icon: "📥", color: T.indigo, label: "Applied" },
  "application.shortlisted": { icon: "✅", color: T.green, label: "Shortlisted" },
  "application.rejected":    { icon: "❌", color: T.red, label: "Rejection Sent" },
}

// Exported only so src/pages/recruiter/__tests__/FairnessLedger.test.js can
// unit test the real data-mapping logic directly.
// eslint-disable-next-line react-refresh/only-export-components
export function eventTypeFor(action) {
  return EVENT_TYPES[action] || { icon: "●", color: T.ink4, label: action }
}

// eslint-disable-next-line react-refresh/only-export-components
export function daysBetween(a, b) {
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)))
}

// eslint-disable-next-line react-refresh/only-export-components
export function fromDbApplication(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    name: row.name,
    email: row.email,
    score: row.score,
    matchedSkills: row.matched_skills || [],
    missingSkills: row.missing_skills || [],
    atsSummary: row.ats_summary,
    status: row.status,
    feedbackText: row.feedback_text,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    rejectedAt: row.rejected_at ? new Date(row.rejected_at) : null,
    shortlistedAt: row.shortlisted_at ? new Date(row.shortlisted_at) : null,
  }
}

function TimelineEvent({ ev }) {
  const type = eventTypeFor(ev.action)
  return (
    <div style={{ display: "flex", gap: 16, paddingBottom: 20, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${type.color}15`, border: `2px solid ${type.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, zIndex: 1 }}>
          {type.icon}
        </div>
        <div style={{ flex: 1, width: 2, background: T.border, marginTop: 4 }} />
      </div>
      <div style={{ flex: 1, paddingTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: type.color }}>{type.label}</span>
          <span style={{ fontSize: 11, color: T.ink3, background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 5, padding: "1px 6px" }}>
            {ev.occurredAt ? ev.occurredAt.toLocaleString() : "—"}
          </span>
          <span style={{ fontSize: 10, color: T.ink4, background: T.cream3, border: `1px solid ${T.border}`, borderRadius: 5, padding: "1px 6px" }}>
            🔒 {ev.actorLabel || "System"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>{ev.note}</div>
      </div>
    </div>
  )
}

export default function FairnessLedger() {
  const [applications, setApplications] = useState([])
  const [jobsById, setJobsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [{ data: apps, error: appsErr }, { data: jobs }] = await Promise.all([
        supabase.from("applications").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("jobs").select("id, title"),
      ])
      if (appsErr) setError(appsErr.message || "Could not load applications.")
      const mapped = (apps || []).map(fromDbApplication)
      setApplications(mapped)
      setJobsById(Object.fromEntries((jobs || []).map((j) => [j.id, j.title])))
      if (mapped.length) setSelected(mapped[0])
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    (async () => {
      if (!selected) {
        setEvents([])
        return
      }
      setEventsLoading(true)
      const { data, error: fetchErr } = await supabase
        .from("audit_log")
        .select("*")
        .eq("entity_type", "application")
        .eq("entity_id", String(selected.id))
        .order("created_at", { ascending: true })
      if (fetchErr) {
        console.error("Failed to load audit_log:", fetchErr.message)
        setEvents([])
      } else {
        setEvents(data || [])
      }
      setEventsLoading(false)
    })()
  }, [selected])

  // "Applied" is always real -- it's the application row's own created_at,
  // not a fabricated day-0 placeholder. audit_log rows are appended after.
  const timeline = selected
    ? [
        { action: "applied", occurredAt: selected.createdAt, note: "Candidate applied via Capabilio portal.", actorLabel: "Candidate" },
        ...events.map((e) => ({
          action: e.action,
          occurredAt: e.created_at ? new Date(e.created_at) : null,
          note: describeEvent(e),
          actorLabel: e.actor_label,
        })),
      ]
    : []

  function describeEvent(e) {
    const after = e.after || {}
    if (e.action === "application.shortlisted") {
      return `Moved to shortlisted${after.score != null ? ` at score ${after.score}` : ""}.`
    }
    if (e.action === "application.rejected") {
      return "Rejection decided and feedback sent to the candidate."
    }
    return e.action
  }

  const preLoggingGap =
    selected &&
    selected.status !== "applied" &&
    events.length === 0 &&
    (!selected.rejectedAt || selected.rejectedAt < AUDIT_LOGGING_START) &&
    (!selected.shortlistedAt || selected.shortlistedAt < AUDIT_LOGGING_START)

  const daysInProcess = selected?.createdAt ? daysBetween(selected.createdAt, new Date()) : 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: T.green2, border: `1px solid ${T.green}20`, borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 6 }}>⚖️ Fairness Ledger</div>
        <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6 }}>
          Every shortlist and rejection decision is timestamped, attributed to the recruiter who made it, and tied to the real score and skills data used to make it. Audit logging started 2026-08-10 — decisions made before that date show current status only, with no earlier event trail.
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: T.red2, border: `1px solid ${T.red}30`, borderRadius: 9, fontSize: 12, color: T.red }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, boxShadow: T.shadow }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Applications</div>
          {loading ? (
            <div style={{ color: T.ink4, fontSize: 13 }}>Loading...</div>
          ) : applications.length === 0 ? (
            <div style={{ color: T.ink4, fontSize: 12.5, lineHeight: 1.6 }}>No applications yet.</div>
          ) : (
            applications.map((c) => {
              const isSelected = selected?.id === c.id
              const initials = (c.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: isSelected ? T.indigo3 : "transparent", border: isSelected ? `1px solid ${T.indigo}30` : "1px solid transparent", transition: "all 0.15s" }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.indigo2}15`, color: T.indigo2, border: `1px solid ${T.indigo2}35`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? T.indigo : T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name || "—"}</div>
                    <div style={{ fontSize: 10, color: T.ink4 }}>{c.score != null ? `${c.score}% match` : "Not yet scored"} · {c.status}</div>
                  </div>
                  {isSelected && <span style={{ fontSize: 10, color: T.indigo }}>▶</span>}
                </div>
              )
            })
          )}
        </div>

        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, boxShadow: T.shadow }}>
          {!selected ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.ink4 }}>Select a candidate to view their Fairness Ledger</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "14px 16px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: T.indigo3, color: T.indigo, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {(selected.name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700, color: T.ink }}>{selected.name || "—"}</div>
                  <div style={{ fontSize: 12, color: T.ink4 }}>Applied to: {jobsById[selected.jobId] || "—"} · Status: {selected.status}</div>
                </div>
                <button
                  disabled
                  title="Export isn't built yet — coming soon."
                  style={{ fontSize: 12, padding: "6px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.ink4, cursor: "not-allowed", fontFamily: "'Inter',sans-serif" }}
                >
                  ↓ Export PDF (soon)
                </button>
              </div>

              {preLoggingGap && (
                <div style={{ padding: "10px 14px", background: T.cream3, border: `1px solid ${T.border}`, borderRadius: 9, marginBottom: 16, fontSize: 12, color: T.ink3 }}>
                  This candidate's current status ({selected.status}) predates audit logging (2026-08-10), so there is no recorded event trail for that decision — only what's shown below.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Total Events", value: timeline.length, color: T.indigo },
                  { label: "Days in Process", value: daysInProcess, color: T.amber },
                  { label: "Current Status", value: selected.status, color: selected.status === "rejected" ? T.red : selected.status === "shortlisted" ? T.green : T.indigo2 },
                ].map((s) => (
                  <div key={s.label} style={{ padding: "12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 800, color: s.color, textTransform: "capitalize" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {(selected.score != null || selected.matchedSkills?.length > 0 || selected.missingSkills?.length > 0 || selected.atsSummary) && (
                <div style={{ marginBottom: 20, padding: "14px 16px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Why this score — real scoring data behind the decision</div>
                  {selected.score != null && <div style={{ fontSize: 12, color: T.ink3, marginBottom: 6 }}>Match score: <strong>{selected.score}%</strong></div>}
                  {selected.matchedSkills?.length > 0 && (
                    <div style={{ fontSize: 12, color: T.ink3, marginBottom: 6 }}>Matched skills: {selected.matchedSkills.join(", ")}</div>
                  )}
                  {selected.missingSkills?.length > 0 && (
                    <div style={{ fontSize: 12, color: T.ink3, marginBottom: 6 }}>Missing skills: {selected.missingSkills.join(", ")}</div>
                  )}
                  {selected.atsSummary && <div style={{ fontSize: 12, color: T.ink3 }}>{selected.atsSummary}</div>}
                </div>
              )}

              <div>
                {eventsLoading ? (
                  <div style={{ color: T.ink4, fontSize: 13 }}>Loading timeline...</div>
                ) : (
                  timeline.map((ev, i) => <TimelineEvent key={`${ev.action}-${i}`} ev={ev} />)
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
