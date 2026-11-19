import type { NextFunction, Request, RequestHandler, Response } from "express";
import { LOCAL_DEMO_PRINCIPAL, type Principal } from "../identity/domain/principal.js";
import { PRINCIPAL_HEADER, verifyPrincipal } from "../identity/infrastructure/principal-assertion.js";

export type RegistryAuthMode = "required" | "local-demo";

export function registryPrincipalOf(res: Response): Principal | undefined {
  return res.locals.principal as Principal | undefined;
}

/**
 * Registry kimliği: yalnız Personal gateway'inin imzaladığı principal kabul edilir.
 * Başlık yoksa istek anonimdir (keşif okumaları için yeterli). local-demo modunda
 * anonim istek demo principal'ına atanır. Gönderilmiş ama geçersiz imza her modda
 * 401'dir; bozuk kimlik sessizce anonime ya da demo'ya düşürülmez.
 */
export function registryPrincipal(options: { mode: RegistryAuthMode; secret?: string; now?: () => number }): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Router'a kimlik katmanının bağlı olduğunu bildirir: bu durumda principal
    // yoksa istek anonimdir ve değişiklik uçları 401 döner.
    res.locals.principalBound = true;
    const header = req.header(PRINCIPAL_HEADER);
    if (header !== undefined) {
      const path = new URL(req.originalUrl, "http://registry.invalid").pathname;
      const principal = options.secret ? verifyPrincipal(header, options.secret, { method: req.method, path }, options.now?.()) : undefined;
      if (!principal) { res.status(401).json({ error: "invalid_principal_assertion" }); return; }
      res.locals.principal = principal; next(); return;
    }
    if (options.mode === "local-demo") res.locals.principal = LOCAL_DEMO_PRINCIPAL;
    next();
  };
}
