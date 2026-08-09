import { useState, useEffect, useMemo } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T, card, btn } from "./theme"

// 2026-08-09: this entire page used to be 100% fabricated -- EMPLOYEES was
// Array.from({length:24}, ...) with Math.random() ELO/readiness/interest/
// matchedRoles, OPEN_ROLES was a literal array, and every action button
// (Nominate, Initiate Move, + Post Internal Role) had no onClick at all.
// Now: employees come from the real company_employees table (new this
// pass -- no HRIS integration exists, so rows are added manually here);
// open internal roles reuse the real jobs table via a new is_internal
// flag (never a duplicate roles table). "Skill match %" and fabricated
// per-employee matchedRoles arrays are gone -- replaced with a plain,
// honest "open to a move" + department-relevance signal, not a fake ML
// score. Mobility "pipeline" stage and "open to mobility" are real,
// persisted columns a recruiter sets directly (no employee-facing app
// exists yet to let someone self-report this).
const DEPARTMENTS = ["Engineering", "Product", "Design", "Data", "Marketing", "Sales", "Finance", "HR", "Operations", "Healthcare"]
const STAGES = [
  { id: "exploring",    label: "Exploring" },
  { id: "applied",      label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "transitioned", label: "Transitioned" },
]

function readinessStyle(stage) {
  if (stage === "transitioned")  return { color: T.green,  bg: T.green2 }
  if (stage === "interviewing")  return { color: T.indigo, bg: T.indigo3 }
  if (stage === "applied")       return { color: T.amber,  bg: T.amber2 }
  if (stage === "exploring")     return { color: T.blue,   bg: T.blue2 }
  return { color: T.ink4, bg: T.cream3 }
}

// ── Add Employee modal ──────────────────────────────────────────────────────
function AddEmployeeModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: "", email: "", department: DEPARTMENTS[0], job_title: "", level: "", tenure_years: "", skills: "", open_to_mobility: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const iStyle = { width: "100%", padding: "9px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 9, color: T.ink, fontSize: 13, fontFamily: "'Inter',sans-serif" }

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required."); return }
    setSaving(true)
    setError("")
    try {
      const { error: insertErr } = await supabase.from("company_employees").insert({
        name: form.name.trim(),
        email: form.email.trim() || null,
        department: form.department || null,
        job_title: form.job_title.trim() || null,
        level: form.level.trim() || null,
        tenure_years: form.tenure_years ? Number(form.tenure_years) : null,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        open_to_mobility: form.open_to_mobility,
      })
      if (insertErr) throw insertErr
      onAdded()
    } catch (err) {
      setError(err.message || "Could not save employee.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(26,26,24,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, boxShadow: T.shadow2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700, color: T.ink }}>+ Add Employee</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.ink4, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={iStyle} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={iStyle} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={iStyle}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <input placeholder="Level (e.g. L4)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} style={iStyle} />
          </div>
          <input placeholder="Current job title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} style={iStyle} />
          <input placeholder="Tenure (years)" type="number" step="0.5" value={form.tenure_years} onChange={(e) => setForm({ ...form, tenure_years: e.target.value })} style={iStyle} />
          <input placeholder="Skills (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} style={iStyle} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.ink3 }}>
            <input type="checkbox" checked={form.open_to_mobility} onChange={(e) => setForm({ ...form, open_to_mobility: e.target.checked })} />
            Already known to be open to an internal move
          </label>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: T.red }}>{error}</div>}
        <button onClick={save} disabled={saving} style={{ marginTop: 16, width: "100%", padding: "11px", background: T.indigo, border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
          {saving ? "Saving…" : "Add Employee"}
        </button>
      </div>
    </div>
  )
}

