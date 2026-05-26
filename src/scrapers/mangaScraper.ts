import * as cheerio from "cheerio";
import { fetchPage } from "../lib/fetchWithHeaders.js";
import { SELECTORS } from "./selectors.js";

export interface MangaChapter {
  title: string;
  url: string;
  date: string;
}

export async function getMangaChapters(mangaUrl: string): Promise<MangaChapter[]> {
  const html = await fetchPage(mangaUrl);
  const $ = cheerio.load(html);
  const chapters: MangaChapter[] = [];

  $(SELECTORS.manga.chapterContainer).each((_, el) => {
    const title = $(el).find(SELECTORS.manga.chapterLink).text().trim();
    const url = $(el).find(SELECTORS.manga.chapterLink).attr("href") ?? "";
    const date = $(el).find(SELECTORS.manga.chapterDate).text().trim();
    if (url) {
      chapters.push({ title, url, date });
    }
  });

  return chapters;
}
