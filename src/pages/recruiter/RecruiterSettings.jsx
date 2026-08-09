import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
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
  sectionTitle:{ fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 700, color: "#1A1A18" },
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
        fontSize: 13, fontFamily: "'Inter',sans-serif",
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
  input:     { padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, color: "#1A1A18", fontSize: 12, fontFamily: "'Inter',sans-serif", width: 140 },
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function RecruiterSettings() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState("profile")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return
      if (error) { console.error("Failed to load auth user:", error); return }
      setUser(data.user)
      setDisplayName(data.user?.user_metadata?.display_name || "")
    })
    return () => { cancelled = true }
  }, [])

  // Profile
  const [displayName, setDisplayName] = useState("")
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

  // Team — 2026-08-09: was 2 hardcoded fake names (sarah@company.com,
  // james@company.com) with an "invite" button that only pushed into local
  // React state (nothing persisted, nothing sent). Now reads the real
  // `recruiters` table (RLS: you always see your own row; company
  // admins/owners see the whole company's roster). There is currently no
  // real "invite a teammate into my existing company" backend flow -- the
  // only invite mechanism in this codebase (`invites` table, AdminPanel.jsx)
  // is platform-admin-only and provisions a brand NEW company, not a seat on
  // an existing one. Building that safely means touching the shared
  // signup/invite path (a security-sensitive auth flow) -- not done blind in
  // this pass. See the honest "not available yet" state below instead of a
  // fake button.
  const [teamMembers,    setTeamMembers]    = useState([])
  const [loadingTeam,    setLoadingTeam]    = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from("recruiters")
      .select("id, email, display_name, role, plan")
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error("Failed to load team:", error); setLoadingTeam(false); return }
        setTeamMembers(data || [])
        setLoadingTeam(false)
      })
    return () => { cancelled = true }
  }, [user])

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
    let cancelled = false
    supabase
      .from("recruiter_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: d, error }) => {
        if (cancelled) return
        if (error) { console.error("Failed to load recruiter profile:", error); return }
        if (d) {
          setCompany(d.company_display || "")
          setRole(d.title              || "")
          setBio(d.bio                 || "")
          setWebsite(d.website         || "")
          setDomains(d.domains         || [])
          setKeywords(d.keywords       || [])
          setMinElo(String(d.min_elo        ?? 900))
          setMinReadiness(String(d.min_readiness ?? 60))
          setHiringCount(String(d.hiring_count  ?? 5))
          if (d.notifs)       setNotifs((p) => ({ ...p, ...d.notifs }))
          if (d.integrations) setIntegrations((p) => ({ ...p, ...d.integrations }))
        }
      })
    return () => { cancelled = true }
  }, [user])

  const save = async () => {
    if (!user || saving) return
    setSaving(true)
    try {
      const { error: authErr } = await supabase.auth.updateUser({ data: { display_name: displayName } })
      if (authErr) throw authErr
      const { error: profileErr } = await supabase.from("recruiter_profiles").upsert({
        id: user.id,
        company_display: company,
        title: role,
        bio, website,
        domains, keywords,
        min_elo: Number(minElo),
        min_readiness: Number(minReadiness),
        hiring_count: Number(hiringCount),
        notifs, integrations,
        updated_at: new Date().toISOString(),
      })
      if (profileErr) throw profileErr
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // 2026-08-09: Change Password is real (Supabase's native reset-email
  // flow) -- Change Photo/Change Email need real storage/re-confirmation
  // wiring not built yet, so they stay honest disabled placeholders below
  // rather than fake no-op buttons.
  const [resetSent, setResetSent] = useState(false)
  const [resetSending, setResetSending] = useState(false)
  const sendPasswordReset = async () => {
    if (!user?.email || resetSending) return
    setResetSending(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email)
      if (error) throw error
      setResetSent(true)
      setTimeout(() => setResetSent(false), 4000)
    } catch (err) {
      console.error("Failed to send password reset:", err)
    } finally {
      setResetSending(false)
    }
  }

  const myPlan = teamMembers.find((m) => m.id === user?.id)?.plan || "free"

  const TABS = [
    { key: "profile",       label: "👤 Profile"       },
    { key: "notifications", label: "🔔 Notifications"  },
    { key: "hiring",        label: "🎯 Hiring Prefs"   },
    { key: "team",          label: "👥 Team"           },
    { key: "integrations",  label: "🔌 Integrations"   },
    { key: "billing",       label: "💳 Billing"        },
  ]

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: "#1A1A18", maxWidth: 900 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        input::placeholder { color: #334155; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #3D4EAC !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(61,78,172,0.3); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A18", margin: 0 }}>
            ⚙️ Settings
          </h1>
          <p style={{ fontSize: 13, color: "#3A3A38", marginTop: 4, margin: "4px 0 0" }}>
            Manage your recruiter profile and preferences
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: "9px 20px",
            background: saved ? "rgba(34,197,94,0.15)" : "linear-gradient(135deg,#3D4EAC,#8b5cf6)",
            border: saved ? "1px solid rgba(34,197,94,0.3)" : "none",
            borderRadius: 10, color: saved ? "#1A7A4A" : "#1A1A18",
            fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            fontFamily: "'Inter',sans-serif", transition: "all 0.3s",
          }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "💾 Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "8px 14px", background: tab === t.key ? "rgba(61,78,172,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${tab === t.key ? "rgba(61,78,172,0.25)" : "rgba(26,26,24,0.07)"}`, borderRadius: 10, color: tab === t.key ? "#a5b4fc" : "#3A3A38", fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.2s" }}>
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
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, color: "#1A1A18" }}>
                {(displayName || user?.email || "R").charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{displayName || "Recruiter"}</div>
                <div style={{ fontSize: 12, color: "#E8E8E1" }}>{user?.email}</div>
                <button title="Not available yet" disabled style={{ marginTop: 6, padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(26,26,24,0.07)", borderRadius: 6, color: "#E8E8E1", fontSize: 11, cursor: "not-allowed", fontFamily: "'Inter',sans-serif" }}>
                  Change Photo (soon)
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
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#1A1A18", fontSize: 13, fontFamily: "'Inter',sans-serif", resize: "vertical" }}
              />
            </div>
          </Section>

          <Section title="Account" icon="🔐">
            <Row label="Email Address" sub={user?.email}>
              <button title="Not available yet" disabled style={{ padding: "6px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(26,26,24,0.05)", borderRadius: 8, color: "#E8E8E1", fontSize: 12, cursor: "not-allowed", fontFamily: "'Inter',sans-serif" }}>
                Change Email (soon)
              </button>
            </Row>
            <Row label="Password" sub="We'll email you a reset link">
              <button onClick={sendPasswordReset} disabled={resetSending}
                style={{ padding: "6px 14px", background: resetSent ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${resetSent ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, color: resetSent ? "#1A7A4A" : "#6B6B68", fontSize: 12, cursor: resetSending ? "default" : "pointer", fontFamily: "'Inter',sans-serif" }}>
                {resetSending ? "Sending…" : resetSent ? "✓ Reset link sent" : "Send Reset Link"}
              </button>
            </Row>
            <Row label="Two-Factor Auth" sub="Not available yet">
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
            {loadingTeam ? (
              <div style={{ fontSize: 13, color: "#E8E8E1", padding: "10px 0" }}>Loading team…</div>
            ) : teamMembers.length === 0 ? (
              <div style={{ fontSize: 13, color: "#E8E8E1", padding: "10px 0" }}>No team members found.</div>
            ) : (
              teamMembers.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#3D4EAC,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 14, color: "#1A1A18", flexShrink: 0 }}>
                    {(m.display_name || m.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>
                      {m.display_name || m.email}{m.id === user?.id ? " (you)" : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#E8E8E1" }}>{m.email}</div>
                  </div>
                  <div style={{ fontSize: 11, padding: "3px 10px", background: m.role === "admin" || m.role === "owner" ? "rgba(61,78,172,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${m.role === "admin" || m.role === "owner" ? "rgba(61,78,172,0.2)" : "rgba(26,26,24,0.07)"}`, borderRadius: 20, color: m.role === "admin" || m.role === "owner" ? "#a5b4fc" : "#3A3A38", textTransform: "capitalize" }}>
                    {m.role}
                  </div>
                </div>
              ))
            )}
            <div style={{ fontSize: 11, color: "#E8E8E1", marginTop: 10 }}>
              {teamMembers.length <= 1
                ? "Only admins/owners can see the full team roster -- you may have teammates not shown here."
                : "Roster reflects real recruiter accounts on your company."}
            </div>
          </Section>

          <Section title="Invite Team Member" icon="✉️">
            <div style={{ fontSize: 13, color: "#3A3A38", lineHeight: 1.6 }}>
              Inviting a teammate directly into your company isn't available yet -- the only invite mechanism this
              product has today provisions a brand-new company account, not a seat on an existing one. Building that
              safely means changes to the signup flow itself, which hasn't been done. New teammates can sign up and
              a platform admin can link their account to your company in the meantime.
            </div>
          </Section>
        </div>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {/* 2026-08-09: toggles used to flip local/DB boolean state and show a
          "Connected ✓" badge with no real OAuth ever happening -- a
          recruiter could believe Slack alerts were live when nothing was
          wired. No integration here has a real OAuth app registered
          anywhere in this codebase, so every one is now an honest
          "Not available yet" row instead of a fake toggle. */}
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
              sub="Not available yet"
            >
              <span style={{ fontSize: 11, color: "#E8E8E1" }}>Coming soon</span>
            </Row>
          ))}
        </Section>
      )}

      {/* ── BILLING TAB ── */}
      {tab === "billing" && (
        <div>
          {/* 2026-08-09: was 3 fully hardcoded PlanCards ($49/$149/$499,
              "Current Plan" always Pro) and Payment Method/Invoices/Cancel
              buttons with no onClick at all -- no Stripe or any billing
              provider is wired anywhere in this codebase. "Current Plan"
              below now shows the real recruiters.plan column (defaults to
              "free" for every real account); everything else is an honest
              "not available yet" instead of decorative buttons. */}
          <Section title="Billing Information" icon="💳">
            <Row label="Current Plan" sub="Real, from your account">
              <span style={{ fontSize: 13, fontWeight: 700, color: "#3D4EAC", textTransform: "capitalize" }}>{myPlan}</span>
            </Row>
            <Row label="Payment Method" sub="Billing isn't available yet">
              <button title="Not available yet" disabled style={{ padding: "6px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(26,26,24,0.05)", borderRadius: 8, color: "#E8E8E1", fontSize: 12, cursor: "not-allowed", fontFamily: "'Inter',sans-serif" }}>
                Update Card
              </button>
            </Row>
            <Row label="Invoices" sub="Billing isn't available yet">
              <button title="Not available yet" disabled style={{ padding: "6px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(26,26,24,0.05)", borderRadius: 8, color: "#E8E8E1", fontSize: 12, cursor: "not-allowed", fontFamily: "'Inter',sans-serif" }}>
                View Invoices
              </button>
            </Row>
            <Row label="Plan Changes" sub="Billing isn't available yet">
              <button title="Not available yet" disabled style={{ padding: "6px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(26,26,24,0.05)", borderRadius: 8, color: "#E8E8E1", fontSize: 12, cursor: "not-allowed", fontFamily: "'Inter',sans-serif" }}>
                Contact Us
              </button>
            </Row>
          </Section>
        </div>
      )}
    </div>
  )
}