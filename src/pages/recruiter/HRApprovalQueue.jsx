import { useState, useEffect, useCallback } from "react"
import { supabase } from "../../lib/supabaseClient"
import { T } from "./theme"

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"32px 12px", color:T.ink4 }}>
      <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:13, color:T.ink3, fontWeight:600 }}>{title}</div>
      {sub && <div style={{ fontSize:11, color:T.ink4, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ── Offer review row ───────────────────────────────────────────────────────────
function OfferReviewRow({ review, offer, onDecide }) {
  const [notes, setNotes] = useState("")
  return (
    <div style={{ padding:"14px 16px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{offer?.candidate_name || "Candidate"}</div>
          <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>{offer?.job_title || "—"} · {offer?.currency || ""}{offer?.base_salary ? Number(offer.base_salary).toLocaleString() : "—"}</div>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:T.amber, background:T.amber2, border:`1px solid ${T.amber}30`, borderRadius:7, padding:"3px 9px" }}>Pending HR Review</span>
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review notes (optional)..."
        style={{ width:"100%", marginTop:10, padding:"8px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, fontSize:12, fontFamily:"'Inter',sans-serif", resize:"vertical", minHeight:44 }} />
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button onClick={() => onDecide(review, "approved", notes)} style={{ fontSize:12, fontWeight:700, padding:"7px 16px", background:T.green2, color:T.green, border:`1px solid ${T.green}30`, borderRadius:8, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>Approve</button>
        <button onClick={() => onDecide(review, "changes_requested", notes)} style={{ fontSize:12, fontWeight:600, padding:"7px 16px", background:T.amber2, color:T.amber, border:`1px solid ${T.amber}30`, borderRadius:8, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>Request Changes</button>
        <button onClick={() => onDecide(review, "rejected", notes)} style={{ fontSize:12, fontWeight:600, padding:"7px 16px", background:T.red2, color:T.red, border:`1px solid ${T.red}30`, borderRadius:8, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>Reject</button>
      </div>
    </div>
  )
}

// ── Employment change request row ─────────────────────────────────────────────
function EmploymentChangeRow({ req, onDecide }) {
  return (
    <div style={{ padding:"14px 16px", background:T.cream2, border:`1px solid ${T.border}`, borderRadius:12, marginBottom:10 }}>
      <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{req.candidate_name || "Candidate"}</div>
      <div style={{ fontSize:12, color:T.ink3, marginTop:6 }}>
        Wants to change <strong>{req.field_changed}</strong> from <span style={{ color:T.red }}>{req.old_value || "—"}</span> to <span style={{ color:T.green }}>{req.new_value || "—"}</span>
      </div>
      <div style={{ fontSize:10, color:T.ink4, marginTop:4 }}>Requested {new Date(req.created_at).toLocaleDateString()}</div>
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button onClick={() => onDecide(req, "approved")} style={{ fontSize:12, fontWeight:700, padding:"7px 16px", background:T.green2, color:T.green, border:`1px solid ${T.green}30`, borderRadius:8, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>Approve</button>
        <button onClick={() => onDecide(req, "rejected")} style={{ fontSize:12, fontWeight:600, padding:"7px 16px", background:T.red2, color:T.red, border:`1px solid ${T.red}30`, borderRadius:8, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>Reject</button>
      </div>
    </div>
  )
}

export default function HRApprovalQueue() {
  const [offerReviews, setOfferReviews] = useState([])
  const [offersById, setOffersById] = useState({})
  const [changeRequests, setChangeRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("offers")

  const fetchData = useCallback(async () => {
    try {
      const [reviewsRes, changesRes] = await Promise.all([
        supabase.from("offer_reviews").select("*").eq("status", "pending"),
        supabase.from("employment_change_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      ])
      if (reviewsRes.error) throw reviewsRes.error
      if (changesRes.error) throw changesRes.error
      const reviews = reviewsRes.data || []
      setOfferReviews(reviews)
      setChangeRequests(changesRes.data || [])

      const offerIds = reviews.map((r) => r.offer_id)
      if (offerIds.length) {
        const { data: offers } = await supabase.from("offers").select("*").in("id", offerIds)
        setOffersById(Object.fromEntries((offers || []).map((o) => [o.id, o])))
      }
    } catch (err) {
      console.error("Failed to load HR approval queue:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const decideOffer = async (review, status, notes) => {
    try {
      await supabase.from("offer_reviews").update({ status, reviewer_notes: notes, reviewed_at: new Date().toISOString() }).eq("id", review.id)
      // Approving here unlocks "send" on the offer; the offer's own status
      // still requires an explicit send action from OfferManagement.
      if (status === "approved") {
        await supabase.from("offers").update({ status: "approved" }).eq("id", review.offer_id)
      }
      await supabase.rpc("write_audit_log", {
        p_action: "offer.hr_review_decided", p_entity_type: "offer", p_entity_id: review.offer_id,
        p_before: { status: "pending_hr_review" }, p_after: { status },
      })
      fetchData()
    } catch (err) {
      console.error("Failed to record offer decision:", err)
    }
  }

  const decideChange = async (req, status) => {
    try {
      await supabase.from("employment_change_requests").update({ status, reviewed_at: new Date().toISOString() }).eq("id", req.id)
      await supabase.rpc("write_audit_log", {
        p_action: "employment_change.decided", p_entity_type: "employment_change_request", p_entity_id: req.id,
        p_before: { status: "pending" }, p_after: { status },
      })
      fetchData()
    } catch (err) {
      console.error("Failed to record employment change decision:", err)
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div>
        <h1 style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:T.ink, margin:0 }}>HR Approval Queue</h1>
        <p style={{ fontSize:13, color:T.ink3, marginTop:4 }}>No offer goes out, and no candidate employment change takes effect, without a human review here.</p>
      </div>

      <div style={{ display:"flex", gap:6 }}>
        {[["offers", `Offers (${offerReviews.length})`], ["changes", `Employment Changes (${changeRequests.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ fontSize:12, fontWeight:600, padding:"8px 16px", borderRadius:8, border:"1px solid", cursor:"pointer", fontFamily:"'Inter',sans-serif",
              background: tab === key ? T.indigo3 : "transparent", borderColor: tab === key ? `${T.indigo}40` : T.border, color: tab === key ? T.indigo : T.ink3 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
        {loading ? (
          <div style={{ color:T.ink3, fontSize:13, textAlign:"center", padding:"30px 0" }}>Loading...</div>
        ) : tab === "offers" ? (
          offerReviews.length === 0
            ? <EmptyState icon="✅" title="No offers waiting on review" sub="Offers appear here once a recruiter submits them for HR sign-off" />
            : offerReviews.map((r) => <OfferReviewRow key={r.id} review={r} offer={offersById[r.offer_id]} onDecide={decideOffer} />)
        ) : (
          changeRequests.length === 0
            ? <EmptyState icon="✅" title="No employment changes waiting on review" />
            : changeRequests.map((r) => <EmploymentChangeRow key={r.id} req={r} onDecide={decideChange} />)
        )}
      </div>
    </div>
  )
}
