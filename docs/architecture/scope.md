# Amaç ve sistem sınırları

## Amaç

Geliştiricilerin bağımsız uzman agent'larını kaydettiği ve istemci agent'ların bunları becerilerine göre bulup ortak protokolle kullandığı küçük bir ağ kurmak. Ders projesinin kanıtı SOA sınırları, dinamik keşif, görev delegasyonu ve kısmi hata davranışıdır.

## Roller

- Geliştirici: agent servisini işletir; kart ve desteklenen beceri profilini yayımlar.
- Operatör: kayıt sahiplerini ve izinli ağ hedeflerini yönetir.
- Kullanıcı: kod gönderip inceleme/test önerisi ister.
- Personal Agent: hedef seçimi, keşif, seçim, görev takibi ve sonuç birleştirme.
- Registry: agent kayıtlarının ve doğrulanmış kart görünümünün sahibi; görev trafiğinin dışında.

## Zorunlu MVP

Registry; Personal Agent; Code Review ve Test Generation agent'ları; demo UI. İnceleme için ikinci sağlayıcı aynı servis imajının ayrı config/instance'ı olabilir. Tüm backend'ler TypeScript; tek repo, bağımsız süreçler. İlk uzmanlar deterministik kural/şablon motoru kullanır ve bu durum sonuçlarda belirtilir. Bu, LLM muhakeme başarısı deneyi değildir.

Kullanıcı işlemleri: inceleme, test önerisi, ikisi birlikte. Kod paste edilir; Python dili, tek metin en fazla 32 KiB. Test önerisi, üretilen testleri çalıştırmak anlamına gelmez. Çıktı bulgular ve önerilerdir; otomatik commit/push yoktur.

## Kapsam dışı

Kod çalıştırma, kullanıcı reposunu klonlama, dosya yükleme/URI indirme, rastgele internet tarama, ödeme/mail/randevu, agent marketplace, NANDA bağlantısı, federasyon, çok kiracılı SaaS, çok instance servis, webhook/gRPC, kendini değiştiren agent, otonom uzmanlar arası sonsuz delegasyon. Docs Agent sonraki aşama.

## Araştırma sınırı

Yeni sağlayıcı mevcut profili uyguluyorsa yeni istemci entegrasyonu gerekmez. Yeni profil için istemci UI/planlayıcı değişebilir; bu ayrı bir değişikliktir. Agent Card skill açıklaması tek başına ortak veri anlamı sağlamaz. Demo profile'larımız bunu tanımlar. Farklı teknolojilerle çalışma mimari olarak mümkün; Python agent eklenmeden dil bağımsızlığı deneysel olarak kanıtlanmış sayılmaz.

## Başarı ölçütü

A'dan B'ye sağlayıcı değişimi yalnızca kayıt/config ile olur; istemci kaynak diff'i sıfırdır. Registry üzerinden agent listesi güncellenir. Doğrudan A2A trafik kaydı gösterilir. Bir alt görev başarısızken diğer sonuç korunur. Sağlayıcı kapatılınca yeni keşif uygun adayı bulur veya açık yokluk hatası verir.
