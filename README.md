# Internet for Agents — Seyahat Planı Prototipi

Kullanıcının gezi isteğini ulaşım, konaklama, hava durumu, etkinlik ve harita ihtiyaçlarına ayıran; şehir verilerini açık kaynaklardan toplayıp harita üzerinde gösteren yerel web prototipi.

## Gereksinimler

- Node.js 18 veya üzeri
- İnternet bağlantısı (canlı açık veri kaynakları için)

Proje ek Node.js paketi gerektirmez; sunucu Node.js standart kütüphanesini kullanır.

## Windows'ta çalıştırma

1. `start.bat` dosyasına çift tıklayın.
2. Açılan sunucu penceresini açık bırakın.
3. Tarayıcıda `http://127.0.0.1:8765` sayfası açılır.
4. İşiniz bittiğinde sunucu penceresini kapatın.

Alternatif olarak bu klasörde terminal açıp `npm start` komutunu çalıştırın, sonra tarayıcıda `http://127.0.0.1:8765` adresine gidin.

## Planner modelini yeniden eğitme

Türkçe örnekler `training/examples.jsonl` içindedir. Her satır bir istek ve capability etiketlerini içeren JSON nesnesidir:

```json
{"text":"İstanbul'da otel öner","labels":["hotel"]}
```

Yeni örnek ekledikten sonra `npm run train` komutunu çalıştırın. Komut TF-IDF + k-NN tabanlı çok etiketli modeli ve bağımsız HTML arayüzündeki model gömüsünü günceller. Çalışan sunucuyu yeni model için yeniden başlatın.

Mevcut eğitim kümesinde 68 Türkçe örnek ve 6 capability bulunur. 14 örneklik ayrılmış ölçüm kümesinde micro-F1 0,627 elde edilmiştir. Bu küçük bir prototip ölçümüdür; geniş kapsamlı doğruluk garantisi değildir. Bu çalışma büyük bir dil modelini fine-tune etmez.

## Veri kaynakları ve sınırlar

- Hava: Open-Meteo; sıcaklık ve yağış tahmini. Tahminler yalnızca yayımlanmış tarih aralığında bulunur.
- Harita, konaklama kayıtları ve gezilecek yerler: OpenStreetMap. Haritada tüm gezilecek yerler, tarihî yerler, müzeler, doğal yerler ve diğer kategoriler filtrelenebilir.
- Rota: OpenStreetMap tabanlı araba rotası. Trafik ve toplu taşıma tarifesi sağlamaz; ücret seçeneği geçiş ücreti tutarını garanti etmez.
- Etkinlikler: İstanbul KÜLTÜR.İSTANBUL ve İzmir Büyükşehir Belediyesi açık kaynakları. Etkinlik kapsamı bu iki şehirle sınırlıdır.
- Otel fiyatı/müsaitliği, gerçek rezervasyon ve tren/uçak bileti satın alma bu prototipte bağlı değildir.

Açık veri kayıtları eksik veya güncelliğini yitirmiş olabilir. Şehir ve tarih bilgisi ilgili kamuya açık veri servislerine gönderilir.

## API uç noktaları

- `GET /api/health`
- `GET /api/catalog`
- `POST /api/plan` — JSON gövdesi: `{"goal":"İstanbul'a gezi planla"}`
- `GET /api/weather?city=İstanbul&date=YYYY-MM-DD`
- `GET /api/places?city=İstanbul`
- `GET /api/route?origin=Ankara&destination=İzmir`
- `GET /api/events?city=İstanbul&date=YYYY-MM-DD`

Sunucu varsayılan olarak yalnızca `127.0.0.1:8765` üzerinde dinler.

## Proje yapısı

```text
index.html                 Web arayüzü
server.js                  Yerel API ve veri kaynakları
train-planner.js           Planner eğitim betiği
training/examples.jsonl    Etiketli Türkçe eğitim örnekleri
training/planner-model.json Eğitilmiş model
vendor/leaflet/            Harita kütüphanesi ve lisansı
start.bat                  Windows hızlı başlatma
```
