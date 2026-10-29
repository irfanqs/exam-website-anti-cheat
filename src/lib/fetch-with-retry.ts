// fetch() yang diulang otomatis saat request gagal karena jaringan (TypeError
// "Failed to fetch", mis. sinyal HP putus sesaat) atau server error 5xx.
// Hanya untuk endpoint yang aman diulang (idempotent). Kalau semua percobaan
// gagal, error jaringan terakhir dilempar atau respons 5xx terakhir dikembalikan.
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retryDelaysMs: number[]
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const canRetry = attempt < retryDelaysMs.length;
    try {
      const res = await fetch(url, init);
      if (res.status < 500 || !canRetry) return res;
    } catch (err) {
      if (!(err instanceof TypeError) || !canRetry) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
  }
}
