# ADR-025 — Geliştirici tarafından genişletilen agent platformu / S1.0

Tarih: 15 Ekim 2026. Durum: kabul edilmiş tasarım. Uygulama durumu: geçiş bekliyor. Yetki: kullanıcı Aşama 1 belgelerini sabitleme ve oguzhan dalına push talimatı verdi. Yeni runtime özelliği bu ADR ile tamamlanmış sayılmaz.

## Bağlam

Metin demosu A2A/SSE, kalıcılık ve temel akışı kanıtladı. Fakat sabit beceri listesi ve merkezi handler’lar bağımsız agent geliştiricisini hedefleyen ürünü temsil etmiyor. İlk eğitim demosu basit Python fonksiyonu üretme/review/test olacak; agent’ları ekip üyeleri bağımsız geliştirecek.

## Kararlar ve alternatifler

| Alt karar | Seçim | Reddedilen/ertelenen alternatif ve sonuç |
| --- | --- | --- |
| D01 Ürün sınırı | Teslim A kontrollü ekip platformu | Açık interneti aynı teslimde hedeflemek izolasyon/işletim yükünü gizler |
| D02 Keşif | Generic manifest + normal Agent Card | Her beceriyi çekirdekte sabitlemek geliştirici bağımsızlığını bozar |
| D03 Kontrat | ifa-manifest/call/result.v1, sınırlı draft-07 | Tam JSON Schema ve arbitrary refs güvenlik/UI kapsamını gereksiz büyütür |
| D04 Katmanlar | SOA + servis içinde ports/adapters | Her modülü ayrı mikroservise bölmek bu ekipte operasyon yükü yaratır |
| D05 Workflow | Deklaratif DAG + doğrulanmış alan eşlemeleri | Genel LLM planner Teslim B; bilinmeyen semantiği anlama iddiası yok |
| D06 Veri/context | Servis SQLite’ı, scoped artifact/context, TTL | Shared DB ve tüm konuşmayı her agent’a gönderme reddedilir |
| D07 İletişim | A2A JSONRPC + SSE; sınırlı reconnect | Polling reddi ADR-023’ten korunur; WebSocket ihtiyacı henüz yok |
| D08 Kimlik | User/developer/operator, service identity ayrı | Anonim local demo paylaşılan ortam yetkilendirmesi sayılamaz |
| D09 Runner | Ayrı ve sınırlandırılmış Python execution | API process’inde eval/exec ve genel kod hosting’i reddedilir |
| D10 Frontend | React feature modülleri, same-origin BFF | UI’ya iş seçimi/yetki koymak reddedilir |
| D11 Ölçüm | Platform ve model KPI’ları ayrı, eşit bütçeli baseline | Fixture başarısını model kalitesi veya çoklu-agent üstünlüğü saymak reddedilir |
| D12 Teslim | Kabul kapıları ve sürümlü benchmark | 'Çalışan demo = ürün tamamlandı' yaklaşımı reddedilir |

## Önceki kararlarla ilişki

ADR-013 agent ağı, ADR-014 A2A 1.0, ADR-016 TS/SQLite, ADR-023 SSE ana kararları korunur. ADR-015’in uygulamaya sabit beceri listesi S1.0 generic manifestle değiştirilir. ADR-017’nin discovery ilkeleri güncellik policy’siyle genişler. ADR-018 basit selector, policy-aware açıklanabilir selector yönünde geliştirilir. ADR-019 polling’i zaten ADR-023 ile geçersizdir; kalıcı görev/dedup amacı devam eder. ADR-020 güven sınırları S1.0 threat/runner politikasıyla genişler. ADR-021 ve ADR-024 demo kapsamları yerini bağımsız code/review/test demosuna bırakır; metin örnekleri regresyon için korunur. ADR-022 aşamalı teslim, AC01–AC12 kapılarıyla somutlaştırılır.

## Sonuç ve migration

Registry/Profile Validator/UI formu genericleşecek; mevcut metin envelope’ları hemen kırılmayacak. Sürüm geçişi adaptör ve migration ile yapılacak. Ekip agent’ları farklı projelerden bağlanmalı. JSON Schema şekil kontrolü semantik doğruluk garantisi değildir. B02 tanımı standardın kendisi değil proje uzantısıdır.

Model seçimi/quantization qualification işi B08/EVAL-M1’dir. Runner güvenlik kanıtı E08’de, çoklu worker I06’da tamamlanır. Bu açık işler tasarım kararsızlığı değildir; uygulama/deney kapılarıdır. Kabul kanıtı [teslim planında](../stage-1/09-delivery.md), teknik tanımlar [S1.0 dizininde](../stage-1/README.md).
