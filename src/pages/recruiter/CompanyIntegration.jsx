import { useState } from "react"
import { T, card, cardLg, btn } from "./theme"

// ── Copy to clipboard helper ──────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }).catch((err) => {
      console.error("Failed to copy to clipboard:", err)
    })
  }
  return { copy, copied }
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock({ code, lang = "html", copyKey, onCopy, isCopied }) {
  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#1A1A18" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{lang}</span>
        <button
          onClick={() => onCopy(code, copyKey)}
          style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5, cursor: "pointer", border: "1px solid rgba(255,255,255,0.15)", background: isCopied ? T.green2 : "rgba(255,255,255,0.08)", color: isCopied ? T.green : "rgba(255,255,255,0.6)", transition: "all 0.2s" }}
        >
          {isCopied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "16px", fontSize: 12, lineHeight: 1.7, color: "#E8E8E1", overflowX: "auto", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ icon, value, label, color = T.indigo, trend }) {
  return (
    <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Syne',sans-serif" }}>{value}</div>
      <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{label}</div>
      {trend && <div style={{ fontSize: 11, color: T.green, marginTop: 4 }}>↑ {trend}</div>}
    </div>
  )
}

// ── Source row ────────────────────────────────────────────────────────────────
function SourceRow({ name, apps, dupes, icon, color, bg, lastSeen }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{name}</div>
        <div style={{ fontSize: 11, color: T.ink4, marginTop: 1 }}>Last received {lastSeen}</div>
      </div>
      <div style={{ textAlign: "center", minWidth: 60 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color }}>{apps}</div>
        <div style={{ fontSize: 10, color: T.ink4 }}>applications</div>
      </div>
      {dupes > 0 && (
        <div style={{ textAlign: "center", minWidth: 50 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.amber }}>{dupes}</div>
          <div style={{ fontSize: 10, color: T.ink4 }}>dupes merged</div>
        </div>
      )}
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}70` }} title="Connected" />
    </div>
  )
}

// ── Widget configurator ───────────────────────────────────────────────────────
function WidgetBuilder({ apiKey }) {
  const { copy, copied } = useCopy()
  const [cfg, setCfg] = useState({
    theme: "light",
    accentColor: "#3D4EAC",
    buttonText: "Apply via Capabilio",
    jobId: "JOB-001",
    logoUrl: "",
    redirectUrl: "",
    collectPhone: true,
    collectPortfolio: false,
    requireLinkedIn: false,
  })

  const snippet = `<!-- Capabilio Apply Widget -->
<script>
  window.CapabilioConfig = {
    apiKey: "${apiKey}",
    jobId: "${cfg.jobId}",
    theme: "${cfg.theme}",
    accentColor: "${cfg.accentColor}",
    buttonText: "${cfg.buttonText}",
    collectPhone: ${cfg.collectPhone},
    collectPortfolio: ${cfg.collectPortfolio},
    requireLinkedIn: ${cfg.requireLinkedIn},
    onSuccess: (applicantId) => {
      console.log("Application submitted:", applicantId)
      ${cfg.redirectUrl ? `window.location.href = "${cfg.redirectUrl}"` : "// redirect here if needed"}
    }
  }
</script>
<script src="https://cdn.capabilio.com/widget/v2/apply.min.js" async></script>

<!-- Place this button wherever you want the Apply button to appear -->
<button data-capabilio-apply="${cfg.jobId}">
  ${cfg.buttonText}
</button>`

  const iframeSnippet = `<!-- Capabilio Hosted Career Page (iframe embed) -->
<iframe
  src="https://apply.capabilio.com/${apiKey}/${cfg.jobId}"
  width="100%"
  height="700"
  frameborder="0"
  allow="clipboard-write"
  style="border-radius:12px; border:none;"
