/**
 * AdminPanel.jsx
 * Only accessible to recruiters with recruiters.is_platform_admin = true.
 * The `isPlatformAdmin` prop is a UX-level shortcut only — the real
 * enforcement is server-side RLS on access_requests/invites (see
 * public.is_platform_admin() and the *_admin_* policies), so even if this
 * client-side guard were bypassed, a non-admin's queries would return
 * nothing and their writes would be rejected by Postgres.
 * Route: /recruiter/admin
 *
 * Features:
 *  - View all pending access requests
 *  - Approve → generates invite token, shows copy-able link
 *  - Reject → marks request as rejected
 *  - View all sent invites and their status (used / expired / pending)
 */

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const BASE_URL = "https://recruiter.capabilio.online/recruiter";

/** Merge a Supabase Realtime postgres_changes payload into a locally-held,
 * created_at-desc-sorted list keyed by `idKey`. */
function applyRealtimeChange(prev, payload, idKey = "id") {
  if (payload.eventType === "INSERT") {
    const next = [...prev, payload.new];
    next.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return next;
  }
  if (payload.eventType === "UPDATE") {
    return prev.map((r) => (r[idKey] === payload.new[idKey] ? payload.new : r));
  }
  if (payload.eventType === "DELETE") {
    return prev.filter((r) => r[idKey] !== payload.old[idKey]);
  }
  return prev;
}

const T = {
  bg:      "#FAF8F5",
  bg2:     "#F3F0EB",
  bg3:     "#EDE9E2",
  white:   "#FFFFFF",
  orange:  "#FF4A1C",
  orange2: "#FFF2EE",
  dark:    "#0C0C10",
  dark2:   "#1E1E28",
  dark3:   "#4A4A5A",
  dark4:   "#8A8A9A",
  green:   "#16a34a",
  green2:  "#dcfce7",
  red:     "#C0392B",
  red2:    "#FDECEA",
  yellow:  "#d97706",
  yellow2: "#fef3c7",
  border:  "rgba(12,12,16,0.08)",
};

