# Yujii — Plano de Projeto MVP

> App PWA de leitura de mangás, offline-first, com favoritos e download de capítulos.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) |
| Backend / API | Node.js + Express |
| Banco de dados | SQLite via Prisma (local, leve) |
| Cache offline | Service Worker + Cache API |
| Storage de imagens | IndexedDB (via idb) |
| Scraping | Cheerio + node-fetch (server-side) |
| Estilo | Tailwind CSS |
| PWA | next-pwa |

---

## Estrutura de Pastas

```
yujii/
├── apps/
│   ├── web/                        # Next.js frontend (PWA)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Home / Pesquisa
│   │   │   ├── manga/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx    # Página da obra
│   │   │   │       └── [chapter]/
│   │   │   │           └── page.tsx # Leitor de capítulo
│   │   │   └── favorites/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── MangaCard.tsx
│   │   │   ├── ChapterList.tsx
│   │   │   ├── Reader.tsx
│   │   │   └── DownloadButton.tsx
│   │   ├── hooks/
│   │   │   ├── useFavorites.ts
│   │   │   └── useOfflineChapter.ts
│   │   ├── lib/
│   │   │   ├── api.ts              # Funções para chamar a API Express
│   │   │   └── idb.ts              # Helpers IndexedDB (offline)
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── sw.js               # Service Worker (gerado pelo next-pwa)
│   │   └── next.config.js
│   │
│   └── api/                        # Express backend
│       ├── src/
│       │   ├── index.ts            # Entry point
│       │   ├── routes/
│       │   │   ├── search.ts
│       │   │   ├── manga.ts
│       │   │   └── chapter.ts
│       │   ├── scrapers/
│       │   │   ├── searchScraper.ts
│       │   │   ├── mangaScraper.ts
│       │   │   └── chapterScraper.ts
│       │   └── lib/
│       │       └── fetchWithHeaders.ts
│       └── package.json
│
├── prisma/
│   └── schema.prisma
└── package.json                    # Monorepo root (turborepo ou npm workspaces)
```

---

## Banco de Dados (Prisma + SQLite)

```prisma
// prisma/schema.prisma

model Manga {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  coverUrl    String
  sourceUrl   String
  createdAt   DateTime @default(now())
  favorites   Favorite[]
  chapters    Chapter[]
}

model Chapter {
  id          String   @id @default(cuid())
  mangaId     String
  manga       Manga    @relation(fields: [mangaId], references: [id])
  number      String
  title       String?
  slug        String
  sourceUrl   String
  date        String?
  pages       Page[]
}

model Page {
  id          String   @id @default(cuid())
  chapterId   String
  chapter     Chapter  @relation(fields: [chapterId], references: [id])
  index       Int
  imageUrl    String
}

model Favorite {
  id          String   @id @default(cuid())
  mangaId     String
  manga       Manga    @relation(fields: [mangaId], references: [id])
  createdAt   DateTime @default(now())

  @@unique([mangaId])
}
```

---

## API Express — Rotas e Scrapers

### Base URL do scraping

```
https://mangalivre.to/
```

### Headers obrigatórios para requests

```ts
// apps/api/src/lib/fetchWithHeaders.ts
export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9",
      "Referer": "https://mangalivre.to/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao acessar ${url}`);
  return res.text();
}
```

---

### Rota: Pesquisa de obras

**GET** `/api/search?q=jujutsu+kaisen`

**URL alvo:** `https://mangalivre.to/?s={query}`

**Seletor a extrair:**

```html
<!-- Título + link -->
<div class="post-title">
  <h3 class="h4"><a href="{url}">{title}</a></h3>
</div>

<!-- Capa -->
<div class="tab-thumb c-image-hover">
  <a href="{url}">
    <img src="{coverUrl}" alt="{title}">
  </a>
</div>
```

**Scraper:**

```ts
// apps/api/src/scrapers/searchScraper.ts
import * as cheerio from "cheerio";
import { fetchPage } from "../lib/fetchWithHeaders";

export async function searchMangas(query: string) {
  const url = `https://mangalivre.to/?s=${encodeURIComponent(query)}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const results: { title: string; url: string; coverUrl: string }[] = [];

  $(".c-tabs-item__content").each((_, el) => {
    const title = $(el).find(".post-title h3 a").text().trim();
    const url   = $(el).find(".post-title h3 a").attr("href") ?? "";
    const cover = $(el).find(".tab-thumb img").attr("src") ?? "";
    if (title && url) results.push({ title, url, coverUrl: cover });
  });

  return results;
}
```

**Resposta:**

```json
[
  {
    "title": "Jujutsu Kaisen",
    "url": "https://mangalivre.to/manga/jujutsu-kaisen-ptbr/",
    "coverUrl": "https://mangalivre.to/wp-content/.../cover.webp"
  }
]
```

---

### Rota: Página da obra (capítulos)

**GET** `/api/manga?url={encoded_url}`

**URL alvo:** `https://mangalivre.to/manga/{slug}/`

