import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"

/* ─────────────────────────── DESIGN TOKENS ─────────────────────────── */
const T = {
  bg:      "#FAF8F5",
  bg2:     "#F3F0EB",
  bg3:     "#EDE9E2",
  white:   "#FFFFFF",
  orange:  "#FF4A1C",
  orange2: "#FFF2EE",
  orange3: "#FFE4DC",
  dark:    "#0C0C10",
  dark2:   "#1E1E28",
  dark3:   "#4A4A5A",
  dark4:   "#8A8A9A",
  border:  "rgba(12,12,16,0.08)",
  borderD: "rgba(250,248,245,0.10)",
  shadow:  "0 2px 16px rgba(12,12,16,0.06), 0 1px 4px rgba(12,12,16,0.04)",
  shadowM: "0 6px 28px rgba(12,12,16,0.09), 0 2px 8px rgba(12,12,16,0.05)",
  shadowL: "0 16px 56px rgba(12,12,16,0.14), 0 4px 16px rgba(12,12,16,0.07)",
}

/* ─────────────────────────── ANIMATED COUNTER ──────────────────────── */
function Counter({ target, suffix = "", prefix = "", duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef()
  const timerRef = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      let v = 0
      const step = target / (duration / 16)
      timerRef.current = setInterval(() => {
        v += step
        if (v >= target) { setVal(target); clearInterval(timerRef.current); timerRef.current = null }
        else setVal(Math.floor(v))
      }, 16)
      obs.disconnect()
    }, { threshold: 0.4 })
    if (ref.current) obs.observe(ref.current)
    return () => {
      obs.disconnect()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [target, duration])
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>
}

/* ─────────────────────────── SECTION LABEL ─────────────────────────── */
function Label({ children }) {
  return (
    <div style={{ display:"inline-block", fontSize:11, fontWeight:700, color:T.orange,
      letterSpacing:"0.1em", marginBottom:14, textTransform:"uppercase" }}>
      {children}
    </div>
  )
}

