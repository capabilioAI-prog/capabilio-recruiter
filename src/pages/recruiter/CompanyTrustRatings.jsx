import { useState } from "react"
import { T, card, cardLg, tag, btn } from "./theme"


const CATEGORIES = [
  { key:"fairness",         label:"Interview Fairness",      icon:"⚖️",  color:"#3D4EAC" },
  { key:"responsiveness",   label:"Recruiter Responsiveness",icon:"💬", color:"#1A7A4A" },
  { key:"transparency",     label:"Process Transparency",    icon:"👁️",  color:"#1565C0" },
  { key:"communication",    label:"Communication Quality",   icon:"📣", color:"#f59e0b" },
  { key:"salary_clarity",   label:"Salary Clarity",          icon:"💰", color:"#FFD166" },
  { key:"role_clarity",     label:"Role Clarity",            icon:"📋", color:"#3D4EAC" },
  { key:"onboarding",       label:"Onboarding Experience",   icon:"🎉", color:"#ec4899" },
]

const MOCK_REVIEWS = [
  { stage:"Interview Completed", text:"The process was structured and every stage had a clear purpose. Feedback was prompt and respectful. I didn't feel like a number.", date:"2 weeks ago", ratings:{ fairness:5, responsiveness:4, transparency:5, communication:5, salary_clarity:4, role_clarity:5, onboarding:null } },
  { stage:"Arena Challenge",     text:"Loved the transparent timeline and skill-based evaluation. My Arena score actually mattered — it was clearly factored into the decision.", date:"1 month ago", ratings:{ fairness:5, responsiveness:5, transparency:5, communication:4, salary_clarity:3, role_clarity:4, onboarding:null } },
  { stage:"Joined Company",      text:"Onboarding was smooth. Got my tasks and access on Day 1. Team was well-prepared for my joining. Capabilio made the whole transition visible.", date:"3 weeks ago", ratings:{ fairness:5, responsiveness:4, transparency:4, communication:5, salary_clarity:5, role_clarity:5, onboarding:5 } },
  { stage:"Shortlisted",         text:"Even though I wasn't selected, I received a detailed explanation of what I needed to improve. The growth roadmap was genuinely useful.", date:"2 months ago", ratings:{ fairness:4, responsiveness:3, transparency:5, communication:4, salary_clarity:4, role_clarity:4, onboarding:null } },
  { stage:"Offer Extended",      text:"Salary was exactly what was stated in the job posting. No last-minute adjustments. Role responsibilities matched the JD precisely.", date:"5 days ago", ratings:{ fairness:5, responsiveness:5, transparency:5, communication:5, salary_clarity:5, role_clarity:5, onboarding:4 } },
]

function StarRow({ value, max = 5 }) {
  return (
    <span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ fontSize:14, color: i < Math.round(value) ? "#FFD166" : "#EFEFE9" }}>★</span>
      ))}
    </span>
  )
}

