import { Router } from "express";
import { getMangaChapters } from "../scrapers/mangaScraper.js";
import { cache } from "../lib/cache.js";
import { rateLimitedFetch } from "../lib/rateLimit.js";

const router = Router();

router.get("/", async (req, res) => {
  const url = req.query.url as string;

  if (!url) {
    res.status(400).json({ error: 'Parâmetro "url" é obrigatório' });
    return;
  }

  const cacheKey = `manga:${url}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const chapters = await rateLimitedFetch(() => getMangaChapters(url));
    cache.set(cacheKey, chapters, 60 * 60 * 1000);
    res.json(chapters);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(502).json({ error: `Falha ao buscar: ${message}` });
  }
});

export default router;
