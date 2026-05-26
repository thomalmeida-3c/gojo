import express from "express";
import cors from "cors";
import searchRouter from "./routes/search.js";
import mangaRouter from "./routes/manga.js";
import chapterRouter from "./routes/chapter.js";
import imageRouter from "./routes/image.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/search", searchRouter);
app.use("/api/manga", mangaRouter);
app.use("/api/chapter", chapterRouter);
app.use("/api/image", imageRouter);

const PORT = process.env.PORT ?? 3001;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Yujii API running on http://localhost:${PORT}`);
  });
}

export default app;
