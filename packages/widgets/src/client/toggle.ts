// <craeft-toggle>: a pricing section's monthly or yearly switch. With no script, each plan shows its
// monthly price with the yearly one listed under it; the script shows the switch (data-toggle) and
// sets data-period on itself, which the theme's CSS uses to show one price or the other.
//
//   <craeft-toggle> <div data-toggle hidden role="group"><button data-period="monthly" aria-pressed="true">…</div>
//     … <span data-price="monthly">…</span> <span data-price="yearly">…</span> <span data-price="both">…</span> </craeft-toggle>
import { define } from "./define.ts";

class CraeftToggle extends HTMLElement {
  #ready = false;

  connectedCallback() {
    const bar = this.querySelector<HTMLElement>("[data-toggle]");
    if (this.#ready || !bar) return;
    this.#ready = true;
    bar.hidden = false;
    bar.addEventListener("click", (e) => {
      const b = (e.target as Element).closest<HTMLElement>("button[data-period]");
      if (b) this.show(b.dataset.period ?? "monthly");
    });
    this.show(this.dataset.period ?? "monthly");
  }

  /** Shows the "monthly" or "yearly" prices. */
  show(period: string) {
    this.dataset.period = period;
    for (const b of this.querySelectorAll<HTMLElement>("[data-toggle] button[data-period]"))
      b.setAttribute("aria-pressed", String(b.dataset.period === period));
    const live = this.querySelector("[data-toggle-status]");
    if (live) live.textContent = this.querySelector(`[data-period="${period}"]`)?.textContent?.trim() ?? "";
  }
}

define("craeft-toggle", CraeftToggle);
