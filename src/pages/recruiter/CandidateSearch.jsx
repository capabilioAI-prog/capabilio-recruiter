import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { T, card, cardLg, tag, btn } from "./theme"




// ── Helpers ───────────────────────────────────────────────────────────────────
const eloLevel = (e) => {
  if (e >= 1200) return { label: "Expert",       color: T.amber  }
  if (e >= 1000) return { label: "Advanced",     color: T.indigo }
  if (e >= 900)  return { label: "Intermediate", color: T.blue   }
  return               { label: "Beginner",      color: T.ink4   }
}

const domainColor = (d = "") => {
  if (d.toLowerCase().includes("medical"))   return T.green
  if (d.toLowerCase().includes("software"))  return T.indigo
  if (d.toLowerCase().includes("data"))      return T.blue
  if (d.toLowerCase().includes("finance"))   return T.amber
  if (d.toLowerCase().includes("marketing")) return T.amber
  if (d.toLowerCase().includes("design"))    return "#c2185b"
  return T.indigo
}

// ── Mini Radar ────────────────────────────────────────────────────────────────
function MiniRadar({ skills = [] }) {
  const n = Math.min(skills.length, 6)
  if (!n) return null
  const cx = 28, cy = 28, r = 20
  const bg = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  })
  const fg = skills.slice(0, n).map((s, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2
    const v = ((s.value || 0) / 100) * r
    return `${cx + v * Math.cos(a)},${cy + v * Math.sin(a)}`
  })
  return (
    <svg width={56} height={56}>
      <polygon points={bg.join(" ")} fill="none" stroke={`${T.indigo}40`} strokeWidth="1" />
      <polygon points={fg.join(" ")} fill={`${T.indigo}22`} stroke={T.indigo} strokeWidth="1.5" />
    </svg>
  )
}

