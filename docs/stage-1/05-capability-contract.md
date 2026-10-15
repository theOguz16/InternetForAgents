# Geliştirici yetenek tanımı — ifa-manifest.v1

Durum: S1.0 kabul edilmiş tasarım. Manifest parser, Registry eşleme ve yerel agent şablonu uygulanmıştır; bu belgedeki bütün yaşam döngüsü/yetki özellikleri henüz tamamlanmış değildir. Platform agent’ın iş mantığını yazmaz. Geliştirici şema ve semantiği sağlar; platform tanımın yapısını, izinlerini ve ilan edilen sürümü doğrular. Doğrulama agent’ın dürüst veya doğru olduğunu kanıtlamaz.

## Kimlikler

Agent ID Registry üretir. Skill ID agent içinde benzersizdir. Capability ID `namespace/name` biçimindedir: namespace Registry workspace’inde owner’a ayrılır; domain sahipliği varsayılmaz. Başka namespace’e kayıt yetkisizdir. Version SemVer’dır. Aynı ID/version farklı içerikle yeniden yayımlanamaz; canonical JSON hash değişirse sürüm değişmelidir. Patch açıklama/örnek değişikliği, minor geriye uyumlu isteğe bağlı alan, major kırıcı giriş/çıktı veya semantik değişimdir. Çalışan plan ID+version+digest snapshot’ını pinler.

## Yayınlama ve bağlama

Geliştirici kartı `/.well-known/agent-card.json`, manifesti `/ifa/capabilities.json` yolunda aynı origin’den sunar. Kayıt isteği cardUrl ve manifestUrl taşır. Registry ikisini ayrı ağ/size politikasından geçirir. Kartın standard skill ID’leri manifest skillId alanlarıyla eşleştirilir; agent başına en fazla 16 beceri vardır. JSONRPC 1.0 arayüzü ve streaming desteği ilk sürümde zorunludur.

Manifest ilişkisi platform registration metadata’sıdır; A2A’nın zorunlu standart alanı olduğu iddia edilmez. Generic A2A istemcisi normal kartı kullanabilir; IFA şema-form özelliği için manifesti anlayan istemci gerekir. A2A extension URI’si yalnız ileride bir ADR ile resmi biçimi tanımlanırsa eklenir; standarda hayalî alan konmaz.

## Örnek manifest

```json
{
  "manifestVersion": "ifa-manifest.v1",
  "capabilities": [{
    "id": "team-example/text-length",
    "version": "1.0.0",
    "skillId": "text-length",
    "title": "Metin uzunluğu",
    "description": "Unicode kod noktalarının sayısını döndürür; byte sayısı değildir.",
    "executionMode": "deterministic",
    "sideEffects": "none",
    "inputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object", "additionalProperties": false,
      "required": ["text"],
      "properties": {"text": {"type": "string", "maxLength": 8000}}
    },
    "outputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object", "additionalProperties": false,
      "required": ["length"],
      "properties": {"length": {"type": "integer", "minimum": 0, "maximum": 8000}}
    },
    "examples": [{"input": {"text": "abc"}, "output": {"length": 3}}]
  }]
}
```

Bu örneğin schema’ları uygulama envelope’unun yalnız input/output alanını doğrular. Genel çağrının A2A mesajı tek application/json DataPart içerir:

```json
{
  "contract": "ifa-call.v1",
  "capability": {"id": "team-example/text-length", "version": "1.0.0"},
  "invocationId": "a0e6cce4-1912-4654-9c63-33ce09a1dfee",
  "input": {"text": "abc"}
}
```

Başarılı tek JSON artifact:

```json
{
  "contract": "ifa-result.v1",
  "capability": {"id": "team-example/text-length", "version": "1.0.0"},
  "invocationId": "a0e6cce4-1912-4654-9c63-33ce09a1dfee",
  "mode": "deterministic",
  "output": {"length": 3}
}
```

invocationId UUID’dır; caller principal + invocationId dedup anahtarıdır. Payload hash’i farklıysa çatışma, aynıysa aynı task. Version ve artifact ID eşleşmesi doğrulanır; çalışma modu manifestle eşleşir. Başarısız iş başarılı result içine gizlenmez: terminal failed/rejected/canceled ve yapılandırılmış hata kodu taşır. Hata ayrıntısında token, stack, ham özel context yoktur. A2A message/task/status wire serialization resmi SDK’ya bırakılır.

## Desteklenen schema alt kümesi

Draft-07: object/properties/required/additionalProperties=false; array/items/minItems/maxItems/uniqueItems; string/minLength/maxLength; integer/number/minimum/maximum; boolean; enum ve const. Root object zorunlu. Nullable alan yerine opsiyonel alan kullanılır. oneOf/anyOf/allOf, executable format, pattern, uzak/yerel `$ref` v1’de yoktur. Sayı, string ve array alanları sonlu üst sınıra sahip olmalıdır. Bilinmeyen schema özelliği sessizce yok sayılmaz; unsupported_schema ile reddedilir. Tüm örnek input/output çiftleri schema’dan geçer. Semantik örnek doğruluğu geliştiricinin sorumluluğudur.

## Yetki ve durum

sideEffects Teslim A’da yalnız none olabilir. Paket kurulumu, dosya değişikliği, para transferi gibi etkiler yeni policy gerektirir. Model backend credential’ı manifestte bulunmaz. executionMode fixture/deterministic/model; fixture UI’da açık görünür ve başarı benchmark’ına dahil edilmez.

Kayıt yaşamı pending_validation → active veya rejected; owner/operator suspended yapabilir; tekrar etkinleştirme yeniden doğrulama ister. Ağ hatası var olan geçerli snapshot’ı bozuk yeni içerikle değiştirmez. Revision optimistic concurrency ile kontrol edilir. Active olmak anlık erişilebilirlik değildir; verifiedAt/expiresAt ve son gözlem ayrı alanlardır. Varsayılan snapshot geçerliliği 24 saat; dispatch sırasında süresi dolduysa bütçe içinde bir kez doğrulanır, başarısızsa aday elenir. Arka plan polling yoktur.

## Uyumluluk ve örnekler

Yeni ID kayıt olabilir; desteklenen schema ile doğrudan çağrılabilir. Aynı profil adını kullanmak yetmez: sürüm/digest ve semantik uyum gerekir. Workflow açık eşleştirmeyle veri bağlar; kod profili bilmeyen bir metin becerisi o role otomatik sokulmaz. Registry gelecekte bilmediği tüm yetenekleri anlamak zorunda değildir.

B02 tamamlanma kanıtı: bu tanım, örnekler, sınırlar ve sürüm kararı. B03–B07’de parser, şema testleri ve bağımsız şablon uygulanacaktır. Mevcut `text-language.v1` vb. legacy profiller hemen bu envelope’u kabul etmez; geçiş adaptörü ayrı iştir.

## B04 uygulama kanıtları

[Validator sınırları, makine envelope şemaları ve kabul testleri](../development/manifest-validation.md).
