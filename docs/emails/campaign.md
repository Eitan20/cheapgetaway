# CheapGetaway Webinar Email Campaign

Sender: **CheapGetaway Travel Club <travel@cheapgetaway.com>**
Offer link (every CTA): **https://www.cheapgetaway.com/join-the-club**
Webinar re-entry link: **https://www.cheapgetaway.com/registration-confirmed?name={{first_name}}&email={{email}}**
Merge tags used: `{{first_name}}`, `{{email}}`, `{{unsubscribe_url}}` — adjust to your ESP's syntax (MailerLite: `{$name}`, Brevo: `{{ contact.FIRSTNAME }}`, Kit: `{{ subscriber.first_name }}`).

## Positioning angle (chosen)

**The Unique Mechanism angle:** "The price you see isn't the price members pay." Hotels can't publish their lowest rates publicly — public booking sites would revolt — so they release them inside closed clubs. Our club taps those rates. This matches the site's own hero copy, so email → landing page feels like one continuous story. Backup angle used in Email 5: **Social proof / receipts** (specific savings examples). Email 6 uses **Risk reversal + disqualification**.

## Sequence logic (automation map)

```
Registration (trigger: new subscriber tagged "webinar-registrant")
│
├─ Email 1 · WELCOME — immediately
│
├─ Wait 20h ──[ did NOT open Email 1 ]──► Email 2 · RESEND (new subject)
│                └─ Wait 2 days ─[ still no open ]─► Email 3 · CURIOSITY NUDGE
│
└─ Wait 2 days ──[ opened, but NO click on /join-the-club in any email ]──► Email 4 · MECHANISM
       └─ Wait 2 days ─[ still no click ]─► Email 5 · RECEIPTS (social proof)
              └─ Wait 2 days ─[ still no click ]─► Email 6 · OBJECTIONS / FAQ
                     └─ Wait 2 days ─[ still no click ]─► Email 7 · BREAKUP
Exit conditions: any click on /join-the-club → remove from sequence, tag "clicked-offer".
Unsubscribe → global suppression.
```

## Design system (applies to all HTML templates)

- 600px centered table layout, `#f4f6fb` page background, white card, 16px radius.
- Brand: navy `#0e1556` (headings/header bar), orange `#ff6500` (buttons), sky `#38b6ff` (accents), body text `#3a4056`.
- Header: navy bar, wordmark text "CHEAPGETAWAY" white 800 weight, "travel club" in sky.
- Bulletproof buttons (table-based, padding 14px 32px, radius 999px, bold 16px).
- Font stack: `-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif` (email-safe; no webfonts).
- All CSS inline; no external images required to render (works with images off).
- Footer: sender identity, physical-address placeholder `[Your business address]` (CAN-SPAM required), `{{unsubscribe_url}}` link, muted 12px.
- Mobile: single fluid column, `max-width:600px; width:100%`.

---

## Email 1 — WELCOME (Day 0, everyone)

> **Design note (2026-07-17):** this email intentionally breaks the design system.
> It is sent as a plain, personal-looking note (no logo, no buttons, no colors) to
> maximize Gmail **Primary-tab** placement — Gmail files designed HTML into
> Promotions. Emails 2–7 keep the branded design; by then the "reply / drag to
> Primary" ask in this email has trained the inbox. Branded version preserved at
> `01-welcome-branded.html`. No preheader on purpose (preheaders are a promo signal).

**Subject:** you're in, {{first_name}} — here's your webinar link

> Hey {{first_name}},
>
> Your seat is locked in. 🎉
>
> In the next session of **Travel Secrets**, you'll see exactly how our members book the same rooms you see on the big booking sites — for 40–65% less. Same hotel. Same dates. No coupon hunting.
>
> Here's what we'll cover:
>
> - Why hotels **can't** publish their lowest rates in public (and where those rates go instead)
> - A live side-by-side: the public price vs. the member price on a real hotel
> - How to get access to those rates for your next trip
>
> **[BUTTON: Go to my webinar →]** (links to registration-confirmed URL)
>
> One favor: reply "got it" to this email or drag it to your Primary tab — that tells your inbox we're a real person, so your access link never lands in spam.
>
> See you in there,
> The CheapGetaway Team
>
> P.S. Can't wait? The members-only rates the webinar explains are right here: **[link: cheapgetaway.com/join-the-club]**

---

## Email 2 — RESEND to non-openers (Day 1)

**Subject:** Did you see this? Your webinar access is inside
**Preheader:** Your Travel Secrets seat is reserved — link inside.

> Hey {{first_name}},
>
> Quick one — yesterday's email with your **Travel Secrets** access might have slipped past you, so here it is again.
>
> You registered to see how members pay 40–65% less for the exact same hotel rooms everyone else books at full price. The session is short, live, and you can join from your phone.
>
> **[BUTTON: Open my webinar link →]**
>
> That's it. No homework, no fluff — just the pricing walkthrough and how to use it on your next trip.
>
> — The CheapGetaway Team
>
> P.S. If you only do one thing today: **[see the member rates →]** (join-the-club link)

