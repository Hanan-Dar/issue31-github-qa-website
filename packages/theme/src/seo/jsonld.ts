// Structured data (JSON-LD) for every page: one @graph per page, its nodes linked by stable @ids.
//
//   every page   the business (Organization + its schema.org type), WebSite, the page, breadcrumbs
//   posts        BlogPosting
//   hub pages    ItemList of the pages under them
//   FAQ blocks   FAQPage on the page node (the questions are visible on the page)
import type { SiteConfig } from "../site-config";

export type Node = Record<string, unknown>;
export type Crumb = { name: string; path: string };

export const ids = (site: SiteConfig) => {
  const url = (path: string) => site.origin + path;
  return {
    url,
    organization: `${site.origin}/#organization`,
    website: `${site.origin}/#website`,
    webPage: (path: string) => `${url(path)}#webpage`,
    breadcrumb: (path: string) => `${url(path)}#breadcrumb`,
    article: (path: string) => `${url(path)}#article`,
    itemList: (path: string) => `${url(path)}#itemlist`,
  };
};

const absolute = (site: SiteConfig, src: string) => (/^https?:/.test(src) ? src : site.origin + src);

export function organization(site: SiteConfig): Node {
  const id = ids(site);
  const a = site.address;
  const type = site.businessType && site.businessType !== "Organization" ? ["Organization", site.businessType] : "Organization";
  return {
    "@type": type,
    "@id": id.organization,
    name: site.name,
    ...(site.legalName && site.legalName !== site.name ? { legalName: site.legalName } : {}),
    url: id.url("/"),
    description: site.description,
    logo: { "@type": "ImageObject", url: absolute(site, site.logo) },
    image: absolute(site, site.shareImage ?? site.logo),
    email: site.contact.email,
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
    ...(a
      ? {
          address: {
            "@type": "PostalAddress",
            ...(a.street ? { streetAddress: a.street } : {}),
            addressLocality: a.locality,
            ...(a.region ? { addressRegion: a.region } : {}),
            ...(a.postalCode ? { postalCode: a.postalCode } : {}),
            addressCountry: a.country,
          },
        }
      : {}),
    ...(site.areasServed.length ? { areaServed: site.areasServed.map((name) => ({ "@type": "Place", name })) } : {}),
    ...(site.openingHours.length
      ? {
          openingHoursSpecification: site.openingHours.map((h) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${h.day}`,
            opens: h.opens,
            closes: h.closes,
          })),
        }
      : {}),
    ...(site.mapUrl ? { hasMap: site.mapUrl } : {}),
    ...(site.social.length ? { sameAs: site.social } : {}),
  };
}

export function website(site: SiteConfig): Node {
  const id = ids(site);
  return {
    "@type": "WebSite",
    "@id": id.website,
    url: id.url("/"),
    name: site.name,
    description: site.description,
    inLanguage: site.locale,
    publisher: { "@id": id.organization },
  };
}

export function breadcrumbList(site: SiteConfig, path: string, trail: Crumb[]): Node {
  const id = ids(site);
  const items = [{ name: "Home", path: "/" }, ...trail];
  return {
    "@type": "BreadcrumbList",
    "@id": id.breadcrumb(path),
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: id.url(c.path) })),
  };
}

export type PageNodeOpts = {
  path: string;
  title: string;
  description: string;
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
  image?: string;
  dateModified?: Date;
  hasBreadcrumb: boolean;
  faq?: { q: string; a: string }[];
};

export function pageNode(site: SiteConfig, o: PageNodeOpts): Node {
  const id = ids(site);
  const types: string[] = [o.type ?? "WebPage"];
  if (o.faq?.length) types.push("FAQPage");
  return {
    "@type": types.length === 1 ? types[0] : types,
    "@id": id.webPage(o.path),
    url: id.url(o.path),
    name: o.title,
    description: o.description,
    inLanguage: site.locale,
    isPartOf: { "@id": id.website },
    about: { "@id": id.organization },
    ...(o.image ? { primaryImageOfPage: { "@type": "ImageObject", url: absolute(site, o.image) } } : {}),
    ...(o.dateModified ? { dateModified: o.dateModified.toISOString() } : {}),
    ...(o.hasBreadcrumb ? { breadcrumb: { "@id": id.breadcrumb(o.path) } } : {}),
    ...(o.faq?.length
      ? { mainEntity: o.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
      : {}),
  };
}

export function blogPosting(
  site: SiteConfig,
  p: { path: string; title: string; description: string; image?: string; published: Date; modified?: Date; author?: string },
): Node {
  const id = ids(site);
  return {
    "@type": "BlogPosting",
    "@id": id.article(p.path),
    headline: p.title,
    description: p.description,
    url: id.url(p.path),
    mainEntityOfPage: { "@id": id.webPage(p.path) },
    image: absolute(site, p.image ?? site.shareImage ?? site.logo),
    datePublished: p.published.toISOString(),
    dateModified: (p.modified ?? p.published).toISOString(),
    author: p.author ? { "@type": "Person", name: p.author } : { "@id": id.organization },
    publisher: { "@id": id.organization },
    inLanguage: site.locale,
    isPartOf: { "@id": id.website },
  };
}

export function itemList(site: SiteConfig, path: string, items: { name: string; path: string }[]): Node {
  const id = ids(site);
  return {
    "@type": "ItemList",
    "@id": id.itemList(path),
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: id.url(it.path) })),
  };
}

/** The whole document for a page's <script type="application/ld+json">. */
export const graph = (nodes: Node[]) => ({ "@context": "https://schema.org", "@graph": nodes });

/**
 * The document as the text of its <script type="application/ld+json">: JSON with `<`, `>` and `&`
 * written as \u escapes (so a value like "</script>" can't end the script and start HTML of its
 * own), and U+2028 and U+2029 too. It parses back to the same data.
 */
export const jsonLdScript = (doc: Node): string =>
  JSON.stringify(doc).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
