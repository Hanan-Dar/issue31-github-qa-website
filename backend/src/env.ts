export interface Env {
  DB: D1Database;
  /** The site's name, for the email subject. */
  SITE_NAME: string;
  /** The site's id in Craeft: the gateway checks the hand-off's signature with this site's key. */
  SITE_ID: string;
  /** Where enquiries are sent (matches site.config.ts `forms.inbox`). */
  FORM_INBOX: string;
  /** Craeft's gateway, which emails enquiries on (https://gateway.craeft.org). */
  GATEWAY_URL: string;
  // Secrets (wrangler secret put):
  /** Turnstile's secret key (forms are refused without it). */
  TURNSTILE_SECRET_KEY?: string;
  /** The key the hand-off to Craeft's gateway is signed with. */
  FORMS_KEY?: string;
}
