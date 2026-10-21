/**
 * Enquiry form on the contact page (contact.astro).
 *
 * The browser checks required fields before `submit` fires. The form is
 * then posted to its `action` as form data and swapped for the thank-you
 * note. Until the sending endpoint exists, `data-demo` on the form skips
 * the post, so the preview site can show the whole flow.
 */
let cleanupForm: () => void = () => {};

document.addEventListener("astro:page-load", () => {
  cleanupForm();
  cleanupForm = () => {};
  const form = document.querySelector<HTMLFormElement>("form.cf");
  const done = document.querySelector<HTMLElement>(".cf-done");
  if (!form || !done) return;
  const error = form.querySelector<HTMLElement>(".cf-error");
  const submit = form.querySelector<HTMLButtonElement>(".cf-submit");

  const finish = (demo: boolean) => {
    form.hidden = true;
    done.hidden = false;
    const note = done.querySelector<HTMLElement>(".cf-demo");
    if (note) note.hidden = !demo;
    done.focus();
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (error) error.hidden = true;
    if ("demo" in form.dataset) {
      finish(true);
      return;
    }
    if (submit) submit.disabled = true;
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      finish(false);
    } catch {
      if (error) error.hidden = false;
    } finally {
      if (submit) submit.disabled = false;
    }
  };

  form.addEventListener("submit", onSubmit);
  cleanupForm = () => form.removeEventListener("submit", onSubmit);
});
