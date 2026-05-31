import { useState, useMemo } from "react"
import { T, card, tag, btn } from "./theme"

// ── Mock data ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = ["Engineering", "Product", "Design", "Data", "Marketing", "Sales", "Finance", "HR"]
const MOVE_TYPES  = ["Promotion", "Lateral", "Stretch Role", "Cross-Dept Transfer"]

const OPEN_ROLES = [
  { id:"r1", title:"Senior Engineer – Platform", dept:"Engineering", level:"L5", openSince:14, applicants:3, skills:["Go","Kubernetes","gRPC"], urgency:"High" },
  { id:"r2", title:"Product Manager – Growth",   dept:"Product",     level:"PM2", openSince:7, applicants:5, skills:["Strategy","A/B Testing","SQL"], urgency:"Medium" },
  { id:"r3", title:"Lead Data Scientist",        dept:"Data",        level:"L6", openSince:21, applicants:1, skills:["PyTorch","MLOps","Spark"], urgency:"High" },
  { id:"r4", title:"UX Lead – Mobile",           dept:"Design",      level:"D4", openSince:10, applicants:4, skills:["Figma","Research","Prototyping"], urgency:"Low" },
  { id:"r5", title:"Engineering Manager",        dept:"Engineering", level:"EM1", openSince:30, applicants:2, skills:["Leadership","Systems","Hiring"], urgency:"High" },
  { id:"r6", title:"Analytics Engineer",        dept:"Data",        level:"L4", openSince:5, applicants:6, skills:["dbt","BigQuery","Python"], urgency:"Medium" },
]

const EMPLOYEES = Array.from({ length: 24 }, (_, i) => ({
  id: `e${i+1}`,
  name: [
    "Arjun Mehta","Priya Sharma","Ravi Nair","Deepika Rao","Kiran Patel",
    "Sneha Iyer","Amit Kumar","Neha Singh","Rahul Gupta","Pooja Verma",
    "Sanjay Mishra","Anjali Das","Vikas Tiwari","Meera Joshi","Suresh Reddy",
    "Divya Nambiar","Rohan Bose","Ananya Kapoor","Tarun Malhotra","Nisha Pillai",
    "Harish Bhat","Sunita Reddy","Vinod Kumar","Lalitha Rao",
  ][i],
  dept: DEPARTMENTS[i % DEPARTMENTS.length],
  currentRole: ["Software Engineer","Senior SWE","Product Manager","Data Analyst","UX Designer","Marketing Lead","Financial Analyst","HR Manager"][i % 8],
  level: ["L3","L4","L5","PM1","PM2","D3","D4","L6"][i % 8],
  tenure: 1 + Math.floor(Math.random() * 5),
  elo: 850 + Math.floor(Math.random() * 400),
  readiness: ["Ready Now", "3–6 months", "6–12 months"][Math.floor(Math.random() * 3)],
  interest: Math.random() > 0.4,
  skills: ["Python","React","SQL","Leadership","Strategy","Data Analysis","Figma","Go","Kubernetes","ML"].slice(i % 5, (i % 5) + 4),
  matchedRoles: OPEN_ROLES.filter(() => Math.random() > 0.5).slice(0, 3).map(r => r.id),
  moveType: MOVE_TYPES[i % MOVE_TYPES.length],
}))

// ── Urgency color ─────────────────────────────────────────────────────────────
function urgencyStyle(u) {
  if (u === "High")   return { color: T.red,    bg: T.red2   }
  if (u === "Medium") return { color: T.amber,  bg: T.amber2 }
  return                     { color: T.green,  bg: T.green2 }
}

// ── Readiness badge ───────────────────────────────────────────────────────────
function readinessStyle(r) {
  if (r === "Ready Now")     return { color: T.green,  bg: T.green2 }
  if (r === "3–6 months")    return { color: T.indigo, bg: T.indigo3 }
  return                            { color: T.ink3,   bg: T.cream3  }
}

// ── Role card ─────────────────────────────────────────────────────────────────
function RoleCard({ role, employees, onSelect, active }) {
  const matched = employees.filter(e => e.matchedRoles.includes(role.id))
  const urg = urgencyStyle(role.urgency)
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{role.title}</div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: urg.bg, color: urg.color, border: `1px solid ${urg.color}22` }}>
          {role.urgency}
        </span>
      </div>
      <div style={{ fontSize: 12, color: T.ink3, marginBottom: 10 }}>{role.dept} · {role.level}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {role.skills.map(s => (
          <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: T.cream3, color: T.ink2, border: `1px solid ${T.border}` }}>{s}</span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: T.ink3 }}>Open {role.openSince}d · {role.applicants} applied</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: matched.length > 0 ? T.indigo : T.ink4 }}>
          {matched.length} internal match{matched.length !== 1 ? "es" : ""}
        </span>
      </div>
    </div>
  )
}

