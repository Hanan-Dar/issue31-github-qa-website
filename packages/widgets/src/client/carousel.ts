// <craeft-carousel>: a CSS scroll-snap list (it scrolls with no script at all) given arrows, dots and,
// only when a site turns it on, autoplay with a pause button (WCAG 2.2.2). Autoplay stops on hover,
// on focus, for people who ask for less motion, and in Craeft's editor (data-still). Starts itself
// when it appears, so it works after the editor swaps a section's HTML.
//
// Markup (the theme draws it):
//   <craeft-carousel data-autoplay="5" data-end="stop|start" data-scroll="item|view" [data-still]>
//     <ul data-track>…<li>…</li></ul>
//     <button data-prev hidden> <button data-next hidden>
//     <div data-dots hidden><button data-dot>…</div> or <p data-count hidden>
//     <button data-pause hidden><span data-pause-label>Pause</span></button>
//   </craeft-carousel>
import { define, still } from "./define.ts";

class CraeftCarousel extends HTMLElement {
  #timer = 0;
  #paused = false;
  #held = { hover: false, focus: false };
  #ready = false;
  #off: (() => void)[] = [];

  get #track() {
    return this.querySelector<HTMLElement>("[data-track]");
  }
  get #items() {
    return [...(this.#track?.children ?? [])] as HTMLElement[];
  }

  connectedCallback() {
    if (this.#ready) return;
    const track = this.#track;
    if (!track) return;
    this.#ready = true;
    // The controls only while there's something to scroll to (two posts in a row of three need none).
    this.#fit();
    const seen = new ResizeObserver(() => this.#fit());
    seen.observe(track);
    this.#off.push(() => seen.disconnect());
    this.#on(this, "click", (e) => {
      const b = (e.target as Element).closest("button");
      if (!b || !this.contains(b)) return;
      if (b.matches("[data-prev]")) this.step(-1);
      else if (b.matches("[data-next]")) this.step(1);
      else if (b.matches("[data-dot]")) this.go(Number(b.dataset.dot));
      else if (b.matches("[data-pause]")) this.#pause(!this.#paused);
    });
    this.#on(track, "keydown", (e) => {
      const k = (e as KeyboardEvent).key;
      const by = k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0;
      if (k === "Home" || k === "End") {
        e.preventDefault();
        this.go(k === "Home" ? 0 : this.#items.length - 1);
      } else if (by) {
        e.preventDefault();
        this.step(by);
      }
    });
    let frame = 0;
    this.#on(track, "scroll", () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => this.#mark());
    });
    // Hover and focus hold autoplay; leaving lets it go on (unless paused by the button).
    this.#on(this, "mouseenter", () => this.#hold("hover", true));
    this.#on(this, "mouseleave", () => this.#hold("hover", false));
    this.#on(this, "focusin", () => this.#hold("focus", true));
    this.#on(this, "focusout", (e) => this.#hold("focus", this.contains((e as FocusEvent).relatedTarget as Node | null)));
  }

  disconnectedCallback() {
    clearInterval(this.#timer);
    for (const off of this.#off) off();
    this.#off = [];
    this.#ready = false;
  }

  /** Shows the controls when the items don't all fit, hides them (and stops autoplay) when they do. */
  #fit() {
    const t = this.#track;
    const scrolls = !!t && t.scrollWidth > t.clientWidth + 2;
    for (const el of this.querySelectorAll<HTMLElement>("[data-prev], [data-next], [data-dots], [data-count], [data-pause]"))
      el.hidden = !scrolls;
    this.toggleAttribute("data-fits", !scrolls);
    this.#mark();
    this.#tick();
  }

  #hold(why: "hover" | "focus", on: boolean) {
    this.#held[why] = on;
    this.#tick();
  }

  #on(el: EventTarget, type: string, f: (e: Event) => void) {
    el.addEventListener(type, f);
    this.#off.push(() => el.removeEventListener(type, f));
  }

  /** The first item fully or mostly in view. */
  get index(): number {
    const track = this.#track;
    if (!track) return 0;
    const left = track.getBoundingClientRect().left;
    let best = 0;
    let gap = Infinity;
    this.#items.forEach((li, i) => {
      const d = Math.abs(li.getBoundingClientRect().left - left);
      if (d < gap) [best, gap] = [i, d];
    });
    return best;
  }

  /** How many items show at once (at least one). */
  get #inView(): number {
    const track = this.#track;
    const first = this.#items[0];
    if (!track || !first) return 1;
    return Math.max(1, Math.floor((track.clientWidth + 1) / first.getBoundingClientRect().width));
  }

  get #atEnd(): boolean {
    const t = this.#track;
    return !t || t.scrollLeft + t.clientWidth >= t.scrollWidth - 2;
  }

  go(i: number) {
    const track = this.#track;
    const items = this.#items;
    const li = items[Math.max(0, Math.min(items.length - 1, i))];
    if (!track || !li) return;
    const left = li.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    track.scrollTo({ left, behavior: still(this) ? "auto" : "smooth" });
  }

  step(by: number) {
    const n = this.dataset.scroll === "view" ? this.#inView : 1;
    if (by > 0 && this.#atEnd) {
      if (this.dataset.end === "start") this.go(0);
      return;
    }
    this.go(this.index + by * n);
  }

  #mark() {
    const i = this.index;
    for (const dot of this.querySelectorAll<HTMLElement>("[data-dot]"))
      dot.setAttribute("aria-current", String(Number(dot.dataset.dot) === i));
    const count = this.querySelector("[data-count-now]");
    if (count) count.textContent = String(i + 1);
    const prev = this.querySelector<HTMLButtonElement>("[data-prev]");
    const next = this.querySelector<HTMLButtonElement>("[data-next]");
    const t = this.#track;
    if (prev) prev.disabled = !t || t.scrollLeft <= 2;
    if (next) next.disabled = this.#atEnd && this.dataset.end !== "start";
  }

  #pause(paused: boolean) {
    this.#paused = paused;
    const b = this.querySelector<HTMLElement>("[data-pause]");
    const label = this.querySelector<HTMLElement>("[data-pause-label]");
    if (label) label.textContent = paused ? (b?.dataset.play ?? "Play") : (b?.dataset.pauseText ?? "Pause");
    this.#tick();
  }

  /** Autoplay runs only when turned on, not paused, not held, and motion is allowed. */
  #tick() {
    clearInterval(this.#timer);
    const every = Number(this.dataset.autoplay) || 0;
    if (every < 3 || this.#paused || this.#held.hover || this.#held.focus || still(this) || this.hasAttribute("data-fits")) return;
    this.#timer = window.setInterval(() => {
      if (this.#atEnd && this.dataset.end !== "start") return this.#pause(true);
      this.step(1);
    }, every * 1000);
  }
}

define("craeft-carousel", CraeftCarousel);
