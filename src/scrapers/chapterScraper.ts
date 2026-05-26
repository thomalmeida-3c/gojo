import * as cheerio from "cheerio";
import { fetchPage } from "../lib/fetchWithHeaders.js";
import { SELECTORS } from "./selectors.js";

export async function getChapterPages(chapterUrl: string): Promise<string[]> {
  const html = await fetchPage(chapterUrl);
  const $ = cheerio.load(html);
  const pages: string[] = [];

  $(SELECTORS.chapter.pageImage).each((_, el) => {
    const src = $(el).attr("src")?.trim() ?? "";
    if (src) pages.push(src);
  });

  return pages;
}
