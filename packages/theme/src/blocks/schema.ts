// What a page file's `blocks:` may contain. Every page is checked against this when the site
// builds, so a misspelt field or a wrong value fails the build instead of the page.
// To add a field: add it here AND show it in the block's component.
//
// Text marked "md" accepts inline Markdown (**bold**, [links](/path)); `body` accepts full
// Markdown (paragraphs, lists, tables). Icons are Lucide names (https://lucide.dev/icons), e.g.
// "Wrench", "Phone", "Leaf".
//
// The `.meta()` on blocks and fields is for editors (Craeft's writing mode shows them as forms):
// a title and a description, and `format` for text that takes Markdown ("markdown": paragraphs,
// lists; "markdown-inline": bold and links), an icon or a page link. `pnpm schema` writes them to
// blocks.schema.json, which editors read; `pnpm verify` checks it's up to date.
import { archiveSchema } from "@craeft/widgets/archive";
import { businessSchema } from "@craeft/widgets/business";
import { childPagesSchema } from "@craeft/widgets/child-pages";
import { compareSchema } from "@craeft/widgets/compare";
import { faqSchema } from "@craeft/widgets/faq";
import { gallerySchema, VIDEO_URL } from "@craeft/widgets/gallery";
import { SAFE_LINK, SAFE_LINK_MESSAGE, scriptLink, WEB_LINK } from "@craeft/widgets/links";
import { logosSchema } from "@craeft/widgets/logos";
import { postsSchema } from "@craeft/widgets/posts";
import {
  ARCHIVE_PRESETS,
  BUSINESS_PRESETS,
  CHILD_PAGES_PRESETS,
  COMPARE_PRESETS,
  FAQ_PRESETS,
  GALLERY_PRESETS,
  LOGOS_PRESETS,
  POSTS_PRESETS,
  PRICING_PRESETS,
  presetsFor,
  RECENT_POSTS_PRESETS,
  SOCIAL_PRESETS,
  TAG_LIST_PRESETS,
  TEAM_PRESETS,
  TESTIMONIALS_PRESETS,
} from "@craeft/widgets/presets";
import { pricingSchema } from "@craeft/widgets/pricing";
import { socialSchema } from "@craeft/widgets/social";
import { tagListSchema } from "@craeft/widgets/tag-list";
import { teamSchema } from "@craeft/widgets/team";
import { testimonialsSchema } from "@craeft/widgets/testimonials";
import { z } from "astro/zod";

const md = (description?: string) => z.string().meta({ format: "markdown-inline", ...(description ? { description } : {}) });
const markdown = (description?: string) => z.string().meta({ format: "markdown", ...(description ? { description } : {}) });
const icon = () => z.string().meta({ format: "icon", description: "A Lucide icon name, e.g. Wrench, Phone, Leaf (lucide.dev/icons)." });
/**
 * A widget's link: a page on this site (/contact), a #section, or an http(s), mailto: or tel:
 * address (@craeft/widgets/links); never javascript: or data:.
 */
const safeLink = () => z.string().regex(SAFE_LINK, SAFE_LINK_MESSAGE);
/** A web address (a person's website or profile): http(s) only. */
const webLink = () => z.string().url().regex(WEB_LINK, "A full address starting with https://");
/** An older link field (a Button's): anything it took before, except javascript:, data: and vbscript:, which are never links. */
const anyLink = () => z.string().refine((v) => !scriptLink(v), "Not a link: javascript:, data: and vbscript: addresses aren't allowed");

/** Background of a section: the page colour, white, a light tint of the brand colour, or dark. */
const Tone = z.enum(["plain", "white", "tint", "dark"]).meta({ title: "Background", description: "The page colour, white, a light tint of the brand colour, or dark." });

export const Button = z
  .object({
    label: z.string().meta({ title: "Text" }),
    href: anyLink().meta({ title: "Link", format: "link", description: "A page on this site (/contact) or a full address." }),
    style: z.enum(["primary", "secondary"]).optional(),
  })
  .strict()
  .meta({ title: "Button" });

const Header = {
  /** Lets a link jump to this section: "contact" → /#contact (lowercase letters, digits, hyphens). */
  anchor: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/)
    .optional()
    .meta({ title: "Anchor", description: 'Lets a link jump here: "contact" → /#contact (lowercase letters, digits, hyphens).' }),
  eyebrow: z.string().optional().meta({ description: "A short line above the title." }),
  title: z.string(),
  /** md */
  lead: md("A sentence or two under the title.").optional(),
};

/** An image under public/, with its description for people who can't see it. */
const Image = z
  .object({
    src: z.string().startsWith("/").meta({ title: "Image", format: "image" }),
    alt: z.string().meta({ title: "Description", description: "What the picture shows, for people who can't see it." }),
  })
  .strict()
  .meta({ title: "Image" });

export const HeroBlock = z
  .object({
    blockType: z.literal("hero"),
    /** "home": large, for the home page; "page": compact, with the breadcrumb. */
    variant: z.enum(["home", "page"]).default("page"),
    eyebrow: z.string().optional(),
    title: z.string(),
    /** md */
    lead: md(),
    buttons: z.array(Button).max(2).default([]),
    /** Short reassurance points under the buttons. */
    points: z.array(z.string()).max(4).default([]),
    image: Image.optional(),
  })
  .strict()
  .meta({ title: "Hero", description: "The big title at the top of a page, with buttons and an optional picture." });

