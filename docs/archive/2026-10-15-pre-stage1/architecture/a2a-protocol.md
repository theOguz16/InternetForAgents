# A2A iletişimi ve veri biçimi

Karar: A2A **1.0** wire sürümü; **JSON-RPC 2.0 over HTTP(S)** binding. Spesifikasyon yayını **v1.0.0**. Resmi SDK `@a2a-js/sdk`; paket sürümü implementation spike sırasında lockfile'a sabitlenir. Bu belge uygulama/test sonucu değildir.

Kaynak: [sabit A2A v1.0.0 tanımı](https://a2a-protocol.org/v1.0.0/specification/), [protokol veri modeli](https://raw.githubusercontent.com/a2aproject/A2A/v1.0.0/specification/a2a.proto), [resmi JS SDK](https://github.com/a2aproject/a2a-js).

## JSON, YAML, XML veya YANG?

| Kavram | Karar ve rol |
| --- | --- |
| JSON | Ağdaki mesaj/yanıt gövdesi ve Agent Card biçimi |
| JSON-RPC 2.0 | JSON içinde method, params, id ve result/error zarfı |
| A2A | Agent Card, görev, mesaj ve artifact anlamlarını tanımlayan protokol |
| HTTP(S) | Bu JSON-RPC mesajlarını taşıyan bağlantı |
| YAML | Docker Compose gibi insanın düzenlediği yerel config için; mesaj formatı değil |
| XML | Bu tasarımda kullanılmaz; A2A binding'ini özel XML biçimine çevirmeyiz |
| YANG | Ağ yönetimi için veri modelleme dili; JSON-RPC mesaj formatının alternatifi olarak seçilmiyor |
| Protobuf | A2A'nın kanonik modelinde bulunur; seçtiğimiz binding JSON taşır, gRPC binary taşıma açmayız |

YANG bağlamı: [RFC 7950](https://www.rfc-editor.org/rfc/rfc7950.html). Kullanıcının YAML kastetmesi durumunda da ayrım aynıdır: config dosyası ile mesaj protokolü farklıdır.

## İki ayrı API

UI ↔ Registry/Personal Agent: bize ait REST + JSON; endpoint'ler [API belgesinde](api.md).
Personal Agent ↔ uzman: standart A2A JSON-RPC; özel `/review` çağrısı yapmayız. Card GET yolu `/.well-known/agent-card.json`; agent'ın kartında ilan ettiği JSONRPC URL'sine POST yapılır. `/a2a` bizim deployment tercihimizdir, tüm agent'lara zorunlu standart yol değildir.

## Sürüm karışmasını önleme

1.0 örneklerinde method `SendMessage`/`GetTask`, role `ROLE_USER`, task state `TASK_STATE_WORKING`; part üzerinde eski `kind` alanı yoktur. 0.3 örneklerindeki `message/send`, `tasks/get`, `kind` ve kısa enum adlarıyla karıştırılmaz. Agent uygulama version'ı ile interface protocolVersion ayrı bilgilerdir.

SDK README 12 Ekim kontrolünde 1.0 desteği bildiriyor; main kaynak package.json 1.3.0 gösteriyor. Bu npm yayınının kurulduğu veya uyumun test edildiği anlamına gelmez. N01 kapısı yayımlanmış SDK paketiyle mesaj gidiş-dönüşünü doğrulamalıdır. Sessizce eski protokole düşülmez.

## Agent Card örneği

Aşağıdaki sentetik örnek yerel, kimlik doğrulamasız izole demo profilini gösterir. Paylaşılan dağıtımda güvenlik gereksinimleri SDK modeliyle eklenir.

```json
{
  "name": "Python Review A",
  "description": "Python kaynak metni için sınırlı inceleme bulguları üretir.",
  "version": "1.0.0",
  "supportedInterfaces": [
    {"url": "http://review-a:4101/a2a", "protocolBinding": "JSONRPC", "protocolVersion": "1.0"}
  ],
  "capabilities": {"streaming": true, "pushNotifications": false},
  "defaultInputModes": ["application/json"],
  "defaultOutputModes": ["application/json"],
  "skills": [
    {"id": "python-review", "name": "Python Code Review", "description": "İnceleme bulguları sunar.", "tags": ["python", "code-review"]}
  ]
}
```

Kartın `skills` alanı iş becerilerini anlatır. `capabilities` ise streaming gibi protokol özellikleridir. Registry'de platform profilini skill id'ye bağlamak ayrı bir kayıttır; standart karta rastgele zorunlu alan eklemeyiz.

## Görev gönderimi

POST karttaki JSONRPC URL'sine; Content-Type: application/json, A2A-Version: 1.0. Authorization gerekiyorsa Personal Agent'ın ilgili uzmana ait credential'ı kullanılır.

```json
{
  "jsonrpc": "2.0",
  "id": "rpc-01",
  "method": "SendStreamingMessage",
  "params": {
    "message": {
      "messageId": "msg-01",
      "role": "ROLE_USER",
      "parts": [
        {"mediaType": "application/json", "data": {
          "profile": "code-review.v1",
          "requestId": "child-01",
          "language": "python",
          "source": "def add(a, b):\n    return a + b\n"
        }}
      ]
    },
    "configuration": {"acceptedOutputModes": ["application/json"]}
  }
}
```

`profile`, `requestId`, `language`, `source` bizim uygulama payload'umuzdur; A2A'nın standart görev alanları değildir. `rpc id` tek HTTP alışverişini, messageId mesajı, child requestId uygulama delegasyonunu, uzman taskId ise uzmanın görevini tanımlar. Eşit oldukları varsayılmaz.

## SSE olay akışı ve toparlanma

Uzman text/event-stream yanıtı açar. Aşağıdaki JSON ilk `data:` olayının gövdesidir; her olay boş satırla ayrılır. Uzman görev kaydını kalıcılaştırdıktan sonra task olayı gönderir. Bizim uzman profilimiz görev kabulünde Task yanıtı gerektirir; A2A'da mümkün olan yalnız Message yanıtı kullanıcıya açıklama olarak gösterilir ve beklenen görev kabulü sayılmaz.

```json
{
  "jsonrpc": "2.0",
  "id": "rpc-01",
  "result": {
    "task": {"id": "review-task-01", "contextId": "review-context-01", "status": {"state": "TASK_STATE_SUBMITTED"}}
  }
}
```

Personal Agent task id'yi kaydeder. Aşağıdaki GetTask yalnız bağlantı toparlanmasında tek seferlik durum uzlaştırması örneğidir:

```json
{"jsonrpc":"2.0","id":"rpc-02","method":"GetTask","params":{"id":"review-task-01","historyLength":0}}
```

GetTask sonucu doğrudan Task nesnesidir:

```json
{
  "jsonrpc": "2.0",
  "id": "rpc-02",
  "result": {
    "id": "review-task-01",
    "contextId": "review-context-01",
    "status": {"state": "TASK_STATE_COMPLETED"},
    "artifacts": [{
      "artifactId": "review-result-01",
      "name": "Review findings",
      "parts": [{"mediaType":"application/json","data":{
        "profile":"code-review.v1",
        "requestId":"child-01",
        "engineMode":"rules",
        "summary":"Etkin kurallarda bulgu yok.",
        "findings":[],
        "limitations":["Tam Python semantik analizi yapılmadı."]
      }}]
    }]
  }
}
```

## Bizim destek profilimiz

SendStreamingMessage ana akıştır; ilerleme ve artifact olayları SSE üzerinden gelir. Kart streaming=true ilan eder; streaming desteklemeyen aday MVP seçiminden çıkarılır. Push webhook kapalıdır. CancelTask best-effort kalır. Child deadline 60 saniyedir. Bağlantı kesilince SubscribeToTask kullanılır; terminal durum hatasında tek GetTask alınır. Periyodik GetTask veya UI GET döngüsü yoktur. Detay: [ADR-023](../decisions/0023-sse-no-polling.md).

Örnek SSE durum olayı:

```text
data: {"jsonrpc":"2.0","id":"rpc-01","result":{"statusUpdate":{"taskId":"review-task-01","contextId":"review-context-01","status":{"state":"TASK_STATE_WORKING"}}}}

```

Bu örnek tam bir stream değildir. Artifact parçaları artifactId bazında birleştirilir; terminal olay ve doğrulanmış sonuç alındığında akış kapatılır. Kopmada bütün olayların yeniden oynatılacağı varsayılmaz.

## Hatalar

A2A endpoint'lerinde SDK'nın JSON-RPC error modeli korunur; kendi REST problem zarfımız bunun yerine geçirilmez. HTTP 200 içinde RPC error olabilir. RPC error, Task FAILED ve ağ timeout üç farklı durumdur. UI için Personal Agent bunları iç hata modeline çevirir; sanitize diagnostic nedeni saklar.

Örnekler protokol tasarım örneğidir. Kod aşamasında seçilen SDK serializer'ı ve v1.0.0 modeliyle doğrulanacak; tüm JSON'u elle oluşturmak yerine SDK kullanılacaktır.
