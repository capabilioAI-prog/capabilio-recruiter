import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, domainColor } from "./theme"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

// Real verification data only. Capabilio currently verifies two things
// server-side, both surfaced through the partner bridge on each candidate:
//   - uan_verified       -> employment history, checked against EPFO records
//   - education_verified -> degree/institution checked against college records
// Identity, certifications, and cross-document consistency checks are not
// implemented anywhere in the product yet -- rather than inventing a status
// for them, this page says so plainly and links out to where that work is
// tracked, instead of faking green checkmarks off an ELO number.

const REAL_CHECKS = [
  { key: "uan_verified",       label: "Employment (EPFO)", icon: "🏢", desc: "Cross-checked against EPFO employment records" },
  { key: "education_verified", label: "Education",         icon: "🎓", desc: "Cross-checked against institution/degree records" },
]

function TrustRing({ score, size = 56 }) {
  const color = score >= 80 ? T.green : score >= 40 ? T.amber : T.red
  const r = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.cream3} strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="13" fontWeight="800" fill={T.ink} fontFamily="Inter">{score}</text>
    </svg>
  )
}

function CandidateVerifRow({ c }) {
  const navigate = useNavigate()
  const col = domainColor(c.domain)
  const initials = (c.display_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const verifiedCount = REAL_CHECKS.filter((chk) => c[chk.key]).length
  const trustScore = Math.round((verifiedCount / REAL_CHECKS.length) * 100)

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${col}18`, border: `1.5px solid ${col}44`, color: col, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{c.display_name || "—"}</span>
          {verifiedCount === REAL_CHECKS.length && <span style={{ fontSize: 10, background: T.green2, color: T.green, border: `1px solid ${T.green}30`, borderRadius: 5, padding: "1px 6px" }}>✓ Fully Verified</span>}
        </div>
        <div style={{ fontSize: 11, color: T.ink4, marginTop: 1 }}>{c.domain || "General"}</div>
      </div>

      <div style={{ display: "flex", gap: 14, flex: 2 }}>
        {REAL_CHECKS.map((chk) => (
          <div key={chk.key} title={`${chk.label}: ${c[chk.key] ? "Verified" : "Not verified"}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 16 }}>{c[chk.key] ? "✅" : "○"}</span>
            <span style={{ fontSize: 9, color: c[chk.key] ? T.green : T.ink4 }}>{chk.label}</span>
          </div>
        ))}
      </div>

      <TrustRing score={trustScore} />

      <button onClick={() => navigate(`/recruiter/search`)}
        style={{ fontSize: 12, padding: "6px 12px", background: T.indigo3, border: `1px solid ${T.indigo}30`, borderRadius: 8, color: T.indigo, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
        View Profile →
      </button>
    </div>
  )
}

export default function VerificationCockpit() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [bridgeError, setBridgeError] = useState(null)
  const [filter, setFilter] = useState("all")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setBridgeError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/partner/candidates?limit=100`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setCandidates(body.candidates || [])
    } catch (err) {
      console.error("Failed to load candidates for verification:", err)
      setBridgeError(err.message)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const countVerified = (c) => REAL_CHECKS.filter((chk) => c[chk.key]).length

  const filtered = candidates.filter((c) => {
    if (filter === "all")      return true
    if (filter === "verified") return countVerified(c) === REAL_CHECKS.length
    if (filter === "partial")  return countVerified(c) > 0 && countVerified(c) < REAL_CHECKS.length
    if (filter === "none")     return countVerified(c) === 0
    return true
  })

  const totals = {
    verified: candidates.filter((c) => countVerified(c) === REAL_CHECKS.length).length,
    partial:  candidates.filter((c) => countVerified(c) > 0 && countVerified(c) < REAL_CHECKS.length).length,
    none:     candidates.filter((c) => countVerified(c) === 0).length,
  }

  const FILTERS = [
    { key: "all",      label: `All (${candidates.length})` },
    { key: "verified", label: `✅ Fully Verified (${totals.verified})` },
    { key: "partial",  label: `⏳ Partially Verified (${totals.partial})` },
    { key: "none",     label: `○ Not Verified (${totals.none})` },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { label: "Employment Verified", value: candidates.filter((c) => c.uan_verified).length,       icon: "🏢", color: T.green, sub: "Matched against EPFO records" },
          { label: "Education Verified",  value: candidates.filter((c) => c.education_verified).length, icon: "🎓", color: T.blue,  sub: "Matched against institution records" },
          { label: "Fully Verified",      value: totals.verified,                                        icon: "✅", color: T.indigo, sub: "Both checks passed" },
        ].map((s) => (
          <div key={s.label} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: T.shadow }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: T.ink }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: T.ink4 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
        <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, margin: "0 0 16px" }}>🛡️ What we actually check</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
          {REAL_CHECKS.map((l) => (
            <div key={l.key} style={{ padding: "14px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{l.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{l.label}</div>
              <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.5 }}>{l.desc}</div>
            </div>
          ))}
          <div style={{ padding: "14px", background: T.cream2, border: `1px dashed ${T.border}`, borderRadius: 12, gridColumn: "span 2" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 4 }}>Identity, certifications, and cross-document consistency checks are not built yet</div>
            <div style={{ fontSize: 11, color: T.ink4, lineHeight: 1.5 }}>We're not going to show fake green checkmarks for these. When these checks ship, they'll appear here automatically.</div>
          </div>
        </div>
      </div>

      <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
        <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, margin: "0 0 16px" }}>🔎 Candidate Verification Status</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 600, transition: "all 0.15s",
                background:  filter === f.key ? T.indigo3 : T.cream2,
                borderColor: filter === f.key ? T.indigo   : T.border,
                color:       filter === f.key ? T.indigo   : T.ink4,
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.ink4, fontSize: 13 }}>Loading candidates...</div>
        ) : bridgeError ? (
          <div style={{ color: T.red, fontSize: 13, textAlign: "center", padding: "40px 20px", background: T.red2, border: `1px solid ${T.red}30`, borderRadius: 12 }}>
            Couldn't reach the candidate network: {bridgeError}. This page requires the partner bridge to capabilio-web to be configured and deployed.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.ink3, fontSize: 14 }}>No candidates in this category.</div>
        ) : filtered.map((c) => (
          <CandidateVerifRow key={c.id} c={c} />
        ))}
      </div>
    </div>
  )
}
