// <craeft-compare>: a before and after picture, one over the other, with a handle between them. Drag
// anywhere on the pictures, or focus the handle (role="slider") and use the arrow keys (Shift for
// bigger steps), Home and End. With no script the two pictures stand side by side; the script sets
// data-ready, which the theme's CSS uses to lay them one over the other (the after picture clipped
// at --pos).
//
//   <craeft-compare data-start="50"> <div data-pair>…before…<div data-after>…after…</div></div>
//     <div data-handle hidden role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-label="…">…</div> </craeft-compare>
import { define } from "./define.ts";

class CraeftCompare extends HTMLElement {
  #ready = false;
  #pos = 50;

  connectedCallback() {
    const handle = this.querySelector<HTMLElement>("[data-handle]");
    if (this.#ready || !handle) return;
    this.#ready = true;
    handle.hidden = false;
    this.dataset.ready = "";
    this.set(Number(this.dataset.start) || 50);
    let dragging = false;
    const at = (e: PointerEvent) => {
      const r = this.querySelector("[data-pair]")?.getBoundingClientRect();
      if (r?.width) this.set(((e.clientX - r.left) / r.width) * 100);
    };
    this.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      dragging = true;
      this.setPointerCapture(e.pointerId);
      at(e);
      handle.focus({ preventScroll: true });
      e.preventDefault();
    });
    this.addEventListener("pointermove", (e) => dragging && at(e));
    const stop = () => {
      dragging = false;
    };
    this.addEventListener("pointerup", stop);
    this.addEventListener("pointercancel", stop);
    handle.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 10 : 2;
      const to = {
        ArrowLeft: this.#pos - step,
        ArrowDown: this.#pos - step,
        ArrowRight: this.#pos + step,
        ArrowUp: this.#pos + step,
        PageDown: this.#pos - 10,
        PageUp: this.#pos + 10,
        Home: 0,
        End: 100,
      }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      this.set(to);
    });
  }

  /** Moves the handle to `pos` percent across (0 to 100). */
  set(pos: number) {
    this.#pos = Math.round(Math.min(100, Math.max(0, pos)));
    this.style.setProperty("--pos", `${this.#pos}%`);
    const handle = this.querySelector<HTMLElement>("[data-handle]");
    handle?.setAttribute("aria-valuenow", String(this.#pos));
    handle?.setAttribute(
      "aria-valuetext",
      `${this.#pos}% ${handle.dataset.labelBefore ?? "before"}, ${100 - this.#pos}% ${handle.dataset.labelAfter ?? "after"}`,
    );
  }
}

define("craeft-compare", CraeftCompare);
