# Uçtan uca süreçler

## P1 — Agent yayımlama ve kayıt

Geliştirici uzman uygulamasını başlatır → Agent Card yayımlar → Registry'ye cardUrl/profil eşleştirmesi gönderir → kart edinilir ve doğrulanır → snapshot aktifleşir → readiness gözlemi alınır → agent keşfedilebilir olur.

```mermaid
sequenceDiagram
 participant D as Geliştirici
 participant R as Registry
 participant E as Uzman agent
 D->>E: Uygulamayı çalıştır
 D->>R: Agent kaydı ve kart URL
 R-->>D: Pending kayıt
 R->>E: Agent Card GET
 E-->>R: Card JSON
 R->>R: Şema, interface, profil doğrulama
 R->>E: Kayıt sırasında tek sağlık kontrolü
 R->>R: Active kayıt ve sağlık gözlemi
```

Registry doğrulama işi SQLite pending kaydından süreç içi worker ile alınır. En fazla 3 edinim denemesi; yanlış şema kalıcı reddir. Restart pending işi devam ettirir. Çalışır uygulama kodu yoktur; diyagram hedef akıştır.

## P2 — Kullanıcı görevi

```mermaid
sequenceDiagram
 participant U as UI
 participant P as Personal Agent
 participant R as Registry
 participant C as Review Agent
 participant T as Test Agent
 U->>P: POST job review-and-tests + code
 P->>P: Job ve iki child kaydı
 P-->>U: 202 jobId
 P->>R: Her profil için adayları bul
 R-->>P: Kart snapshot, revision ve sağlık
 P->>P: Uygun adayları seç
 par İnceleme
 P->>C: A2A SendStreamingMessage
 C-->>P: Task id
 loop Terminal duruma kadar
 C-->>P: SSE status / artifact olayları
 end
 and Test önerisi
 P->>T: A2A SendStreamingMessage
 T-->>P: Task id
 loop Terminal duruma kadar
 T-->>P: SSE status / artifact olayları
 end
 end
 P->>P: Artifact profil kontrolü ve aggregate
 U->>P: GET job events - SSE aboneliği
 P-->>U: Snapshot ve canlı sonuç olayları
```

Kullanıcının browser bağlantısı iş yürütmesini sahiplenmez. UI kapanınca job yürümeye devam eder. Orchestrator Personal Agent içindedir; ayrı SOA servisi değildir. Review sonucu ilk MVP'de Test Agent'a girdi yapılmaz; her iki child aynı orijinal kodu alır. Sıralı review→test pipeline sonraki aşamadır.

## P3 — Yeni sağlayıcı

Review A aktifken aynı profile uyan B kaydedilir. Yeni discovery sonucu A/B içerir; kullanıcı alternatifleri görür. A durdurulup unhealthy gözlemlenince yeni job B'yi seçer. Personal Agent kaynak dosyası değiştirilmez. Yeni test becerisi eklemek ile mevcut review sağlayıcısını değiştirmek ayrı demo adımlarıdır.

## P4 — Hata ve takip

SendStreamingMessage ilk task olayı alınmadan timeout → dispatch sonucu belirsiz → aynı child/requestId/messageId ile yalnız profil dedup garantili uzmanlarda kontrollü uzlaştırma. Task id alındıysa yeni görev gönderilmez; SubscribeToTask ile SSE yeniden açılır. Terminal görev aboneliği reddedilirse tek GetTask ile sonuç uzlaştırılır. Alternatif uzmana otomatik geçiş ancak gönderimin kesin başlamadığı pre-dispatch hatada bir kez mümkündür. Belirsiz durumda UI sonucu açıkça gösterir.

## P5 — Geliştirme pipeline'ı

Protokol uyum spike → workspace iskeleti → ilk uzman → Registry → Personal Agent → ikinci uzman ve aggregator → UI → failure demo → kabul raporu. Her aşama bir öncekinin somut çıktısını kullanır; ayrıntı [roadmap](../planning/roadmap.md).
