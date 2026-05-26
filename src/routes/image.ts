import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  const url = req.query.url as string;

  if (!url) {
    res.status(400).json({ error: 'Parâmetro "url" é obrigatório' });
    return;
  }

  res.redirect(302, url);
});

export default router;