// ── Employee card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onNominate }) {
  const rs = readinessStyle(emp.readiness)
  return (
    <div style={{
      ...card, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: T.indigo3, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, color: T.indigo, flexShrink: 0,
      }}>
        {emp.name.split(" ").map(w => w[0]).join("").slice(0,2)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{emp.name}</span>
          {emp.interest && <span style={{ fontSize: 9, fontWeight: 700, background: T.green2, color: T.green, borderRadius: 4, padding: "1px 5px" }}>INTERESTED</span>}
        </div>
        <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>{emp.currentRole} · {emp.dept}</div>
        <div style={{ fontSize: 11, color: T.ink3 }}>{emp.tenure}yr tenure · ELO {emp.elo}</div>
      </div>

      {/* Readiness */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: rs.bg, color: rs.color, border: `1px solid ${rs.color}22`, display: "block", marginBottom: 6 }}>
          {emp.readiness}
        </span>
        <button onClick={() => onNominate(emp)} style={{ ...btn.indigo, fontSize: 11, padding: "4px 10px" }}>Nominate</button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InternalMobility() {
  const [tab,          setTab]          = useState("marketplace")
  const [selectedRole, setSelectedRole] = useState(null)
  const [deptFilter,   setDeptFilter]   = useState("All")
  const [readyFilter,  setReadyFilter]  = useState("All")
  const [search,       setSearch]       = useState("")
  const [nominated,    setNominated]    = useState(new Set())

  const tabs = [
    { id:"marketplace", label:"🏪 Marketplace" },
    { id:"pipeline",    label:"🔀 Mobility Pipeline" },
    { id:"insights",    label:"📊 Insights" },
  ]

  // Filtered employees
  const employees = useMemo(() => {
    let list = EMPLOYEES
    if (search)              list = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    if (deptFilter !== "All") list = list.filter(e => e.dept === deptFilter)
    if (readyFilter !== "All") list = list.filter(e => e.readiness === readyFilter)
    return list
  }, [search, deptFilter, readyFilter])

  // For selected role, show matched employees
  const matchedEmps = useMemo(() => {
    if (!selectedRole) return employees.filter(e => e.interest)
    return employees.filter(e => e.matchedRoles.includes(selectedRole.id))
  }, [selectedRole, employees])

  const handleNominate = (emp) => {
    setNominated(prev => {
      const next = new Set(prev)
      next.has(emp.id) ? next.delete(emp.id) : next.add(emp.id)
      return next
    })
  }

  // Stats
  const readyNow    = EMPLOYEES.filter(e => e.readiness === "Ready Now").length
  const interested  = EMPLOYEES.filter(e => e.interest).length
  const nominatedN  = nominated.size

  return (
    <div style={{ padding: "24px", background: T.cream2, minHeight: "100%", fontFamily: "DM Sans, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>Internal Mobility</h1>
          <p style={{ fontSize: 13, color: T.ink3, margin: "4px 0 0" }}>Match your existing employees to open roles before external hiring</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...btn.outline, fontSize: 12 }}>↓ Export Report</button>
          <button style={{ ...btn.primary, fontSize: 12 }}>+ Post Internal Role</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label:"Total Employees",    value: EMPLOYEES.length,   sub:"in talent pool",         color: T.ink },
          { label:"Ready Now",          value: readyNow,            sub:"eligible for move",      color: T.green },
          { label:"Expressed Interest", value: interested,          sub:"self-nominated",         color: T.indigo },
          { label:"Open Internal Roles",value: OPEN_ROLES.length,  sub:"across departments",     color: T.amber },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink2, marginTop: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: T.ink4, marginTop: 1 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, background: T.cream3, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {tabs.map(t => (
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

      {/* ── MARKETPLACE TAB ── */}
      {tab === "marketplace" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16, alignItems: "start" }}>
          {/* Open roles */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, marginBottom: 10 }}>Open Internal Roles</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {OPEN_ROLES.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  employees={EMPLOYEES}
                  onSelect={r => setSelectedRole(r?.id === selectedRole?.id ? null : r)}
                  active={selectedRole?.id === role.id}
                />
              ))}
            </div>
          </div>

          {/* Matched employees */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2 }}>
                {selectedRole ? `Matches for "${selectedRole.title}"` : "Employees with Interest"}
                <span style={{ fontSize: 12, color: T.ink4, fontWeight: 400, marginLeft: 6 }}>({matchedEmps.length})</span>
              </div>
              {selectedRole && (
                <button onClick={() => setSelectedRole(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.ink4, fontSize: 12 }}>
                  Clear filter ✕
                </button>
              )}
            </div>

            {/* Employee filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search employees…"
                style={{ flex: 1, padding: "7px 12px", fontSize: 12, background: T.cream, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, outline: "none" }}
              />
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={selectSty}>
                <option value="All">All Depts</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
              <select value={readyFilter} onChange={e => setReadyFilter(e.target.value)} style={selectSty}>
                <option value="All">All Readiness</option>
                <option>Ready Now</option>
                <option>3–6 months</option>
                <option>6–12 months</option>
              </select>
            </div>

            {matchedEmps.length === 0 ? (
              <div style={{ ...card, textAlign: "center", padding: "40px 24px", color: T.ink3 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No matches found</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting filters</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(100vh - 380px)", overflow: "auto" }}>
                {matchedEmps.map(emp => (
                  <EmployeeCard
                    key={emp.id}
                    emp={emp}
                    onNominate={handleNominate}
                  />
                ))}
              </div>
            )}

            {nominated.size > 0 && (
              <div style={{
                marginTop: 12, padding: "12px 16px",
                background: T.green2, border: `1px solid ${T.green}22`, borderRadius: 10,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.green }}>
                  {nominated.size} employee{nominated.size !== 1 ? "s" : ""} nominated
                </span>
                <button style={{ ...btn.primary, fontSize: 12, background: T.green }}>Send Nominations →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PIPELINE TAB ── */}
      {tab === "pipeline" && (
        <div>
          <div style={{ fontSize: 13, color: T.ink3, marginBottom: 16 }}>
            Track employees currently in the internal mobility process
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {["Exploring", "Applied", "Interviewing", "Transitioned"].map((stage, si) => {
              const stageEmps = EMPLOYEES.filter((_, i) => i % 4 === si).slice(0, 3 + si)
              const colors = [T.indigo, T.blue, T.amber, T.green]
              const bgs    = [T.indigo3, T.blue2, T.amber2, T.green2]
              return (
                <div key={stage}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[si] }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.ink2 }}>{stage}</span>
                    <span style={{ fontSize: 11, color: T.ink4, background: T.cream3, borderRadius: 10, padding: "1px 7px" }}>{stageEmps.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stageEmps.map(emp => (
                      <div key={emp.id} style={{
                        background: T.cream, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px",
                        borderLeft: `3px solid ${colors[si]}`,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{emp.currentRole}</div>
                        <div style={{ fontSize: 11, color: T.ink4, marginTop: 4 }}>→ {emp.moveType}</div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                          background: bgs[si], color: colors[si], border: `1px solid ${colors[si]}22`,
                          display: "inline-block", marginTop: 6,
                        }}>
                          {readinessStyle(emp.readiness).color === T.green ? emp.readiness : emp.readiness}
                        </span>
                      </div>
                    ))}
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
          {/* Dept distribution */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 16 }}>Mobility Interest by Department</div>
            {DEPARTMENTS.map(dept => {
              const total = EMPLOYEES.filter(e => e.dept === dept).length
              const interested = EMPLOYEES.filter(e => e.dept === dept && e.interest).length
              const pct = total > 0 ? Math.round((interested / total) * 100) : 0
              return (
                <div key={dept} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.ink2 }}>{dept}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{interested}/{total}</span>
                  </div>
                  <div style={{ height: 6, background: T.cream3, borderRadius: 3 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: T.indigo, borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Readiness breakdown */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 16 }}>Readiness Distribution</div>
            {["Ready Now", "3–6 months", "6–12 months"].map(r => {
              const count = EMPLOYEES.filter(e => e.readiness === r).length
              const pct = Math.round((count / EMPLOYEES.length) * 100)
              const rs = readinessStyle(r)
              return (
                <div key={r} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: rs.color, background: rs.bg, padding: "2px 8px", borderRadius: 4, border: `1px solid ${rs.color}22` }}>{r}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{count} <span style={{ color: T.ink4, fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 8, background: T.cream3, borderRadius: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: rs.color, borderRadius: 4, opacity: 0.7 }} />
                  </div>
                </div>
              )
            })}

            <div style={{ marginTop: 20, padding: "14px", background: T.indigo3, borderRadius: 10, border: `1px solid ${T.indigo}22` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.indigo, marginBottom: 4 }}>💡 Insight</div>
              <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5 }}>
                {readyNow} employees are ready for a move <i>right now</i>. Filling open roles internally saves an avg. <b>38 days</b> vs. external hiring.
              </div>
            </div>
          </div>

          {/* Move type */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 16 }}>Movement Types</div>
            {MOVE_TYPES.map(mt => {
              const count = EMPLOYEES.filter(e => e.moveType === mt).length
              const pct = Math.round((count / EMPLOYEES.length) * 100)
              const colors = [T.green, T.indigo, T.blue, T.amber]
              const color = colors[MOVE_TYPES.indexOf(mt)]
              return (
                <div key={mt} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: T.ink2, flex: 1 }}>{mt}</span>
                  <div style={{ width: 100, height: 6, background: T.cream3, borderRadius: 3 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.ink, width: 24, textAlign: "right" }}>{count}</span>
                </div>
              )
            })}
          </div>

          {/* Time savings */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 16 }}>Estimated Savings from Internal Mobility</div>
            {[
              { metric: "Avg. days saved per hire",     value: "38d",  note: "vs. external pipeline" },
              { metric: "Cost saved per internal hire", value: "₹2.4L",note: "recruitment + onboarding" },
              { metric: "Ramp time reduction",          value: "60%",  note: "already knows culture/tools" },
              { metric: "Retention uplift",             value: "+22%", note: "post-mobility 12m retention" },
            ].map(({ metric, value, note }) => (
              <div key={metric} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{metric}</div>
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.green, alignSelf: "center" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const selectSty = {
  fontSize: 12, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
  background: T.cream, border: `1.5px solid ${T.border}`, color: T.ink2, outline: "none",
}
