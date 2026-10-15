# Kaynaklar ve sürüm kontrolü

Kontrol tarihi: 2026-10-12. Yalnız birincil teknik kaynaklar kullanıldı. Latest sayfası hareketli olduğundan wire örnekleri sabit v1.0.0 spesifikasyonuna bağlandı.

| Kaynak | Tasarımdaki rol |
| --- | --- |
| [A2A v1.0.0](https://a2a-protocol.org/v1.0.0/specification/) | Agent Card, JSON-RPC ve task modelinin normatif kaynağı |
| [v1.0.0 a2a.proto](https://raw.githubusercontent.com/a2aproject/A2A/v1.0.0/specification/a2a.proto) | Alanlar, enum'lar ve request/response tipleri |
| [Resmi JS SDK](https://github.com/a2aproject/a2a-js) | SDK seçimi; README v1.0 desteği bildiriyor |
| [SDK package manifest](https://raw.githubusercontent.com/a2aproject/a2a-js/main/package.json) | Kontrolde main sürümü 1.3.0; npm kurulum kanıtı değil |
| [A2A Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/) | Merkezi dizin ve Card keşfi bağlamı |
| [YANG RFC 7950](https://www.rfc-editor.org/rfc/rfc7950.html) | YANG'ın ağ yönetimi modelleme dili olması |
| [JSON Schema 2020-12](https://json-schema.org/draft/2020-12) | Uygulama profile şemaları |
| [RFC 9457](https://www.rfc-editor.org/info/rfc9457/) | Kendi REST API hata biçimimiz |

JSON wire alanları SDK'nın iç TypeScript representation'ıyla birebir aynı varsayılmaz; serialization SDK'ya bırakılır. Kaynaklardaki tüm opsiyonel özellikleri desteklemek bu projenin kapsamı değildir. Proje profile'ları, quota/TTL ve retry kuralları bizim uygulama kararlarımızdır.
