// <craeft-more>: "Load more" with no fetch. Every matched item is already in the HTML (so search
// engines read them all); those past the first `data-step` are `hidden`, and each press shows the next
// `data-step`, moving focus to the first one shown. Items a filter has left out (data-off) are skipped.
//
//   <craeft-more data-step="3"> <ul>…<li hidden>…</ul> <button data-more hidden>…</button> <a data-more-fallback> </craeft-more>
import { define } from "./define.ts";

class CraeftMore extends HTMLElement {
  #ready = false;

  connectedCallback() {
    if (this.#ready) return;
    this.#ready = true;
    this.querySelector("[data-more-fallback]")?.remove();
    this.addEventListener("click", (e) => {
      if ((e.target as Element).closest("[data-more]")) this.more();
    });
    this.addEventListener("craeft-filter", () => this.#update());
    this.#update();
  }

  #waiting() {
    return [...this.querySelectorAll<HTMLElement>("li[hidden]")].filter(
      (li) => !li.hasAttribute("data-off") && li.parentElement?.closest("craeft-more") === this,
    );
  }

  more() {
    const next = this.#waiting().slice(0, Math.max(1, Number(this.dataset.step) || 3));
    for (const li of next) li.hidden = false;
    next[0]?.querySelector<HTMLElement>("a[href]")?.focus();
    this.#update();
  }

  #update() {
    const button = this.querySelector<HTMLElement>("[data-more]");
    if (button) button.hidden = this.#waiting().length === 0;
  }
}

define("craeft-more", CraeftMore);
