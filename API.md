# Yujii API

Proxy de scraping para o site [mangalivre.to](https://mangalivre.to), deployável na Vercel.

---

## Endpoints

### `GET /api/health`

Health check do servidor.

**Resposta:**
```json
{ "status": "ok" }
```

---

### `GET /api/search?q=<termo>`

Busca mangás pelo título no mangalivre.to.

**Parâmetros:**

| Query | Tipo | Obrigatório | Descrição                |
|-------|------|-------------|--------------------------|
| `q`   | string | sim        | Título ou termo da busca |

**Resposta (200):**
```json
[
  {
    "title": "Jujutsu Kaisen Modulo",
    "url": "https://mangalivre.to/manga/jujutsu-kaisen-modulo/",
    "coverUrl": "https://mangalivre.to/wp-content/uploads/2025/11/Jujutsu-Kaisen-Modulo-193x278.webp"
  }
]
```

**Erros:**

| Status | Motivo                           |
|--------|----------------------------------|
| 400    | `q` ausente                      |
| 502    | Falha na requisição ao site fonte |

**Cache:** 5 minutos

---

### `GET /api/manga?url=<url>`

Lista os capítulos de um mangá.

**Parâmetros:**

| Query | Tipo | Obrigatório | Descrição                                     |
|-------|------|-------------|-----------------------------------------------|
| `url` | string (URL-encoded) | sim | URL completa da página do mangá |

**Resposta (200):**
```json
[
  {
    "title": "Capitulo 24",
    "url": "https://mangalivre.to/manga/jujutsu-kaisen-modulo/capitulo-24/",
    "date": "05 de março de 2026"
  },
  {
    "title": "Capitulo 23",
    "url": "https://mangalivre.to/manga/jujutsu-kaisen-modulo/capitulo-23/",
    "date": "26 de fevereiro de 2026"
  }
]
```

**Erros:**

| Status | Motivo                           |
|--------|----------------------------------|
| 400    | `url` ausente                    |
| 502    | Falha na requisição ao site fonte |

**Cache:** 60 minutos

---

### `GET /api/chapter?url=<url>`

Obtém as URLs das imagens de um capítulo.

**Parâmetros:**

| Query | Tipo | Obrigatório | Descrição                                        |
|-------|------|-------------|--------------------------------------------------|
| `url` | string (URL-encoded) | sim | URL completa da página do capítulo |

**Resposta (200):**
```json
[
  "https://mangalivre.to/wp-content/uploads/WP-manga/data/manga_69099b49a4138/a689decef3b0e04ffebf04974c801a3a/001.png",
  "https://mangalivre.to/wp-content/uploads/WP-manga/data/manga_69099b49a4138/a689decef3b0e04ffebf04974c801a3a/002.png",
  "https://mangalivre.to/wp-content/uploads/WP-manga/data/manga_69099b49a4138/a689decef3b0e04ffebf04974c801a3a/003.png"
]
```

**Erros:**

| Status | Motivo                           |
|--------|----------------------------------|
| 400    | `url` ausente                    |
| 502    | Falha na requisição ao site fonte |

**Cache:** 24 horas

---

### `GET /api/image?url=<url>`

Proxy de imagem. Serve arquivos de imagem do mangalivre.to sem bloqueio de CORS.

**Parâmetros:**

| Query | Tipo | Obrigatório | Descrição                                     |
|-------|------|-------------|-----------------------------------------------|
| `url` | string (URL-encoded) | sim | URL direta da imagem (formato .png, .jpg, .webp) |

**Headers de resposta:**
- `Content-Type`: detectado da origem (`image/webp`, `image/png`, etc.)
- `Cache-Control: public, max-age=31536000, immutable`

**Erros:**

| Status | Motivo                         |
|--------|--------------------------------|
| 400    | `url` ausente                  |
| 502    | Falha ao baixar imagem da origem |

---

## Considerações Técnicas

- **Rate limiting:** 700ms entre requisições ao site fonte
- **Cache:** em memória com TTL por endpoint
- **User-Agent:** Safari iOS (mobile) para evitar bloqueios
- **Base URL:** `https://mangalivre.to` (configurável via `BASE_URL` no `.env`)
- **Deploy:** Vercel (via `api/index.ts` exportando o app Express)

## Exemplos de Uso (cURL)

```bash
# Busca
curl "http://localhost:3001/api/search?q=jujutsu+kaisen"

# Capítulos
curl "http://localhost:3001/api/manga?url=https%3A%2F%2Fmangalivre.to%2Fmanga%2Fjujutsu-kaisen-modulo%2F"

# Páginas de um capítulo
curl "http://localhost:3001/api/chapter?url=https%3A%2F%2Fmangalivre.to%2Fmanga%2Fjujutsu-kaisen-modulo%2Fcapitulo-24%2F"

# Proxy de imagem
curl -o pagina.png "http://localhost:3001/api/image?url=https%3A%2F%2Fmangalivre.to%2Fwp-content%2Fuploads%2FWP-manga%2Fdata%2Fmanga_69099b49a4138%2Fa689decef3b0e04ffebf04974c801a3a%2F001.png"
```
