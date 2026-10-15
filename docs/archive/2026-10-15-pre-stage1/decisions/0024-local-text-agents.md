# ADR-024 — Yerel geliştirme ve dar kapsamlı metin agent’ları

Tarih: 2026-10-13. Durum: Kabul edildi.

## Karar
Kod inceleme/test üretimi demosunun yerine dil tespiti, anahtar kelime çıkarma ve kısa özetleme kullanılır. ADR-021’in demo kapsamının yerini alır. SOA servis sınırları, A2A 1.0/JSON-RPC + SSE ve polling kullanmama kararları geçerlidir.

Her uzman bağımsız servis ve Agent Card sunar. Registry yalnızca kayıt/keşif yapar. Personal Agent bilinen beceri profillerine göre uzman seçer ve doğrudan iletişim kurar. Sabit sağlayıcı adresleri iş mantığına yazılmaz.

Dil ve anahtar kelime görevleri başlangıçta deterministik algoritmalarla yapılabilir. Bu servislerin her biri bağımsız LLM gerektirmez. Özetleme başlangıçta açıkça etiketlenmiş fixture modunda geliştirilir; gerçek özetleme ayrı teslim kriteridir. Fixture sonucu yetenek veya model başarısı kanıtı sayılmaz.

## Kaynak kullanımı
Docker ortam ve bağımlılık tutarlılığı sağlar; model belleğini küçültmez. Geliştirici yalnızca kendi servisini açar. Tüm servisler entegrasyon profilindedir. Başlangıç limitleri servis başına 256 MiB ve 0.5 CPU’dur; gerçek ihtiyaç ölçülerek değiştirilir. Limit yetersizse süreç sonlanabilir; bunlar ölçülmüş kapasite garantisi değildir.

Model zorunlu Compose bağımlılığı değildir. Sonraki entegrasyonda isteğe bağlı tek model sunucusuna bağlanılır, her container model yüklemez. Donanım bilgisi ve görev başarısı değerlendirilmeden model/parametre boyutu seçilmez. Geliştirmede model çağrıları fixture ile değiştirilebilir. Model kuyruğu başlangıçta bir eşzamanlı istekle sınırlandırılmalıdır.

## Beş kişilik sorumluluk önerisi
1. Registry: kayıt, kart doğrulama, keşif.
2. Personal Agent ve demo arayüzü: seçim, görev ve sonuç toplama.
3. Dil tespiti uzmanı.
4. Anahtar kelime uzmanı.
5. Özet uzmanı ve isteğe bağlı model bağlantısı.

Ortak kontrat değişiklikleri ekipçe gözden geçirilir. Bu liste gerçek kişi veya GitHub issue ataması değildir.

## Başarı ölçütü
Yeni bir uyumlu sağlayıcı kaydedildiğinde Personal kodunu değiştirmeden keşfedilir. Üç uzman aynı metin üzerinde çalışır; sonuçlar sağlayıcı, çalışma modu ve hata bilgisiyle birleştirilir. Bir uzman başarısız olduğunda diğer sonuçlar korunur. Model olmadan iletişim demosu yapılabilir; gerçek özet kalitesi ayrıca değerlendirilir.
