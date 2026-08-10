import { useState } from "react"

// 2026-08-10: this page used to render 5 fully invented anonymous "candidate
// reviews" (MOCK_REVIEWS), a fake "Top 15% of companies" badge, and fake
// "Improvement Themes" insights derived from that fake data -- all computed
// client-side with real-looking math over fabricated inputs.
//
// Audited before touching anything: there is no candidate-facing rating
// submission flow anywhere (not in this repo, not in
// capabilio-recruiter-backend, not in capabilio-web), no storage table for a
// rating/review on either Supabase project, and no moderation pipeline
// despite the old "Integrity Controls" tab describing one as if it were
// active. Making this real is a net-new, cross-repo feature (a submission UI
// on the candidate side, a storage table, an aggregate endpoint) -- not a
// same-session rewire onto already-real data like Fairness Ledger/Hiring
// Arena were. Per an explicit decision, this pass replaces the fabrication
// with an honest empty state instead of building that feature blind.
const CATEGORIES = [
  { key: "fairness",        label: "Interview Fairness",       icon: "⚖️" },
  { key: "responsiveness",  label: "Recruiter Responsiveness", icon: "💬" },
  { key: "transparency",    label: "Process Transparency",     icon: "👁️" },
  { key: "communication",   label: "Communication Quality",    icon: "📣" },
  { key: "salary_clarity",  label: "Salary Clarity",           icon: "💰" },
  { key: "role_clarity",    label: "Role Clarity",             icon: "📋" },
  { key: "onboarding",      label: "Onboarding Experience",    icon: "🎉" },
]

const PLANNED_CONTROLS = [
  { title: "Anonymous by design",      icon: "🕶️", desc: "Reviewer identity would be separated from review content at submission — no recruiter or admin could link a review back to a specific person." },
  { title: "One rating per cycle",     icon: "🔒", desc: "Each candidate would be limited to one rating per company per hiring cycle, to prevent spam or manipulation." },
  { title: "Verified eligibility only",icon: "✅", desc: "Only candidates who actually completed a real hiring stage with this company would be eligible to rate — no drive-by reviews." },
  { title: "Content moderation",       icon: "🤖", desc: "Reviews would be checked for personal attacks, doxxing, or identifying information before being published." },
  { title: "Aggregate only for company",icon: "📊",desc: "The company portal would only ever show score averages and themes — never individual review text or reviewer signal." },
]

export default function CompanyTrustRatings() {
  const [tab, setTab] = useState("overview")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "linear-gradient(135deg,rgba(255,209,102,0.08),rgba(245,158,11,0.04))", border: "1px solid rgba(255,209,102,0.15)", borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 800, color: "#1A1A18", marginBottom: 6 }}>⭐ Candidate-to-Company Trust Ratings</div>
        <div style={{ fontSize: 13, color: "#6B6B68", lineHeight: 1.6 }}>
          This feature isn't live yet. Capabilio doesn't currently have a way for candidates to submit ratings about a company, so there is no real data to show here — everything below reflects the planned design, not collected reviews.
        </div>
      </div>

      <div style={{ background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 700, color: "#1A1A18", marginBottom: 6 }}>No ratings have been collected yet</div>
        <div style={{ fontSize: 12.5, color: "#6B6B68", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
          Candidate-facing rating collection hasn't been built. Once it exists, this page will show real aggregate scores across the categories below, sourced from actual candidate submissions — not simulated reviews.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {[["overview", "📊 Planned Categories"], ["integrity", "🛡️ Planned Controls"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            style={{ fontSize: 12, padding: "8px 16px", borderRadius: 10, border: "1px solid", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 600, transition: "all 0.15s", background: tab === v ? "rgba(61,78,172,0.15)" : "transparent", borderColor: tab === v ? "rgba(61,78,172,0.4)" : "rgba(26,26,24,0.07)", color: tab === v ? "#3D4EAC" : "#3A3A38" }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: "#1A1A18", marginBottom: 4 }}>Categories this would score, once built</div>
          <div style={{ fontSize: 12, color: "#6B6B68", marginBottom: 14 }}>Design-only — no ratings exist for any of these yet.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {CATEGORIES.map((cat) => (
              <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                <span style={{ fontSize: 12.5, color: "#3A3A38" }}>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "integrity" && (
        <div style={{ background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: "#1A1A18", marginBottom: 4 }}>How this would protect reviewers, once built</div>
          <div style={{ fontSize: 12, color: "#6B6B68", marginBottom: 16 }}>None of these controls are active — there's nothing to moderate yet since no ratings can be submitted.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {PLANNED_CONTROLS.map((c) => (
              <div key={c.title} style={{ padding: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18" }}>{c.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6B6B68", lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
