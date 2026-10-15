# PR review ve merge düzeni

## Günlük akış

1. Geliştirici güncel `oguzhan` dalından bir iş dalı açar, Issue kapsamını uygular.
2. PR base `oguzhan` olur. PR şablonundaki altı bilgi bölümü doldurulur; ilk bölümde `#5` gibi gerçek Issue referansı bulunur. Kısmi işte `Refs #5`, tam işte `Closes #5` kullanılabilir. Varsayılan dal `main` olduğu için Issue'nun kapanmasını ayrıca kontrol edin.
3. Checks bölümünde `quality`, `pr-readiness` ve mevcut `SonarCloud Code Analysis` sonucu incelenir. Başarısız kontrolün Details bağlantısından sebep okunur; geliştirici düzeltir.
4. Oguzhan önce Issue kabul maddelerini, sonra PR kanıtını, sonra Files changed bölümünü inceler. Güvenlik, veri ve kontrat değişiklikleri ayrıca teknik inceleme ister.
5. Bloklayıcı hata için Request changes; eksiksiz teslim için Approve. Son push'tan sonra kontroller ve onay yeniden değerlendirilir. Merge otomatik değildir.

## Hangi kontrol gerçekten mevcut?

| Kontrol | Durum ve sınır |
| --- | --- |
| `quality` | Node 24, scripts kapalı npm kurulumu, backend/frontend build, servis testleri, manifest örneği |
| `pr-readiness` | Dolu bölüm ve mevcut Issue referansı; yazılan kanıtın doğruluğunu anlayamaz |
| SonarCloud | Repodaki mevcut entegrasyon; sonuç Checks'ten izlenir |
| CODEOWNERS | `@theOguz16`; hedef dalda merge edildikten sonra ekip PR'larında otomatik review isteği |
| Zorunlu onay/merge engeli | Admin erişimi gerektiği için henüz etkinleştirilmedi |
| Her PR için AI review | Henüz kurulmadı; bu sohbet üzerinden talep üzerine inceleme yapılabilir |
| Lint, mimari import kuralları, kapsamlı kontrat/e2e testi | İlgili backlog işleri; mevcut kontroller bunların yerine geçmez |

Draft PR kontrol çalıştırabilir; draft olması kabul edildiği anlamına gelmez. İlk sürümde PR boyutu için mekanik bir satır sınırı yok; büyük PR gerekçesi ve review sırası yazılmalı.

## Oguzhan'ın kısa kontrol listesi

- Issue'daki her kabul maddesinin kanıtı var mı?
- Başarı kadar hata, izin ve limit durumları ele alınmış mı?
- Yeni agent eklemek için çekirdeğe özel koşul eklenmiş mi?
- Kontrat/DB değişikliği önceki sürümle uyumlu mu?
- CI'ın geçmesi dışında davranışı gösteren örnek/test var mı?
- Açık bloklayıcı bulgu, çözülmemiş konuşma veya kapsam dışı değişiklik var mı?

Bulguyu `önem + dosya/satır + hangi durumda bozulur + beklenen düzeltme` biçiminde yaz. P1 güvenlik/veri kaybı/kritik işlev; P2 normal kullanımda hata veya kaynak sınırı ihlali; P3 bakım önerisi. Onay, testlerin ispatlamadığı davranışları da değerlendirmelidir.

## Repo sahibinin yapacağı tek seferlik kurulum

15 Ekim 2026 itibarıyla `theOguz16` hesabında write=true, admin=false. Bu yüzden korumalar araçla etkinleştirilmedi. Repo sahibi GitHub Settings → Rules → Rulesets (veya Branches) üzerinden `oguzhan` ve `main` için:

- Pull request zorunlu; en az 1 onay.
- Code owner review zorunlu.
- Yeni commit gelince eski onayları düşür.
- Konuşmaların çözülmesini zorunlu tut.
- Başarılı `quality`, `pr-readiness`, `SonarCloud Code Analysis` kontrollerini zorunlu seç. İsimleri ilk çalışmadan sonra seç; görünmeyen check adını tahmin ederek ekleme.
- Force push ve dal silmeyi engelle; rutin geliştirme için bypass tanımlama.

Önce bu PR ve CODEOWNERS hedef dala alınmalı, kontrollerin çalıştığı görülmeli; ardından kurallar etkinleştirilmeli. `main` için dosyaların da release PR'ıyla aktarılması gerekir. Kaynak dalda bulunması hedef dalın korunduğu anlamına gelmez.

**Kendi PR'ın:** GitHub PR yazarının kendi PR'ını onaylamasına izin vermez. #69 `theOguz16` tarafından açılmıştır; başka bir write yetkili ekip üyesi incelemelidir. Tek zorunlu code owner Oguzhan olduğunda onun sonraki PR'ları için de uygun ikinci code owner/ekip politikası repo sahibiyle önceden kararlaştırılmalıdır. İkinci owner eklenirse sahiplerden herhangi birinin onayı yeterli olur; artık her PR'da özellikle Oguzhan onayı zorunlu sayılmaz. Otomasyon bu kararı gizlice değiştirmez.

## AI review nasıl kullanılacak?

Şimdilik PR bağlantısıyla şu isteği ver: “Issue kabul kriterlerine ve S1.0 mimarisine göre bu PR'ı incele; kanıtlı bulguları dosya/satır ve önemle sırala; çalıştırılmayan kontrolleri belirt.” Her PR açılışında otomatik LLM çalıştıran servis/secret eklenmedi. Böyle bir entegrasyon için sağlayıcı, repo erişimi ve maliyet ayrı karardır. SonarCloud bir LLM review sistemi olarak sunulmamalıdır.

## Kaynaklar

- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews
