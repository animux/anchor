export function getStudentProfilePath(studentId: string) {
  return `/students/${encodeURIComponent(studentId)}`
}
