export interface Input { text: string }
export interface Output { length: number }

/** Girdi sunucu katmanında doğrulanır; handler yalnız becerinin işini yapar. */
export async function execute(input: Input, _signal: AbortSignal): Promise<Output> {
  // String.length UTF-16 birimi sayar; kontratımız Unicode kod noktası ister.
  return { length: Array.from(input.text).length };
}