/** Generate a random 32-char hex token */
const genToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export default function AdminPanel({ isPlatformAdmin }) {
  const [tab, setTab]         = useState("requests"); // "requests" | "invites"
  const [requests, setRequests] = useState([]);
  const [invites, setInvites]   = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [working, setWorking]   = useState(null); // id of row being processed

  // ── Live data ─────────────────────────────────────────────────────────────
  // Hooks must run unconditionally on every render (rules-of-hooks) — the
  // isPlatformAdmin guard below only skips *rendering*, not these effects.
  // Non-admins simply get RLS-empty results/errors here, which is harmless.
  useEffect(() => {
    if (!isPlatformAdmin) return;
    let cancelled = false;
    supabase.from("access_requests").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error("Failed to load access requests:", error); return; }
        setRequests(data || []);
      });
    const channel = supabase
      .channel("access_requests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "access_requests" },
        (payload) => setRequests((prev) => applyRealtimeChange(prev, payload)))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [isPlatformAdmin]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    let cancelled = false;
    supabase.from("invites").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error("Failed to load invites:", error); return; }
        setInvites(data || []);
      });
    const channel = supabase
      .channel("invites-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "invites" },
        (payload) => setInvites((prev) => applyRealtimeChange(prev, payload, "token")))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [isPlatformAdmin]);

  // ── Access guard (UX only — see file header re: RLS) ───────────────────────
  if (!isPlatformAdmin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <div style={{ textAlign: "center", color: T.dark3 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Access denied.</p>
          <p style={{ fontSize: 14, marginTop: 6 }}>This page is restricted to admins.</p>
        </div>
      </div>
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const approve = async (req) => {
    setWorking(req.id);
    try {
      const token     = genToken();
      const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();

      const { error: insertErr } = await supabase.from("invites").insert({
        token,
        email: req.email,
        company_name: req.company_name || "",
        role: "recruiter",
        used: false,
        expires_at: expiresAt,
        request_id: req.id,
      });
      if (insertErr) throw insertErr;

      const { error: updateErr } = await supabase.from("access_requests").update({
        status: "approved",
        invite_token: token,
        approved_at: new Date().toISOString(),
      }).eq("id", req.id);
      if (updateErr) throw updateErr;
    } catch (err) {
      console.error("Failed to approve request:", err);
    } finally {
      setWorking(null);
    }
  };

  const reject = async (req) => {
    setWorking(req.id);
    try {
      const { error } = await supabase.from("access_requests").update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
      }).eq("id", req.id);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to reject request:", err);
    } finally {
      setWorking(null);
    }
  };

  const copyLink = (token) => {
    const url = `${BASE_URL}?invite=${token}`;
    navigator.clipboard.writeText(url).catch((err) => console.error("Clipboard write failed:", err));
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const pending  = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");

  const inviteStatus = (inv) => {
    if (inv.used) return { label: "Used", color: T.dark4, bg: T.bg3 };
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) return { label: "Expired", color: T.red, bg: T.red2 };
    return { label: "Active", color: T.green, bg: T.green2 };
  };

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .row-hover:hover { background: ${T.bg2} !important; }
        .btn-approve:hover { background: #15803d !important; }
        .btn-reject:hover  { background: #b91c1c !important; }
        .btn-copy:hover    { background: #e03c10 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Admin Panel</h1>
          <p style={S.subtitle}>Manage recruiter access requests &amp; invite links</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ padding:"8px 16px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.dark3, cursor:"pointer", fontFamily:"'Inter',sans-serif", marginBottom:8 }}
        >
          Sign out
        </button>
        <div style={S.statsRow}>
          <div style={S.stat}>
            <span style={{ ...S.statNum, color: T.yellow }}>{pending.length}</span>
            <span style={S.statLbl}>Pending</span>
          </div>
          <div style={S.stat}>
            <span style={{ ...S.statNum, color: T.green }}>{approved.length}</span>
            <span style={S.statLbl}>Approved</span>
          </div>
          <div style={S.stat}>
            <span style={{ ...S.statNum, color: T.dark4 }}>{invites.filter(i => !i.used && i.expires_at && new Date(i.expires_at) > new Date()).length}</span>
            <span style={S.statLbl}>Active Invites</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        {[
          { key: "requests", label: `Access Requests (${requests.length})` },
          { key: "invites",  label: `Invite Links (${invites.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ ...S.tabBtn, ...(tab === t.key ? S.tabActive : S.tabInactive) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ACCESS REQUESTS TAB ── */}
      {tab === "requests" && (
        <div style={S.tableWrap}>
          {requests.length === 0 ? (
            <div style={S.empty}>No access requests yet.</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr style={S.thead}>
                  {["Name", "Email", "Company", "Role/Title", "Requested", "Status", "Actions"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="row-hover" style={S.tr}>
                    <td style={S.td}><strong>{req.name}</strong></td>
                    <td style={{ ...S.td, color: T.dark3 }}>{req.email}</td>
                    <td style={S.td}>{req.company_name || "—"}</td>
                    <td style={{ ...S.td, color: T.dark3 }}>{req.title || "—"}</td>
                    <td style={{ ...S.td, color: T.dark4, fontSize: 12 }}>
                      {req.created_at ? new Date(req.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={S.td}>
                      <StatusBadge status={req.status} />
                    </td>
                    <td style={S.td}>
                      {req.status === "pending" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn-approve"
                            disabled={working === req.id}
                            onClick={() => approve(req)}
                            style={S.btnApprove}
                          >
                            {working === req.id ? <Spinner /> : "✓ Approve"}
                          </button>
                          <button
                            className="btn-reject"
                            disabled={working === req.id}
                            onClick={() => reject(req)}
                            style={S.btnReject}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                      {req.status === "approved" && req.invite_token && (
                        <button
                          className="btn-copy"
                          onClick={() => copyLink(req.invite_token)}
                          style={S.btnCopy}
                        >
                          {copiedId === req.invite_token ? "✓ Copied!" : "Copy invite link"}
                        </button>
                      )}
                      {req.status === "rejected" && (
                        <span style={{ fontSize: 12, color: T.dark4 }}>No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── INVITES TAB ── */}
      {tab === "invites" && (
        <div style={S.tableWrap}>
          {invites.length === 0 ? (
            <div style={S.empty}>No invite links generated yet.</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr style={S.thead}>
                  {["Email", "Company", "Role", "Created", "Expires", "Status", "Action"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => {
                  const st = inviteStatus(inv);
                  return (
                    <tr key={inv.token} className="row-hover" style={S.tr}>
                      <td style={S.td}><strong>{inv.email}</strong></td>
                      <td style={{ ...S.td, color: T.dark3 }}>{inv.company_name || "—"}</td>
                      <td style={S.td}>{inv.role || "recruiter"}</td>
                      <td style={{ ...S.td, color: T.dark4, fontSize: 12 }}>
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </td>
                      <td style={{ ...S.td, color: T.dark4, fontSize: 12 }}>
                        {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td style={S.td}>
                        <span style={{ ...S.badge, color: st.color, background: st.bg }}>{st.label}</span>
                      </td>
                      <td style={S.td}>
                        {!inv.used && (
                          <button
                            className="btn-copy"
                            onClick={() => copyLink(inv.token)}
                            style={S.btnCopy}
                          >
                            {copiedId === inv.token ? "✓ Copied!" : "Copy link"}
                          </button>
                        )}
                        {inv.used && <span style={{ fontSize: 12, color: T.dark4 }}>Used</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invite URL format hint */}
      <div style={S.hint}>
        <strong>Invite URL format:</strong>{" "}
        <code style={S.code}>{BASE_URL}?invite=TOKEN</code>
        {" "}— send via email, WhatsApp, or any channel. Single-use, expires in 7 days.
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:  { label: "Pending",  color: T.yellow, bg: T.yellow2 },
    approved: { label: "Approved", color: T.green,  bg: T.green2  },
    rejected: { label: "Rejected", color: T.red,    bg: T.red2    },
  };
  const s = map[status] || map.pending;
  return <span style={{ ...S.badge, color: s.color, background: s.bg }}>{s.label}</span>;
}

function Spinner() {
  return <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />;
}

const S = {
  root: {
    minHeight: "100vh", background: T.bg,
    fontFamily: "'Inter', sans-serif", color: T.dark,
    padding: "32px 40px",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 32,
  },
  title: { fontSize: 26, fontWeight: 700, color: T.dark, marginBottom: 4 },
  subtitle: { fontSize: 14, color: T.dark3 },
  statsRow: { display: "flex", gap: 32 },
  stat: { textAlign: "right" },
  statNum: { display: "block", fontSize: 28, fontWeight: 700 },
  statLbl: { fontSize: 12, color: T.dark4, fontWeight: 500 },
  tabBar: { display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 },
  tabBtn: {
    padding: "10px 20px", border: "none", cursor: "pointer",
    fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif",
    borderRadius: "8px 8px 0 0", transition: "all 0.15s",
  },
  tabActive:  { background: T.dark, color: T.white },
  tabInactive:{ background: "transparent", color: T.dark4 },
  tableWrap: {
    background: T.white, borderRadius: 16,
    border: `1px solid ${T.border}`,
    overflow: "auto",
    boxShadow: "0 2px 16px rgba(12,12,16,0.05)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: T.bg2 },
  th: {
    padding: "12px 16px", textAlign: "left",
    fontSize: 11, fontWeight: 700, color: T.dark4,
    letterSpacing: "0.05em", textTransform: "uppercase",
    borderBottom: `1px solid ${T.border}`,
  },
  tr: { borderBottom: `1px solid ${T.border}`, transition: "background 0.15s", background: T.white },
  td: { padding: "14px 16px", fontSize: 14, verticalAlign: "middle" },
  badge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 12, fontWeight: 600,
  },
  btnApprove: {
    padding: "6px 12px", background: T.green, color: "white",
    border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
    display: "flex", alignItems: "center", gap: 4, transition: "background 0.15s",
  },
  btnReject: {
    padding: "6px 12px", background: T.red, color: "white",
    border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s",
  },
  btnCopy: {
    padding: "6px 14px", background: T.orange, color: "white",
    border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s",
  },
  empty: { padding: 48, textAlign: "center", color: T.dark4, fontSize: 14 },
  hint: {
    marginTop: 24, fontSize: 13, color: T.dark3,
    background: T.bg2, border: `1px solid ${T.border}`,
    borderRadius: 10, padding: "12px 16px",
  },
  code: {
    background: T.bg3, padding: "2px 8px", borderRadius: 5,
    fontSize: 12, fontFamily: "monospace", color: T.dark2,
  },
};
