declare module "virtual:site/config" {
  import type { SiteConfig } from "./site-config";
  const site: SiteConfig;
  export default site;
}

declare module "virtual:site/data" {
  type NavLink = { label: string; href: string };
  export const navigation: {
    /** The main menu. */
    items: NavLink[];
    /** The button at the end of the menu. */
    cta: NavLink;
    /** Footer columns. */
    footer: { title: string; links: NavLink[] }[];
  };
}

declare module "virtual:site/theme.css";
