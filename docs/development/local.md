# Yerel geliştirme

## Gereksinimler
Docker Desktop/Engine ve Compose. Container dışında geliştirme için Node.js 24 ve npm gerekir. Docker daemon açık olmalıdır.

## Yalnızca kendi servisini aç
```sh
docker compose up --build language
```
`language` yerine `registry`, `personal`, `keywords` veya `summary` kullanılabilir. Servisler birbirini otomatik başlatmaz. Registry üzerinden kayıt ve keşif için [bağlantı rehberine](registry-a2a.md) bak.

## Tüm iskeleti aç
```sh
docker compose --profile integration up --build
```

| Servis | Yerel sağlık adresi |
| --- | --- |
| registry | http://localhost:4001/health |
| personal | http://localhost:4002/health |
| language | http://localhost:4101/health |
| keywords | http://localhost:4102/health |
| summary | http://localhost:4103/health |

Portlar yalnızca localhost’a açıktır. Beş servis aynı Compose ağına katılır. İleride container içinden diğer servis için `http://registry:4000` gibi servis DNS adı kullanılır; localhost kullanılamaz. Başka bilgisayardan erişim henüz yapılandırılmamıştır.

Kaynak değişince aynı `up --build` komutuyla yeniden oluştur. Kapatmak için:
```sh
docker compose --profile integration down
```
Model indirilmez, model sunucusu başlatılmaz. Sürekli sağlık sorgusu veya polling kurulmaz.

## Docker dışında
```sh
npm install
SERVICE_NAME=language PORT=4101 npm run dev:service
```
Derleme: `npm run build:services`. Eski seyahat prototipi `npm start` ile çalışır; yeni platform değildir. N01 denemesi `spikes/n01-a2a` altında bağımsızdır.

## Uzman ekleme şablonu
`services/shared/contracts.ts` iş mantığı arayüzüdür. `services/language/handler.ts` örneğini yeni uzman dizinine kopyala. İş mantığı HTTP veya SDK nesnelerine bağımlı olmasın. A2A adaptörü girdiyi doğrular, handler’ı çağırır ve sonucu artifact olarak aktarır.

Mevcut handler’lar A2A üzerinden yalnızca fixture döndürür. Uzmanların `/health` yanıtında `a2aReady: true` olur; bu gerçek analiz kalitesi anlamına gelmez. Kalıcı DB, Personal orkestrasyonu ve React arayüzü henüz uygulanmadı.
