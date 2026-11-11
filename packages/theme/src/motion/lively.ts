// "Lively": the top of the page comes in line by line, cards and list items slide in one after
// another as they scroll into view, the page scrolls smoothly, and buttons lift as you press them.
// Everything is visible without this script: it only animates what's already there.
import Lenis from "lenis";
import { animate, inView, stagger } from "motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export function start() {
  // Smooth scrolling (wheel and trackpad; touch keeps the device's own).
  const lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
  const raf = (t: number) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  // In-page links go through Lenis too, so they glide instead of jumping.
  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    const id = a?.getAttribute("href")?.slice(1);
    const to = id ? document.getElementById(id) : null;
    if (!to) return;
    e.preventDefault();
    lenis.scrollTo(to, { offset: -80 });
  });

  // The top of the page: its eyebrow, title, lead, buttons and points, one after another.
  const copy = document.querySelector(".hero-copy");
  if (copy) {
    const parts = [...copy.children] as HTMLElement[];
    animate(parts, { opacity: [0, 1], y: [28, 0] }, { duration: 0.8, delay: stagger(0.09), ease: EASE });
    const media = document.querySelector(".hero-media");
    if (media) animate(media, { opacity: [0, 1], scale: [0.94, 1] }, { duration: 1, delay: 0.25, ease: EASE });
  }

  // Each section's cards and list items, one after another, the first time they come into view.
  // (The section itself fades in with CSS; html.motion-js turns that off so the two don't stack.)
  for (const section of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
    const items = section.querySelectorAll<HTMLElement>(".card, li, .icon-tile, img, h2, .lead");
    const targets = items.length ? [...items].slice(0, 24) : [section];
    for (const t of targets) t.style.opacity = "0";
    inView(
      section,
      () => {
        animate(targets, { opacity: [0, 1], y: [24, 0] }, { duration: 0.7, delay: stagger(0.06), ease: EASE });
      },
      { amount: 0.15 },
    );
  }

  // Buttons: a small lift on hover and a press on click.
  for (const b of document.querySelectorAll<HTMLElement>(".btn")) {
    b.addEventListener("pointerenter", () => animate(b, { y: -2 }, { duration: 0.2 }));
    b.addEventListener("pointerleave", () => animate(b, { y: 0, x: 0 }, { duration: 0.3 }));
    b.addEventListener("pointerdown", () => animate(b, { scale: 0.97 }, { duration: 0.1 }));
    b.addEventListener("pointerup", () => animate(b, { scale: 1 }, { duration: 0.2 }));
  }
}
