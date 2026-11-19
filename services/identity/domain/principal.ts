// Kimlik domain'i: roller, principal ve izin matrisi. Çalışma anı bağımlılığı yoktur.

export type Role = "user" | "developer" | "operator";
export const ROLES: readonly Role[] = ["user", "developer", "operator"];

export interface Principal { id: string; name: string; role: Role }

/**
 * AUTH_MODE=local-demo'da kimlik bilgisi olmayan isteğe atanan tek principal.
 * Demo arayüzü agent da kaydettiği için developer rolündedir. Paylaşılan ortamda
 * kullanılmaz; yalnız loopback'e bağlı yerel demo içindir (docs/architecture/api.md).
 */
export const LOCAL_DEMO_PRINCIPAL: Principal = { id: "local-demo", name: "Yerel demo", role: "developer" };

export type Action =
  | "job.create" | "job.read" | "job.delete" | "job.readMetadata" | "artifact.read"
  | "registration.create" | "registration.update" | "registration.suspend" | "policy.change";

/** İzin kararı için kaynağın yalnız sahiplik bilgisi gerekir; içerik politikaya girmez. */
export interface Resource { ownerId?: string }

/**
 * docs/stage-1/04-security.md yetki matrisi. Varsayılan red: listede açıkça
 * izin verilmeyen her şey reddedilir. Operatörün içerik erişimi yoktur; agent
 * sahibi olmak başka kullanıcının sonucunu açmaz (artifact sahibi iş sahibidir).
 */
export function can(principal: Principal | undefined, action: Action, resource: Resource = {}): boolean {
  if (!principal) return false;
  const owns = resource.ownerId !== undefined && resource.ownerId === principal.id;
  switch (action) {
    case "job.create": return true;
    case "job.read": case "job.delete": case "artifact.read": return owns;
    case "job.readMetadata": return owns || principal.role === "operator";
    case "registration.create": return principal.role === "developer";
    case "registration.update": return principal.role === "developer" && owns;
    case "registration.suspend": case "policy.change": return principal.role === "operator";
    default: return false;
  }
}
