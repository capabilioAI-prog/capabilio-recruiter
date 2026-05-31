import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"

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
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ target, suffix = "", prefix = "", duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef()
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
          start += step
          if (start >= target) { setVal(target); clearInterval(timer) }
          else setVal(Math.floor(start))
        }, 16)
        obs.disconnect()
      }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target, duration])
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>
}

// ── ELO Profile Card ──────────────────────────────────────────────────────────
function ELOCard({ name, role, elo, skills, readiness, verified, delay = 0 }) {
  const lvl = elo >= 1200 ? { label:"Expert", color:T.amber } : elo >= 1000 ? { label:"Advanced", color:T.indigo } : elo >= 900 ? { label:"Intermediate", color:T.blue } : { label:"Beginner", color:T.ink4 }
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2)
  return (
    <div style={{
      background:T.cream, border:`1px solid ${T.border}`, borderRadius:16,
      padding:"16px", boxShadow:T.shadow,
      animation:`fadeUp 0.6s ease both`, animationDelay:`${delay}ms`,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:T.indigo3, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:T.indigo }}>{initials}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{name}</div>
          <div style={{ fontSize:11, color:T.ink3 }}>{role}</div>
        </div>
        {verified && <span style={{ fontSize:10, fontWeight:700, color:T.green, background:T.green2, borderRadius:5, padding:"2px 6px", border:`1px solid ${T.green}22`, flexShrink:0 }}>✓ Verified</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <span style={{ fontSize:20, fontWeight:800, color:lvl.color, fontFamily:"'Syne',sans-serif" }}>{elo}</span>
        <span style={{ fontSize:11, fontWeight:700, color:lvl.color, background:`${lvl.color}18`, borderRadius:5, padding:"2px 7px" }}>{lvl.label}</span>
      </div>
      <div style={{ height:4, background:T.cream3, borderRadius:2, marginBottom:6 }}>
        <div style={{ width:`${readiness}%`, height:"100%", background:T.green, borderRadius:2 }} />
      </div>
      <div style={{ fontSize:10, color:T.ink3, marginBottom:8 }}>Hire Readiness: <b style={{color:T.green}}>{readiness}%</b></div>
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {skills.map(s => <span key={s} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:T.indigo3, color:T.indigo, border:`1px solid ${T.indigo}22` }}>{s}</span>)}
      </div>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, tag, color = T.indigo }) {
  return (
    <div style={{
      background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:"20px",
      boxShadow:T.shadow, transition:"all 0.2s", cursor:"default",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow=T.shadow2; e.currentTarget.style.borderColor=`${color}44` }}
      onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=T.shadow; e.currentTarget.style.borderColor=T.border }}
    >
      <div style={{ width:44, height:44, borderRadius:12, background:`${color}12`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:14 }}>{icon}</div>
      {tag && <div style={{ fontSize:10, fontWeight:700, color, background:`${color}15`, borderRadius:4, padding:"2px 8px", display:"inline-block", marginBottom:8, letterSpacing:"0.05em" }}>{tag}</div>}
      <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>{desc}</div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [activeStep, setActiveStep] = useState(1)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setActiveStep(s => s === 7 ? 1 : s + 1), 2400)
    return () => clearInterval(interval)
  }, [])

  const NAV_LINKS = ["How It Works", "Features", "Why Capabilio", "Pricing"]

  const LIFECYCLE_STEPS = [
    { n:1, icon:"🌐", title:"Source",     color:T.indigo, subtitle:"All applications unified — your website, Capabilio platform, API, and referrals.", detail:"< 5 min website embed" },
    { n:2, icon:"🧠", title:"AI Screen",  color:T.blue,   subtitle:"Every resume parsed, ELO-scored, and deduplicated automatically before human review.", detail:"94% parse accuracy" },
    { n:3, icon:"📋", title:"Shortlist",  color:T.indigo, subtitle:"AI-ranked candidates with ELO + skill match + verification. No more manual sorting.", detail:"9 days avg to shortlist" },
    { n:4, icon:"⚖️",  title:"Compare",   color:T.amber,  subtitle:"Side-by-side candidate comparisons. Blind score mode eliminates bias.", detail:"Fairness Ledger™ enforced" },
    { n:5, icon:"📅", title:"Interview",  color:T.blue,   subtitle:"One-click scheduling, AI-structured questions, async shadow interviews.", detail:"73% fewer missed interviews" },
    { n:6, icon:"🎁", title:"Offer",      color:T.green,  subtitle:"Generate, negotiate, and e-sign offers without leaving the platform.", detail:"Avg. 1.8 days to accept" },
    { n:7, icon:"🏢", title:"Retain",     color:T.green,  subtitle:"Post-hire: internal mobility, skill growth tracking, and reactivation pool.", detail:"22% higher 12-month retention" },
  ]

  const FEATURES = [
    { icon:"⚡", title:"ELO Hiring Engine",      tag:"CORE",     desc:"Candidates earn ratings through real assessments — not self-reported skills. Expert ≥1200, Advanced ≥1000.", color:T.amber  },
    { icon:"🌐", title:"Website Integration",    tag:"NEW",      desc:"One script tag on your careers page. Applications hit your inbox pre-scored in < 2 seconds.", color:T.indigo },
    { icon:"📥", title:"Unified Applications",   tag:"CORE",     desc:"All sources — Capabilio, your website, API, referrals, CSV imports — deduplicated automatically.", color:T.blue   },
    { icon:"⚖️",  title:"Blind Screening",       tag:"FAIRNESS", desc:"Hide names, photos, and universities. Score on capability alone. Full audit trail.", color:T.indigo },
    { icon:"🤖", title:"Shadow Interviews",       tag:"AI",       desc:"AI conducts async technical interviews on your behalf with consistent, role-specific criteria.", color:T.blue   },
    { icon:"🔀", title:"Internal Mobility",       tag:"RETAIN",   desc:"Surface employees who match open roles before you post externally. Avg. 38 days saved.", color:T.green  },
    { icon:"🛡️",  title:"Verification Engine",   tag:"TRUST",    desc:"ID, degree, and employment verification built in. Candidates can't fake credentials.", color:T.green  },
    { icon:"📊", title:"Analytics & SLA",         tag:"INSIGHTS", desc:"Time-to-shortlist, stage drop-off, candidate experience score, and SLA breach alerts.", color:T.amber  },
    { icon:"♻️", title:"Reactivation Pool",       tag:"SMART",    desc:"Candidates who've upskilled since you passed on them get surfaced automatically.", color:T.indigo },
  ]

  const METRICS = [
    { value:47, suffix:"→9", label:"Days to shortlist",    sub:"vs. 47d industry avg", color:T.indigo },
    { value:94, suffix:"%",  label:"Resume parse accuracy",sub:"AI-powered",           color:T.green  },
    { value:73, suffix:"%",  label:"Fewer missed interviews",sub:"vs. manual scheduling",color:T.blue },
    { value:22, suffix:"%",  label:"Higher retention",     sub:"post-mobility hires",  color:T.amber  },
  ]

  const TESTIMONIALS = [
    { quote:"We went from 40 days to 9 days to shortlist our engineering roles. The ELO system just works.", name:"Priya R.", role:"Head of Talent, FinTech startup", elo:1124 },
    { quote:"The website widget was live in 8 minutes. Applications come in pre-ranked — I just review the top 10.", name:"Aditya S.", role:"Founder & CEO, SaaS company", elo:998  },
    { quote:"Internal mobility saved us 3 senior hires in Q1. We didn't realise the talent was already in-house.", name:"Meera K.", role:"VP People, Enterprise co.", elo:1087 },
  ]

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.cream, color:T.ink, overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        html{scroll-behavior:smooth}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        background: scrolled ? "rgba(246,246,241,0.95)" : "transparent",
        borderBottom: scrolled ? `1px solid ${T.border}` : "none",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        padding:"0 clamp(20px,5vw,80px)",
        height:64, display:"flex", alignItems:"center", justifyContent:"space-between",
        transition:"all 0.3s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:T.ink, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:T.cream, fontSize:16, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>C</span>
          </div>
          <span style={{ fontSize:17, fontWeight:800, color:T.ink, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em" }}>Capabilio</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:32 }}>
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`} style={{ fontSize:13, fontWeight:600, color:T.ink2, textDecoration:"none" }}
              onMouseEnter={e=>e.currentTarget.style.color=T.indigo} onMouseLeave={e=>e.currentTarget.style.color=T.ink2}>{l}</a>
          ))}
          <a href="https://capabilio.online" target="_blank" rel="noopener noreferrer"
            style={{ fontSize:13, fontWeight:600, color:T.indigo, textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            🌐 Capabilio AI
          </a>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>navigate("/recruiter")} style={{ fontSize:13, fontWeight:600, padding:"8px 18px", background:"transparent", color:T.ink2, border:`1.5px solid ${T.border}`, borderRadius:9, cursor:"pointer" }}>Sign In</button>
          <button onClick={()=>navigate("/recruiter")} style={{ fontSize:13, fontWeight:700, padding:"8px 18px", background:T.ink, color:T.cream, border:"none", borderRadius:9, cursor:"pointer" }}>Get Started →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop:130, paddingBottom:80, padding:"130px clamp(20px,5vw,80px) 80px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center" }}>
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:T.indigo3, border:`1px solid ${T.indigo}22`, borderRadius:20, padding:"5px 14px", marginBottom:20, animation:"fadeUp 0.5s ease both" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:T.indigo, animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:11, fontWeight:700, color:T.indigo, letterSpacing:"0.05em" }}>INTELLIGENT TALENT LIFECYCLE PLATFORM</span>
            </div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(36px,4.5vw,56px)", fontWeight:800, color:T.ink, lineHeight:1.08, letterSpacing:"-0.03em", marginBottom:20, animation:"fadeUp 0.6s ease both" }}>
              Hire on proof,<br />
              <span style={{ color:T.indigo }}>not promises.</span>
            </h1>
            <p style={{ fontSize:16, color:T.ink2, lineHeight:1.7, marginBottom:30, maxWidth:460, animation:"fadeUp 0.7s ease both" }}>
              Capabilio replaces your fragmented hiring stack with one intelligent loop — from your company careers page to offer letter to internal mobility. Every candidate ranked by real capability.
            </p>
            <div style={{ display:"flex", gap:12, marginBottom:36, animation:"fadeUp 0.8s ease both" }}>
              <button onClick={()=>navigate("/recruiter")} style={{
                fontSize:14, fontWeight:700, padding:"12px 26px",
                background:T.ink, color:T.cream, border:"none", borderRadius:10, cursor:"pointer",
                boxShadow:`0 4px 20px ${T.ink}22`, transition:"all 0.2s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 28px ${T.ink}33`}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=`0 4px 20px ${T.ink}22`}}
              >Open Recruiter Portal →</button>
              <button onClick={()=>document.getElementById("how-it-works")?.scrollIntoView({behavior:"smooth"})} style={{
                fontSize:13, fontWeight:600, padding:"12px 22px",
                background:"transparent", color:T.ink2, border:`1.5px solid ${T.border}`, borderRadius:10, cursor:"pointer",
              }}>See How It Works ↓</button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16, animation:"fadeUp 0.9s ease both" }}>
              <div style={{ display:"flex" }}>
                {["A","B","C","D"].map((l,i)=>(
                  <div key={l} style={{ width:30, height:30, borderRadius:"50%", background:T.indigo3, border:`2px solid ${T.cream}`, marginLeft:i?-10:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.indigo }}>{l}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>Used by 200+ hiring teams</div>
                <div style={{ fontSize:11, color:T.ink3 }}>★★★★★ 4.9 · 800+ candidates ELO-rated</div>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div style={{ position:"relative", display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ position:"absolute", width:300, height:300, top:"50%", left:"50%", transform:"translate(-50%,-50%)", borderRadius:"50%", background:`radial-gradient(circle, ${T.indigo3}, transparent)`, filter:"blur(40px)", opacity:0.7, pointerEvents:"none" }} />
            <ELOCard name="Arjun Mehta"  role="ML Engineer"    elo={1247} skills={["PyTorch","MLOps","AWS"]}    readiness={92} verified={true}  delay={0}   />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <ELOCard name="Priya S."   role="Product Lead"   elo={1084} skills={["Strategy","SQL"]}           readiness={78} verified={true}  delay={100} />
              <ELOCard name="Ravi N."    role="Backend Eng."   elo={973}  skills={["Go","Kubernetes"]}          readiness={65} verified={false} delay={200} />
            </div>
            <div style={{ position:"absolute", bottom:-10, right:-10, background:T.green2, border:`1px solid ${T.green}22`, borderRadius:12, padding:"10px 14px", animation:"float 3s ease-in-out infinite", boxShadow:T.shadow }}>
              <div style={{ fontSize:20, fontWeight:800, color:T.green, fontFamily:"'Syne',sans-serif" }}>9 days</div>
              <div style={{ fontSize:11, color:T.green }}>avg. time to shortlist</div>
            </div>
            <div style={{ position:"absolute", top:0, right:-10, background:T.amber2, border:`1px solid ${T.amber}22`, borderRadius:12, padding:"10px 14px", animation:"float 3.5s ease-in-out infinite 0.5s", boxShadow:T.shadow }}>
              <div style={{ fontSize:20, fontWeight:800, color:T.amber, fontFamily:"'Syne',sans-serif" }}>94%</div>
              <div style={{ fontSize:11, color:T.amber }}>AI parse accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ background:T.ink, overflow:"hidden", padding:"12px 0" }}>
        <div style={{ display:"flex", animation:"ticker 20s linear infinite", whiteSpace:"nowrap" }}>
          {[...Array(2)].map((_,ri)=>(
            <div key={ri} style={{ display:"flex" }}>
              {["ELO Hiring Engine","Website Integration","Blind Screening","Shadow Interviews","Internal Mobility","Verification Engine","Reactivation Pool","Fairness Ledger","Real-time Analytics"].map((item,i)=>(
                <span key={`${ri}-${i}`} style={{ fontSize:12, fontWeight:600, color:"rgba(246,246,241,0.5)", padding:"0 24px", borderRight:"1px solid rgba(255,255,255,0.08)" }}>{item}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── METRICS ── */}
      <section style={{ padding:"70px clamp(20px,5vw,80px)", background:T.cream2 }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.indigo, letterSpacing:"0.1em", marginBottom:10 }}>BY THE NUMBERS</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(26px,3.5vw,40px)", fontWeight:800, color:T.ink }}>The proof is in the pipeline</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
            {METRICS.map(m=>(
              <div key={m.label} style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:20, padding:"28px 24px", textAlign:"center", boxShadow:T.shadow }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:44, fontWeight:800, color:m.color, lineHeight:1 }}>
                  <Counter target={m.value} suffix={m.suffix} />
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:T.ink2, marginTop:12 }}>{m.label}</div>
                <div style={{ fontSize:12, color:T.ink3, marginTop:4 }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIFECYCLE ── */}
      <section id="how-it-works" style={{ padding:"80px clamp(20px,5vw,80px)", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.indigo, letterSpacing:"0.1em", marginBottom:10 }}>END-TO-END LIFECYCLE</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,3.5vw,42px)", fontWeight:800, color:T.ink, marginBottom:14 }}>One platform. Complete hiring loop.</h2>
          <p style={{ fontSize:15, color:T.ink3, maxWidth:500, margin:"0 auto" }}>From the moment a candidate discovers your company to their first day — and beyond.</p>
        </div>

        {/* Step tabs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:T.cream, border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden", marginBottom:20 }}>
          {LIFECYCLE_STEPS.map((s,i)=>(
            <button key={s.n} onClick={()=>setActiveStep(s.n)} style={{
              padding:"14px 10px", border:"none", cursor:"pointer", textAlign:"center",
              background: activeStep===s.n ? s.color+"10" : "transparent",
              borderRight: i<6 ? `1px solid ${T.border}` : "none",
              borderBottom:`3px solid ${activeStep===s.n ? s.color : "transparent"}`,
              transition:"all 0.15s", fontFamily:"'DM Sans',sans-serif",
            }}>
              <div style={{ fontSize:20, marginBottom:5 }}>{s.icon}</div>
              <div style={{ fontSize:11, fontWeight:700, color: activeStep===s.n ? s.color : T.ink3 }}>{s.title}</div>
            </button>
          ))}
        </div>

        {/* Active step detail */}
        {LIFECYCLE_STEPS.filter(s=>s.n===activeStep).map(s=>(
          <div key={s.n} style={{
            background:s.color+"08", border:`1.5px solid ${s.color}33`, borderRadius:14, padding:"24px 28px",
            display:"flex", justifyContent:"space-between", alignItems:"center", gap:24,
            animation:"fadeUp 0.35s ease",
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:s.color, letterSpacing:"0.08em", marginBottom:6 }}>STEP 0{s.n}</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:T.ink, marginBottom:10 }}>{s.title}</h3>
              <p style={{ fontSize:14, color:T.ink2, lineHeight:1.7, marginBottom:14 }}>{s.subtitle}</p>
              <div style={{ fontSize:12, fontWeight:700, color:s.color, background:s.color+"12", borderRadius:7, padding:"7px 14px", display:"inline-block" }}>→ {s.detail}</div>
            </div>
            <div style={{ fontSize:56 }}>{s.icon}</div>
          </div>
        ))}
      </section>

      {/* ── WEBSITE INTEGRATION CALLOUT ── */}
      <section style={{ padding:"80px clamp(20px,5vw,80px)", background:T.cream2 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.indigo, letterSpacing:"0.1em", marginBottom:12 }}>COMPANY WEBSITE INTEGRATION</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(26px,3vw,40px)", fontWeight:800, color:T.ink, lineHeight:1.15, marginBottom:16 }}>
              Your careers page,<br /><span style={{ color:T.indigo }}>supercharged.</span>
            </h2>
            <p style={{ fontSize:15, color:T.ink2, lineHeight:1.7, marginBottom:24 }}>
              One script tag on your company website sends every application directly into Capabilio — pre-scored, deduped, and ranked. No ATS export. No manual review queue.
            </p>
            {[
              { icon:"⏱", title:"< 5 minute setup", desc:"Drop in a JS snippet or iframe. Done." },
              { icon:"🧠", title:"AI scores on arrival", desc:"Every resume parsed and ELO-ranked before you open the inbox." },
              { icon:"♻️", title:"Cross-source deduplication", desc:"Same candidate via LinkedIn last month? We catch it." },
            ].map(({icon,title,desc})=>(
              <div key={title} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:T.indigo3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{title}</div>
                  <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>{desc}</div>
                </div>
              </div>
            ))}
            <button onClick={()=>navigate("/recruiter")} style={{ marginTop:10, fontSize:13, fontWeight:700, padding:"11px 24px", background:T.indigo, color:"#fff", border:"none", borderRadius:10, cursor:"pointer" }}>
              Set Up Integration →
            </button>
          </div>

          {/* Code preview */}
          <div style={{ background:T.ink, borderRadius:16, overflow:"hidden", boxShadow:T.shadow2 }}>
            <div style={{ padding:"10px 16px", background:"rgba(255,255,255,0.06)", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", gap:6, alignItems:"center" }}>
              {[T.red,T.amber,T.green].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginLeft:8, fontFamily:"monospace" }}>careers.yourcompany.com</span>
            </div>
            <pre style={{ padding:"22px", fontSize:12, color:"#E8E8E1", lineHeight:1.8, fontFamily:"'Courier New',monospace", overflow:"hidden" }}>{`<script>
  window.CapabilioConfig = {
    apiKey: "cap_live_xK9mP2q…",
    jobId: "JOB-001",
    accentColor: "#3D4EAC",
    onSuccess: (id) => {
      console.log("Applied:", id)
    }
  }
</script>
<script
  src="https://cdn.capabilio.com
    /widget/v2/apply.min.js" async>
</script>

<button data-capabilio-apply="JOB-001">
  Apply Now
</button>`}</pre>
            <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:T.green, animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Applications flowing into Capabilio in real-time</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding:"80px clamp(20px,5vw,80px)", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.indigo, letterSpacing:"0.1em", marginBottom:10 }}>PLATFORM FEATURES</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,3.5vw,42px)", fontWeight:800, color:T.ink, marginBottom:14 }}>Built for the full picture</h2>
          <p style={{ fontSize:15, color:T.ink3, maxWidth:460, margin:"0 auto" }}>Every tool across the talent lifecycle — in one place.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {FEATURES.map(f=><FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* ── WHY CAPABILIO ── */}
      <section id="why-capabilio" style={{ padding:"80px clamp(20px,5vw,80px)", background:T.ink }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ fontSize:11, fontWeight:700, color:`${T.cream}50`, letterSpacing:"0.1em", marginBottom:10 }}>WHY CAPABILIO</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,3.5vw,42px)", fontWeight:800, color:T.cream }}>The problem with hiring today</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {[
              { label:"Without Capabilio", items:[["47 days","Time from post to shortlist"],["Manual","Inconsistent, biased CV screening"],["9 tools","Avg. ATS + sourcing + scheduling stack"],["0 data","Candidate experience is a black box"],["Lost talent","Strong candidates passed over by timing"]], bad:true },
              { label:"With Capabilio",    items:[["9 days","AI-ranked, ELO-scored shortlist"],["AI + ELO","Every candidate objectively rated"],["1 platform","Source → screen → interview → offer → retain"],["87 NPS","Avg. candidate experience score"],["Reactivation","Past candidates surfaced when they're ready"]], bad:false },
            ].map(({label,items,bad})=>(
              <div key={label} style={{
                background: bad?"rgba(255,255,255,0.03)":"rgba(26,122,74,0.1)",
                border:`1px solid ${bad?"rgba(255,255,255,0.07)":T.green+"44"}`,
                borderRadius:16, padding:24,
              }}>
                <div style={{ fontSize:13, fontWeight:700, color:bad?"rgba(255,255,255,0.35)":T.green, marginBottom:16 }}>{label}</div>
                {items.map(([val,desc])=>(
                  <div key={val} style={{ display:"flex", gap:14, padding:"10px 0", borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
                    <div style={{ fontSize:16, fontWeight:800, color:bad?T.red:T.green, minWidth:88, fontFamily:"'Syne',sans-serif" }}>{val}</div>
                    <div style={{ fontSize:13, color:"rgba(246,246,241,0.55)", lineHeight:1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding:"80px clamp(20px,5vw,80px)", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.indigo, letterSpacing:"0.1em", marginBottom:10 }}>WHAT TEAMS SAY</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(26px,3vw,38px)", fontWeight:800, color:T.ink }}>Real results, real companies</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {TESTIMONIALS.map((t,i)=>(
            <div key={i} style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:24, boxShadow:T.shadow }}>
              <div style={{ fontSize:32, color:T.indigo, marginBottom:12, lineHeight:1 }}>"</div>
              <p style={{ fontSize:14, color:T.ink2, lineHeight:1.7, marginBottom:20 }}>{t.quote}</p>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:T.indigo3, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:T.indigo }}>
                  {t.name.split(" ")[0][0]}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{t.name}</div>
                  <div style={{ fontSize:11, color:T.ink3 }}>{t.role}</div>
                </div>
                <div style={{ marginLeft:"auto", textAlign:"right" }}>
                  <div style={{ fontSize:10, color:T.ink4 }}>ELO</div>
                  <div style={{ fontSize:14, fontWeight:800, color:T.indigo }}>{t.elo}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding:"80px clamp(20px,5vw,80px)", background:T.cream2 }}>
        <div style={{ maxWidth:960, margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.indigo, letterSpacing:"0.1em", marginBottom:10 }}>PRICING</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(26px,3vw,40px)", fontWeight:800, color:T.ink, marginBottom:12 }}>Simple, role-based pricing</h2>
          <p style={{ fontSize:14, color:T.ink3, marginBottom:48 }}>Pay per active role, not per seat. Every plan includes website integration.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {[
              { name:"Startup",    price:"₹4,999",  period:"/mo", roles:"Up to 5 roles",      features:["Widget integration","AI screening","ELO scoring","Applications inbox"], highlight:false },
              { name:"Growth",     price:"₹14,999", period:"/mo", roles:"Up to 25 roles",     features:["Everything in Startup","Shadow Interviews","Internal Mobility","Verification + Analytics"], highlight:true  },
              { name:"Enterprise", price:"Custom",  period:"",    roles:"Unlimited roles",     features:["Everything in Growth","Custom ELO tuning","SSO / HRMS integration","White-label career pages"], highlight:false },
            ].map(p=>(
              <div key={p.name} style={{
                background:p.highlight?T.ink:T.cream, border:`1.5px solid ${p.highlight?T.ink:T.border}`,
                borderRadius:18, padding:"26px 22px", boxShadow:p.highlight?T.shadow2:T.shadow,
                transform:p.highlight?"scale(1.03)":"none",
              }}>
                <div style={{ fontSize:15, fontWeight:700, color:p.highlight?T.cream:T.ink, marginBottom:6 }}>{p.name}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, color:p.highlight?T.cream:T.ink, marginBottom:4 }}>
                  {p.price}<span style={{ fontSize:13, fontWeight:400, color:p.highlight?"rgba(246,246,241,0.45)":T.ink4 }}>{p.period}</span>
                </div>
                <div style={{ fontSize:12, color:p.highlight?"rgba(246,246,241,0.45)":T.ink3, marginBottom:20 }}>{p.roles}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
                  {p.features.map(f=>(
                    <div key={f} style={{ display:"flex", gap:8 }}>
                      <span style={{ color:T.green, fontSize:13, flexShrink:0 }}>✓</span>
                      <span style={{ fontSize:13, color:p.highlight?"rgba(246,246,241,0.75)":T.ink2 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>navigate("/recruiter")} style={{
                  width:"100%", fontSize:13, fontWeight:700, padding:"10px 0",
                  background:p.highlight?T.cream:T.ink, color:p.highlight?T.ink:T.cream,
                  border:"none", borderRadius:9, cursor:"pointer",
                }}>{p.name==="Enterprise"?"Contact Sales":"Get Started"}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:"80px clamp(20px,5vw,80px)", maxWidth:700, margin:"0 auto", textAlign:"center" }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,4vw,46px)", fontWeight:800, color:T.ink, lineHeight:1.1, marginBottom:16 }}>
          Ready to hire on proof?
        </h2>
        <p style={{ fontSize:15, color:T.ink3, marginBottom:32, lineHeight:1.7 }}>
          Join 200+ hiring teams using Capabilio to reduce time-to-hire by 73% and build a talent pipeline that actually works.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={()=>navigate("/recruiter")} style={{ fontSize:14, fontWeight:700, padding:"13px 28px", background:T.ink, color:T.cream, border:"none", borderRadius:10, cursor:"pointer", boxShadow:`0 4px 20px ${T.ink}22` }}>
            Open Recruiter Portal →
          </button>
          <button style={{ fontSize:13, fontWeight:600, padding:"13px 22px", background:"transparent", color:T.ink2, border:`1.5px solid ${T.border}`, borderRadius:10, cursor:"pointer" }}>
            Book a Demo
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:T.ink, padding:"40px clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:40 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:T.cream, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:T.ink, fontSize:14, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>C</span>
              </div>
              <span style={{ fontSize:15, fontWeight:800, color:T.cream, fontFamily:"'Syne',sans-serif" }}>Capabilio</span>
            </div>
            <p style={{ fontSize:13, color:"rgba(246,246,241,0.4)", lineHeight:1.7, maxWidth:260 }}>
              Intelligent talent lifecycle platform. From sourcing to retention — one loop, zero guesswork.
            </p>
          </div>
          {[
            { head:"Product",   links:["ELO Engine","Website Widget","AI Screening","Analytics","Pricing"] },
            { head:"Lifecycle", links:["Source","Screen","Shortlist","Interview","Offer","Retain"] },
            { head:"Company",   links:["About","Blog","Careers","Contact","Privacy"] },
          ].map(({head,links})=>(
            <div key={head}>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(246,246,241,0.25)", letterSpacing:"0.08em", marginBottom:14 }}>{head.toUpperCase()}</div>
              {links.map(l=>(
                <div key={l} style={{ fontSize:13, color:"rgba(246,246,241,0.45)", marginBottom:8, cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.color=T.cream} onMouseLeave={e=>e.currentTarget.style.color="rgba(246,246,241,0.45)"}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth:1200, margin:"24px auto 0", paddingTop:20, borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, color:"rgba(246,246,241,0.25)" }}>© 2026 Capabilio. All rights reserved.</span>
          <span style={{ fontSize:12, color:"rgba(246,246,241,0.15)" }}>Built with ELO. Powered by AI. Driven by fairness.</span>
        </div>
      </footer>
    </div>
  )
}
