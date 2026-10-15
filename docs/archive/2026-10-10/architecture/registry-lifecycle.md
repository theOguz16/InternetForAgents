# Sağlayıcı kaydının yaşam döngüsü

Durum: MVP kararı. ADR-002 ve ADR-009.

## Sahiplik ve durumlar

Provider operatör tarafından oluşturulur ve owner principal'a bağlanır. Sahibi kendi servisini kaydeder/günceller; Registry durumun sahibidir. Kimlik kayıt yetkisidir, hizmet kalitesinin kanıtı değildir.

| Durum | Anlam | Keşif |
| --- | --- | --- |
| pending | Kontrat doğrulama bekliyor | Hayır |
| active | Destekli kontrat, süresi geçerli, yönetim engeli yok | Evet |
| rejected | Aday sürüm geçersiz veya desteklenmiyor | Hayır |
| suspended | Güncellik, operatör veya sahip engeli | Hayır |
| removed | Keşiften çekildi, tombstone korunur | Hayır |

Aday sürümün doğrulama durumu ile servisin yönetim durumu ayrı alanlardır. Geçersiz aday sürüm geçerli aktif sürümü kendiliğinden reddedilmiş yapmaz. suspended reason `expired`, `owner`, `operator` olarak tutulur. Başarılı refresh sadece expired askısını kaldırabilir; owner/operator askısı yetkili resume ister. removed terminaldir; yeniden katılım yeni service kimliğiyle olur.

## Kayıt ve kontrol

1. Provider ownership doğrulanır, pending kayıt kalıcılaştırılır.
2. Aynı süreç görev döngüsü allowlist ve ağ politikasına göre kontratı edinir.
3. Format, kimlik, katalog sürümü, effect=read, auth ve binding doğrulanır.
4. Değişmez içerik/hash ile kontrat sürümü yazılır; aktif pointer transaction içinde değiştirilir.
5. Başarısız aday reason ile rejected olur. Ağ hatası aday için belirgin hata ve yeniden doğrulama ihtiyacını gösterir; sınırsız loop yoktur.

Pending işler en fazla 3 kontrollü edinim denemesiyle, 5 saniyelik bütçe/deneme ve 10 saniye aralıkla işlenir. Kontrat indirmek yan etkili servis çağrısını denemek değildir. Hatalı şema tekrar indirilerek düzeltilmiş varsayılmaz; yeni aday kaydı gerekir.

## Güncelleme

Aynı version ve aynı digest tekrarında kayıt yeniden kullanılabilir. Aynı version farklı içerik 409 veya refresh sırasında CONTRACT_MUTATED hatası verir; mevcut aktif tanım çağrıdan çıkarılır ve operator incelemesine alınır. Yeni version doğrulanır; başarıyla atomik aktive edilir. Yeni aday başarısızsa eski sürüm yalnızca geçerliyse ve geri çekilmemişse sunulmaya devam eder.

## Güncellik

Kontrat her 5 dakikada jitter ile yenilenir; son başarılı doğrulamadan 15 dakika sonra geçerliliği biter. Geçici ağ hatası kalan süreyi uzatmaz veya sıfırlamaz. Süre bitince expired askısı uygulanır; discovery ve invocation sorguları job gecikse bile validUntil kontrol eder. Yeni sürüm edinilirse güncelleme kuralları uygulanır.

Kontrat URL'si endpoint sağlığı anlamına gelmez. Tek çağrı hatası kaydı otomatik kaldırmaz. Operatör ölçümleri inceleyip askıya alabilir.

## Kaldırma ve yarışlar

Kaldırılan veya askıdaki kayıt çağrı öncesi kontrolü geçemez. Çağrı running olduktan sonra kaldırma dış dünyadaki isteği geri alamaz; iptal garantisi verilmez. Geçmiş sürüm ve çağrı referansları retention boyunca korunur. Kontrat sürümü seçimden sonra değişmişse yeni çağrı 409 döner.

## Dizin kesintisi

Registry veri deposu erişilemezse 503. Eski cached kaydı sessizce kullanma yoktur. Boş arama sonucu 200 boş liste olarak ayrı kalır.
