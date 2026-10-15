# Mevcut durum ve geçiş envanteri

Uygulama referansı: `cbc8d07`, dal `oguzhan`. 15 Ekim Docker/tarayıcı raporu bu doküman revizyonuyla sürümlenir. Hiçbir hedef özellik mevcut koda uygulanmış varsayılmaz.

| Bileşen | Kanıt/mevcut | Kalan |
| --- | --- | --- |
| Registry | `services/registry/`, SQLite, kart doğrulama, origin listesi | Genel manifest, sahiplik, revision, pagination, tam SSRF politikası |
| Orchestrator | `services/personal/`, üç sabit metin profili, paralel çağrı | Genel dispatch, DAG, yetki, kalıcı dispatch/dedup, reconnect |
| Uzmanlar | Dil/kelime deterministik, özet fixture | Ekip tarafından bağımsız code/review/test agent’ları |
| Task store | SQLite, tamamlanmış sonucu koruma, restart işaretleme | Mesaj dedup, kota/retention, güvenli resume ve migration |
| UI | React görev/dizin, SSE, kaynak/fixture etiketi | Genel formlar, oturum, owner ekranı, geçmiş, erişilebilirlik |
| Runner | Yok | Tasarım uygulaması ve izolasyon kanıtı |
| Context | Girdi/sonuç ve task ilişkileri | Adım kapsamı, kaynak izi, artifact izinleri ve silme |
| Doğrulama | Altı regresyon testi; Docker/tarayıcı smoke | Geniş negatif/arıza testi, benchmark, bağımsız onboarding |

## Belge önceliği

1. `docs/stage-1/` S1.0 hedef tasarımının tek kaynağıdır.
2. `docs/development/` mevcut kodun çalıştırma/kısıt belgeleridir.
3. `docs/architecture/` altındaki önceki tasarımlar başlıklarında referans olarak işaretlenir. S1.0 ile çelişen kısımları uygulanmaz.
4. ADR-013–024 tarihsel karar zinciridir; ADR-025 değişen kısımları açıkça listeler.
5. `docs/archive/2026-10-15-pre-stage1/` revizyon öncesi belgelerin değişmeden kopyasıdır.

## Çelişki çözümleri

- Metin agent’ları altyapı fixture/regresyon örnekleri olarak kalır; ana ürün sabit üç beceriden ibaret değildir.
- Kod demosu tekrar kapsamda; agent iş mantığını ekip üyeleri geliştirir. Platform ekibi tüm agent’lara özel entegrasyon yazmaz.
- Eski 'kod asla çalıştırılmaz' kararı yalnız mevcut uygulama için doğrudur; Teslim A’da ayrı runner kapısıyla değişir.
- Eski polling ifadeleri geçersizdir; ADR-023 korunur. Şablonlardaki polling referansı kaldırılır.
- Eski JSON Schema 2020-12 taslağı yerine bu sürümün sınırlı draft-07 profili seçilir; mevcut Ajv tabanıyla uyumludur.
- Belgelerdeki eski payload limitleri gelecekteki tüm servislere otomatik uygulanmaz; S1.0 güvenlik ve profil tabloları hedef limitleri belirler.

## Geçiş sırası

Genel tanım/validator → sahiplik/genel kayıt → şablon → doğrudan çağrı → DAG/context → runner → ekip agent’ları → UI → değerlendirme. Mevcut metin profilleri migration sırasında eski kimlikleriyle çalışmaya devam eder; alias eşlemesi ayrıca sürümlenir. DB kopyası alınmadan migration uygulanmaz. Eski seyahat prototipi ayrı legacy alana taşınana kadar kökteki `npm start` komutu yeni platform değildir.

Bu doküman turu uygulama, DB veya çalışan Docker servislerinin davranışını değiştirmez.