/>`

  const set = (key, val) => setCfg(c => ({ ...c, [key]: val }))

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Widget Configuration</div>

          {[
            { label: "Job ID", key: "jobId", type: "text", placeholder: "JOB-001" },
            { label: "Button Text", key: "buttonText", type: "text", placeholder: "Apply via Capabilio" },
            { label: "Redirect URL after apply", key: "redirectUrl", type: "text", placeholder: "https://yoursite.com/thank-you" },
            { label: "Logo URL (optional)", key: "logoUrl", type: "text", placeholder: "https://…/logo.png" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.ink3, display: "block", marginBottom: 4 }}>{label}</label>
              <input
                type={type} value={cfg[key]} onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                style={{ width: "100%", padding: "7px 10px", fontSize: 12, background: T.cream2, border: `1.5px solid ${T.border}`, borderRadius: 7, color: T.ink, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          ))}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.ink3, display: "block", marginBottom: 4 }}>Accent Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="color" value={cfg.accentColor} onChange={e => set("accentColor", e.target.value)}
                style={{ width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${T.border}`, cursor: "pointer", padding: 2, background: T.cream2 }} />
              <span style={{ fontSize: 12, color: T.ink2 }}>{cfg.accentColor}</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.ink3, display: "block", marginBottom: 6 }}>Theme</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["light", "dark"].map(t => (
                <button key={t} onClick={() => set("theme", t)} style={{
                  fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 7, cursor: "pointer", border: `1.5px solid ${cfg.theme === t ? T.indigo : T.border}`,
                  background: cfg.theme === t ? T.indigo3 : "transparent", color: cfg.theme === t ? T.indigo : T.ink3,
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { key: "collectPhone", label: "Collect phone number" },
              { key: "collectPortfolio", label: "Collect portfolio URL" },
              { key: "requireLinkedIn", label: "Require LinkedIn profile" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={cfg[key]} onChange={e => set(key, e.target.checked)}
                  style={{ accentColor: T.indigo, width: 15, height: 15 }} />
                <span style={{ fontSize: 12, color: T.ink2 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Code output + preview */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Live button preview */}
        <div style={{ ...card, display: "flex", gap: 20, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, marginBottom: 10 }}>BUTTON PREVIEW</div>
            <button style={{
              padding: "10px 22px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: cfg.accentColor, color: "#fff", border: "none",
              boxShadow: `0 4px 16px ${cfg.accentColor}44`,
            }}>
              {cfg.buttonText || "Apply via Capabilio"}
            </button>
          </div>
          <div style={{ flex: 1, padding: "12px 16px", background: T.indigo3, borderRadius: 10, border: `1px solid ${T.indigo}22` }}>
            <div style={{ fontSize: 11, color: T.indigo, fontWeight: 700, marginBottom: 4 }}>✓ What happens when clicked</div>
            <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.6 }}>
              A Capabilio-hosted modal opens → candidate fills resume + details → application lands in your <b>Applications</b> inbox instantly, tagged with source "Company Website", ELO-scored, deduped against existing profiles.
            </div>
          </div>
        </div>

        {/* JS snippet */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink2, marginBottom: 8 }}>Option 1 — JavaScript Embed (Button)</div>
          <CodeBlock code={snippet} lang="html" copyKey="snippet" onCopy={copy} isCopied={copied === "snippet"} />
        </div>

        {/* iFrame snippet */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink2, marginBottom: 8 }}>Option 2 — Hosted iframe (Full Application Form)</div>
          <CodeBlock code={iframeSnippet} lang="html" copyKey="iframe" onCopy={copy} isCopied={copied === "iframe"} />
        </div>
      </div>
    </div>
  )
}

