// 2026-08-10: this page ("Market Intel" in the nav) used to render entirely
// invented data: a hardcoded COMPETITORS array ("Simulated competitor
// companies" per its own comment) with made-up open-role counts, a
// Math.random()-based poachRisk() score layered on top of real candidate
// ELO, synthetic "alerts" templating real candidate names onto fabricated
// events ("may be targeted by TechCorp", "viewed 3x by external
// recruiters"), a decorative "LIVE MONITORING" badge backed by nothing, and
// an "AI Report" button that called a backend endpoint
// (/api/recruiter/candidate-analysis, mode: competitive_intelligence) that
// does not exist in capabilio-recruiter-backend -- the fetch always fails
// and silently falls back to a second, fully hardcoded fake report
// (fake "TechCorp increased hiring velocity by 40%" etc.) presented as if
// it were real AI output. It also read from the legacy Firestore project
// rather than Supabase.
//
// Audited before touching anything: there is no external competitor,
// salary, or labor-market data source integrated anywhere in Capabilio
// (capabilio-recruiter, capabilio-recruiter-backend, or capabilio-web) --
// no API keys, no client, no route. This is the same situation Trust
// Ratings was in: not a same-session rewire onto already-real data, but a
// feature whose entire premise (real competitor intelligence) has no real
// backing anywhere. Per an explicit decision, this pass replaces the
// fabrication with an honest empty state rather than building external
// market-data integration blind. RecruiterAnalytics.jsx already covers the
// real, internal aggregate stats (domain distribution, funnel, trends) this
// page would otherwise have partially duplicated.
export default function CompetitiveIntelligence() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02))", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 800, color: "#1A1A18", marginBottom: 6 }}>🕵️ Market Intel</div>
        <div style={{ fontSize: 13, color: "#6B6B68", lineHeight: 1.6 }}>
          This feature isn't live yet. Capabilio doesn't integrate any external competitor, salary, or labor-market data source, so there's nothing real to show here — competitor tracking, poaching risk, and AI market reports all require external data Capabilio doesn't currently have.
        </div>
      </div>

      <div style={{ background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 700, color: "#1A1A18", marginBottom: 6 }}>No external market data is connected</div>
        <div style={{ fontSize: 12.5, color: "#6B6B68", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
          For real internal hiring numbers — domain distribution, funnel stages, and trends across your own postings — see{" "}
          <span style={{ fontWeight: 600, color: "#3D4EAC" }}>Analytics</span> in the sidebar. That page is backed by your real applications and jobs data.
        </div>
      </div>
    </div>
  )
}
