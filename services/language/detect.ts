import { tokenize } from "../shared/text.js";

// Küçük sözlükler genel dil modeli değildir; yalnız TR/EN için açıklanabilir başlangıç kurallarıdır.
const trMarkers = new Set("ve veya ile için bir bu şu ama fakat çünkü değil olarak olan olmak benim senin bizim sizin onun merhaba dünya bugün yarın şimdi lütfen teşekkür ederim günaydın iyi nasıl neden nerede hangi metin dil kelime anahtar özet çalışır çalışıyor yapar yapıyor kullanır kullanıyor gerekiyor istiyorum istiyoruz yapalım birlikte hava güzel".split(" "));
const enMarkers = new Set("the and or with for this that these those because without which what where when how why is are was were have has does would should hello world today tomorrow please thanks good morning text language keyword summary works working uses using want need together weather beautiful".split(" "));

export function detectLanguage(text: string): "tr" | "en" | "und" {
  const words = tokenize(text);
  if (words.length < 2) return "und";
  // Aynı kelimeyi yüz kez tekrarlamak yüz bağımsız kanıt değildir.
  const trWords = new Set(words.map(word => word.toLocaleLowerCase("tr-TR")));
  const enWords = new Set(words.map(word => word.toLowerCase()));
  const trHits = [...trWords].filter(word => trMarkers.has(word)).length;
  const enHits = [...enWords].filter(word => enMarkers.has(word)).length;
  // Türkçe karakterler tek başına kanıt sayılmaz: başka dillerde ve özel adlarda da bulunabilir.
  // En az iki farklı işaret ve belirgin üstünlük yoksa yanlış kesinlik yerine und döneriz.
  if (trHits >= 2 && trHits >= enHits * 2 && trHits - enHits >= 2) return "tr";
  if (enHits >= 2 && enHits >= trHits * 2 && enHits - trHits >= 2) return "en";
  return "und";
}
