import { describe, expect, it } from "vitest"

import {
  getCompletedCountAfterStatusChange,
  getRagFromCompletion,
} from "@/lib/submissions/operations"

describe("getRagFromCompletion", () => {
  it("returns not_set when no modules exist", () => {
    expect(getRagFromCompletion(0, 0)).toBe("not_set")
  })

  it("returns red when fewer than half modules are complete", () => {
    expect(getRagFromCompletion(1, 4)).toBe("red")
  })

  it("returns amber when at least half modules are complete", () => {
    expect(getRagFromCompletion(2, 4)).toBe("amber")
    expect(getRagFromCompletion(3, 5)).toBe("amber")
  })

  it("returns green only when all modules are complete", () => {
    expect(getRagFromCompletion(4, 4)).toBe("green")
  })
})

describe("getCompletedCountAfterStatusChange", () => {
  it("increments when a module changes to yes", () => {
    expect(getCompletedCountAfterStatusChange(1, "no", "yes")).toBe(2)
  })

  it("decrements when a module changes from yes", () => {
    expect(getCompletedCountAfterStatusChange(2, "yes", "extension")).toBe(1)
  })

  it("keeps count unchanged when yes-state does not change", () => {
    expect(getCompletedCountAfterStatusChange(2, "no", "extension")).toBe(2)
  })
})
