export function getRagFromCompletion(completedModules, totalModules) {
  if (totalModules <= 0) return "not_set";
  if (completedModules >= totalModules) return "green";
  if (completedModules * 2 >= totalModules) return "amber";
  return "red";
}
