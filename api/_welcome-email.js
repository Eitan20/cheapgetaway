// Renders the welcome-email HTML (source design: docs/emails/01-welcome.html)
// as a template string. docs/ is excluded from the Vercel deploy via
// .vercelignore, so the runtime cannot read that file at request time — its
// content is embedded here instead. Keep this in sync by hand if the design
// in docs/emails/01-welcome.html changes.

const WELCOME_HTML_TEMPLATE = `<!-- Subject: you're in, {{first_name}} -->
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222222;max-width:560px;margin:0;padding:8px 4px;">
  <p style="margin:0 0 16px;">Hey {{first_name}},</p>

  <p style="margin:0 0 16px;">You're registered for <strong>Travel Secrets</strong> — you're all set. The session kicks off in about five minutes, and I'll send your access link in a separate email right before we start, so keep an eye on your inbox.</p>

  <p style="margin:0 0 16px;">Quick heads-up on what you'll see: how our members book the same hotel rooms you see on the big booking sites &mdash; for 40&ndash;65% less. Same rooms, same dates. Hotels can't publish their lowest rates in public, so those rates live inside closed clubs. The webinar shows you a live side-by-side on a real hotel.</p>

  <p style="margin:0 0 8px;">Two small favors so your access link actually reaches you:</p>
  <p style="margin:0 0 16px;">1. Hit reply and say "got it" &mdash; that tells your inbox we're a real person.<br>
  2. If this landed in your Promotions tab, drag it over to Primary.</p>

  <p style="margin:0 0 24px;">See you in there,<br>
  The CheapGetaway Team</p>

  <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">
    CheapGetaway Travel Club &middot; [Your business address]<br>
    You're getting this because you registered for the Travel Secrets webinar at cheapgetaway.com.<br>
    To stop receiving these emails, just reply with the word "unsubscribe".
  </p>
</div>`;

/**
 * Renders the welcome email HTML for a given visitor.
 * @param {string} name - visitor's first/display name
 * @param {string} email - visitor's email address (unused — this email is
 *   zero-link and never embeds the address anywhere; the parameter is kept
 *   so existing call sites don't need to change)
 * @returns {string} full HTML document with placeholders substituted
 */
export function welcomeHtml(name, email) {
  const safeName = name || 'there';

  return WELCOME_HTML_TEMPLATE.split('{{first_name}}').join(safeName);
}
