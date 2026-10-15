# ADR-019: Kalıcı görev, polling ve dedup

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 006 (10 Ekim arşivi)

> Güncelleme: Bu kaydın polling/streaming veya periyodik sağlık kararları [ADR-023](0023-sse-no-polling.md) ile değiştirilmiştir. Aşağıdaki metin karar geçmişidir.

## Bağlam

LLM olmasa bile bağımsız görevler HTTP isteğinden uzun sürebilir.

## Karar

Nonblocking SendMessage + GetTask; job/child/remote task ayrımı; profile requestId dedup.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. Tekrar garantisi A2A id alanlarından türetilmez. Kısmi sonuçlar korunur; timeout uzak failure sayılmaz.

## Yeniden değerlendirme

SSE, uzun işler veya multi-turn ihtiyaç olursa.

## Ayrıntı

[task-lifecycle.md](../architecture/task-lifecycle.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
