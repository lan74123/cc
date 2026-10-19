// Pages the specs visit. Only real content is listed: the `sample-*`
// placeholder works exist in dev and preview builds only, so the suite
// passes against a production build as well.
export const INDEX_PAGES = ["/works/", "/research/"];
export const PROJECT_PAGE = "/works/daliao/";
export const RESEARCH_PAGE = "/research/daliao-case-study/";
export const TAGS_PAGE = "/works/tags/";
export const TAG_PAGE = "/works/tags/home/";
export const ALL_PAGES = [
  ...INDEX_PAGES,
  PROJECT_PAGE,
  RESEARCH_PAGE,
  TAGS_PAGE,
  TAG_PAGE,
  "/about/",
  "/contact/",
];
