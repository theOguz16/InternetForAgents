# Yol haritası

Takvim süresi tahmin edilmedi; aşamalar çıkış kriterleriyle yönetilir. Şimdilik yalnız dokümantasyon yapılır. Kod aşaması ayrı kullanıcı talimatı bekler.

| Aşama | Amaç / çıktı | Çıkış kapısı |
| --- | --- | --- |
| M0 — Mimari | Bu dokümanlar, ADR, payload profile ve akışlar | Kavramsal çelişki yok; kullanıcı kodu başlatır |
| M1 — A2A uyum spike | Resmi JS SDK exact sürümü, tek minimal uzman/istemci; local fixture | NA-01; persistent task ve SSE streaming ve yeniden bağlanma davranışı kanıtlı |
| M2 — Bağımsız servis temeli | TS workspace, Express katmanları, ayrı SQLite ve Compose hedefleri | Servisler ayrı başlatılır; shared DB/import ihlali yok |
| M3 — İlk uzman ve Registry | Profile validation, review engine, kart kayıt/arama/health | Kayıt üzerinden uzman bulunur, NA-04/06/11 |
| M4 — Personal Agent | Job, keşif, seçim, A2A task tracking, dedup recovery | Tek job uçtan uca; NA-08/09/10/13 |
| M5 — İş birliği | Test Agent, iki paralel child, aggregate ve alternatif review B | NA-02/03/05/07 |
| M6 — Demo UI | Kayıt, görev oluşturma, keşif trace'i ve sonuç ekranları | Kod veya secret sızmadan tüm demo görünür |
| M7 — Kabul ve işletim | Negatif testler, ölçüm, retention ve deney raporu | NA-01–22 kanıtları; eksikler açık |
| Sonraki — Opsiyonel | LLM motoru, Python sağlayıcı, sıralı review→test, Docs Agent | Yeni ADR ve veri paylaşımı değerlendirmesi |

M1 başarısızsa protokolü kendi başımıza yeniden yazmayız. SDK sürüm/serializer/persistent store farkı belgelenir; v1.0 tasarımını karşılayan çözüm veya açık revizyon seçilir. Mevcut mimariyi doğrulamadan geniş iskelet geliştirilmez.

## PR yaklaşımı

Önce yalnız dokümantasyon PR'ı; ardından aşama başına küçük PR'lar. Bu dokümantasyon çalışmasında PR/issue/push otomatik yapılmaz. İleride yayın istenirse oguzhan dalı kullanılır. Her PR ilgili ADR, NA kriteri, doğrulama ve geri alma notu içerir.
