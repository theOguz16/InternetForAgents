import { englishStopWords, turkishStopWords, tokenize } from "../shared/text.js";

export function extractKeywords(text: string): string[] {
  const frequencies = new Map<string, { count: number; first: number }>();
  for (const [index, token] of tokenize(text).entries()) {
    // Türkçe harf içeren kelimede I/İ dönüşümü Türkçe yapılır. Diğer kelimeler için
    // varsayılan dönüşüm seçilir; dili bilinmeyen ASCII "I" her zaman doğru çözülemez.
    const lower = /[çğıöşüİ]/iu.test(token) ? token.toLocaleLowerCase("tr-TR") : token.toLowerCase();
    // Ankara'nın → ankara. Genel ek/kök çözümlemesi yapmıyoruz; yalnız kesme sonrasını ayırıyoruz.
    const word = lower.split(/['’]/u)[0];
    const length = Array.from(word).length;
    if (length < 2 || length > 128 || turkishStopWords.has(word) || englishStopWords.has(word)) continue;
    const existing = frequencies.get(word);
    if (existing) existing.count++;
    else frequencies.set(word, { count: 1, first: index });
  }
  // Tek metinde tekrar sıklığını kullanırız. Eşit puanda ilk görünüm kararlı sıralama sağlar.
  // Bu yöntem anlamsal önem veya TF-IDF ölçmez; bunun için ek model/veri gerekir.
  return [...frequencies.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first)
    .slice(0, 10)
    .map(([word]) => word);
}