export const FeaturesBlock = z
  .object({
    blockType: z.literal("features"),
    ...Header,
    tone: Tone.default("plain"),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
    items: z
      .array(
        z
          .object({
            icon: icon(),
            title: z.string(),
            /** md */
            text: md(),
            href: anyLink().optional(),
            linkLabel: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .meta({ title: "Features", description: "A grid of cards with an icon, a title and a line of text each." });

export const SplitBlock = z
  .object({
    blockType: z.literal("split"),
    ...Header,
    tone: Tone.default("plain"),
    /** Markdown */
    body: markdown(),
    bullets: z.array(z.string()).default([]),
    button: Button.optional(),
    image: Image.optional(),
    /** Put the image (or the highlight box) on the left on wide screens. */
    reverse: z.boolean().optional(),
    /** A highlight box beside the text when there's no image. */
    highlight: z.object({ title: z.string(), items: z.array(z.string()).min(1) }).strict().optional(),
  })
  .strict()
  .meta({ title: "Text and picture", description: "Text beside a picture or a highlight box." });

export const StepsBlock = z
  .object({
    blockType: z.literal("steps"),
    ...Header,
    tone: Tone.default("plain"),
    steps: z.array(z.object({ title: z.string(), text: z.string() }).strict()).min(2).max(6),
  })
  .strict()
  .meta({ title: "Steps", description: "How it works, in 2 to 6 numbered steps." });

export const ProseBlock = z
  .object({
    blockType: z.literal("prose"),
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    tone: Tone.default("plain"),
    /** Markdown */
    body: markdown(),
  })
  .strict()
  .meta({ title: "Text", description: "A section of free text: paragraphs, lists, tables." });

/** A question and its answer (inline Markdown), typed in an FAQ section or kept in src/content/faq/. */
const Question = z
  .object({ question: z.string(), answer: md() })
  .strict()
  .meta({ title: "Question" });

/** The layouts this theme draws for questions (blocks/faq/); the first is the default (as before widgets). */
export const FAQ_LAYOUTS = ["accordion", "columns", "list"] as const;

/**
 * Questions and answers (Craeft's widgets, plan/ux/widgets.md): typed here, or the site's questions
 * (src/content/faq/) by tag; as an accordion, two columns or a list. The questions shown are also
 * given to search engines as FAQ structured data. Left as they are, the settings draw the typed
 * questions as an accordion, as before.
 */
const { show: faqShow, ...faqRest } = faqSchema(z, { layouts: FAQ_LAYOUTS });
export const FaqBlock = z
  .object({
    blockType: z.literal("faq"),
    ...Header,
    tone: Tone.default("plain"),
    /** Answers: md. Also given to search engines as FAQ structured data. */
    // Show first: typed here, or the site's.
    show: faqShow,
    items: z
      .array(Question)
      .min(1)
      .optional()
      .meta({ title: "Questions", part: "content", group: "Source", showWhen: { show: "items" } }),
    ...faqRest,
  })
  .strict()
  // Typed questions need at least one, as before (the build refuses an empty list).
  .refine((b) => b.show === "collection" || (b.items?.length ?? 0) > 0, { message: "Add a question, or show the site's questions.", path: ["items"] })
  .meta({
    title: "Questions and answers",
    description: "Common questions, typed here or the site's own; also given to search engines as FAQ data.",
    presets: presetsFor(FAQ_PRESETS, FAQ_LAYOUTS),
  });

export const CtaBlock = z
  .object({
    blockType: z.literal("cta"),
    title: z.string(),
    text: z.string(),
    buttons: z.array(Button).min(1).max(2),
  })
  .strict()
  .meta({ title: "Call to action", description: "A short banner asking people to get in touch, with one or two buttons." });

export const LinksBlock = z
  .object({
    blockType: z.literal("links"),
    ...Header,
    tone: Tone.default("plain"),
    /** Pages on this site. Title and text come from the page unless given here. */
    items: z
      .array(
        z
          .object({
            href: z.string().startsWith("/").meta({ title: "Page", format: "link" }),
            icon: icon().optional(),
            title: z.string().optional().meta({ description: "Leave empty to use the page's own title." }),
            text: z.string().optional().meta({ description: "Leave empty to use the page's description." }),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .meta({ title: "Links to pages", description: "Cards linking to other pages on the site." });

/** The layouts this theme draws for lists of posts (blocks/posts/); the first is the default. */
export const POST_LAYOUTS = ["grid", "list", "featured", "compact", "tiles", "carousel"] as const;

/**
 * Blog posts chosen by settings (Craeft's widgets, plan/ux/widgets.md): which ones and in what order
 * (packages/widgets decides), and how they're laid out (this theme draws it). Left as they are, the
 * settings show the newest three as cards with a link to the blog.
 */
export const PostsBlock = z
  .object({
    blockType: z.literal("posts"),
    ...Header,
    tone: Tone.default("plain"),
    ...postsSchema(z, { layouts: POST_LAYOUTS }),
  })
  .strict()
  // Presets: named looks the editor offers ("From your site" in Add a section, and above the
  // section's settings). This theme's are Craeft's own for the layouts it draws; add your own
  // ({ id, name, description, settings }) or leave some out here.
  .meta({
    title: "Latest posts",
    description: "Blog posts: the newest, picked by hand or by tag, as cards, a list or a carousel.",
    presets: presetsFor(POSTS_PRESETS, POST_LAYOUTS),
  });

/** The layouts this theme draws for reviews (blocks/testimonials/); the first is the default. */
export const TESTIMONIAL_LAYOUTS = ["grid", "carousel", "quote"] as const;

/**
 * What customers say (Craeft's widgets, plan/ux/widgets.md): reviews typed here, or the site's
 * testimonials (src/content/testimonials/) by tag; as cards, a carousel or one large quote. Left as
 * they are, the settings draw the typed reviews as cards, as before.
 */
const { show: reviewsShow, ...reviewsRest } = testimonialsSchema(z, { layouts: TESTIMONIAL_LAYOUTS });
export const TestimonialsBlock = z
  .object({
    blockType: z.literal("testimonials"),
    ...Header,
    tone: Tone.default("plain"),
    // Show first: typed here, or the site's.
    show: reviewsShow,
    items: z
      .array(
        z
          .object({
            quote: z.string(),
            name: z.string(),
            /** Where they are or what was done, e.g. "Boiler replacement, Headingley". */
            detail: z.string().optional(),
            /** Stars out of 5. */
            rating: z.number().int().min(1).max(5).optional(),
          })
          .strict()
          .meta({ title: "Review" }),
      )
      .min(1)
      .optional()
      .meta({ title: "Reviews", part: "content", group: "Source", showWhen: { show: "items" } }),
    ...reviewsRest,
  })
  .strict()
  // Typed reviews need at least one, as before (the build refuses an empty list).
  .refine((b) => b.show === "collection" || (b.items?.length ?? 0) > 0, { message: "Add a review, or show the site's testimonials.", path: ["items"] })
  .meta({
    title: "Reviews",
    description: "What customers say: typed here or from the site's testimonials, as cards, a carousel or one large quote.",
    presets: presetsFor(TESTIMONIALS_PRESETS, TESTIMONIAL_LAYOUTS),
  });

/**
 * A picture in a gallery or an album: under /media/, with its description (required), and a
 * caption, tags, a link or a video (YouTube or Vimeo, as the free-form Video element takes) if wanted.
 */
export const Picture = z
  .object({
    src: z.string().regex(/^\/media\//, "A picture under /media/").meta({ title: "Picture", format: "image" }),
    alt: z.string().min(1).meta({ title: "Description", description: "What the picture shows, for people who can't see it." }),
    caption: z.string().optional().meta({ title: "Caption", description: "Shown with the picture, as the gallery's Captions setting says." }),
    tags: z
      .array(z.string().min(1).max(40))
      .max(12)
      .optional()
      .meta({ title: "Tags", format: "picture-tags", description: "For filter buttons, and galleries that show only some pictures." }),
    link: safeLink().optional().meta({ title: "Link", format: "link", description: "Where it leads when the gallery's clicks open links." }),
    video: z
      .string()
      .regex(VIDEO_URL, "A YouTube or Vimeo address")
      .optional()
      .meta({ title: "Video", description: "A YouTube or Vimeo address: the picture stands for the video, which plays when it's opened." }),
  })
  .strict()
  .meta({ title: "Picture" });

/** The layouts this theme draws for galleries (blocks/gallery/); the first is the default. */
export const GALLERY_LAYOUTS = ["grid", "masonry", "carousel"] as const;

/**
 * Pictures (Craeft's widgets, plan/ux/widgets.md): typed here or one of the site's albums
 * (src/content/albums/), by tag; as a grid, masonry or a carousel; each opening large over the page.
 */
export const GalleryBlock = z
  .object({
    blockType: z.literal("gallery"),
    ...Header,
    tone: Tone.default("plain"),
    ...gallerySchema(z, { layouts: GALLERY_LAYOUTS, picture: Picture }),
  })
  .strict()
  .meta({
    title: "Gallery",
    description: "Pictures typed here or from an album: a grid, masonry or a slider; each opens large.",
    presets: presetsFor(GALLERY_PRESETS, GALLERY_LAYOUTS),
  });

/** Contact links on a person, each shown as a small icon. */
const PersonLinks = {
  email: z.string().email().optional().meta({ title: "Email" }),
  phone: z.string().optional().meta({ title: "Phone", description: "As people dial it, e.g. 01632 960 123." }),
  linkedin: webLink().optional().meta({ title: "LinkedIn", description: "Their profile's full address." }),
  website: webLink().optional().meta({ title: "Website", description: "A full address." }),
};

/** A person, typed in a Team section. */
const Person = z
  .object({
    name: z.string(),
    role: z.string(),
    bio: z.string().optional(),
    /** Without a photo, their initials are shown. */
    photo: Image.optional(),
    ...PersonLinks,
  })
  .strict()
  .meta({ title: "Person" });

/** The layouts this theme draws for people (blocks/team/); the first is the default (as before widgets). */
export const TEAM_LAYOUTS = ["grid", "carousel", "list"] as const;

/**
 * The people (Craeft's widgets, plan/ux/widgets.md): typed here, or the site's team (src/content/team/)
 * by tag; as cards, a carousel or a list. Left as they are, the settings draw the typed people as
 * cards, as before.
 */
const { show: teamShow, ...teamRest } = teamSchema(z, { layouts: TEAM_LAYOUTS });
export const TeamBlock = z
  .object({
    blockType: z.literal("team"),
    ...Header,
    tone: Tone.default("plain"),
    // Show first: typed here, or the site's.
    show: teamShow,
    people: z
      .array(Person)
      .min(1)
      .optional()
      .meta({ title: "People", part: "content", group: "Source", showWhen: { show: "items" } }),
    ...teamRest,
  })
  .strict()
  // Typed people need at least one, as before (the build refuses an empty list).
  .refine((b) => b.show === "collection" || (b.people?.length ?? 0) > 0, { message: "Add a person, or show the site's team.", path: ["people"] })
  .meta({
    title: "Team",
    description: "The people, with their roles and photos: typed here or the site's team, as cards, a carousel or a list.",
    presets: presetsFor(TEAM_PRESETS, TEAM_LAYOUTS),
  });

/** A logo: a picture under public/ and whose it is (for people who can't see it), with a link if wanted. */
const Logo = z
  .object({
    src: z.string().startsWith("/").meta({ title: "Logo", format: "image" }),
    alt: z.string().min(1).meta({ title: "Whose logo", description: 'For people who can\'t see it, e.g. "Gas Safe Register".' }),
    link: safeLink().optional().meta({ title: "Link", format: "link", description: "Where it leads, if anywhere." }),
  })
  .strict()
  .meta({ title: "Logo" });

/** The layouts this theme draws for logos (blocks/logos/); the first is the default. */
export const LOGO_LAYOUTS = ["row", "grid", "strip"] as const;

/**
 * Logos of clients, partners or accreditations (Craeft's widgets, plan/ux/widgets.md): typed here, or
 * the site's logos (src/content/logos/) by tag; in a row, a grid or a slow scrolling strip.
 */
const { show: logosShow, ...logosRest } = logosSchema(z, { layouts: LOGO_LAYOUTS });
export const LogosBlock = z
  .object({
    blockType: z.literal("logos"),
    ...Header,
    title: z.string().optional().meta({ description: "Left empty, the logos show without a heading." }),
    tone: Tone.default("plain"),
    // Show first: typed here, or the site's.
    show: logosShow,
    items: z
      .array(Logo)
      .optional()
      .meta({ title: "Logos", part: "content", group: "Source", showWhen: { show: "items" } }),
    ...logosRest,
  })
  .strict()
  .meta({
    title: "Logos",
    description: "Logos of clients, partners or accreditations: a row, a grid or a slow scrolling strip.",
    presets: presetsFor(LOGOS_PRESETS, LOGO_LAYOUTS),
  });

/** The layouts this theme draws for page cards (blocks/child-pages/); the first is the default. */
export const CHILD_PAGE_LAYOUTS = ["grid", "list", "carousel"] as const;

/**
 * Cards for the pages under a page, or pages picked by hand (Craeft's widgets, plan/ux/widgets.md);
 * each card's title, text and picture come from its page, so they never go stale. Pages switched
 * off in site.config.ts are left out.
 */
export const ChildPagesBlock = z
  .object({
    blockType: z.literal("child-pages"),
    ...Header,
    tone: Tone.default("plain"),
    ...childPagesSchema(z, { layouts: CHILD_PAGE_LAYOUTS }),
  })
  .strict()
  .meta({
    title: "Child pages",
    description: "Cards for the pages under a page (new ones join by themselves), or pages picked by hand.",
    presets: presetsFor(CHILD_PAGES_PRESETS, CHILD_PAGE_LAYOUTS),
  });

/** A plan in a Pricing section. */
const Plan = z
  .object({
    name: z.string().min(1).meta({ title: "Name" }),
    description: z.string().optional().meta({ title: "Who it's for", description: "A line under the name." }),
    price: z.string().min(1).meta({ title: "Price", description: 'As shown: "£29", "From £120", "Free".' }),
    period: z.string().optional().meta({ title: "After the price", description: '"a month", "per visit". Left empty, nothing.' }),
    yearlyPrice: z.string().optional().meta({ title: "Yearly price", description: "With the monthly or yearly switch." }),
    yearlyPeriod: z.string().optional().meta({ title: "After the yearly price", description: 'Left empty, "a year".' }),
    points: z.array(md()).max(12).optional().meta({ title: "What's included" }),
    button: Button.extend({ href: safeLink().meta({ title: "Link", format: "link", description: "A page on this site (/contact) or a full address." }) })
      .meta({ title: "Button" })
      .optional(),
    popular: z.boolean().optional().meta({ title: "Most popular", description: "Stands out from the others." }),
  })
  .strict()
  .meta({ title: "Plan" });

/** Plans and prices side by side (Craeft's widgets, plan/ux/widgets.md), with a monthly or yearly switch if wanted. */
export const PricingBlock = z
  .object({
    blockType: z.literal("pricing"),
    ...Header,
    tone: Tone.default("plain"),
    ...pricingSchema(z, { plan: Plan }),
  })
  .strict()
  .meta({
    title: "Pricing",
    description: "Plans and prices side by side, with a monthly or yearly switch if wanted.",
    presets: PRICING_PRESETS,
  });

/** One of a Before and after section's pictures. */
const ComparePicture = z
  .object({
    src: z.string().startsWith("/").meta({ title: "Picture", format: "image" }),
    alt: z.string().min(1).meta({ title: "Description", description: "What the picture shows, for people who can't see it." }),
  })
  .strict();

/** Two pictures of the same view with a handle between them (Craeft's widgets, plan/ux/widgets.md). */
export const BeforeAfterBlock = z
  .object({
    blockType: z.literal("before-after"),
    ...Header,
    tone: Tone.default("plain"),
    ...compareSchema(z, { picture: ComparePicture }),
  })
  .strict()
  .meta({
    title: "Before and after",
    description: "Two pictures of the same view, with a handle to drag between them.",
    presets: COMPARE_PRESETS,
  });

// ---- Widgets that suit a widget area too (plan/ux/widgets.md, Wave 3): on a page each is a section;
// in the footer or a post's sidebar (AREAS below), a column. Their titles have defaults, so a new one
// shows something sensible at once.

/** The blog's tags as a cloud or a list, each linking to its tag page. */
export const TagListBlock = z
  .object({
    blockType: z.literal("tag-list"),
    ...Header,
    title: z.string().min(1).default("Topics"),
    tone: Tone.default("plain"),
    ...tagListSchema(z),
  })
  .strict()
  .meta({
    title: "Tag list",
    description: "The blog's tags as a cloud or a list, each opening the posts with that tag.",
    presets: TAG_LIST_PRESETS,
  });

/** The blog's posts by year or by month; a year opens its page (/<blog>/year/<year>). */
export const ArchiveBlock = z
  .object({
    blockType: z.literal("archive"),
    ...Header,
    title: z.string().min(1).default("Archive"),
    tone: Tone.default("plain"),
    ...archiveSchema(z),
  })
  .strict()
  .meta({
    title: "Archive",
    description: "The blog's posts by year or by month, with how many each has.",
    presets: ARCHIVE_PRESETS,
  });

/** The business's name, address, phone, email and opening hours, from its details. */
export const BusinessBlock = z
  .object({
    blockType: z.literal("business-details"),
    ...Header,
    title: z.string().min(1).default("Find us"),
    tone: Tone.default("plain"),
    ...businessSchema(z),
  })
  .strict()
  .meta({
    title: "Business details",
    description: "The address, phone, email and opening hours, from the business's details: always up to date.",
    presets: BUSINESS_PRESETS,
  });

/** The business's profiles (its details' social links) as icons or names. */
export const SocialBlock = z
  .object({
    blockType: z.literal("social-links"),
    ...Header,
    title: z.string().min(1).default("Follow us"),
    tone: Tone.default("plain"),
    ...socialSchema(z),
  })
  .strict()
  .meta({
    title: "Social links",
    description: "The business's profiles (Facebook, Instagram, LinkedIn…) as icons or names.",
    presets: SOCIAL_PRESETS,
  });

/**
 * The Posts widget in a widget area: a compact list (titles and dates), the newest five unless set;
 * beside a post, that post left out unless set.
 */
const areaPosts = postsSchema(z, { layouts: ["compact"], count: 5 });
export const AreaPostsBlock = z
  .object({
    blockType: z.literal("posts"),
    title: z.string().min(1).default("Recent posts"),
    ...areaPosts,
    notCurrent: z.boolean().default(true).meta((areaPosts.notCurrent as unknown as z.ZodType).meta() ?? {}),
  })
  .strict()
  .meta({
    title: "Latest posts",
    description: "Blog posts as titles and dates: the newest, picked by hand or by tag.",
    presets: presetsFor(RECENT_POSTS_PRESETS, ["compact"]),
  });

/** What a widget area may hold: widgets and short sections that fit a column. */
export const AreaBlock = z.discriminatedUnion("blockType", [AreaPostsBlock, TagListBlock, ArchiveBlock, BusinessBlock, SocialBlock, CtaBlock, ProseBlock]);
export type AreaBlock = z.infer<typeof AreaBlock>;

/**
 * A widget area's file: src/content/widget-areas/<area>.yaml (AREAS names them). Without one, or
 * with no blocks, the place looks as it always has.
 */
export const AreaData = z
  .object({
    /** Areas that are off unless switched on (the post sidebar): shown only when this is true. */
    on: z.boolean().optional().meta({ title: "Shown", description: "Areas that are off unless switched on show only when this is on." }),
    blocks: z.array(AreaBlock).max(8).meta({ title: "Widgets" }),
  })
  .strict();

/**
 * The places this theme has beyond a page's own sections (widget areas, plan/ux/widgets.md step 9).
 * `switch`: off unless the area's file says `on: true` (the theme's own look has no post sidebar, so
 * a site has one only when it asks).
 */
export const AREAS = {
  footer: { title: "Footer", description: "Columns at the foot of every page, above the copyright line.", where: "every page" },
  "post-sidebar": { title: "Post sidebar", description: "Beside each blog post, on wide screens; under it on phones.", where: "blog posts", switch: true },
} as const;
export type AreaName = keyof typeof AREAS;

export const MenuBlock = z
  .object({
    blockType: z.literal("menu"),
    ...Header,
    tone: Tone.default("plain"),
    sections: z
      .array(
        z
          .object({
            title: z.string(),
            note: z.string().optional(),
            items: z
              .array(
                z
                  .object({
                    name: z.string(),
                    description: z.string().optional(),
                    /** As shown, e.g. "£4.50" or "from £12". */
                    price: z.string().optional(),
                    /** Short labels, e.g. "V", "VG", "GF". */
                    tags: z.array(z.string()).default([]),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
    /** md: allergen or pricing notes under the menu. */
    note: md("Allergen or pricing notes under the menu.").optional(),
  })
  .strict()
  .meta({ title: "Menu", description: "Sections of dishes or services with prices." });

/** Opening hours and the address, from site.config.ts. */
export const HoursBlock = z
  .object({
    blockType: z.literal("hours"),
    ...Header,
    tone: Tone.default("plain"),
    /** md: anything else worth knowing (parking, access, holidays). */
    note: md("Anything else worth knowing (parking, access, holidays).").optional(),
  })
  .strict()
  .meta({ title: "Opening hours", description: "Opening hours and the address, from the site's settings." });

/** The areas served, from site.config.ts unless listed here. */
export const AreasBlock = z
  .object({
    blockType: z.literal("areas"),
    ...Header,
    tone: Tone.default("plain"),
    areas: z.array(z.string()).optional().meta({ description: "Leave empty to use the areas in the site's settings." }),
    /** md */
    note: md().optional(),
  })
  .strict()
  .meta({ title: "Areas served", description: "The towns and areas covered." });

/** The contact form, with the email address, phone number, address and hours beside it. */
export const ContactBlock = z
  .object({
    blockType: z.literal("contact"),
    ...Header,
    tone: Tone.default("plain"),
  })
  .strict()
  .meta({ title: "Contact form", description: "The contact form, with the email address, phone, address and hours beside it." });

// ---- Free-form sections (roadmap 16.1): a section of columns holding elements, laid out by hand.
// Every setting is one of the theme's own steps (sizes, spacing, colours), so pages stay on-brand;
// a setting that can differ per screen size is { desktop, tablet?, phone? } (tablet and phone
// follow the larger size when left out; columns stack to one on phones unless set).

const perDevice = <T extends z.ZodType>(t: T, title: string, description?: string, phoneDefault?: string | number) =>
  z
    .object({ desktop: t, tablet: t.optional(), phone: t.optional() })
    .strict()
    .meta({ title, format: "per-device", ...(description ? { description } : {}), ...(phoneDefault !== undefined ? { phoneDefault } : {}) });

const Align = z.enum(["start", "center", "end"]).meta({ title: "Alignment" });
const Size = z.enum(["s", "m", "l", "xl"]);

const ElementBase = {
  /** Hidden on these screen sizes. */
  hideOn: z
    .array(z.enum(["desktop", "tablet", "phone"]))
    .optional()
    .meta({ title: "Hide on", description: "Screen sizes this isn't shown on." }),
};

export const HeadingElement = z
  .object({
    element: z.literal("heading"),
    text: z.string().meta({ title: "Heading" }),
    /** 2: a section heading; 3 and 4: headings under it (the page's title is its only H1). */
    level: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(2).meta({ title: "Level", description: "2 for a section, 3 and 4 under it." }),
    size: Size.optional().meta({ title: "Size", description: "Leave empty for the level's own size." }),
    align: perDevice(Align, "Alignment").optional(),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "Heading" });

export const TextElement = z
  .object({ element: z.literal("text"), body: markdown(), align: perDevice(Align, "Alignment").optional(), ...ElementBase })
  .strict()
  .meta({ title: "Text" });

export const ButtonElement = z
  .object({
    element: z.literal("button"),
    label: z.string().meta({ title: "Text" }),
    href: anyLink().meta({ title: "Link", format: "link" }),
    style: z.enum(["primary", "secondary"]).default("primary"),
    align: perDevice(Align, "Alignment").optional(),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "Button" });

export const ImageElement = z
  .object({
    element: z.literal("image"),
    src: z.string().startsWith("/").meta({ title: "Picture", format: "image" }),
    alt: z.string().meta({ title: "Description", description: "What the picture shows, for people who can't see it." }),
    caption: z.string().optional(),
    shape: z.enum(["rounded", "square", "circle"]).default("rounded"),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "Picture" });

export const ListElement = z
  .object({
    element: z.literal("list"),
    items: z.array(z.object({ icon: icon().optional(), text: md() }).strict().meta({ title: "Point" })).min(1),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "List with icons" });

export const SpacerElement = z
  .object({ element: z.literal("spacer"), size: perDevice(Size, "Height"), ...ElementBase })
  .strict()
  .meta({ title: "Space" });

export const DividerElement = z.object({ element: z.literal("divider"), ...ElementBase }).strict().meta({ title: "Divider" });

export const VideoElement = z
  .object({
    element: z.literal("video"),
    /** A YouTube or Vimeo address; YouTube plays from youtube-nocookie.com (no tracking until played). */
    url: z
      .string()
      .regex(/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[\w-]+/)
      .meta({ title: "Video address", format: "link", description: "A YouTube or Vimeo address." }),
    title: z.string().meta({ title: "What it shows", description: "For screen readers and search engines." }),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "Video" });

export const GalleryElement = z
  .object({
    element: z.literal("gallery"),
    images: z
      .array(z.object({ src: z.string().startsWith("/").meta({ title: "Picture", format: "image" }), alt: z.string().meta({ title: "Description" }) }).strict().meta({ title: "Picture" }))
      .min(2),
    columns: perDevice(z.union([z.literal(2), z.literal(3), z.literal(4)]), "Columns").optional(),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "Gallery", description: "Pictures in a grid; each opens large." });

export const MapElement = z
  .object({
    element: z.literal("map"),
    query: z.string().meta({ title: "Address or place", description: "As you'd type it into Google Maps." }),
    title: z.string().default("Map").meta({ title: "Map's name", description: "For screen readers." }),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "Map" });

export const QuoteElement = z
  .object({
    element: z.literal("testimonial"),
    quote: z.string(),
    name: z.string(),
    detail: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional().meta({ description: "Stars out of 5." }),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "Review" });

export const CounterElement = z
  .object({
    element: z.literal("counter"),
    value: z.string().max(12).meta({ title: "Number", description: "As shown, e.g. 25, 1,200 or 98%." }),
    label: z.string().meta({ title: "What it counts" }),
    ...ElementBase,
  })
  .strict()
  .meta({ title: "Number" });

const Panel = z.object({ title: z.string(), body: markdown() }).strict().meta({ title: "Panel" });

export const AccordionElement = z
  .object({ element: z.literal("accordion"), items: z.array(Panel).min(1), ...ElementBase })
  .strict()
  .meta({ title: "Accordion", description: "Titles that open to show their text." });

export const TabsElement = z
  .object({ element: z.literal("tabs"), items: z.array(Panel).min(2).max(6), ...ElementBase })
  .strict()
  .meta({ title: "Tabs" });

export const FormElement = z
  .object({ element: z.literal("form"), ...ElementBase })
  .strict()
  .meta({ title: "Contact form", description: "The site's contact form (one per page)." });

export const Element = z.discriminatedUnion("element", [
  HeadingElement,
  TextElement,
  ButtonElement,
  ImageElement,
  ListElement,
  SpacerElement,
  DividerElement,
  VideoElement,
  GalleryElement,
  MapElement,
  QuoteElement,
  CounterElement,
  AccordionElement,
  TabsElement,
  FormElement,
]);
export type ElementData = z.infer<typeof Element>;

const Cols = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const SectionBlock = z
  .object({
    blockType: z.literal("section"),
    anchor: Header.anchor,
    tone: Tone.default("plain"),
    width: z.enum(["narrow", "normal", "wide"]).default("normal").meta({ title: "Width" }),
    padding: perDevice(Size, "Space above and below").optional(),
    columns: perDevice(Cols, "Columns", "Phones show one column unless set.", 1).default({ desktop: 1 }),
    gap: z.enum(["s", "m", "l"]).default("m").meta({ title: "Space between columns" }),
    valign: z.enum(["start", "center", "end"]).default("start").meta({ title: "Columns line up at" }),
    cells: z
      .array(
        z
          .object({
            /** Columns this one takes (desktop and tablet; phones always one). */
            span: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional().meta({ title: "Width in columns" }),
            elements: z.array(Element).meta({ title: "Elements" }),
          })
          .strict()
          .meta({ title: "Column" }),
      )
      .min(1)
      .meta({ title: "Columns' content" }),
    hideOn: ElementBase.hideOn,
    /** Site admins: values outside the theme's steps (the text colour follows, for readability). */
    advanced: z
      .object({
        background: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, "A colour like #1d4ed8")
          .optional()
          .meta({ title: "Background colour", format: "colour", description: "Text on it turns white or dark to stay readable." }),
        maxWidth: z
          .number()
          .int()
          .min(320)
          .max(1600)
          .optional()
          .meta({ title: "Widest it gets (pixels)", description: "Between 320 and 1600." }),
      })
      .strict()
      .optional()
      .meta({ title: "Advanced settings", format: "advanced", description: "Values outside the site's styles. Site admins only." }),
  })
  .strict()
  .meta({ title: "Free-form section", description: "Your own layout: columns, and headings, text, pictures, buttons and more in them." });

/**
 * A saved section used on this page (roadmap 16.5): src/content/sections/<id>.yaml holds it once;
 * every page that uses it shows the same, so a change there changes them all.
 */
export const SavedBlock = z
  .object({
    blockType: z.literal("saved"),
    id: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .meta({ title: "Saved section", format: "saved-section" }),
  })
  .strict()
  .meta({ title: "Saved section", description: "A section kept once and used on several pages: change it once, it changes everywhere." });

/** Blocks a saved section may be (any but another saved one). */
export const ReusableBlock = z.discriminatedUnion("blockType", [
  HeroBlock,
  FeaturesBlock,
  SplitBlock,
  StepsBlock,
  ProseBlock,
  FaqBlock,
  CtaBlock,
  LinksBlock,
  PostsBlock,
  TestimonialsBlock,
  GalleryBlock,
  TeamBlock,
  LogosBlock,
  ChildPagesBlock,
  PricingBlock,
  BeforeAfterBlock,
  MenuBlock,
  HoursBlock,
  AreasBlock,
  ContactBlock,
  SectionBlock,
  TagListBlock,
  ArchiveBlock,
  BusinessBlock,
  SocialBlock,
]);

/** A saved section's file: src/content/sections/<id>.yaml. */
export const SavedSection = z
  .object({
    /** What editors call it ("Opening times banner"). */
    name: z.string().min(1).meta({ title: "Name", description: "What it's called when you add it to a page." }),
    block: ReusableBlock,
  })
  .strict();

/** Blocks that can appear in a page's `blocks:` list. */
export const PageBlock = z.discriminatedUnion("blockType", [...ReusableBlock.options, SavedBlock]);

export type PageBlock = z.infer<typeof PageBlock>;
export type ButtonData = z.infer<typeof Button>;
export type ToneName = z.infer<typeof Tone>;

/**
 * A page: src/content/pages/<path>.yaml → /<path> (index.yaml → /). Its title, its search-engine
 * text and an ordered list of blocks.
 */
export const PageData = z
  .object({
    /** The page's name in menus and breadcrumbs. */
    title: z.string().meta({ description: "The page's name in menus and breadcrumbs." }),
    seo: z
      .object({
        /** The browser tab and search result title (about 60 characters). */
        title: z.string().min(1).meta({ title: "Search title", description: "The browser tab and search result title (about 60 characters)." }),
        /** The search result summary (about 150 characters). */
        description: z.string().min(1).meta({ title: "Search description", description: "The search result summary (about 150 characters)." }),
        /** Social share image under public/, e.g. /media/<file>.jpg. */
        image: z.string().optional().meta({ title: "Share image", format: "image" }),
        /** The phrase this page should be found for (editors' checks only; not shown on the page). */
        keyphrase: z.string().optional().meta({ title: "Focus keyphrase", description: "The search this page should be found for. Only used by the writing checks." }),
      })
      .strict()
      .meta({ title: "Search engines" }),
    updatedAt: z.coerce.date().meta({ title: "Updated", format: "date" }),
    blocks: z.array(PageBlock),
  })
  .strict();

/** A blog post's front matter: src/content/blog/<slug>.md → /<blog path>/<slug>. */
export const PostData = z
  .object({
    title: z.string().min(10).max(120),
    /** The search result summary. */
    description: z.string().min(50).max(200).meta({ description: "The search result summary (50 to 200 characters)." }),
    date: z.coerce.date().meta({ format: "date", description: "When it was first published." }),
    updated: z.coerce.date().optional().meta({ format: "date", description: "When it last changed in a way readers should know." }),
    /** Who wrote it; the business when left out. */
    author: z.string().optional().meta({ description: "Who wrote it; the business when left out." }),
    /** Featured image under public/. */
    image: z.string().startsWith("/").optional().meta({ title: "Featured image", format: "image" }),
    imageAlt: z.string().optional().meta({ title: "Image description", description: "What the picture shows, for people who can't see it (needed with an image)." }),
    /** The phrase this post should be found for (editors' checks only). */
    keyphrase: z.string().optional().meta({ title: "Focus keyphrase", description: "The search this post should be found for. Only used by the writing checks." }),
    draft: z.boolean().optional().meta({ title: "Hidden for now", description: "Kept out of the site until you turn this off." }),
    /** Each tag has its page (/<blog path>/tag/<tag>); sections can show the posts with a tag. */
    tags: z
      .array(z.string().min(1).max(40))
      .max(12)
      .optional()
      .meta({ title: "Tags", format: "tags", description: "What it's about, e.g. Tax, VAT. Each tag gets a page listing its posts." }),
    featured: z.boolean().optional().meta({ title: "Featured", description: "Shown first where a list asks for featured posts first." }),
  })
  .strict();

/** An album: src/content/albums/<id>.yaml. Gallery sections show it, whole or by tag. */
export const AlbumData = z
  .object({
    name: z.string().min(1).meta({ title: "Name", description: "What the album is called when a gallery picks it." }),
    pictures: z.array(Picture).min(1).max(96).meta({ title: "Pictures" }),
  })
  .strict()
  .meta({ title: "Album", description: "Pictures kept together, which galleries on any page can show." });

/** An item's place in lists shown "In their set order": lower first; those without one after, by file name. */
const Position = z
  .number()
  .int()
  .min(1)
  .max(999)
  .optional()
  .meta({ title: "Position", description: "Where it comes in lists shown in their set order: lower first. Left empty, after those with one." });

/** A testimonial: src/content/testimonials/<id>.yaml. Reviews sections show them, all or by tag. */
export const TestimonialData = z
  .object({
    quote: z.string().min(1).meta({ title: "What they said" }),
    name: z.string().min(1).meta({ title: "Name" }),
    role: z.string().optional().meta({ title: "Role", description: 'What they do or had done, e.g. "Owner" or "Boiler replacement".' }),
    company: z.string().optional().meta({ title: "Company or place" }),
    photo: Image.optional(),
    rating: z.number().int().min(1).max(5).optional().meta({ title: "Rating", description: "Stars out of 5." }),
    tags: z
      .array(z.string().min(1).max(40))
      .max(12)
      .optional()
      .meta({ title: "Tags", format: "testimonial-tags", description: "So a section can show only some, e.g. Kitchens." }),
    position: Position,
  })
  .strict()
  .meta({ title: "Testimonial", description: "One customer's words, with their permission." });

/** A team member: src/content/team/<id>.yaml. Team sections show them, all or by tag. */
export const TeamMemberData = z
  .object({
    name: z.string().min(1).meta({ title: "Name" }),
    role: z.string().min(1).meta({ title: "Role", description: 'What they do, e.g. "Senior accountant".' }),
    bio: z.string().optional().meta({ title: "Short bio" }),
    photo: Image.optional(),
    ...PersonLinks,
    tags: z
      .array(z.string().min(1).max(40))
      .max(12)
      .optional()
      .meta({ title: "Tags", format: "team-tags", description: "So a section can show only some, e.g. Leeds office." }),
    position: Position,
  })
  .strict()
  .meta({ title: "Team member", description: "A person, which team sections on any page can show." });

/** A question: src/content/faq/<id>.yaml. FAQ sections show them, all or by tag. */
export const FaqData = z
  .object({
    question: z.string().min(1).meta({ title: "Question" }),
    answer: md().min(1).meta({ title: "Answer", format: "markdown-inline" }),
    tags: z
      .array(z.string().min(1).max(40))
      .max(12)
      .optional()
      .meta({ title: "Tags", format: "faq-tags", description: "So a section can show only some, e.g. Prices." }),
    position: Position,
  })
  .strict()
  .meta({ title: "Question", description: "A question and its answer, which FAQ sections on any page can show." });

/** A logo: src/content/logos/<id>.yaml. Logos sections show them, all or by tag. */
export const LogoData = z
  .object({
    name: z.string().min(1).meta({ title: "Name", description: "What it's called in lists." }),
    src: z.string().startsWith("/").meta({ title: "Logo", format: "image" }),
    alt: z.string().min(1).meta({ title: "Whose logo", description: "For people who can't see it." }),
    link: safeLink().optional().meta({ title: "Link", format: "link" }),
    tags: z
      .array(z.string().min(1).max(40))
      .max(12)
      .optional()
      .meta({ title: "Tags", format: "logo-tags", description: "So a section can show only some, e.g. Accreditations." }),
    position: Position,
  })
  .strict()
  .meta({ title: "Logo", description: "A client's, partner's or accreditation's logo, which logos sections on any page can show." });

/**
 * A widget's own presets, saved in Edit ("Save as a preset"): src/content/presets/<blockType>.yaml.
 * Each is a look (the settings presets decide), as the theme's are.
 */
export const SitePresetsData = z
  .object({
    presets: z.array(
      z
        .object({
          id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
          name: z.string().min(1).max(60),
          description: z.string().max(160).optional(),
          settings: z.record(z.string(), z.unknown()),
        })
        .strict(),
    ),
  })
  .strict();

/**
 * Collections besides pages, posts and saved sections, one YAML file per item in
 * src/content/<name>/ (content.ts declares each; Craeft's render Worker and editors read this list).
 */
export const COLLECTIONS = {
  albums: AlbumData,
  testimonials: TestimonialData,
  team: TeamMemberData,
  faq: FaqData,
  logos: LogoData,
  "widget-areas": AreaData,
  presets: SitePresetsData,
} as const;

/** Collections edited in Edit on the page, not listed in Pages and posts (widget areas, saved presets). */
const EDITED_ON_THE_PAGE = new Set(["widget-areas", "presets"]);

/**
 * The site's look (roadmap 16.6): sites/main/src/data/style.json, read by site.config.ts. Colours are
 * hex; the theme works out readable text on them and darker shades for links. Fonts are the ones
 * the theme ships (FONTS in site-config.ts; a test keeps the two lists the same).
 */
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "A colour like #1d4ed8");
export const FONT_NAMES = ["Inter", "DM Sans", "Manrope", "Outfit", "Fraunces", "Lora", "Source Serif 4", "System"] as const;
const Font = z.enum(FONT_NAMES);
export const SiteStyle = z
  .object({
    colours: z
      .object({
        primary: Hex.meta({ title: "Main colour", format: "colour", description: "Buttons, links and dark bands." }),
        accent: Hex.meta({ title: "Accent colour", format: "colour", description: "Highlights and second buttons." }),
      })
      .strict()
      .meta({ title: "Colours" }),
    fonts: z
      .object({
        heading: Font.meta({ title: "Headings", format: "font" }),
        body: Font.meta({ title: "Text", format: "font" }),
      })
      .strict()
      .meta({ title: "Fonts" }),
    // Layout, shape and type (roadmap 17.7, 17.8): each left out means the theme's own look. The choices are
    // LOOK's in site-config.ts (a test keeps the two the same).
    look: z
      .object({
        design: z
          .enum(["friendly", "premium", "bold", "minimal"])
          .optional()
          .meta({ title: "Design", description: "The whole look: friendly local, premium, bold modern or clean minimal." }),
        motion: z
          .enum(["calm", "lively", "wow"])
          .optional()
          .meta({ title: "Motion", description: "Calm (sections fade in), lively (things slide in, smooth scrolling) or wow (a moving 3D top, cursor effects)." }),
        header: z.enum(["classic", "centred", "minimal"]).optional().meta({ title: "Header", description: "Classic (logo, menu and button in a row), centred, or minimal." }),
        footer: z.enum(["columns", "simple"]).optional().meta({ title: "Footer", description: "A dark band with link columns, or a simple light strip." }),
        corners: z.enum(["square", "soft", "round"]).optional().meta({ title: "Corners", description: "Of cards, buttons and pictures." }),
        shadows: z.enum(["none", "soft", "strong"]).optional().meta({ title: "Shadows", description: "Under cards." }),
        spacing: z.enum(["compact", "normal", "airy"]).optional().meta({ title: "Spacing", description: "Above and below each section." }),
        buttons: z.enum(["filled", "outline"]).optional().meta({ title: "Main buttons", description: "Filled with the main colour, or outlined in it." }),
        headingSize: z.enum(["smaller", "normal", "larger"]).optional().meta({ title: "Heading size" }),
        headingWeight: z.enum(["regular", "semibold", "bold"]).optional().meta({ title: "Heading weight" }),
        eyebrow: z
          .object({
            case: z.enum(["capitals", "as-written"]).optional().meta({ title: "Letters", description: "In capitals, or as written." }),
            icon: z
              .string()
              .regex(/^[A-Z][A-Za-z0-9]*$/, "A Lucide icon name like Target")
              .optional()
              .meta({ title: "Icon", format: "icon", description: "Shown before every eyebrow (a Lucide name, e.g. Target)." }),
          })
          .strict()
          .optional()
          .meta({ title: "Eyebrows", description: "The short line above titles." }),
      })
      .strict()
      .optional()
      .meta({ title: "Shape and type" }),
  })
  .strict();

/** What editors read (blocks.schema.json, written by `pnpm schema`): pages, their blocks, posts, the other collections. */
export function editorSchema() {
  const json = (s: z.ZodType) => z.toJSONSchema(s, { io: "input", unrepresentable: "any" });
  return {
    $comment: "Written by `pnpm schema` from packages/theme/src/blocks/schema.ts. Don't edit by hand.",
    version: 1,
    page: json(PageData),
    post: json(PostData),
    section: json(SavedSection),
    style: json(SiteStyle),
    collections: Object.fromEntries(Object.entries(COLLECTIONS).filter(([name]) => !EDITED_ON_THE_PAGE.has(name)).map(([name, schema]) => [name, json(schema)])),
    // Widget areas: each place's name and what it may hold (Edit fills them).
    areas: Object.fromEntries(Object.entries(AREAS).map(([name, a]) => [name, { ...a, schema: json(AreaData) }])),
  };
}
