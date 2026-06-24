import type { ModuleStatus, RagStatus } from "@/lib/submissions/types"

export function getStatusLabel(status: ModuleStatus) {
  if (status === "yes") return "Yes"
  if (status === "no") return "No"
  if (status === "extension") return "Extension"
  return "Not set"
}

export function getRagLabel(status: RagStatus) {
  if (status === "green") return "Green"
  if (status === "amber") return "Amber"
  if (status === "red") return "Red"
  return "Not set"
}

export function getRagFromCompletion(
  completedModules: number,
  totalModules: number
): RagStatus {
  if (totalModules <= 0) return "not_set"
  if (completedModules >= totalModules) return "green"
  if (completedModules * 2 >= totalModules) return "amber"
  return "red"
}

export function getCompletedCountAfterStatusChange(
  currentCompleted: number,
  currentStatus: ModuleStatus,
  nextStatus: ModuleStatus
) {
  const delta =
    (nextStatus === "yes" ? 1 : 0) - (currentStatus === "yes" ? 1 : 0)
  return Math.max(0, currentCompleted + delta)
}
