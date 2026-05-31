import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"

const T = {
  bg:      "#FAF8F5",
  bg2:     "#F3F0EB",
  bg3:     "#EDE9E2",
  orange:  "#FF4A1C",
  orange2: "#FFF0EB",
  dark:    "#0F0F14",
  dark2:   "#2A2A35",
  dark3:   "#5A5A6A",
  dark4:   "#9A9AA8",
  border:  "rgba(15,15,20,0.08)",
  shadow:  "0 2px 16px rgba(15,15,20,0.07), 0 1px 4px rgba(15,15,20,0.04)",
  shadow2: "0 8px 40px rgba(15,15,20,0.12), 0 2px 8px rgba(15,15,20,0.06)",
}

function Counter({ target, suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef()
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let v = 0
        const step = target / (duration / 16)
        const t = setInterval(() => {
          v += step
          if (v >= target) { setVal(target); clearInterval(t) }
          else setVal(Math.floor(v))
        }, 16)
        obs.disconnect()
      }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target, duration])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

const FEATURES = [
  { icon: "📊", title: "Live ELO Ratings",       desc: "Every candidate has a live, earned ELO score — not a self-reported one. Updated with every task they complete." },
  { icon: "🧠", title: "AI Resume Screening",     desc: "Every resume parsed, scored, and deduplicated automatically before a human ever sees it." },
  { icon: "⚖️",  title: "Blind Hiring Mode",      desc: "Hide names, photos, and universities. Score on capability alone. Full audit trail included." },
  { icon: "📅", title: "One-click Scheduling",    desc: "Async shadow interviews and smart scheduling — 73% fewer missed interview slots." },
  { icon: "🔀", title: "Internal Mobility",       desc: "Surface employees who match open roles before you post externally. Avg. 38 days saved per hire." },
  { icon: "🛡️",  title: "Credential Verification", desc: "ID, degree, and employment verification built in. Candidates can't fake credentials." },
]

const STEPS = [
  { n:"01", title:"Post a role",        desc:"Create a job in under 2 minutes. Capabilio auto-generates ELO benchmarks based on role requirements." },
  { n:"02", title:"Candidates apply",   desc:"They apply from your careers page or the Capabilio platform. Every resume is scored on arrival." },
  { n:"03", title:"Review top-ranked",  desc:"Open your dashboard to a ranked shortlist. No manual sorting. No bias. Just capability scores." },
  { n:"04", title:"Interview & hire",   desc:"Schedule, conduct, and close — all from one platform. Avg. 9 days from post to shortlist." },
]

