/**
 * Behaviour of the works / research index rows (WorkCard.astro).
 */
import { navigate } from "astro:transitions/client";

// Phones and tablets (H9): tapping a row opens its details in place,
// one row at a time. Opening or closing changes the page height above
// and below, so the row the reader acted on is held in place on screen
// (Safari has no CSS scroll anchoring to do it). Wide screens (D3):
// the list keeps the left half and a pane on the right shows one row.
let cleanupList: () => void = () => {};

document.addEventListener("astro:page-load", () => {
  cleanupList();
  const list = document.querySelector<HTMLElement>(".work-list");
  if (!list) {
    cleanupList = () => {};
    return;
  }
  const root = document.documentElement;
  const wide = window.matchMedia("(min-width: 800px)");
  // The split view (D3) is in use.
  const split = () => wide.matches;

  // Wide screens lay a row's pane out only once it is warm (see
  // WorkList.css), so its photo is fetched no earlier than needed.
  const warm = (card: Element) => {
    if (card.classList.contains("is-warm")) return;
    card.classList.add("is-warm");
    // Lay the closed pane out once, so it still fades in when opened.
    void (card as HTMLElement).offsetWidth;
  };
  // Phones: a row's title opens its details in place instead of going to
  // the project, so screen readers are told it expands and whether it
  // is open. Wide screens: the title goes to the project; no state.
  const syncExpanded = (card: Element) => {
    const title = card.querySelector("h2 a");
    if (!title) return;
    if (split()) title.removeAttribute("aria-expanded");
    else
      title.setAttribute(
        "aria-expanded",
        String(card.classList.contains("is-open")),
      );
  };
  const setOpen = (card: Element, open: boolean) => {
    if (open) warm(card);
    card.classList.toggle("is-open", open);
    syncExpanded(card);
  };
  const closeAll = () => {
    list.querySelectorAll(".work-card.is-open").forEach((card) => {
      setOpen(card, false);
    });
  };
  // Run a change, then scroll so `anchor` sits where it was on screen.
  // Mark scrolls made here so the header does not react to them.
  let holdTimer = 0;
  const hold = () => {
    root.setAttribute("data-scroll-hold", "");
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(
      () => root.removeAttribute("data-scroll-hold"),
      200,
    );
  };
  const realign = (anchor: Element, top: number) => {
    const shift = anchor.getBoundingClientRect().top - top;
    if (shift !== 0) {
      hold();
      window.scrollTo({ top: window.scrollY + shift, behavior: "instant" });
    }
  };
  const keepInPlace = (anchor: Element | null, change: () => void) => {
    const before = anchor?.getBoundingClientRect().top;
    change();
    if (!anchor || before === undefined) return;
    realign(anchor, before);
  };
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Fold a row's details away over a short animation. Each frame sets
  // the details' height and the scroll position together, so `anchor`
  // stays exactly still. Near the end of the page there may be nothing
  // left to scroll; the browser then caps the scroll and the page
  // settles smoothly instead of jumping.
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const fold = (card: HTMLElement, anchor: Element | null, extra = 0) => {
    const detail = card.querySelector<HTMLElement>(".work-card-detail");
    const top = anchor?.getBoundingClientRect().top;
    const finish = () => {
      setOpen(card, false);
      card.classList.remove("is-closing", "is-handoff");
      card.style.removeProperty("height");
      card.style.removeProperty("overflow");
      detail?.removeAttribute("style");
      if (anchor && top !== undefined) {
        realign(anchor, top - extra);
      }
      // What only a closed row shows (its small photo) fades in rather
      // than appearing at once.
      if (!calm.matches) {
        card.classList.add("is-settling");
        window.setTimeout(() => card.classList.remove("is-settling"), 450);
      }
    };
    if (!detail || calm.matches) {
      finish();
      return;
    }
    // Fold the whole row from its open height to the height it will
    // have once closed (measured now, without a paint), not just the
    // details to nothing: a closed row is laid out differently (its
    // small photo returns), and the difference used to land as a jump
    // when the fold finished.
    // Closing it for the measurement shortens the page, and the
    // browser clamps the scroll to fit; put the scroll back at once.
    const startY = window.scrollY;
    const height = card.offsetHeight;
    card.classList.remove("is-open");
    const closed = card.offsetHeight;
    card.classList.add("is-open");
    if (window.scrollY !== startY) {
      hold();
      window.scrollTo({ top: startY, behavior: "instant" });
    }
    const shrink = height - closed;
    card.classList.add("is-closing");
    // "clip", not "hidden": hidden would make the row a scroll box, and
    // the sticky figure would drop to the junction mid-fold.
    card.style.overflow = "clip";
    card.style.height = `${height}px`;
    detail.style.transition = "opacity 0.2s ease-out";
    detail.style.opacity = "0";
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / 320, 1);
      const p = ease(t);
      card.style.height = `${height - shrink * p}px`;
      // Only a row below the details moves as they shrink.
      if (anchor && anchor !== card) {
        hold();
        window.scrollTo({
          top: startY - (shrink - extra) * p,
          behavior: "instant",
        });
      }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        finish();
      }
    };
    requestAnimationFrame(step);
  };

  // Phones: a row opened low on the screen would open its photo below
  // the fold. Bring it up, smoothly and in step with the opening, until
  // its title sits just under the header (or the top of the screen).
  // Rows whose photo already shows are left where they are.
  const liftFor = (card: Element) => {
    if (split()) return 0;
    const photo = card.querySelector(".work-card-big");
    if (!photo) return 0;
    const view = window.visualViewport;
    const bottom = view ? view.offsetTop + view.height : window.innerHeight;
    if (photo.getBoundingClientRect().bottom <= bottom - 16) return 0;
    const header = document.querySelector("header");
    const under = header
      ? Math.max(0, header.getBoundingClientRect().bottom)
      : 0;
    return Math.max(0, card.getBoundingClientRect().top - (under + 8));
  };
  const glide = (dy: number) => {
    if (dy <= 0) return;
    const startY = window.scrollY;
    if (calm.matches) {
      hold();
      window.scrollTo({ top: startY + dy, behavior: "instant" });
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / 450, 1);
      hold();
      window.scrollTo({ top: startY + dy * ease(t), behavior: "instant" });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // D3: set while the figure walks to a tapped row on its way in.
  let going = false;
  // Whether the click about to come was a finger or pen, not a mouse
  // or a key.
  let touched = false;
  const onDown = (event: PointerEvent) => {
    touched = event.pointerType !== "mouse";
  };
  const onClick = (event: MouseEvent) => {
    const wasTouch = touched;
    touched = false;
    const target = event.target as Element;
    if (target.closest(".work-card-cap")) {
      // Closing with the figure: hold the next row still so
      // the details fold up into their row just above the finger. The
      // last row has nothing below it, so it holds itself instead.
      const card = target.closest<HTMLElement>(".work-card");
      if (!card || card.classList.contains("is-closing")) return;
      fold(card, card.nextElementSibling ?? card);
      return;
    }
    // H9: the figure walks into the project before the page changes:
    // to "View project" at the foot, or, from the photo or the "View
    // project" by the facts, out along its line to the right.
    const view = target.closest<HTMLAnchorElement>(
      ".work-card-detail .work-card-more, .work-card-detail .work-card-big",
    );
    if (view && !split() && !calm.matches) {
      const cap = view
        .closest(".work-card")
        ?.querySelector<HTMLElement>(".work-card-cap");
      if (cap && !cap.classList.contains("is-leaving")) {
        event.preventDefault();
        // It walks to "View project" at the foot, to just before its
        // words, whichever way in was tapped.
        const card = view.closest(".work-card");
        const sign = card?.querySelector<HTMLElement>(
          ".work-card-actions > .work-card-more",
        );
        // The way a person would walk it: up the route first, then
        // right along the line to the sign, at one steady pace. The
        // sign stands on the line under it, so the figure keeps to that
        // line instead of rising to the words.
        const c = cap.getBoundingClientRect();
        const t = sign?.getBoundingClientRect();
        const line = sign?.closest(".work-card-actions");
        const y = line ? line.getBoundingClientRect().bottom : 0;
        const dx = t ? t.left - c.right : 0;
        const dy = t ? y - (c.top + c.height / 2) : 0;
        const run = Math.abs(dx) + Math.abs(dy);
        const time = Math.min(1100, Math.max(600, run * 1.6));
        cap.classList.add("is-leaving");
        cap.animate(
          [
            { transform: "translate(0, 0)" },
            {
              transform: `translate(0, ${dy}px)`,
              offset: run ? Math.abs(dy) / run : 0,
            },
            { transform: `translate(${dx}px, ${dy}px)` },
          ],
          { duration: time, easing: "linear", fill: "forwards" },
        );
        const stepper = window.setInterval(
          () => cap.classList.toggle("is-step"),
          120,
        );
        window.setTimeout(() => {
          window.clearInterval(stepper);
          navigate(view.href);
        }, time + 50);
        return;
      }
    }
    // Links inside the open details navigate as usual.
    if (target.closest(".work-card-detail")) return;
    const card = target.closest(".work-card");
    if (!card) return;
    event.preventDefault();
    // D3: the whole row is the way into its project. A row not yet in
    // the pane shows first. With a mouse (the pointer usually showed it
    // already) the page then changes, once the figure has walked to it. A touch screen has no hover, so there the first
    // tap only shows the row, and a tap on the shown row goes in.
    if (split()) {
      const href = card.querySelector<HTMLAnchorElement>("h2 a")?.href;
      if (!href || going) return;
      if (
        card.classList.contains("is-open") &&
        !list.classList.contains("is-idle")
      ) {
        navigate(href);
        return;
      }
      closeAll();
      setOpen(card, true);
      list.classList.remove("is-idle");
      if (wasTouch) return;
      if (calm.matches) {
        navigate(href);
        return;
      }
      going = true;
      window.setTimeout(() => navigate(href), 650);
      return;
    }
    const open = !card.classList.contains("is-open");
    // A row further down the route: the open row above folds away over
    // the same short animation as Close, the tapped row held still,
    // instead of everything above it changing at once.
    const prev = list.querySelector<HTMLElement>(
      ".work-card.is-open:not(.is-closing)",
    );
    if (
      open &&
      prev &&
      prev !== card &&
      prev.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      prev.classList.add("is-handoff");
      setOpen(card, true);
      fold(prev, card, liftFor(card));
      onPlace();
      return;
    }
    // Hold the tapped row still while any other open row folds away.
    keepInPlace(card, () => {
      closeAll();
      setOpen(card, open);
    });
    if (open) glide(liftFor(card));
    if (open) onPlace();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !split()) closeAll();
  };

  // H9: the figure is sticky (CSS), so it rides the lit line with the
  // scroll itself, with no lag. Only its distance from the bottom is
  // set here: 20px above the visible bottom of the screen, which on
  // iPhone sits above Safari's toolbar while that is showing. That
  // changes only when the toolbar comes or goes, not on every scroll.
  const placeCap = () => {
    const view = window.visualViewport;
    const hidden = view
      ? Math.max(
          0,
          document.documentElement.clientHeight -
            (view.offsetTop + view.height),
        )
      : 0;
    list.style.setProperty("--cap-gap", `${Math.round(hidden) + 20}px`);
  };
  let placing = false;
  const onPlace = () => {
    if (placing) return;
    placing = true;
    requestAnimationFrame(() => {
      placing = false;
      placeCap();
    });
  };

  // H9: the figure steps while the page scrolls and faces the way it
  // is going; it stands still again shortly after scrolling stops.
  // It turns only for the reader's own scrolling: not for the scrolls
  // made here to hold a row still (data-scroll-hold), not for iOS
  // springing back past either end, and not for a pixel of jitter.
  const TURN = 6;
  const scrollPos = () =>
    Math.min(
      Math.max(window.scrollY, 0),
      document.documentElement.scrollHeight - window.innerHeight,
    );
  let walkY = scrollPos();
  let walkLast = 0;
  let walkIdle = 0;
  const onWalk = () => {
    if (calm.matches) return;
    const y = scrollPos();
    const cap = list.querySelector<HTMLElement>(
      ".work-card.is-open:not(.is-closing) .work-card-cap",
    );
    if (!cap || root.hasAttribute("data-scroll-hold")) {
      walkY = y;
      return;
    }
    if (y === walkY) return;
    if (Math.abs(y - walkY) >= TURN) {
      cap.classList.toggle("is-left", y < walkY);
      walkY = y;
    }
    const now = performance.now();
    if (now - walkLast > 140) {
      cap.classList.toggle("is-step");
      walkLast = now;
    }
    window.clearTimeout(walkIdle);
    walkIdle = window.setTimeout(() => cap.classList.remove("is-step"), 180);
  };

  // D3: pointing at a row shows it in the pane; the first row shows
  // until then.
  const showFirst = () => {
    if (!split()) return;
    if (!list.querySelector(".work-card.is-open")) {
      const first = list.querySelector(".work-card");
      if (first) setOpen(first, true);
    }
  };
  // A row takes the pane only once the pointer rests on it a moment,
  // and not while the pointer is heading right, toward the photo, so
  // crossing other rows on the way there does not swap it.
  let hoverTimer = 0;
  let hoverCard: Element | null = null;
  let lastX = 0;
  let lastY = 0;
  const swapLater = () => {
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      if (!hoverCard || going) return;
      closeAll();
      setOpen(hoverCard, true);
      list.classList.remove("is-idle");
      hoverCard = null;
    }, 130);
  };
  const onHover = (event: PointerEvent) => {
    if (!split() || event.pointerType !== "mouse") return;
    window.clearTimeout(hoverTimer);
    const card = (event.target as Element).closest(".work-card");
    // Start fetching its photo now, before the row takes the pane.
    if (card) warm(card);
    hoverCard =
      card &&
      (!card.classList.contains("is-open") ||
        list.classList.contains("is-idle"))
        ? card
        : null;
    if (hoverCard) swapLater();
  };
  const onAim = (event: PointerEvent) => {
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    if (hoverCard && dx > 0 && dx > Math.abs(dy) * 0.5) swapLater();
  };
  const onLeave = () => {
    window.clearTimeout(hoverTimer);
    hoverCard = null;
  };
  // Keyboard: tabbing to a row's title shows it in the pane, as pointing
  // at it does. Only keyboard focus (:focus-visible) counts; a mouse
  // click also focuses the link, and onClick handles that.
  const onFocus = (event: FocusEvent) => {
    if (!split() || going) return;
    const target = event.target as Element;
    if (!target.matches(":focus-visible")) return;
    const card = target.closest(".work-card");
    if (!card) return;
    if (
      card.classList.contains("is-open") &&
      !list.classList.contains("is-idle")
    )
      return;
    window.clearTimeout(hoverTimer);
    closeAll();
    setOpen(card, true);
    list.classList.remove("is-idle");
  };

  // D3: one figure for the whole list, moved along the route to
  // the open row; it steps while moving and faces up or down.
  const walker = document.createElement("span");
  walker.className = "work-walker-d2";
  walker.setAttribute("aria-hidden", "true");
  const svg = list.querySelector(".work-card-cap .work-card-walker");
  if (svg) walker.append(svg.cloneNode(true));
  list.append(walker);
  let walkerY: number | null = null;
  let stepTimer = 0;
  let stopTimer = 0;
  let boredTimer = 0;
  const placeWalker = () => {
    const card = list.querySelector<HTMLElement>(".work-card.is-open");
    const num = card?.querySelector<HTMLElement>(".work-card-num");
    if (!split() || !card || !num) return;
    // Measured from where the row sits in the layout (offsetTop), not
    // where it is drawn: rows rise into place as the page opens
    // (Reveal), and the figure should neither ride nor walk that rise.
    const c = card.getBoundingClientRect();
    const n = num.getBoundingClientRect();
    const half = walker.offsetWidth / 2;
    const x = card.offsetLeft + n.left - c.left + n.width / 2 - half;
    // Idle: at the start of the route, where the line begins (the CSS
    // starts it 0.75rem above the first row).
    const rem = parseFloat(getComputedStyle(root).fontSize);
    const idle = list.classList.contains("is-idle");
    const y = idle
      ? card.offsetTop - 0.75 * rem - half
      : card.offsetTop + n.top - c.top + n.height / 2 - half;
    walker.style.setProperty("--wx", `${x}px`);
    walker.style.setProperty("--wy", `${y}px`);
    if (walkerY !== null && y !== walkerY && !idle && !calm.matches) {
      window.clearTimeout(boredTimer);
      walker.classList.remove("is-bored");
      walker.classList.toggle("is-left", y < walkerY);
      window.clearInterval(stepTimer);
      walker.classList.add("is-step");
      stepTimer = window.setInterval(
        () => walker.classList.toggle("is-step"),
        130,
      );
      // Once it arrives it turns back to face the project on the right,
      // and if no one goes in for a while it squats there and draws.
      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(() => {
        window.clearInterval(stepTimer);
        walker.classList.remove("is-step", "is-left");
        boredTimer = window.setTimeout(
          () => walker.classList.add("is-bored"),
          5000,
        );
      }, 600);
    }
    walkerY = y;
  };
  const watchOpen = new MutationObserver(() => {
    placeWalker();
  });
  watchOpen.observe(list, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener("resize", placeWalker);

  // Arriving on the page (or coming back to it), the open row and the
  // figure are set in place at once; only later changes animate.
  // Crossing 800px (an iPad turned on its side) starts the list over as
  // on arrival in the new layout: every row closed and, on wide screens,
  // the first project in the pane with the figure waiting at the start.
  const arrange = () => {
    list.setAttribute("data-still", "");
    closeAll();
    list.classList.toggle("is-idle", split());
    showFirst();
    list.querySelectorAll(".work-card").forEach(syncExpanded);
    placeWalker();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => list.removeAttribute("data-still")),
    );
  };
  arrange();
  wide.addEventListener("change", arrange);
  list.addEventListener("pointerover", onHover);
  list.addEventListener("pointerleave", onLeave);
  list.addEventListener("focusin", onFocus);
  list.addEventListener("pointermove", onAim, { passive: true });
  window.addEventListener("scroll", onWalk, { passive: true });
  window.visualViewport?.addEventListener("resize", onPlace);
  window.visualViewport?.addEventListener("scroll", onPlace);
  list.addEventListener("pointerdown", onDown, { passive: true });
  list.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  document.addEventListener("astro:before-swap", closeAll, { once: true });
  cleanupList = () => {
    list.removeEventListener("pointerover", onHover);
    list.removeEventListener("pointerleave", onLeave);
    list.removeEventListener("focusin", onFocus);
    list.removeEventListener("pointermove", onAim);
    window.clearTimeout(hoverTimer);
    watchOpen.disconnect();
    window.removeEventListener("resize", placeWalker);
    window.clearInterval(stepTimer);
    window.clearTimeout(stopTimer);
    window.clearTimeout(boredTimer);
    walker.remove();
    wide.removeEventListener("change", arrange);
    window.removeEventListener("scroll", onWalk);
    window.visualViewport?.removeEventListener("resize", onPlace);
    window.visualViewport?.removeEventListener("scroll", onPlace);
    list.removeEventListener("pointerdown", onDown);
    list.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
  };
});
