import { useState, useEffect } from "react"
import { auth, db } from "./firebase"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { T, card, cardLg, tag, btn } from "./theme"


// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, cursor: "pointer",
        background: value ? "#3D4EAC" : "rgba(26,26,24,0.07)",
        border: `1px solid ${value ? "#3D4EAC" : "rgba(255,255,255,0.12)"}`,
        position: "relative", transition: "all 0.25s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 2,
        left: value ? 20 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: "#1A1A18", transition: "left 0.25s",
        boxShadow: "0 1px 4px rgba(26,26,24,0.07)",
      }} />
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div style={S.section}>
      <div style={S.sectionHead}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={S.sectionTitle}>{title}</span>
      </div>
      {children}
    </div>
  )
}

const S = {
  section:     { background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, marginBottom: 14 },
  sectionHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" },
  sectionTitle:{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#1A1A18" },
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ label, sub, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <div style={{ fontSize: 13, color: "#1A1A18", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#E8E8E1", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 16 }}>{children}</div>
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: "8px 12px", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8, color: "#1A1A18",
        fontSize: 13, fontFamily: "'DM Sans',sans-serif",
        width: 220,
      }}
    />
  )
}

// ── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState("")
  const add = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) { onChange([...tags, val]); setInput("") }
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {tags.map((t, i) => (
        <span key={i} style={TI.tag}>
          {t}
          <button onClick={() => onChange(tags.filter((_, j) => j !== i))} style={TI.removeBtn}>✕</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        placeholder={placeholder}
        style={TI.input}
      />
    </div>
  )
}

const TI = {
  tag:       { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px 3px 10px", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", borderRadius: 20, fontSize: 12, color: "#a5b4fc" },
  removeBtn: { background: "none", border: "none", color: "#3D4EAC", cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1 },
  input:     { padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, color: "#1A1A18", fontSize: 12, fontFamily: "'DM Sans',sans-serif", width: 140 },
}

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanCard({ name, price, features, current, color }) {
  return (
    <div style={{ ...PC.card, borderColor: current ? color : "rgba(26,26,24,0.06)", background: current ? `${color}08` : "#EFEFE9" }}>
      {current && <div style={{ ...PC.currentBadge, background: color }}>Current Plan</div>}
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1A1A18", marginBottom: 12 }}>
        {price}<span style={{ fontSize: 13, color: "#E8E8E1" }}>/mo</span>
      </div>
      {features.map((f, i) => (
        <div key={i} style={{ fontSize: 12, color: "#3A3A38", padding: "3px 0" }}>✓ {f}</div>
      ))}
      {!current && (
        <button style={{ ...PC.upgradeBtn, background: `${color}11`, border: `1px solid ${color}33`, color }}>
          Upgrade →
        </button>
      )}
    </div>
  )
}

const PC = {
  card:         { position: "relative", border: "2px solid", borderRadius: 14, padding: 16 },
  currentBadge: { position: "absolute", top: -10, left: 12, fontSize: 10, fontWeight: 700, color: "#1A1A18", padding: "2px 8px", borderRadius: 20 },
  upgradeBtn:   { marginTop: 12, width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function RecruiterSettings() {
  const user = auth.currentUser
  const [tab, setTab] = useState("profile")
  const [saved, setSaved] = useState(false)

  // Profile
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [company,     setCompany]     = useState("")
  const [role,        setRole]        = useState("")
  const [bio,         setBio]         = useState("")
  const [website,     setWebsite]     = useState("")

  // Notifications
  const [notifs, setNotifs] = useState({
    newCandidate:   true,
    arenaActivity:  true,
    pipelineStale:  false,
    weeklyReport:   true,
    competitorAlert:true,
    chatMessages:   false,
  })

  // Hiring prefs
  const [domains,       setDomains]       = useState([])
  const [minElo,        setMinElo]        = useState("900")
  const [minReadiness,  setMinReadiness]  = useState("60")
  const [hiringCount,   setHiringCount]   = useState("5")
  const [keywords,      setKeywords]      = useState([])

  // Team
  const [teamMembers, setTeamMembers] = useState([
    { name: "You",          email: user?.email || "", role: "Admin",   avatar: "Y" },
    { name: "Sarah K.",     email: "sarah@company.com", role: "Recruiter", avatar: "S" },
    { name: "James T.",     email: "james@company.com", role: "Viewer",    avatar: "J" },
  ])
  const [inviteEmail, setInviteEmail]   = useState("")
  const [inviteRole,  setInviteRole]    = useState("Recruiter")
  const [inviteSent,  setInviteSent]    = useState(false)

  // Integration toggles
  const [integrations, setIntegrations] = useState({
    slack:     false,
    greenhouse:false,
    lever:     false,
    linkedin:  false,
    zapier:    false,
    notion:    false,
  })

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, "recruiterProfiles", user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setCompany(d.company     || "")
        setRole(d.role           || "")
        setBio(d.bio             || "")
        setWebsite(d.website     || "")
        setDomains(d.domains     || [])
        setKeywords(d.keywords   || [])
        setMinElo(String(d.minElo           || 900))
        setMinReadiness(String(d.minReadiness || 60))
        setHiringCount(String(d.hiringCount  || 5))
        if (d.notifs)       setNotifs((p) => ({ ...p, ...d.notifs }))
        if (d.integrations) setIntegrations((p) => ({ ...p, ...d.integrations }))
      }
    })
  }, [user])

  const save = async () => {
    if (!user) return
    try {
      await updateProfile(user, { displayName })
      await setDoc(doc(db, "recruiterProfiles", user.uid), {
        displayName, company, role, bio, website,
        domains, keywords, minElo: Number(minElo),
        minReadiness: Number(minReadiness),
        hiringCount: Number(hiringCount),
        notifs, integrations,
        updatedAt: new Date(),
      }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
    }
  }

  const sendInvite = () => {
    if (!inviteEmail.trim()) return
    setTeamMembers((p) => [...p, { name: inviteEmail.split("@")[0], email: inviteEmail, role: inviteRole, avatar: inviteEmail[0].toUpperCase() }])
    setInviteEmail("")
    setInviteSent(true)
    setTimeout(() => setInviteSent(false), 2500)
  }

  const TABS = [
    { key: "profile",       label: "👤 Profile"       },
    { key: "notifications", label: "🔔 Notifications"  },
    { key: "hiring",        label: "🎯 Hiring Prefs"   },
    { key: "team",          label: "👥 Team"           },
    { key: "integrations",  label: "🔌 Integrations"   },
    { key: "billing",       label: "💳 Billing"        },
  ]

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#1A1A18", maxWidth: 900 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        input::placeholder { color: #334155; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #3D4EAC !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(61,78,172,0.3); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A18", margin: 0 }}>
            ⚙️ Settings
          </h1>
          <p style={{ fontSize: 13, color: "#3A3A38", marginTop: 4, margin: "4px 0 0" }}>
            Manage your recruiter profile and preferences
          </p>
        </div>
        <button
          onClick={save}
          style={{
            padding: "9px 20px",
            background: saved ? "rgba(34,197,94,0.15)" : "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
            border: saved ? "1px solid rgba(34,197,94,0.3)" : "none",
            borderRadius: 10, color: saved ? "#1A7A4A" : "#1A1A18",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", transition: "all 0.3s",
          }}
        >
          {saved ? "✓ Saved!" : "💾 Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "8px 14px", background: tab === t.key ? "rgba(61,78,172,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${tab === t.key ? "rgba(61,78,172,0.25)" : "rgba(26,26,24,0.07)"}`, borderRadius: 10, color: tab === t.key ? "#a5b4fc" : "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === "profile" && (
        <div>
          <Section title="Personal Information" icon="👤">
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "#1A1A18" }}>
                {(displayName || user?.email || "R").charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{displayName || "Recruiter"}</div>
                <div style={{ fontSize: 12, color: "#E8E8E1" }}>{user?.email}</div>
                <button style={{ marginTop: 6, padding: "4px 10px", background: "rgba(61,78,172,0.1)", border: "1px solid rgba(61,78,172,0.2)", borderRadius: 6, color: "#a5b4fc", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Change Photo
                </button>
              </div>
            </div>

            <Row label="Display Name" sub="Shown to candidates">
              <Input value={displayName} onChange={setDisplayName} placeholder="Your name" />
            </Row>
            <Row label="Company" sub="Your organisation">
              <Input value={company} onChange={setCompany} placeholder="Company name" />
            </Row>
            <Row label="Your Role" sub="e.g. Senior Recruiter">
              <Input value={role} onChange={setRole} placeholder="Job title" />
            </Row>
            <Row label="Website" sub="Company or personal">
              <Input value={website} onChange={setWebsite} placeholder="https://..." />
            </Row>
            <div style={{ paddingTop: 14 }}>
              <div style={{ fontSize: 13, color: "#6B6B68", marginBottom: 8 }}>Bio</div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief description shown to candidates..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontFamily: "'DM Sans',sans-serif", resize: "vertical" }}
              />
            </div>
          </Section>

          <Section title="Account" icon="🔐">
            <Row label="Email Address" sub={user?.email}>
              <button style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#6B6B68", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Change Email
              </button>
            </Row>
            <Row label="Password" sub="Last changed 30 days ago">
              <button style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#6B6B68", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Change Password
              </button>
            </Row>
            <Row label="Two-Factor Auth" sub="Adds extra login security">
              <Toggle value={false} onChange={() => {}} />
            </Row>
          </Section>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === "notifications" && (
        <Section title="Notification Preferences" icon="🔔">
          {[
            { key: "newCandidate",    label: "New Candidate Joins",      sub: "When a candidate signs up in your domains"      },
            { key: "arenaActivity",   label: "Arena Activity",            sub: "When candidates complete challenges"            },
            { key: "pipelineStale",   label: "Stale Pipeline Alerts",     sub: "Cards stuck in a stage for 5+ days"            },
            { key: "weeklyReport",    label: "Weekly Analytics Report",   sub: "Summary of pipeline and talent activity"       },
            { key: "competitorAlert", label: "Competitor Alerts",         sub: "When competitors hire in your domains"         },
            { key: "chatMessages",    label: "Chat Messages",             sub: "Direct messages from candidates"               },
          ].map((n) => (
            <Row key={n.key} label={n.label} sub={n.sub}>
              <Toggle value={notifs[n.key]} onChange={(v) => setNotifs((p) => ({ ...p, [n.key]: v }))} />
            </Row>
          ))}
        </Section>
      )}

      {/* ── HIRING PREFS TAB ── */}
      {tab === "hiring" && (
        <div>
          <Section title="Talent Filters" icon="🎯">
            <Row label="Minimum ELO Score" sub="Filter candidates below this ELO">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range" min="800" max="1200" step="50"
                  value={minElo}
                  onChange={(e) => setMinElo(e.target.value)}
                  style={{ width: 120 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#B47FFF", width: 40 }}>{minElo}</span>
              </div>
            </Row>
            <Row label="Minimum Job Readiness" sub="Only show candidates above this %">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range" min="0" max="100" step="5"
                  value={minReadiness}
                  onChange={(e) => setMinReadiness(e.target.value)}
                  style={{ width: 120 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1A7A4A", width: 40 }}>{minReadiness}%</span>
              </div>
            </Row>
            <Row label="Open Positions Target" sub="How many hires you're targeting">
              <Input value={hiringCount} onChange={setHiringCount} placeholder="5" type="number" />
            </Row>
          </Section>

          <Section title="Domain Focus" icon="◆">
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 12, color: "#3A3A38", marginBottom: 10 }}>
                Domains you're actively hiring in (press Enter to add)
              </div>
              <TagInput tags={domains} onChange={setDomains} placeholder="Add domain..." />
            </div>
          </Section>

          <Section title="Skill Keywords" icon="🔑">
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 12, color: "#3A3A38", marginBottom: 10 }}>
                Skills you're looking for (press Enter to add)
              </div>
              <TagInput tags={keywords} onChange={setKeywords} placeholder="Add skill..." />
            </div>
          </Section>
        </div>
      )}

      {/* ── TEAM TAB ── */}
      {tab === "team" && (
        <div>
          <Section title="Team Members" icon="👥">
            {teamMembers.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: "#1A1A18", flexShrink: 0 }}>
                  {m.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#E8E8E1" }}>{m.email}</div>
                </div>
                <div style={{ fontSize: 11, padding: "3px 10px", background: m.role === "Admin" ? "rgba(61,78,172,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${m.role === "Admin" ? "rgba(61,78,172,0.2)" : "rgba(26,26,24,0.07)"}`, borderRadius: 20, color: m.role === "Admin" ? "#a5b4fc" : "#3A3A38" }}>
                  {m.role}
                </div>
                {m.role !== "Admin" && (
                  <button
                    onClick={() => setTeamMembers((p) => p.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#EFEFE9", cursor: "pointer", fontSize: 13 }}
                  >✕</button>
                )}
              </div>
            ))}
          </Section>

          <Section title="Invite Team Member" icon="✉️">
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                style={{ flex: 1, minWidth: 200, padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{ padding: "9px 12px", background: "#EFEFE9", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}
              >
                <option>Recruiter</option>
                <option>Viewer</option>
                <option>Admin</option>
              </select>
              <button
                onClick={sendInvite}
                style={{ padding: "9px 18px", background: inviteSent ? "rgba(34,197,94,0.1)" : "rgba(61,78,172,0.12)", border: `1px solid ${inviteSent ? "rgba(34,197,94,0.25)" : "rgba(61,78,172,0.25)"}`, borderRadius: 10, color: inviteSent ? "#1A7A4A" : "#a5b4fc", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
              >
                {inviteSent ? "✓ Invited!" : "Send Invite →"}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {tab === "integrations" && (
        <Section title="Connected Tools" icon="🔌">
          {[
            { key: "slack",      icon: "💬", name: "Slack",       sub: "Get alerts and notifications in Slack"       },
            { key: "greenhouse", icon: "🌿", name: "Greenhouse",  sub: "Sync candidates with your ATS"               },
            { key: "lever",      icon: "⚙️", name: "Lever",       sub: "Push pipeline data to Lever"                 },
            { key: "linkedin",   icon: "💼", name: "LinkedIn",    sub: "Import candidate profiles automatically"     },
            { key: "zapier",     icon: "⚡", name: "Zapier",      sub: "Connect to 5000+ apps via Zapier"            },
            { key: "notion",     icon: "📝", name: "Notion",      sub: "Export reports to your Notion workspace"     },
          ].map((intg) => (
            <Row key={intg.key}
              label={<span>{intg.icon} {intg.name}</span>}
              sub={intg.sub}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {integrations[intg.key] && (
                  <span style={{ fontSize: 11, color: "#1A7A4A" }}>Connected ✓</span>
                )}
                <Toggle
                  value={integrations[intg.key]}
                  onChange={(v) => setIntegrations((p) => ({ ...p, [intg.key]: v }))}
                />
              </div>
            </Row>
          ))}
        </Section>
      )}

      {/* ── BILLING TAB ── */}
      {tab === "billing" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
            <PlanCard
              name="Starter"
              price="$49"
              color="#6B6B68"
              current={false}
              features={["50 candidate views/mo", "Basic search", "1 pipeline", "Email support"]}
            />
            <PlanCard
              name="Pro"
              price="$149"
              color="#3D4EAC"
              current={true}
              features={["Unlimited candidates", "AI DNA matching", "5 pipelines", "Shadow interviews", "Priority support"]}
            />
            <PlanCard
              name="Enterprise"
              price="$499"
              color="#FFD166"
              current={false}
              features={["Everything in Pro", "Team seats (10)", "Custom integrations", "Dedicated CSM", "SLA guarantee"]}
            />
          </div>

          <Section title="Billing Information" icon="💳">
            <Row label="Current Plan" sub="Renews on Apr 7, 2026">
              <span style={{ fontSize: 13, fontWeight: 700, color: "#3D4EAC" }}>Pro — $149/mo</span>
            </Row>
            <Row label="Payment Method" sub="Visa ending in 4242">
              <button style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#6B6B68", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Update Card
              </button>
            </Row>
            <Row label="Invoices" sub="Download past invoices">
              <button style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#6B6B68", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                View Invoices
              </button>
            </Row>
            <Row label="Cancel Subscription" sub="You'll lose access at end of billing period">
              <button style={{ padding: "6px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#fca5a5", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Cancel Plan
              </button>
            </Row>
          </Section>
        </div>
      )}
    </div>
  )
}