import { Router } from "express";
import { getChapterPages } from "../scrapers/chapterScraper";
import { cache } from "../lib/cache";
import { rateLimitedFetch } from "../lib/rateLimit";

const router = Router();

router.get("/", async (req, res) => {
  const url = req.query.url as string;

  if (!url) {
    res.status(400).json({ error: 'Parâmetro "url" é obrigatório' });
    return;
  }

  const cacheKey = `chapter:${url}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const pages = await rateLimitedFetch(() => getChapterPages(url));
    cache.set(cacheKey, pages, 24 * 60 * 60 * 1000);
    res.json(pages);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(502).json({ error: `Falha ao buscar: ${message}` });
  }
});

export default router;
