# Junior geliştirici başlangıç rehberi

## Gereksinimler

Git, Node.js 24, npm ve Docker Desktop/Engine + Compose. Python yalnız runner geliştiricisi için ilgili sabit image içinde kullanılacak. Yerel model ilk kurulum için zorunlu değil.

```sh
git clone https://github.com/furkankorkmaz35/InternetForAgents.git
cd InternetForAgents
git switch oguzhan
npm ci
npm run build
npm run test:services
```

Bu altyapı PR’ı merge edilene kadar `codex/generic-registry-foundation` dalını kullan. Dalı main’den oluşturma; issue’da belirtilen base’i izle.

## Yalnız ihtiyaç duyduğun servis

```sh
docker compose up --build registry
```

Tüm demo:

```sh
docker compose --profile integration up --build -d
```

http://localhost:4002. Portlar: registry 4001, personal 4002, language 4101, keywords 4102, summary 4103. `docker compose --profile integration stop` durdurur; `down -v` veri siler, rutin komut değildir.

UI dev: Personal açıkken `npm run dev:web` → localhost:3000. Servis dev: `SERVICE_NAME=registry PORT=4001 npm run dev:service`. `npm start` eski seyahat prototipidir.

## İlk okuma

S1.0 `docs/stage-1/README.md`; sonra issue’nun özel kaynakları. Mevcut kod sınırları `docs/development/` altında. Genel manifest kontrolü:

```sh
npm run validate:manifest -- examples/manifests/text-length.json text-length
```

Bu komut agent üretmez. Kopyalanabilir bağımsız agent projesi B05’te teslim edilecek; bugünkü servis klasörünü kopyalamak tamamlanmış SDK sanılmamalıdır. Bağımsız agent işlerine B05/B06/B07 sonrası geçilir.

## Sorun kaydı

Issue’ya Node/Docker sürümü, çalıştırılan komut, beklenen/gerçek sonuç ve maskelenmiş hata ekle. Secret/token veya gerçek kullanıcı kodu paylaşma. Model RAM sorunu varsa önce fixture moduyla transport’u doğrula; her agent’a ayrı model yükleme.