// ── Post Internal Role modal (reuses the real jobs table, is_internal=true) ──
function PostInternalRoleModal({ onClose, onPosted }) {
  const [form, setForm] = useState({ title: "", domain: DEPARTMENTS[0], level: "", skills: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const iStyle = { width: "100%", padding: "9px 12px", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 9, color: T.ink, fontSize: 13, fontFamily: "'Inter',sans-serif" }

  const save = async () => {
    if (!form.title.trim()) { setError("Title is required."); return }
    setSaving(true)
    setError("")
    try {
      const { error: insertErr } = await supabase.from("jobs").insert({
        title: form.title.trim(),
        domain: form.domain,
        type: "Full-time",
        experience: form.level.trim() || "Mid",
        skills: form.skills,
        status: "Open",
        applicant_count: 0,
        is_internal: true,
      })
      if (insertErr) throw insertErr
      onPosted()
    } catch (err) {
      setError(err.message || "Could not post role.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(26,26,24,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, boxShadow: T.shadow2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700, color: T.ink }}>+ Post Internal Role</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.ink4, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input placeholder="Role title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={iStyle} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} style={iStyle}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <input placeholder="Level (e.g. L5)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} style={iStyle} />
          </div>
          <input placeholder="Skills (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} style={iStyle} />
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: T.ink4 }}>This posts to your real jobs list, marked internal-only. It will also appear in Job Board.</div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: T.red }}>{error}</div>}
        <button onClick={save} disabled={saving} style={{ marginTop: 16, width: "100%", padding: "11px", background: T.indigo, border: "none", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
          {saving ? "Posting…" : "Post Role"}
        </button>
      </div>
    </div>
  )
}

