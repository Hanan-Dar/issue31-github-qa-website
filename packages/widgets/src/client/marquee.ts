// <craeft-marquee>: a strip of logos that scrolls slowly (the theme's CSS animates it). With no
// script, for people who ask for less motion and in Craeft's editor (data-still), it's a still row
// that scrolls by hand. Otherwise the script copies the items once (hidden from screen readers and
// the keyboard, so the strip can loop), shows the pause button and starts it (data-run). It also
// stops while pointed at or focused.
//
//   <craeft-marquee [data-still]> <div data-viewport><ul data-strip>…<li>…</li></ul></div>
//     <button data-pause hidden><span data-pause-label>Pause</span></button> </craeft-marquee>
import { define, still } from "./define.ts";

class CraeftMarquee extends HTMLElement {
  #ready = false;

  connectedCallback() {
    const strip = this.querySelector<HTMLElement>("[data-strip]");
    const pause = this.querySelector<HTMLButtonElement>("[data-pause]");
    if (this.#ready || !strip || !pause || still(this)) return;
    this.#ready = true;
    for (const li of [...strip.children]) {
      const copy = li.cloneNode(true) as HTMLElement;
      copy.setAttribute("aria-hidden", "true");
      copy.setAttribute("inert", "");
      copy.dataset.copy = "";
      strip.append(copy);
    }
    pause.hidden = false;
    pause.addEventListener("click", () => this.pause(!this.hasAttribute("data-paused")));
    this.dataset.run = "";
  }

  /** Stops (true) or restarts the strip. */
  pause(on: boolean) {
    this.toggleAttribute("data-paused", on);
    const b = this.querySelector<HTMLElement>("[data-pause]");
    const label = b?.querySelector("[data-pause-label]");
    if (label) label.textContent = on ? (b?.dataset.play ?? "Play") : (b?.dataset.pauseText ?? "Pause");
  }
}

define("craeft-marquee", CraeftMarquee);