export default function LandingPage() {
  const navigate  = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:T.bg, color:T.dark, overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .cap-btn-primary:hover{background:#e03d12!important;transform:translateY(-1px)}
        .cap-btn-secondary:hover{background:${T.bg3}!important}
        .cap-feature-card:hover{transform:translateY(-3px);box-shadow:${T.shadow2}!important;border-color:rgba(255,74,28,0.2)!important}
        .cap-step:hover .cap-step-num{color:${T.orange}!important}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        background: scrolled ? "rgba(250,248,245,0.96)" : "transparent",
        borderBottom: scrolled ? `1px solid ${T.border}` : "none",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        padding:"0 clamp(20px,6vw,100px)",
        height:68, display:"flex", alignItems:"center", justifyContent:"space-between",
        transition:"all 0.3s",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:T.dark, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"white", fontSize:17, fontWeight:800, fontFamily:"'Playfair Display',serif" }}>C</span>
          </div>
          <div>
            <span style={{ fontSize:17, fontWeight:700, color:T.dark, letterSpacing:"-0.01em" }}>Capabilio</span>
            <span style={{ fontSize:11, fontWeight:600, color:T.dark4, marginLeft:8, background:T.bg3, padding:"2px 8px", borderRadius:4, letterSpacing:"0.04em" }}>RECRUITER</span>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display:"flex", alignItems:"center", gap:32 }}>
          {["How It Works", "Features", "Pricing"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`}
              style={{ fontSize:14, fontWeight:500, color:T.dark3, textDecoration:"none", transition:"color 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.color=T.dark}
              onMouseLeave={e=>e.currentTarget.style.color=T.dark3}>{l}</a>
          ))}
          <a href="https://capabilio.online" target="_blank" rel="noopener noreferrer"
            style={{ fontSize:14, fontWeight:500, color:T.orange, textDecoration:"none" }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>capabilio.online ↗</a>
        </div>

        {/* CTAs */}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button className="cap-btn-secondary" onClick={()=>navigate("/recruiter")}
            style={{ fontSize:13, fontWeight:600, padding:"9px 20px", background:"transparent", color:T.dark2, border:`1.5px solid ${T.border}`, borderRadius:8, cursor:"pointer", transition:"all 0.2s", letterSpacing:"0.01em" }}>
            SIGN IN
          </button>
          <button className="cap-btn-primary" onClick={()=>navigate("/recruiter")}
            style={{ fontSize:13, fontWeight:700, padding:"9px 22px", background:T.orange, color:"white", border:"none", borderRadius:8, cursor:"pointer", transition:"all 0.2s", letterSpacing:"0.01em" }}>
            GET STARTED
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop:110, padding:"110px clamp(20px,6vw,100px) 80px", maxWidth:1280, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:70, alignItems:"center" }}>

          {/* Left */}
          <div style={{ animation:"fadeUp 0.6s ease both" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:7, background:"white", border:`1px solid ${T.border}`, borderRadius:24, padding:"6px 14px", marginBottom:28, boxShadow:T.shadow }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:T.orange, display:"inline-block", animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:11, fontWeight:700, color:T.dark3, letterSpacing:"0.08em" }}>INDIA'S FIRST ELO-RATED HIRING PLATFORM</span>
            </div>

            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(40px,4.8vw,62px)", fontWeight:800, lineHeight:1.08, letterSpacing:"-0.02em", marginBottom:22 }}>
              Your candidates lie.<br />
              <em style={{ color:T.orange, fontStyle:"italic" }}>Their ELO doesn't.</em>
            </h1>

            <p style={{ fontSize:17, color:T.dark3, lineHeight:1.75, marginBottom:34, maxWidth:480 }}>
              Stop hiring on self-reported skills. Capabilio gives every candidate a live ELO rating — earned through real tasks, impossible to fake. Your next hire is already ranked.
            </p>

            <div style={{ display:"flex", gap:14, marginBottom:40 }}>
              <button className="cap-btn-primary" onClick={()=>navigate("/recruiter")}
                style={{ fontSize:15, fontWeight:700, padding:"14px 30px", background:T.orange, color:"white", border:"none", borderRadius:10, cursor:"pointer", transition:"all 0.2s", boxShadow:`0 4px 20px ${T.orange}40` }}>
                START HIRING FREE →
              </button>
              <button className="cap-btn-secondary" onClick={()=>document.getElementById("how-it-works")?.scrollIntoView({behavior:"smooth"})}
                style={{ fontSize:14, fontWeight:600, padding:"14px 24px", background:"transparent", color:T.dark2, border:`1.5px solid ${T.border}`, borderRadius:10, cursor:"pointer", transition:"all 0.2s" }}>
                SEE HOW IT WORKS
              </button>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div style={{ display:"flex" }}>
                {["R","A","P","M"].map((l,i)=>(
                  <div key={l} style={{ width:32, height:32, borderRadius:"50%", background:T.orange2, border:`2px solid ${T.bg}`, marginLeft:i?-10:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:T.orange }}>{l}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.dark }}>Trusted by 200+ hiring teams</div>
                <div style={{ fontSize:12, color:T.dark4 }}>★★★★★ &nbsp;4.9 · 800+ candidates ELO-rated</div>
              </div>
            </div>
          </div>

          {/* Right — Live ELO Preview Card */}
          <div style={{ position:"relative", animation:"fadeUp 0.8s ease both" }}>
            {/* Glow */}
            <div style={{ position:"absolute", width:280, height:280, top:"50%", left:"50%", transform:"translate(-50%,-50%)", borderRadius:"50%", background:`radial-gradient(circle, ${T.orange2}, transparent)`, filter:"blur(50px)", pointerEvents:"none" }} />

            <div style={{ background:"white", border:`1px solid ${T.border}`, borderRadius:20, padding:24, boxShadow:T.shadow2, position:"relative" }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.dark4, letterSpacing:"0.1em", marginBottom:14 }}>LIVE CANDIDATE PREVIEW</div>

              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color:T.dark }}>Arjun Mehta</div>
                  <div style={{ fontSize:13, color:T.dark3 }}>Senior ML Engineer</div>
                </div>
                <div style={{ background:T.orange2, border:`1px solid ${T.orange}22`, borderRadius:12, padding:"8px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:26, fontWeight:800, color:T.orange, lineHeight:1, fontFamily:"'Playfair Display',serif" }}>1,847</div>
                  <div style={{ fontSize:9, fontWeight:700, color:T.orange, letterSpacing:"0.08em" }}>LIVE ELO</div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
                {[["12","STREAK"],["94","TASKS"],["87%","JOB READY"]].map(([v,l])=>(
                  <div key={l} style={{ background:T.bg, borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ fontSize:18, fontWeight:700, color:T.dark }}>{v}</div>
                    <div style={{ fontSize:9, fontWeight:700, color:T.dark4, letterSpacing:"0.06em" }}>{l}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize:10, fontWeight:700, color:T.dark4, letterSpacing:"0.08em", marginBottom:12 }}>SKILL GRAPH</div>
              {[["Python","82%",T.orange],["SQL","74%",T.orange],["Machine Learning","61%","#7C5FF5"],["Tableau","85%",T.orange]].map(([skill, pct, color])=>(
                <div key={skill} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13, color:T.dark }}>{skill}</span>
                    <span style={{ fontSize:13, fontWeight:600, color }}>{pct}</span>
                  </div>
                  <div style={{ height:5, background:T.bg2, borderRadius:3 }}>
                    <div style={{ width:pct, height:"100%", background:color, borderRadius:3, transition:"width 1s ease" }} />
                  </div>
                </div>
              ))}

              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:16, padding:"10px 14px", background:T.bg, borderRadius:10 }}>
                <span style={{ fontSize:18 }}>✓</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.dark }}>Identity & credentials verified</div>
                  <div style={{ fontSize:11, color:T.dark4 }}>Aadhaar · Degree · LinkedIn</div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div style={{ position:"absolute", bottom:-16, left:-16, background:"white", border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 16px", boxShadow:T.shadow, animation:"float 3s ease-in-out infinite" }}>
              <div style={{ fontSize:20, fontWeight:800, color:T.orange, fontFamily:"'Playfair Display',serif" }}>9 days</div>
              <div style={{ fontSize:11, color:T.dark3 }}>avg. time to shortlist</div>
            </div>
            <div style={{ position:"absolute", top:-12, right:-16, background:"white", border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 16px", boxShadow:T.shadow, animation:"float 3.5s ease-in-out infinite 0.5s" }}>
              <div style={{ fontSize:20, fontWeight:800, color:T.orange, fontFamily:"'Playfair Display',serif" }}>94%</div>
              <div style={{ fontSize:11, color:T.dark3 }}>AI parse accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ background:T.dark, overflow:"hidden", padding:"13px 0", marginTop:40 }}>
        <div style={{ display:"flex", animation:"ticker 22s linear infinite", whiteSpace:"nowrap" }}>
          {[...Array(2)].map((_,ri)=>(
            <div key={ri} style={{ display:"flex" }}>
              {["ELO Hiring Engine","Blind Screening","AI Resume Scoring","Shadow Interviews","Internal Mobility","Credential Verification","Reactivation Pool","Fairness Ledger","Real-time Analytics"].map((item,i)=>(
                <span key={`${ri}-${i}`} style={{ fontSize:12, fontWeight:600, color:"rgba(250,248,245,0.45)", padding:"0 28px", borderRight:"1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ color:T.orange, marginRight:8 }}>●</span>{item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section style={{ padding:"70px clamp(20px,6vw,100px)", background:T.bg }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:2 }}>
            {[
              { value:47, suffix:"→9d", label:"Days to shortlist", sub:"vs. 47d industry avg" },
              { value:94, suffix:"%",   label:"Resume parse accuracy", sub:"AI-powered" },
              { value:73, suffix:"%",   label:"Fewer missed interviews", sub:"vs. manual scheduling" },
              { value:200, suffix:"+",  label:"Hiring teams", sub:"use Capabilio today" },
            ].map((m,i)=>(
              <div key={m.label} style={{ padding:"36px 32px", borderRight: i < 3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:48, fontWeight:800, color:T.orange, lineHeight:1 }}>
                  <Counter target={m.value} suffix={m.suffix} />
                </div>
                <div style={{ fontSize:15, fontWeight:600, color:T.dark, marginTop:10 }}>{m.label}</div>
                <div style={{ fontSize:13, color:T.dark4, marginTop:4 }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding:"80px clamp(20px,6vw,100px)", background:T.bg2 }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ marginBottom:56 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.orange, letterSpacing:"0.1em", marginBottom:10 }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(28px,3.5vw,44px)", fontWeight:800, color:T.dark, maxWidth:480 }}>
              From job post to hire in <em style={{ color:T.orange, fontStyle:"italic" }}>9 days.</em>
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:2 }}>
            {STEPS.map((s,i)=>(
              <div key={s.n} className="cap-step" style={{ padding:"32px 28px", borderRight: i < 3 ? `1px solid ${T.border}` : "none", cursor:"default", transition:"all 0.2s" }}>
                <div className="cap-step-num" style={{ fontFamily:"'Playfair Display',serif", fontSize:48, fontWeight:800, color:T.bg3, lineHeight:1, marginBottom:20, transition:"color 0.2s" }}>{s.n}</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.dark, marginBottom:10 }}>{s.title}</div>
                <div style={{ fontSize:14, color:T.dark3, lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding:"80px clamp(20px,6vw,100px)", background:T.bg }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.orange, letterSpacing:"0.1em", marginBottom:10 }}>FEATURES</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(28px,3.5vw,44px)", fontWeight:800, color:T.dark }}>
              Everything you need.<br /><em style={{ color:T.orange, fontStyle:"italic" }}>Nothing you don't.</em>
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {FEATURES.map(f=>(
              <div key={f.title} className="cap-feature-card"
                style={{ background:"white", border:`1px solid ${T.border}`, borderRadius:16, padding:"28px 26px", boxShadow:T.shadow, transition:"all 0.2s", cursor:"default" }}>
                <div style={{ fontSize:28, marginBottom:16 }}>{f.icon}</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.dark, marginBottom:10 }}>{f.title}</div>
                <div style={{ fontSize:14, color:T.dark3, lineHeight:1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:"90px clamp(20px,6vw,100px)", background:T.dark }}>
        <div style={{ maxWidth:700, margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:11, fontWeight:700, color:`${T.orange}`, letterSpacing:"0.1em", marginBottom:16 }}>GET STARTED TODAY</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(32px,4vw,52px)", fontWeight:800, color:"white", lineHeight:1.1, marginBottom:20 }}>
            Your next great hire<br />
            <em style={{ color:T.orange, fontStyle:"italic" }}>has an ELO score.</em>
          </h2>
          <p style={{ fontSize:16, color:"rgba(250,248,245,0.55)", lineHeight:1.75, marginBottom:36, maxWidth:460, margin:"0 auto 36px" }}>
            Join 200+ teams who've replaced gut-feel hiring with verified capability scores.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center" }}>
            <button className="cap-btn-primary" onClick={()=>navigate("/recruiter")}
              style={{ fontSize:15, fontWeight:700, padding:"15px 34px", background:T.orange, color:"white", border:"none", borderRadius:10, cursor:"pointer", transition:"all 0.2s", boxShadow:`0 4px 24px ${T.orange}50` }}>
              START HIRING FREE →
            </button>
            <a href="https://capabilio.online" target="_blank" rel="noopener noreferrer"
              style={{ fontSize:14, fontWeight:600, padding:"15px 26px", background:"transparent", color:"rgba(250,248,245,0.7)", border:"1.5px solid rgba(250,248,245,0.15)", borderRadius:10, cursor:"pointer", textDecoration:"none", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.color="white"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(250,248,245,0.7)"}>
              Visit Capabilio AI ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:"28px clamp(20px,6vw,100px)", background:T.dark, borderTop:"1px solid rgba(250,248,245,0.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"rgba(250,248,245,0.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"white", fontSize:14, fontWeight:800, fontFamily:"'Playfair Display',serif" }}>C</span>
          </div>
          <span style={{ fontSize:14, fontWeight:600, color:"rgba(250,248,245,0.5)" }}>Capabilio Recruiter · {new Date().getFullYear()}</span>
        </div>
        <div style={{ display:"flex", gap:24 }}>
          {["Privacy","Terms","Support"].map(l=>(
            <a key={l} href="#" style={{ fontSize:13, color:"rgba(250,248,245,0.35)", textDecoration:"none" }}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(250,248,245,0.7)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(250,248,245,0.35)"}>{l}</a>
          ))}
          <a href="https://capabilio.online" target="_blank" rel="noopener noreferrer"
            style={{ fontSize:13, color:T.orange, textDecoration:"none", fontWeight:600 }}>capabilio.online ↗</a>
        </div>
      </footer>
    </div>
  )
}
