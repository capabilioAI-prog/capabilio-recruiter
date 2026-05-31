import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";

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

// ── Primary nav — matches PRD information architecture exactly ────────────────
const NAV_PRIMARY = [
  {
    heading: "CORE",
    items: [
      { icon: "⚡", label: "Overview",           path: "/recruiter",                   exact: true },
      { icon: "💼", label: "Jobs",               path: "/recruiter/jobs" },
      { icon: "📥", label: "Applications",       path: "/recruiter/applications",      badge: "new" },
      { icon: "🔍", label: "Candidates",         path: "/recruiter/search" },
      { icon: "⚖️",  label: "Compare",           path: "/recruiter/compare" },
    ],
  },
  {
    heading: "WORKFLOW",
    items: [
      { icon: "📅", label: "Interviews",         path: "/recruiter/interviews" },
      { icon: "💬", label: "Communication",      path: "/recruiter/messages" },
      { icon: "🛡️",  label: "Verification",      path: "/recruiter/verification" },
      { icon: "🎁", label: "Offers",             path: "/recruiter/offers" },
    ],
  },
  {
    heading: "PEOPLE",
    items: [
      { icon: "🏢", label: "Employees",          path: "/recruiter/employee-network" },
      { icon: "🔀", label: "Internal Mobility",  path: "/recruiter/internal-mobility", badge: "new" },
    ],
  },
  {
    heading: "INSIGHTS",
    items: [
      { icon: "📊", label: "Analytics",          path: "/recruiter/analytics" },
    ],
  },
  {
    heading: "SETTINGS",
    items: [
      { icon: "⚙️",  label: "Settings",          path: "/recruiter/settings" },
    ],
  },
];

// ── Advanced / specialist tools ───────────────────────────────────────────────
const NAV_ADVANCED = [
  {
    heading: "SCREENING TOOLS",
    items: [
      { icon: "🌐", label: "Website Integration", path: "/recruiter/company-integration", badge: "new" },
      { icon: "🚀", label: "Bulk Hiring",        path: "/recruiter/bulk-hiring" },
      { icon: "📄", label: "Resume Screening",   path: "/recruiter/resume-screening" },
      { icon: "🎯", label: "Hiring Arena",       path: "/recruiter/arena" },
      { icon: "📋", label: "Pipeline",           path: "/recruiter/pipeline" },
    ],
  },
  {
    heading: "TRANSPARENCY",
    items: [
      { icon: "⚖️",  label: "Fairness Ledger",   path: "/recruiter/fairness-ledger" },
      { icon: "🤖", label: "Rejection Engine",   path: "/recruiter/rejection-workflow" },
      { icon: "⭐", label: "Trust Ratings",      path: "/recruiter/trust-ratings" },
      { icon: "🌱", label: "Talent Pool",        path: "/recruiter/talent-pool" },
    ],
  },
  {
    heading: "AI TOOLS",
    items: [
      { icon: "🤖", label: "Shadow Interview",   path: "/recruiter/simulation" },
      { icon: "⏳", label: "Time Machine",       path: "/recruiter/time-machine" },
      { icon: "🧬", label: "Team Chemistry",     path: "/recruiter/team-chemistry" },
      { icon: "📡", label: "Market Intel",       path: "/recruiter/intelligence" },
    ],
  },
];

// Flatten all items for active-state detection
const NAV_SECTIONS = [...NAV_PRIMARY, ...NAV_ADVANCED];

