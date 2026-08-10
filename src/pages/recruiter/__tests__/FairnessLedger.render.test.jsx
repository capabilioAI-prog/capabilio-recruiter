import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

// 2026-08-10: a component-level test, not just the pure-function tests in
// FairnessLedger.test.js -- this exercises the actual data-fetching effect
// and render path, mocking Supabase so no network call happens. Guards
// against the class of bug this session fixed elsewhere (a page rendering
// fine with mock data but silently breaking against the real query shape).
vi.mock("../../../lib/supabaseClient", () => {
  const applications = [
    {
      id: "app-1",
      job_id: "job-1",
      name: "Grace Hopper",
      email: "grace@example.com",
      score: 91,
      matched_skills: ["Python"],
      missing_skills: [],
      ats_summary: "Excellent fit.",
      status: "shortlisted",
      created_at: "2026-08-01T00:00:00Z",
    },
  ]
  const jobs = [{ id: "job-1", title: "Backend Engineer" }]

  return {
    supabase: {
      from(table) {
        if (table === "applications") {
          return {
            select: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: applications, error: null }),
              }),
            }),
          }
        }
        if (table === "jobs") {
          return { select: () => Promise.resolve({ data: jobs, error: null }) }
        }
        if (table === "audit_log") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table in test: ${table}`)
      },
    },
  }
})

const FairnessLedger = (await import("../FairnessLedger.jsx")).default

describe("FairnessLedger", () => {
  it("renders a real applicant loaded from Supabase, not fabricated data", async () => {
    render(<FairnessLedger />)
    // "Grace Hopper" legitimately appears twice once loaded: once in the
    // sidebar applicant list, once in the detail panel header.
    await waitFor(() => expect(screen.getAllByText("Grace Hopper").length).toBeGreaterThan(0))
    expect(screen.getByText(/Backend Engineer/)).toBeInTheDocument()
    // The old fabricated version always showed "Recruiter Priya opened
    // candidate profile" -- confirm that text is gone.
    expect(screen.queryByText(/Recruiter Priya/)).not.toBeInTheDocument()
  })
})
