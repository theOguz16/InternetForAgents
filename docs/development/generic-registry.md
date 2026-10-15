# Genel Registry manifest desteği — ilk artım

B01/B03/B04/C02 kapsamının yerel alt kümesi. Kayıt isteği artık `{cardUrl, manifestUrl}` kabul eder. Manifest aynı origin’de `/ifa/capabilities.json` adresindedir. `GET /v1/agents?profile=namespace/name` yeni ID’yi bulur; Registry kaynak listesine ekleme gerekmez.

Örnek: `examples/manifests/text-length.json`.

```sh
npm run validate:manifest -- examples/manifests/text-length.json text-length
```

CLI kartın gerçek skill ID’lerini argüman olarak bekler; agent sunucusu başlatmaz. Yalnız proje dizini içindeki, en fazla 128 KiB büyüklüğündeki JSON dosyalarını okur; proje dışına yönlenen sembolik bağlantıları reddeder. Registry ağdan aldığı kartla eşlemeyi kendisi yapar. cardUrl-only eski metin kayıtları geriye uyumluluk için korunur.

## Uygulananlar

- Draft-07 alt kümesi, root object, kapalı nesne, 8 derinlik, şema başına 100 property, enum 100, 16 capability, 1–10 örnek.
- Sonlu üst sınırlar; string ≤32768, array ≤1000. Pattern/ref/unknown keyword reddi.
- Manifest 128 KiB / kart 64 KiB, redirect kapalı, 3 saniye fetch bütçesi.
- Her örneğin input/output schema doğrulaması; JSON path’li hata.
- `major.minor.patch` sürümü; pre-release/build etiketleri v1’de desteklenmez.
- Capability ID+version başına digest; farklı sözleşmeyle aynı sürümü yeniden kaydetme 409.
- Agent-specific skillId digest dışında; açıklama, mod, örnek ve şemalar digest içinde. Bu, farklı sağlayıcıların aynı profile ait tanımı aynı yayımlamasını gerektirir. RFC 8785 canonicalization iddiası yoktur.
- Sürüm hash’i ve agent snapshot tek SQLite transaction’ında; hata rollback.

## Kalan sınırlar

Bu kayıt desteği genel yürütme desteği değildir. Personal hâlâ yalnız eski metin akışını çağırır; `ifa-call/result.v1` adaptörü B06/D task’larında gelecek. UI manifest formu henüz eklenmedi; yeni kayıt API/CLI üzerinden hazırlanır.

Namespace sahipliği/auth, pending/suspend/revision, expiry ve DNS sabitleme henüz uygulanmadı. Bu yüzden yalnız operatörün izin verdiği yerel geliştirme origin’lerinde kullanılmalıdır. Kimlik doğrulama olmadan manifest adı sahiplik kanıtı değildir; generic endpoint herkese açık dağıtım için hazır değildir. Bu PR bunları tamamlandı saymaz.

## Kanıt

15 Ekim 2026: TypeScript build ve 10 otomatik test geçti. HTTP testi bilinmeyen beceri kaydı/keşfini, eski testler metin demosunun korunmasını doğrular. Çalışan Docker image’ları bu değişiklikle otomatik güncellenmedi; PR merge sonrası yeniden build gerekir.