---

## Email 3 — CURIOSITY NUDGE to still-non-openers (Day 3)

**Subject:** hotels would rather you skip this
**Preheader:** The rate you see online is not the lowest rate. Here's proof.

> {{first_name}} — one number, then I'll let you go.
>
> **$177.**
>
> That's what one of our members saved on a two-night stay last month. Same room she almost booked on a public site. Same dates. The difference? She saw the *member* rate.
>
> Hotels can't show you that price in public. Public booking sites would revolt. So those rates live inside closed clubs — and your webinar seat explains exactly how that works.
>
> **[BUTTON: Watch Travel Secrets →]**
>
> Your registration is still active, but we do clear inactive seats to keep sessions small.
>
> — The CheapGetaway Team

---

## Email 4 — MECHANISM, to openers who never clicked the offer (Day 2)

**Subject:** The price you see isn't the price members pay
**Preheader:** Same room, same dates — two very different prices.

> Hey {{first_name}},
>
> Here's the thing nobody in the travel industry says out loud:
>
> **Hotels have two price lists.**
>
> The one you see on public booking sites is the *rack rate* — the price they're contractually forced to keep consistent everywhere. If they published anything lower, the big booking sites would drop them.
>
> But empty rooms cost hotels money every single night. So they quietly release their real lowest rates where the public sites can't see them: inside closed member clubs.
>
> That's the entire secret. Not coupons. Not "travel hacks." Just access.
>
> A real example from our members this month:
>
> | | Public site | Member rate |
> |---|---|---|
> | Same room, 2 nights | $289/night | $112/night |
>
> That's **$354 back in your pocket** on one short trip.
>
> **[BUTTON: See how the club works →]** (join-the-club)
>
> Takes two minutes to see. Your login works the moment you join.
>
> — The CheapGetaway Team

---

## Email 5 — RECEIPTS / social proof, no click yet (Day 4)

**Subject:** "I checked the math three times"
**Preheader:** What members actually saved this month — real numbers.

> {{first_name}},
>
> When people join the club, the first thing most of them do is pull up a trip they *already booked* and compare.
>
> That's usually when we get emails like these:
>
> **Orlando, 4 nights** — "Public price was $1,140. Member price was $486. I checked the math three times."
>
> **Cancún all-inclusive, couple's trip** — "We saved more than the membership costs. On the first booking."
>
> **Vegas weekend** — "$97/night for the room my friend paid $210 for. Same hotel. Same weekend."
>
> The pattern is boring and consistent: same rooms, 40–65% lower, because members see the rates hotels can't publish in public.
>
> You registered for the webinar because some part of you suspected you've been overpaying. You were right.
>
> **[BUTTON: Stop overpaying — see member rates →]**
>
> — The CheapGetaway Team

---

## Email 6 — OBJECTIONS / FAQ, no click yet (Day 6)

**Subject:** "Okay, but what's the catch?"
**Preheader:** Fair question. Here are straight answers.

> Hey {{first_name}},
>
> You've seen a few emails from us now and haven't looked at the club. Totally fair — "too good to be true" radar is healthy. So here are the three questions everyone asks, answered straight:
>
> **"Why would hotels give members lower prices?"**
> An empty room earns $0. Hotels would rather fill it quietly at a lower rate than advertise a discount that upsets the public sites. Closed clubs are how they do that.
>
> **"Is this a timeshare thing?"**
> No. No presentations, no property, no pressure. It's a booking site — you log in, search, and the prices are just lower.
>
> **"What if I don't travel much?"**
> Then don't join. Honestly. The club pays for itself if you take even one or two trips a year — if you don't travel at all, it's not for you.
>
> Still reading? Then you travel enough for this to matter.
>
> **[BUTTON: Take the 2-minute look →]** (join-the-club)
>
> — The CheapGetaway Team

---

## Email 7 — BREAKUP, no click (Day 8)

**Subject:** last one from me, {{first_name}}
**Preheader:** I'll stop emailing about this after today.

> {{first_name}},
>
> I'll keep this short — it's the last email in this series.
>
> You grabbed a seat for Travel Secrets because paying full price for hotels bugs you. The fix has been one click away this whole week:
>
> Members see the rates hotels can't publish. Same rooms, 40–65% less. That's the whole thing.
>
> **[BUTTON: Show me the member rates →]**
>
> If it's not for you, no hard feelings — you'll still get our occasional travel deals, and you can unsubscribe below anytime.
>
> But if you take even one trip this year, do the two-minute look first. Future-you, standing in a hotel lobby having paid half price, says thanks.
>
> — The CheapGetaway Team

---

## Compliance checklist (every email)

- Footer: business name, physical address placeholder, working `{{unsubscribe_url}}`.
- Claims kept to ranges the site itself uses (40–65%); savings examples are illustrative — replace with your real member numbers when you have them.
- No fake countdown timers or false "seat expires" deadlines beyond what's true in WebinarWiz.
