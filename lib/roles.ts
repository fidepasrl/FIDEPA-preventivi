export function normalizeRole(role: string | null | undefined) {
  return (role || "user").trim().toLowerCase();
}

export function isDeveloperRole(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return normalized === "developer" || normalized === "sviluppatore";
}

export function isAdminOrDeveloperRole(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || isDeveloperRole(normalized);
}

export function roleLabel(role: string | null | undefined) {
  const normalized = normalizeRole(role);

  if (isDeveloperRole(normalized)) return "DEVELOPER";
  if (normalized === "admin") return "ADMIN";

  return "USER";
}