// ── API & Webhooks tab ────────────────────────────────────────────────────────
function APIWebhooks({ apiKey }) {
  const { copy, copied } = useCopy()
  const [webhookUrl, setWebhookUrl] = useState("")
  const [events, setEvents] = useState({ "application.received": true, "application.screened": true, "interview.scheduled": false, "offer.sent": false })

  const curlExample = `curl -X POST https://api.capabilio.com/v1/applications \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jobId": "JOB-001",
    "candidate": {
      "name": "Arjun Mehta",
      "email": "arjun@example.com",
      "phone": "+91 98765 43210",
      "resumeUrl": "https://…/resume.pdf",
      "source": "Company Website",
      "linkedinUrl": "https://linkedin.com/in/arjun"
    }
  }'`

  const webhookPayload = `// POST to your webhook URL on each event
{
  "event": "application.received",
  "timestamp": "2026-05-31T10:23:00Z",
  "data": {
    "applicationId": "APP-7829",
    "jobId": "JOB-001",
    "candidate": {
      "id": "CAND-441",
      "name": "Arjun Mehta",
      "eloScore": 1042,
      "matchScore": 87,
      "source": "Company Website",
      "isDedup": false
    }
  }
}`

  const toggleEvent = (k) => setEvents(e => ({ ...e, [k]: !e[k] }))

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* API Key */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>API Key</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              readOnly value={apiKey}
              style={{ flex: 1, padding: "8px 12px", fontSize: 12, background: T.cream2, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink3, fontFamily: "monospace", outline: "none" }}
            />
            <button onClick={() => copy(apiKey, "apikey")} style={{ ...btn.indigo, fontSize: 12 }}>
              {copied === "apikey" ? "✓" : "Copy"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: T.ink4, marginTop: 8 }}>Keep this secret. Never expose in frontend code.</div>
          <button style={{ ...btn.outline, fontSize: 12, marginTop: 10, color: T.red, borderColor: `${T.red}44` }}>Regenerate Key</button>
        </div>

        {/* Webhook config */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Webhook Endpoint</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://yourapp.com/webhooks/capabilio"
              style={{ flex: 1, padding: "8px 12px", fontSize: 12, background: T.cream2, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, outline: "none" }}
            />
            <button style={{ ...btn.primary, fontSize: 12 }}>Save</button>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.04em", marginBottom: 8 }}>TRIGGER ON EVENTS</div>
          {Object.entries(events).map(([k, v]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={v} onChange={() => toggleEvent(k)} style={{ accentColor: T.indigo, width: 14, height: 14 }} />
              <span style={{ fontSize: 12, color: T.ink2 }}>{k}</span>
            </label>
          ))}
          <button style={{ ...btn.indigo, fontSize: 12, marginTop: 8 }}>Test Webhook →</button>
        </div>
      </div>

      {/* Code examples */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink2, marginBottom: 8 }}>POST Application via REST API</div>
          <CodeBlock code={curlExample} lang="curl" copyKey="curl" onCopy={copy} isCopied={copied === "curl"} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink2, marginBottom: 8 }}>Webhook Payload (application.received)</div>
          <CodeBlock code={webhookPayload} lang="json" copyKey="webhook" onCopy={copy} isCopied={copied === "webhook"} />
        </div>

        {/* Rate limits */}
        <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Rate Limits & Quotas</div>
          {[
            ["POST /applications", "500 req/min"],
            ["GET /candidates",    "200 req/min"],
            ["Webhook delivery",   "Retries 3× (exp. backoff)"],
            ["Payload size",       "Max 10MB (resume PDF)"],
          ].map(([endpoint, limit]) => (
            <div key={endpoint} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 11, color: T.ink3, fontFamily: "monospace" }}>{endpoint}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.ink }}>{limit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Incoming traffic tab ──────────────────────────────────────────────────────
function IncomingTraffic() {
  const SOURCES_DATA = [
    { name:"Company Website (Widget)", apps:247, dupes:18, icon:"🌐", color:T.indigo, bg:T.indigo3, lastSeen:"2 min ago" },
    { name:"API / Webhook",            apps:134, dupes:9,  icon:"⚡", color:T.blue,   bg:T.blue2,   lastSeen:"8 min ago" },
    { name:"Referral Links",           apps:89,  dupes:4,  icon:"🔗", color:T.green,  bg:T.green2,  lastSeen:"1 hr ago" },
    { name:"Capabilio Platform",       apps:412, dupes:22, icon:"◆",  color:T.amber,  bg:T.amber2,  lastSeen:"< 1 min"  },
    { name:"LinkedIn Import (CSV)",    apps:67,  dupes:31, icon:"💼", color:T.ink3,   bg:T.cream3,  lastSeen:"Yesterday" },
  ]

  const RECENT_APPS = [
    { name:"Arjun Mehta",    role:"Sr. Backend Eng.",    source:"Company Website", score:87, time:"2m ago",  color:T.indigo },
    { name:"Priya Sharma",   role:"Product Manager",      source:"API/Webhook",    score:79, time:"8m ago",  color:T.blue   },
    { name:"Ravi Nair",      role:"Data Scientist",       source:"Referral",       score:91, time:"14m ago", color:T.green  },
    { name:"Deepika Rao",    role:"UX Designer",          source:"Company Website",score:74, time:"22m ago", color:T.indigo },
    { name:"Kiran Patel",    role:"DevOps Lead",          source:"Capabilio",      score:83, time:"31m ago", color:T.amber  },
    { name:"Sneha Iyer",     role:"ML Engineer",          source:"LinkedIn Import",score:68, time:"1h ago",  color:T.ink3   },
  ]

  const totalApps = SOURCES_DATA.reduce((s, d) => s + d.apps, 0)
  const totalDupes = SOURCES_DATA.reduce((s, d) => s + d.dupes, 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <StatTile icon="📥" value={totalApps} label="Total Applications" color={T.indigo} trend="32 today" />
        <StatTile icon="♻️" value={totalDupes} label="Duplicates Merged" color={T.amber} trend="Saved 84 reviews" />
        <StatTile icon="⚡" value="1.2s" label="Avg. Ingest Latency" color={T.green} trend="99.9% uptime" />
        <StatTile icon="🧠" value="94%" label="Auto-Parsed by AI" color={T.blue} trend="Resume + ELO scored" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        {/* Source breakdown */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, marginBottom: 12 }}>Connected Sources</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SOURCES_DATA.map(s => <SourceRow key={s.name} {...s} />)}
          </div>

          {/* Channel bar chart */}
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Applications by Source (Last 30 Days)</div>
            {SOURCES_DATA.map(s => (
              <div key={s.name} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: T.ink2 }}>{s.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.apps}</span>
                </div>
                <div style={{ height: 6, background: T.cream3, borderRadius: 3 }}>
                  <div style={{ width: `${Math.round((s.apps / SOURCES_DATA[3].apps) * 100)}%`, height: "100%", background: s.color, borderRadius: 3, opacity: 0.85 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live feed */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>📡 Live Application Feed</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: T.green2, borderRadius: 20, padding: "3px 8px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 10, color: T.green, fontWeight: 600 }}>LIVE</span>
            </div>
          </div>
          {RECENT_APPS.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: a.color, flexShrink: 0 }}>
                {a.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{a.name}</div>
                <div style={{ fontSize: 11, color: T.ink3 }}>{a.role}</div>
                <div style={{ fontSize: 10, color: a.color, marginTop: 2 }}>{a.source}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: a.score >= 80 ? T.green : a.score >= 65 ? T.indigo : T.amber }}>{a.score}%</div>
                <div style={{ fontSize: 10, color: T.ink4 }}>{a.time}</div>
              </div>
            </div>
          ))}
          <button style={{ ...btn.indigo, width: "100%", textAlign: "center", marginTop: 12, fontSize: 12 }}>
            View All in Applications →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Career Page Builder tab ───────────────────────────────────────────────────
