import { useState } from "react";
import { auth, db, googleProvider } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const T = {
  cream:"#F6F6F1", cream2:"#EFEFE9", cream3:"#E8E8E1",
  ink:"#1A1A18", ink2:"#3A3A38", ink3:"#6B6B68", ink4:"#9A9A97",
  indigo:"#3D4EAC", indigo2:"#5B6FD4", indigo3:"#EEF0FB",
  green:"#1A7A4A", green2:"#E8F7EF",
  amber:"#B8620A", amber2:"#FDF3E7",
  red:"#C0392B", red2:"#FDECEA",
  blue:"#1565C0", blue2:"#E8F1FB",
  border:"rgba(26,26,24,0.09)",
  shadow:"0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
  shadow2:"0 8px 32px rgba(26,26,24,0.10), 0 2px 8px rgba(26,26,24,0.06)",
};

const ensureRecruiterDoc = async (user, extra = {}) => {
  const ref = doc(db, "recruiters", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: extra.name || user.displayName || "",
      companyName: extra.company || "",
      plan: "free",
      teamMembers: [],
      createdAt: new Date().toISOString(),
      role: "recruiter",
    });
  }
  return (await getDoc(ref)).data();
};

export default function RecruiterAuth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const recruiter = await ensureRecruiterDoc(cred.user);
      onAuth(cred.user, recruiter);
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(.*\)/, ""));
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let cred;
      if (mode === "login") {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } else {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      }
      const recruiter = await ensureRecruiterDoc(cred.user, { name, company });
      onAuth(cred.user, recruiter);
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(.*\)/, ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.cream2}; }
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,30px) scale(1.08)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-40px) scale(0.95)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,20px) scale(1.05)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        input { font-family: 'DM Sans', sans-serif !important; }
        input::placeholder { color: ${T.ink4}; }
        input:focus { outline: none; border-color: ${T.indigo} !important; box-shadow: 0 0 0 3px ${T.indigo3} !important; }
        .google-btn:hover { background: ${T.cream3} !important; }
        .submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .toggle-btn:hover { text-decoration: underline; }
      `}</style>

      {/* Subtle background orbs */}
      <div style={S.grid} />
      <div style={{ ...S.orb, ...S.orb1 }} />
      <div style={{ ...S.orb, ...S.orb2 }} />
      <div style={{ ...S.orb, ...S.orb3 }} />

      {/* Left Panel */}
      <div style={S.left}>
        <div style={S.leftInner}>

          {/* Logo */}
          <div style={S.logoRow}>
            <div style={S.logoMark}>C</div>
            <span style={S.logoText}>capabilio</span>
            <span style={S.badge}>RECRUITER</span>
          </div>

          {/* Hero */}
          <h1 style={S.hero}>
            Hire on <br />
            <span style={S.heroGrad}>verified skills.</span>
            <br />Not résumés.
          </h1>
          <p style={S.heroSub}>
            Access live ELO ratings, Arena scores, and AI-powered
            talent insights — all in one command center.
          </p>

          {/* Stats */}
          <div style={S.statsRow}>
            {[
              { n: "12K+", l: "Verified Candidates" },
              { n: "98%",  l: "Match Accuracy" },
              { n: "3.2×", l: "Faster Hiring" },
            ].map((s) => (
              <div key={s.l} style={S.statBox}>
                <span style={S.statNum}>{s.n}</span>
                <span style={S.statLbl}>{s.l}</span>
              </div>
            ))}
          </div>

          {/* Trusted by */}
          <div style={S.trustedRow}>
            <div style={S.trustedLabel}>TRUSTED BY TEAMS AT</div>
            <div style={S.trustedLogos}>
              {["Infosys", "Razorpay", "Meesho", "upGrad", "Zepto"].map((c) => (
                <span key={c} style={S.trustedLogo}>{c}</span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Right Panel — Auth Card */}
      <div style={S.right}>
        <div style={S.card}>

          {/* Tab switcher */}
          <div style={S.tabRow}>
            <button
              onClick={() => { setMode("login"); setError(""); }}
              style={{ ...S.tab, ...(mode === "login" ? S.tabActive : S.tabInactive) }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); }}
              style={{ ...S.tab, ...(mode === "signup" ? S.tabActive : S.tabInactive) }}
            >
              Register
            </button>
          </div>

          <div style={{ marginBottom: 24, marginTop: 24 }}>
            <h2 style={S.cardTitle}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p style={S.cardSub}>
              {mode === "login"
                ? "Sign in to your recruiter dashboard"
                : "Start hiring smarter today"}
            </p>
          </div>

          {/* Google */}
          <button
            className="google-btn"
            onClick={handleGoogle}
            disabled={loading}
            style={S.googleBtn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={S.divider}>
            <div style={S.divLine} />
            <span style={S.divText}>or</span>
            <div style={S.divLine} />
          </div>

          {/* Form */}
          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && (
              <>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Full Name</label>
                  <input
                    style={S.input}
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Company</label>
                  <input
                    style={S.input}
                    placeholder="Company name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div style={S.fieldGroup}>
              <label style={S.label}>Work Email</label>
              <input
                style={S.input}
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Password</label>
              <input
                style={S.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={S.errorBox}>{error}</div>
            )}

            <button
              className="submit-btn"
              type="submit"
              disabled={loading}
              style={S.submitBtn}
            >
              {loading
                ? <span style={S.spinner} />
                : mode === "login" ? "Sign In →" : "Create Account →"
              }
            </button>
          </form>

          {/* Toggle */}
          <p style={S.toggleRow}>
            {mode === "login" ? "Don't have an account? " : "Already have one? "}
            <button
              className="toggle-btn"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              style={S.toggleBtn}
            >
              {mode === "login" ? "Sign up free" : "Sign in"}
            </button>
          </p>

          <p style={S.terms}>
            By continuing you agree to Capabilio's{" "}
            <a href="#" style={S.link}>Terms</a> &{" "}
            <a href="#" style={S.link}>Privacy Policy</a>
          </p>

        </div>
      </div>
    </div>
  );
}

const S = {
  root: {
    minHeight: "100vh",
    display: "flex",
    fontFamily: "'DM Sans', sans-serif",
    background: `radial-gradient(ellipse at top, ${T.indigo3}, ${T.cream2})`,
    position: "relative",
    overflow: "hidden",
  },
  grid: {
    position: "absolute", inset: 0, zIndex: 0,
    backgroundImage: `
      linear-gradient(${T.border} 1px, transparent 1px),
      linear-gradient(90deg, ${T.border} 1px, transparent 1px)
    `,
    backgroundSize: "50px 50px",
  },
  orb: {
    position: "absolute", borderRadius: "50%",
    filter: "blur(80px)", zIndex: 0, pointerEvents: "none",
  },
  orb1: {
    width: 500, height: 500,
    background: `radial-gradient(circle, rgba(61,78,172,0.10) 0%, transparent 70%)`,
    top: -100, left: -100,
    animation: "float1 8s ease-in-out infinite",
  },
  orb2: {
    width: 400, height: 400,
    background: `radial-gradient(circle, rgba(91,111,212,0.08) 0%, transparent 70%)`,
    bottom: -50, right: "30%",
    animation: "float2 10s ease-in-out infinite",
  },
  orb3: {
    width: 300, height: 300,
    background: `radial-gradient(circle, rgba(26,122,74,0.06) 0%, transparent 70%)`,
    top: "40%", right: "10%",
    animation: "float3 12s ease-in-out infinite",
  },
  left: {
    flex: 1, display: "flex", alignItems: "center",
    justifyContent: "center", padding: "60px 40px", zIndex: 1,
  },
  leftInner: { maxWidth: 480 },
  logoRow: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 52,
  },
  logoMark: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    background: T.ink,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: T.cream, fontFamily: "'Syne', sans-serif",
    fontWeight: 800, fontSize: 20,
    boxShadow: "0 2px 12px rgba(26,26,24,0.18)",
  },
  logoText: {
    fontFamily: "'Syne', sans-serif", fontWeight: 700,
    fontSize: 20, color: T.ink, letterSpacing: "-0.5px",
  },
  badge: {
    fontSize: 10, fontWeight: 600, letterSpacing: 2,
    color: T.indigo, background: T.indigo3,
    border: `1px solid rgba(61,78,172,0.2)`,
    padding: "2px 8px", borderRadius: 20,
  },
  hero: {
    fontFamily: "'Syne', sans-serif", fontSize: 54,
    fontWeight: 800, color: T.ink,
    lineHeight: 1.12, letterSpacing: "-1.5px",
    marginBottom: 20,
  },
  heroGrad: {
    background: `linear-gradient(135deg, ${T.indigo}, ${T.indigo2})`,
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  heroSub: {
    fontSize: 16, color: T.ink3, lineHeight: 1.7, marginBottom: 44,
  },
  statsRow: { display: "flex", gap: 32, marginBottom: 48 },
  statBox: { display: "flex", flexDirection: "column", gap: 4 },
  statNum: {
    fontFamily: "'Syne', sans-serif", fontSize: 30,
    fontWeight: 800, color: T.ink,
  },
  statLbl: { fontSize: 12, color: T.ink4, fontWeight: 500 },
  trustedRow: {
    borderTop: `1px solid ${T.border}`, paddingTop: 24,
  },
  trustedLabel: {
    fontSize: 11, letterSpacing: 2, color: T.ink4,
    fontWeight: 600, marginBottom: 12,
  },
  trustedLogos: { display: "flex", gap: 20, flexWrap: "wrap" },
  trustedLogo: { fontSize: 13, color: T.ink3, fontWeight: 500 },
  right: {
    width: 480, display: "flex", alignItems: "center",
    justifyContent: "center", padding: "40px 30px", zIndex: 1,
  },
  card: {
    width: "100%",
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: 24, padding: 40,
    boxShadow: T.shadow2,
    animation: "fadeUp 0.4s ease both",
  },
  tabRow: {
    display: "flex", gap: 4, padding: 4,
    background: T.cream3, borderRadius: 12,
  },
  tab: {
    flex: 1, padding: "8px 16px", borderRadius: 9,
    border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
  },
  tabActive: {
    background: T.ink, color: T.cream,
    boxShadow: "0 1px 4px rgba(26,26,24,0.15)",
  },
  tabInactive: {
    background: "transparent", color: T.ink3,
  },
  cardTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 26,
    fontWeight: 700, color: T.ink, letterSpacing: "-0.5px",
    marginBottom: 6,
  },
  cardSub: { fontSize: 14, color: T.ink3 },
  googleBtn: {
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10, padding: "12px 20px",
    background: T.cream2,
    border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.ink2, fontSize: 14,
    fontWeight: 500, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
  },
  divider: {
    display: "flex", alignItems: "center", gap: 12, margin: "20px 0",
  },
  divLine: { flex: 1, height: 1, background: T.border },
  divText: { fontSize: 12, color: T.ink4 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 500, color: T.ink2 },
  input: {
    width: "100%", padding: "13px 16px",
    background: T.cream3,
    border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.ink, fontSize: 14,
    transition: "all 0.2s",
  },
  errorBox: {
    padding: "10px 14px",
    background: T.red2,
    border: `1px solid rgba(192,57,43,0.15)`,
    borderRadius: 10, color: T.red, fontSize: 13,
  },
  submitBtn: {
    width: "100%", padding: "13px 20px",
    background: T.ink,
    border: "none", borderRadius: 12, color: T.cream,
    fontSize: 15, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", marginTop: 4,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(26,26,24,0.15)",
    transition: "all 0.2s",
  },
  spinner: {
    width: 18, height: 18,
    border: `2px solid rgba(246,246,241,0.4)`,
    borderTopColor: T.cream, borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  toggleRow: {
    textAlign: "center", fontSize: 14,
    color: T.ink4, marginTop: 20,
  },
  toggleBtn: {
    background: "none", border: "none", color: T.indigo,
    cursor: "pointer", fontSize: 14, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
  },
  terms: {
    textAlign: "center", fontSize: 12,
    color: T.ink4, marginTop: 16,
  },
  link: { color: T.indigo, textDecoration: "none" },
};
