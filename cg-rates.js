// cg-rates.js — shared rate-math helpers for the static site drop.
//
// Loaded after cg-api.js on index.html, search-results.html, hotel-detail.html
// and checkout.html so every page computes nights/cheapest-rate/per-night
// price and the strike threshold the same way.
//
// Exposes globals:
//   cgNights(checkin, checkout)  -> whole nights between two ISO dates, min 1
//   cgBestRate(rateRow)          -> { total, ssp, currency } | null
//   cgPerNight(total, nights)    -> number
//   CG_STRIKE                    -> 1.02 (strike shown only if ssp > total * CG_STRIKE)
//   cgMoney(amount, currency)    -> formatted display string, e.g. "US$1,234"

(function (global) {
  function cgNights(checkin, checkout) {
    try {
      const ci = new Date(checkin);
      const co = new Date(checkout);
      const ms = co - ci;
      if (!isFinite(ms)) return 1;
      const nights = Math.round(ms / 86400000);
      return nights > 0 ? nights : 1;
    } catch (e) {
      return 1;
    }
  }

  // rateRow: an entry of r.data[] from POST /hotels/rates, i.e. an object
  // with a roomTypes[] array, each with a rates[] array of individual rate
  // plans. Picks the cheapest rate by retailRate.total[0].amount and returns
  // its total/suggestedSellingPrice/currency.
  function cgBestRate(rateRow) {
    const roomTypes = (rateRow && rateRow.roomTypes) || [];
    let best = null;
    roomTypes.forEach(rt => {
      (rt && rt.rates || []).forEach(r => {
        const rr = r && r.retailRate;
        const totalObj = rr && rr.total && rr.total[0];
        const amt = totalObj ? Number(totalObj.amount) : NaN;
        if (!isNaN(amt) && (!best || amt < best.total)) {
          const sspObj = rr.suggestedSellingPrice && rr.suggestedSellingPrice[0];
          const sspAmt = sspObj ? Number(sspObj.amount) : NaN;
          best = {
            total: amt,
            ssp: !isNaN(sspAmt) ? sspAmt : null,
            currency: totalObj.currency || (sspObj && sspObj.currency) || 'USD'
          };
        }
      });
    });
    return best;
  }

  function cgPerNight(total, nights) {
    const n = Number(nights) || 1;
    return Number(total) / (n > 0 ? n : 1);
  }

  const CG_STRIKE = 1.02;

  function cgMoney(amount, currency) {
    const n = Math.round(Number(amount) || 0);
    const prefix = (!currency || currency === 'USD') ? 'US$' : (currency + ' ');
    return prefix + n.toLocaleString();
  }

  global.cgNights = cgNights;
  global.cgBestRate = cgBestRate;
  global.cgPerNight = cgPerNight;
  global.CG_STRIKE = CG_STRIKE;
  global.cgMoney = cgMoney;
})(typeof window !== 'undefined' ? window : this);
