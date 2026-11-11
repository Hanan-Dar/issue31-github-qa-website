// The Social links widget (plan/ux/widgets.md, Wave 3): the business's profiles (its settings'
// `social` links, sites/main/src/data/business.json) as icons, names or both. Which network a link
// is comes from its address; the theme draws the icons.
import { type Def, meta, type ZodApi } from "./options.ts";

/** Networks known by their address, with the icon the theme draws for each. */
export const NETWORKS = [
  { host: "facebook.com", name: "Facebook", icon: "facebook" },
  { host: "instagram.com", name: "Instagram", icon: "instagram" },
  { host: "linkedin.com", name: "LinkedIn", icon: "linkedin" },
  { host: "x.com", name: "X", icon: "x" },
  { host: "twitter.com", name: "X", icon: "x" },
  { host: "youtube.com", name: "YouTube", icon: "youtube" },
  { host: "youtu.be", name: "YouTube", icon: "youtube" },
  { host: "tiktok.com", name: "TikTok", icon: "tiktok" },
  { host: "threads.net", name: "Threads", icon: "threads" },
  { host: "pinterest.com", name: "Pinterest", icon: "pinterest" },
] as const;

export type SocialIcon = (typeof NETWORKS)[number]["icon"] | "link";

export interface SocialShape {
  style: Def<"icons" | "names" | "both">;
  size: Def<"s" | "m" | "l">;
}

/** The Social links' fields, for the theme's block. */
export function socialSchema(z: ZodApi): SocialShape {
  const look = meta("style", "Links");
  return {
    style: z
      .enum(["icons", "names", "both"])
      .default("icons")
      .meta(look({ title: "Show", labels: { icons: "Icons", names: "Names", both: "Icons and names" } })),
    size: z
      .enum(["s", "m", "l"])
      .default("m")
      .meta(look({ title: "Size", labels: { s: "Small", m: "Medium", l: "Large" } })),
  };
}

export interface SocialProfile {
  url: string;
  /** What people read, and the icon's name for screen readers ("Instagram"). */
  name: string;
  icon: SocialIcon;
}

/** The site's profile links as the widget shows them; links that aren't web addresses are left out. */
export function socialProfiles(urls: readonly string[]): SocialProfile[] {
  return urls.flatMap((url) => {
    let host: string;
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:") return [];
      host = u.hostname.replace(/^(www|m)\./, "");
    } catch {
      return [];
    }
    const n = NETWORKS.find((x) => host === x.host || host.endsWith(`.${x.host}`));
    return [{ url, name: n?.name ?? host, icon: n?.icon ?? "link" }];
  });
}

/** What a Social links section shows, in a sentence for the editor. */
export function summariseSocial(profiles: readonly SocialProfile[]): string {
  if (!profiles.length) return "Shows nothing yet: the business has no profile links (ask in Chat to add them to its details).";
  const names = profiles.map((p) => p.name);
  return `Shows ${names.length < 2 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`}.`;
}