// ── Role card ─────────────────────────────────────────────────────────────────
function RoleCard({ role, openCount, onSelect, active }) {
  return (
    <div
      onClick={() => onSelect(role)}
      style={{
        ...card, padding: "16px", cursor: "pointer",
        border: `1.5px solid ${active ? T.indigo : T.border}`,
        background: active ? T.indigo3 : T.cream,
        transition: "all 0.15s",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{role.title}</div>
      <div style={{ fontSize: 12, color: T.ink3, marginBottom: 10 }}>{role.domain} · {role.experience}</div>
      {role.skills && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
          {String(role.skills).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5).map((s) => (
            <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: T.cream3, color: T.ink2, border: `1px solid ${T.border}` }}>{s}</span>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, color: openCount > 0 ? T.indigo : T.ink4, fontWeight: 600 }}>
        {openCount} employee{openCount !== 1 ? "s" : ""} open to a move in this department
      </div>
    </div>
  )
}

// ── Employee card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onSetStage, onToggleOpen }) {
  const rs = readinessStyle(emp.mobility_stage)
  return (
    <div style={{ ...card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.indigo3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.indigo, flexShrink: 0 }}>
        {(emp.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{emp.name}</span>
          {emp.open_to_mobility && <span style={{ fontSize: 9, fontWeight: 700, background: T.green2, color: T.green, borderRadius: 4, padding: "1px 5px" }}>OPEN TO MOVE</span>}
        </div>
        <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>{emp.job_title || "—"} · {emp.department || "—"}</div>
        <div style={{ fontSize: 11, color: T.ink3 }}>{emp.tenure_years != null ? `${emp.tenure_years}yr tenure` : "Tenure not set"}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <select
          value={emp.mobility_stage || ""}
          onChange={(e) => onSetStage(emp, e.target.value || null)}
          style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: rs.bg, color: rs.color, border: `1px solid ${rs.color}33`, cursor: "pointer" }}
        >
          <option value="">Not in process</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={() => onToggleOpen(emp)} style={{ ...btn.indigo, fontSize: 11, padding: "4px 10px" }}>
          {emp.open_to_mobility ? "Mark not open" : "Mark open to move"}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InternalMobility() {
  const [employees, setEmployees] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("marketplace")
  const [selectedRole, setSelectedRole] = useState(null)
  const [deptFilter, setDeptFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showPostRole, setShowPostRole] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [{ data: emps, error: empErr }, { data: jobs, error: jobErr }] = await Promise.all([
        supabase.from("company_employees").select("*").order("created_at", { ascending: false }),
        supabase.from("jobs").select("id, title, domain, experience, skills, status, applicant_count, created_at").eq("is_internal", true).order("created_at", { ascending: false }),
      ])
      if (empErr) throw empErr
      if (jobErr) throw jobErr
      setEmployees(emps || [])
      setRoles((jobs || []).filter((j) => (j.status || "").toLowerCase() === "open"))
    } catch (err) {
      setError(err.message || "Could not load internal mobility data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const setStage = async (emp, stage) => {
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, mobility_stage: stage } : e)))
    const { error: updErr } = await supabase.from("company_employees").update({ mobility_stage: stage, updated_at: new Date().toISOString() }).eq("id", emp.id)
    if (updErr) { console.error("Failed to update mobility stage:", updErr.message); load() }
  }

  const toggleOpen = async (emp) => {
    const next = !emp.open_to_mobility
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, open_to_mobility: next } : e)))
    const { error: updErr } = await supabase.from("company_employees").update({ open_to_mobility: next, updated_at: new Date().toISOString() }).eq("id", emp.id)
    if (updErr) { console.error("Failed to update mobility interest:", updErr.message); load() }
  }

  const filteredEmployees = useMemo(() => {
    let list = employees
    if (search) list = list.filter((e) => (e.name || "").toLowerCase().includes(search.toLowerCase()))
    if (deptFilter !== "All") list = list.filter((e) => e.department === deptFilter)
    return list
  }, [employees, search, deptFilter])

  // Honest relevance signal for a selected role: open-to-move employees in
  // a matching department. Not a skill-graph match score -- there is no
  // real skill-matching engine here, so this doesn't claim to be one.
  const matchedForRole = useMemo(() => {
    if (!selectedRole) return filteredEmployees.filter((e) => e.open_to_mobility)
    return filteredEmployees.filter((e) => e.open_to_mobility && (e.department || "").toLowerCase() === (selectedRole.domain || "").toLowerCase())
  }, [selectedRole, filteredEmployees])

  const readyNow = employees.filter((e) => e.mobility_stage === "interviewing" || e.mobility_stage === "transitioned").length
  const interested = employees.filter((e) => e.open_to_mobility).length

  const tabs = [
    { id: "marketplace", label: "🏪 Marketplace" },
    { id: "pipeline",    label: "🔀 Mobility Pipeline" },
    { id: "insights",    label: "📊 Insights" },
  ]

  return (
    <div style={{ padding: "24px", background: T.cream2, minHeight: "100%", fontFamily: "Inter, sans-serif" }}>
      {showAddEmployee && <AddEmployeeModal onClose={() => setShowAddEmployee(false)} onAdded={() => { setShowAddEmployee(false); load() }} />}
      {showPostRole && <PostInternalRoleModal onClose={() => setShowPostRole(false)} onPosted={() => { setShowPostRole(false); load() }} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>Internal Mobility</h1>
          <p style={{ fontSize: 13, color: T.ink3, margin: "4px 0 0" }}>Match your existing employees to open roles before external hiring</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddEmployee(true)} style={{ ...btn.outline, fontSize: 12 }}>+ Add Employee</button>
          <button onClick={() => setShowPostRole(true)} style={{ ...btn.primary, fontSize: 12 }}>+ Post Internal Role</button>
        </div>
      </div>

      {error && (
        <div style={{ background: T.red2, border: `1px solid ${T.red}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: T.red, fontWeight: 600 }}>⚠ {error}</div>
      )}

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Employees",     value: employees.length, sub: "in the roster",         color: T.ink },
          { label: "In Later-Stage Move", value: readyNow,          sub: "interviewing or moved", color: T.green },
          { label: "Open to a Move",      value: interested,        sub: "self/recruiter-flagged", color: T.indigo },
          { label: "Open Internal Roles", value: roles.length,      sub: "across departments",    color: T.amber },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{loading ? "—" : value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink2, marginTop: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: T.ink4, marginTop: 1 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, background: T.cream3, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, cursor: "pointer", border: "none",
            background: tab === t.id ? T.cream : "transparent",
            color: tab === t.id ? T.ink : T.ink3,
            boxShadow: tab === t.id ? T.shadow : "none",
            transition: "all 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.ink4 }}>Loading…</div>
      ) : (
        <>
          {/* ── MARKETPLACE TAB ── */}
          {tab === "marketplace" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16, alignItems: "start" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, marginBottom: 10 }}>Open Internal Roles</div>
                {roles.length === 0 ? (
                  <div style={{ ...card, textAlign: "center", padding: "30px 16px", color: T.ink4, fontSize: 13 }}>
                    No internal-only roles posted yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {roles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        openCount={employees.filter((e) => e.open_to_mobility && (e.department || "").toLowerCase() === (role.domain || "").toLowerCase()).length}
                        onSelect={(r) => setSelectedRole(r?.id === selectedRole?.id ? null : r)}
                        active={selectedRole?.id === role.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2 }}>
                    {selectedRole ? `Open to a move, in ${selectedRole.domain}` : "Employees Open to a Move"}
                    <span style={{ fontSize: 12, color: T.ink4, fontWeight: 400, marginLeft: 6 }}>({matchedForRole.length})</span>
                  </div>
                  {selectedRole && (
                    <button onClick={() => setSelectedRole(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.ink4, fontSize: 12 }}>Clear filter ✕</button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…"
                    style={{ flex: 1, padding: "7px 12px", fontSize: 12, background: T.cream, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, outline: "none" }} />
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: T.cream, border: `1.5px solid ${T.border}`, color: T.ink2, outline: "none" }}>
                    <option value="All">All Depts</option>
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>

                {employees.length === 0 ? (
                  <div style={{ ...card, textAlign: "center", padding: "40px 24px", color: T.ink3 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No employees added yet</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Use "+ Add Employee" to start building your roster.</div>
                  </div>
                ) : matchedForRole.length === 0 ? (
                  <div style={{ ...card, textAlign: "center", padding: "40px 24px", color: T.ink3 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No matches found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing filters, or mark employees "open to a move."</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(100vh - 380px)", overflow: "auto" }}>
                    {matchedForRole.map((emp) => (
                      <EmployeeCard key={emp.id} emp={emp} onSetStage={setStage} onToggleOpen={toggleOpen} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PIPELINE TAB ── */}
          {tab === "pipeline" && (
            <div>
              <div style={{ fontSize: 13, color: T.ink3, marginBottom: 16 }}>
                Employees currently in the internal mobility process, grouped by real stage (set from an employee's card in Marketplace).
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {STAGES.map((stage) => {
                  const stageEmps = employees.filter((e) => e.mobility_stage === stage.id)
                  const rs = readinessStyle(stage.id)
                  return (
                    <div key={stage.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: rs.color }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.ink2 }}>{stage.label}</span>
                        <span style={{ fontSize: 11, color: T.ink4, background: T.cream3, borderRadius: 10, padding: "1px 7px" }}>{stageEmps.length}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {stageEmps.length === 0 ? (
                          <div style={{ fontSize: 11, color: T.ink4, fontStyle: "italic" }}>No one here yet</div>
                        ) : (
                          stageEmps.map((emp) => (
                            <div key={emp.id} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", borderLeft: `3px solid ${rs.color}` }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{emp.job_title || "—"}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── INSIGHTS TAB ── */}
          {tab === "insights" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ ...card }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 16 }}>Mobility Interest by Department</div>
                {employees.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.ink4 }}>Add employees to see this breakdown.</div>
                ) : (
                  DEPARTMENTS.map((dept) => {
                    const total = employees.filter((e) => e.department === dept).length
                    if (total === 0) return null
                    const open = employees.filter((e) => e.department === dept && e.open_to_mobility).length
                    const pct = Math.round((open / total) * 100)
                    return (
                      <div key={dept} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: T.ink2 }}>{dept}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{open}/{total}</span>
                        </div>
                        <div style={{ height: 6, background: T.cream3, borderRadius: 3 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: T.indigo, borderRadius: 3, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ ...card }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 16 }}>Pipeline Stage Distribution</div>
                {employees.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.ink4 }}>Add employees to see this breakdown.</div>
                ) : (
                  STAGES.map((stage) => {
                    const count = employees.filter((e) => e.mobility_stage === stage.id).length
                    const pct = Math.round((count / employees.length) * 100)
                    const rs = readinessStyle(stage.id)
                    return (
                      <div key={stage.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: rs.color, background: rs.bg, padding: "2px 8px", borderRadius: 4, border: `1px solid ${rs.color}22` }}>{stage.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{count} <span style={{ color: T.ink4, fontWeight: 400 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ height: 8, background: T.cream3, borderRadius: 4 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: rs.color, borderRadius: 4, opacity: 0.7 }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
