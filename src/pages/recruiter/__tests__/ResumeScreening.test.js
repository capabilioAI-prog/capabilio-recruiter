import { describe, it, expect } from "vitest"
import { verdictFor } from "../ResumeScreening.jsx"

// 2026-08-10: ResumeScreening.jsx used to completely ignore uploaded files
// and always show a hardcoded 91%/"Strong Hire" result (see the file's own
// header comment). This regression-tests the threshold logic that now
// drives the real verdict shown to a recruiter after a resume is actually
// scored -- these thresholds (85/70/55) are what a recruiter's hiring
// decision is based on, so a silent change here would be a real bug, not
// just a cosmetic one.
describe("verdictFor", () => {
  it("labels 85 and above as Strong Hire", () => {
    expect(verdictFor(85).label).toBe("Strong Hire")
    expect(verdictFor(100).label).toBe("Strong Hire")
  })

  it("labels 70-84 as Good Hire", () => {
    expect(verdictFor(70).label).toBe("Good Hire")
    expect(verdictFor(84).label).toBe("Good Hire")
  })

  it("labels 55-69 as Maybe", () => {
    expect(verdictFor(55).label).toBe("Maybe")
    expect(verdictFor(69).label).toBe("Maybe")
  })

  it("labels below 55 as Weak Match", () => {
    expect(verdictFor(54).label).toBe("Weak Match")
    expect(verdictFor(0).label).toBe("Weak Match")
  })

  it("is a boundary-inclusive step function, not off-by-one", () => {
    // Regression guard: 84 and 85 must land in different buckets.
    expect(verdictFor(84).label).not.toBe(verdictFor(85).label)
    expect(verdictFor(69).label).not.toBe(verdictFor(70).label)
    expect(verdictFor(54).label).not.toBe(verdictFor(55).label)
  })
})
