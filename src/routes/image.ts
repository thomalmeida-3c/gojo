import { Router } from "express";
import { fetchImage } from "../lib/fetchWithHeaders.js";
import { rateLimitedFetch } from "../lib/rateLimit.js";

const router = Router();

router.get("/", async (req, res) => {
  const url = req.query.url as string;
  const referer = req.query.referer as string | undefined;

  if (!url) {
    res.status(400).json({ error: 'Parâmetro "url" é obrigatório' });
    return;
  }

  try {
    const imageRes = await rateLimitedFetch(() => fetchImage(url, referer));

    if (!imageRes.ok) {
      const text = await imageRes.text().catch(() => "");
      console.error(`[image] ${imageRes.status} ao buscar: ${url.slice(0, 80)}... body: ${text.slice(0, 200)}`);
      res.status(imageRes.status).json({ error: `Falha ao buscar imagem` });
      return;
    }

    const contentType = imageRes.headers.get("content-type") ?? "image/webp";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    if (imageRes.body) {
      const reader = imageRes.body.getReader();
      const stream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        },
      });

      const nodeStream = require("stream").Readable.fromWeb(stream);
      nodeStream.pipe(res);
    } else {
      res.status(502).json({ error: "Resposta vazia da origem" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(502).json({ error: `Falha ao baixar imagem: ${message}` });
  }
});

export default router;
