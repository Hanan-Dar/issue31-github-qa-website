// <craeft-entrance>: items fade or rise in as the page scrolls to them. Nothing is hidden without
// the script, nothing already in view moves, and nothing moves at all for people who ask for less
// motion or in Craeft's editor (data-still). The theme styles [data-enter="wait"] (the start).
// Nothing waits forever: an item that ends up above the screen without being seen (the page jumped
// past it), or whose list is moved or taken away (Craeft's editor redrawing it, a script moving
// it), is shown at once, as is everything when someone asks for less motion meanwhile.
//
//   <craeft-entrance [data-still]> <ul><li>…</li></ul> </craeft-entrance>
import { define, still } from "./define.ts";

class CraeftEntrance extends HTMLElement {
  #observer?: IntersectionObserver;
  #motion?: MediaQueryList;

  connectedCallback() {
    if (this.#observer || still(this) || typeof IntersectionObserver === "undefined") return;
    const items = [...this.querySelectorAll<HTMLElement>("li")].filter((li) => li.getBoundingClientRect().top > innerHeight);
    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // In view, or already above it (scrolled or moved past unseen): shown.
          if (!e.isIntersecting && e.boundingClientRect.bottom > 0) continue;
          (e.target as HTMLElement).removeAttribute("data-enter");
          this.#observer?.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const li of items) {
      li.dataset.enter = "wait";
      this.#observer.observe(li);
    }
    this.#motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.#motion.addEventListener("change", this.#still);
  }

  disconnectedCallback() {
    // Moved or taken away: whatever still waits is shown (its new place starts it afresh).
    this.#reveal();
  }

  #still = () => {
    if (this.#motion?.matches) this.#reveal();
  };

  #reveal() {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#motion?.removeEventListener("change", this.#still);
    this.#motion = undefined;
    for (const li of this.querySelectorAll<HTMLElement>('[data-enter="wait"]')) li.removeAttribute("data-enter");
  }
}

define("craeft-entrance", CraeftEntrance);