// ── DNA Match Modal ───────────────────────────────────────────────────────────
function DNAModal({ candidates, onClose }) {
  const navigate = useNavigate()
  const [jd, setJd]           = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError]     = useState("")

  const runMatch = async () => {
    if (!jd.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(
        "https://capabilio-backend-production-60ab.up.railway.app/api/recruiter/ai-match",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription: jd,
            candidates: candidates.slice(0, 40).map((c) => ({
              uid: c.uid,
              name: c.displayName,
              domain: c.keyword,
              eloRating: c.eloRating,
              jobReadiness: c.jobReadiness,
              strengths: c.strengths,
              skillGraph: c.skillGraph,
            })),
          }),
        }
      )
      const data = await res.json()
      setResults(data.matches || [])
    } catch {
      // Fallback local scoring if backend not ready
      const scored = candidates.slice(0, 20).map((c) => ({
        uid: c.uid,
        name: c.displayName,
        domain: c.keyword,
        eloRating: c.eloRating,
        matchPct: Math.min(99, Math.round((c.jobReadiness || 50) * 0.6 + ((c.eloRating || 800) - 800) / 20)),
        explanation: `${c.keyword} specialist with ELO ${c.eloRating} and ${c.jobReadiness || 0}% job readiness.`,
      })).sort((a, b) => b.matchPct - a.matchPct)
      setResults(scored)
      setError("Backend not connected — showing local scores instead.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.box} onClick={(e) => e.stopPropagation()}>
        <style>{`textarea::placeholder{color:${T.ink4}} textarea:focus{outline:none;border-color:${T.indigo}!important}`}</style>

        {/* Header */}
        <div style={M.head}>
          <div>
            <h3 style={M.title}>🧬 DNA Skill Fingerprint Match</h3>
            <p style={M.sub}>Paste a job description — AI ranks every candidate by match %</p>
          </div>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>

        <textarea
          style={M.textarea}
          placeholder="Paste full job description here... (role, requirements, skills needed, experience)"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={5}
        />

        {error && <div style={M.errorBox}>{error}</div>}

        <button
          onClick={runMatch}
          disabled={loading || !jd.trim()}
          style={{ ...M.runBtn, opacity: !jd.trim() ? 0.5 : 1 }}
        >
          {loading ? "🔄 Analyzing candidates with AI..." : "⚡ Run AI Match"}
        </button>

        {results.length > 0 && (
          <div style={M.results}>
            <div style={M.resultsTitle}>
              Top {Math.min(results.length, 10)} Matches
            </div>
            {results.slice(0, 10).map((r, i) => {
              const pctColor = r.matchPct >= 80 ? T.green : r.matchPct >= 60 ? T.amber : T.ink4
              return (
                <div key={r.uid || i} style={M.resultRow}>
                  <span style={M.rank}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={M.rName}>{r.name}</div>
                    <div style={M.rMeta}>{r.domain} · ELO {r.eloRating}</div>
                    <div style={M.rNote}>{r.explanation}</div>
                  </div>
                  <div style={{ ...M.pct, color: pctColor }}>{r.matchPct}%</div>
                  <button
                    onClick={() => { navigate(`/recruiter/candidate/${r.uid}`); onClose() }}
                    style={M.viewBtn}
                  >
                    View →
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const M = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 500,
    background: "rgba(26,26,24,0.55)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  box: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 20, padding: 28,
    width: "min(680px, 94vw)",
    maxHeight: "88vh", overflowY: "auto",
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: T.shadow2,
  },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 },
  sub:   { fontSize: 13, color: T.ink3, marginTop: 4 },
  closeBtn: {
    background: T.cream2, border: `1px solid ${T.border}`,
    color: T.ink3, width: 30, height: 30,
    borderRadius: 8, cursor: "pointer", fontSize: 14, flexShrink: 0,
  },
  textarea: {
    width: "100%", padding: "12px 14px",
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.ink, fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    resize: "vertical", marginBottom: 12,
  },
  errorBox: {
    padding: "8px 12px", marginBottom: 10,
    background: T.amber2,
    border: `1px solid ${T.amber}30`,
    borderRadius: 8, color: T.amber, fontSize: 12,
  },
  runBtn: {
    width: "100%", padding: "12px",
    background: T.indigo,
    border: "none", borderRadius: 12, color: "#1A1A18",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", marginBottom: 20,
    transition: "opacity 0.2s",
  },
  results:      { borderTop: `1px solid ${T.border}`, paddingTop: 16 },
  resultsTitle: { fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 12 },
  resultRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 0", borderBottom: `1px solid ${T.border}`,
  },
  rank:   { fontSize: 12, color: T.ink4, width: 28, flexShrink: 0 },
  rName:  { fontSize: 13, fontWeight: 600, color: T.ink },
  rMeta:  { fontSize: 11, color: T.ink3 },
  rNote:  { fontSize: 11, color: T.ink4, marginTop: 2 },
  pct:    { fontSize: 18, fontWeight: 800, fontFamily: "'Syne', sans-serif", flexShrink: 0, minWidth: 48, textAlign: "right" },
  viewBtn: {
    padding: "5px 12px",
    background: T.indigo3,
    border: `1px solid ${T.indigo}30`,
    borderRadius: 8, color: T.indigo,
    fontSize: 11, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
  },
}

// ── Candidate Card ────────────────────────────────────────────────────────────
function CandidateCard({ c, onShortlist, matchPct }) {
  const navigate = useNavigate()
  const lvl = eloLevel(c.eloRating || 800)
  const col = domainColor(c.keyword)
  const initials = (c.displayName || "?")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div
      style={CC.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)"
        e.currentTarget.style.borderColor = `${T.indigo}30`
        e.currentTarget.style.boxShadow = T.shadow2
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none"
        e.currentTarget.style.borderColor = T.border
        e.currentTarget.style.boxShadow = T.shadow
      }}
    >
      {/* Match badge */}
      {matchPct !== undefined && (
        <div style={{
          ...CC.matchBadge,
          color: matchPct >= 80 ? T.green : matchPct >= 60 ? T.amber : T.ink4,
          borderColor: matchPct >= 80 ? `${T.green}40` : matchPct >= 60 ? `${T.amber}40` : T.border,
          background: matchPct >= 80 ? T.green2 : matchPct >= 60 ? T.amber2 : T.cream2,
        }}>
          {matchPct}% match
        </div>
      )}

      {/* Top */}
      <div style={CC.top}>
        <div style={{ ...CC.avatar, background: `${col}18`, border: `1.5px solid ${col}44`, color: col }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={CC.name}>{c.displayName || "—"}</div>
          <div style={CC.handle}>@{c.username || "user"}</div>
        </div>
        <div style={{ ...CC.elo, color: lvl.color, borderColor: `${lvl.color}33`, background: `${lvl.color}11` }}>
          ⚡{c.eloRating || 800}
        </div>
      </div>

      {/* Domain */}
      <div style={CC.domainRow}>
        <span style={{ fontSize: 12, fontWeight: 600, color: col }}>◆ {c.keyword || "General"}</span>
        <span style={{ fontSize: 10, color: T.ink4 }}>{lvl.label}</span>
      </div>

      {/* Readiness */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: T.ink3 }}>Job Readiness</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.green }}>{c.jobReadiness || 0}%</span>
        </div>
        <div style={CC.progBg}>
          <div style={{ ...CC.progFill, width: `${c.jobReadiness || 0}%` }} />
        </div>
      </div>

      {/* Strengths */}
      {(c.strengths || []).length > 0 && (
        <div style={CC.tagsRow}>
          {(c.strengths || []).slice(0, 3).map((s, i) => (
            <span key={i} style={CC.tag}>{s}</span>
          ))}
        </div>
      )}

      {/* Arena + radar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.ink3 }}>Arena</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.indigo }}>{c.arenaCompleted || 0}✓</span>
          {(c.arenaStreak || 0) > 0 && (
            <span style={CC.streak}>🔥{c.arenaStreak}</span>
          )}
        </div>
        <MiniRadar skills={c.skillGraph || []} />
      </div>

      {/* Buttons */}
      <div style={CC.btnRow}>
        <button
          onClick={() => navigate(`/recruiter/candidate/${c.uid}`)}
          style={CC.viewBtn}
        >
          View Profile →
        </button>
        <button onClick={() => onShortlist(c)} style={CC.shortBtn}>+ Shortlist</button>
        <button style={CC.challengeBtn} title="Assign Challenge">⚔️</button>
      </div>
    </div>
  )
}

