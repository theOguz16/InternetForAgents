# Demo arayüzü

## Çalıştırma

Node.js 24 kullanın. `npm install` ardından `npm run build` hem servisleri hem React arayüzünü derler. Mevcut servisleri açın; Personal servisi için:

```sh
SERVICE_NAME=personal PORT=4002 npm run start:service
```

Tarayıcıda `http://localhost:4002` açılır. Registry ve uzmanlar ayrı süreçler olarak açık olmalıdır; Personal bunları otomatik başlatmaz.

Docker alternatifi:

```sh
docker compose --profile integration up --build
```

Aynı `http://localhost:4002` adresi kullanılır. Web dosyaları Personal üzerinden sunulur; ek web container’ı gerekmez.

Arayüzü geliştirirken `npm run dev:web` Vite’ı `http://localhost:3000` üzerinde açar. API isteklerini yereldeki 4002 portuna yönlendirir; Personal servisini ayrıca çalıştırın.

## Demo akışı

1. Uzman dizininde Agent Card adreslerini tek tek kaydedin. Docker için `http://language:4000/.well-known/agent-card.json`, `http://keywords:4000/.well-known/agent-card.json` ve `http://summary:4000/.well-known/agent-card.json` kullanılır.
2. Docker dışında `http://127.0.0.1:4101/.well-known/agent-card.json` gibi yerel uzman adresleri kullanılır.
3. Metni girin, becerileri seçin ve görevi başlatın.
4. Her becerinin sağlayıcısı, durumu, seçim gerekçesi ve sonucu gösterilir. Özetin örnek çıktı olduğu açıkça etiketlenir.
5. Bitmiş işten sonra “Yeni görev hazırla” yeni idempotency anahtarı oluşturur. Aynı içeriği normal gönderim düğmesiyle tekrarlamak mevcut işi getirir.

## Mimari

React yalnız görünüm ve kullanıcı etkileşimini yönetir. İş oluşturma ve SSE aynı Personal origin’inde `/v1` üzerinden çalışır. `/registry/agents` geçidi sabit Registry adresine yalnız listeleme ve kayıt işlemlerini aktarır; kullanıcıdan proxy hedefi almaz. Bu geçit Registry’nin verisini veya iş mantığını Personal’a taşımaz.

Üretim derlemesi Vite ile hazırlanır ve Express statik dosya sunucusuyla açılır. Eski seyahat prototipinin kökteki `index.html` dosyası korunur; yeni uygulama `web/` altındadır.

## SSE ve tekrar gönderim

Arayüz `fetch` ile SSE okur; ağ parçalarını tam olay oluşana kadar birleştirir. Heartbeat yorumları atlanır. Bağlantı kesilirse kullanıcı “Son duruma bağlan” ile aynı işe yeniden bağlanır. Otomatik polling veya sınırsız reconnect yoktur.

Aynı sayfa oturumunda başarısız gönderim tekrarında aynı içerik/idempotency anahtarı kullanılır. Son kabul edilen iş kimliği sessionStorage’da tutulur; sayfa yenilenince aynı işin snapshot akışı açılır. Metin tarayıcı depolamasına yazılmaz. Kabul yanıtı kaybolduktan sonra sayfa tamamen yenilenirse henüz alınmamış iş kimliği ve bellekteki gönderim anahtarı geri yüklenemez; bu durum için kalıcı gönderim taslağı henüz yoktur.

## Sınırlar

Yerel, kimlik doğrulamasız demo kapsamındadır. Kullanıcı bazlı izinler, erişilebilirlik/görsel tarayıcı testi ve tam uçtan uca arayüz testi henüz tamamlanmadı. İş sürerken form kilitlidir; bağlantı yenileme uzak işi tekrar göndermez. Görev iptal düğmesi yoktur çünkü backend gerçek iptali henüz desteklemez.
