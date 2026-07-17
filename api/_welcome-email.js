// Renders the welcome-email HTML (source design: docs/emails/01-welcome.html)
// as a template string. docs/ is excluded from the Vercel deploy via
// .vercelignore, so the runtime cannot read that file at request time — its
// content is embedded here instead. Keep this in sync by hand if the design
// in docs/emails/01-welcome.html changes.

const WELCOME_HTML_TEMPLATE = `<!-- Subject: you're in, {{first_name}} — here's your webinar link -->
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222222;max-width:560px;margin:0;padding:8px 4px;">
  <p style="margin:0 0 16px;">Hey {{first_name}},</p>

  <p style="margin:0 0 16px;">You're registered for <strong>Travel Secrets</strong>. Here's your access link so you don't have to dig for it later:</p>

  <p style="margin:0 0 16px;">Your webinar link:<br>
    <a href="https://www.cheapgetaway.com/registration-confirmed?name={{first_name}}&amp;email={{email}}" style="color:#1a73e8;">https://www.cheapgetaway.com/registration-confirmed</a>
  </p>

  <p style="margin:0 0 16px;">Quick heads-up on what you'll see: how our members book the same hotel rooms you see on the big booking sites &mdash; for 40&ndash;65% less. Same rooms, same dates. Hotels can't publish their lowest rates in public, so those rates live inside closed clubs. The webinar shows you a live side-by-side on a real hotel.</p>

  <p style="margin:0 0 8px;">Two small favors so your reminder emails actually reach you:</p>
  <p style="margin:0 0 16px;">1. Hit reply and say "got it" &mdash; that tells your inbox we're a real person.<br>
  2. If this landed in your Promotions tab, drag it over to Primary.</p>

  <p style="margin:0 0 16px;">See you in there,<br>
  The CheapGetaway Team<br>
  <a href="mailto:travel@cheapgetaway.com" style="color:#1a73e8;">travel@cheapgetaway.com</a></p>

  <p style="margin:0 0 24px;">P.S. Can't wait for the session? The member rates the webinar explains are right here: <a href="https://www.cheapgetaway.com/join-the-club" style="color:#1a73e8;">cheapgetaway.com/join-the-club</a></p>

  <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">
    CheapGetaway Travel Club &middot; [Your business address]<br>
    You're getting this because you registered for the Travel Secrets webinar at cheapgetaway.com.<br>
    <a href="{{unsubscribe_url}}" style="color:#999999;">Unsubscribe</a>
  </p>
</div>`;

/**
 * Renders the welcome email HTML for a given visitor.
 * @param {string} name - visitor's first/display name
 * @param {string} email - visitor's email address
 * @returns {string} full HTML document with placeholders substituted
 */
export function welcomeHtml(name, email) {
  const safeName = name || 'there';
  const encodedEmail = encodeURIComponent(email || '');

  // TODO: replace with a real unsubscribe URL once list-management /
  // preference-center infrastructure is set up. A mailto is a stopgap so
  // the link is at least functional in the meantime.
  const unsubscribeUrl = 'mailto:travel@cheapgetaway.com?subject=Unsubscribe';

  // {{first_name}} appears both as plain body text ("Hey {{first_name}},")
  // and inside a URL query string (registration-confirmed?name={{first_name}}&amp;email={{email}}).
  // Substitute the query-string occurrence with the URL-encoded name first
  // (matched via its surrounding literal context), then replace all
  // remaining {{first_name}} occurrences with the plain display name.
  return WELCOME_HTML_TEMPLATE
    .split('?name={{first_name}}&amp;email={{email}}')
    .join(`?name=${encodeURIComponent(safeName)}&amp;email=${encodedEmail}`)
    .split('{{first_name}}').join(safeName)
    .split('{{email}}').join(encodedEmail)
    .split('{{unsubscribe_url}}').join(unsubscribeUrl);
}
