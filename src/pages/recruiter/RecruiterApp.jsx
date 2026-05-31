import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

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

// ── Auth ───────────────────────────────────────────────────────────────────────
const auth = getAuth(getApps()[0]);

export default function RecruiterApp() {
  const [authState, setAuthState] = useState("loading");
  const [user,      setUser]      = useState(null);
  const [recruiter, setRecruiter] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const snap = await getDoc(doc(db, "recruiters", fbUser.uid));
          if (snap.exists()) {
            setUser(fbUser);
            setRecruiter({ uid: fbUser.uid, ...snap.data() });
            setAuthState("auth");
          } else {
            setAuthState("no-auth");
          }
        } catch {
          setAuthState("no-auth");
        }
      } else {
        setAuthState("no-auth");
      }
    });
    return unsub;
  }, []);

  const handleAuth = (fbUser, recruiterData) => {
    setUser(fbUser);
    setRecruiter(recruiterData);
    setAuthState("auth");
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
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
    return <RecruiterAuth onAuth={handleAuth} />;
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
        <Route path="*"                       element={<Navigate to="/recruiter" replace />} />
      </Route>
    </Routes>
  );
}
