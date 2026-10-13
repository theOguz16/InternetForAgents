# Metin profilleri v1 — ilk uygulama

ADR-024 sonrası yeni demo profilleri. Makine şemaları `services/shared/contracts.ts` içinde tanımlıdır; her servis `GET /profiles` ile aynı şemaları JSON olarak yayımlar. Ajv, A2A girişinde ve artifact üretilmeden önce bu şemaları doğrular. Bu şemalar JSON Schema draft-07 anahtar sözcüklerini kullanır. Paylaşılabilir JSON dosyaları `contracts/text/` altındadır; `npm run export:contracts` komutuyla kaynak tanımdan tekrar üretilir.

| Profil / skill ID | Girdi | `output` |
| --- | --- | --- |
| `text-language.v1` | `profile`, `text` | `language`: `tr`, `en` veya `und` |
| `text-keywords.v1` | `profile`, `text` | `keywords`: en fazla 10 benzersiz kelime/ifade |
| `text-summary.v1` | `profile`, `text` | `summary`: 1–2000 karakter |

Girdi yalnızca iki alan içerir. Metin 1–8000 Unicode karakter olmalı ve boşluk dışında karakter içermelidir; toplam HTTP JSON gövdesi 64 KiB ile sınırlıdır. Anahtar kelimeler 1–128 karakterdir. Bilinmeyen alanlar reddedilir. URL/dosya kabul edilmez.

Her sonuç `{ profile, mode, output }` biçimindedir. `mode`, `fixture`, `deterministic` veya `model` olabilir. Şu an üç handler da yalnızca fixture’dır. Dil sonucu `und`, anahtar kelimeler boş liste, özet ise örnek sonuç açıklamasıdır. Bunlar kalite göstergesi değildir.

## A2A isteği

Uzmanın `/a2a` adresine `Content-Type: application/json`, `Accept: text/event-stream` ve `A2A-Version: 1.0` ile POST:

```json
{
  "jsonrpc": "2.0",
  "id": "request-1",
  "method": "SendStreamingMessage",
  "params": {
    "message": {
      "messageId": "unique-message-1",
      "role": "ROLE_USER",
      "parts": [{
        "mediaType": "application/json",
        "data": {"profile": "text-language.v1", "text": "Merhaba dünya"}
      }]
    }
  }
}
```

Tek JSON DataPart kabul edilir. SDK önce task, sonra working, artifact ve completed olaylarını SSE üzerinden gönderir. Geçersiz profil/girdi failed görev üretir; hatalı uzman çıktısı yayımlanmaz. İstek ve yanıt envelope’larını resmi SDK yönetir. Özel polling endpoint’i yoktur.

Görevler ilk adaptörde bellektedir. Süreç yeniden başlarsa kaybolur; kalıcı dedup, crash recovery ve gerçek iptal henüz yoktur. İstemci tekrar gönderimin yeni iş yaratabileceğini dikkate almalıdır. Ürün kabul kriterleri bu aşamada tamamlanmış sayılmaz.
