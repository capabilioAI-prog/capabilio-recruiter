import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
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

const COLUMN_LABELS = {
  name: "Name", role: "Role/Branch", department: "Department", batch: "Batch",
  status: "Status",
  // 2026-08-07: raw ELO was briefly hidden from recruiters here, then
  // reversed same day — "i want recruiters to see the student ELO and
  // student choosen career, so then recruiters can see what student is
  // proven." elo_rating is back (backend: orgStudentVisibility.js's
  // fetchLinkStudents restores it). performance_tier and
  // ai_interview_completed stay too — additive, not a replacement — and
  // `career` (the student's chosen career track, e.g. "Frontend Engineer")
  // is genuinely new, added at the same time per the same instruction.
  elo_rating: "ELO", performance_tier: "Performance", career: "Career",
  ai_interview_completed: "AI Interview",
  // The actual differentiator (skill-graph evidence + challenge completions,
  // not resume keywords) — only present when the college's visibility tier
  // for this link is "elo"/"placements"/"full" (see orgStudentVisibility.js's
  // fetchLinkStudents; the base "roster" tier withholds this the same way it
  // withholds elo_rating).
  top_skills: "Top Skills", challenges_completed: "Challenges",
  placement_company: "Placement", placement_ctc: "CTC", joined_at: "Joined",
}
const ROSTER_ROW_ORDER = ["name", "department", "batch", "status", "elo_rating", "performance_tier", "career", "top_skills", "challenges_completed", "ai_interview_completed", "placement_company", "placement_ctc", "joined_at"]

