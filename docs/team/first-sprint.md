# İlk sprint için ürün lideri planı

Bu bir öneridir; kişilere atama yapılmadı. Tüm 67 issue’yu aynı anda başlatmayın. Aynı dosyalardaki değişiklikleri koordine edin.

## Önce review

Altyapı PR’ını develop’a review edin. Manifest/Registry kapsamını test raporuyla karşılaştırın. Merge edilmeden ana geliştirme tabanının bu özellikleri içerdiğini varsaymayın.

## İlk hazırlanabilir işler

- [B04 — validator sınırları](https://github.com/furkankorkmaz35/InternetForAgents/issues/2): mevcut kod üzerinden coverage ve makine schema’larını tamamla.
- [D01 — katmanlar](https://github.com/furkankorkmaz35/InternetForAgents/issues/6): API davranışını koruyarak kullanım durumlarını ayır.
- [E01 — kullanıcı/roller](https://github.com/furkankorkmaz35/InternetForAgents/issues/12): auth ve sahiplik tabanı.
- [E03 — ağ sınırı](https://github.com/furkankorkmaz35/InternetForAgents/issues/29): saldırı matrisi ve network policy.
- [G02 — frontend modülleri](https://github.com/furkankorkmaz35/InternetForAgents/issues/44): mevcut ekran davranışını koruyarak refactor.

Model/agent geliştiricileri bu sırada F01 profilini okuyup örnek task setini hazırlayabilir; bağımsız agent implementation için B05/B06 ve F01-IMPL kapıları beklenir. Şablonun hazır olmadığı açıkça söylenmelidir.

## Senin haftalık ritmin

1. Ready işlerden kapasiteye göre kişi seç ve issue assign et.
2. Her issue için scope/kabul sorularını netleştir; mimari değişikliği ADR’a bağla.
3. Geliştirici kısa draft PR açınca yönü erkenden kontrol et.
4. Review’da kabul maddesine bağlı test/ekran/çıktı iste; yalnız kod stiline odaklanma.
5. Merge sonrasında bağımlı task’ı ready yap; review kanıtı olmadan issue’yu kapatma.

Branch protection, required review ve gerçek CODEOWNERS kullanıcıları henüz ayarlanmadı. Bunlar I02’de repo yetkileriyle ele alınacak. Bu nedenle çalışma anlaşması teknik olarak zorlanan bir politika gibi sunulmamalı.