function CategoryBar({ cat, avg }) {
  const pct = (avg / 5) * 100
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
      <span style={{ fontSize:16, flexShrink:0 }}>{cat.icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
          <span style={{ fontSize:12, color:"#6B6B68" }}>{cat.label}</span>
          <span style={{ fontSize:12, fontWeight:700, color:cat.color }}>{avg.toFixed(1)} / 5.0</span>
        </div>
        <div style={{ height:7, background:"rgba(26,26,24,0.06)", borderRadius:4 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${cat.color},${cat.color}88)`, borderRadius:4, transition:"width 1s ease" }} />
        </div>
      </div>
      <StarRow value={avg} />
    </div>
  )
}

export default function CompanyTrustRatings() {
  const [tab, setTab] = useState("overview")

  // Compute aggregates
  const catAverages = CATEGORIES.reduce((acc, cat) => {
    const scores = MOCK_REVIEWS.map((r) => r.ratings[cat.key]).filter((v) => v != null)
    acc[cat.key] = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
    return acc
  }, {})

  const overallScore = Object.values(catAverages).reduce((s, v) => s + v, 0) / CATEGORIES.length
  const totalReviews = MOCK_REVIEWS.length

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,rgba(255,209,102,0.08),rgba(245,158,11,0.04))", border:"1px solid rgba(255,209,102,0.15)", borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:"#1A1A18", marginBottom:6 }}>⭐ Candidate-to-Company Trust Ratings</div>
        <div style={{ fontSize:13, color:"#6B6B68", lineHeight:1.6 }}>
          Anonymous, one-time-per-cycle ratings from verified candidates and employees. <strong style={{ color:"#FFD166" }}>You see aggregate analytics only</strong> — never individual reviewer identity. Ratings are moderated for respectful, experience-based content.
        </div>
      </div>

      {/* Trust score hero */}
      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:16 }}>
        <div style={{ background:"#EFEFE9", border:"1px solid rgba(255,209,102,0.2)", borderRadius:16, padding:24, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
          <div style={{ fontSize:11, color:"#3A3A38", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Company Trust Score</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:52, fontWeight:800, color:"#FFD166", lineHeight:1 }}>{overallScore.toFixed(1)}</div>
          <StarRow value={overallScore} />
          <div style={{ fontSize:12, color:"#E8E8E1" }}>Based on {totalReviews} verified reviews</div>
          <div style={{ fontSize:11, background:"rgba(34,197,94,0.1)", color:"#1A7A4A", border:"1px solid rgba(34,197,94,0.2)", borderRadius:7, padding:"3px 10px" }}>
            Top 15% of companies
          </div>
        </div>

        <div style={{ background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:"#1A1A18", marginBottom:16 }}>Category Breakdown</div>
          {CATEGORIES.map((cat) => (
            <CategoryBar key={cat.key} cat={cat} avg={catAverages[cat.key]} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8 }}>
        {[["overview","📊 Overview"],["reviews","💬 Review Summaries"],["integrity","🛡️ Integrity Controls"]].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ fontSize:12, padding:"8px 16px", borderRadius:10, border:"1px solid", cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600, transition:"all 0.15s", background: tab === v ? "rgba(61,78,172,0.15)" : "transparent", borderColor: tab === v ? "rgba(61,78,172,0.4)" : "rgba(26,26,24,0.07)", color: tab === v ? "#a5b4fc" : "#E8E8E1" }}>
            {l}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Improvement themes */}
          <div style={{ background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:"#1A1A18", marginBottom:14 }}>📈 Improvement Themes (Aggregate Only)</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { theme:"Salary Clarity",      insight:"3 reviews mention salary expectations set in JD not always matching final offer. Consider publishing fixed bands.", icon:"💰", color:"#FFD166", action:"Review JD Template" },
                { theme:"Response Speed",      insight:"Candidates appreciate same-day acknowledgements. Automated day-1 confirmation messages are well received.", icon:"⚡", color:"#1A7A4A", action:"Enable Auto-Ack" },
                { theme:"Rejection Quality",   insight:"Structured rejection messages with growth paths received 5-star ratings even from non-selected candidates.", icon:"📬", color:"#3D4EAC", action:"Review Rejection Flow" },
              ].map((t) => (
                <div key={t.theme} style={{ padding:"16px", background:`${t.color}06`, border:`1px solid ${t.color}15`, borderRadius:12 }}>
                  <div style={{ fontSize:24 }}>{t.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:t.color, marginTop:6, marginBottom:6 }}>{t.theme}</div>
                  <div style={{ fontSize:12, color:"#6B6B68", lineHeight:1.5, marginBottom:10 }}>{t.insight}</div>
                  <button style={{ fontSize:11, padding:"5px 10px", background:`${t.color}12`, border:`1px solid ${t.color}25`, borderRadius:7, color:t.color, cursor:"pointer", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>{t.action} →</button>
                </div>
              ))}
            </div>
          </div>

          {/* Stage distribution */}
          <div style={{ background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:"#1A1A18", marginBottom:14 }}>Reviews by Stage</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {Object.entries(MOCK_REVIEWS.reduce((acc, r) => { acc[r.stage] = (acc[r.stage]||0)+1; return acc }, {})).map(([stage, count]) => (
                <div key={stage} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, textAlign:"center" }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:"#1A1A18" }}>{count}</div>
                  <div style={{ fontSize:11, color:"#3A3A38" }}>{stage}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "reviews" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Anonymous disclaimer */}
          <div style={{ padding:"12px 16px", background:"rgba(61,78,172,0.06)", border:"1px solid rgba(61,78,172,0.15)", borderRadius:10, fontSize:12, color:"#a5b4fc" }}>
            🔒 All reviews below are from verified candidates or employees. Reviewer identities are fully anonymous. You will never see names, UIDs, or profile details.
          </div>
          {MOCK_REVIEWS.map((r, i) => (
            <div key={i} style={{ background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"rgba(26,26,24,0.06)", color:"#3A3A38", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>👤</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1A1A18" }}>Anonymous Reviewer</div>
                  <div style={{ fontSize:11, color:"#E8E8E1" }}>Stage: {r.stage} · {r.date}</div>
                </div>
                <div style={{ marginLeft:"auto" }}>
                  <StarRow value={Object.values(r.ratings).filter((v) => v != null).reduce((s,v) => s+v,0) / Object.values(r.ratings).filter((v) => v != null).length} />
                </div>
              </div>
              <div style={{ fontSize:13, color:"#6B6B68", lineHeight:1.7, fontStyle:"italic", padding:"12px 14px", background:"rgba(255,255,255,0.02)", borderRadius:9, borderLeft:"3px solid rgba(61,78,172,0.3)" }}>
                "{r.text}"
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
                {CATEGORIES.filter((c) => r.ratings[c.key] != null).map((c) => (
                  <span key={c.key} style={{ fontSize:11, padding:"3px 8px", background:`${c.color}10`, border:`1px solid ${c.color}20`, borderRadius:6, color:c.color }}>
                    {c.icon} {c.label}: {r.ratings[c.key]}/5
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "integrity" && (
        <div style={{ background:"#EFEFE9", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:24 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:"#1A1A18", marginBottom:20 }}>🛡️ Rating System Integrity Controls</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 }}>
            {[
              { title:"Anonymous by Design",       icon:"🕶️",  color:"#3D4EAC", desc:"Reviewer identity is cryptographically separated from the review content at submission. No recruiter or admin can link a review to a specific person." },
              { title:"One Rating Per Cycle",       icon:"🔒", color:"#1A7A4A", desc:"Each candidate/employee can submit one rating per company per hiring cycle. Prevents spam, pressure, and manipulation. Edit window: 24 hours (typos only)." },
              { title:"Verified Eligibility Only",  icon:"✅", color:"#FFD166", desc:"Only candidates who completed a verified hiring stage, were selected, or joined the company are eligible to rate. Prevents drive-by reviews." },
              { title:"AI Content Moderation",      icon:"🤖", color:"#f59e0b", desc:"All reviews are checked for personal attacks, doxxing, confidential company data, and self-identifying information before publishing." },
              { title:"No Identity in Review Text", icon:"⚠️",  color:"#1565C0", desc:"Reviewers are warned explicitly: do not include your name, role, team, manager name, or any detail that could identify you or others." },
              { title:"Aggregate Only for Company", icon:"📊", color:"#3D4EAC", desc:"The company portal shows only score averages and improvement themes — never individual review text, stage details, or any reviewer signal." },
            ].map((c) => (
              <div key={c.title} style={{ padding:"16px", background:`${c.color}06`, border:`1px solid ${c.color}15`, borderRadius:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:22 }}>{c.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:c.color }}>{c.title}</span>
                </div>
                <div style={{ fontSize:12, color:"#6B6B68", lineHeight:1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
