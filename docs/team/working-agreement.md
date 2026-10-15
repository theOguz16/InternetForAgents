# Ekip çalışma düzeni

## Roller

Oguzhan: ürün kapsamını ve önceliği belirler; task kabul kriterlerini netleştirir; PR’ı mimari, ürün davranışı ve kanıt açısından review eder; merge kararı verir. Geliştirici: issue kapsamını uygular, test/kanıt sağlar, kendi kodunu ilk kez inceler ve PR açar. İkinci reviewer: güvenlik/kontrat değişikliklerinde ek inceleme yapar. Oguzhan’ın doğrulanmış GitHub hesabı `theOguz16`; geliştirici atamaları henüz yapılmamıştır.

Issue işi tarif eder; PR kod değişikliğini inceler. Her issue bir kişi tarafından sahiplenilir. Büyük iş küçük PR’lara ayrılabilir; kısmi PR issue’yu otomatik kapatmaz. Bağımlı issue bitmeden sözleşme/arayüz taslağı üzerine ilerleniyorsa bu açıkça belirtilir.

## Dal ve PR düzeni

Entegrasyon dalı `develop`. Yeni iş: güncel develop’dan `feature/<task-id>-<short-name>`. PR base=`develop`. `main`e doğrudan merge edilmez. Mevcut develop→main PR’ı ayrı release incelemesidir. Draft PR erken geri bildirim içindir; tamamlandı anlamına gelmez.

1. Issue ve ilgili S1.0 bölümlerini oku.
2. Bağımlılıkları ve mevcut gerçek kodu kontrol et.
3. Küçük implementation planını issue’da paylaş; kapsam değişikliği için Oguzhan’ın kararını bekle.
4. Değişikliği ve kabul testlerini yaz; nedenini açıklayan kararında Türkçe yorum ekle.
5. Diff’i kendin oku, test çıktısı/screenshot/negatif senaryoyu PR’a ekle.
6. Review iste. Değişiklik taleplerini çöz; kendi PR’ını onaysız merge etme.

CODEOWNERS doğrulanmış `@theOguz16` hesabına yönlenir; hedef dala merge edildikten sonra review isteği üretir. GitHub required review/branch protection henüz etkin değil: mevcut hesap admin yetkisine sahip değil. Repo sahibinin uygulayacağı ayarlar ve kendi PR’ını onaylama sınırı [review süreci](review-process.md) içinde açıklanmıştır.

## Her işin Definition of Done’u

- Issue’daki her kabul maddesi kanıtlanmış.
- Public contract değiştiyse ADR/şema/örnek/migration güncel.
- Başarı, hata ve izin sınırları testli.
- Build ve mevcut testler korunmuş; desteklenmeyen özellik açık.
- Secrets, yerel DB, node_modules ve kişisel veriler commit’te yok.
- Türkçe yorumlar 'ne yaptığı' yerine karmaşık kararın nedenini açıklıyor.
- UI değiştiyse ekran görüntüsü; servis değiştiyse istek/yanıt örneği.
- Oguzhan review’ı ve gerektiğinde ikinci teknik review tamam.

## Review rehberi (ürün lideri için)

1. Bu değişiklik issue’daki sorunu çözüyor mu, scope dışına çıkmış mı?
2. Geliştirici kabul kriterini hangi test/ekran/çıktıyla gösteriyor?
3. Bir agent çalışmazsa, ağ koparsa veya kullanıcı yetkisizse ne oluyor?
4. Platform çekirdeğine yeni agent için özel bilgi mi eklenmiş?
5. Kullanıcıya gösterilen başarı gerçekten yürütülmüş işlemi mi anlatıyor?
6. Girdi/context kime gidiyor; secret veya gereksiz veri var mı?
7. DB/kontrat değişikliği eski demo ve kayıtlarla nasıl uyumlu?

Bloklayıcı: veri sızıntısı, duplicate yan etki, şema kırılması, bozuk migration, testsiz kritik yol. Öneri: adlandırma/ufak refactor. Review yorumunda hangisi olduğunu açıkça belirt. Merge sonrası issue kabul durumunu kontrol et; GitHub auto-close default branch davranışına güvenme.

## İlk CI kapısı

`.github/workflows/quality.yml` PR’larda Node 24 ile npm ci, build, servis testleri ve manifest örneğini çalıştırır. Güvenlik taraması, image testi, e2e UI ve required-review politikası I02/E09 kapsamına bırakılmıştır. Workflow dosyasının eklenmesi GitHub’da çalışmasının başarıyla tamamlandığı anlamına gelmez; PR checks sonucu ayrıca kontrol edilmelidir.

## Otomatik review hazırlığı

`pr-readiness` gerekli PR bölümlerini ve gerçek Issue referansını kontrol eder. Metnin doğruluğunu, kabul kriterlerinin tamamlandığını veya mimari uygunluğu kanıtlamaz. Güncel kontrol/kurulum tablosu: [review süreci](review-process.md). İlk uygulama: [PR #69 incelemesi](reviews/pr-69.md).

## Dal geçişi ve teslim raporu

Entegrasyon `develop`, hazır sürüm `main`; ayrı test dalı yok. `oguzhan` eski çalışma dalı olarak korunur. Testler PR’da ve develop push’unda çalışır; otomatik deployment yok. Her PR [ortak prompt](ai-delivery-review.md) ile hazırlanmış, güncel head SHA içeren öz değerlendirme raporu taşımalı.
