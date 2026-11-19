import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { IdentityService } from "./application/identity-service.js";
import { ROLES, type Role } from "./domain/principal.js";
import { SqliteIdentityStore } from "./infrastructure/sqlite-identity-store.js";

// Operatör aracı: principal oluşturma, listeleme, iptal ve token yenileme.
// Personal servisiyle aynı DATA_DIR'i kullanır; container içinde de çalışır:
//   docker compose run --rm personal node dist/services/identity/cli.js create developer ayse
const usage = `Kullanım:
  identity create <${ROLES.join("|")}> <ad>
  identity list
  identity revoke <id>
  identity rotate <id>`;

const dataDir = process.env.DATA_DIR ?? join(process.cwd(), ".data", "personal");
mkdirSync(dataDir, { recursive: true });
const store = new SqliteIdentityStore(join(dataDir, "identity.sqlite"));
const identity = new IdentityService(store, { now: () => new Date() });
const [command, ...args] = process.argv.slice(2);
const printToken = (token: string) => {
  // Token yalnız bu çıktıda görünür; DB'de hash'i saklanır ve tekrar gösterilemez.
  console.log(`token: ${token}`);
  console.error("Bu token bir daha gösterilmez. Güvenli kanaldan iletin; log veya sohbete yapıştırmayın.");
};

try {
  if (command === "create" && args.length === 2 && ROLES.includes(args[0] as Role)) {
    const { principal, token } = identity.createPrincipal(args[1], args[0] as Role);
    console.log(`id: ${principal.id}\nrole: ${principal.role}\nname: ${principal.name}`);
    printToken(token);
  } else if (command === "list" && args.length === 0) {
    for (const p of identity.list()) console.log([p.id, p.role, p.name, p.revokedAt ? `revoked ${p.revokedAt}` : "active"].join("\t"));
  } else if (command === "revoke" && args.length === 1) {
    if (!identity.revoke(args[0])) { console.error("Principal bulunamadı veya zaten iptal edilmiş."); process.exitCode = 1; }
    else console.log("İptal edildi; açık oturumlar kapatıldı.");
  } else if (command === "rotate" && args.length === 1) {
    const token = identity.rotateToken(args[0]);
    if (!token) { console.error("Principal bulunamadı veya iptal edilmiş."); process.exitCode = 1; }
    else printToken(token);
  } else {
    console.error(usage); process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "identity_failed"); process.exitCode = 1;
} finally { store.close(); }
