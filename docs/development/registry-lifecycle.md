# Registry sahiplik ve kayıt yaşam döngüsü (C01)

Tasarım tabanı: [S1.0 sözleşme › Yetki ve durum](../stage-1/05-capability-contract.md), [güvenlik › Yetki matrisi](../stage-1/04-security.md#yetki-matrisi). Kimlik ve izin matrisi: [identity.md](identity.md). Kayıt DTO'ları: [generic-registry.md](generic-registry.md).

## Kimlik: imzalı gateway

Registry ayrı servistir ve kimlik veritabanını görmez. Değişiklik istekleri Personal'ın `/registry` gateway'inden geçer: gateway principal'ı E01 ile doğrular (Bearer veya cookie + CSRF), `{id, name, role, method, path, iat}` bilgisini `REGISTRY_PRINCIPAL_SECRET` ile HMAC-SHA256 imzalar ve `X-IFA-Principal` başlığında iletir. Registry imzayı sabit zamanlı karşılaştırır.

- İmza tek bir HTTP yöntemine ve yola bağlıdır; 30 sn'den eski veya ileri tarihli imza reddedilir. Aynı pencerede aynı isteğin tekrarı mümkündür (nonce yok); işlemler idempotent tasarlanmıştır.
- Gönderilmiş ama geçersiz imza her modda 401'dir. İmzasız değişiklik `required` modda 401.
- Keşif okumaları (`GET /v1/agents`) imzasızdır; Personal'ın sunucu tarafı keşfi değişmez.
- Secret en az 32 karakter; iki servise aynı değer verilir, loglanmaz. Üretmek için: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Servis kimliği ve secret yaşam döngüsü E02'dedir.

| `AUTH_MODE` (Registry) | İmzasız değişiklik |
| --- | --- |
| `required` (varsayılan) | 401; secret yoksa Registry salt okunur çalışır ve başlangıçta uyarı loglar |
| `local-demo` | `local-demo` principal'ına (developer) atanır; compose bunu ayarlar |

## Durumlar ve işlemler

Doğrulama eşzamanlıdır (kart ve manifest istek sırasında okunur). Kayıt `ownerId`, `status`, `revision`, `statusChangedAt` ve gerekirse `statusReason` taşır.

| İşlem | Kim | Sonuç |
| --- | --- | --- |
| `POST /v1/agents` (yeni) | developer | 201 `active`, `ownerId` = çağıran |
| `POST /v1/agents` (aynı `cardUrl`) | yalnız sahip | 200 yenilenmiş snapshot, `revision+1`; başkası 403 `not_owner`; askıdaysa 409 `registration_suspended`; `rejected` kayıt başarılı yenilemeyle `active` olur |
| `POST /v1/agents/{id}/suspend` | sahip veya operator | 200 `suspended` |
| `POST /v1/agents/{id}/resume` | sahip veya operator | Kart/manifest yeniden okunur: başarılıysa 200 `active`, değilse 422 ve `rejected` (eski snapshot korunur) |
| `DELETE /v1/agents/{id}` | sahip veya operator | 204; `capability_versions` sürüm kilitleri ve audit izi kalır, adres yeniden kaydedilebilir |

Operatör başkasının kart/manifest içeriğini yenileyemez; yalnız askıya alma, yeniden etkinleştirme ve silme yapar. Operatör işlemi sahipliği değiştirmez.

## Görünürlük

- Keşif listesi yalnız `active` ve ağ izni geçerli kayıtları gösterir.
- Kapalı (`suspended`/`rejected`) kayıt tekil okumada yalnız sahibine ve operatöre görünür; diğerlerine 404 döner (varlık sızdırılmaz).

## Audit

Her yaşam döngüsü değişikliği yazmayla aynı transaction'da `audit_log` tablosuna eklenir: `at`, `actor_id`, `actor_role`, `action` (`register`/`refresh`/`suspend`/`resume`/`reject`/`delete`), `agent_id`, `from_status`, `to_status`, `reason`. Kart, manifest, token veya secret yazılmaz. Operatör işlemleri `actor_role=operator` ile ayırt edilir. Okuma uç noktası ve genel audit/maskeleme E10'dadır.

## Migration

C01 öncesi kayıtlar okunurken `ownerId=local-demo`, `status=active`, `revision=1` ile tamamlanır; DB şeması yalnız `audit_log` tablosu ekler. `required` modda bu kayıtları yalnız operatör yönetebilir.

## Kapsam dışı

If-Match revision concurrency ve namespace sahipliği (C02), arama ve sayfalama (C03), asenkron `pending_validation`, kayıt güncelliği/TTL (C04).
