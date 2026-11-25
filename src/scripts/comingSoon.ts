// The coming-soon page's figure (ComingSoon.astro). It fetches each piece
// of furniture from the left end of the route, carries it to its spot and
// puts it down; admires the room (♪); dozes off in the chair after 20 s
// with no pointer or key activity; then clears the room and starts again.
// When the theme changes (ThemeToggle.astro + theme.ts) it walks over and
// switches the floor lamp, fetching the lamp first if the theme turned dark
// before it was out. Poked, it hops, or gets cross if its hands are full;
// a poke or any movement wakes it.
//
// Frames run on setTimeout, not requestAnimationFrame, which can stall in
// embedded previews and background tabs and froze the figure mid-carry.
// If the loop throws, it tidies up and starts again a second later.

const ANGRY =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8a8.4 8.4 0 1 1-5.6 14.7L3.2 20.6l1.1-4.4A8.4 8.4 0 0 1 12 2.8z"/><path d="M7.8 9.8Q10.6 9.8 10.6 7M16.2 9.8Q13.4 9.8 13.4 7M7.8 12.6Q10.6 12.6 10.6 15.4M16.2 12.6Q13.4 12.6 13.4 15.4"/></svg>';
const HOME = 3; // pick-up spot (%)
const IDLE_MS = 20000; // no activity for this long: go to sleep

type Pose = "stand" | "walk" | "bend" | "sit" | "lean";

/** Thrown inside the loop once the page is left, to unwind it quietly. */
class Stopped extends Error {}

let cleanup: () => void = () => {};

