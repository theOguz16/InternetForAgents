# Kimlik, oturum ve roller (E01)

Personal servisinin kullanıcı kimliği, web oturumu ve izin matrisi. Tasarım tabanı: [S1.0 güvenlik › Yetki matrisi](../stage-1/04-security.md#yetki-matrisi), tehdit TH01 (başkasının job/artifact’i), TH05 (caller-scoped dedup) ve TH09 (CSRF).

## Kimlik kanıtı

IdP/SSO yoktur. Operatör principal oluşturur; token yalnız bir kez gösterilir, DB’de SHA-256 hash’i saklanır. Token 256 bit rastgele olduğundan yavaş parola hash’i gerekmez.

```sh
npm run build:services
DATA_DIR=.data/personal node dist/services/identity/cli.js create developer ayse
node dist/services/identity/cli.js list
node dist/services/identity/cli.js rotate <id>    # yeni token; eski token ve oturumlar kapanır
node dist/services/identity/cli.js revoke <id>    # kalıcı iptal; oturumlar kapanır
```

Docker’da aynı volume ile: `docker compose run --rm personal node dist/services/identity/cli.js create user ali`. Token’ı log, issue veya sohbete yapıştırmayın.

## İstemci kullanımı

| İstemci | Kimlik | CSRF |
| --- | --- | --- |
| API/CLI | `Authorization: Bearer <token>` | Gerekmez; tarayıcı bu başlığı kendiliğinden göndermez |
| Web | `POST /v1/session {"token": …}` → `ifa_session` cookie (`HttpOnly; SameSite=Strict; Secure; Path=/`, 8 saat) | GET dışındaki her istekte `X-CSRF-Token` |

`GET /v1/session` mevcut principal’ı ve CSRF token’ını döner (sayfa yenileme). `DELETE /v1/session` çıkış yapar ve CSRF ister. Giriş yalnız `application/json` kabul eder; siteler arası düz form giriş yapamaz (login CSRF). Principal başına en fazla 10 oturum tutulur; yeni giriş en eskisini kapatır. Session kimliği DB’de hash olarak saklanır. CSRF token’ı ise bilerek düz metin saklanır: sayfa yenilendiğinde `GET /v1/session` aynı token’ı döndürebilmelidir. CSRF token’ı tek başına yetki vermez; hash’li session cookie’si olmadan kullanılamaz, bu yüzden DB sızıntısında oturum ele geçirilemez. #12 plan yorumundaki "CSRF token’ı da hash" ifadesi bu kararla güncellenmiştir.

Gönderilmiş ama geçersiz kimlik bilgisi her modda 401’dir; anonim kullanıcıya düşürülmez.

## Modlar

| `AUTH_MODE` | Davranış |
| --- | --- |
| `required` (varsayılan) | Kimlik bilgisi olmayan istek 401 |
| `local-demo` | Kimlik bilgisi yoksa `local-demo` principal’ı (developer) atanır. Yalnız host portu loopback’e bağlı yerel demo içindir; compose bunu ayarlar. Başlangıçta uyarı loglanır |

`COOKIE_SECURE=false` yalnız TLS’siz ve localhost dışı yerel denemede kullanılır; tarayıcılar `http://localhost` için Secure cookie’yi kabul eder.

## İzin matrisi

`services/identity/domain/principal.ts` → `can(principal, action, resource)`; listede olmayan her şey reddedilir.

| İşlem | User | Developer | Operator |
| --- | --- | --- | --- |
| job oluştur | Evet | Evet | Evet |
| job / artifact oku, job sil | Kendi işi | Kendi işi | Hayır (içerik yok) |
| job metadata | Kendi işi | Kendi işi | Evet (uç nokta henüz yok) |
| agent kaydet | Hayır | Evet | Hayır |
| agent kaydı güncelle | Hayır | Yalnız kendi kaydı | Hayır |
| askıya alma, ağ/kota politikası | Hayır | Hayır | Evet |

Uygulanan yerler: Personal job okuma, SSE ve gönderim; başkasının işi **404** döner (varlık sızdırılmaz). Idempotency anahtarı principal’a göre ayrılır; aynı anahtar iki kullanıcıda çatışmaz. `/registry` gateway’inde kayıt POST’u developer ister.

## Kapsam dışı

- Registry kaydının sahibine bağlanması ve başkasının kaydını güncellemenin reddi: **C01** (kural matriste tanımlı ve testli).
- Kullanıcı başına kota ve rate limit: **E04**. Servis kimliği ve Personal→uzman credential’ı: **E02**. Audit kaydı: **E10**.
- UI giriş ekranı: **G03**. Operatör metadata uç noktası henüz yok.

## Migration

`personal_state` kaydı `version: 2` alır. E01 öncesi kayıtlardaki işler ve idempotency anahtarları `local-demo` sahibine taşınır: `local-demo` modunda görünmeye devam eder, `required` modda kimse göremez ve 24 saatlik saklama süresiyle silinir. Kimlik verisi ayrı `identity.sqlite` dosyasındadır.
