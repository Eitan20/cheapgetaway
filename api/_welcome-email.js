// Renders the welcome-email HTML (source design: docs/emails/01-welcome.html)
// as a template string. docs/ is excluded from the Vercel deploy via
// .vercelignore, so the runtime cannot read that file at request time — its
// content is embedded here instead. Keep this in sync by hand if the design
// in docs/emails/01-welcome.html changes.

const WELCOME_HTML_TEMPLATE = `<!-- Subject: You're in — here's your seat, {{first_name}} | Preheader: Save this email. Your webinar access link is inside. -->
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You're in — here's your seat</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; }
  body { margin:0; padding:0; width:100% !important; height:100% !important; }
  @media only screen and (max-width:600px) {
    .email-container { width:100% !important; max-width:100% !important; }
    .fluid-pad { padding-left:24px !important; padding-right:24px !important; }
    .stack { display:block !important; width:100% !important; }
  }
  @media (prefers-color-scheme: dark) {
    .bg-page { background-color:#12162a !important; }
    .bg-card { background-color:#1c2138 !important; }
    .text-body { color:#d8dcef !important; }
    .text-muted { color:#9aa0ba !important; }
  }
  a.btn-link:hover { background-color:#FF87A1 !important; }
</style>
</head>
<body class="bg-page" style="margin:0; padding:0; background-color:#FDF6E3; font-family:'Nunito',-apple-system,'Segoe UI',Arial,sans-serif;">
<div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all; font-family:'Nunito',-apple-system,'Segoe UI',Arial,sans-serif;">
Save this email. Your webinar access link is inside.
&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background-color:#FDF6E3;">
<tr>
<td align="center" style="padding:32px 16px;">

<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">

<!-- Header -->
<tr>
<td style="background-color:#FDF6E3; border:3px solid #1A2258; border-bottom:0; border-radius:22px 22px 0 0; padding:22px 32px;" align="center">
<img src="https://www.cheapgetaway.com/assets/logo-cheapgetaway.png" alt="cheapgetaway .team" width="200" style="display:block; max-width:200px; width:100%; height:auto; border:0;">
</td>
</tr>

<!-- Sparkle divider -->
<tr>
<td style="background-color:#FFFFFF; border-left:3px solid #1A2258; border-right:3px solid #1A2258; padding:14px 32px 0; text-align:center;">
<span style="font-family:'Fredoka',Arial,sans-serif; font-size:14px; color:#FFD976;">✦ <span style="color:#FF6B8A;">✦</span> ✦</span>
</td>
</tr>

<!-- Eyebrow -->
<tr>
<td class="bg-card" style="background-color:#FFFFFF; border-left:3px solid #1A2258; border-right:3px solid #1A2258; padding:16px 40px 0 40px;" align="center">
<span style="display:inline-block; font-family:'Fredoka',Arial,sans-serif; font-weight:600; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#E2554F;">You're registered · seat confirmed</span>
</td>
</tr>

<!-- Card body -->
<tr>
<td class="bg-card" style="background-color:#FFFFFF; border-left:3px solid #1A2258; border-right:3px solid #1A2258; padding:18px 40px 8px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr class="fluid-pad">
<td style="font-family:'Nunito',-apple-system,'Segoe UI',Arial,sans-serif; font-size:16px; line-height:26px; color:#1A2258;" class="text-body fluid-pad">

<p style="margin:0 0 20px 0;">Hey {{first_name}},</p>

<p style="margin:0 0 20px 0; font-family:'Fredoka',Arial,sans-serif; font-weight:700; font-size:20px; color:#1A2258;">Your seat is locked in. 🎉</p>

<p style="margin:0 0 20px 0;">In the next session of <strong>Travel Secrets</strong>, you'll see exactly how our members book the same rooms you see on the big booking sites — for 40–65% less. Same hotel. Same dates. No coupon hunting.</p>

<p style="margin:0 0 12px 0; font-weight:800; color:#1A2258;">Here's what we'll cover:</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0; background-color:#FDF6E3; border:3px solid #1A2258; border-radius:16px;">
<tr>
<td style="padding:18px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding:0 0 12px 0; font-size:15px; line-height:23px; color:#1A2258;" class="text-body">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" style="color:#FF6B8A; font-weight:800; padding-right:10px;">✦</td>
<td>Why hotels <strong>can't</strong> publish their lowest rates in public (and where those rates go instead)</td>
</tr></table>
</td>
</tr>
<tr>
<td style="padding:0 0 12px 0; font-size:15px; line-height:23px; color:#1A2258;" class="text-body">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" style="color:#FF6B8A; font-weight:800; padding-right:10px;">✦</td>
<td>A live side-by-side: the public price vs. the member price on a real hotel</td>
</tr></table>
</td>
</tr>
<tr>
<td style="font-size:15px; line-height:23px; color:#1A2258;" class="text-body">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" style="color:#FF6B8A; font-weight:800; padding-right:10px;">✦</td>
<td>How to get access to those rates for your next trip</td>
</tr></table>
</td>
</tr>
</table>
</td>
</tr>
</table>

</td>
</tr>
</table>
</td>
</tr>

<!-- Button -->
<tr>
<td class="bg-card" style="background-color:#FFFFFF; border-left:3px solid #1A2258; border-right:3px solid #1A2258; padding:18px 40px 34px 40px;" align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="background-color:#FF6B8A; border-radius:999px; border:3px solid #1A2258; box-shadow:5px 5px 0 #FFD976;">
<a class="btn-link" href="https://www.cheapgetaway.com/registration-confirmed?name={{first_name}}&email={{email}}" target="_blank" style="display:inline-block; padding:14px 34px; font-family:'Fredoka',Arial,sans-serif; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:999px;">Go to my webinar →</a>
</td>
</tr>
</table>
</td>
</tr>

<!-- Closing -->
<tr>
<td class="bg-card" style="background-color:#FFFFFF; border-left:3px solid #1A2258; border-right:3px solid #1A2258; padding:0 40px 40px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td class="fluid-pad text-body" style="font-family:'Nunito',-apple-system,'Segoe UI',Arial,sans-serif; font-size:16px; line-height:26px; color:#1A2258;">

<p style="margin:0 0 20px 0;">One favor: reply "got it" to this email or drag it to your Primary tab — that tells your inbox we're a real person, so your access link never lands in spam.</p>

<p style="margin:0 0 20px 0;">See you in there,<br>The CheapGetaway Team</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px; border-top:2px dashed #1A2258;">
<tr>
<td style="padding-top:20px; font-size:14px; line-height:22px; color:#1A2258;" class="text-body">
P.S. Can't wait? The members-only rates the webinar explains are right here: <a href="https://www.cheapgetaway.com/join-the-club" style="color:#E2554F; font-weight:800; text-decoration:underline;">cheapgetaway.com/join-the-club</a>
</td>
</tr>
</table>

</td>
</tr>
</table>
</td>
</tr>

<!-- Bottom border closer -->
<tr>
<td style="height:3px; line-height:3px; font-size:0; background-color:#FFFFFF; border-left:3px solid #1A2258; border-right:3px solid #1A2258;">&nbsp;</td>
</tr>

<!-- Footer bar -->
<tr>
<td style="background-color:#1A2258; border:3px solid #1A2258; border-radius:0 0 22px 22px; padding:22px 32px 26px;" align="center">
<p style="margin:0; font-family:'Nunito',-apple-system,'Segoe UI',Arial,sans-serif; font-size:12px; line-height:18px; color:#FDF6E3; opacity:0.85;">
CheapGetaway Travel Club &middot; travel@cheapgetaway.com<br>
[Your business address]<br>
<a href="{{unsubscribe_url}}" style="color:#FFD976; text-decoration:underline;">Unsubscribe</a>
</p>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>
`;

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
  // and inside a URL query string (registration-confirmed?name={{first_name}}).
  // Substitute the query-string occurrence with the URL-encoded name first
  // (matched via its surrounding literal context), then replace all
  // remaining {{first_name}} occurrences with the plain display name.
  return WELCOME_HTML_TEMPLATE
    .split('?name={{first_name}}&email={{email}}')
    .join(`?name=${encodeURIComponent(safeName)}&email=${encodedEmail}`)
    .split('{{first_name}}').join(safeName)
    .split('{{email}}').join(encodedEmail)
    .split('{{unsubscribe_url}}').join(unsubscribeUrl);
}
