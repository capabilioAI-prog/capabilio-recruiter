import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

// ── Core Pages ─────────────────────────────────────────────────────────────────
import RecruiterAuth          from "./RecruiterAuth";
import RecruiterLayout        from "./RecruiterLayout";
import RecruiterDashboard     from "./RecruiterDashboard";
import CandidateSearch        from "./CandidateSearch";
import CandidateProfile       from "./CandidateProfile";
import RecruiterPipeline      from "./RecruiterPipeline";
import JobBoard               from "./JobBoard";
import HiringArena            from "./HiringArena";
import InterviewScheduler     from "./InterviewScheduler";
import OfferManagement        from "./OfferManagement";
import MessagingCenter        from "./MessagingCenter";
import RecruiterAnalytics     from "./RecruiterAnalytics";
import RecruiterSettings      from "./RecruiterSettings";

// ── Advanced / AI Pages ────────────────────────────────────────────────────────
import ShadowInterview        from "./ShadowInterview";
import TalentTimeMachine      from "./TalentTimeMachine";
import TeamChemistry          from "./TeamChemistry";
import TalentIncubator        from "./TalentIncubator";
import CompetitiveIntelligence from "./CompetitiveIntelligence";

// ── New Full-Cycle Pages ───────────────────────────────────────────────────────
import VerificationCockpit    from "./VerificationCockpit";
import CandidateCompare       from "./CandidateCompare";
import BulkHiring             from "./BulkHiring";
import TalentPool             from "./TalentPool";
import EmployeeNetwork        from "./EmployeeNetwork";
import FairnessLedger         from "./FairnessLedger";
import RejectionWorkflow      from "./RejectionWorkflow";
import CompanyTrustRatings    from "./CompanyTrustRatings"
import ResumeScreening        from "./ResumeScreening";
import Applications           from "./Applications";
import InternalMobility       from "./InternalMobility";
import CompanyIntegration     from "./CompanyIntegration";
import AdminPanel             from "./AdminPanel";
import CollegeConnections     from "./CollegeConnections";
import HRApprovalQueue        from "./HRApprovalQueue";
import TasksChallenges        from "./TasksChallenges";

export default function RecruiterApp() {
  const [authState, setAuthState] = useState("loading");
  const [recruiter, setRecruiter] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // ensure_recruiter is idempotent: creates the company+recruiter row on
    // first sign-in, or just returns the existing row on every subsequent
    // auth event (including token refreshes), so it's safe to call every time.
    const syncRecruiter = async (sbUser) => {
      try {
        const { data, error } = await supabase.rpc("ensure_recruiter", {
          p_company_name: sbUser.user_metadata?.company_name ?? null,
          p_display_name: sbUser.user_metadata?.display_name ?? sbUser.user_metadata?.full_name ?? "",
          p_email: sbUser.email,
        });
        if (error) throw error;
        if (cancelled) return;
        setRecruiter(data);

        // ensure_recruiter returns the raw `recruiters` row (snake_case columns,
        // no company name). Fetch the company name separately so the UI can show
        // it -- RecruiterLayout reads recruiter.displayName / recruiter.companyName.
        let companyName = null;
        if (data?.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", data.company_id)
            .single();
          companyName = company?.name ?? null;
        }
        if (cancelled) return;
        setRecruiter({ ...data, displayName: data.display_name, companyId: data.company_id, companyName });
        setAuthState("auth");
      } catch (err) {
        console.error("Failed to load recruiter record:", err);
        if (!cancelled) setAuthState("no-auth");
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) syncRecruiter(session.user);
      else setAuthState("no-auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) syncRecruiter(session.user);
      else {
        setRecruiter(null);
        setAuthState("no-auth");
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
    setRecruiter(null);
    setAuthState("no-auth");
  };

  if (authState === "loading") {
    return (
      <div style={{ minHeight:"100vh", background:"#F6F6F1", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid rgba(99,102,241,0.2)", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    );
  }

  if (authState === "no-auth") {
    return <RecruiterAuth />;
  }

  return (
    <Routes>
      <Route element={<RecruiterLayout recruiter={recruiter} onSignOut={handleSignOut} />}>
        {/* Core */}
        <Route index                          element={<RecruiterDashboard />} />
        <Route path="search"                  element={<CandidateSearch />} />
        <Route path="candidate/:uid"          element={<CandidateProfile />} />
        <Route path="pipeline"                element={<RecruiterPipeline />} />
        <Route path="jobs"                    element={<JobBoard />} />
        <Route path="arena"                   element={<HiringArena />} />
        <Route path="interviews"              element={<InterviewScheduler />} />
        <Route path="offers"                  element={<OfferManagement />} />
        <Route path="messages"                element={<MessagingCenter />} />
        <Route path="analytics"               element={<RecruiterAnalytics />} />
        <Route path="settings"                element={<RecruiterSettings />} />
        {/* AI / Advanced */}
        <Route path="simulation/:uid?"        element={<ShadowInterview />} />
        <Route path="time-machine/:uid?"      element={<TalentTimeMachine />} />
        <Route path="team-chemistry"          element={<TeamChemistry />} />
        <Route path="incubator"               element={<TalentIncubator />} />
        <Route path="intelligence"            element={<CompetitiveIntelligence />} />
        {/* Full-Cycle New Pages */}
        <Route path="verification"            element={<VerificationCockpit />} />
        <Route path="compare"                 element={<CandidateCompare />} />
        <Route path="bulk-hiring"             element={<BulkHiring />} />
        <Route path="talent-pool"             element={<TalentPool />} />
        <Route path="employee-network"        element={<EmployeeNetwork />} />
        <Route path="fairness-ledger"         element={<FairnessLedger />} />
        <Route path="rejection-workflow"      element={<RejectionWorkflow />} />
        <Route path="trust-ratings"           element={<CompanyTrustRatings />} />
        <Route path="resume-screening"        element={<ResumeScreening />} />
        <Route path="applications"            element={<Applications />} />
        <Route path="internal-mobility"       element={<InternalMobility />} />
        <Route path="company-integration"     element={<CompanyIntegration />} />
        <Route path="admin"                   element={<AdminPanel isPlatformAdmin={!!recruiter?.is_platform_admin} />} />
        {/* College / HR / Tasks extension */}
        <Route path="colleges"                element={<CollegeConnections />} />
        <Route path="hr-approvals"            element={<HRApprovalQueue />} />
        <Route path="tasks"                   element={<TasksChallenges />} />
        <Route path="*"                       element={<Navigate to="/recruiter" replace />} />
      </Route>
    </Routes>
  );
}