**Seletor a extrair:**

```html
<div class="listing-chapters-wrap">
  <div class="chapter-box">
    <a href="{chapterUrl}">Capitulo 24</a>
    <div class="chapter-date">05 de março de 2026</div>
  </div>
</div>
```

**Scraper:**

```ts
// apps/api/src/scrapers/mangaScraper.ts
import * as cheerio from "cheerio";
import { fetchPage } from "../lib/fetchWithHeaders";

export async function getMangaChapters(mangaUrl: string) {
  const html = await fetchPage(mangaUrl);
  const $ = cheerio.load(html);
  const chapters: { title: string; url: string; date: string }[] = [];

  $(".listing-chapters-wrap .chapter-box").each((_, el) => {
    const title = $(el).find("a").text().trim();
    const url   = $(el).find("a").attr("href") ?? "";
    const date  = $(el).find(".chapter-date").text().trim();
    if (url) chapters.push({ title, url, date });
  });

  return chapters;
}
```

**Resposta:**

```json
[
  {
    "title": "Capitulo 24",
    "url": "https://mangalivre.to/manga/jujutsu-kaisen-modulo/capitulo-24/",
    "date": "05 de março de 2026"
  }
]
```

---

### Rota: Páginas do capítulo

**GET** `/api/chapter?url={encoded_url}`

**URL alvo:** `https://mangalivre.to/manga/{slug}/capitulo-{n}/`

**Seletor a extrair:**

```html
<img id="image-0"
     src="https://mangalivre.to/wp-content/uploads/WP-manga/data/.../001.png"
     class="wp-manga-chapter-img">
```

**Scraper:**

```ts
// apps/api/src/scrapers/chapterScraper.ts
import * as cheerio from "cheerio";
import { fetchPage } from "../lib/fetchWithHeaders";

export async function getChapterPages(chapterUrl: string) {
  const html = await fetchPage(chapterUrl);
  const $ = cheerio.load(html);
  const pages: string[] = [];

  $("img.wp-manga-chapter-img").each((_, el) => {
    const src = $(el).attr("src")?.trim() ?? "";
    if (src) pages.push(src);
  });

  return pages;
}
```

**Resposta:**

```json
[
  "https://mangalivre.to/wp-content/uploads/.../001.png",
  "https://mangalivre.to/wp-content/uploads/.../002.png"
]
```

---

## Features do MVP

### 1. Pesquisa de obras

- Input de busca na Home
- Chama `GET /api/search?q=...`
- Exibe cards com capa, título e botão de acesso
- Debounce de 500ms no input

**Componente:** `SearchBar.tsx` + `MangaCard.tsx`

---

### 2. Favoritar obra

- Botão de coração em cada `MangaCard`
- Salva no banco via `POST /api/favorites` (mangaId, title, coverUrl, slug)
- Lista de favoritos em `/favorites`
- Hook `useFavorites.ts` gerencia estado local + sync com API

**Dados salvos localmente também no localStorage** para acesso imediato offline.

---

### 3. Ver capítulos e selecionar

- Rota: `/manga/[slug]`
- Busca lista de capítulos via `GET /api/manga?url=...`
- Exibe lista ordenada (mais recente primeiro)
- Cada item mostra: número, título, data e ícone de "baixado" (se offline disponível)
- Clique navega para `/manga/[slug]/[chapter]`

**Componente:** `ChapterList.tsx`

---

### 4. Ler capítulo

- Rota: `/manga/[slug]/[chapter]`
- Busca páginas via `GET /api/chapter?url=...`
- Leitor vertical (scroll infinito) — padrão para mobile
- Carregamento lazy das imagens (`loading="lazy"`)
- Barra superior com: voltar, número do capítulo, botão de próximo/anterior
- Imagens servidas via proxy no backend para evitar CORS e hotlink blocking

**Proxy de imagem:**

```ts
// GET /api/image?url={encoded_image_url}
// O backend faz fetch da imagem e retorna como stream, com headers corretos
```

