// ── Capabilio Design Tokens ───────────────────────────────────────────────────
// Cream / Ink light theme — used across all recruiter pages
export const T = {
  // Backgrounds
  cream:   "#F6F6F1",   // page background
  cream2:  "#EFEFE9",   // section / subtle bg
  cream3:  "#E8E8E1",   // input / tertiary bg

  // Text
  ink:     "#1A1A18",   // primary text
  ink2:    "#3A3A38",   // secondary text
  ink3:    "#6B6B68",   // muted text
  ink4:    "#9A9A97",   // placeholder / disabled

  // Indigo — primary accent (CTAs, active states, links)
  indigo:  "#3D4EAC",
  indigo2: "#5B6FD4",
  indigo3: "#EEF0FB",   // indigo tint bg

  // Green — success, positive, hire
  green:   "#1A7A4A",
  green2:  "#E8F7EF",

  // Amber — warning, medium priority
  amber:   "#B8620A",
  amber2:  "#FDF3E7",

  // Red — danger, rejection, alert
  red:     "#C0392B",
  red2:    "#FDECEA",

  // Blue — info, interview, scheduled
  blue:    "#1565C0",
  blue2:   "#E8F1FB",

  // Utilities
  border:  "rgba(26,26,24,0.09)",
  shadow:  "0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
  shadow2: "0 8px 32px rgba(26,26,24,0.10), 0 2px 8px rgba(26,26,24,0.06)",
}

// ── Shared helper: domain color ───────────────────────────────────────────────
export function domainColor(d) {
  // 2026-08-07: `d = ""` as a default parameter only covers `undefined` —
  // a candidate with a real but unset domain (profiles.domain IS NULL,
  // which several real accounts have) passes `null` explicitly, and default
  // parameters don't apply to explicit null. That crashed every page
  // rendering such a candidate (Cannot read properties of null (reading
  // 'toLowerCase')) — confirmed via CandidateSearch.jsx's `domainColor(c.domain)`
  // once a previously-invisible candidate with domain=null started actually
  // appearing in search results.
  const l = (d || "").toLowerCase()
  if (l.includes("medical"))   return T.green
  if (l.includes("software"))  return T.indigo
  if (l.includes("data"))      return T.blue
  if (l.includes("finance"))   return T.amber
  if (l.includes("marketing")) return "#92400E"
  if (l.includes("design"))    return "#9D174D"
  return T.indigo
}

// ── Shared helper: ELO level ──────────────────────────────────────────────────
export function eloLevel(e) {
  if (e >= 1200) return { label: "Expert",       color: T.amber  }
  if (e >= 1000) return { label: "Advanced",     color: T.indigo }
  if (e >= 900)  return { label: "Intermediate", color: T.green  }
  return               { label: "Beginner",      color: T.ink4   }
}

// ── Shared component styles ───────────────────────────────────────────────────
export const card = {
  background: T.cream,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: T.shadow,
  padding: 20,
}

export const cardLg = {
  background: T.cream,
  border: `1px solid ${T.border}`,
  borderRadius: 20,
  boxShadow: T.shadow,
  padding: 28,
}

export const tag = (color = T.indigo, bg = T.indigo3) => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color,
  background: bg,
  border: `1px solid ${color}22`,
  borderRadius: 6,
  padding: "3px 10px",
  display: "inline-block",
})

export const btn = {
  primary: {
    fontSize: 13,
    fontWeight: 700,
    padding: "9px 20px",
    background: T.ink,
    color: T.cream,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },
  outline: {
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 20px",
    background: "transparent",
    color: T.ink2,
    border: `1.5px solid ${T.border}`,
    borderRadius: 10,
    cursor: "pointer",
  },
  indigo: {
    fontSize: 13,
    fontWeight: 700,
    padding: "9px 20px",
    background: T.indigo3,
    color: T.indigo,
    border: `1px solid ${T.indigo}22`,
    borderRadius: 10,
    cursor: "pointer",
  },
  danger: {
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 20px",
    background: T.red2,
    color: T.red,
    border: `1px solid ${T.red}22`,
    borderRadius: 10,
    cursor: "pointer",
  },
}
