// Dates, times and phone numbers as people read them, in the site's locale.
import site from "virtual:site/config";
import { DAYS } from "../site-config";

export const formatDate = (d: Date) => d.toLocaleDateString(site.locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "09:00" → "9am" (en-GB style) or "9:00 AM" (en-US). */
export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  if (site.locale === "en-US" || site.locale === "en-CA")
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: m ? "2-digit" : undefined, timeZone: "UTC" });
  const hour = h % 12 || 12;
  return `${hour}${m ? `.${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/** Every day of the week with its hours, or "Closed". */
export const weekHours = () =>
  DAYS.map((day) => {
    const slots = site.openingHours.filter((h) => h.day === day);
    return { day, text: slots.length ? slots.map((s) => `${formatTime(s.opens)} to ${formatTime(s.closes)}`).join(", ") : "Closed" };
  });

/** tel: link for a phone number as written. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** The address on one line. */
export const addressLine = () => {
  const a = site.address;
  return a ? [a.street, a.locality, a.region, a.postalCode].filter(Boolean).join(", ") : "";
};
