import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { T, card } from "./theme"

// 2026-08-09: this page used to be 100% fabricated -- EMPLOYEES/CIRCULARS/
// MOBILITY_OPPS were hardcoded arrays, and every action button (Message,
// +New Circular, Resend, Initiate Move) had no onClick at all. This page
// covers 5 distinct subsystems (onboarding tracking, circular broadcast,
// mobility matching, skill-upgrade workflow, performance analytics) --
// only one of them (the employee roster + basic performance analytics)
// has a real data source today, via the new company_employees table
// (same table Internal Mobility uses -- not a duplicate). The other four
// are honestly flagged as not built rather than faked, per the no-fake-
// data principle applied across this pass (Settings 2FA/Integrations/
// Billing, Talent Pool segments, etc). Mobility matching specifically
// already has a real, non-duplicated implementation on the Internal
// Mobility page -- this tab links there instead of re-implementing it.
const TABS = [
  { id: "roster",      label: "👥 Roster" },
  { id: "onboarding",  label: "🎉 Onboarding" },
  { id: "circulars",   label: "📢 Circulars & Comms" },
  { id: "mobility",    label: "🔀 Internal Mobility" },
  { id: "upskilling",  label: "📚 Skill Upgrades" },
  { id: "performance", label: "📊 Performance" },
]

function NotBuiltYet({ icon, title, body }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.ink3, maxWidth: 440, margin: "0 auto", lineHeight: 1.6 }}>{body}</div>
    </div>
  )
}