const BOTTOM_NAV = [
  { icon: "⚡", label: "Overview",  path: "/recruiter",              exact: true },
  { icon: "📥", label: "Apps",      path: "/recruiter/applications" },
  { icon: "🔍", label: "Search",    path: "/recruiter/search" },
  { icon: "📅", label: "Interviews",path: "/recruiter/interviews" },
  { icon: "💬", label: "Comms",     path: "/recruiter/messages" },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function RecruiterLayout({ recruiter, onSignOut }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const isMobile   = useIsMobile();
  const [collapsed,    setCollapsed]    = useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const drawerRef = useRef();

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [drawerOpen]);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const initials = recruiter?.displayName
    ? recruiter.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "RC";

  const allItems  = NAV_SECTIONS.flatMap((s) => s.items);
  const currentLabel = allItems.find((n) => isActive(n))?.label || "Dashboard";
  const navTo = (path) => { navigate(path); setDrawerOpen(false); };

  const SidebarContent = ({ inDrawer = false }) => (
    <>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"20px 16px", borderBottom:`1px solid ${T.border}`, minHeight:72, flexShrink:0 }}>
        <div style={S.logoMark}>C</div>
        {(!collapsed || inDrawer) && (
          <div style={{ flex:1 }}>
            <div style={S.logoText}>capabilio</div>
            <div style={S.logoSub}>Talent OS · Recruiter</div>
          </div>
        )}
        {inDrawer ? (
          <button onClick={() => setDrawerOpen(false)} style={{ background:T.cream3, border:`1px solid ${T.border}`, color:T.ink3, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:16 }}>✕</button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} style={{ ...S.collapseBtn, marginLeft: collapsed ? 0 : "auto" }}>
            {collapsed ? "→" : "←"}
          </button>
        )}
      </div>

      {/* Primary Nav */}
      <nav style={S.nav}>
        {NAV_PRIMARY.map((section) => (
          <div key={section.heading}>
            {(!collapsed || inDrawer) && (
              <div style={S.navHeading}>{section.heading}</div>
            )}
            {section.items.map((item) => {
              const active = isActive(item);
              return (
                <button key={item.path} className="nav-item" onClick={() => navTo(item.path)}
                  title={collapsed && !inDrawer ? item.label : undefined}
                  style={{ ...S.navItem, background: active ? T.indigo3 : "transparent", borderLeft: active ? `3px solid ${T.indigo}` : "3px solid transparent", color: active ? T.indigo : T.ink3, position:"relative" }}>
                  <span style={S.navIcon}>{item.icon}</span>
                  {(!collapsed || inDrawer) && (
                    <span style={{ ...S.navLabel, color: active ? T.indigo : T.ink3, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                  )}
                  {item.badge === "new" && (!collapsed || inDrawer) && (
                    <span style={{ fontSize:9, fontWeight:700, background:T.indigo, color:T.cream, borderRadius:4, padding:"1px 5px", marginLeft:"auto", letterSpacing:"0.04em" }}>NEW</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Advanced tools collapsible section */}
        {(!collapsed || inDrawer) && (
          <div style={{ marginTop:8 }}>
            <button onClick={() => setAdvancedOpen(!advancedOpen)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:"transparent", border:"none", cursor:"pointer", color:T.ink4, fontSize:10, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase" }}>
              <span style={{ flex:1, textAlign:"left" }}>Advanced Tools</span>
              <span style={{ fontSize:12, transition:"transform 0.2s", transform: advancedOpen ? "rotate(180deg)" : "none" }}>▾</span>
            </button>
            {advancedOpen && NAV_ADVANCED.map((section) => (
              <div key={section.heading}>
                <div style={{ ...S.navHeading, paddingLeft:12 }}>{section.heading}</div>
                {section.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <button key={item.path} onClick={() => navTo(item.path)}
                      style={{ ...S.navItem, background: active ? T.indigo3 : "transparent", borderLeft: active ? `3px solid ${T.indigo}` : "3px solid transparent", color: active ? T.indigo : T.ink3 }}>
                      <span style={S.navIcon}>{item.icon}</span>
                      <span style={{ ...S.navLabel, color: active ? T.indigo : T.ink3, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Profile */}
      {(!collapsed || inDrawer) && (
        <div style={S.sidebarBottom}>
          {/* Hiring health chips */}
          <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
            <div style={{ ...S.healthChip, background:T.green2, color:T.green, border:`1px solid ${T.border}` }}><span>●</span> 4 Active Roles</div>
            <div style={{ ...S.healthChip, background:T.amber2, color:T.amber, border:`1px solid ${T.border}` }}><span>●</span> 3 SLA Alerts</div>
          </div>
          <div style={S.profileRow}>
            <div style={S.avatar}>{initials}</div>
            <div style={S.profileInfo}>
              <div style={S.profileName}>{recruiter?.displayName || "Recruiter"}</div>
              <div style={S.profileCompany}>{recruiter?.companyName || "Company"}</div>
            </div>
          </div>
          <button onClick={onSignOut} style={S.signOutBtn}>Sign Out</button>
          <a href="https://capabilio.online" target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginTop:8, fontSize:11, fontWeight:600, color:T.indigo, textDecoration:"none", padding:"6px 0", borderRadius:7, background:T.indigo3, border:`1px solid ${T.indigo}22` }}
            onMouseEnter={e=>e.currentTarget.style.background=`${T.indigo}18`} onMouseLeave={e=>e.currentTarget.style.background=T.indigo3}>
            🌐 capabilio.online ↗
          </a>
        </div>
      )}
    </>
  );

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(61,78,172,0.2); border-radius: 2px; }
        * { box-sizing: border-box; }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
        @keyframes slideIn { from { transform:translateX(-100%); } to { transform:none; } }
        @keyframes glow    { 0%,100%{box-shadow:0 0 8px rgba(61,78,172,0.25)} 50%{box-shadow:0 0 16px rgba(61,78,172,0.45)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        .nav-item:hover { background: ${T.indigo3} !important; transform: translateX(2px); }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .header-icon:hover { background: ${T.cream3} !important; }
        .bottom-nav-btn:active { transform: scale(0.9); }
        .cap-card:hover { transform: translateY(-2px); box-shadow: ${T.shadow2} !important; border-color: rgba(61,78,172,0.18) !important; }
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .desktop-search  { display: none !important; }
          .desktop-postbtn { display: none !important; }
          .live-indicator  { display: none !important; }
        }
        @media (min-width: 768px) {
          .mobile-hamburger { display: none !important; }
          .bottom-nav       { display: none !important; }
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar" style={{ ...S.sidebar, width: collapsed ? 72 : 256 }}>
        <SidebarContent inDrawer={false} />
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(26,26,24,0.35)", backdropFilter:"blur(4px)" }}>
          <aside ref={drawerRef} style={{ position:"absolute", top:0, left:0, bottom:0, width:280, background:T.cream, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", animation:"slideIn 0.22s cubic-bezier(0.4,0,0.2,1)", overflowY:"auto" }}>
            <SidebarContent inDrawer={true} />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div style={{ ...S.mainArea, marginLeft: isMobile ? 0 : (collapsed ? 72 : 256) }}>

        {/* Header */}
        <header style={{ ...S.header, padding: isMobile ? "0 16px" : "0 28px" }}>
          <div style={S.headerLeft}>
            <button className="mobile-hamburger" onClick={() => setDrawerOpen(true)}
              style={{ background:T.cream3, border:`1px solid ${T.border}`, borderRadius:10, width:38, height:38, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:T.ink, flexShrink:0 }}>
              ☰
            </button>
            <div style={S.breadcrumb}>{currentLabel}</div>
            <div className="live-indicator" style={S.liveIndicator}>
              <span style={S.liveDot} />
              <span style={S.liveText}>Live</span>
            </div>
          </div>
          <div style={S.headerRight}>
            <div className="desktop-search" style={S.globalSearch}>
              <span style={{ color:T.ink4 }}>🔍</span>
              <input placeholder="Search candidates, jobs, skills..." style={S.globalSearchInput} onKeyDown={(e) => e.key === "Enter" && navigate("/recruiter/search")} />
              <span style={S.searchShortcut}>⌘K</span>
            </div>
            <button className="desktop-postbtn action-btn" onClick={() => navigate("/recruiter/jobs")} style={S.postJobBtn}>
              + Post Job
            </button>
            <button className="header-icon" onClick={() => setNotifOpen(!notifOpen)} style={S.iconBtn}>
              🔔<span style={S.notifBadge}>5</span>
            </button>
            <div style={S.headerAvatar} onClick={() => navigate("/recruiter/settings")}>{initials}</div>
          </div>
        </header>

        {/* Notifications */}
        {notifOpen && (
          <div style={S.notifDropdown}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={S.notifTitle}>Notifications</div>
              <span style={{ fontSize:11, color:T.indigo, cursor:"pointer" }}>Mark all read</span>
            </div>
            {[
              { icon:"🚨", text:"SLA breach: Senior Analyst role — 3 candidates pending 5+ days", time:"Just now",  color:T.red },
              { icon:"🤖", text:"AI shortlist ready: 47 strong-fit candidates for ML Engineer",  time:"4m ago",   color:T.indigo },
              { icon:"⭐", text:"New trust rating submitted for your company (4.7 ★)",           time:"18m ago",  color:T.amber },
              { icon:"🎯", text:"Priya Sharma completed Arena challenge — score 94/100",          time:"1h ago",   color:T.green },
              { icon:"♻️",  text:"3 'Strong but Not Selected' candidates match new Data role",    time:"2h ago",   color:T.blue },
            ].map((n, i) => (
              <div key={i} style={{ ...S.notifItem, borderLeft:`3px solid ${n.color}` }}>
                <span style={{ fontSize:18 }}>{n.icon}</span>
                <div><div style={S.notifText}>{n.text}</div><div style={S.notifTime}>{n.time}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* Page content */}
        <main style={{ ...S.content, padding: isMobile ? "16px 16px 80px" : "28px 28px 40px" }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav" style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200, background:T.cream, borderTop:`1px solid ${T.border}`, backdropFilter:"blur(20px)", display:"flex", paddingBottom:"env(safe-area-inset-bottom)" }}>
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item);
          return (
            <button key={item.path} className="bottom-nav-btn" onClick={() => navTo(item.path)}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"10px 4px 8px", background:"none", border:"none", color: active ? T.indigo : T.ink4, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", position:"relative", transition:"all 0.15s" }}>
              {active && <div style={{ position:"absolute", top:0, width:24, height:2, background:T.indigo, borderRadius:"0 0 2px 2px" }} />}
              <span style={{ fontSize:20, lineHeight:1, marginBottom:3 }}>{item.icon}</span>
              <span style={{ fontSize:10, fontWeight: active ? 700 : 400 }}>{item.label}</span>
            </button>
          );
        })}
        <button className="bottom-nav-btn" onClick={() => setDrawerOpen(true)}
          style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"10px 4px 8px", background:"none", border:"none", color:T.ink4, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          <span style={{ fontSize:20, lineHeight:1, marginBottom:3 }}>☰</span>
          <span style={{ fontSize:10 }}>More</span>
        </button>
      </nav>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:T.cream2, display:"flex", fontFamily:"'DM Sans',sans-serif", color:T.ink },
  sidebar: { position:"fixed", top:0, left:0, bottom:0, background:T.cream, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", zIndex:100, transition:"width 0.3s cubic-bezier(0.4,0,0.2,1)", overflow:"hidden" },
  logoMark: { width:36, height:36, borderRadius:10, flexShrink:0, background:T.indigo, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, boxShadow:"0 0 12px rgba(61,78,172,0.25)", animation:"glow 3s ease-in-out infinite" },
  logoText: { fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:T.ink, lineHeight:1.2 },
  logoSub: { fontSize:9, color:T.ink4, letterSpacing:1, fontWeight:500, textTransform:"uppercase" },
  collapseBtn: { background:T.cream3, border:`1px solid ${T.border}`, borderRadius:8, width:26, height:26, color:T.ink3, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 },
  nav: { flex:1, padding:"8px 8px", display:"flex", flexDirection:"column", gap:0, overflowY:"auto" },
  navHeading: { fontSize:10, fontWeight:700, color:T.ink4, letterSpacing:"0.08em", textTransform:"uppercase", padding:"12px 12px 4px", fontFamily:"'DM Sans',sans-serif" },
  navItem: { display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:10, border:"none", cursor:"pointer", textAlign:"left", position:"relative", fontFamily:"'DM Sans',sans-serif", fontSize:14, width:"100%", transition:"all 0.2s" },
  navIcon: { fontSize:15, flexShrink:0, width:20, textAlign:"center" },
  navLabel: { fontSize:12.5, whiteSpace:"nowrap", overflow:"hidden" },
  activeGlow: { position:"absolute", right:10, width:6, height:6, borderRadius:"50%", background:T.indigo, boxShadow:`0 0 8px rgba(61,78,172,0.5)` },
  healthChip: { display:"flex", alignItems:"center", gap:4, fontSize:10, borderRadius:6, padding:"2px 7px" },
  sidebarBottom: { padding:"12px 12px 20px", borderTop:`1px solid ${T.border}`, flexShrink:0 },
  profileRow: { display:"flex", alignItems:"center", gap:10, marginBottom:10 },
  avatar: { width:34, height:34, borderRadius:10, background:T.indigo, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 },
  profileInfo: { overflow:"hidden" },
  profileName: { fontSize:13, fontWeight:600, color:T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  profileCompany: { fontSize:11, color:T.ink4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  signOutBtn: { width:"100%", padding:"8px", background:T.red2, border:`1px solid rgba(192,57,43,0.15)`, borderRadius:8, color:T.red, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
  mainArea: { flex:1, display:"flex", flexDirection:"column", minHeight:"100vh", transition:"margin-left 0.3s cubic-bezier(0.4,0,0.2,1)" },
  header: { height:64, background:T.cream, backdropFilter:"blur(16px)", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 },
  headerLeft: { display:"flex", alignItems:"center", gap:12 },
  headerRight: { display:"flex", alignItems:"center", gap:10 },
  breadcrumb: { fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:T.ink },
  liveIndicator: { display:"flex", alignItems:"center", gap:6, padding:"3px 10px", background:T.green2, border:`1px solid rgba(26,122,74,0.15)`, borderRadius:20 },
  liveDot: { width:7, height:7, borderRadius:"50%", background:T.green, boxShadow:`0 0 6px rgba(26,122,74,0.5)`, animation:"pulse 2s ease-in-out infinite" },
  liveText: { fontSize:11, color:T.green, fontWeight:600, letterSpacing:0.5 },
  globalSearch: { display:"flex", alignItems:"center", gap:8, background:T.cream3, border:`1px solid ${T.border}`, borderRadius:10, padding:"7px 12px", width:260 },
  globalSearchInput: { background:"none", border:"none", outline:"none", color:T.ink3, fontSize:13, flex:1, fontFamily:"'DM Sans',sans-serif" },
  searchShortcut: { fontSize:11, color:T.ink4, background:T.cream2, padding:"2px 5px", borderRadius:4 },
  postJobBtn: { padding:"8px 16px", background:T.ink, border:"none", borderRadius:10, color:T.cream, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 2px 8px rgba(26,26,24,0.12)", transition:"all 0.2s", whiteSpace:"nowrap" },
  iconBtn: { width:36, height:36, background:T.cream3, border:`1px solid ${T.border}`, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, position:"relative", transition:"background 0.2s" },
  notifBadge: { position:"absolute", top:4, right:4, width:14, height:14, borderRadius:"50%", background:T.red, fontSize:9, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" },
  notifDropdown: { position:"fixed", top:68, right:16, width:340, background:T.cream, border:`1px solid ${T.border}`, borderRadius:16, padding:16, boxShadow:T.shadow2, zIndex:200, animation:"fadeIn 0.15s ease" },
  notifTitle: { fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:T.ink },
  notifItem: { display:"flex", gap:12, padding:"10px 8px", borderBottom:`1px solid ${T.border}`, borderRadius:8, marginBottom:4, background:T.cream2 },
  notifText: { fontSize:12, color:T.ink2, lineHeight:1.4 },
  notifTime: { fontSize:11, color:T.ink4, marginTop:3 },
  headerAvatar: { width:34, height:34, borderRadius:10, background:T.indigo, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" },
  content: { flex:1, overflowY:"auto" },
};
