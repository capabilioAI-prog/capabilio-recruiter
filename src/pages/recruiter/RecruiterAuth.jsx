import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const T = {
  bg:     "#FAF8F5",
  bg2:    "#F3F0EB",
  bg3:    "#EDE9E2",
  white:  "#FFFFFF",
  orange: "#FF4A1C",
  orange2:"#FFF2EE",
  dark:   "#0C0C10",
  dark2:  "#1E1E28",
  dark3:  "#4A4A5A",
  dark4:  "#8A8A9A",
  red:    "#C0392B",
  red2:   "#FDECEA",
  border: "rgba(12,12,16,0.08)",
  shadow: "0 2px 16px rgba(12,12,16,0.06), 0 1px 4px rgba(12,12,16,0.04)",
  shadow2:"0 12px 48px rgba(12,12,16,0.12), 0 4px 16px rgba(12,12,16,0.07)",
};

export default function RecruiterAuth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sign-in/sign-up only *start* the auth flow here. The resulting session
  // (including the Google OAuth redirect round-trip, which has no synchronous
  // callback) is picked up centrally by the supabase.auth.onAuthStateChange
  // listener in RecruiterApp, which also calls the ensure_recruiter RPC.
  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/recruiter` },
      });
      if (err) throw err;
      // Browser navigates away here; loading state intentionally left on.
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name, company_name: company } },
        });
        if (err) throw err;
      }
      // onAuthStateChange in RecruiterApp handles the rest.
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; }
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,20px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-30px)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        input { font-family: 'Inter', sans-serif !important; }
        input::placeholder { color: ${T.dark4}; }
        input:focus { outline: none; border-color: ${T.orange} !important; box-shadow: 0 0 0 3px ${T.orange2} !important; }
        .google-btn:hover { background: ${T.bg3} !important; }
        .submit-btn:hover { background: #e03c10 !important; transform: translateY(-1px); }
        .toggle-btn:hover { text-decoration: underline; }
      `}</style>

      {/* Background orbs */}
      <div style={{ position:"absolute", width:500, height:500, top:-100, left:-100, borderRadius:"50%", background:`radial-gradient(circle, ${T.orange2}, transparent 70%)`, filter:"blur(80px)", zIndex:0, animation:"float1 8s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:400, height:400, bottom:0, right:"25%", borderRadius:"50%", background:`radial-gradient(circle, rgba(255,74,28,0.06), transparent 70%)`, filter:"blur(60px)", zIndex:0, animation:"float2 10s ease-in-out infinite", pointerEvents:"none" }} />

      {/* Left Panel */}
      <div style={S.left}>
        <div style={S.leftInner}>

          {/* Logo */}
          <div style={S.logoRow}>
            <div style={S.logoMark}>C</div>
            <div>
              <span style={S.logoText}>Capabilio AI</span>
              <span style={S.badge}>RECRUITER</span>
            </div>
          </div>

          {/* Hero */}
          <h1 style={S.hero}>
            Your candidates lie.<br />
            <em style={S.heroAccent}>Their ELO doesn't.</em>
          </h1>
          <p style={S.heroSub}>
            Capabilio AI Recruiter replaces resume-heavy shortlisting with live ELO skill intelligence, verified profiles, and AI-ranked pipelines.
          </p>

          {/* Stats */}
          <div style={S.statsRow}>
            {[
              { n: "9 days", l: "Avg. to shortlist" },
              { n: "94%",    l: "AI parse accuracy" },
              { n: "0 ghost",l: "Every candidate updated" },
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
    minHeight: "100vh", display: "flex",
    fontFamily: "'Inter', sans-serif",
    background: T.bg, position: "relative", overflow: "hidden",
  },
  left: {
    flex: 1, display: "flex", alignItems: "center",
    justifyContent: "center", padding: "60px 40px", zIndex: 1,
  },
  leftInner: { maxWidth: 500 },
  logoRow: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 52,
  },
  logoMark: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    background: T.dark,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "white", fontFamily: "'Playfair Display', serif",
    fontWeight: 800, fontSize: 20,
  },
  logoText: {
    fontFamily: "'Inter', sans-serif", fontWeight: 700,
    fontSize: 18, color: T.dark, letterSpacing: "-0.3px",
    marginRight: 8,
  },
  badge: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
    color: T.dark4, background: T.bg3,
    border: `1px solid ${T.border}`,
    padding: "2px 8px", borderRadius: 5,
  },
  hero: {
    fontFamily: "'Playfair Display', serif", fontSize: 52,
    fontWeight: 900, color: T.dark,
    lineHeight: 1.1, letterSpacing: "-0.02em",
    marginBottom: 20,
  },
  heroAccent: {
    fontStyle: "italic", color: T.orange,
  },
  heroSub: {
    fontSize: 16, color: T.dark3, lineHeight: 1.8, marginBottom: 44,
  },
  statsRow: { display: "flex", gap: 36, marginBottom: 48 },
  statBox: { display: "flex", flexDirection: "column", gap: 4 },
  statNum: {
    fontFamily: "'Playfair Display', serif", fontSize: 28,
    fontWeight: 800, color: T.orange,
  },
  statLbl: { fontSize: 12, color: T.dark4, fontWeight: 500 },
  trustedRow: {
    borderTop: `1px solid ${T.border}`, paddingTop: 24,
  },
  trustedLabel: {
    fontSize: 11, letterSpacing: "0.08em", color: T.dark4,
    fontWeight: 700, marginBottom: 12,
  },
  trustedLogos: { display: "flex", gap: 20, flexWrap: "wrap" },
  trustedLogo: { fontSize: 13, color: T.dark3, fontWeight: 500 },
  right: {
    width: 490, display: "flex", alignItems: "center",
    justifyContent: "center", padding: "40px 32px", zIndex: 1,
  },
  card: {
    width: "100%", background: T.white,
    border: `1px solid ${T.border}`,
    borderRadius: 24, padding: 40,
    boxShadow: T.shadow2,
    animation: "fadeUp 0.4s ease both",
  },
  tabRow: {
    display: "flex", gap: 4, padding: 4,
    background: T.bg2, borderRadius: 12,
  },
  tab: {
    flex: 1, padding: "9px 16px", borderRadius: 9,
    border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
    fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
  },
  tabActive: {
    background: T.dark, color: "white",
    boxShadow: "0 1px 4px rgba(12,12,16,0.18)",
  },
  tabInactive: {
    background: "transparent", color: T.dark4,
  },
  cardTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 26,
    fontWeight: 800, color: T.dark, letterSpacing: "-0.3px",
    marginBottom: 6,
  },
  cardSub: { fontSize: 14, color: T.dark3 },
  googleBtn: {
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10, padding: "13px 20px",
    background: T.bg2, border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.dark2, fontSize: 14,
    fontWeight: 500, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
  },
  divider: {
    display: "flex", alignItems: "center", gap: 12, margin: "20px 0",
  },
  divLine: { flex: 1, height: 1, background: T.border },
  divText: { fontSize: 12, color: T.dark4 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 13, fontWeight: 500, color: T.dark2 },
  input: {
    width: "100%", padding: "13px 16px",
    background: T.bg, border: `1.5px solid ${T.border}`,
    borderRadius: 10, color: T.dark, fontSize: 14,
    transition: "all 0.2s", fontFamily: "'Inter', sans-serif",
  },
  errorBox: {
    padding: "10px 14px", background: T.red2,
    border: `1px solid rgba(192,57,43,0.15)`,
    borderRadius: 10, color: T.red, fontSize: 13,
  },
  submitBtn: {
    width: "100%", padding: "14px 20px",
    background: T.orange, border: "none", borderRadius: 12,
    color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", marginTop: 4,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: `0 4px 16px ${T.orange}40`, transition: "all 0.2s",
  },
  spinner: {
    width: 18, height: 18,
    border: "2px solid rgba(255,255,255,0.35)",
    borderTopColor: "white", borderRadius: "50%",
    animation: "spin 0.8s linear infinite", display: "inline-block",
  },
  toggleRow: {
    textAlign: "center", fontSize: 14,
    color: T.dark4, marginTop: 20,
  },
  toggleBtn: {
    background: "none", border: "none", color: T.orange,
    cursor: "pointer", fontSize: 14, fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
  terms: {
    textAlign: "center", fontSize: 12,
    color: T.dark4, marginTop: 16,
  },
  link: { color: T.orange, textDecoration: "none" },
};
