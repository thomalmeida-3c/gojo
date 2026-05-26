const BASE_URL = process.env.BASE_URL ?? "https://mangalivre.to";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  Referer: `${BASE_URL}/`,
};

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: DEFAULT_HEADERS });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao acessar ${url}`);
  }

  return res.text();
}

export { BASE_URL };