function start(): void {
  cleanup();
  cleanup = () => {};

  const route = document.getElementById("cs-route");
  const actor = document.getElementById("cs-actor");
  const bubble = document.getElementById("cs-bubble");
  const items = route
    ? [...route.querySelectorAll<HTMLElement>(".cs-item")]
    : [];
  const lamp = route?.querySelector<HTMLElement>(".cs-lamp");
  const chair = items[0];
  if (!route || !actor || !bubble || !lamp || !chair) return;

  const root = document.documentElement;
  const isDark = (): boolean => root.classList.contains("dark");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let stopped = false;
  let pos = 8;
  let facing = 1;
  let held: HTMLElement | null = null;
  let poseName: Pose = "stand";
  let lampTask = false;
  let sleeping = false;
  let wake: (() => void) | null = null;
  let looking = false;
  let lastSeen = performance.now();
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const later = (fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!stopped) fn();
    }, ms);
    timers.add(id);
  };
  const wait = (ms: number): Promise<void> =>
    new Promise((resolve, reject) =>
      later(() => (stopped ? reject(new Stopped()) : resolve()), ms),
    );
  const pct = (px: number): number => (px / route.offsetWidth) * 100;
  const slot = (it: HTMLElement): number => Number(it.dataset.slot);
  const pose = (p: Pose): void => {
    poseName = p;
    actor.dataset.pose = p;
    if (p !== "walk") actor.classList.remove("is-step");
  };
  const face = (d: number): void => {
    facing = d;
    actor.classList.toggle("is-left", d < 0);
  };
  const size = (it: HTMLElement): [number, number] => {
    const v = it.querySelector("svg");
    return [
      Number(v?.getAttribute("width")),
      Number(v?.getAttribute("height")),
    ];
  };
  // How far ahead of centre an item sits: lamps are gripped by the pole,
  // everything else is held against its near edge.
  const reach = (it: HTMLElement): number =>
    it === lamp ? 15 : 12 + size(it)[0] / 2;
  // Held items sit at hand height and bob a pixel with each step.
  const draw = (): void => {
    actor.style.left = `${pos}%`;
    actor.classList.toggle("is-carry", !!held);
    if (held) {
      held.style.left = `calc(${pos}% + ${facing * reach(held)}px)`;
      const step = actor.classList.contains("is-step") ? 1 : 0;
      held.style.bottom = `${Math.max(3, 17 - size(held)[1] / 2) + step}px`;
    }
  };
  const say = (text: string, html = false, side = false): void => {
    bubble.className = side ? "cs-bubble is-side" : "cs-bubble";
    if (html) bubble.innerHTML = text;
    else bubble.textContent = text;
    void bubble.offsetWidth;
    bubble.classList.add("is-pop");
  };
  const lampOn = (): boolean =>
    lamp.classList.contains("is-on") && !lamp.classList.contains("is-held");

  // Walk to p (%). Resolves "lamp" early if the theme changed mid-walk.
  const walkTo = (p: number, interruptible = true): Promise<"ok" | "lamp"> =>
    new Promise((done, fail) => {
      if (Math.abs(p - pos) < 0.2) return done("ok");
      face(Math.sign(p - pos));
      pose("walk");
      let last = performance.now();
      let t = 0;
      const tick = (): void => {
        try {
          const now = performance.now();
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          if (interruptible && lampTask) {
            pose("stand");
            return done("lamp");
          }
          pos += facing * pct(held ? 42 : 62) * dt;
          if ((facing > 0 && pos >= p) || (facing < 0 && pos <= p)) {
            pos = p;
            pose("stand");
            draw();
            return done("ok");
          }
          t += dt;
          if (t > (held ? 0.22 : 0.17)) {
            actor.classList.toggle("is-step");
            t = 0;
          }
          draw();
          later(tick, 16);
        } catch (e) {
          fail(e);
        }
      };
      later(tick, 16);
    });
  const go = async (p: number): Promise<void> => {
    while ((await walkTo(p)) === "lamp") await doLamp();
  };

  // Theme changed: walk over and switch the lamp (if it is out yet).
  async function doLamp(): Promise<void> {
    lampTask = false;
    if (!lampOn()) {
      lamp!.classList.remove("is-lit");
      return;
    }
    await walkTo(slot(lamp!) - pct(reach(lamp!)), false);
    face(1);
    pose("stand");
    await wait(250);
    actor!.classList.add("is-jump");
    await wait(250);
    lamp!.classList.toggle("is-lit", isDark());
    say(isDark() ? "✦" : "☀");
    await wait(300);
    actor!.classList.remove("is-jump");
  }
  function onTheme(): void {
    if (reduce || sleeping) {
      lamp!.classList.toggle("is-lit", isDark() && lampOn());
      return;
    }
    lampTask = true;
  }

  async function furnish(item: HTMLElement): Promise<void> {
    await go(HOME);
    face(1);
    pose("bend");
    await wait(350);
    held = item;
    item.classList.remove("is-fading");
    item.classList.add("is-on", "is-held");
    draw();
    await wait(250);
    pose("stand");
    draw();
    await wait(200);
    await go(slot(item) - pct(reach(item)));
    face(1);
    draw();
    await wait(150);
    pose("bend");
    await wait(150);
    item.classList.remove("is-held");
    item.style.bottom = "";
    held = null;
    draw();
    if (item === lamp) lamp.classList.toggle("is-lit", isDark());
    await wait(450);
    pose("stand");
    if (lampTask) await doLamp();
  }

  // Nobody around: go and doze off in the chair.
  async function sleep(): Promise<void> {
    sleeping = true;
    looking = false;
    await walkTo(slot(chair!) + pct(1), false);
    face(1);
    pose("sit");
    bubble!.className = "cs-bubble is-zzz";
    bubble!.textContent = "z z z";
    await new Promise<void>((resolve) => (wake = resolve));
    if (stopped) throw new Stopped();
    sleeping = false;
    wake = null;
    bubble!.className = "cs-bubble";
    // Wake with a start, then push up off the seat and step clear of it.
    say("!");
    await wait(600);
    pose("lean");
    await wait(350);
    pose("stand");
    for (let k = 0; k < 8; k++) {
      pos += pct(1);
      draw();
      await wait(30);
    }
    await wait(500);
  }

  async function loop(): Promise<never> {
    const pick = (): HTMLElement | undefined =>
      isDark() && !lamp!.classList.contains("is-on")
        ? lamp!
        : items.find((x) => !x.classList.contains("is-on"));
    for (;;) {
      for (let it = pick(); it; it = pick()) await furnish(it);
      await go(9);
      face(1);
      looking = true;
      say("♪");
      await wait(4000);
      if (performance.now() - lastSeen > IDLE_MS) await sleep();
      else await wait(2500);
      looking = false;
      pose("stand");
      for (const it of items) {
        if (it === lamp && isDark()) continue; // keep the light on at night
        it.classList.add("is-fading");
        it.classList.remove("is-on", "is-lit");
        await wait(250);
      }
      await wait(800);
    }
  }

  // Interaction: look at the pointer; poke it to make it hop, unless its
  // hands are full (then it gets cross); poking a sleeper wakes it.
  const seen = (): void => {
    lastSeen = performance.now();
    wake?.();
  };
  const onMove = (e: PointerEvent): void => {
    seen();
    if (looking && !sleeping) {
      const r = actor.getBoundingClientRect();
      face(e.clientX < r.left + r.width / 2 ? -1 : 1);
    }
  };
  const onPoke = (): void => {
    if (sleeping) return seen();
    seen();
    if (held || poseName === "bend") return say(ANGRY, true, true);
    say("!");
    actor.classList.remove("is-jump");
    void actor.offsetWidth;
    actor.classList.add("is-jump");
    later(() => actor.classList.remove("is-jump"), 500);
  };

  // The theme toggle flips `dark` on <html> (theme.ts); watch for that.
  let dark = isDark();
  const themeWatch = new MutationObserver(() => {
    if (isDark() === dark) return;
    dark = isDark();
    onTheme();
  });
  themeWatch.observe(root, { attributes: true, attributeFilter: ["class"] });

  cleanup = () => {
    stopped = true;
    timers.forEach(clearTimeout);
    timers.clear();
    wake?.();
    themeWatch.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("keydown", seen);
    actor.removeEventListener("click", onPoke);
  };

  if (reduce) {
    items.forEach((it) => {
      it.classList.add("is-on");
      it.style.left = `${slot(it)}%`;
    });
    lamp.classList.toggle("is-lit", isDark());
    pos = 9;
    pose("stand");
    draw();
    return;
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("keydown", seen);
  actor.addEventListener("click", onPoke);

  // Restart after an error: drop whatever was in hand, stand up, go on.
  const run = (): void => {
    loop().catch((e: unknown) => {
      if (stopped || e instanceof Stopped) return;
      console.error(e);
      if (held) {
        held.classList.remove("is-held");
        held.style.bottom = "";
        held = null;
      }
      lampTask = false;
      sleeping = false;
      looking = false;
      wake = null;
      bubble.className = "cs-bubble";
      pose("stand");
      draw();
      later(run, 1000);
    });
  };
  pose("stand");
  draw();
  run();
}

document.addEventListener("astro:page-load", start);
