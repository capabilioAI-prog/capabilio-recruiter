import { describe, it, expect } from "vitest"
import { clusterCandidate } from "../BulkHiring.jsx"

// 2026-08-10: BulkHiring.jsx used to read a dead Firestore snapshot and
// bucket candidates using fields (arenaCompleted/arenaStreak) that don't
// exist in the real /partner/candidates response at all -- see this
// session's rewrite. This locks down the real clustering thresholds
// (elo/jobReadiness/taskCount) against silent drift, since a bucketing bug
// here means a recruiter bulk-adds the wrong candidates to the wrong
// pipeline stage.
describe("clusterCandidate", () => {
  it("buckets high elo + high readiness as strong_fit", () => {
    expect(clusterCandidate({ elo: 1150, jobReadiness: 80 })).toBe("strong_fit")
  })

  it("buckets solid elo + moderate readiness as interview_ready", () => {
    expect(clusterCandidate({ elo: 1020, jobReadiness: 55 })).toBe("interview_ready")
  })

  it("buckets good elo + low readiness as high_potential", () => {
    expect(clusterCandidate({ elo: 960, jobReadiness: 30 })).toBe("high_potential")
  })

  it("buckets decent elo + some task activity as needs_verify", () => {
    expect(clusterCandidate({ elo: 910, jobReadiness: 30, taskCount: 3 })).toBe("needs_verify")
  })

  it("buckets borderline elo with no activity as future_pool", () => {
    expect(clusterCandidate({ elo: 880, jobReadiness: 0, taskCount: 0 })).toBe("future_pool")
  })

  it("buckets low elo as not_matched", () => {
    expect(clusterCandidate({ elo: 700, jobReadiness: 0, taskCount: 0 })).toBe("not_matched")
  })

  it("defaults missing elo/jobReadiness/taskCount to safe fallbacks instead of throwing", () => {
    expect(() => clusterCandidate({})).not.toThrow()
    expect(clusterCandidate({})).toBe("not_matched") // elo defaults to 800, below every real threshold
  })
})
