# AI destekli teslim değerlendirmesi

Task tamamlandığında aşağıdaki promptu kullandığın kod asistanına ver. Çıktıyı PR açıklamasındaki **AI destekli teslim raporu** bölümüne ekle. Issue'ya promptu kopyalama; bu dosyaya bağlantı ver.

Rapor geliştiricinin AI destekli öz değerlendirmesidir; bağımsız review, otomatik onay veya test kanıtı değildir. Kod değişince yeniden değerlendir. Rapor yalnız PR açıklamasında güncellenebilir: SHA'yı rapor için yeni bir kod commit'i oluşturarak sonsuz güncelleme döngüsüne sokma.

```text
Bu task için yaptığım değişiklikleri değerlendir ve reviewer'a kısa bir teslim
raporu hazırla. Kod değiştirme. Testleri ancak bu görev için çalıştırmaya yetkin
varsa çalıştır; aksi halde mevcut kanıtları belirt ve çalıştırmadığını açıkça yaz.

Task / Issue: [bağlantıyı veya tam metni ekle]
Hedef branch: develop (release PR'ında main)

Issue kabul kriterlerini, ilgili mimari belgeleri ve hedef branch ile ortak
atadan itibaren tüm task diff'ini incele; yalnız son commit'e bakma.
Kullandığın hedef ref/SHA ve PR head SHA'sını kaydet. Commit edilmemiş
veya PR'a pushlanmamış değişiklikleri rapor kapsamından ayrı belirt.

İstenen ile yapılanı karşılaştır. Hata durumları, güvenlik, veri/kontrat uyumu,
eksik testler ve kapsam dışı değişiklikleri değerlendir. Dosya veya Issue'ya
ulaşamıyorsan tahmin etme; doğrulanamadı yaz. Gerçekte çalıştırılmayan komutu
geçti diye yazma. Test başarısını bütün kabul kriterlerinin ispatı sayma.

En fazla 400 kelime, şu biçim:

İncelenen commit: [PR head tam 40 karakter SHA]
Hedef branch: [develop veya main; karşılaştırılan hedef SHA'yı da belirt]

### Kapsam
Issue numarası, istenen ve yapılan: en fazla 3 cümle.
### Kabul kriterleri ve kanıtları
Her kriter için Karşılandı / Kısmi / Karşılanmadı / Doğrulanamadı;
dosya:satır, test adı veya gerçek komut sonucu. Kriterleri numaralarıyla
gruplayabilirsin; hiçbirini atlama.
### Doğrulama ve çalıştırılmayan kontroller
Komutlar/sonuçlar; yapılmayan veya ortam nedeniyle yapılamayan kontroller.
### Açıklar ve riskler
Önem sırasıyla dosya:satır, hata koşulu ve etkisi. Bulgu yoksa
“Bu incelemede bulgu tespit edilmedi” yaz; hatasızlık garantisi verme.
### Reviewer’ın bakacağı yerler
En fazla 3 kritik dosya/karar ve nedeni.
### Sonuç
İnsan review’ına hazır / Düzeltme gerekli / Kanıt eksik; tek cümle gerekçe.
Merge onayı verme.
```

CI rapor bölümünü ve head SHA eşleşmesini kontrol eder. Raporu gerçekten AI'ın yazdığını, tüm diff'in incelendiğini veya kanıtların doğru olduğunu otomatik ispatlamaz. Bunlar insan review'ının sorumluluğudur.
