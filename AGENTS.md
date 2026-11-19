# AGENTS.md — Kod asistanları için ortak kurallar

Bu dosya Claude Code, Antigravity, Codex vb. tüm kod asistanları içindir. Kısa tutulur; ayrıntı için bağlantılı belgeleri oku, hepsini baştan okuma.

## Proje

Internet for Agents: bağımsız geliştirilen agent'ları keşfetme (Registry) ve A2A üzerinden birlikte çalıştırma (Personal/orchestrator) platformu. Güncel hedef S1.0 / Teslim A.

- Ürün ve mimari: `docs/stage-1/README.md` → ilgili bölüm (03 mimari, 04 güvenlik, 05 kontrat).
- Task'lar: `docs/team/tasks/<ID>.md` ve GitHub issue'su. Bağımlılıklar: `docs/team/task-catalog.json`.
- Kararlar: `docs/decisions/` (ADR). `docs/archive/` eski içeriktir, referans alma.

## Teknoloji ve komutlar

Node.js 24 (`>=24 <25`), TypeScript, Express 5, SQLite, A2A (`@a2a-js/sdk`), React 19 + Vite, Ajv.

```sh
npm ci --ignore-scripts
npm run build              # servisler + web
npm run test:services      # build + node --test tests/*.test.cjs
npm run validate:manifest -- examples/manifests/text-length.json text-length
docker compose --profile integration up --build   # demo: http://localhost:4002
```

`examples/agent-template` kendi `npm ci && npm test` akışına sahiptir. Kökteki `server.js`, `index.html`, `train-planner.js`, `training/` eski seyahat prototipidir; yeni işte dokunma.

## Kod yerleşimi

- `services/registry/` kayıt, `services/personal/` orchestrator/router/store, `services/shared/` A2A, kontrat, task-store.
- `services/capabilities/` manifest ve Agent Card doğrulaması, `services/model/` model portu.
- `packages/code-demo-contracts/` ve `schemas/`, `contracts/` public kontratlar.
- `web/src/` React demo. `tests/*.test.cjs` servis testleri.

## Zorunlu kurallar

1. **Dal:** güncel `develop`'tan `feature/<task-id>-<kisa-ad>`; PR base `develop`. `main`'e doğrudan iş yapma.
2. **Kapsam:** yalnız ilgili issue. Kapsam dışı refactor, yeni framework veya başka task'ın işi yok. Bağımlılık eksikse varsayım yapma, belirt.
3. **Agent bağımsızlığı:** platform çekirdeğine belirli bir agent için özel kod/bilgi ekleme. Yeni agent kaydı çekirdek değişikliği gerektirmemeli.
4. **Kontrat:** public API/şema değişirse ADR, şema, örnek ve migration aynı PR'da güncellenir.
5. **Test:** her kabul kriterine en az bir otomatik test. Güvenlik/veri işlerinde negatif senaryo zorunlu. Test DB/portları geçici olsun.
6. **Yorumlar Türkçe** ve "ne" değil, karmaşık kararın "neden"ini açıklar.
7. **Commit'e girmez:** secret, `.env`, yerel DB, `node_modules`, kişisel veri.
8. **Dürüstlük:** çalıştırmadığın komutu geçti diye yazma; desteklenmeyen özelliği açıkça belirt.

## Teslim

PR şablonunu (`.github/pull_request_template.md`) doldur ve `docs/team/ai-delivery-review.md` içindeki prompt ile üretilen, PR head SHA'sını içeren raporu ekle. Definition of Done: `docs/team/working-agreement.md`.

## Ekip içi iş bölümü (Claude ↔ Antigravity)

Aynı anda iki asistan aynı dosyalarda çalışmaz. Bir asistanın açtığı PR'ı diğeri inceleyebilir; inceleme yapan asistan kod yazmaz, bulgu raporlar.