export default function EmployeeNetwork() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("roster")
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError("")
      const { data, error: fetchErr } = await supabase.from("company_employees").select("*").order("created_at", { ascending: false })
      if (fetchErr) setError(fetchErr.message || "Could not load employees.")
      setEmployees(data || [])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    if (!search) return employees
    return employees.filter((e) => (e.name || "").toLowerCase().includes(search.toLowerCase()))
  }, [employees, search])

  const inMobilityProcess = employees.filter((e) => e.mobility_stage).length
  const openToMove = employees.filter((e) => e.open_to_mobility).length

  const deptCounts = useMemo(() => {
    const counts = {}
    employees.forEach((e) => {
      const d = e.department || "Unassigned"
      counts[d] = (counts[d] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [employees])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero */}
      <div style={{ background: T.green2, border: `1px solid ${T.green}20`, borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 6 }}>🏢 Employee Network · Post-Hire Operating Layer</div>
        <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6 }}>
          Your employee roster, shared with Internal Mobility. Onboarding tracking, circular broadcasts, and skill-upgrade workflows aren't built yet — they're flagged honestly below rather than shown with placeholder data.
        </div>
      </div>

      {error && (
        <div style={{ background: T.red2, border: `1px solid ${T.red}30`, borderRadius: 12, padding: "12px 16px", fontSize: 12, color: T.red, fontWeight: 600 }}>⚠ {error}</div>
      )}

      {/* Summary tiles — real counts only */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Total Employees",    value: employees.length, icon: "👥", color: T.indigo },
          { label: "Open to a Move",     value: openToMove,       icon: "🔀", color: T.indigo2 },
          { label: "In Mobility Process",value: inMobilityProcess,icon: "📈", color: T.green },
          { label: "Departments",        value: deptCounts.length,icon: "🏢", color: T.amber },
        ].map((s) => (
          <div key={s.label} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: T.shadow }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: T.ink }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: 11, color: T.ink4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ fontSize: 12, padding: "8px 16px", borderRadius: 10, border: "1px solid", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 600, transition: "all 0.15s", background: tab === t.id ? T.indigo3 : "transparent", borderColor: tab === t.id ? `${T.indigo}40` : T.border, color: tab === t.id ? T.indigo : T.ink4 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ROSTER ── */}
      {tab === "roster" && (
        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…"
              style={{ flex: 1, maxWidth: 280, padding: "8px 12px", fontSize: 12, background: T.cream2, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, outline: "none" }} />
            <button onClick={() => navigate("/recruiter/internal-mobility")} style={{ fontSize: 12, padding: "8px 16px", background: T.ink, border: "none", borderRadius: 9, color: T.cream, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>
              + Add Employee
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.ink4 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 24px", color: T.ink3 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{employees.length === 0 ? "No employees added yet" : "No matches"}</div>
              {employees.length === 0 && <div style={{ fontSize: 12, marginTop: 4 }}>Add your first employee from Internal Mobility — the roster is shared across both pages.</div>}
            </div>
          ) : (
            filtered.map((emp) => (
              <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: T.indigo3, color: T.indigo, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                  {(emp.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{emp.name}</div>
                  <div style={{ fontSize: 11, color: T.ink4 }}>{emp.job_title || "—"} · {emp.department || "Unassigned"}{emp.tenure_years != null ? ` · ${emp.tenure_years}yr` : ""}</div>
                </div>
                {emp.open_to_mobility && <span style={{ fontSize: 10, fontWeight: 700, background: T.green2, color: T.green, borderRadius: 5, padding: "2px 7px" }}>OPEN TO MOVE</span>}
                {emp.mobility_stage && <span style={{ fontSize: 10, fontWeight: 600, background: T.indigo3, color: T.indigo, borderRadius: 5, padding: "2px 7px" }}>{emp.mobility_stage}</span>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ONBOARDING (not built) ── */}
      {tab === "onboarding" && (
        <NotBuiltYet icon="🎉" title="Onboarding tracking isn't built yet"
          body="There's no real task-checklist or day-count tracking behind this yet. When it's built, it'll use actual hire dates and a persisted task list — not placeholder progress bars." />
      )}

      {/* ── CIRCULARS (not built) ── */}
      {tab === "circulars" && (
        <NotBuiltYet icon="📢" title="Circulars & broadcast messaging isn't built yet"
          body="Company-wide announcements with real read-receipts aren't wired up. For 1:1 messaging with candidates and hires today, use Communication in the sidebar." />
      )}

      {/* ── MOBILITY (links to the real page instead of duplicating it) ── */}
      {tab === "mobility" && (
        <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔀</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Internal Mobility has its own page</div>
          <div style={{ fontSize: 13, color: T.ink3, maxWidth: 440, margin: "0 auto 16px", lineHeight: 1.6 }}>
            Role matching, mobility pipeline stages, and department-level insights all live there, backed by this same employee roster — {inMobilityProcess} employee{inMobilityProcess !== 1 ? "s" : ""} currently in process, {openToMove} open to a move.
          </div>
          <button onClick={() => navigate("/recruiter/internal-mobility")} style={{ fontSize: 13, padding: "9px 20px", background: T.indigo, border: "none", borderRadius: 10, color: "#1A1A18", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            Open Internal Mobility →
          </button>
        </div>
      )}

      {/* ── UPSKILLING (not built) ── */}
      {tab === "upskilling" && (
        <NotBuiltYet icon="📚" title="Skill-upgrade request workflow isn't built yet"
          body="Sending a structured improvement plan to an employee's Capabilio portal — with resources, deadlines, and mentor assignment — isn't wired up yet. This will use real skill-gap data once it ships, not simulated resources." />
      )}

      {/* ── PERFORMANCE (real, computed from the roster) ── */}
      {tab === "performance" && (
        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, margin: "0 0 4px" }}>📊 Roster Composition</h2>
          <div style={{ fontSize: 12, color: T.ink4, marginBottom: 16 }}>Computed from real employee records. Skill-ELO / growth-score performance analytics aren't built yet — there's no verified skill signal for hired employees to base that on.</div>
          {employees.length === 0 ? (
            <div style={{ fontSize: 12, color: T.ink4 }}>Add employees to see this breakdown.</div>
          ) : (
            deptCounts.map(([dept, count]) => {
              const pct = Math.round((count / employees.length) * 100)
              return (
                <div key={dept} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.ink2 }}>{dept}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 7, background: T.cream3, borderRadius: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: T.indigo, borderRadius: 4 }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
