/** Whether this build is in coming-soon mode: PUBLIC_COMING_SOON=1, except
 *  in design-review builds (PUBLIC_PREVIEW=1). astro.config.mjs makes the
 *  same test on process.env, which pages cannot read. */
export const IS_COMING_SOON: boolean =
  import.meta.env.PUBLIC_COMING_SOON === "1" &&
  import.meta.env.PUBLIC_PREVIEW !== "1";
