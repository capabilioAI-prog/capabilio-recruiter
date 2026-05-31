import { useState } from "react"
import { T, card, cardLg, tag, btn } from "./theme"




const TABS = [
  { id:"onboarding",  label:"🎉 Onboarding",        icon:"🎉" },
  { id:"circulars",   label:"📢 Circulars & Comms",  icon:"📢" },
  { id:"mobility",    label:"🔀 Internal Mobility",  icon:"🔀" },
  { id:"upskilling",  label:"📚 Skill Upgrades",     icon:"📚" },
  { id:"performance", label:"📊 Performance",        icon:"📊" },
]

const EMPLOYEES = [
  { id:"e1", name:"Priya Sharma",   role:"Senior ML Engineer",  dept:"Engineering",   tenure:"4m", elo:1140, growth:82, pending:2, avatar:"PS", color:T.indigo },
  { id:"e2", name:"Rahul Mehta",    role:"Data Analyst",        dept:"Analytics",     tenure:"7m", elo:1020, growth:65, pending:1, avatar:"RM", color:T.green },
  { id:"e3", name:"Anjali Rao",     role:"Product Manager",     dept:"Product",       tenure:"2m", elo:980,  growth:71, pending:3, avatar:"AR", color:T.blue },
  { id:"e4", name:"Kiran Patel",    role:"Medical Coder",       dept:"Healthcare",    tenure:"1y", elo:1080, growth:88, pending:0, avatar:"KP", color:T.amber },
  { id:"e5", name:"Divya Nair",     role:"UX Designer",         dept:"Design",        tenure:"3m", elo:950,  growth:59, pending:1, avatar:"DN", color:T.red },
]

const CIRCULARS = [
  { id:"c1", title:"Q2 Performance Review Process",   type:"Policy",   sent:"2 days ago",  seen:18, total:22, urgent:false },
  { id:"c2", title:"WFH Policy Update — June 2026",   type:"Policy",   sent:"5 days ago",  seen:22, total:22, urgent:false },
  { id:"c3", title:"Mandatory Compliance Training",   type:"Training", sent:"Today",       seen:4,  total:22, urgent:true  },
  { id:"c4", title:"Salary Revision — FY26-27",       type:"Finance",  sent:"1 week ago",  seen:21, total:22, urgent:false },
]

const MOBILITY_OPPS = [
  { from:"Data Analyst",    to:"ML Engineer",     match:87, type:"Promotion",  skills_gap:2 },
  { from:"UX Designer",     to:"Product Manager", match:74, type:"Lateral",    skills_gap:3 },
  { from:"Medical Coder",   to:"Healthcare Lead", match:91, type:"Promotion",  skills_gap:1 },
]

