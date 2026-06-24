import * as XLSX from "xlsx"

import {
  studentInputSchema,
  type StudentInput,
} from "@/lib/validations/students"

type RawRow = Record<string, string>

export type ParsedExcelRow = {
  rowNumber: number
  data: StudentInput
}

export type ParsedExcelRowError = {
  rowNumber: number
  studentId?: string
  message: string
}

export type ParsedExcelResult = {
  validRows: ParsedExcelRow[]
  errors: ParsedExcelRowError[]
  totalRows: number
}

const headerAliases: Record<string, keyof StudentInput> = {
  student_id: "studentId",
  studentid: "studentId",
  "student id": "studentId",
  id: "studentId",
  full_name: "fullName",
  fullname: "fullName",
  "full name": "fullName",
  name: "fullName",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  personal_email: "personalEmail",
  "personal email": "personalEmail",
  school_email: "schoolEmail",
  "school email": "schoolEmail",
  group: "group",
  cohort: "cohort",
  intake: "intake",
  level: "level",
  study_level: "level",
  "study level": "level",
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function normalizeCell(value: unknown) {
  if (value == null) return ""
  return String(value).trim()
}

function mapRawRow(rawRow: RawRow): StudentInput {
  return {
    studentId: rawRow.studentId ?? "",
    fullName: rawRow.fullName ?? "",
    phone: rawRow.phone,
    personalEmail: rawRow.personalEmail,
    schoolEmail: rawRow.schoolEmail,
    group: rawRow.group,
    cohort: rawRow.cohort,
    intake: rawRow.intake,
    level: rawRow.level,
  }
}

export function parseStudentsWorksheetRows(
  rows: Array<Array<string | number | null>>
): ParsedExcelResult {
  const headerRow = rows[0] ?? []
  const mappedHeaders = headerRow.map((header) => {
    const normalized = normalizeHeader(header)
    return headerAliases[normalized]
  })

  const validRows: ParsedExcelRow[] = []
  const errors: ParsedExcelRowError[] = []
  const seenStudentIds = new Set<string>()

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const rowNumber = rowIndex + 1
    const normalizedRow: RawRow = {}

    for (
      let columnIndex = 0;
      columnIndex < mappedHeaders.length;
      columnIndex += 1
    ) {
      const key = mappedHeaders[columnIndex]
      if (!key) continue
      normalizedRow[key] = normalizeCell(row[columnIndex])
    }

    const parsed = studentInputSchema.safeParse(mapRawRow(normalizedRow))
    if (!parsed.success) {
      errors.push({
        rowNumber,
        message: parsed.error.issues[0]?.message ?? "Invalid row",
      })
      continue
    }

    const normalizedStudentId = parsed.data.studentId.toLowerCase()
    if (seenStudentIds.has(normalizedStudentId)) {
      errors.push({
        rowNumber,
        studentId: parsed.data.studentId,
        message: "Duplicate student_id in uploaded file",
      })
      continue
    }

    seenStudentIds.add(normalizedStudentId)
    validRows.push({ rowNumber, data: parsed.data })
  }

  return {
    validRows,
    errors,
    totalRows: Math.max(rows.length - 1, 0),
  }
}

export function parseStudentsExcelRows(file: File): Promise<ParsedExcelResult> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" })
    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      return {
        validRows: [],
        errors: [{ rowNumber: 1, message: "Workbook has no worksheets" }],
        totalRows: 0,
      }
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(
      worksheet,
      {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      }
    )

    return parseStudentsWorksheetRows(rows)
  })
}
