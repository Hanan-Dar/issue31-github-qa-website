// Defines a custom element once, however many bundles import it (a page's own and the preview's).
export function define(name: string, element: CustomElementConstructor): void {
  if (typeof customElements !== "undefined" && !customElements.get(name)) customElements.define(name, element);
}

/** Motion is off for people who ask for less of it, and in Craeft's editor (`data-still`). */
export const still = (el: Element): boolean => el.hasAttribute("data-still") || matchMedia("(prefers-reduced-motion: reduce)").matches;