export default function CollegeConnections() {
  const navigate = useNavigate()
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

  // ── Connected-college performance roster + per-student access requests
  // (2026-08-06) — once a college invite is ACCEPTED (see invites above),
  // this recruiter can view that college's aggregate, tier-scoped student
  // roster and request contact access to one specific student at a time.
  // Nothing here grants contact by itself — the college's placement cell
  // decides (capabilio-web, InstitutionOS.jsx's Access Requests panel).
  const [activeLinks, setActiveLinks] = useState([])
  const [activeLinksLoading, setActiveLinksLoading] = useState(true)
  const [selectedLinkId, setSelectedLinkId] = useState(null)
  const [roster, setRoster] = useState([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState(null)
  const [accessByStudent, setAccessByStudent] = useState({}) // studentId -> status
  const [requestingId, setRequestingId] = useState(null)

  // ── Roster filters (2026-08-07) — a college has multiple departments and
  // recruiters don't hire every department, so let them narrow the roster
  // before deciding who to request access to. Filters run client-side over
  // data already fetched (department/batch/status/elo_rating/
  // ai_interview_completed all come back from fetchLinkStudents already —
  // see VISIBILITY_COLUMNS in orgStudentVisibility.js on capabilio-web).
  // Min ELO briefly became a tier-only filter, reversed same day per
  // explicit instruction — recruiters filter by the raw ELO number again.
  // "AI Interview done" is a separate, independent addition, kept either way.
  const [deptFilter, setDeptFilter] = useState("")
  const [batchFilter, setBatchFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [minEloFilter, setMinEloFilter] = useState("")
  const [aiInterviewFilter, setAiInterviewFilter] = useState(false)

  const fetchActiveLinks = useCallback(async (email) => {
    if (!email) { setActiveLinksLoading(false); return }
    setActiveLinksLoading(true)
    try {
      const res = await fetch(`${BACKEND}/partner/company-links?email=${encodeURIComponent(email)}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setActiveLinks(body.links || [])
    } catch (err) {
      console.error("Failed to load connected colleges:", err)
    } finally {
      setActiveLinksLoading(false)
    }
  }, [])

  const fetchRosterAndRequests = useCallback(async (linkId) => {
    setRosterLoading(true)
    setRosterError(null)
    try {
      const [rosterRes, reqRes] = await Promise.all([
        fetch(`${BACKEND}/partner/company-links/${linkId}/students`).then(async (r) => {
          const b = await r.json(); if (!r.ok) throw new Error(b.error || `Request failed (${r.status})`); return b
        }),
        fetch(`${BACKEND}/partner/company-links/${linkId}/access-requests`).then(async (r) => {
          const b = await r.json(); if (!r.ok) throw new Error(b.error || `Request failed (${r.status})`); return b
        }),
      ])
      setRoster(rosterRes.students || [])
      setAccessByStudent(Object.fromEntries((reqRes.requests || []).map((r) => [r.student_id, r.status])))
    } catch (err) {
      console.error("Failed to load college roster:", err)
      setRosterError(err.message)
    } finally {
      setRosterLoading(false)
    }
  }, [])

  const selectLink = (linkId) => {
    setSelectedLinkId(linkId)
    setDeptFilter(""); setBatchFilter(""); setStatusFilter(""); setMinEloFilter(""); setAiInterviewFilter(false)
    fetchRosterAndRequests(linkId)
  }

  const deptOptions = [...new Set(roster.map((s) => s.department).filter(Boolean))].sort()
  const batchOptions = [...new Set(roster.map((s) => s.batch).filter(Boolean))].sort()
  const statusOptions = [...new Set(roster.map((s) => s.status).filter(Boolean))].sort()
  const minEloNum = Number.parseInt(minEloFilter, 10)
  const filteredRoster = roster.filter((s) => {
    if (deptFilter && s.department !== deptFilter) return false
    if (batchFilter && s.batch !== batchFilter) return false
    if (statusFilter && s.status !== statusFilter) return false
    if (Number.isFinite(minEloNum) && !(Number(s.elo_rating) >= minEloNum)) return false
    if (aiInterviewFilter && !s.ai_interview_completed) return false
    return true
  })
  const filtersActive = !!(deptFilter || batchFilter || statusFilter || minEloFilter || aiInterviewFilter)
  const clearFilters = () => { setDeptFilter(""); setBatchFilter(""); setStatusFilter(""); setMinEloFilter(""); setAiInterviewFilter(false) }

  const requestAccess = async (studentUserId) => {
    if (!identity?.companyId) return
    setRequestingId(studentUserId)
    try {
      const res = await fetch(`${BACKEND}/partner/company-links/${selectedLinkId}/students/${studentUserId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerCompanyId: identity.companyId, requestedByEmail: identity.email }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setAccessByStudent((m) => ({ ...m, [studentUserId]: body.request?.status || "pending" }))
    } catch (err) {
      console.error("Failed to request access:", err)
    } finally {
      setRequestingId(null)
    }
  }

  const sendTask = (student) => {
    navigate("/recruiter/tasks", {
      state: {
        candidateId: student.user_id,
        candidateName: student.name,
        companyLinkId: selectedLinkId,
      },
    })
  }

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
    fetchIdentity().then((id) => { fetchInvites(id?.email); fetchActiveLinks(id?.email) })
  }, [fetchData, fetchIdentity, fetchInvites, fetchActiveLinks])

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

      {/* ── Connected colleges: performance roster + per-student access
          requests (2026-08-06). This is the actual placement workflow —
          browse a connected college's aggregate performance, request
          contact with a specific student, wait on placement-cell approval,
          then send tasks/messages only once approved. ────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:18, borderTop:`1px solid ${T.border}`, paddingTop:24 }}>
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:T.ink, margin:0 }}>Connected Colleges — Performance</h2>
          <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>
            Aggregate, anonymized performance for colleges you're connected to. Contacting a specific student — messaging, sending a task, or viewing their full portfolio — requires that college's placement cell to approve your request first.
          </p>
        </div>

        {activeLinksLoading ? (
          <div style={{ color:T.ink3, fontSize:13, padding:"24px 0", textAlign:"center" }}>Loading...</div>
        ) : activeLinks.length === 0 ? (
          <div style={{ color:T.ink4, fontSize:14, textAlign:"center", padding:"32px 0" }}>
            No connected colleges yet — accept an invitation above to see a college's performance here.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {activeLinks.map((link) => (
                <button key={link.id} onClick={() => selectLink(link.id)}
                  style={{
                    fontSize:12, fontWeight:700, padding:"8px 14px", borderRadius:9, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                    background: selectedLinkId === link.id ? T.ink : T.cream2,
                    color: selectedLinkId === link.id ? T.cream : T.ink3,
                    border: `1px solid ${selectedLinkId === link.id ? T.ink : T.border}`,
                  }}>
                  {link.institution_name}
                </button>
              ))}
            </div>

            {selectedLinkId && (
              rosterLoading ? (
                <div style={{ color:T.ink3, fontSize:13, padding:"24px 0", textAlign:"center" }}>Loading roster...</div>
              ) : rosterError ? (
                <div style={{ color:T.red, fontSize:13, textAlign:"center", padding:"20px", background:T.red2, border:`1px solid ${T.red}30`, borderRadius:12 }}>
                  Couldn't load this roster: {rosterError}
                </div>
              ) : roster.length === 0 ? (
                <div style={{ color:T.ink4, fontSize:13, textAlign:"center", padding:"24px 0" }}>No students in this college's shared roster yet.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                      style={{ fontSize:12, padding:"7px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, color:T.ink2, fontFamily:"'DM Sans',sans-serif" }}>
                      <option value="">All departments</option>
                      {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
                      style={{ fontSize:12, padding:"7px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, color:T.ink2, fontFamily:"'DM Sans',sans-serif" }}>
                      <option value="">All batches</option>
                      {batchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ fontSize:12, padding:"7px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, color:T.ink2, fontFamily:"'DM Sans',sans-serif" }}>
                      <option value="">All statuses</option>
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input value={minEloFilter} onChange={(e) => setMinEloFilter(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Min ELO" inputMode="numeric"
                      style={{ width:84, fontSize:12, padding:"7px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, color:T.ink2, fontFamily:"'DM Sans',sans-serif" }} />
                    <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:T.ink2, cursor:"pointer" }}>
                      <input type="checkbox" checked={aiInterviewFilter} onChange={(e) => setAiInterviewFilter(e.target.checked)} />
                      AI Interview done
                    </label>
                    {filtersActive && (
                      <button onClick={clearFilters} style={{ fontSize:11, fontWeight:600, padding:"7px 10px", background:"transparent", color:T.ink4, border:`1px solid ${T.border}`, borderRadius:8, cursor:"pointer" }}>
                        Clear filters
                      </button>
                    )}
                    <span style={{ fontSize:11, color:T.ink4, marginLeft:"auto" }}>{filteredRoster.length} of {roster.length} students</span>
                  </div>

                  {filteredRoster.length === 0 ? (
                    <div style={{ color:T.ink4, fontSize:13, textAlign:"center", padding:"24px 0", background:T.cream, border:`1px solid ${T.border}`, borderRadius:14 }}>No students match these filters.</div>
                  ) : (
                <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden", boxShadow:T.shadow }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                    <thead>
                      <tr style={{ background:T.cream2 }}>
                        {ROSTER_ROW_ORDER.filter((k) => roster[0]?.[k] !== undefined).map((k) => (
                          <th key={k} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:T.ink4, letterSpacing:"0.06em", textTransform:"uppercase" }}>{COLUMN_LABELS[k] || k}</th>
                        ))}
                        <th style={{ padding:"10px 14px" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoster.map((student) => {
                        const access = accessByStudent[student.user_id] || "none"
                        return (
                          <tr key={student.id} style={{ borderTop:`1px solid ${T.border}` }}>
                            {ROSTER_ROW_ORDER.filter((k) => roster[0]?.[k] !== undefined).map((k) => (
                              <td key={k} style={{ padding:"10px 14px", color:T.ink2 }}>
                                {k === "top_skills" ? (
                                  student.top_skills?.length ? (
                                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                                      {student.top_skills.map((s) => (
                                        <span key={s.skill_name} title={s.elo_value != null ? `ELO ${s.elo_value}` : undefined} style={{ fontSize:10, fontWeight:600, padding:"2px 7px", background:T.indigo3, color:T.indigo, borderRadius:6, whiteSpace:"nowrap" }}>
                                          {s.skill_name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : "—"
                                ) : k === "elo_rating" ? (
                                  <span style={{ fontWeight:700, color:T.indigo }}>{student.elo_rating ?? "—"}</span>
                                ) : k === "performance_tier" ? (
                                  student.performance_tier ? (
                                    <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:7, background:T.green2, color:T.green, border:`1px solid ${T.green}30` }}>
                                      {student.performance_tier}
                                    </span>
                                  ) : "—"
                                ) : k === "career" ? (
                                  student.career || "—"
                                ) : k === "ai_interview_completed" ? (
                                  student.ai_interview_completed
                                    ? <span style={{ fontSize:11, fontWeight:700, color:T.green }}>✓ Completed</span>
                                    : <span style={{ fontSize:11, color:T.ink4 }}>Not yet</span>
                                ) : (
                                  student[k] ?? "—"
                                )}
                              </td>
                            ))}
                            <td style={{ padding:"10px 14px", textAlign:"right", whiteSpace:"nowrap" }}>
                              {access === "approved" ? (
                                <button onClick={() => sendTask(student)} style={{ fontSize:11, fontWeight:700, padding:"6px 12px", background:T.green2, color:T.green, border:`1px solid ${T.green}30`, borderRadius:7, cursor:"pointer" }}>
                                  ✓ Send Task
                                </button>
                              ) : access === "pending" ? (
                                <span style={{ fontSize:11, fontWeight:700, color:T.amber, background:T.amber2, border:`1px solid ${T.amber}30`, borderRadius:7, padding:"5px 10px" }}>Pending approval</span>
                              ) : access === "denied" ? (
                                <span style={{ fontSize:11, fontWeight:700, color:T.red, background:T.red2, border:`1px solid ${T.red}30`, borderRadius:7, padding:"5px 10px" }}>Declined</span>
                              ) : (
                                <button
                                  disabled={requestingId === student.user_id || !student.user_id}
                                  onClick={() => requestAccess(student.user_id)}
                                  style={{ fontSize:11, fontWeight:600, padding:"6px 12px", background:T.indigo3, color:T.indigo, border:`1px solid ${T.indigo}30`, borderRadius:7, cursor: student.user_id ? "pointer" : "default", opacity: requestingId === student.user_id ? 0.6 : 1, fontFamily:"'DM Sans',sans-serif" }}>
                                  {requestingId === student.user_id ? "Requesting..." : "Request Access"}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                  )}
                </div>
              )
            )}
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
