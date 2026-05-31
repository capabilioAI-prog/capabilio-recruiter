import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { T, tag, card, btn } from "./theme"

// ── Mock data ─────────────────────────────────────────────────────────────────
const SOURCES = ["Capabilio", "Company Website", "API/Webhook", "Referral", "LinkedIn Import"]
const STAGES  = ["New", "Screening", "Phone Screen", "Technical", "Final Round", "Offer", "Hired", "Rejected"]
const JOBS    = ["Senior Backend Engineer", "Product Manager", "Data Scientist", "UX Designer", "DevOps Lead"]

const MOCK_APPLICATIONS = Array.from({ length: 42 }, (_, i) => {
  const elo   = 780 + Math.floor(Math.random() * 480)
  const score = 55 + Math.floor(Math.random() * 45)
  const src   = SOURCES[i % SOURCES.length]
  const stage = STAGES[Math.floor(Math.random() * 5)]
  const daysAgo = Math.floor(Math.random() * 14)
  return {
    id: `app-${i + 1}`,
    name: [
      "Arjun Mehta","Priya Sharma","Ravi Nair","Deepika Rao","Kiran Patel",
      "Sneha Iyer","Amit Kumar","Neha Singh","Rahul Gupta","Pooja Verma",
      "Sanjay Mishra","Anjali Das","Vikas Tiwari","Meera Joshi","Suresh Reddy",
      "Divya Nambiar","Rohan Bose","Ananya Kapoor","Tarun Malhotra","Nisha Pillai",
    ][i % 20],
    role: JOBS[i % JOBS.length],
    source: src,
    stage,
    elo,
    score,
    verified: Math.random() > 0.4,
    duplicate: Math.random() > 0.85,
    appliedAt: new Date(Date.now() - daysAgo * 86400000),
    daysAgo,
    skills: ["Python","React","SQL","Node.js","AWS","TypeScript","Go","Kubernetes"].slice(0, 3 + (i % 3)),
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(["Arjun Mehta","Priya Sharma","Ravi Nair","Deepika Rao","Kiran Patel","Sneha Iyer","Amit Kumar","Neha Singh","Rahul Gupta","Pooja Verma","Sanjay Mishra","Anjali Das","Vikas Tiwari","Meera Joshi","Suresh Reddy","Divya Nambiar","Rohan Bose","Ananya Kapoor","Tarun Malhotra","Nisha Pillai"][i % 20])}&backgroundColor=3D4EAC&fontFamily=Arial`,
  }
})

// ── Source badge colors ───────────────────────────────────────────────────────
function sourceStyle(src) {
  if (src === "Capabilio")        return { color: T.indigo, bg: T.indigo3 }
  if (src === "Company Website")  return { color: T.green,  bg: T.green2  }
  if (src === "API/Webhook")      return { color: T.blue,   bg: T.blue2   }
  if (src === "Referral")         return { color: T.amber,  bg: T.amber2  }
  return                                 { color: T.ink3,   bg: T.cream3  }
}

// ── Stage pill ────────────────────────────────────────────────────────────────
function stageStyle(stage) {
  if (stage === "New")           return { color: T.indigo, bg: T.indigo3 }
  if (stage === "Screening")     return { color: T.blue,   bg: T.blue2   }
  if (stage === "Phone Screen")  return { color: T.blue,   bg: T.blue2   }
  if (stage === "Technical")     return { color: T.amber,  bg: T.amber2  }
  if (stage === "Final Round")   return { color: T.amber,  bg: T.amber2  }
  if (stage === "Offer")         return { color: T.green,  bg: T.green2  }
  if (stage === "Hired")         return { color: T.green,  bg: T.green2  }
  if (stage === "Rejected")      return { color: T.red,    bg: T.red2    }
  return                                { color: T.ink3,   bg: T.cream3  }
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 44 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 80 ? T.green : score >= 65 ? T.indigo : score >= 50 ? T.amber : T.red
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.cream3} strokeWidth={3} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{score}</text>
    </svg>
  )
}

// ── Application row ───────────────────────────────────────────────────────────
function AppRow({ app, selected, onSelect, onView }) {
  const src  = sourceStyle(app.source)
  const stg  = stageStyle(app.stage)
  const days = app.daysAgo === 0 ? "Today" : app.daysAgo === 1 ? "Yesterday" : `${app.daysAgo}d ago`

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      background: selected ? T.indigo3 : "transparent",
      borderBottom: `1px solid ${T.border}`,
      cursor: "pointer",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = T.cream2 }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent" }}
    >
      {/* Checkbox */}
      <input type="checkbox" checked={selected} onChange={() => onSelect(app.id)}
        style={{ accentColor: T.indigo, width: 15, height: 15, flexShrink: 0 }}
        onClick={e => e.stopPropagation()} />

      {/* Score ring */}
      <div onClick={() => onView(app)} style={{ flexShrink: 0 }}>
        <ScoreRing score={app.score} />
      </div>

      {/* Name + role */}
      <div onClick={() => onView(app)} style={{ flex: "0 0 200px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {app.name}
          </span>
          {app.duplicate && (
            <span style={{ fontSize: 9, fontWeight: 700, background: T.amber2, color: T.amber, border: `1px solid ${T.amber}22`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
              DUPE
            </span>
          )}
          {app.verified && (
            <span style={{ fontSize: 11, color: T.green, flexShrink: 0 }} title="Verified">✓</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: T.ink3, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {app.role}
        </div>
      </div>

      {/* Source */}
      <div onClick={() => onView(app)} style={{ flex: "0 0 140px" }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
          background: src.bg, color: src.color, border: `1px solid ${src.color}22`,
          whiteSpace: "nowrap",
        }}>
          {app.source}
        </span>
      </div>

      {/* Stage */}
      <div onClick={() => onView(app)} style={{ flex: "0 0 120px" }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
          background: stg.bg, color: stg.color, border: `1px solid ${stg.color}22`,
          whiteSpace: "nowrap",
        }}>
          {app.stage}
        </span>
      </div>

      {/* ELO */}
      <div onClick={() => onView(app)} style={{ flex: "0 0 70px", textAlign: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: app.elo >= 1000 ? T.amber : app.elo >= 900 ? T.indigo : T.ink3 }}>
          {app.elo}
        </span>
        <div style={{ fontSize: 10, color: T.ink4 }}>ELO</div>
      </div>

      {/* Skills */}
      <div onClick={() => onView(app)} style={{ flex: 1, display: "flex", gap: 4, flexWrap: "wrap", overflow: "hidden", maxHeight: 24 }}>
        {app.skills.slice(0, 3).map(s => (
          <span key={s} style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 4,
            background: T.cream3, color: T.ink2, border: `1px solid ${T.border}`,
            whiteSpace: "nowrap",
          }}>{s}</span>
        ))}
      </div>

      {/* Time */}
      <div onClick={() => onView(app)} style={{ flex: "0 0 70px", textAlign: "right", fontSize: 11, color: T.ink4 }}>
        {days}
      </div>
    </div>
  )
}

// ── Application detail panel ──────────────────────────────────────────────────
function DetailPanel({ app, onClose }) {
  const navigate = useNavigate()
  const src = sourceStyle(app.source)
  const stg = stageStyle(app.stage)

  return (
    <div style={{
      width: 340, flexShrink: 0,
      background: T.cream, borderLeft: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{app.name}</div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{app.role}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.ink3, padding: 2 }}>✕</button>
      </div>

      {/* Scores */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 16, alignItems: "center" }}>
        <ScoreRing score={app.score} size={64} />
        <div>
          <div style={{ fontSize: 11, color: T.ink3 }}>Match Score</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: app.score >= 80 ? T.green : app.score >= 65 ? T.indigo : T.amber }}>{app.score}%</div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>ELO: <b style={{ color: T.ink }}>{app.elo}</b></div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {app.verified && (
            <span style={{ fontSize: 11, fontWeight: 600, color: T.green, background: T.green2, border: `1px solid ${T.green}22`, borderRadius: 5, padding: "3px 8px" }}>✓ Verified</span>
          )}
          {app.duplicate && (
            <span style={{ fontSize: 11, fontWeight: 600, color: T.amber, background: T.amber2, border: `1px solid ${T.amber}22`, borderRadius: 5, padding: "3px 8px" }}>⚠ Duplicate</span>
          )}
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: "16px 20px", flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.05em", marginBottom: 8 }}>SOURCE & STAGE</div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: src.bg, color: src.color, border: `1px solid ${src.color}22` }}>{app.source}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: stg.bg, color: stg.color, border: `1px solid ${stg.color}22` }}>{app.stage}</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.05em", marginBottom: 8 }}>SKILLS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {app.skills.map(s => (
              <span key={s} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: T.indigo3, color: T.indigo, border: `1px solid ${T.indigo}22` }}>{s}</span>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.05em", marginBottom: 8 }}>APPLIED</div>
          <div style={{ fontSize: 13, color: T.ink2 }}>{app.appliedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => navigate(`/recruiter/candidate/${app.id}`)}
          style={{ ...btn.primary, width: "100%", textAlign: "center" }}
        >
          View Full Profile
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button style={{ ...btn.indigo, textAlign: "center", fontSize: 12 }}>Move Stage ↓</button>
          <button style={{ ...btn.outline, textAlign: "center", fontSize: 12, color: T.red, borderColor: `${T.red}44` }}>Reject</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Applications() {
  const [search,      setSearch]      = useState("")
  const [stageFilter, setStageFilter] = useState("All")
  const [srcFilter,   setSrcFilter]   = useState("All")
  const [sortBy,      setSortBy]      = useState("score")
  const [selected,    setSelected]    = useState(new Set())
  const [activeApp,   setActiveApp]   = useState(null)
  const [showDupes,   setShowDupes]   = useState(false)

  // Filter + sort
  const apps = useMemo(() => {
    let list = MOCK_APPLICATIONS
    if (search)                   list = list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase()))
    if (stageFilter !== "All")    list = list.filter(a => a.stage === stageFilter)
    if (srcFilter   !== "All")    list = list.filter(a => a.source === srcFilter)
    if (showDupes)                list = list.filter(a => a.duplicate)
    if (sortBy === "score")       list = [...list].sort((a, b) => b.score - a.score)
    else if (sortBy === "elo")    list = [...list].sort((a, b) => b.elo - a.elo)
    else if (sortBy === "recent") list = [...list].sort((a, b) => a.daysAgo - b.daysAgo)
    return list
  }, [search, stageFilter, srcFilter, sortBy, showDupes])

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const selectAll = () => setSelected(selected.size === apps.length ? new Set() : new Set(apps.map(a => a.id)))

  // Stats
  const totalNew   = MOCK_APPLICATIONS.filter(a => a.stage === "New").length
  const totalDupes = MOCK_APPLICATIONS.filter(a => a.duplicate).length
  const avgScore   = Math.round(MOCK_APPLICATIONS.reduce((s, a) => s + a.score, 0) / MOCK_APPLICATIONS.length)
  const srcCounts  = SOURCES.reduce((acc, s) => ({ ...acc, [s]: MOCK_APPLICATIONS.filter(a => a.source === s).length }), {})

  const statCard = (label, value, sub, color = T.ink) => (
    <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px", flex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.ink2, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.cream2, overflow: "hidden" }}>

      {/* Page header */}
      <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>Applications</h1>
            <p style={{ fontSize: 13, color: T.ink3, margin: "4px 0 0" }}>All applications in one place — regardless of source</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn.outline, fontSize: 12 }}>↓ Import CSV</button>
            <button style={{ ...btn.primary, fontSize: 12 }}>+ Add Applicant</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {statCard("Total Applications", MOCK_APPLICATIONS.length, "across all sources")}
          {statCard("New / Unreviewed",   totalNew,  "pending review", T.indigo)}
          {statCard("Avg Match Score",    `${avgScore}%`, "AI-ranked by ELO+skills", T.green)}
          {statCard("Duplicates Detected", totalDupes, "cross-source dedup", T.amber)}
          <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px", flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.04em", marginBottom: 8 }}>BY SOURCE</div>
            {SOURCES.map(s => {
              const c = srcCounts[s] || 0
              const pct = Math.round((c / MOCK_APPLICATIONS.length) * 100)
              const ss = sourceStyle(s)
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: ss.color, fontWeight: 700, width: 110 }}>{s}</span>
                  <div style={{ flex: 1, height: 4, background: T.cream3, borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: ss.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 10, color: T.ink3, width: 20, textAlign: "right" }}>{c}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 0 }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.ink4, fontSize: 14 }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or role…"
              style={{
                width: "100%", padding: "8px 12px 8px 32px", fontSize: 13,
                background: T.cream, border: `1.5px solid ${T.border}`, borderRadius: 8,
                color: T.ink, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Stage filter */}
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={selectSty}>
            <option value="All">All Stages</option>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* Source filter */}
          <select value={srcFilter} onChange={e => setSrcFilter(e.target.value)} style={selectSty}>
            <option value="All">All Sources</option>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectSty}>
            <option value="score">Sort: Match Score</option>
            <option value="elo">Sort: ELO</option>
            <option value="recent">Sort: Most Recent</option>
          </select>

          {/* Dupe toggle */}
          <button
            onClick={() => setShowDupes(d => !d)}
            style={{
              fontSize: 12, fontWeight: 600, padding: "8px 12px", borderRadius: 8, cursor: "pointer",
              background: showDupes ? T.amber2 : "transparent",
              color: showDupes ? T.amber : T.ink3,
              border: `1.5px solid ${showDupes ? T.amber : T.border}`,
            }}
          >
            ⚠ Dupes ({totalDupes})
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          margin: "8px 24px 0", padding: "10px 16px",
          background: T.indigo3, border: `1px solid ${T.indigo}22`, borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.indigo }}>{selected.size} selected</span>
          <div style={{ width: 1, height: 16, background: `${T.indigo}44` }} />
          {["Move to Screening", "Schedule Interview", "Send Assessment", "Reject"].map((action, i) => (
            <button key={action} style={{
              fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer",
              background: i === 3 ? T.red2 : T.cream,
              color: i === 3 ? T.red : T.ink2,
              border: `1px solid ${i === 3 ? T.red + "44" : T.border}`,
            }}>
              {action}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: T.ink3, fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Table area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", margin: "10px 0 0" }}>
        {/* Table */}
        <div style={{ flex: 1, overflow: "auto", background: T.cream, borderTop: `1px solid ${T.border}` }}>
          {/* Column headers */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "8px 16px",
            background: T.cream2, borderBottom: `1px solid ${T.border}`,
            position: "sticky", top: 0, zIndex: 1,
          }}>
            <input type="checkbox"
              checked={selected.size === apps.length && apps.length > 0}
              onChange={selectAll}
              style={{ accentColor: T.indigo, width: 15, height: 15, flexShrink: 0 }}
            />
            <div style={{ width: 44, flexShrink: 0 }} />
            <div style={{ flex: "0 0 200px", fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.04em" }}>CANDIDATE</div>
            <div style={{ flex: "0 0 140px", fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.04em" }}>SOURCE</div>
            <div style={{ flex: "0 0 120px", fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.04em" }}>STAGE</div>
            <div style={{ flex: "0 0 70px", fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.04em", textAlign: "center" }}>ELO</div>
            <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.04em" }}>SKILLS</div>
            <div style={{ flex: "0 0 70px", fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.04em", textAlign: "right" }}>APPLIED</div>
          </div>

          {/* Rows */}
          {apps.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: T.ink3 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>No applications match your filters</div>
            </div>
          ) : (
            apps.map(app => (
              <AppRow
                key={app.id}
                app={app}
                selected={selected.has(app.id)}
                onSelect={toggleSelect}
                onView={setActiveApp}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        {activeApp && (
          <DetailPanel app={activeApp} onClose={() => setActiveApp(null)} />
        )}
      </div>

      {/* Footer count */}
      <div style={{
        padding: "8px 24px", background: T.cream, borderTop: `1px solid ${T.border}`,
        fontSize: 12, color: T.ink3, flexShrink: 0,
        display: "flex", justifyContent: "space-between",
      }}>
        <span>Showing <b style={{ color: T.ink }}>{apps.length}</b> of <b style={{ color: T.ink }}>{MOCK_APPLICATIONS.length}</b> applications</span>
        <span style={{ color: T.ink4 }}>Smart-ranked by ELO · skill match · verification · recency</span>
      </div>
    </div>
  )
}

const selectSty = {
  fontSize: 12, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
  background: T.cream, border: `1.5px solid ${T.border}`, color: T.ink2, outline: "none",
}
