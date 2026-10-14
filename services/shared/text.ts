/** İnternet adresleri ve e-postalar dil/kelime puanını yapay biçimde etkilemesin. */
export function tokenize(text: string): string[] {
  const cleaned = text.normalize("NFC")
    .replace(/https?:\/\/\S+|www\.\S+|[^\s@]+@[^\s@]+/giu, " ");
  // Unicode harfleri korunur; sayılar ve noktalama işaretleri kelime sayılmaz.
  return cleaned.match(/\p{L}[\p{L}\p{M}]*(?:['’]\p{L}[\p{L}\p{M}]*)*/gu) ?? [];
}

export const turkishStopWords = new Set(
  "ve veya ile için bir bu şu o da de ki mı mi mu mü ama fakat ancak daha en çok az gibi kadar göre sonra önce hem her hiç bazı tüm olarak olan olmak ise ben sen biz siz onlar benim senin bizim sizin onun ne neden nasıl nerede hangi var yok evet hayır".split(" "),
);
export const englishStopWords = new Set(
  "the a an and or but if then than to of in on at for from with by as is are was were be been being this that these those it its i you he she we they my your our their not no yes do does did have has had can could would should will about into over under also very".split(" "),
);