function CareerPageBuilder({ apiKey }) {
  const { copy, copied } = useCopy()
  const [selectedJob, setSelectedJob] = useState("JOB-001")
  const JOBS = [
    { id:"JOB-001", title:"Senior Backend Engineer", dept:"Engineering", type:"Full-time", location:"Remote" },
    { id:"JOB-002", title:"Product Manager – Growth", dept:"Product", type:"Full-time", location:"Bangalore" },
    { id:"JOB-003", title:"Lead Data Scientist",     dept:"Data",    type:"Full-time", location:"Hybrid"  },
  ]
  const job = JOBS.find(j => j.id === selectedJob) || JOBS[0]
  const hostedUrl = `https://apply.capabilio.com/${apiKey.slice(0,8)}/${selectedJob}`

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      {/* Job selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Select Job Posting</div>
          {JOBS.map(j => (
            <div
              key={j.id}
              onClick={() => setSelectedJob(j.id)}
              style={{
                padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 6,
                background: selectedJob === j.id ? T.indigo3 : T.cream2,
                border: `1.5px solid ${selectedJob === j.id ? T.indigo : T.border}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{j.title}</div>
              <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{j.dept} · {j.type} · {j.location}</div>
            </div>
          ))}
        </div>

        {/* Hosted URL */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Hosted Apply Page URL</div>
          <div style={{ fontSize: 12, color: T.ink3, wordBreak: "break-all", padding: "8px 10px", background: T.cream2, borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: "monospace" }}>
            {hostedUrl}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => copy(hostedUrl, "url")} style={{ ...btn.indigo, fontSize: 12, flex: 1, textAlign: "center" }}>
              {copied === "url" ? "✓ Copied" : "Copy URL"}
            </button>
            <button style={{ ...btn.outline, fontSize: 12 }}>Preview ↗</button>
          </div>
        </div>

        <div style={{ ...card, background: T.indigo3, border: `1px solid ${T.indigo}22` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.indigo, marginBottom: 6 }}>💡 How to use</div>
          <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.6 }}>
            Share this URL on your careers page, LinkedIn, or social media. Candidates apply directly and the application hits your Capabilio inbox — already ELO-scored, resume-parsed, and deduped.
          </div>
        </div>
      </div>

      {/* Preview mockup */}
      <div style={{ background: T.cream2, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        {/* Browser chrome */}
        <div style={{ background: T.cream3, padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[T.red, T.amber, T.green].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, background: T.cream, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: T.ink3, fontFamily: "monospace" }}>
            {hostedUrl}
          </div>
        </div>

        {/* Mock apply page */}
        <div style={{ padding: 28, fontFamily: "DM Sans, sans-serif" }}>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {/* Company header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: T.indigo3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>◆</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Your Company</div>
                <div style={{ fontSize: 11, color: T.ink4 }}>Powered by Capabilio</div>
              </div>
            </div>

            {/* Job title */}
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, marginBottom: 4 }}>{job.title}</h1>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[job.dept, job.type, job.location].map(t => (
                <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: T.indigo3, color: T.indigo, fontWeight: 600 }}>{t}</span>
              ))}
            </div>

            {/* Form mockup */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Full Name","text"],["Email Address","email"],["Phone Number","tel"]].map(([label, type]) => (
                <div key={label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.ink3, display: "block", marginBottom: 4 }}>{label}</label>
                  <div style={{ padding: "9px 12px", background: T.cream, border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.ink4 }}>—</div>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.ink3, display: "block", marginBottom: 4 }}>Resume / CV</label>
                <div style={{ padding: "20px", border: `2px dashed ${T.border}`, borderRadius: 10, textAlign: "center", color: T.ink4, fontSize: 12 }}>
                  📎 Drop resume here or click to upload
                </div>
              </div>
              <button style={{ ...btn.primary, textAlign: "center", marginTop: 4, background: T.indigo }}>
                Submit Application →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const TABS = [
  { id:"widget",  label:"🔌 Widget Builder"   },
  { id:"api",     label:"⚡ API & Webhooks"    },
  { id:"career",  label:"🌐 Career Page"       },
  { id:"traffic", label:"📥 Incoming Traffic"  },
]

