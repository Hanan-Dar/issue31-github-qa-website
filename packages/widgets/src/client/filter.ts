// <craeft-filter>: buttons above a list that show only the items with one tag (Elementor's
// Portfolio filter). It filters what's already on the page, with no fetch; with no script the
// buttons stay hidden and every item shows.
//
//   <craeft-filter> <div data-filter hidden><button data-tag="" aria-pressed="true">All</button><button data-tag="tax">…</div>
//     <ul><li data-tags="tax vat">…</li></ul> </craeft-filter>
// Items left out get data-off (the theme hides them); it then sends a "craeft-filter" event to the
// elements inside it (<craeft-more> counts only what's left).
import { define } from "./define.ts";

class CraeftFilter extends HTMLElement {
  #ready = false;

  connectedCallback() {
    if (this.#ready) return;
    this.#ready = true;
    const bar = this.querySelector<HTMLElement>("[data-filter]");
    if (!bar) return;
    bar.hidden = false;
    bar.addEventListener("click", (e) => {
      const b = (e.target as Element).closest<HTMLElement>("button[data-tag]");
      if (b) this.show(b.dataset.tag ?? "");
    });
  }

  /** Shows the items tagged `tag` ("" for all). */
  show(tag: string) {
    for (const b of this.querySelectorAll<HTMLElement>("[data-filter] button[data-tag]"))
      b.setAttribute("aria-pressed", String((b.dataset.tag ?? "") === tag));
    for (const li of this.querySelectorAll<HTMLElement>("li[data-tags]"))
      li.toggleAttribute("data-off", !!tag && !(li.dataset.tags ?? "").split(" ").includes(tag));
    for (const el of this.querySelectorAll("craeft-more")) el.dispatchEvent(new CustomEvent("craeft-filter"));
  }
}

define("craeft-filter", CraeftFilter);
