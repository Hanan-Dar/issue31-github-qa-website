// <craeft-lightbox>: a gallery's pictures opened large over the page, in a modal <dialog> the theme
// draws (so it looks like the site). Arrows (buttons and the arrow keys), swipe, Esc, a caption and
// "3 of 12"; the dialog keeps the focus inside while open and gives it back to the picture shown
// when it closes. A video plays in it (YouTube without cookies, Vimeo without tracking) and stops
// when it closes. With no script every picture is a plain link to itself. Starts itself when it
// appears, so it works after the editor swaps a section's HTML. Pictures a filter has left out
// (an item with data-off) are skipped.
//
// Markup (the theme draws it):
//   <craeft-lightbox>
//     … <a href="/media/a.jpg" data-lightbox-item [data-caption="…"] [data-video="https://…embed…"]><img alt="…"></a> …
//     <dialog data-lightbox aria-label="…">
//       <div data-lightbox-stage></div> <p data-lightbox-caption></p> <p data-lightbox-count data-of="of"></p>
//       <button data-lightbox-close> <button data-lightbox-prev> <button data-lightbox-next>
//     </dialog>
//   </craeft-lightbox>
import { define } from "./define.ts";

class CraeftLightbox extends HTMLElement {
  #ready = false;
  #at = 0;
  #dialog: HTMLDialogElement | null = null;
  #off: (() => void)[] = [];

  connectedCallback() {
    if (this.#ready) return;
    const dialog = this.querySelector<HTMLDialogElement>("dialog[data-lightbox]");
    if (!dialog || typeof dialog.showModal !== "function") return;
    this.#ready = true;
    this.#dialog = dialog;
    // Whether the pointer that went up last was a swipe (below): the click that follows it is ignored.
    let swiped = false;
    this.#on(this, "click", (e) => {
      const ev = e as MouseEvent;
      const a = (ev.target as Element).closest<HTMLAnchorElement>("a[data-lightbox-item]");
      // A click with a modifier (a new tab) or another button opens the picture as a link would.
      if (!a || !this.contains(a) || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const i = this.#items.indexOf(a);
      if (i < 0) return;
      ev.preventDefault();
      this.open(i);
    });
    this.#on(dialog, "click", (e) => {
      const t = e.target as Element;
      // The click a swipe ends with (on an arrow, or the backdrop) was the swipe: it moved once already.
      if (swiped) {
        swiped = false;
        return;
      }
      // The backdrop (the dialog itself, outside its content) closes it, as does the close button.
      if (t === dialog || t.closest("[data-lightbox-close]")) dialog.close();
      else if (t.closest("[data-lightbox-prev]")) this.step(-1);
      else if (t.closest("[data-lightbox-next]")) this.step(1);
    });
    this.#on(dialog, "keydown", (e) => {
      const k = (e as KeyboardEvent).key;
      const by = k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0;
      if (by && !(e.target as Element).closest("iframe")) {
        e.preventDefault();
        this.step(by);
      }
    });
    this.#on(dialog, "close", () => {
      this.#stage?.replaceChildren();
      this.#items[this.#at]?.focus();
    });
    // Swipe: a sideways drag longer than it is tall moves to the next or previous picture.
    let x = 0;
    let y = 0;
    this.#on(dialog, "pointerdown", (e) => {
      const p = e as PointerEvent;
      x = p.clientX;
      y = p.clientY;
      swiped = false;
    });
    this.#on(dialog, "pointerup", (e) => {
      const p = e as PointerEvent;
      const dx = p.clientX - x;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(p.clientY - y) * 1.5) {
        swiped = true;
        this.step(dx < 0 ? 1 : -1);
      }
    });
  }

  disconnectedCallback() {
    for (const off of this.#off) off();
    this.#off = [];
    this.#ready = false;
    if (this.#dialog?.open) this.#dialog.close();
  }

  #on(el: EventTarget, type: string, f: (e: Event) => void) {
    el.addEventListener(type, f);
    this.#off.push(() => el.removeEventListener(type, f));
  }

  /** The pictures that can be opened now (not left out by a filter, not waiting to be shown). */
  get #items(): HTMLAnchorElement[] {
    return [...this.querySelectorAll<HTMLAnchorElement>("a[data-lightbox-item]")].filter((a) => !a.closest("[data-off], [hidden]"));
  }

  get #stage() {
    return this.#dialog?.querySelector<HTMLElement>("[data-lightbox-stage]") ?? null;
  }

  /** Opens the `i`th picture (of those that can be opened now). */
  open(i: number) {
    const dialog = this.#dialog;
    if (!dialog) return;
    this.#show(i);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-lightbox-close]")?.focus();
  }

  /** The next (1) or previous (-1) picture, going round at the ends. */
  step(by: number) {
    const n = this.#items.length;
    if (n > 1) this.#show((this.#at + by + n) % n);
  }

  #show(i: number) {
    const items = this.#items;
    const a = items[i];
    const stage = this.#stage;
    const dialog = this.#dialog;
    if (!a || !stage || !dialog) return;
    this.#at = i;
    const img = a.querySelector("img");
    const alt = img?.getAttribute("alt") ?? "";
    let shown: HTMLElement;
    if (a.dataset.video) {
      const f = document.createElement("iframe");
      f.src = a.dataset.video;
      f.title = alt;
      f.allow = "autoplay; fullscreen; picture-in-picture";
      f.allowFullscreen = true;
      shown = f;
    } else {
      const big = document.createElement("img");
      big.src = a.href;
      big.alt = alt;
      // A drag is a swipe, not the browser dragging the picture away.
      big.draggable = false;
      shown = big;
    }
    stage.replaceChildren(shown);
    const caption = dialog.querySelector<HTMLElement>("[data-lightbox-caption]");
    if (caption) {
      caption.textContent = a.dataset.caption ?? "";
      caption.hidden = !a.dataset.caption;
    }
    const count = dialog.querySelector<HTMLElement>("[data-lightbox-count]");
    if (count) count.textContent = items.length > 1 ? `${i + 1} ${count.dataset.of ?? "of"} ${items.length}` : "";
    for (const b of dialog.querySelectorAll<HTMLElement>("[data-lightbox-prev], [data-lightbox-next]")) b.hidden = items.length < 2;
    // The neighbours load while this one is looked at.
    for (const j of [i + 1, i - 1]) {
      const next = items[(j + items.length) % items.length];
      if (next && !next.dataset.video) new Image().src = next.href;
    }
  }
}

define("craeft-lightbox", CraeftLightbox);