/* ─────────────────────────── SCROLL REVEAL ──────────────────────────── */
// Fades + slides a section's content into place the first time it enters
// the viewport, instead of everything being visible/static on load.
function Reveal({ children, delay = 0, y = 36 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 0.7s cubic-bezier(.2,.7,.2,1) ${delay}s, transform 0.7s cubic-bezier(.2,.7,.2,1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────── SCROLL PROGRESS BAR ────────────────────── */
function ScrollProgress() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const scrollable = h.scrollHeight - h.clientHeight
      setPct(scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, height:3, zIndex:300, background:"transparent", pointerEvents:"none" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${T.orange},#7C5FF5)`, transition:"width 0.1s linear" }} />
    </div>
  )
}

/* ─────────────────────────── CONTENT DATA ──────────────────────────── */
const PROBLEMS = [
  { icon:"📄", title:"Resume Overload",        desc:"Your team drowns in CVs. 80% never get read. Good candidates disappear in the noise." },
  { icon:"⏳", title:"Screening Takes Weeks",   desc:"Manual review, back-and-forth, siloed tools. Shortlisting a role takes 3–6 weeks on average." },
  { icon:"👻", title:"Candidate Ghosting",      desc:"No status updates, no transparency. Candidates ghost because hiring feels like a black box." },
  { icon:"🔧", title:"Fragmented Tooling",      desc:"ATS, video platform, assessment tool, email, spreadsheet. Six tools for one hire." },
  { icon:"🎭", title:"Unverified Claims",       desc:"Anyone can write '5 years of experience.' Nobody verifies. You only find out after onboarding." },
  { icon:"🪦", title:"Hiring Ends at Offer",    desc:"After joining, the system forgets them. No growth, no mobility, no continuity." },
]

const FEATURE_CLUSTERS = [
  {
    heading: "Hiring OS",
    color: T.orange,
    items: ["AI-ranked application pipeline", "Bulk clustering — Strong Fit, Interview Ready, Future Pool", "Bulk shortlist, reject, communicate, move", "Role-specific scoring weights", "Multi-stage pipeline with SLA tracking"],
  },
  {
    heading: "Skill Verification",
    color: "#7C5FF5",
    items: ["Verified Skill Passport — earned, not claimed", "ELO rating updated with every real task", "Arena challenge simulations per role", "Identity, degree & employment verification", "Skill graph with domain depth + breadth"],
  },
  {
    heading: "Decision Support",
    color: "#0EA5E9",
    items: ["Side-by-side candidate comparison", "AI ranking explanation per shortlist", "Fairness Ledger — blind scoring mode", "Reactivation Pool for near-misses", "Competitive intelligence on market ELO"],
  },
  {
    heading: "Candidate Transparency",
    color: T.orange,
    items: ["Live application status portal for candidates", "Stage progress timeline with timestamps", "Structured rejection with growth roadmap", "AI-generated decision explanations", "Zero ghosting — every candidate gets a response"],
  },
  {
    heading: "Interview Operations",
    color: "#7C5FF5",
    items: ["One-click interview scheduling", "AI-structured question banks per role", "Async shadow interview engine", "Video interview with scoring overlay", "73% fewer missed interview slots"],
  },
  {
    heading: "Post-Hire Growth",
    color: "#0EA5E9",
    items: ["Employee growth graph post-joining", "Internal mobility and upskilling workflows", "Internal mentor marketplace", "Company communication workspace", "Single lifecycle profile: learner → employee → mentor"],
  },
]

const LIFECYCLE = [
  { n:"01", title:"Candidate builds signals",     desc:"They complete real tasks, earn ELO, verify credentials. Their profile is built before they even apply." },
  { n:"02", title:"Applies — any channel",        desc:"Via Capabilio AI platform, your careers page, API, or referral. Every source deduplicated automatically." },
  { n:"03", title:"AI ranks and clusters",        desc:"ELO + verified skills + Arena performance + role-fit score. Your pipeline is pre-sorted when you open it." },
  { n:"04", title:"You review and decide",        desc:"Compare, challenge, schedule, communicate — all in one place. Average 9 days from post to shortlist." },
  { n:"05", title:"Transparent feedback",         desc:"Every candidate receives structured status updates and decision explanations. No black box. No ghosting." },
  { n:"06", title:"Hire and continue",            desc:"Post-hire, the profile lives on. Growth, mobility, mentoring, and internal networking — all connected." },
]

const DIFFERENTIATORS = [
  { icon:"🏆", title:"Verified Skill Passport",       desc:"An ELO score that is earned through real tasks — not written on a resume. Impossible to fake." },
  { icon:"⚖️",  title:"Fairness Ledger",               desc:"Every hiring decision is logged with reasoning. Full audit trail. Bias detection built in." },
  { icon:"🔍", title:"Transparent Candidate Timeline", desc:"Candidates see exactly where they stand, what's pending, and why. Industry-first transparency layer." },
  { icon:"🎯", title:"Arena Role Simulations",         desc:"Candidates complete actual role challenges — not MCQs. You see their thinking, not just their answers." },
  { icon:"♻️", title:"Strong-But-Not-Selected Pool",   desc:"Every near-miss goes into a warm pool, auto-reactivated when they upskill. Zero talent wasted." },
  { icon:"🔄", title:"Post-Hire OS",                   desc:"The system continues after joining. Growth tracking, internal mobility, mentoring. One continuous profile." },
]

/* ─────────────────────────── MAIN COMPONENT ────────────────────────── */
export default function LandingPage() {
  const navigate   = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % LIFECYCLE.length), 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:T.bg, color:T.dark, overflowX:"hidden" }}>
      <ScrollProgress />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .btn-primary{transition:all 0.2s!important}
        .btn-primary:hover{background:#e03c10!important;transform:translateY(-2px)!important;box-shadow:0 8px 32px rgba(255,74,28,0.4)!important}
        .btn-ghost:hover{background:rgba(250,248,245,0.12)!important;border-color:rgba(250,248,245,0.3)!important}
        .btn-outline:hover{background:${T.bg3}!important}
        .nav-link:hover{color:${T.dark}!important}
        .problem-card:hover{transform:translateY(-3px)!important;box-shadow:${T.shadowM}!important;border-color:rgba(255,74,28,0.15)!important}
        .feature-item:hover{color:${T.dark}!important}
        .diff-card:hover{transform:translateY(-4px)!important;box-shadow:${T.shadowL}!important;border-color:rgba(255,74,28,0.18)!important}
        @media(max-width:900px){
          .hero-grid{grid-template-columns:1fr!important}
          .stats-grid{grid-template-columns:1fr 1fr!important}
          .problems-grid{grid-template-columns:1fr 1fr!important}
          .features-cluster{grid-template-columns:1fr!important}
          .lifecycle-grid{grid-template-columns:1fr!important}
          .diff-grid{grid-template-columns:1fr 1fr!important}
          .footer-inner{flex-direction:column!important;gap:24px!important;text-align:center!important}
        }
      `}</style>

      {/* ══════════════════════════ NAV ══════════════════════════ */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        background: scrolled ? "rgba(250,248,245,0.97)" : "transparent",
        borderBottom: scrolled ? `1px solid ${T.border}` : "none",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        padding:"0 clamp(20px,6vw,100px)",
        height:68, display:"flex", alignItems:"center", justifyContent:"space-between",
        transition:"all 0.3s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/logo-light.jpeg" alt="Capabilio AI" style={{ height:44, width:"auto", display:"block" }} />
          <span style={{ fontSize:10, fontWeight:700, color:T.dark4, background:T.bg3, border:`1px solid ${T.border}`, padding:"2px 8px", borderRadius:5, letterSpacing:"0.06em" }}>RECRUITER</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:28 }}>
          {["How It Works","Features"].map(l=>(
            <a key={l} className="nav-link" href={`#${l.toLowerCase().replace(/ /g,"-")}`}
              style={{ fontSize:13, fontWeight:500, color:T.dark3, textDecoration:"none", transition:"color 0.2s" }}>{l}</a>
          ))}
          <a href="https://capabilio.online" target="_blank" rel="noopener noreferrer"
            style={{ fontSize:13, fontWeight:500, color:T.orange, textDecoration:"none" }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            capabilio.online ↗
          </a>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-outline" onClick={()=>navigate("/recruiter")}
            style={{ fontSize:13, fontWeight:600, padding:"9px 20px", background:"transparent", color:T.dark2, border:`1.5px solid ${T.border}`, borderRadius:8, cursor:"pointer", transition:"all 0.2s", letterSpacing:"0.02em" }}>
            SIGN IN
          </button>
          <button className="btn-primary" onClick={()=>navigate("/recruiter")}
            style={{ fontSize:13, fontWeight:700, padding:"9px 22px", background:T.orange, color:"white", border:"none", borderRadius:8, cursor:"pointer", letterSpacing:"0.02em", boxShadow:`0 2px 12px ${T.orange}35` }}>
            BOOK DEMO
          </button>
        </div>
      </nav>

      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <section style={{ minHeight:"100vh", display:"flex", alignItems:"center", padding:"100px clamp(20px,6vw,100px) 70px", maxWidth:1360, margin:"0 auto" }}>
        <div className="hero-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center", width:"100%" }}>

          {/* LEFT */}
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:T.white, border:`1px solid ${T.border}`, borderRadius:30, padding:"7px 16px", marginBottom:32, boxShadow:T.shadow, animation:"fadeUp 0.5s ease both" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:T.orange, display:"inline-block", animation:"pulse 2s infinite", flexShrink:0 }} />
              <span style={{ fontSize:11, fontWeight:700, color:T.dark3, letterSpacing:"0.08em" }}>INDIA'S FIRST TRANSPARENT TALENT OPERATING SYSTEM</span>
            </div>

            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(38px,4.6vw,60px)", fontWeight:900, lineHeight:1.06, letterSpacing:"-0.025em", marginBottom:24, animation:"fadeUp 0.6s ease both 0.1s both" }}>
              Hiring shouldn't be<br />
              <em style={{ color:T.orange, fontStyle:"italic" }}>a black box.</em>
            </h1>

            <p style={{ fontSize:17, color:T.dark3, lineHeight:1.8, marginBottom:14, maxWidth:510, animation:"fadeUp 0.6s ease both 0.2s both" }}>
              Capabilio AI Recruiter is a transparent, full-cycle talent operating system. It replaces resume-heavy screening with live ELO skill signals, verified candidate profiles, and AI-ranked pipelines — so you hire on proof, not promises.
            </p>
            <p style={{ fontSize:14, color:T.dark4, lineHeight:1.7, marginBottom:34, maxWidth:490, fontStyle:"italic", animation:"fadeUp 0.6s ease both 0.25s both" }}>
              "Built for companies that want faster hiring without black-box decisions."
            </p>

            <div style={{ display:"flex", gap:14, marginBottom:40, flexWrap:"wrap", animation:"fadeUp 0.6s ease both 0.3s both" }}>
              <button className="btn-primary" onClick={()=>navigate("/recruiter")}
                style={{ fontSize:15, fontWeight:700, padding:"15px 32px", background:T.orange, color:"white", border:"none", borderRadius:10, cursor:"pointer", boxShadow:`0 4px 24px ${T.orange}45`, letterSpacing:"0.02em" }}>
                START 3-MONTH PILOT →
              </button>
              <button className="btn-outline" onClick={()=>navigate("/recruiter")}
                style={{ fontSize:14, fontWeight:600, padding:"15px 26px", background:"transparent", color:T.dark2, border:`1.5px solid ${T.border}`, borderRadius:10, cursor:"pointer", transition:"all 0.2s" }}>
                BOOK A DEMO
              </button>
            </div>

            {/* Early access note (honest — no fabricated customer counts) */}
            <div style={{ display:"flex", alignItems:"center", gap:10, animation:"fadeUp 0.6s ease both 0.4s both" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:T.orange, display:"inline-block", flexShrink:0 }} />
              <div style={{ fontSize:13, fontWeight:600, color:T.dark3 }}>
                Early access · Onboarding our first pilot teams now
              </div>
            </div>
          </div>

          {/* RIGHT — Dashboard Preview */}
          <div style={{ position:"relative", animation:"fadeUp 0.7s ease both 0.3s both" }}>
            <div style={{ position:"absolute", width:320, height:320, top:"45%", left:"50%", transform:"translate(-50%,-50%)", borderRadius:"50%", background:`radial-gradient(circle, ${T.orange2}, transparent 70%)`, filter:"blur(60px)", pointerEvents:"none" }} />

            {/* Main card */}
            <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:20, padding:26, boxShadow:T.shadowL, position:"relative" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:T.dark4, letterSpacing:"0.08em", marginBottom:4 }}>SAMPLE VIEW — CANDIDATE RANKING</div>
                  <div style={{ fontSize:15, fontWeight:700, color:T.dark }}>Senior ML Engineer · 47 applicants</div>
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:T.orange, background:T.orange2, padding:"4px 10px", borderRadius:6, border:`1px solid ${T.orange}22` }}>AI RANKED</div>
              </div>

              {/* Candidate rows */}
              {[
                { name:"Arjun Mehta",   role:"ML · IIT Bombay",     elo:1847, fit:96, tag:"Strong Fit",      tagC:T.orange },
                { name:"Priya Sharma",  role:"Data · BITS Pilani",  elo:1643, fit:88, tag:"Interview Ready", tagC:"#0EA5E9" },
                { name:"Ravi Nair",     role:"Backend · NIT",       elo:1402, fit:74, tag:"Strong Fit",      tagC:T.orange },
              ].map((c,i)=>(
                <div key={c.name} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:10, background: i===0 ? T.orange2 : T.bg, marginBottom:8, border:`1px solid ${i===0 ? T.orange+"22" : T.border}` }}>
                  <div style={{ width:36, height:36, borderRadius:10, background: i===0 ? T.orange : T.bg3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color: i===0 ? "white" : T.dark3, flexShrink:0 }}>
                    {c.name.split(" ").map(w=>w[0]).join("")}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.dark }}>{c.name}</div>
                    <div style={{ fontSize:11, color:T.dark4 }}>{c.role}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:T.orange, fontFamily:"'Playfair Display',serif", lineHeight:1 }}>{c.elo}</div>
                    <div style={{ fontSize:9, fontWeight:700, color:T.dark4, letterSpacing:"0.06em" }}>ELO</div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:c.tagC, background:`${c.tagC}15`, padding:"3px 8px", borderRadius:5, border:`1px solid ${c.tagC}22`, flexShrink:0 }}>{c.tag}</div>
                </div>
              ))}

              {/* Bottom actions */}
              <div style={{ display:"flex", gap:8, marginTop:14 }}>
                <button style={{ flex:1, padding:"9px 0", background:T.orange, color:"white", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"0.03em" }}>BULK SHORTLIST</button>
                <button style={{ flex:1, padding:"9px 0", background:T.bg, color:T.dark3, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>COMPARE</button>
                <button style={{ flex:1, padding:"9px 0", background:T.bg, color:T.dark3, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>SCHEDULE ALL</button>
              </div>
            </div>

            {/* Floating badges */}
            <div style={{ position:"absolute", bottom:-18, left:-20, background:T.white, border:`1px solid ${T.border}`, borderRadius:14, padding:"12px 18px", boxShadow:T.shadowM, animation:"float 3s ease-in-out infinite" }}>
              <div style={{ fontSize:22, fontWeight:800, color:T.orange, fontFamily:"'Playfair Display',serif", lineHeight:1 }}>9-day</div>
              <div style={{ fontSize:11, color:T.dark3, marginTop:2 }}>shortlist time — our target</div>
            </div>
            <div style={{ position:"absolute", top:-14, right:-20, background:T.white, border:`1px solid ${T.border}`, borderRadius:14, padding:"12px 18px", boxShadow:T.shadowM, animation:"float 3.5s ease-in-out infinite 0.6s" }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#7C5FF5", fontFamily:"'Playfair Display',serif", lineHeight:1 }}>0 ghost</div>
              <div style={{ fontSize:11, color:T.dark3, marginTop:2 }}>design commitment</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ TICKER ══════════════════════════ */}
      <div style={{ background:T.dark, overflow:"hidden", padding:"14px 0" }}>
        <div style={{ display:"flex", animation:"ticker 24s linear infinite", whiteSpace:"nowrap" }}>
          {[...Array(2)].map((_,ri)=>(
            <div key={ri} style={{ display:"flex" }}>
              {["ELO Skill Ratings","Verified Skill Passport","Arena Simulations","Fairness Ledger","Bulk Clustering","Transparent Timeline","AI Decision Explanations","Shadow Interviews","Internal Mobility","Zero Ghosting","Post-Hire Growth OS"].map((item,i)=>(
                <span key={`${ri}-${i}`} style={{ fontSize:12, fontWeight:600, color:"rgba(250,248,245,0.4)", padding:"0 30px", borderRight:"1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color:T.orange, marginRight:10 }}>●</span>{item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════ STATS ══════════════════════════ */}
      <section style={{ background:T.bg }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto", padding:"0 clamp(20px,6vw,100px)" }}>
          <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
            {[
              { value:9,   suffix:"d",  label:"Target shortlist time",  sub:"Designed to replace 4–6 week processes" },
              { value:94,  suffix:"%",  label:"Target parse accuracy",  sub:"AI-powered resume screening" },
              { value:73,  suffix:"%",  label:"Less manual work (goal)",sub:"vs. traditional ATS workflows" },
              { value:100, suffix:"%",  label:"Candidate updates",      sub:"Zero-ghosting is a core design commitment" },
            ].map((m,i)=>(
              <div key={m.label} style={{ padding:"40px 32px", borderRight: i<3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:52, fontWeight:900, color:T.orange, lineHeight:1 }}>
                  <Counter target={m.value} suffix={m.suffix} />
                </div>
                <div style={{ fontSize:15, fontWeight:600, color:T.dark, marginTop:12 }}>{m.label}</div>
                <div style={{ fontSize:13, color:T.dark4, marginTop:4 }}>{m.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center", padding:"18px 0 32px" }}>
            <p style={{ fontSize:12, color:T.dark4, fontStyle:"italic" }}>
              Figures reflect what Capabilio AI Recruiter is engineered to deliver — we're in early pilot and will publish real results as we onboard our first teams.
            </p>
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ PROBLEM ══════════════════════════ */}
      <section style={{ padding:"100px clamp(20px,6vw,100px)", background:T.bg2 }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto" }}>
          <div style={{ maxWidth:600, marginBottom:60 }}>
            <Label>The Problem</Label>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(30px,3.8vw,48px)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.02em" }}>
              Normal hiring is<br /><em style={{ color:T.orange, fontStyle:"italic" }}>broken by design.</em>
            </h2>
            <p style={{ fontSize:16, color:T.dark3, lineHeight:1.8, marginTop:18 }}>
              Companies have accepted slow shortlisting, unverified candidates, and silent rejection as the norm. Capabilio AI Recruiter was built to end all of it.
            </p>
          </div>
          <div className="problems-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {PROBLEMS.map(p=>(
              <div key={p.title} className="problem-card"
                style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:16, padding:"28px 26px", boxShadow:T.shadow, transition:"all 0.22s", cursor:"default" }}>
                <div style={{ fontSize:30, marginBottom:16 }}>{p.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:T.dark, marginBottom:10 }}>{p.title}</div>
                <div style={{ fontSize:14, color:T.dark3, lineHeight:1.75 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ WHY CAPABILIO AI ══════════════════════════ */}
      <section style={{ padding:"100px clamp(20px,6vw,100px)", background:T.dark }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
            <div>
              <Label>Why Capabilio AI</Label>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(30px,3.8vw,48px)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.02em", color:"white", marginBottom:24 }}>
                Not an ATS.<br /><em style={{ color:T.orange, fontStyle:"italic" }}>A new category.</em>
              </h2>
              <p style={{ fontSize:16, color:"rgba(250,248,245,0.6)", lineHeight:1.85, marginBottom:32 }}>
                Capabilio AI Recruiter is a transparent talent operating system that starts before hiring and continues after joining. It is not a job portal. Not an ATS. Not just an assessment tool. It is the full cycle — from role creation to employee growth — in one unified system.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[
                  "Replaces resume screening with live ELO skill intelligence",
                  "Moves companies from application overload to decision clarity",
                  "Makes hiring transparent for both recruiters and candidates",
                  "Keeps talent warm even after rejection through structured feedback",
                  "Continues post-hire through onboarding, growth, and internal mobility",
                ].map(item=>(
                  <div key={item} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <span style={{ color:T.orange, fontSize:16, marginTop:2, flexShrink:0 }}>→</span>
                    <span style={{ fontSize:14, color:"rgba(250,248,245,0.75)", lineHeight:1.7 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Comparison table */}
            <div style={{ background:"rgba(250,248,245,0.04)", border:"1px solid rgba(250,248,245,0.08)", borderRadius:20, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", background:"rgba(250,248,245,0.06)" }}>
                {["Capability","Normal ATS","Capabilio AI"].map((h,i)=>(
                  <div key={h} style={{ padding:"14px 18px", fontSize:12, fontWeight:700, color: i===2 ? T.orange : "rgba(250,248,245,0.45)", letterSpacing:"0.05em", borderRight: i<2 ? "1px solid rgba(250,248,245,0.06)" : "none" }}>{h}</div>
                ))}
              </div>
              {[
                ["Skill verification",    "❌ None",          "✅ ELO + Passport"],
                ["AI ranking",            "⚠️ Basic filter",  "✅ Multi-signal AI"],
                ["Candidate updates",     "❌ Silent",         "✅ Live timeline"],
                ["Post-hire system",      "❌ Ends at offer",  "✅ Full lifecycle"],
                ["Fairness audit",        "❌ No trail",       "✅ Full ledger"],
                ["Rejection feedback",    "❌ Template email", "✅ Growth roadmap"],
                ["Internal mobility",     "❌ Separate tool",  "✅ Built in"],
              ].map(([cap,old,cap2],i)=>(
                <div key={cap} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderTop:"1px solid rgba(250,248,245,0.05)", background: i%2===0 ? "transparent" : "rgba(250,248,245,0.02)" }}>
                  <div style={{ padding:"13px 18px", fontSize:13, color:"rgba(250,248,245,0.55)", borderRight:"1px solid rgba(250,248,245,0.05)" }}>{cap}</div>
                  <div style={{ padding:"13px 18px", fontSize:13, color:"rgba(250,248,245,0.35)", borderRight:"1px solid rgba(250,248,245,0.05)" }}>{old}</div>
                  <div style={{ padding:"13px 18px", fontSize:13, color:"rgba(250,248,245,0.85)", fontWeight:500 }}>{cap2}</div>
                </div>
              ))}
            </div>
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ HOW IT REDUCES TIME ══════════════════════════ */}
      <section style={{ padding:"100px clamp(20px,6vw,100px)", background:T.bg }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <Label>Time Savings</Label>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(30px,3.8vw,48px)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.02em" }}>
              Your recruiters should be<br /><em style={{ color:T.orange, fontStyle:"italic" }}>deciding, not digging.</em>
            </h2>
            <p style={{ fontSize:16, color:T.dark3, lineHeight:1.8, marginTop:18, maxWidth:560, margin:"18px auto 0" }}>
              Every manual step that slows hiring is replaced by an intelligent, automated layer. Here is exactly how Capabilio AI Recruiter returns time to your team.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, border:`1px solid ${T.border}`, borderRadius:20, overflow:"hidden", background:T.white, boxShadow:T.shadow }}>
            {[
              { title:"Arrives pre-ranked",  time:"Save 3–4 weeks", desc:"1,000 applications arrive clustered into Strong Fit, Interview Ready, Future Pool. You open the dashboard to a decision, not a task." },
              { title:"Bulk actions",        time:"Save 2 days",    desc:"Bulk shortlist, bulk reject, bulk communicate, bulk move stages. What took 40 individual actions now takes one click." },
              { title:"Verified on arrival", time:"Save 1 week",    desc:"Credentials are verified before you review. No chasing references, no post-offer surprises." },
              { title:"Auto-scheduling",     time:"Save 3 days",    desc:"73% fewer missed interviews. Candidates book directly. Conflicts resolved automatically. Reminders sent." },
              { title:"Compare mode",        time:"Save 5 hours",   desc:"Side-by-side candidate comparison with AI explanation. Final decision meetings go from 90 minutes to 20." },
              { title:"Zero follow-up",      time:"Save 1–2 days",  desc:"Candidates can see live status. Recruiter inbox stops filling with 'any update?' emails." },
            ].map((item,i)=>(
              <div key={item.title} style={{ padding:"32px 28px", borderRight: (i+1)%3!==0 ? `1px solid ${T.border}` : "none", borderBottom: i<3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.orange, letterSpacing:"0.06em", marginBottom:10, background:T.orange2, display:"inline-block", padding:"3px 10px", borderRadius:5 }}>{item.time}</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.dark, marginBottom:10, marginTop:12 }}>{item.title}</div>
                <div style={{ fontSize:14, color:T.dark3, lineHeight:1.75 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ TRANSPARENCY ══════════════════════════ */}
      <section style={{ padding:"100px clamp(20px,6vw,100px)", background:T.bg2 }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
            {/* Timeline visual */}
            <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:20, padding:28, boxShadow:T.shadowM }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.dark4, letterSpacing:"0.08em", marginBottom:18 }}>CANDIDATE STATUS — LIVE VIEW</div>
              <div style={{ fontSize:15, fontWeight:700, color:T.dark, marginBottom:4 }}>Arjun Mehta · Senior ML Engineer</div>
              <div style={{ fontSize:13, color:T.dark4, marginBottom:24 }}>Applied 3 days ago · Razorpay Role</div>
              {[
                { label:"Application received",   time:"Day 1, 9:41 AM",  done:true,    color:T.orange },
                { label:"AI screening complete",  time:"Day 1, 9:43 AM",  done:true,    color:T.orange },
                { label:"Skill verification",      time:"Day 2, 2:15 PM",  done:true,    color:T.orange },
                { label:"Shortlisted by recruiter",time:"Day 3, 11:00 AM", done:true,    color:T.orange },
                { label:"Interview scheduled",     time:"Day 5, 3:00 PM",  done:false,   color:T.dark4  },
                { label:"Offer / Decision",        time:"Pending",         done:false,   color:T.dark4  },
              ].map((step,i)=>(
                <div key={step.label} style={{ display:"flex", gap:14, marginBottom: i < 5 ? 0 : 0 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", background: step.done ? step.color : T.bg3, border:`2px solid ${step.done ? step.color : T.border}`, flexShrink:0, marginTop:2 }} />
                    {i < 5 && <div style={{ width:2, height:28, background: step.done ? `${T.orange}30` : T.bg3, marginTop:2 }} />}
                  </div>
                  <div style={{ paddingBottom:i<5?14:0 }}>
                    <div style={{ fontSize:13, fontWeight: step.done ? 600 : 400, color: step.done ? T.dark : T.dark4 }}>{step.label}</div>
                    <div style={{ fontSize:11, color:T.dark4, marginTop:2 }}>{step.time}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop:20, padding:"12px 16px", background:T.orange2, borderRadius:10, border:`1px solid ${T.orange}22` }}>
                <div style={{ fontSize:12, fontWeight:600, color:T.orange }}>✓ Arjun can see this timeline in real time.</div>
                <div style={{ fontSize:11, color:T.dark3, marginTop:3 }}>No "any update?" emails. No anxiety. Full visibility.</div>
              </div>
            </div>

            {/* Copy */}
            <div>
              <Label>Transparency Layer</Label>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(30px,3.8vw,46px)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:22 }}>
                Hiring that candidates<br /><em style={{ color:T.orange, fontStyle:"italic" }}>actually trust.</em>
              </h2>
              <p style={{ fontSize:16, color:T.dark3, lineHeight:1.8, marginBottom:28 }}>
                Capabilio AI Recruiter makes hiring visible — not just to your team, but to candidates. Every stage movement, every pending action, every timeline event is surfaced in a live candidate portal. The black box is gone.
              </p>
              {[
                { title:"Live application status",    desc:"Candidates see exactly where they are in the process — without emailing you." },
                { title:"AI decision explanations",   desc:"When you decide, candidates get a structured explanation — not silence or a template rejection." },
                { title:"Structured rejection",       desc:"Rejections include a personalised growth roadmap. Candidates leave with respect, not bitterness." },
                { title:"Fairness Ledger",            desc:"Every decision is logged with reasoning. Full audit trail. Bias-detection built in. Export-ready." },
              ].map(item=>(
                <div key={item.title} style={{ display:"flex", gap:14, marginBottom:18 }}>
                  <span style={{ color:T.orange, fontSize:18, flexShrink:0, marginTop:1 }}>→</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.dark }}>{item.title}</div>
                    <div style={{ fontSize:13, color:T.dark3, lineHeight:1.7, marginTop:3 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ FEATURE ARCHITECTURE ══════════════════════════ */}
      <section id="features" style={{ padding:"100px clamp(20px,6vw,100px)", background:T.bg }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <Label>Feature Architecture</Label>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(30px,3.8vw,48px)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.02em" }}>
              One system.<br /><em style={{ color:T.orange, fontStyle:"italic" }}>The entire lifecycle.</em>
            </h2>
          </div>
          <div className="features-cluster" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {FEATURE_CLUSTERS.map(cluster=>(
              <div key={cluster.heading} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:18, padding:"28px 26px", boxShadow:T.shadow }}>
                <div style={{ fontSize:12, fontWeight:700, color:cluster.color, letterSpacing:"0.07em", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:cluster.color, display:"inline-block" }} />
                  {cluster.heading.toUpperCase()}
                </div>
                {cluster.items.map(item=>(
                  <div key={item} className="feature-item"
                    style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:`1px solid ${T.border}`, color:T.dark3, transition:"color 0.2s", cursor:"default" }}>
                    <span style={{ color:cluster.color, fontSize:12, marginTop:2, flexShrink:0 }}>✓</span>
                    <span style={{ fontSize:13, lineHeight:1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ DIFFERENTIATORS ══════════════════════════ */}
      <section style={{ padding:"100px clamp(20px,6vw,100px)", background:T.dark }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <Label>What No ATS Offers</Label>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(30px,3.8vw,48px)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.02em", color:"white" }}>
              Built different.<br /><em style={{ color:T.orange, fontStyle:"italic" }}>Built to last.</em>
            </h2>
          </div>
          <div className="diff-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {DIFFERENTIATORS.map(d=>(
              <div key={d.title} className="diff-card"
                style={{ background:"rgba(250,248,245,0.04)", border:"1px solid rgba(250,248,245,0.08)", borderRadius:18, padding:"30px 26px", transition:"all 0.22s", cursor:"default" }}>
                <div style={{ fontSize:32, marginBottom:18 }}>{d.icon}</div>
                <div style={{ fontSize:16, fontWeight:700, color:"white", marginBottom:10 }}>{d.title}</div>
                <div style={{ fontSize:14, color:"rgba(250,248,245,0.55)", lineHeight:1.75 }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ HOW IT WORKS ══════════════════════════ */}
      <section id="how-it-works" style={{ padding:"100px clamp(20px,6vw,100px)", background:T.bg }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto" }}>
          <div style={{ marginBottom:60 }}>
            <Label>How It Works</Label>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(30px,3.8vw,48px)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.02em" }}>
              From first signal<br /><em style={{ color:T.orange, fontStyle:"italic" }}>to lifelong profile.</em>
            </h2>
          </div>
          <div className="lifecycle-grid" style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:0, border:`1px solid ${T.border}`, borderRadius:20, overflow:"hidden", background:T.white, boxShadow:T.shadow }}>
            {LIFECYCLE.map((step,i)=>(
              <div key={step.n}
                onClick={() => setActiveStep(i)}
                style={{ padding:"28px 22px", borderRight: i<5 ? `1px solid ${T.border}` : "none", cursor:"pointer", transition:"all 0.2s", background: activeStep===i ? T.orange2 : "transparent", borderBottom: activeStep===i ? `2px solid ${T.orange}` : "2px solid transparent" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:900, color: activeStep===i ? T.orange : T.bg3, lineHeight:1, marginBottom:16, transition:"color 0.2s" }}>{step.n}</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.dark, marginBottom:8 }}>{step.title}</div>
                <div style={{ fontSize:12, color:T.dark3, lineHeight:1.7 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ TRUST / PROOF ══════════════════════════ */}
      <section style={{ padding:"80px clamp(20px,6vw,100px)", background:T.bg }}>
        <Reveal><div style={{ maxWidth:1360, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <Label>Why Trust Capabilio AI</Label>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(26px,3vw,40px)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.02em" }}>
              No fake testimonials.<br /><em style={{ color:T.orange, fontStyle:"italic" }}>Just product truth.</em>
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
            {[
              { icon:"🔍", title:"Explainability First",   desc:"Every AI decision has an explanation. Recruiters and candidates can understand why." },
              { icon:"🛡️",  title:"Verified by Design",    desc:"Credentials are verified before review. No surprises at offer or onboarding." },
              { icon:"⚖️",  title:"Fairness Built In",     desc:"Blind scoring, bias detection, full audit trail. Every shortlist is defensible." },
              { icon:"🔄", title:"Unified Workflow",       desc:"One system from role creation to employee growth. No fragmented tools, no lost context." },
            ].map(item=>(
              <div key={item.title} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:16, padding:"26px 22px", boxShadow:T.shadow, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:14 }}>{item.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:T.dark, marginBottom:10 }}>{item.title}</div>
                <div style={{ fontSize:13, color:T.dark3, lineHeight:1.75 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ FINAL CTA ══════════════════════════ */}
      <section style={{ padding:"110px clamp(20px,6vw,100px)", background:T.dark }}>
        <Reveal><div style={{ maxWidth:760, margin:"0 auto", textAlign:"center" }}>
          <Label>Get Started</Label>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(34px,4.5vw,58px)", fontWeight:900, color:"white", lineHeight:1.08, letterSpacing:"-0.025em", marginBottom:22 }}>
            Bring clarity<br /><em style={{ color:T.orange, fontStyle:"italic" }}>to hiring.</em>
          </h2>
          <p style={{ fontSize:17, color:"rgba(250,248,245,0.5)", lineHeight:1.85, marginBottom:40, maxWidth:520, margin:"0 auto 40px" }}>
            Start your 3-month free pilot today. No card required. See Capabilio AI Recruiter in action — or book a live demo with our team.
          </p>
          <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
            <button className="btn-primary" onClick={()=>navigate("/recruiter")}
              style={{ fontSize:16, fontWeight:700, padding:"17px 38px", background:T.orange, color:"white", border:"none", borderRadius:12, cursor:"pointer", letterSpacing:"0.02em", boxShadow:`0 4px 28px ${T.orange}50` }}>
              START 3-MONTH PILOT →
            </button>
            <button className="btn-ghost" onClick={()=>navigate("/recruiter")}
              style={{ fontSize:15, fontWeight:600, padding:"17px 30px", background:"transparent", color:"rgba(250,248,245,0.7)", border:"1.5px solid rgba(250,248,245,0.15)", borderRadius:12, cursor:"pointer", transition:"all 0.2s" }}>
              BOOK A DEMO
            </button>
          </div>
          <p style={{ fontSize:13, color:"rgba(250,248,245,0.25)", marginTop:24 }}>
            Free pilot · No card required · Cancel anytime · Full system access
          </p>
        </div></Reveal>
      </section>

      {/* ══════════════════════════ FOOTER ══════════════════════════ */}
      <footer style={{ background:T.dark, borderTop:"1px solid rgba(250,248,245,0.07)", padding:"28px clamp(20px,6vw,100px)" }}>
        <div className="footer-inner" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/logo-dark.jpeg" alt="Capabilio AI" style={{ height:34, width:"auto", display:"block" }} />
            <span style={{ fontSize:13, fontWeight:500, color:"rgba(250,248,245,0.35)" }}>Recruiter · {new Date().getFullYear()}</span>
          </div>
          <div style={{ display:"flex", gap:24, flexWrap:"wrap", justifyContent:"center" }}>
            {["Privacy","Terms","Support"].map(l=>(
              <a key={l} href="#" style={{ fontSize:13, color:"rgba(250,248,245,0.3)", textDecoration:"none", transition:"color 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.color="rgba(250,248,245,0.65)"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(250,248,245,0.3)"}>{l}</a>
            ))}
            <a href="https://capabilio.online" target="_blank" rel="noopener noreferrer"
              style={{ fontSize:13, color:T.orange, textDecoration:"none", fontWeight:600 }}>
              capabilio.online ↗
            </a>
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:18, fontSize:12, color:"rgba(250,248,245,0.25)" }}>
          Amaravati, Andhra Pradesh ❤️ from India
        </div>
      </footer>
    </div>
  )
}
