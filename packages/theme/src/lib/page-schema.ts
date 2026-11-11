// The structured data a content page adds to its <head>: FAQ questions from its FAQ blocks.
import { type CollectionEntry, getCollection } from "astro:content";
import { selectQuestions } from "@craeft/widgets/faq";
import { mdText } from "./md";
import { pageSeed } from "./posts";

type Blocks = CollectionEntry<"pages">["data"]["blocks"];

/**
 * Questions from a page's FAQ blocks, exactly those each shows (typed, or the site's chosen by
 * tag): the same text is shown on the page.
 */
export async function faqFromBlocks(blocks: Blocks, page: { path?: string } = {}) {
  const faq = blocks.filter((b) => b.blockType === "faq");
  const collection = faq.some((b) => b.show === "collection") ? await getCollection("faq") : [];
  return faq
    .flatMap((b) => selectQuestions(b, collection, { seed: pageSeed(page) }).items)
    .map((f) => ({ q: f.question, a: mdText(f.answer) }));
}