const CC = {
  card: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 16, padding: 16,
    display: "flex", flexDirection: "column", gap: 0,
    position: "relative", transition: "all 0.2s",
    boxShadow: "0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
  },
  matchBadge: {
    position: "absolute", top: 12, right: 12,
    fontSize: 11, fontWeight: 700,
    border: "1px solid", padding: "2px 8px", borderRadius: 20,
  },
  top: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  avatar: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15,
  },
  name: {
    fontSize: 14, fontWeight: 600, color: T.ink,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  handle: { fontSize: 11, color: T.ink4 },
  elo: {
    fontSize: 12, fontWeight: 700, border: "1px solid",
    borderRadius: 8, padding: "2px 8px", flexShrink: 0,
  },
  domainRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  progBg:   { height: 5, background: T.cream3, borderRadius: 3 },
  progFill: {
    height: "100%", borderRadius: 3,
    background: T.green,
    transition: "width 1s ease",
  },
  tagsRow: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 },
  tag: {
    fontSize: 10, color: T.indigo,
    background: T.indigo3,
    border: `1px solid ${T.indigo}25`,
    padding: "2px 7px", borderRadius: 20,
  },
  streak: {
    fontSize: 11, background: T.amber2,
    color: T.amber, padding: "1px 6px", borderRadius: 20,
  },
  btnRow: { display: "flex", gap: 5, marginTop: 12 },
  viewBtn: {
    flex: 1, padding: "7px 0",
    background: T.indigo3,
    border: `1px solid ${T.indigo}25`,
    borderRadius: 8, color: T.indigo,
    fontSize: 11, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  shortBtn: {
    padding: "7px 10px",
    background: T.green2,
    border: `1px solid ${T.green}25`,
    borderRadius: 8, color: T.green,
    fontSize: 11, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  challengeBtn: {
    padding: "7px 10px",
    background: T.amber2,
    border: `1px solid ${T.amber}25`,
    borderRadius: 8, color: T.amber,
    fontSize: 13, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CandidateSearch() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [dnaOpen, setDnaOpen]       = useState(false)
  const [shortlisted, setShortlisted] = useState(new Set())
  const [filters, setFilters] = useState({
    domain: "", eloMin: 800, eloMax: 1500,
    readinessMin: 0, path: "all",
    arenaMin: 0, streakMin: 0,
  })
  const [sortBy, setSortBy] = useState("elo")

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      setCandidates(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  const domains = useMemo(() => {
    const set = new Set(candidates.map((c) => c.keyword).filter(Boolean))
    return Array.from(set).sort()
  }, [candidates])

  const setF = (key, val) => setFilters((f) => ({ ...f, [key]: val }))

  const filtered = useMemo(() => {
    let out = candidates.filter((c) => {
      const elo = c.eloRating || 800
      if (elo < filters.eloMin || elo > filters.eloMax)         return false
      if ((c.jobReadiness || 0) < filters.readinessMin)         return false
      if (filters.domain && c.keyword !== filters.domain)       return false
      if (filters.path !== "all" && c.path !== filters.path)    return false
      if ((c.arenaCompleted || 0) < filters.arenaMin)           return false
      if ((c.arenaStreak || 0) < filters.streakMin)             return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (c.displayName || "").toLowerCase().includes(q) ||
          (c.keyword     || "").toLowerCase().includes(q) ||
          (c.strengths   || []).some((s) => s.toLowerCase().includes(q))
        )
      }
      return true
    })
    if (sortBy === "elo")       out.sort((a, b) => (b.eloRating    || 800) - (a.eloRating    || 800))
    if (sortBy === "readiness") out.sort((a, b) => (b.jobReadiness || 0)   - (a.jobReadiness || 0))
    if (sortBy === "arena")     out.sort((a, b) => (b.arenaCompleted || 0) - (a.arenaCompleted || 0))
    return out
  }, [candidates, filters, search, sortBy])

  const resetFilters = () =>
    setFilters({ domain: "", eloMin: 800, eloMax: 1500, readinessMin: 0, path: "all", arenaMin: 0, streakMin: 0 })

  return (
    <div style={P.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        input::placeholder  { color: ${T.ink4}; }
        input:focus, select:focus { outline: none; border-color: ${T.indigo} !important; }
        .cc-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* ── Top bar ── */}
      <div style={P.topBar}>
        <div>
          <h1 style={P.title}>Candidate Discovery</h1>
          <p style={P.sub}>
            {loading ? "Loading..." : `${filtered.length} candidates match your filters`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setDnaOpen(true)} style={P.dnaBtn}>
            🧬 DNA Match
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={P.sortSelect}
          >
            <option value="elo">Highest ELO</option>
            <option value="readiness">Best Job Readiness</option>
            <option value="arena">Most Arena Completed</option>
          </select>
        </div>
      </div>

      <div style={P.layout}>

        {/* ── Filters sidebar ── */}
        <aside style={P.sidebar}>

          {/* Search */}
          <div style={P.filterBlock}>
            <div style={P.filterLabel}>🔍 Search</div>
            <input
              style={P.filterInput}
              placeholder="Name, skill, domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Domain */}
          <div style={P.filterBlock}>
            <div style={P.filterLabel}>Domain</div>
            <select
              style={P.filterInput}
              value={filters.domain}
              onChange={(e) => setF("domain", e.target.value)}
            >
              <option value="">All Domains</option>
              {domains.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Path */}
          <div style={P.filterBlock}>
            <div style={P.filterLabel}>Path</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "student", "professional"].map((p) => (
                <button
                  key={p}
                  onClick={() => setF("path", p)}
                  style={{
                    ...P.pathBtn,
                    background:   filters.path === p ? T.indigo3             : "transparent",
                    color:        filters.path === p ? T.indigo              : T.ink3,
                    borderColor:  filters.path === p ? `${T.indigo}50`       : T.border,
                  }}
                >
                  {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ELO range */}
          <div style={P.filterBlock}>
            <div style={P.filterLabel}>
              ELO Range: {filters.eloMin} – {filters.eloMax}
            </div>
            <input
              type="range" min={800} max={1500}
              value={filters.eloMin}
              onChange={(e) => setF("eloMin", +e.target.value)}
              style={P.range}
            />
            <input
              type="range" min={800} max={1500}
              value={filters.eloMax}
              onChange={(e) => setF("eloMax", +e.target.value)}
              style={P.range}
            />
          </div>

          {/* Job readiness */}
          <div style={P.filterBlock}>
            <div style={P.filterLabel}>Min Job Readiness: {filters.readinessMin}%</div>
            <input
              type="range" min={0} max={100}
              value={filters.readinessMin}
              onChange={(e) => setF("readinessMin", +e.target.value)}
              style={P.range}
            />
          </div>

          {/* Arena min */}
          <div style={P.filterBlock}>
            <div style={P.filterLabel}>Min Arena Challenges: {filters.arenaMin}</div>
            <input
              type="range" min={0} max={50}
              value={filters.arenaMin}
              onChange={(e) => setF("arenaMin", +e.target.value)}
              style={P.range}
            />
          </div>

          {/* Streak min */}
          <div style={P.filterBlock}>
            <div style={P.filterLabel}>Min Streak: {filters.streakMin} days</div>
            <input
              type="range" min={0} max={30}
              value={filters.streakMin}
              onChange={(e) => setF("streakMin", +e.target.value)}
              style={P.range}
            />
          </div>

          <button onClick={resetFilters} style={P.resetBtn}>
            Reset All Filters
          </button>
        </aside>

        {/* ── Candidate grid ── */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={P.centerBox}>
              <div style={P.spinner} />
              <span style={{ color: T.ink3, fontSize: 13 }}>
                Fetching candidates from Firestore...
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={P.centerBox}>
              <div style={{ fontSize: 44 }}>🔍</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: T.ink }}>
                No candidates match
              </div>
              <div style={{ fontSize: 13, color: T.ink4 }}>
                Try broadening your filters
              </div>
              <button onClick={resetFilters} style={P.resetBtn}>
                Reset Filters
              </button>
            </div>
          ) : (
            <div style={P.grid}>
              {filtered.map((c) => (
                <CandidateCard
                  key={c.uid}
                  c={c}
                  onShortlist={(c) => setShortlisted((s) => new Set([...s, c.uid]))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {dnaOpen && (
        <DNAModal candidates={candidates} onClose={() => setDnaOpen(false)} />
      )}
    </div>
  )
}

const P = {
  root: { fontFamily: "'DM Sans', sans-serif", color: T.ink },
  topBar: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", marginBottom: 24,
  },
  title: {
    fontFamily: "'Syne', sans-serif", fontSize: 22,
    fontWeight: 800, color: T.ink, margin: 0,
  },
  sub: { fontSize: 13, color: T.ink3, marginTop: 4 },
  dnaBtn: {
    padding: "10px 18px",
    background: T.indigo,
    border: "none", borderRadius: 12, color: "#1A1A18",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: `0 4px 16px ${T.indigo}30`,
  },
  sortSelect: {
    padding: "10px 14px",
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.ink,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  },
  layout:  { display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 },
  sidebar: { display: "flex", flexDirection: "column", gap: 10 },
  filterBlock: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 14, padding: 14,
    boxShadow: "0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
  },
  filterLabel: {
    fontSize: 11, color: T.ink3, fontWeight: 600,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8,
  },
  filterInput: {
    width: "100%", padding: "8px 10px",
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.ink,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
  },
  pathBtn: {
    flex: 1, padding: "6px 0",
    border: "1px solid", borderRadius: 8,
    fontSize: 11, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
  },
  range: { width: "100%", marginTop: 6, accentColor: T.indigo },
  resetBtn: {
    padding: "10px 0", width: "100%",
    background: T.red2,
    border: `1px solid ${T.red}25`,
    borderRadius: 12, color: T.red,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    animation: "fadeUp 0.3s ease",
  },
  centerBox: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 12, minHeight: 300,
  },
  spinner: {
    width: 34, height: 34,
    border: `3px solid ${T.indigo3}`,
    borderTopColor: T.indigo, borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
}
