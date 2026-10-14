# Hafif metin uzmanları

## Neyi değiştirdik?

Dil ve anahtar kelime handler’ları artık girdiye göre `mode: deterministic` sonucu üretir. Özet uzmanı `mode: fixture` kalır. Yeni bağımlılık, model indirme veya harici API çağrısı yoktur. Aynı A2A kontratları korunur; Personal kodu algoritmaları bilmez.

Agent Card adı, açıklaması ve etiketleri handler’ın modundan oluşturulur. Kart sürümü 0.2.0’dır; profil sürümü v1 değişmez çünkü girdi/çıktı biçimi değişmedi. Önceden kaydedilmiş kartları Registry’ye aynı cardUrl ile tekrar POST ederek snapshot’ı güncelleyin.

## Dil tespiti

1. Metin NFC Unicode biçimine getirilir; URL/e-posta çıkarılır ve kelimelere bölünür.
2. Türkçe ve İngilizce için küçük, elle hazırlanmış işaret kelime sözlükleri kullanılır.
3. Her dilde kaç **farklı** işaret kelime bulunduğu sayılır. Tek kelimenin tekrarı puanı artırmaz.
4. En az iki işaret, karşı dilin en az iki katı puan ve en az iki puan farkı gerekir.
5. Koşullar sağlanmazsa `und` döner. Bu sonuç hata değil, yeterli kanıt bulunamadığı anlamına gelir.

Tasarıma göre “Merhaba dünya” Türkçe işaretleri taşır. “Hello world” İngilizce işaretleri taşır. “Merhaba hello” gibi kısa/karışık bir ifade yeterli üstünlük sağlamaz. Bunlar açıklama örnekleridir; ölçülmüş kalite raporu değildir.

Bu, genel amaçlı bir dil tanıma modeli değildir. Desteklenmeyen diller, alıntılar, uzun karma metinler, Türkçe ekler ve sözlük dışında kalan ifadeler yanlış veya belirsiz sonuç doğurabilir. Karakterlerden tek başına dil kararı verilmez. Puanlar olasılık değildir; confidence yüzdesi yayımlanmaz.

## Anahtar kelime çıkarma

1. Aynı tokenizer ile kelimeler alınır.
2. Harfler küçültülür; Türkçe işaret taşıyan kelimelerde Türkçe büyük/küçük harf dönüşümü kullanılır. Yalnız ASCII harflerden oluşan metinlerde I/ı belirsizliği tam çözülmez.
3. Kesme işaretinden sonraki bölüm ayrılır (`Ankara’nın` → `ankara`).
4. İki dilden genel kelimeler ve 2–128 karakter sınırı dışındaki kelimeler elenir.
5. Tekrar sayısına göre sıralanır. Eşitlikte metindeki ilk görünüm kazanır. En fazla 10 farklı kelime döner.

Örnek mantık: “Robot robot ve sensör” ifadesinde `ve` elenir; robot daha sık geçtiği için önce gelir. Tüm kelimeler elenirse boş liste geçerli sonuçtur.

Kök bulma, eş anlamlı birleştirme, çok kelimeli ifade çıkarma ve anlamsal önem puanı yoktur. `agent` ve `agentlar` ayrı sayılır. İki dilin ortak stop-word filtresi bazen diğer dilde anlamlı bir kelimeyi de eleyebilir. Sıklık, önemle aynı şey değildir.

## Kodun sorumlulukları

- `services/shared/text.ts`: ortak metin temizleme, tokenizasyon ve stop-word listeleri.
- `services/language/detect.ts`: yalnız dil kararı.
- `services/keywords/extract.ts`: yalnız kelime sıralaması.
- Her `handler.ts`: algoritma sonucunu ortak profile dönüştürür.
- `services/shared/a2a.ts`: A2A taşıması, girdi/çıktı ve çalışma modu doğrulaması.

Bu ayrım sayesinde algoritmayı daha sonra bir modelle değiştirmek için Registry, Personal veya SSE kodunu değiştirmek gerekmez; sonuç aynı profile uymalıdır.

## Uygulama durumu

TypeScript derlemesi alındı. 14 Ekim 2026’da algoritma ve localhost HTTP/SSE regresyon testleri geçti; [kapsam ve sonuçlar](persistence.md). Docker denemesi çalıştırılmadı. Doğruluk/hız ölçümü yapılmadığından üretim kalitesi iddiası yoktur. Sonraki kalite değerlendirmesinde Türkçe, İngilizce, karışık dil, çok kısa metin, URL/e-posta, noktalama ve yalnız genel kelimeler içeren metinler ele alınmalıdır.