function EmployeeRow({ emp, onAction }) {
  const growthColor = emp.growth >= 80 ? T.green : emp.growth >= 60 ? T.amber : T.red
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ width:40, height:40, borderRadius:12, background:`${emp.color}18`, border:`1.5px solid ${emp.color}44`, color:emp.color, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14, flexShrink:0 }}>
        {emp.avatar}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{emp.name}</div>
        <div style={{ fontSize:11, color:T.ink4 }}>{emp.role} · {emp.dept} · {emp.tenure} tenure</div>
      </div>
      <div style={{ textAlign:"center", minWidth:52 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.amber }}>⚡{emp.elo}</div>
        <div style={{ fontSize:9, color:T.ink4 }}>skill ELO</div>
      </div>
      <div style={{ textAlign:"center", minWidth:52 }}>
        <div style={{ fontSize:14, fontWeight:700, color:growthColor }}>{emp.growth}%</div>
        <div style={{ fontSize:9, color:T.ink4 }}>growth</div>
      </div>
      {emp.pending > 0 && (
        <div style={{ fontSize:11, background:T.amber2, color:T.amber, border:`1px solid ${T.amber}30`, borderRadius:7, padding:"3px 8px" }}>
          {emp.pending} pending
        </div>
      )}
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => onAction("message", emp)} style={{ fontSize:11, padding:"6px 10px", background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:8, color:T.indigo, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Message</button>
        <button onClick={() => onAction("upskill", emp)} style={{ fontSize:11, padding:"6px 10px", background:T.green2, border:`1px solid ${T.green}30`, borderRadius:8, color:T.green, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Upskill</button>
      </div>
    </div>
  )
}

function UpskillModal({ emp, onClose }) {
  const [sent, setSent] = useState(false)
  if (!emp) return null
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(26,26,24,0.5)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:20, padding:28, width:"100%", maxWidth:520, boxShadow:T.shadow2, animation:"fadeIn 0.2s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:T.ink }}>📚 Send Skill Improvement Request</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.ink4, cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        {sent ? (
          <div style={{ textAlign:"center", padding:"30px 0" }}>
            <div style={{ fontSize:48 }}>✅</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:T.green, marginTop:12 }}>Request Sent!</div>
            <div style={{ fontSize:13, color:T.ink3, marginTop:6 }}>{emp.name} will receive this improvement plan in their Capabilio portal with full context, deadline, and resources.</div>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, padding:"12px 14px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${emp.color}18`, color:emp.color, border:`1.5px solid ${emp.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800 }}>{emp.avatar}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{emp.name}</div>
                <div style={{ fontSize:11, color:T.ink4 }}>{emp.role}</div>
              </div>
            </div>
            {[
              { label:"Skill Gap Identified",  value:"Advanced Python & MLOps pipeline management", icon:"🎯" },
              { label:"Why This Matters",       value:"Required for upcoming team project and promotion track",  icon:"💡" },
              { label:"Deadline",              value:"30 days from today",                          icon:"📅" },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:T.ink3, fontWeight:600, marginBottom:6 }}>{f.icon} {f.label}</div>
                <div style={{ padding:"10px 12px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:9, fontSize:13, color:T.ink3 }}>{f.value}</div>
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:T.ink3, fontWeight:600, marginBottom:8 }}>📚 Resources Included</div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                {["3 Arena tasks","Coursera ML Ops","Mentor: Kiran Patel","Internal sim #07"].map((r) => (
                  <span key={r} style={{ fontSize:11, background:T.indigo3, border:`1px solid ${T.indigo}30`, color:T.indigo, borderRadius:7, padding:"3px 9px" }}>{r}</span>
                ))}
              </div>
            </div>
            <button onClick={() => setSent(true)} style={{ width:"100%", padding:"12px", background:T.ink, border:"none", borderRadius:12, color:T.cream, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              Send Improvement Request →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function EmployeeNetwork() {
  const [tab,         setTab]     = useState("onboarding")
  const [modal,       setModal]   = useState(null)
  const [modalEmp,    setModalEmp]= useState(null)

  const handleAction = (type, emp) => {
    if (type === "upskill") { setModalEmp(emp); setModal("upskill") }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {modal === "upskill" && <UpskillModal emp={modalEmp} onClose={() => { setModal(null); setModalEmp(null) }} />}

      {/* Hero */}
      <div style={{ background:T.green2, border:`1px solid ${T.green}20`, borderRadius:16, padding:"20px 24px" }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>🏢 Employee Network · Post-Hire Operating Layer</div>
        <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>
          Capabilio doesn't end at hiring. Once a candidate joins, their profile is linked to your company workspace. Manage onboarding, send circulars, assign skill upgrades, track internal mobility, and communicate performance plans — all in one place.
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        {[
          { label:"Active Employees",   value:22,  icon:"👥", color:T.indigo },
          { label:"In Onboarding",      value:3,   icon:"🎉", color:T.green },
          { label:"Pending Actions",    value:7,   icon:"⚠️",  color:T.amber },
          { label:"Upskill Plans Active",value:5,  icon:"📚", color:T.blue },
          { label:"Mobility Matches",   value:3,   icon:"🔀", color:T.indigo2 },
        ].map((s) => (
          <div key={s.label} style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 14px", display:"flex", alignItems:"center", gap:10, boxShadow:T.shadow }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${s.color}15`, color:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.ink }}>{s.value}</div>
              <div style={{ fontSize:11, color:T.ink4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ fontSize:12, padding:"8px 16px", borderRadius:10, border:"1px solid", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all 0.15s", background: tab === t.id ? T.indigo3 : "transparent", borderColor: tab === t.id ? `${T.indigo}40` : T.border, color: tab === t.id ? T.indigo : T.ink4 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "onboarding" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[
            { name:"Anjali Rao",  role:"Product Manager", day:14, tasks:["Complete HRMS setup","Sign NDA & policies","Meet team leads","Complete security training"], done:2 },
            { name:"Divya Nair",  role:"UX Designer",     day:22, tasks:["Figma access","Brand guide review","First sprint planning","Mentor assignment"],          done:3 },
            { name:"Rohan Gupta", role:"Backend Engineer", day:5,  tasks:["Dev env setup","Code review guidelines","First PR submitted","1-on-1 with manager"],    done:1 },
          ].map((emp) => (
            <div key={emp.name} style={{ background:T.cream, border:`1px solid ${T.green}20`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:T.green2, color:T.green, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800 }}>
                  {emp.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{emp.name}</div>
                  <div style={{ fontSize:11, color:T.ink4 }}>{emp.role} · Day {emp.day}</div>
                </div>
                <div style={{ marginLeft:"auto", fontSize:11, background:T.green2, color:T.green, border:`1px solid ${T.green}30`, borderRadius:7, padding:"3px 9px" }}>
                  {emp.done}/{emp.tasks.length} done
                </div>
              </div>
              {emp.tasks.map((t, i) => (
                <div key={t} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:14 }}>{i < emp.done ? "✅" : "○"}</span>
                  <span style={{ fontSize:12, color: i < emp.done ? T.ink4 : T.ink3, textDecoration: i < emp.done ? "line-through" : "none" }}>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "circulars" && (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:0 }}>📢 Company Circulars & Communications</h2>
            <button style={{ fontSize:12, padding:"7px 14px", background:T.ink, border:"none", borderRadius:9, color:T.cream, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
              + New Circular
            </button>
          </div>
          {CIRCULARS.map((c) => (
            <div key={c.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{c.title}</span>
                  {c.urgent && <span style={{ fontSize:10, background:T.red2, color:T.red, border:`1px solid ${T.red}30`, borderRadius:5, padding:"1px 6px" }}>Urgent</span>}
                </div>
                <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>{c.type} · Sent {c.sent}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.green }}>{c.seen}/{c.total}</div>
                <div style={{ fontSize:10, color:T.ink4 }}>seen</div>
              </div>
              <div style={{ width:80, height:5, background:T.cream3, borderRadius:3 }}>
                <div style={{ height:"100%", width:`${(c.seen/c.total)*100}%`, background:T.green, borderRadius:3 }} />
              </div>
              <button style={{ fontSize:11, padding:"5px 10px", background:T.indigo3, border:`1px solid ${T.indigo}30`, borderRadius:7, color:T.indigo, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Resend</button>
            </div>
          ))}
        </div>
      )}

      {tab === "mobility" && (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:"0 0 16px" }}>🔀 Internal Mobility — Verified Skill-Based Opportunities</h2>
          <div style={{ fontSize:12, color:T.ink4, marginBottom:16 }}>Powered by verified skill data — not manager bias. Employees with matching skill graphs are surfaced for promotions, lateral transfers, and team moves.</div>
          {MOBILITY_OPPS.map((op, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:T.cream2, border:`1px solid ${op.type === "Promotion" ? T.green + "30" : T.indigo + "30"}`, borderRadius:12, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:T.ink4, marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:T.ink3 }}>{op.from}</span>
                  <span style={{ margin:"0 8px", color:T.ink4 }}>→</span>
                  <span style={{ fontSize:13, fontWeight:700, color:T.ink }}>{op.to}</span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <span style={{ fontSize:11, background: op.type === "Promotion" ? T.green2 : T.indigo3, color: op.type === "Promotion" ? T.green : T.indigo, border:`1px solid ${op.type === "Promotion" ? T.green + "30" : T.indigo + "30"}`, borderRadius:6, padding:"2px 8px" }}>{op.type}</span>
                  <span style={{ fontSize:11, color:T.amber }}>⚠ {op.skills_gap} skill gap{op.skills_gap > 1 ? "s" : ""} to close</span>
                </div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.green }}>{op.match}%</div>
                <div style={{ fontSize:10, color:T.ink4 }}>skill match</div>
              </div>
              <button style={{ fontSize:12, padding:"7px 14px", background:T.green2, border:`1px solid ${T.green}30`, borderRadius:9, color:T.green, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                Initiate Move →
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "upskilling" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:"0 0 16px" }}>📚 Employee Skill Upgrade Plans</h2>
            {EMPLOYEES.map((emp) => (
              <EmployeeRow key={emp.id} emp={emp} onAction={handleAction} />
            ))}
          </div>
        </div>
      )}

      {tab === "performance" && (
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink, margin:"0 0 16px" }}>📊 Employee Growth Graph</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {EMPLOYEES.slice(0,3).map((emp) => (
              <div key={emp.id} style={{ padding:"18px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${emp.color}18`, color:emp.color, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13 }}>{emp.avatar}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{emp.name}</div>
                    <div style={{ fontSize:11, color:T.ink4 }}>{emp.role}</div>
                  </div>
                </div>
                {[["Skill ELO", emp.elo, 1300, T.indigo],["Growth Score", emp.growth, 100, T.green],["Arena Progress", emp.elo % 20 + 60, 100, T.amber]].map(([label, val, max, color]) => (
                  <div key={label} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:10, color:T.ink4 }}>{label}</span>
                      <span style={{ fontSize:11, fontWeight:700, color }}>{val}{max !== 1300 ? "%" : ""}</span>
                    </div>
                    <div style={{ height:5, background:T.cream3, borderRadius:3 }}>
                      <div style={{ height:"100%", width:`${(val/max)*100}%`, background:color, borderRadius:3 }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