**Componente:** `Reader.tsx`

---

### 5. Download offline

- Botão "Baixar" em cada capítulo na lista
- Chama `GET /api/chapter?url=...` para obter lista de URLs
- Faz fetch de cada imagem via `/api/image?url=...` e converte para Blob
- Salva no **IndexedDB** com chave `chapter:{slug}:{chapter}`
- Service Worker intercepta requests de imagem e serve do IndexedDB se disponível

**Hook:** `useOfflineChapter.ts`

```ts
// Estrutura do IndexedDB
{
  store: "chapters",
  key: "jujutsu-kaisen-ptbr:capitulo-243",
  value: {
    pages: [
      { index: 0, blob: Blob },
      { index: 1, blob: Blob },
      ...
    ]
  }
}
```

**Indicadores visuais:**
- Badge "Offline" verde no capítulo baixado
- Barra de progresso durante download
- Botão de remover download

---

## PWA — Configuração

```js
// apps/web/next.config.js
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/mangalivre\.to\/wp-content\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "manga-images",
        expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});

module.exports = withPWA({ /* next config */ });
```

```json
// apps/web/public/manifest.json
{
  "name": "Yujii",
  "short_name": "Yujii",
  "description": "Leia mangás online e offline",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Ordem de Implementação (Sprint MVP)

### Sprint 1 — Backend + Scrapers
- [ ] Setup Express + TypeScript
- [ ] `fetchWithHeaders` com User-Agent mobile
- [ ] Scraper de pesquisa (`searchScraper.ts`)
- [ ] Scraper de capítulos (`mangaScraper.ts`)
- [ ] Scraper de páginas (`chapterScraper.ts`)
- [ ] Proxy de imagem (`GET /api/image`)
- [ ] Testes manuais de cada rota com Jujutsu Kaisen

### Sprint 2 — Frontend base
- [ ] Setup Next.js + Tailwind + next-pwa
- [ ] Página Home com `SearchBar` + `MangaCard`
- [ ] Página de obra `/manga/[slug]` com `ChapterList`
- [ ] Página de leitura `/manga/[slug]/[chapter]` com `Reader`
- [ ] Navegação entre capítulos (anterior / próximo)

### Sprint 3 — Favoritos + Offline
- [ ] Setup Prisma + SQLite
- [ ] Endpoint `POST /api/favorites` e `GET /api/favorites`
- [ ] Hook `useFavorites` + página `/favorites`
- [ ] Setup IndexedDB (`idb`)
- [ ] Hook `useOfflineChapter` com download + progress
- [ ] Service Worker interceptando imagens offline

### Sprint 4 — Polimento PWA
- [ ] Manifest + ícones
- [ ] Splash screen e meta tags PWA
- [ ] Teste de instalação no Android/iOS
- [ ] Tratamento de erro offline (fallback pages)
- [ ] Performance: lazy load, skeleton screens

---

## Observações Técnicas

### CORS e Hotlink
O site-alvo bloqueia requests diretos do browser. **Todas as imagens e páginas HTML devem ser requisitadas pelo backend Express**, que age como proxy. O frontend nunca acessa `mangalivre.to` diretamente.

### Rate Limiting
Implementar delay de 500ms–1s entre requests consecutivos ao scraper para evitar bloqueio por IP.

```ts
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
await delay(700);
```

### Cache do backend
Adicionar cache em memória (ou Redis futuro) nas respostas de scraping:
- Pesquisa: TTL 5 minutos
- Lista de capítulos: TTL 1 hora
- Páginas do capítulo: TTL permanente (capítulos não mudam)

### Tratamento de seletores quebrados
O site pode mudar o HTML. Centralizar todos os seletores CSS em constantes para facilitar manutenção:

```ts
// apps/api/src/scrapers/selectors.ts
export const SELECTORS = {
  search: {
    title: ".post-title h3 a",
    cover: ".tab-thumb img",
    container: ".c-tabs-item__content",
  },
  manga: {
    chapterContainer: ".listing-chapters-wrap .chapter-box",
    chapterLink: "a",
    chapterDate: ".chapter-date",
  },
  chapter: {
    pageImage: "img.wp-manga-chapter-img",
  },
};
```

---

## Variáveis de Ambiente

```env
# apps/api/.env
PORT=3001
BASE_URL=https://mangalivre.to

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

*Documento gerado para uso com OpenCode. Iniciar pela Sprint 1 — Backend + Scrapers.*
