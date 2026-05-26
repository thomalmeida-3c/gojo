export const SELECTORS = {
  search: {
    container: ".c-tabs-item__content",
    title: ".post-title h3 a",
    cover: ".tab-thumb img",
  },
  manga: {
    chapterContainer: ".listing-chapters-wrap .chapter-box",
    chapterLink: "a",
    chapterDate: ".chapter-date",
  },
  chapter: {
    pageImage: "img.wp-manga-chapter-img",
  },
} as const;
