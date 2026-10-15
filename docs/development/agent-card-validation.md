# B03 — Registry Agent Card doğrulaması

Issue #3; implementation `services/capabilities/agent-card.ts`. Ağdan gelen JSON `unknown` olarak alınır; Registry'nin tükettiği `name`, `skillIds`, `endpoint` alanlarına doğrulanmış projection üretilir. Router'daki kart `any` kullanımı kaldırıldı. Bu sınırlı Registry kabul politikasıdır; tüm A2A alanlarının doğrulandığı iddiası değildir.

## Kurallar

- Kart/capabilities/skill/interface nesne olmalı; array veya null olamaz.
- Ad dolu, en fazla 200 UTF-16 birimi; streaming kesinlikle `true`.
- 1–16 skill: ID dolu, en fazla 128 UTF-16 birimi, baş/son boşluksuz ve benzersiz.
- Skill name/description/tags eski minimal kartlarla uyum için isteğe bağlı. Varsa tip ve limit doğrulanır: name 200, description 2000, en fazla 32 tag ve tag başına 128.
- 1–8 supported interface; protocolBinding/protocolVersion dolu ve en fazla 32, URL en fazla 2048. URL HTTP(S), credentials ve fragment içermez.
- Tam olarak bir JSONRPC 1.0 arayüz seçilebilir. Seçilen endpoint Card ile aynı origin, `/a2a`, query yok. Birden fazla uygun arayüz belirsiz sayılır; sıralamaya göre ilkini seçmeyiz.
- Diğer protokol arayüzleri çağrılmaz; varlıkları A2A çoklu transport desteği olarak yorumlanmaz.
- Bilinmeyen ek kart alanları projeksiyona alınmaz; A2A uzantıları sırf tanınmadığı için reddedilmez.
- Manifestteki her skillId doğrulanmış kart skill listesinde olmalı. Manifest validator mevcut tekrar eden binding kontrolünü korur. Kartın manifest dışında skill ilan etmesi mümkün; Registry yalnız manifestteki capability'leri generic keşfe açar.

## Hata ve veri davranışı

Card hataları 422 `{error,path}` döner; path `/card/...` altındadır. Manifest path'leri mevcut biçimde korunur. `duplicate_skill_id`, `invalid_card_list`, `invalid_card_string`, `invalid_interface_url`, `endpoint_not_allowed`, `ambiguous_or_missing_interface`, `streaming_required`, `invalid_skill_tags`, `invalid_skill_id`, `no_supported_skill` kodları teşhis içindir; URL/gizli veri hataya kopyalanmaz.

Bütün ağ okuma/doğrulama save'den önce yapılır. Bozuk yenilemede eski id, registeredAt, manifest, capabilityDigests ve endpoint korunur. POST/GET/detail/list yanıtlarında mevcut manifest snapshot alanı korunur; veri modeli/migration değişmedi.

## Geriye uyum

Geçerli mevcut text agent'lar ve yalnız skill ID taşıyan eski kartlar çalışır. Önceden kabul edilebilen duplicate skill, bozuk ek interface ve 16'dan fazla skill yeni kayıtta/yenilemede reddedilir. Diskteki eski kartlar otomatik silinmez; mevcut snapshot okuma davranışı değişmez. B04 validator kapsamı açık bağımlılıktır; bu çalışma onun tamamlandığı anlamına gelmez.

## Kanıt

15 Ekim 2026: backend + frontend build ve 13/13 servis testi başarılı. Yeni `tests/agent-card.test.cjs`: projection/minimal legacy, bozuk tip/limit/endpoint matrisi, gerçek HTTP kayıt/yenileme ve tam snapshot koruması. Diğer 10 regresyon aynı komutta geçer. Docker yeniden build edilmedi; çalışan demo değişmedi.

Auth/namespace sahipliği, DNS pinning, global sürüm kotası, tam A2A Card schema validasyonu kapsam dışıdır. #5 şablonunun bu feature dalıyla birleşik testi henüz yapılmadı; dallar ayrı review edilir.
