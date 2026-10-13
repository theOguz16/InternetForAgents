# Registry ve A2A yerel bağlantısı

## Docker

```sh
docker compose --profile integration up --build
curl -X POST http://localhost:4001/v1/agents \
  -H 'Content-Type: application/json' \
  -d '{"cardUrl":"http://language:4000/.well-known/agent-card.json"}'
curl 'http://localhost:4001/v1/agents?profile=text-language.v1'
```

Diğer uzmanlar için `language` yerine `keywords` veya `summary` kaydedilir. Kayıt otomatik yapılmaz. Container kartlarının endpoint’leri Compose ağında çözümlenir; hosttan doğrudan A2A denemesi için yayımlanan 4101/4102/4103 portlarını kullan. Personal Agent henüz bu kayıtları çağırmaz.

## Docker dışında

Ayrı terminallerde Node.js 24 kullanarak:

```sh
SERVICE_NAME=registry PORT=4001 npm run dev:service
SERVICE_NAME=language PORT=4101 npm run dev:service
```

Bu kez kayıt adresi `http://127.0.0.1:4101/.well-known/agent-card.json` olur. Varsayılan izin listesi 127.0.0.1 üzerindeki 4101, 4102 ve 4103 origin’leridir. `ALLOWED_AGENT_ORIGINS` virgülle ayrılmış operatör ayarıdır. Aynı capability için yeni sağlayıcı eklenirken bu ağ izni genişletilebilir; uygulama iş mantığı değişmez.

## Uygulanan alt küme

- `POST /v1/agents`: `{cardUrl}`; kartı en fazla 3 saniye/64 KiB sınırıyla okur. Redirect kabul etmez. Aynı origin üzerinde `/a2a`, JSONRPC 1.0, streaming ve bilinen en az bir profil ister. Yeni kayıtta 201, aynı kart güncellenince 200 döner.
- `GET /v1/agents?profile=...`: kayıt anındaki snapshot’ları verir. Liste en fazla 100 kayıtla sınırlıdır. Anlık sağlık iddiası yoktur.
- `GET /v1/agents/:id`: tek kayıt veya 404.
- Uzmanlarda `GET /.well-known/agent-card.json` ve `POST /a2a`: resmi SDK adaptörü.
- `GET /profiles`: girdi/çıktı şemaları.

Kayıt ve görev depoları bellektedir. Kimlik/ownership, kalıcı SQLite, pagination, kayıt silme, idempotency, SSE sonrası yeniden başlatma kurtarması ve Personal orkestrasyonu sonraki işlerdir. Bu uygulama, kapsamlı API tasarımındaki 202/pending iş akışının henüz yerine geçmez.

Yerel süreçler varsayılan olarak 127.0.0.1’e bağlanır. Docker HOST=0.0.0.0 kullanır ama host portları localhost’a yayımlanır. İnternete veya güvenilmeyen paylaşılan ağa açılmamalıdır; mevcut allowlist paylaşılan ağ için tam SSRF koruması değildir. Ortak model veya LLM çağrısı yoktur.
