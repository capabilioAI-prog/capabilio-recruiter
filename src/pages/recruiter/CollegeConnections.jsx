import { useState, useEffect, useCallback } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"

const STATUS_META = {
  requested: { label: "Requested", color: T.amber, bg: T.amber2 },
  connected: { label: "Connected", color: T.green, bg: T.green2 },
  rejected:  { label: "Rejected",  color: T.red,   bg: T.red2   },
  invited:   { label: "New invitation", color: T.amber, bg: T.amber2 },
  active:    { label: "Connected", color: T.green, bg: T.green2 },
}

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.requested
  return <span style={{ fontSize:11, fontWeight:700, color:m.color, background:m.bg, border:`1px solid ${m.color}30`, borderRadius:7, padding:"3px 9px" }}>{m.label}</span>
}

export default function CollegeConnections() {
  const [institutions, setInstitutions] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [bridgeError, setBridgeError] = useState(null)
  const [noteDraft, setNoteDraft] = useState({})

  // ── Invitations FROM colleges (org_company_links on capabilio-web,
  // reached only through the partner bridge — no shared login, no email).
  // A college's "Invite Company" action on their Talent Network page shows
  // up here. This is a separate data source from `institutions`/`connections`
  // below, which is the (still-unbuilt-on-the-college-side) reverse flow
  // where a recruiter requests a college first.
  const [invites, setInvites] = useState([])
  const [invitesLoading, setInvitesLoading] = useState(true)
  const [invitesError, setInvitesError] = useState(null)
  const [identity, setIdentity] = useState(null) // { email, companyId }
  const [actioningId, setActioningId] = useState(null)

  const fetchIdentity = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: recruiterRow } = await supabase
      .from("recruiters")
      .select("company_id, email")
      .eq("id", user.id)
      .single()
    const result = { email: recruiterRow?.email || user.email, companyId: recruiterRow?.company_id || null }
    setIdentity(result)
    return result
  }, [])

  const fetchInvites = useCallback(async (email) => {
    if (!email) { setInvitesLoading(false); return }
    setInvitesLoading(true)
    setInvitesError(null)
    try {
      const res = await fetch(`${BACKEND}/partner/company-invites?email=${encodeURIComponent(email)}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setInvites(body.invites || [])
    } catch (err) {
      console.error("Failed to load college invitations:", err)
      setInvitesError(err.message)
    } finally {
      setInvitesLoading(false)
    }
  }, [])

  const respondToInvite = async (invite, action) => {
    if (!identity?.companyId && action === "accept") {
      setInvitesError("Your recruiter account isn't linked to a company yet — reload the page and try again.")
      return
    }
    setActioningId(invite.id)
    try {
      const res = await fetch(`${BACKEND}/partner/company-invites/${invite.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "accept"
            ? { partnerCompanyId: identity.companyId, acceptedByEmail: identity.email }
            : {}
        ),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      await fetchInvites(identity.email)
    } catch (err) {
      console.error(`Failed to ${action} invite:`, err)
      setInvitesError(err.message)
    } finally {
      setActioningId(null)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setBridgeError(null)
    try {
      const [instRes, connsRes] = await Promise.all([
        fetch(`${BACKEND}/partner/institutions`).then(async (r) => {
          const body = await r.json()
          if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`)
          return body
        }),
        supabase.from("college_connections").select("*"),
      ])
      if (connsRes.error) throw connsRes.error
      setInstitutions(instRes.institutions || [])
      setConnections(connsRes.data || [])
    } catch (err) {
      console.error("Failed to load college connections:", err)
      setBridgeError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchIdentity().then((id) => fetchInvites(id?.email))
  }, [fetchData, fetchIdentity, fetchInvites])

  const connectionFor = (institutionId) => connections.find((c) => c.external_institution_id === institutionId)

  // NOTE: this only records the request on capabilio-recruiter's own side.
  // It does not yet write anything into capabilio-web's org_company_links --
  // that table's consent model is built for "college invites a known company
  // account, company accepts via emailed token," and there's no symmetric
  // "company requests, college accepts" surface in capabilio-web's frontend
  // yet. This is tracked as a follow-up, not silently faked here.
  const requestConnection = async (institution) => {
    try {
      const { error } = await supabase.from("college_connections").insert({
        external_institution_id: institution.id,
        external_institution_name: institution.name,
        status: "requested",
        invited_by: "recruiter",
      })
      if (error) throw error
      fetchData()
    } catch (err) {
      console.error("Failed to request connection:", err)
    }
  }

  const saveNote = async (conn) => {
    const notes = noteDraft[conn.id]
    if (notes == null) return
    try {
      const { error } = await supabase.from("college_connections").update({ notes, updated_at: new Date().toISOString() }).eq("id", conn.id)
      if (error) throw error
      fetchData()
    } catch (err) {
      console.error("Failed to save note:", err)
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
      {/* ── Invitations received from colleges ────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.ink, margin:0 }}>College Invitations</h1>
          <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>
            Colleges that invited your company from their Talent Network. Accept or decline here — connecting only happens in the app, invites are never emailed.
          </p>
        </div>

        {invitesLoading ? (
          <div style={{ color:T.ink3, fontSize:13, padding:"24px 0", textAlign:"center" }}>Loading...</div>
        ) : invitesError ? (
          <div style={{ color:T.red, fontSize:13, textAlign:"center", padding:"24px 20px", background:T.red2, border:`1px solid ${T.red}30`, borderRadius:12 }}>
            Couldn't reach your invitations: {invitesError}.
          </div>
        ) : invites.length === 0 ? (
          <div style={{ color:T.ink4, fontSize:14, textAlign:"center", padding:"32px 0" }}>
            No invitations yet — a college will invite your company from their Talent Network page.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {invites.map((invite) => (
              <div key={invite.id} style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:14, padding:18, boxShadow:T.shadow }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>{invite.institution_name}</div>
                    <div style={{ fontSize:12, color:T.ink4, marginTop:2 }}>Invited {invite.company_name ? `"${invite.company_name}"` : "your company"} · {new Date(invite.created_at).toLocaleDateString()}</div>
                  </div>
                  <StatusPill status={invite.status} />
                </div>
                {invite.status === "invited" && (
                  <div style={{ marginTop:12, display:"flex", gap:8 }}>
                    <button
                      disabled={actioningId === invite.id}
                      onClick={() => respondToInvite(invite, "accept")}
                      style={{ fontSize:12, fontWeight:600, padding:"7px 14px", background:T.green2, color:T.green, border:`1px solid ${T.green}30`, borderRadius:8, cursor: actioningId === invite.id ? "default" : "pointer", opacity: actioningId === invite.id ? 0.6 : 1, fontFamily:"'DM Sans',sans-serif" }}
                    >
                      {actioningId === invite.id ? "Accepting..." : "Accept"}
                    </button>
                    <button
                      disabled={actioningId === invite.id}
                      onClick={() => respondToInvite(invite, "decline")}
                      style={{ fontSize:12, fontWeight:600, padding:"7px 14px", background:T.cream2, color:T.ink3, border:`1px solid ${T.border}`, borderRadius:8, cursor: actioningId === invite.id ? "default" : "pointer", opacity: actioningId === invite.id ? 0.6 : 1, fontFamily:"'DM Sans',sans-serif" }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Institution directory (browse & request — reverse flow, still a
          college-side follow-up per the note below) ─────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:18, borderTop:`1px solid ${T.border}`, paddingTop:24 }}>
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:T.ink, margin:0 }}>Institution Directory</h2>
          <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>
            Live institution directory from Capabilio. Requesting a connection here notifies you locally — the college-side accept flow is a follow-up (see the note on each pending request).
          </p>
        </div>

        {loading ? (
          <div style={{ color:T.ink3, fontSize:13, padding:"40px 0", textAlign:"center" }}>Loading...</div>
        ) : bridgeError ? (
          <div style={{ color:T.red, fontSize:13, textAlign:"center", padding:"40px 20px", background:T.red2, border:`1px solid ${T.red}30`, borderRadius:12 }}>
            Couldn't reach the institution directory: {bridgeError}.
          </div>
        ) : institutions.length === 0 ? (
          <div style={{ color:T.ink4, fontSize:14, textAlign:"center", padding:"60px 0" }}>No institutions in the directory yet.</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {institutions.map((institution) => {
              const conn = connectionFor(institution.id)
              return (
                <div key={institution.id} style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:14, padding:18, boxShadow:T.shadow }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>{institution.name}</div>
                    </div>
                    {conn ? <StatusPill status={conn.status} /> : <span style={{ fontSize:11, color:T.ink4 }}>Not connected</span>}
                    {!conn && (
                      <button onClick={() => requestConnection(institution)} style={{ fontSize:12, fontWeight:600, padding:"7px 14px", background:T.indigo3, color:T.indigo, border:`1px solid ${T.indigo}30`, borderRadius:8, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                        Request Connection
                      </button>
                    )}
                  </div>
                  {conn && conn.status === "requested" && (
                    <div style={{ marginTop:10, fontSize:11, color:T.ink4 }}>
                      Waiting on the college to review this request in their own dashboard.
                    </div>
                  )}
                  {conn && (
                    <div style={{ marginTop:12, display:"flex", gap:8 }}>
                      <input
                        defaultValue={conn.notes || ""}
                        placeholder="Collaboration notes (visible to your team only)..."
                        onChange={(e) => setNoteDraft((d) => ({ ...d, [conn.id]: e.target.value }))}
                        style={{ flex:1, padding:"8px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream2, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}
                      />
                      <button onClick={() => saveNote(conn)} style={{ fontSize:11, fontWeight:600, padding:"8px 14px", background:T.cream2, color:T.ink3, border:`1px solid ${T.border}`, borderRadius:8, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Save</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
