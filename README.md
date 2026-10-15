# Internet for Agents

**Bağımsız geliştirilen agent’ları keşfetme ve birlikte çalıştırma platformu.**

Geliştirici agent’ını kendi ortamında çalıştırır ve beceri tanımıyla kaydeder. Platform uyumlu sağlayıcıları bulur, görevleri A2A üzerinden doğrudan iletir, ilerleme ve sonuçları birleştirir. Yeni agent için platform ekibinin özel entegrasyon yazması hedeflenmez.

## Güncel hedef — S1.0

15 Ekim 2026: [Aşama 1 tasarım tabanı](docs/stage-1/README.md) sabitlendi. Kontrollü ekip platformu Teslim A; dinamik LLM planlama ve açık internete dağıtım sonraki seviyelerdir. İlk ürün demosu basit Python fonksiyonu üretme → review/test üretimi → izole test çalıştırma. Uzman agent’ları takım arkadaşları geliştirecek.

**Hedef tasarım henüz bütünüyle uygulanmadı.** Mevcut kod üç metin becerisine bağlıdır. Generic kayıt/manifest, sahiplik, workflow motoru ve runner sonraki işlerdir.

## Şu an çalışanlar

Node.js 24 + Express + TypeScript; Registry/Personal/uzmanlarda SQLite; A2A 1.0 JSONRPC + SSE; React/Vite demo; Docker Compose. Dil ve anahtar kelime agent’ları deterministik, özet fixture’dır. Altı otomatik test ve 15 Ekim Docker/tarayıcı smoke testi geçti. Bunlar üretim güvenliği veya model kalitesi kanıtı değildir.

```sh
docker compose --profile integration up --build
```

Demo: http://localhost:4002. Uzmanları arayüzden kaydetmek için [çalıştırma rehberi](docs/development/demo-ui.md). Eski seyahat prototipi kökte korunur; `npm start` o prototipi açar. Yeni sistem komutları ve sınırları [yerel geliştirme rehberinde](docs/development/local.md).

## Tasarım kaynakları

- [Amaç ve tamamlanma kriterleri](docs/stage-1/01-product.md)
- [Mimari, workflow ve context](docs/stage-1/03-architecture.md)
- [Güvenlik / tehdit modeli](docs/stage-1/04-security.md)
- [Geliştirici yetenek sözleşmesi](docs/stage-1/05-capability-contract.md)
- [Kod/review/test demo profilleri](docs/stage-1/06-code-demo.md)
- [UI/UX](docs/stage-1/07-ux.md)
- [KPI ve deney protokolü](docs/stage-1/08-evaluation.md)
- [Task listesi ve aşamalar](docs/stage-1/09-delivery.md)
- [Tüm belgeler](docs/README.md)
- [Docker doğrulama raporu](docs/development/docker-demo-results.md)

Çalışma dalı: `develop`. 'Kayıtlı', 'doğrudan çağrılabilir' ve 'bir workflow ile uyumlu' farklı özelliklerdir. Yeni beceriyi kaydetmek, anlamını otomatik öğrenip her akışta kullanabilmek anlamına gelmez.

## Ekip geliştirme

[Çalışma anlaşması ve review](docs/team/working-agreement.md) · [Kurulum](docs/team/local-setup.md) · [67 görev](docs/team/tasks/README.md) · [Manifest/Registry ilk artım](docs/development/generic-registry.md). Yeni genel kayıt yalnız yerel geliştirme kapsamındadır; ownership ve genel dispatch sonraki işlerdir.
