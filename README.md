# Internet for Agents

AI agentlarının önceden entegre edilmemiş sağlayıcıları çalışma anında keşfetmesini, ortak kontratlarını anlamasını ve yetkileri kapsamında çağırmasını sağlayacak servis odaklı altyapı.

## Amaç

Yeni sağlayıcı eklemek, agent'a o sağlayıcı için özel entegrasyon yazmayı gerektirmemelidir. İlk araştırma deneyi bu iddiayı desteklenen ortak yetenek tanımı ve HTTP/JSON protokolü sınırlarında değerlendirir. Rastgele bir internet sitesinin otomatik anlaşılması ilk kapsamda değildir.

## Sistem sınırı

Agent hedefi yorumlar ve planlar. Çekirdek sağlayıcıları bulur, alternatifleri gerekçeleriyle sunar ve seçilen servisi çağırır. Sağlayıcı kendi işini gerçekleştirir.

```text
Kullanıcı → Agent → Internet for Agents → Sağlayıcılar
                      │
               Katalog + Dizin
               Keşif + Broker
               Policy + Invocation
```

## Mimari kararlar

- Agent ve uygulama alanından bağımsız SOA çekirdeği.
- Node.js 24 LTS, Express 5 ve TypeScript; modüler tek dağıtım, PostgreSQL.
- Sağlayıcıların kontrat adreslerini kaydettirdiği kontrollü dizin.
- Operatör yönetiminde sürümlü yetenek kataloğu; JSON Schema 2020-12.
- HTTP/JSON adapter'ı; açıklanabilir filtreleme ve alternatifler.
- İlk MVP'de bilgi/simüle teklif sorguları; gerçek yan etkili işlemler kapalı.
- Planlama agent'ta; çekirdekte tek çağrı yürütme, otomatik retry/failover yok.

## İlk deney

Sentetik teslimat teklifi sağlayan A ve B keşfedilir. Sonradan eklenen C, agent ve core kodu değişmeden bulunup çağrılır. Operasyonel kayıt ve ağ izni değişiklikleri deneyde açıkça gösterilir. Bu demo bir kargo ürünü değil, sağlayıcı bağımsızlığını kanıtlayan araçtır.

## Mevcut durum

Mimari doküman seti ve uygulama görevleri hazırlanmıştır. Yeni çekirdek **henüz uygulanmamıştır**. Depodaki kod önceki seyahat prototipidir; mevcut package.json yeni teknoloji seçimini henüz yansıtmaz. Tasarım hedefleri ölçülmüş sonuçlar değildir.

**Kod aşamasına geçiş ayrı kullanıcı talimatı bekler.** Bu çalışma uygulama kodunu değiştirmez. GitHub issue/PR oluşturulmuş veya değişiklikler yayımlanmış değildir.

## Belgeler

- [Tüm dokümanlar ve okuma sırası](docs/README.md)
- [Vizyon ve kapsam](docs/architecture/vision-and-scope.md)
- [Sistem mimarisi](docs/architecture/overview.md)
- [Mimari karar kayıtları](docs/decisions/README.md)
- [Uygulama görev planı](docs/planning/backlog.md)
- [Kabul kriterleri ve hazırlık kapısı](docs/architecture/acceptance.md)
- [Teknik kaynaklar](docs/architecture/references.md)

MCP, A2A, WebMCP, açık web keşfi ve otomatik kontrat çıkarma gelecekteki araştırma yollarıdır; mevcut destek olarak sunulmaz.
