// cg-analytics.js — GA4 wiring for cheapgetaway.team
// Self-contained, no build step, no dependencies.
//
// Set the real GA4 measurement ID below (single source of truth). If it is
// still the placeholder, this script warns loudly in the console and does
// nothing else — so a forgotten ID fails loudly in dev, silently in prod.
var GA_MEASUREMENT_ID = 'G-GH7FMC08NT';

(function () {
  if (GA_MEASUREMENT_ID.indexOf('G-XXXX') === 0) {
    console.warn('[cg-analytics] GA_MEASUREMENT_ID is still a placeholder — analytics disabled.');
    return;
  }

  // ---- Standard GA4 snippet ----------------------------------------------
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
  // Real full page loads (not an SPA) — the automatic page_view from
  // 'config' above is correct. Do not send manual page_view events.

  // ---- Safe public wrapper ------------------------------------------------
  window.cgTrack = function (eventName, params) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', eventName, params || {});
    } catch (err) {
      /* no-op */
    }
  };

  // ---- Helpers --------------------------------------------------------------
  function slugify(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  // ==========================================================================
  // generate_lead — submit of the opt-in form on webinar-optin(-creator).html
  // Form contains an input[name="email"]. Delegated on document, capture
  // phase, so we see it before React's own submit handler runs.
  // ==========================================================================
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (!form.querySelector('input[name="email"]')) return;
    var path = window.location.pathname;
    if (path.indexOf('/webinar-optin') !== 0) return;
    window.cgTrack('generate_lead', { form_location: path });
  }, true);

  // ==========================================================================
  // select_promotion — clicks on "Join the club" / "See how creators earn"
  // CTAs (anchors whose href contains /webinar-optin or /webinar-optin-creator)
  // ==========================================================================
  document.addEventListener('click', function (e) {
    var link = closest(e.target, 'a[href]');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var promotionName = null;
    if (href.indexOf('/webinar-optin-creator') !== -1) {
      promotionName = slugify(link.textContent) || 'webinar_optin_creator';
    } else if (href.indexOf('/webinar-optin') !== -1) {
      promotionName = 'join_the_club';
    }
    if (!promotionName) return;
    window.cgTrack('select_promotion', {
      promotion_name: promotionName,
      link_url: href,
      page_location: window.location.href,
      transport_type: 'beacon'
    });
  }, true);

  // ==========================================================================
  // search
  //   a) index.html — "Find stays" AI search button (.cg-ai-btn), pulls the
  //      query from #cg-ai.
  //   b) search-results.html — the nav search-summary form (.cg-sr-navform),
  //      pulls the query from #cg-nav-q.
  //   Note: hotel-detail.html has no equivalent search-summary form (only an
  //   "Ask AI about this hotel" Q&A box, which is a different feature) — not
  //   wired, see report.
  // ==========================================================================
  document.addEventListener('click', function (e) {
    var btn = closest(e.target, '.cg-ai-btn');
    if (!btn) return;
    var input = document.getElementById('cg-ai');
    var term = input && input.value ? input.value.trim() : '';
    var params = { transport_type: 'beacon' };
    if (term) params.search_term = term;
    window.cgTrack('search', params);
  }, true);

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (!form.classList || !form.classList.contains('cg-sr-navform')) return;
    var input = document.getElementById('cg-nav-q');
    var term = input && input.value ? input.value.trim() : '';
    var params = { transport_type: 'beacon' };
    if (term) params.search_term = term;
    window.cgTrack('search', params);
  }, true);

  // ==========================================================================
  // select_item — "Choose room" clicks on hotel-detail.html
  // ==========================================================================
  document.addEventListener('click', function (e) {
    if (window.location.pathname.indexOf('/hotel-detail') !== 0) return;
    var link = closest(e.target, 'a');
    if (!link || link.textContent.trim() !== 'Choose room') return;
    var row = link.parentElement;
    var label;
    try {
      label = row && row.firstElementChild && row.firstElementChild.firstElementChild
        ? row.firstElementChild.firstElementChild.textContent.trim()
        : undefined;
    } catch (err) {
      label = undefined;
    }
    var params = { transport_type: 'beacon' };
    if (label) params.item_name = label;
    window.cgTrack('select_item', params);
  }, true);

  // ==========================================================================
  // begin_checkout — clicking the "Continue to secure payment" button on
  // checkout.html. Delegated + capture so we read the button's original
  // label before the React onClick handler re-renders it to "Locking your
  // rate…".
  // ==========================================================================
  document.addEventListener('click', function (e) {
    if (window.location.pathname.indexOf('/checkout') !== 0) return;
    var btn = closest(e.target, 'button');
    if (!btn || btn.textContent.trim() !== 'Continue to secure payment') return;
    window.cgTrack('begin_checkout', {});
  }, true);

  // ==========================================================================
  // purchase — fires on booking-confirmed.html page load. Reads the booking
  // this page already looks up itself: ?bid=<id> against localStorage
  // 'cg_trips' (see booking-confirmed.html renderVals()). If nothing
  // structured is found, fires with no params.
  // ==========================================================================
  if (window.location.pathname.indexOf('/booking-confirmed') === 0) {
    (function () {
      var params = {};
      try {
        var bid = new URLSearchParams(window.location.search).get('bid') || '';
        var trips = JSON.parse(localStorage.getItem('cg_trips') || '[]');
        var t = trips.find(function (x) { return x.id === bid; }) || trips[0];
        if (t) {
          params.transaction_id = t.confirmation || t.id;
          if (t.price != null) {
            params.value = Number(t.price);
            params.currency = 'USD';
          }
        }
      } catch (err) {
        params = {};
      }
      window.cgTrack('purchase', params);
    })();
  }
})();
