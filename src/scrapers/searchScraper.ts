import * as cheerio from "cheerio";
import { BASE_URL, fetchPage } from "../lib/fetchWithHeaders.js";
import { SELECTORS } from "./selectors.js";

export interface SearchResult {
  title: string;
  url: string;
  coverUrl: string;
}

export async function searchMangas(query: string): Promise<SearchResult[]> {
  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $(SELECTORS.search.container).each((_, el) => {
    const title = $(el).find(SELECTORS.search.title).text().trim();
    const url = $(el).find(SELECTORS.search.title).attr("href") ?? "";
    const cover = $(el).find(SELECTORS.search.cover).attr("src") ?? "";
    if (title && url) {
      results.push({ title, url, coverUrl: cover });
    }
  });

  return results;
}
