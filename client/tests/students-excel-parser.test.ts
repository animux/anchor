import { describe, expect, it } from "vitest"

import { parseStudentsWorksheetRows } from "@/lib/students/excel"

describe("parseStudentsWorksheetRows", () => {
  it("parses valid rows and continues on invalid rows", () => {
    const result = parseStudentsWorksheetRows([
      [
        "student_id",
        "full_name",
        "school_email",
        "personal_email",
        "group",
        "cohort",
        "intake",
        "level",
      ],
      [
        "STU-1",
        "Jules Hart",
        "jules@school.edu",
        "jules@gmail.com",
        "A",
        "2026",
        "Sept",
        "L5",
      ],
      ["", "No ID", "noid@school.edu", "", "A", "2026", "Sept", "L5"],
      ["STU-1", "Duplicate", "dup@school.edu", "", "A", "2026", "Sept", "L5"],
    ])

    expect(result.totalRows).toBe(3)
    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]?.data.studentId).toBe("STU-1")
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]?.rowNumber).toBe(3)
    expect(result.errors[1]?.message).toContain("Duplicate student_id")
  })

  it("parses rows from formatted spreadsheet headers", () => {
    const result = parseStudentsWorksheetRows([
      [
        "Student ID",
        "Name",
        "Phone",
        "Personal email",
        "School email",
        "Group",
        "Intake",
        "Level",
      ],
      [
        "LC124164",
        "Lina Khan",
        "0722983666",
        "lina.khan0@gmail.com",
        "lina.khan0@lcca.ac.uk",
        "E",
        "2024 Sept",
        "Level 5",
      ],
    ])

    expect(result.errors).toHaveLength(0)
    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]?.data.studentId).toBe("LC124164")
    expect(result.validRows[0]?.data.fullName).toBe("Lina Khan")
    expect(result.validRows[0]?.data.phone).toBe("0722983666")
    expect(result.validRows[0]?.data.intake).toBe("2024 Sept")
    expect(result.validRows[0]?.data.level).toBe("Level 5")
  })
})
