/** Site-wide constants — single source of truth for values used across components. */

export const SITE_TITLE = "CC Space";
export const SITE_DESCRIPTION = "Interior design studio.";
export const SITE_AUTHOR = "CC Space";

/** Page language and its OpenGraph locale. The content is written in
 *  English; switch both to "zh-Hant" / "zh_TW" if it moves to Chinese. */
export const SITE_LANG = "en";
export const SITE_LOCALE = "en_US";

/** Studio name shown in the footer copyright notice. */
export const SITE_COPYRIGHT_OWNER = "CC Space";

/** Social media links. */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/ccspace.tw/",
} as const;

/** Main navigation, shared by the desktop header and the mobile menu. */
export const NAV_LINKS = [
  { label: "Works", href: "/works/" },
  { label: "Research", href: "/research/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
] as const;
