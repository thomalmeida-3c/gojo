import { Router } from "express";
import { searchMangas } from "../scrapers/searchScraper";
import { cache } from "../lib/cache";
import { rateLimitedFetch } from "../lib/rateLimit";

const router = Router();

router.get("/", async (req, res) => {
  const query = (req.query.q as string)?.trim();

  if (!query) {
    res.status(400).json({ error: 'Parâmetro "q" é obrigatório' });
    return;
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const results = await rateLimitedFetch(() => searchMangas(query));
    cache.set(cacheKey, results, 5 * 60 * 1000);
    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(502).json({ error: `Falha ao buscar: ${message}` });
  }
});

export default router;