const MOCK_API_KEY = "cap_live_xK9mP2qN7rL4tW8vB3hJ6cF1dA5sE0uY"

export default function CompanyIntegration() {
  const [tab, setTab] = useState("widget")

  return (
    <div style={{ padding: "24px", background: T.cream2, minHeight: "100%", fontFamily: "DM Sans, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}>Company Website Integration</h1>
          <p style={{ fontSize: 13, color: T.ink3, margin: "4px 0 0" }}>
            Connect your careers page to Capabilio — every application lands in one intelligent pipeline
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: T.green2, border: `1px solid ${T.green}22`, borderRadius: 20 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.green }}>3 Sources Connected</span>
          </div>
          <button style={{ ...btn.primary, fontSize: 12 }}>+ Add Source</button>
        </div>
      </div>

      {/* How it works strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0, marginBottom: 24, background: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        {[
          { step:"1", icon:"🌐", title:"Embed on your site",  desc:"Add our JS widget or iframe to your careers page in < 5 min" },
          { step:"2", icon:"📝", title:"Candidate applies",   desc:"They fill Capabilio's smart form — resume + LinkedIn in one click" },
          { step:"3", icon:"🧠", title:"AI parses instantly", desc:"Resume parsed, ELO scored, and deduplicated in < 2 seconds" },
          { step:"4", icon:"📥", title:"Lands in your inbox", desc:"Appears in Applications tab, ranked by match score" },
          { step:"5", icon:"🚀", title:"Full lifecycle begins",desc:"Screen → interview → offer → hire — all in one place" },
        ].map((s, i) => (
          <div key={s.step} style={{
            padding: "16px 18px",
            borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.indigo, background: T.indigo3, borderRadius: 4, padding: "1px 6px" }}>STEP {s.step}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{s.title}</div>
            <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: T.cream3, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {TABS.map(t => (
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

      {/* Tab content */}
      {tab === "widget"  && <WidgetBuilder apiKey={MOCK_API_KEY} />}
      {tab === "api"     && <APIWebhooks apiKey={MOCK_API_KEY} />}
      {tab === "career"  && <CareerPageBuilder apiKey={MOCK_API_KEY} />}
      {tab === "traffic" && <IncomingTraffic />}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
