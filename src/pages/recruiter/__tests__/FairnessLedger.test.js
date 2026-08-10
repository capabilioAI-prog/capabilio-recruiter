import { describe, it, expect } from "vitest"
import { eventTypeFor, daysBetween, fromDbApplication } from "../FairnessLedger.jsx"

// 2026-08-10: FairnessLedger.jsx used to synthesize its entire timeline
// client-side from a single elo field plus hardcoded text (see the file's
// own header comment) -- these tests cover the real data-mapping logic that
// replaced it, since a mapping bug here would silently show a recruiter the
// wrong applicant name/score/status without any error.
describe("fromDbApplication", () => {
  it("maps every real applications column to the shape the UI expects", () => {
    const row = {
      id: "app-1",
      job_id: "job-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      score: 88,
      matched_skills: ["Python", "SQL"],
      missing_skills: ["Go"],
      ats_summary: "Strong technical fit.",
      status: "shortlisted",
      feedback_text: null,
      created_at: "2026-08-01T00:00:00Z",
      rejected_at: null,
      shortlisted_at: "2026-08-05T00:00:00Z",
    }
    const mapped = fromDbApplication(row)
    expect(mapped).toMatchObject({
      id: "app-1",
      jobId: "job-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      score: 88,
      matchedSkills: ["Python", "SQL"],
      missingSkills: ["Go"],
      atsSummary: "Strong technical fit.",
      status: "shortlisted",
    })
    expect(mapped.createdAt).toBeInstanceOf(Date)
    expect(mapped.shortlistedAt).toBeInstanceOf(Date)
    expect(mapped.rejectedAt).toBeNull()
  })

  it("defaults missing skill arrays to empty arrays, not null/undefined", () => {
    const mapped = fromDbApplication({ id: "app-2", matched_skills: null, missing_skills: null })
    expect(mapped.matchedSkills).toEqual([])
    expect(mapped.missingSkills).toEqual([])
  })

  it("leaves createdAt/rejectedAt/shortlistedAt null when the row has no timestamp", () => {
    const mapped = fromDbApplication({ id: "app-3" })
    expect(mapped.createdAt).toBeNull()
    expect(mapped.rejectedAt).toBeNull()
    expect(mapped.shortlistedAt).toBeNull()
  })
})

describe("eventTypeFor", () => {
  it("maps known audit_log actions to their real display labels", () => {
    expect(eventTypeFor("application.shortlisted").label).toBe("Shortlisted")
    expect(eventTypeFor("application.rejected").label).toBe("Rejection Sent")
    expect(eventTypeFor("applied").label).toBe("Applied")
  })

  it("falls back to the raw action string for an unrecognized action rather than crashing", () => {
    expect(eventTypeFor("something.unexpected").label).toBe("something.unexpected")
  })
})

describe("daysBetween", () => {
  it("computes whole days between two dates", () => {
    const a = new Date("2026-08-01T00:00:00Z")
    const b = new Date("2026-08-05T00:00:00Z")
    expect(daysBetween(a, b)).toBe(4)
  })

  it("never returns a negative number even if dates are reversed", () => {
    const a = new Date("2026-08-05T00:00:00Z")
    const b = new Date("2026-08-01T00:00:00Z")
    expect(daysBetween(a, b)).toBe(0)
  })
})
