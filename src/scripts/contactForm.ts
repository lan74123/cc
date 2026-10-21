/**
 * Enquiry form on the contact page (contact.astro).
 *
 * The browser checks required fields before `submit` fires. The form is
 * then posted to its `action` (the Worker, src/index.ts) as form data,
 * with the Turnstile token the widget adds, and swapped for the
 * thank-you note.
 */
interface Turnstile {
  render(
    el: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark";
      appearance?: "always" | "execute" | "interaction-only";
      "before-interactive-callback"?: () => void;
      "after-interactive-callback"?: () => void;
    },
  ): string;
  reset(id: string): void;
  remove(id: string): void;
}

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// Cloudflare's always-pass test key: the real key is not allowed on
// localhost, where dev and the test suite run.
const TEST_SITEKEY = "1x00000000000000000000AA";

// The script is loaded once and kept across ClientRouter swaps; each
// visit to the page renders a fresh widget explicitly.
let turnstileReady: Promise<Turnstile> | undefined;
const loadTurnstile = (): Promise<Turnstile> => {
  turnstileReady ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.onload = () => {
      const t = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (t) resolve(t);
      else reject(new Error("turnstile missing"));
    };
    script.onerror = () => {
      turnstileReady = undefined;
      reject(new Error("turnstile failed to load"));
    };
    document.head.append(script);
  });
  return turnstileReady;
};

let cleanupForm: () => void = () => {};

document.addEventListener("astro:page-load", () => {
  cleanupForm();
  cleanupForm = () => {};
  const form = document.querySelector<HTMLFormElement>("form.cf");
  const done = document.querySelector<HTMLElement>(".cf-done");
  if (!form || !done) return;
  const error = form.querySelector<HTMLElement>(".cf-error");
  const submit = form.querySelector<HTMLButtonElement>(".cf-submit");
  const box = form.querySelector<HTMLElement>(".cf-turnstile");

  let turnstile: Turnstile | undefined;
  let widget: string | undefined;
  let gone = false;
  const dark = () => document.documentElement.classList.contains("dark");
  let renderedDark = dark();
  // Shown only when Cloudflare wants a click (interaction-only); most
  // visitors never see it. Drawn in the site's current theme, so it is
  // drawn again when the theme changes.
  const render = () => {
    if (!box || !turnstile) return;
    if (widget) turnstile.remove(widget);
    box.classList.remove("is-shown");
    renderedDark = dark();
    const local = ["localhost", "127.0.0.1"].includes(location.hostname);
    widget = turnstile.render(box, {
      sitekey: local ? TEST_SITEKEY : (box.dataset.sitekey ?? ""),
      theme: renderedDark ? "dark" : "light",
      appearance: "interaction-only",
      "before-interactive-callback": () => box.classList.add("is-shown"),
      "after-interactive-callback": () => box.classList.remove("is-shown"),
    });
  };
  const themeWatch = new MutationObserver(() => {
    if (dark() !== renderedDark) render();
  });
  if (box) {
    loadTurnstile()
      .then((t) => {
        if (gone) return;
        turnstile = t;
        render();
        themeWatch.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      })
      .catch(() => {
        if (error) error.hidden = false;
      });
  }

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (error) error.hidden = true;
    if (submit) submit.disabled = true;
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      form.hidden = true;
      done.hidden = false;
      done.focus();
    } catch {
      if (error) error.hidden = false;
      // A token is good for one check; get a new one for the retry.
      if (turnstile && widget) turnstile.reset(widget);
    } finally {
      if (submit) submit.disabled = false;
    }
  };

  form.addEventListener("submit", onSubmit);
  cleanupForm = () => {
    gone = true;
    themeWatch.disconnect();
    form.removeEventListener("submit", onSubmit);
    if (turnstile && widget) turnstile.remove(widget);
  };
});
